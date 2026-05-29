import { getOrFetch, type CachedResult } from "./integrations/cache";

/*
 * OpenGraph link-preview fetcher.
 *
 * Fetches a URL's HTML and extracts OpenGraph / meta tags (title, description,
 * image, site name) so custom links can render as rich cards instead of bare
 * text.
 *
 * SECURITY — this fetches arbitrary user-supplied URLs server-side, which is
 * a classic SSRF surface. Guards:
 *   - Only http/https schemes.
 *   - Block requests to private/loopback/link-local hosts (localhost,
 *     127.x, 10.x, 192.168.x, 169.254.x, ::1, etc.) so a user can't point a
 *     link at our own internal network and have the server fetch it.
 *   - Hard timeout and a capped response read so a malicious or huge page
 *     can't hang or balloon memory.
 *   - We only ever read meta tags — never execute or re-serve the content.
 *
 * Results are cached (1 day) via the same getOrFetch helper, keyed by URL —
 * OG tags rarely change, and we don't want to refetch a target on every page
 * view.
 */

export interface OgPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const TTL_SECONDS = 24 * 60 * 60; // 1 day — OG tags are near-static
const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024; // 512 KB of HTML is plenty for <head> meta tags

/** Reject URLs pointing at private/internal hosts (SSRF guard). */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h === "[::1]") return true;
  // IPv4 private / loopback / link-local ranges.
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // link-local (incl. cloud metadata)
  // 172.16.0.0 – 172.31.255.255
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  // Cloud metadata endpoint, explicitly.
  if (h === "169.254.169.254") return true;
  return false;
}

/** Extract a meta tag's content by property/name, case-insensitive. */
function extractMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // Match <meta property="og:title" content="..."> in either attribute order.
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
        "i",
      ),
    ];
    for (const re of patterns) {
      const m = re.exec(html);
      if (m && m[1]) return decodeEntities(m[1].trim());
    }
  }
  return null;
}

/** Minimal HTML-entity decode for the handful common in meta content. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

async function fetchOgFresh(url: string): Promise<OgPreview> {
  const empty: OgPreview = {
    url,
    title: null,
    description: null,
    image: null,
    siteName: null,
  };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return empty;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return empty;
  if (isBlockedHost(parsed.hostname)) return empty;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Identify as a link-preview bot; many sites serve OG tags to these.
        "User-Agent": "PofolioBot/1.0 (+link-preview)",
        Accept: "text/html",
      },
      cache: "no-store",
    });

    if (!res.ok) return empty;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return empty;

    // Read at most MAX_BYTES — OG tags live in <head>, near the top.
    const reader = res.body?.getReader();
    if (!reader) return empty;
    let received = 0;
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (received >= MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    const html = new TextDecoder().decode(concat(chunks));

    // Resolve a relative og:image against the page URL.
    const rawImage = extractMeta(html, ["og:image", "twitter:image"]);
    let image: string | null = null;
    if (rawImage) {
      try {
        image = new URL(rawImage, parsed).toString();
      } catch {
        image = null;
      }
    }

    return {
      url,
      title:
        extractMeta(html, ["og:title", "twitter:title"]) ??
        extractTitleTag(html),
      description: extractMeta(html, [
        "og:description",
        "twitter:description",
        "description",
      ]),
      image,
      siteName: extractMeta(html, ["og:site_name"]),
    };
  } catch {
    // Timeout, network error, abort — return empty, never throw.
    return empty;
  } finally {
    clearTimeout(timeout);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function extractTitleTag(html: string): string | null {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return m && m[1] ? decodeEntities(m[1].trim()) : null;
}

/**
 * Public entry — cached OG preview for a URL. Returns null if nothing useful
 * was found (no title and no image → not worth a rich card).
 */
export async function getOgPreview(
  url: string,
): Promise<CachedResult<OgPreview> | null> {
  const key = url.trim().toLowerCase();
  if (!key) return null;
  try {
    const result = await getOrFetch<OgPreview>({
      provider: "og",
      key,
      ttlSeconds: TTL_SECONDS,
      fetcher: () => fetchOgFresh(url.trim()),
    });
    // No title and no image → nothing to show; let caller fall back to a
    // plain link.
    if (!result.data.title && !result.data.image) return null;
    return result;
  } catch {
    return null;
  }
}
