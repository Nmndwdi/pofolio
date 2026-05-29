import Link from "next/link";
import Image from "next/image";
import type { GitHubData } from "@/lib/integrations/github";
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap";

/*
 * GitHub section renderer for the public portfolio page.
 *
 * Pure presentational — accepts the data object, renders. No fetching here;
 * fetching happens in the page component so all sections fetch in parallel.
 *
 * Three blocks, in order of importance for a recruiter:
 *   1. Headline stats — total stars, public repos, followers
 *   2. Top repos — up to 6, sorted by stars
 *   3. Language breakdown — small chip row showing what they work with
 */

export function GitHubSection({ data }: { data: GitHubData }) {
  return (
    <section className="space-y-5">
      <SectionHeader user={data.user} totalStars={data.totalStars} />

      {data.contributions && data.contributions.days.length > 0 && (
        <GitHubContributionHeatmap
          data={data.contributions.days}
          total={data.contributions.total}
        />
      )}

      {data.topRepos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-p-display text-base italic text-p-fg-muted">
            Top repositories
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.topRepos.map((repo) => (
              <RepoCard key={repo.fullName} repo={repo} />
            ))}
          </ul>
        </div>
      )}

      {data.languageBreakdown.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="font-p-display text-sm italic text-p-fg-muted">
            Languages:
          </span>
          {data.languageBreakdown.map(({ language, count }) => (
            <span
              key={language}
              className="inline-flex items-center gap-1.5 rounded-full border border-p-border bg-p-surface px-2.5 py-0.5 text-xs"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: languageColor(language) }}
                aria-hidden
              />
              {language}
              <span className="text-p-fg-muted">×{count}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Subcomponents ──────────────────────────────────────────────────────── */

function SectionHeader({
  user,
  totalStars,
}: {
  user: GitHubData["user"];
  totalStars: number;
}) {
  return (
    <div className="flex items-center gap-4">
      {/*
       * GitHub avatars are 460x460 by default; we render at 48px. Using
       * Next/Image gets us automatic resize via the optimization pipeline,
       * which is configured in next.config.mjs to allow GH avatar URLs.
       */}
      <Image
        src={user.avatarUrl}
        alt={`${user.login} on GitHub`}
        width={48}
        height={48}
        className="size-12 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <Link
          href={user.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-base font-medium hover:underline"
        >
          @{user.login}
        </Link>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-p-fg-muted">
          <Stat label="repos" value={user.publicRepos} />
          <Stat label="stars" value={totalStars} />
          <Stat label="followers" value={user.followers} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="font-medium text-p-fg">{compact(value)}</span>{" "}
      {label}
    </span>
  );
}

function RepoCard({ repo }: { repo: GitHubData["topRepos"][number] }) {
  return (
    <li>
      <Link
        href={repo.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col rounded-md border border-p-border bg-p-surface p-4 transition-colors hover:bg-p-surface-2"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-medium">{repo.name}</span>
          {repo.stars > 0 && (
            <span className="shrink-0 text-xs text-p-fg-muted">
              ★ {compact(repo.stars)}
            </span>
          )}
        </div>
        {repo.description && (
          <p className="mt-1 line-clamp-2 text-xs text-p-fg-muted">
            {repo.description}
          </p>
        )}
        {repo.language && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-p-fg-muted">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: languageColor(repo.language) }}
              aria-hidden
            />
            {repo.language}
          </div>
        )}
      </Link>
    </li>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Format numbers compactly: 1234 → "1.2k", 1500000 → "1.5M".
 * Uses Intl for proper locale-aware formatting (no separate library).
 */
function compact(n: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * Approximate color per language, matching GitHub's palette for the most
 * common ones. Recognizable at a glance even when text is small.
 *
 * Source-of-truth at GitHub is github-linguist/languages.yml. We hardcode
 * the top ~25; everything else falls back to a neutral gray. Keeping this
 * inline rather than importing a 200KB JSON file.
 */
function languageColor(lang: string): string {
  const map: Record<string, string> = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#dea584",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Shell: "#89e051",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    Lua: "#000080",
    R: "#198CE7",
    Scala: "#c22d40",
    Haskell: "#5e5086",
    Elixir: "#6e4a7e",
    Jupyter: "#DA5B0B",
  };
  return map[lang] ?? "#888";
}
