/*
 * Smart link categorization.
 *
 * Custom links are free-form (label + URL). When a user has more than a few,
 * a flat list reads as noise. Grouping them by what they point to — Social,
 * Code, Writing, Design, Other — gives the section structure without the
 * user having to tag anything.
 *
 * The classifier is pure and host-based: it inspects the URL's hostname and
 * matches against known platforms. This is deliberately conservative — when
 * in doubt, a link goes to "Other" rather than being mis-filed. A wrong
 * category is worse than a neutral one.
 *
 * Pure function, no dependencies — trivially unit-testable, and runs the same
 * on server and client.
 */

export type LinkCategory =
  | "social"
  | "code"
  | "writing"
  | "design"
  | "video"
  | "other";

export const CATEGORY_LABELS: Record<LinkCategory, string> = {
  social: "Social",
  code: "Code",
  writing: "Writing",
  design: "Design",
  video: "Video",
  other: "Links",
};

// Display order for the categories — code/writing/design lead because for a
// dev/maker portfolio they're the most relevant; social and other trail.
export const CATEGORY_ORDER: LinkCategory[] = [
  "code",
  "writing",
  "design",
  "video",
  "social",
  "other",
];

// Host substring → category. We match if the hostname *contains* the key,
// so "www.github.com" and "gist.github.com" both match "github.com".
// Order within a category doesn't matter; first match across the whole map
// wins via the loop below.
const HOST_RULES: Array<{ match: string; category: LinkCategory }> = [
  // Code / developer platforms
  { match: "github.com", category: "code" },
  { match: "gitlab.com", category: "code" },
  { match: "bitbucket.org", category: "code" },
  { match: "stackoverflow.com", category: "code" },
  { match: "leetcode.com", category: "code" },
  { match: "codeforces.com", category: "code" },
  { match: "codechef.com", category: "code" },
  { match: "hackerrank.com", category: "code" },
  { match: "kaggle.com", category: "code" },
  { match: "codepen.io", category: "code" },
  { match: "replit.com", category: "code" },
  { match: "npmjs.com", category: "code" },
  { match: "pypi.org", category: "code" },
  { match: "huggingface.co", category: "code" },

  // Writing / blogging
  { match: "medium.com", category: "writing" },
  { match: "dev.to", category: "writing" },
  { match: "hashnode.dev", category: "writing" },
  { match: "hashnode.com", category: "writing" },
  { match: "substack.com", category: "writing" },
  { match: "wordpress.com", category: "writing" },
  { match: "blogger.com", category: "writing" },
  { match: "ghost.io", category: "writing" },
  { match: "notion.site", category: "writing" },

  // Design / creative
  { match: "dribbble.com", category: "design" },
  { match: "behance.net", category: "design" },
  { match: "figma.com", category: "design" },
  { match: "artstation.com", category: "design" },
  { match: "deviantart.com", category: "design" },
  { match: "unsplash.com", category: "design" },

  // Video
  { match: "youtube.com", category: "video" },
  { match: "youtu.be", category: "video" },
  { match: "twitch.tv", category: "video" },
  { match: "vimeo.com", category: "video" },

  // Social
  { match: "twitter.com", category: "social" },
  { match: "x.com", category: "social" },
  { match: "linkedin.com", category: "social" },
  { match: "instagram.com", category: "social" },
  { match: "facebook.com", category: "social" },
  { match: "threads.net", category: "social" },
  { match: "mastodon", category: "social" }, // many instances contain "mastodon"
  { match: "bsky.app", category: "social" },
  { match: "bluesky", category: "social" },
  { match: "t.me", category: "social" }, // telegram
  { match: "discord.gg", category: "social" },
  { match: "discord.com", category: "social" },
  { match: "reddit.com", category: "social" },
];

/** Classify a single URL into a category. Falls back to "other". */
export function categorizeUrl(url: string): LinkCategory {
  let hostname: string;
  try {
    // Tolerate URLs without a scheme by prepending one for parsing.
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    hostname = new URL(withScheme).hostname.toLowerCase();
  } catch {
    // Unparseable URL — don't guess, put it in "other".
    return "other";
  }

  for (const rule of HOST_RULES) {
    if (hostname.includes(rule.match)) return rule.category;
  }
  return "other";
}

export interface CategorizedLink {
  id: string;
  label: string;
  url: string;
  category: LinkCategory;
}

export interface LinkGroup {
  category: LinkCategory;
  label: string;
  links: CategorizedLink[];
}

/**
 * Group a list of links by category, returned in CATEGORY_ORDER. Empty
 * categories are omitted.
 *
 * Special case the caller may want: if everything lands in a single category
 * (or just "other"), grouping adds nothing — the caller can detect this by
 * checking `groups.length === 1` and render a flat list instead.
 */
export function groupLinks(
  links: Array<{ id: string; label: string; url: string }>,
): LinkGroup[] {
  const categorized: CategorizedLink[] = links.map((l) => ({
    ...l,
    category: categorizeUrl(l.url),
  }));

  const groups: LinkGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const inCategory = categorized.filter((l) => l.category === category);
    if (inCategory.length > 0) {
      groups.push({
        category,
        label: CATEGORY_LABELS[category],
        links: inCategory,
      });
    }
  }
  return groups;
}
