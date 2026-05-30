import { getOrFetch, type CachedResult } from "./cache";

/*
 * Codeforces integration.
 *
 * Two REST endpoints (public, no auth):
 *   GET /api/user.info?handles=<handle>      → user profile
 *   GET /api/user.rating?handle=<handle>     → rating change history
 *
 * Rate limit: ~1 req per 2s per IP. Our 1h cache means the steady-state
 * cost is one cached read per public page view. Cold-cache contention
 * between simultaneous Vercel invocations is theoretically possible but
 * extremely unlikely at our scale.
 *
 * Codeforces wraps every response in { status, comment, result } where
 * status is "OK" or "FAILED". On non-OK we raise CodeforcesUserNotFoundError
 * for "handles: User with handle X not found", everything else is a
 * generic Error.
 */

// ─── Public shape ──────────────────────────────────────────────────────────

export interface CodeforcesData {
  user: {
    handle: string;
    rating: number | null;       // null for unrated users
    maxRating: number | null;
    rank: string | null;          // "newbie", "specialist", "expert", ...
    maxRank: string | null;
    contribution: number;
    avatarUrl: string;
    country?: string;
    organization?: string;
  };
  // Up to 5 most recent contests, newest first.
  recentContests: Array<{
    contestId: number;
    contestName: string;
    rank: number;
    oldRating: number;
    newRating: number;
    timestamp: number; // unix seconds
  }>;
  // Full rating history (oldest-first) for charting. Each point is just the
  // timestamp + resulting rating — the minimal shape a line chart needs.
  // We keep the whole series; even prolific users have only a few hundred
  // contests, which is a small payload.
  ratingHistory: Array<{
    timestamp: number; // unix seconds
    rating: number; // newRating after that contest
  }>;
  contestsParticipated: number;
  // Submission heatmap (last ~6 months), built by bucketing recent
  // submissions from `user.status` by date. Empty array if the call failed
  // or the user has no submissions — never load-bearing.
  submissionHeatmap: Array<{ date: string; count: number }>;
}

export class CodeforcesUserNotFoundError extends Error {
  constructor(handle: string) {
    super(`Codeforces user not found: ${handle}`);
    this.name = "CodeforcesUserNotFoundError";
  }
}

// ─── Internal raw types ────────────────────────────────────────────────────

interface CFEnvelope<T> {
  status: "OK" | "FAILED";
  comment?: string;
  result?: T;
}

interface RawCFUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  contribution?: number;
  avatar?: string;
  titlePhoto?: string;
  country?: string;
  organization?: string;
}

interface RawRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

interface RawSubmission {
  // Codeforces user.status returns lots of fields; we only need the timestamp.
  creationTimeSeconds: number;
  verdict?: string;
}

// ─── Fetcher ───────────────────────────────────────────────────────────────

const CF_API = "https://codeforces.com/api";
const TTL_SECONDS = 60 * 60; // 1 hour

async function cfFetch<T>(path: string): Promise<CFEnvelope<T>> {
  const res = await fetch(`${CF_API}${path}`, { cache: "no-store" });
  // Codeforces sometimes returns 4xx/5xx HTML on outage rather than the JSON
  // envelope. Guard against that explicitly.
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(`Codeforces returned non-JSON (status ${res.status})`);
  }
  return (await res.json()) as CFEnvelope<T>;
}

