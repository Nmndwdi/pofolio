"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clientPreviewUrl } from "@/lib/uploadClient";

/*
 * Home-page global search.
 *
 * Live results-as-you-type (debounced). Renders inline below the input.
 * Designed to match the editorial home page aesthetic — paper background,
 * serif/ink palette — rather than introducing a SaaS-feeling search bar.
 *
 * UX details that matter:
 *   - 220ms debounce: feels live but doesn't fire on every keystroke.
 *   - Empty query → results are cleared, panel hidden. We don't pre-load.
 *   - Latest-request wins: we track an in-flight request token so an older
 *     slower response can't overwrite a newer one (the classic race bug).
 *   - Each result is a real <Link> to /p/<slug>, so right-click/cmd-click
 *     "open in new tab" works.
 *   - Avatars use the same Cloudinary URL helper the rest of the app uses.
 */

interface SearchResult {
  slug: string;
  displayName: string;
  headline: string;
  avatarCloudinaryId: string;
}

const DEBOUNCE_MS = 220;

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Latest-request token. Each fetch increments; only matches the current
  // value updates state. Prevents an older slow response from clobbering
  // newer fast ones.
  const reqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const t = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      try {
        const r = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (myReq !== reqIdRef.current) return;
        if (!r.ok) {
          setResults([]);
          return;
        }
        const json = (await r.json()) as { results: SearchResult[] };
        if (myReq !== reqIdRef.current) return;
        setResults(json.results ?? []);
        setOpen(true);
      } catch {
        if (myReq !== reqIdRef.current) return;
        setResults([]);
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        placeholder="Search people by name, slug, or headline…"
        // Editorial styling — paper background, ink border. Matches the
        // surrounding page palette.
        className="w-full rounded-full border border-ink/15 bg-paper px-5 py-3 font-serif text-base placeholder:text-ink/40 focus:border-ink/40 focus:outline-none"
        aria-label="Search Pofolio users"
        autoComplete="off"
        spellCheck={false}
      />

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-ink/15 bg-paper-card shadow-lg">
          {loading && results.length === 0 && (
            <div className="px-5 py-4 text-sm text-ink/50">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-5 py-4 text-sm text-ink/50">
              No one matches &ldquo;{query.trim()}&rdquo;.
            </div>
          )}
          {results.length > 0 && (
            <ul className="max-h-[60vh] divide-y divide-ink/10 overflow-y-auto">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/p/${r.slug}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink/[0.04]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.avatarCloudinaryId ? (
                      <img
                        src={clientPreviewUrl(
                          r.avatarCloudinaryId,
                          "w_64,h_64,c_fill,f_auto,q_auto",
                        )}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-ink/10 object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-ink/5 font-serif text-sm text-ink/40"
                      >
                        {r.displayName.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-base text-ink">
                        {r.displayName}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-ink/50">
                          /p/{r.slug}
                        </span>
                        {r.headline && (
                          <span className="truncate text-xs text-ink/60">
                            · {r.headline}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}