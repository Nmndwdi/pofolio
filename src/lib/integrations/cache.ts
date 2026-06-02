import { connectDB } from "@/lib/db/mongoose";
import { Cache } from "@/lib/db/models";

/*
 * Generic "get from cache, or fetch fresh and cache" helper.
 *
 * Used by every integration (GitHub, Codeforces, LeetCode). Keyed by
 * (provider, key) — global across all users, so two profiles linking the
 * same upstream account share one cache entry.
 *
 * Design choices worth flagging:
 *
 * 1. We re-validate expiry on read in addition to relying on the Mongo TTL
 *    index. The TTL index deletes expired docs lazily (~60s drift), so we
 *    can't trust "if it's still in the DB it's still valid". Belt + braces.
 *
 * 2. If the upstream fetch THROWS, we fall back to STALE cache if available.
 *    Better to show 90-minute-old GitHub data than a broken page when GitHub
 *    has a 30-second outage. Only if there's no cache at all do we re-throw.
 *
 * 3. The fetcher is `async () => T`, not `async (key) => T`. The caller
 *    closes over whatever it needs. Simpler, no string-formatting indirection.
 *
 * 4. One concurrent-fetch-deduplication caveat: if 50 visitors hit the same
 *    cold cache in the same 200ms, all 50 trigger an upstream fetch. That's
 *    fine for our scale (<1k users). At higher scale we'd add an in-process
 *    promise cache or a distributed lock. Documented but not solved.
 */

export type CacheProvider =
  | "github"
  | "codeforces"
  | "leetcode"
  | "devto"
  | "huggingface"
  | "og";

export interface CachedResult<T> {
  data: T;
  fetchedAt: Date;
  isStale: boolean; // true if we served stale because upstream failed
}

interface GetOrFetchOptions<T> {
  provider: CacheProvider;
  key: string;
  ttlSeconds: number;
  fetcher: () => Promise<T>;
}

export async function getOrFetch<T>({
  provider,
  key,
  ttlSeconds,
  fetcher,
}: GetOrFetchOptions<T>): Promise<CachedResult<T>> {
  await connectDB();

  // 1. Look up existing cache entry
  const existing = await Cache.findOne({ provider, key }).lean<{
    data: T;
    fetchedAt: Date;
    expiresAt: Date;
  } | null>();

  const now = Date.now();
  const isFresh =
    !!existing && new Date(existing.expiresAt).getTime() > now;

  if (isFresh && existing) {
    return { data: existing.data, fetchedAt: existing.fetchedAt, isStale: false };
  }

  // 2. Stale or missing — try to refresh
  let fresh: T;
  try {
    fresh = await fetcher();
  } catch (err) {
    // 3. Fetch failed. If we have a stale entry, serve it and log the error.
    //    Most upstream errors (rate limits, 5xx, network) are transient; serving
    //    stale data buys us time without breaking the public page.
    if (existing) {
      console.warn(
        `[cache:${provider}] fetcher failed, serving stale (${existing.fetchedAt.toISOString()}):`,
        err,
      );
      return { data: existing.data, fetchedAt: existing.fetchedAt, isStale: true };
    }
    // No cache at all — caller has to deal with the error.
    throw err;
  }

  // 4. Store fresh result. upsert handles both "first fetch" and "refresh".
  const fetchedAt = new Date();
  const expiresAt = new Date(now + ttlSeconds * 1000);
  // Store fresh result. upsert handles both "first fetch" and "refresh".
  // Caching is an OPTIMIZATION — if the write fails (e.g. a transient DB
  // error), we must still return the data we successfully fetched. A failed
  // cache write must never turn a good result into a failure.
  try {
    await Cache.updateOne(
      { provider, key },
      { $set: { data: fresh, fetchedAt, expiresAt } },
      { upsert: true },
    );
  } catch (err) {
    console.warn(
      `[cache:${provider}] failed to write cache for "${key}" ` +
        `(returning fresh data anyway):`,
      err,
    );
  }

  return { data: fresh, fetchedAt, isStale: false };
}