async function fetchCodeforcesFresh(handle: string): Promise<CodeforcesData> {
  // 1. user.info
  const infoRes = await cfFetch<RawCFUser[]>(
    `/user.info?handles=${encodeURIComponent(handle)}`,
  );
  if (infoRes.status === "FAILED") {
    if (infoRes.comment?.toLowerCase().includes("not found")) {
      throw new CodeforcesUserNotFoundError(handle);
    }
    throw new Error(`Codeforces user.info failed: ${infoRes.comment}`);
  }
  const rawUser = infoRes.result?.[0];
  if (!rawUser) throw new CodeforcesUserNotFoundError(handle);

  // 2. user.rating (contest history). Don't fail the whole fetch if this errors —
  //    plenty of users haven't competed yet, and the API returns OK with [] then.
  //    But log other failures for our own debugging.
  let ratingChanges: RawRatingChange[] = [];
  try {
    const ratingRes = await cfFetch<RawRatingChange[]>(
      `/user.rating?handle=${encodeURIComponent(handle)}`,
    );
    if (ratingRes.status === "OK" && Array.isArray(ratingRes.result)) {
      ratingChanges = ratingRes.result;
    }
  } catch (err) {
    console.warn(`[codeforces] user.rating failed for ${handle}:`, err);
  }

  // Recent first. The API returns oldest-first, so reverse and take top 5.
  const recentContests = [...ratingChanges]
    .reverse()
    .slice(0, 5)
    .map((c) => ({
      contestId: c.contestId,
      contestName: c.contestName,
      rank: c.rank,
      oldRating: c.oldRating,
      newRating: c.newRating,
      timestamp: c.ratingUpdateTimeSeconds,
    }));

  // Full rating history, oldest-first (the API's natural order). Minimal
  // shape for charting.
  const ratingHistory = ratingChanges.map((c) => ({
    timestamp: c.ratingUpdateTimeSeconds,
    rating: c.newRating,
  }));

  // 3. user.status — recent submissions, bucketed by date for the activity
  //    heatmap. We fetch up to 5000 submissions and keep them ALL (not just
  //    the last 6 months) so the year selector has multiple years to choose
  //    from. 5000 is a soft cap that covers very active users without
  //    bloating the cache payload.
  //
  //    Non-fatal: if this errors, heatmap is just empty.
  let submissionHeatmap: Array<{ date: string; count: number }> = [];
  try {
    const statusRes = await cfFetch<RawSubmission[]>(
      `/user.status?handle=${encodeURIComponent(handle)}&from=1&count=5000`,
    );
    if (statusRes.status === "OK" && Array.isArray(statusRes.result)) {
      const byDay = new Map<string, number>();
      for (const sub of statusRes.result) {
        const date = new Date(sub.creationTimeSeconds * 1000)
          .toISOString()
          .slice(0, 10);
        byDay.set(date, (byDay.get(date) ?? 0) + 1);
      }
      submissionHeatmap = [...byDay.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  } catch (err) {
    console.warn(`[codeforces] user.status failed for ${handle}:`, err);
  }

  // Avatar URL: Codeforces returns paths starting with "//" — make absolute.
  const rawAvatar = rawUser.avatar ?? rawUser.titlePhoto ?? "";
  const avatarUrl = rawAvatar.startsWith("//")
    ? `https:${rawAvatar}`
    : rawAvatar || "";

  return {
    user: {
      handle: rawUser.handle,
      rating: rawUser.rating ?? null,
      maxRating: rawUser.maxRating ?? null,
      rank: rawUser.rank ?? null,
      maxRank: rawUser.maxRank ?? null,
      contribution: rawUser.contribution ?? 0,
      avatarUrl,
      country: rawUser.country,
      organization: rawUser.organization,
    },
    recentContests,
    ratingHistory,
    contestsParticipated: ratingChanges.length,
    submissionHeatmap,
  };
}

// ─── Public entry point ────────────────────────────────────────────────────

export async function getCodeforcesData(
  handle: string,
): Promise<CachedResult<CodeforcesData> | null> {
  // Cache-key version suffix. Bump when the CodeforcesData shape changes so
  // old cached rows (missing newer fields like `submissionHeatmap`) aren't
  // served back to UI code that now reads those fields. v2: added
  // v3: fetch 5000 submissions, keep all years (was 500, capped to 6 months).
  const key = `${handle.trim().toLowerCase()}:v3`;
  if (!handle.trim()) return null;

  try {
    return await getOrFetch<CodeforcesData>({
      provider: "codeforces",
      key,
      ttlSeconds: TTL_SECONDS,
      fetcher: () => fetchCodeforcesFresh(handle.trim()),
    });
  } catch (err) {
    if (err instanceof CodeforcesUserNotFoundError) return null;
    console.error(`[codeforces] fetch failed for ${key}:`, err);
    return null;
  }
}