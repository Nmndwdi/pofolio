import { getOrFetch, type CachedResult } from "./cache";

/*
 * GitHub integration.
 *
 * Two REST endpoints:
 *   GET /users/{username}            → user profile (name, avatar, public_repos, followers)
 *   GET /users/{username}/repos      → list of public repos (paginated, default 30)
 *
 * Auth: optional. With GITHUB_TOKEN set we get 5000 req/hour. Without it,
 * 60 req/hour shared across all users behind our IP — fine for low traffic
 * but should be set in production.
 *
 * What we DON'T do:
 *   - "Pinned repositories" — REST doesn't expose those (GraphQL only).
 *     We approximate by sorting by stars desc, skipping forks. Good enough.
 *   - Contribution graph / streak — not in any official API. Some tools
 *     scrape the SVG from the profile page; that's fragile and we're not
 *     starting with it. Can be added later as an optional integration.
 *   - Per-language byte counts (would require N+1 fetches, one per repo).
 *     We use the `language` field on each repo (its primary language) and
 *     aggregate counts. Less precise than byte-weighted, but free.
 *
 * Caching: 1-hour TTL. Public data, low staleness sensitivity (a repo getting
 * one new star isn't urgent). Cache key is just the lowercased username so
 * two users linking the same handle share one cache entry.
 */

// ─── Public shape (what the UI consumes) ───────────────────────────────────

export interface GitHubData {
  user: {
    login: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string;
    htmlUrl: string;
    publicRepos: number;
    followers: number;
  };
  topRepos: Array<{
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    stars: number;
    forks: number;
    language: string | null;
    topics: string[];
    updatedAt: string;
  }>;
  totalStars: number; // summed across all non-fork repos we saw
  // Sorted [{ language, count }] desc — language presence across non-fork repos.
  languageBreakdown: Array<{ language: string; count: number }>;
  // Contribution calendar (last year), fetched via GraphQL when GITHUB_TOKEN
  // is set. null when unavailable (no token, or the GraphQL call failed).
  // `days` is a flat chronological list; `total` is the year's contribution
  // count as GitHub reports it.
  contributions: {
    total: number;
    days: Array<{ date: string; count: number }>;
  } | null;
}

// ─── Errors ────────────────────────────────────────────────────────────────

export class GitHubUserNotFoundError extends Error {
  constructor(username: string) {
    super(`GitHub user not found: ${username}`);
    this.name = "GitHubUserNotFoundError";
  }
}

export class GitHubRateLimitError extends Error {
  constructor() {
    super("GitHub API rate limit exceeded");
    this.name = "GitHubRateLimitError";
  }
}

// ─── Internal raw types (only the fields we read) ──────────────────────────

interface RawUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
}

interface RawRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  updated_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
}

// ─── Fetcher ───────────────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";
const TTL_SECONDS = 60 * 60; // 1 hour

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function ghFetch(path: string): Promise<Response> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: authHeaders(),
    // Disable Next's built-in fetch caching here — we cache in Mongo ourselves.
    // Without this, Next would also cache, which makes invalidation confusing.
    cache: "no-store",
  });
  return res;
}

/*
 * Fetch the contribution calendar via GitHub's GraphQL API.
 *
 * The famous green calendar is GraphQL-ONLY — the REST API can't return it.
 * GraphQL also REQUIRES a token (even for public data), so this is skipped
 * entirely when GITHUB_TOKEN isn't set, returning null. The rest of the
 * GitHub integration (REST) still works without a token.
 *
 * The `contributionsCollection.contributionCalendar` shape has been stable
 * for years: a total count plus weeks → days, each day having a date and a
 * contributionCount. We flatten the weeks into a single chronological list.
 *
 * Returns null (never throws) on any failure — the contribution graph is an
 * enhancement, not load-bearing; its absence must not break the GitHub
 * section.
 */
const GITHUB_GRAPHQL = "https://api.github.com/graphql";

const CONTRIBUTIONS_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

