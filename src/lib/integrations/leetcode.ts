import { getOrFetch, type CachedResult } from "./cache";

/*
 * LeetCode integration.
 *
 * LeetCode has no official public API. The endpoint we use,
 *   POST https://leetcode.com/graphql
 * is the same one the website itself queries — it accepts public reads
 * without authentication for profile data.
 *
 * Caveats and risks (worth being honest about):
 *
 *  1. There is no contract. LeetCode can change the schema or block
 *     unauthenticated reads at any time. We treat all errors as "skip the
 *     section" rather than crashing the page.
 *
 *  2. LeetCode has been observed to bot-block requests from cloud IPs
 *     (Vercel, AWS Lambda) more aggressively over time. If/when that
 *     happens to us, this integration will start returning null and the
 *     LeetCode section will quietly disappear from public pages until
 *     we swap in a workaround (e.g. Playwright + stealth, or a 3rd-party
 *     proxy service). For now: ship the simple version.
 *
 *  3. We send a User-Agent header that looks like a normal browser. Without
 *     it, LeetCode often returns 403. This isn't deception — it's just that
 *     the default Node/Vercel User-Agent triggers their basic bot filter.
 *
 * What we fetch:
 *   - matchedUser: profile (real name, country, ranking, contributions)
 *   - submitStatsGlobal.acSubmissionNum: solved-count by difficulty
 *
 * What we DON'T fetch:
 *   - Contest rating (lives behind a different query and is sometimes
 *     null for users who haven't done a contest). Punted to a later step.
 *   - Recent submissions (lots of data, low value for a portfolio).
 *   - Submission calendar / streak (changes daily, would need shorter TTL).
 */

// ─── Public shape ──────────────────────────────────────────────────────────

export interface LeetCodeData {
  username: string;
  realName: string | null;
  country: string | null;
  ranking: number | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  // Activity
  currentStreak: number;
  totalActiveDays: number;
  // Submission heatmap: [{ date: "YYYY-MM-DD", count }], chronological.
  // Derived from the API's stringified unix-timestamp→count map.
  submissionHeatmap: Array<{ date: string; count: number }>;
  // Contest rating history (chronological). Empty if the user never
  // competed. Each point is the rating after that contest.
  contestHistory: Array<{ timestamp: number; rating: number; title: string }>;
}

export class LeetCodeUserNotFoundError extends Error {
  constructor(username: string) {
    super(`LeetCode user not found: ${username}`);
    this.name = "LeetCodeUserNotFoundError";
  }
}

// ─── Fetcher ───────────────────────────────────────────────────────────────

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const TTL_SECONDS = 60 * 60;

const PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        countryName
        ranking
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
      userCalendar {
        streak
        totalActiveDays
        submissionCalendar
      }
    }
    userContestRankingHistory(username: $username) {
      rating
      attended
      contest {
        title
        startTime
      }
    }
  }
`;

interface LCDifficultyEntry {
  difficulty: "All" | "Easy" | "Medium" | "Hard";
  count: number;
}

interface LCResponse {
  data?: {
    matchedUser: null | {
      username: string;
      profile: {
        realName: string | null;
        countryName: string | null;
        ranking: number | null;
      };
      submitStatsGlobal: {
        acSubmissionNum: LCDifficultyEntry[];
      };
      userCalendar: {
        streak: number | null;
        totalActiveDays: number | null;
        // A JSON *string* of { "<unixSeconds>": count }. Must be parsed again.
        submissionCalendar: string | null;
      } | null;
    };
    userContestRankingHistory: Array<{
      rating: number;
      attended: boolean;
      contest: { title: string; startTime: number };
    }> | null;
  };
  errors?: Array<{ message: string }>;
}

async function fetchLeetCodeFresh(username: string): Promise<LeetCodeData> {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      // The Referer header reduces the likelihood of being bot-blocked
      // because LeetCode's own pages send it.
      Referer: `https://leetcode.com/u/${encodeURIComponent(username)}/`,
    },
    body: JSON.stringify({
      query: PROFILE_QUERY,
      variables: { username },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) throw new LeetCodeUserNotFoundError(username);
    throw new Error(`LeetCode HTTP ${res.status}`);
  }

  const json = (await res.json()) as LCResponse;

  if (json.errors && json.errors.length > 0) {
    // Some "errors" are actually "user not found" — match the message.
    if (
      json.errors.some((e) =>
        /that user does not exist|not found/i.test(e.message),
      )
    ) {
      throw new LeetCodeUserNotFoundError(username);
    }
    throw new Error(`LeetCode GraphQL: ${json.errors[0].message}`);
  }

  const matched = json.data?.matchedUser;
  if (!matched) throw new LeetCodeUserNotFoundError(username);

  // Project the difficulty array into a flat shape.
  const counts = Object.fromEntries(
    matched.submitStatsGlobal.acSubmissionNum.map((e) => [e.difficulty, e.count]),
  ) as Record<LCDifficultyEntry["difficulty"], number | undefined>;

  // submissionCalendar is a JSON *string* of { "<unixSeconds>": count }.
  // Parse it (defensively — it's double-encoded), convert each key to a
  // YYYY-MM-DD date, and sort chronologically for the heatmap.
  const submissionHeatmap: LeetCodeData["submissionHeatmap"] = [];
  const rawCalendar = matched.userCalendar?.submissionCalendar;
  if (rawCalendar) {
    try {
      const map = JSON.parse(rawCalendar) as Record<string, number>;
      for (const [unixStr, count] of Object.entries(map)) {
        const ts = Number(unixStr);
        if (!Number.isFinite(ts)) continue;
        const date = new Date(ts * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
        submissionHeatmap.push({ date, count });
      }
      submissionHeatmap.sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      // Malformed calendar — skip the heatmap, keep the rest.
    }
  }

  // Contest history: keep only attended contests, chronological, mapped to a
  // minimal { timestamp, rating, title } shape. Ratings are floats; round.
  const contestHistory: LeetCodeData["contestHistory"] = (
    json.data?.userContestRankingHistory ?? []
  )
    .filter((c) => c.attended)
    .map((c) => ({
      timestamp: c.contest.startTime,
      rating: Math.round(c.rating),
      title: c.contest.title,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    username: matched.username,
    realName: matched.profile.realName,
    country: matched.profile.countryName,
    ranking: matched.profile.ranking,
    totalSolved: counts.All ?? 0,
    easySolved: counts.Easy ?? 0,
    mediumSolved: counts.Medium ?? 0,
    hardSolved: counts.Hard ?? 0,
    currentStreak: matched.userCalendar?.streak ?? 0,
    totalActiveDays: matched.userCalendar?.totalActiveDays ?? 0,
    submissionHeatmap,
    contestHistory,
  };
}

// ─── Public entry point ────────────────────────────────────────────────────

export async function getLeetCodeData(
  username: string,
): Promise<CachedResult<LeetCodeData> | null> {
  // Cache-key version suffix. v2: added `currentStreak`, `totalActiveDays`,
  // `submissionHeatmap`, `contestHistory`. Bumping the key invalidates v1
  // cache rows so the UI doesn't read fields that don't exist on them.
  const key = `${username.trim().toLowerCase()}:v2`;
  if (!username.trim()) return null;

  try {
    return await getOrFetch<LeetCodeData>({
      provider: "leetcode",
      key,
      ttlSeconds: TTL_SECONDS,
      fetcher: () => fetchLeetCodeFresh(username.trim()),
    });
  } catch (err) {
    if (err instanceof LeetCodeUserNotFoundError) return null;
    console.error(`[leetcode] fetch failed for ${key}:`, err);
    return null;
  }
}
