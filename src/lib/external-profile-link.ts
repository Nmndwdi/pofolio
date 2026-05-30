import type { LayoutData, SectionKey } from "@/components/layouts/types";

/*
 * For sections backed by an external platform (GitHub, Codeforces, etc.),
 * return the URL of the user's profile on that platform — so we can show a
 * "↗ codeforces.com/profile/foo" link next to the section title.
 *
 * Returns null when there's no associated external profile (e.g. Experience,
 * Education, Skills) or when the handle isn't set.
 *
 * Centralised here so we don't sprinkle platform-URL templates across the
 * layouts. New platforms only need one new entry below.
 */

interface ExternalLink {
  url: string;
  label: string; // short host label shown in the UI (e.g. "codeforces.com")
}

export function externalProfileLink(
  key: SectionKey,
  data: LayoutData,
): ExternalLink | null {
  switch (key) {
    case "code": {
      // GitHub. Prefer the handle from the cached data (canonical case),
      // fall back to the form-input handle.
      const handle = data.github?.data.user.login ?? data.githubHandle;
      if (!handle) return null;
      return {
        url: `https://github.com/${handle}`,
        label: "github.com",
      };
    }
    case "competitive": {
      // Codeforces.
      const handle = data.codeforces?.data.user.handle ?? data.codeforcesHandle;
      if (!handle) return null;
      return {
        url: `https://codeforces.com/profile/${handle}`,
        label: "codeforces.com",
      };
    }
    case "problem-solving": {
      // LeetCode. The cached data carries `username`.
      const handle = data.leetcode?.data.username ?? data.leetcodeHandle;
      if (!handle) return null;
      return {
        url: `https://leetcode.com/u/${handle}/`,
        label: "leetcode.com",
      };
    }
    case "writing": {
      // Dev.to.
      const handle = data.devto?.data.username;
      if (!handle) return null;
      return {
        url: `https://dev.to/${handle}`,
        label: "dev.to",
      };
    }
    case "ml": {
      // Hugging Face.
      const handle = data.huggingface?.data.username;
      if (!handle) return null;
      return {
        url: `https://huggingface.co/${handle}`,
        label: "huggingface.co",
      };
    }
    default:
      return null;
  }
}