interface ContribResponse {
  data?: {
    user: null | {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: Array<{
              date: string;
              contributionCount: number;
            }>;
          }>;
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

async function fetchContributions(
  username: string,
): Promise<GitHubData["contributions"]> {
  // No token → GraphQL is unavailable. Skip silently (REST data still shows).
  if (!process.env.GITHUB_TOKEN) return null;

  try {
    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: { login: username },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[github] contributions GraphQL HTTP ${res.status}`);
      return null;
    }

    const json = (await res.json()) as ContribResponse;
    if (json.errors?.length) {
      console.warn(`[github] contributions GraphQL: ${json.errors[0].message}`);
      return null;
    }

    const cal = json.data?.user?.contributionsCollection.contributionCalendar;
    if (!cal) return null;

    const days = cal.weeks.flatMap((w) =>
      w.contributionDays.map((d) => ({
        date: d.date,
        count: d.contributionCount,
      })),
    );

    return { total: cal.totalContributions, days };
  } catch (err) {
    console.warn(`[github] contributions fetch failed:`, err);
    return null;
  }
}

async function fetchGitHubFresh(username: string): Promise<GitHubData> {
  // 1. User profile
  const userRes = await ghFetch(`/users/${encodeURIComponent(username)}`);
  if (userRes.status === 404) throw new GitHubUserNotFoundError(username);
  if (userRes.status === 403 || userRes.status === 429) {
    throw new GitHubRateLimitError();
  }
  if (!userRes.ok) {
    throw new Error(`GitHub user fetch failed: ${userRes.status}`);
  }
  const rawUser = (await userRes.json()) as RawUser;

  // 2. Repos. Sorted by recently pushed; we'll re-sort by stars locally.
  //    100 per page is the API max; for portfolio purposes this is plenty
  //    (most users have <100 repos, and we only show the top 6 anyway).
  const reposRes = await ghFetch(
    `/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated`,
  );
  if (!reposRes.ok) {
    throw new Error(`GitHub repos fetch failed: ${reposRes.status}`);
  }
  const rawRepos = (await reposRes.json()) as RawRepo[];

  // Filter: drop forks, archived, and (defensively) any private repos.
  // If a user has marked a repo archived, they probably don't want it
  // headlining their portfolio.
  const ownRepos = rawRepos.filter((r) => !r.fork && !r.archived && !r.private);

  // Top repos: sort by stars desc, then by recency as a tiebreaker.
  const topRepos = [...ownRepos]
    .sort((a, b) => {
      if (b.stargazers_count !== a.stargazers_count) {
        return b.stargazers_count - a.stargazers_count;
      }
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    })
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      htmlUrl: r.html_url,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      topics: r.topics ?? [],
      updatedAt: r.updated_at,
    }));

  const totalStars = ownRepos.reduce((sum, r) => sum + r.stargazers_count, 0);

  // Language breakdown: count repos per primary language, ignoring null.
  const langCounts = new Map<string, number>();
  for (const r of ownRepos) {
    if (!r.language) continue;
    langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);
  }
  const languageBreakdown = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([language, count]) => ({ language, count }));

  // Contribution calendar (GraphQL, token-gated). Fetched after the REST
  // data; returns null if no token or on any failure — never blocks.
  const contributions = await fetchContributions(rawUser.login);

  return {
    user: {
      login: rawUser.login,
      name: rawUser.name,
      bio: rawUser.bio,
      avatarUrl: rawUser.avatar_url,
      htmlUrl: rawUser.html_url,
      publicRepos: rawUser.public_repos,
      followers: rawUser.followers,
    },
    topRepos,
    totalStars,
    languageBreakdown,
    contributions,
  };
}

// ─── Public entry point ────────────────────────────────────────────────────

/**
 * Fetch GitHub data for a username, with caching.
 *
 * Returns null when the user doesn't exist on GitHub — distinct from "fetch
 * failed", because the caller (the public page) should render "couldn't find
 * @foo on GitHub" instead of "couldn't fetch."
 *
 * Returns null on rate-limit too (with no cached fallback). Treating it as
 * "missing" means the section just doesn't render rather than breaking the
 * page. In production with GITHUB_TOKEN set this should never happen.
 */
export async function getGitHubData(
  username: string,
): Promise<CachedResult<GitHubData> | null> {
  const handleLower = username.trim().toLowerCase();
  if (!handleLower) return null;
  // Cache-key version suffix. v2: added `contributions` (GraphQL calendar).
  const key = `${handleLower}:v2`;

  try {
    return await getOrFetch<GitHubData>({
      provider: "github",
      key,
      ttlSeconds: TTL_SECONDS,
      fetcher: () => fetchGitHubFresh(handleLower),
    });
  } catch (err) {
    if (err instanceof GitHubUserNotFoundError) return null;
    if (err instanceof GitHubRateLimitError) {
      console.warn(`[github] rate limit hit for ${key}, no stale cache`);
      return null;
    }
    // Other errors: log, return null. The public page degrades gracefully.
    console.error(`[github] fetch failed for ${key}:`, err);
    return null;
  }
}
