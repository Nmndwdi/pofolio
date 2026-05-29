import { getOrFetch, type CachedResult } from "./cache";

/*
 * Dev.to integration.
 *
 * Dev.to (built on the open-source Forem platform) exposes a fully public
 * REST API — no authentication needed for reads. This is the cleanest of
 * our integrations: a documented, stable, public contract.
 *
 *   GET https://dev.to/api/articles?username=<user>&per_page=<n>
 *
 * Returns the user's published articles, newest first. We surface the most
 * recent handful as cards on the portfolio.
 *
 * What we fetch per article: title, URL, cover image, reading time, tag
 * list, public reaction count, and published date.
 *
 * Honest notes:
 *   - The API has a rate limit but it's generous for our read volume, and
 *     getOrFetch caches for an hour so we hit it rarely.
 *   - A user with no articles (or a wrong username) returns an empty array,
 *     not a 404 — so "user not found" and "user has no posts" look the same.
 *     We treat both as "no section" (return null). That's fine: an empty
 *     Dev.to section adds nothing anyway.
 */

// ─── Public shape ──────────────────────────────────────────────────────────

export interface DevToArticle {
  id: number;
  title: string;
  url: string;
  coverImage: string | null;
  readingTimeMinutes: number;
  tags: string[];
  reactionsCount: number;
  publishedAt: string; // ISO date
}

export interface DevToData {
  username: string;
  articles: DevToArticle[];
}

// ─── Fetcher ───────────────────────────────────────────────────────────────

const DEVTO_API = "https://dev.to/api/articles";
const TTL_SECONDS = 60 * 60; // 1 hour
const MAX_ARTICLES = 6;

// The subset of Dev.to's article JSON we actually read. Their payload has
// many more fields; we type only what we use.
interface DevToApiArticle {
  id: number;
  title: string;
  url: string;
  cover_image: string | null;
  social_image: string | null;
  reading_time_minutes: number;
  tag_list: string[];
  public_reactions_count: number;
  published_at: string;
}

async function fetchDevToFresh(username: string): Promise<DevToData> {
  const url = `${DEVTO_API}?username=${encodeURIComponent(
    username,
  )}&per_page=${MAX_ARTICLES}`;

  const res = await fetch(url, {
    headers: { Accept: "application/vnd.forem.api-v1+json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Dev.to HTTP ${res.status}`);
  }

  const json = (await res.json()) as DevToApiArticle[];

  // The API returns [] for both unknown users and users with no posts.
  const articles: DevToArticle[] = json.map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    // cover_image is the wide banner; social_image is a fallback.
    coverImage: a.cover_image ?? a.social_image ?? null,
    readingTimeMinutes: a.reading_time_minutes,
    tags: a.tag_list ?? [],
    reactionsCount: a.public_reactions_count ?? 0,
    publishedAt: a.published_at,
  }));

  return { username, articles };
}

// ─── Public entry point ────────────────────────────────────────────────────

export async function getDevToData(
  username: string,
): Promise<CachedResult<DevToData> | null> {
  const key = username.trim().toLowerCase();
  if (!key) return null;

  try {
    const result = await getOrFetch<DevToData>({
      provider: "devto",
      key,
      ttlSeconds: TTL_SECONDS,
      fetcher: () => fetchDevToFresh(username.trim()),
    });
    // No articles → nothing worth rendering. Treat as "no section".
    if (result.data.articles.length === 0) return null;
    return result;
  } catch (err) {
    console.error(`[devto] fetch failed for ${key}:`, err);
    return null;
  }
}
