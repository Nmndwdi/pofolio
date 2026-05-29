import type { CachedResult } from "@/lib/integrations/cache";
import type { GitHubData } from "@/lib/integrations/github";
import type { CodeforcesData } from "@/lib/integrations/codeforces";
import type { LeetCodeData } from "@/lib/integrations/leetcode";
import type { DevToData } from "@/lib/integrations/devto";
import type { HuggingFaceData } from "@/lib/integrations/huggingface";
import type { Socials } from "@/lib/validators/profile";

/*
 * Data envelope every layout consumes. The public-page route loads this once
 * and hands it off; layouts compose. Adding a field here means every layout
 * can opt in to using it.
 */

export interface LayoutData {
  slug: string;
  displayName: string;
  headline?: string;
  bio?: string;
  avatarCloudinaryId?: string;
  socials: Socials;

  // Raw handles — used by the fallback link cards when the live fetch fails
  githubHandle?: string;
  leetcodeHandle?: string;
  codeforcesHandle?: string;

  // Live integration results (null if no handle, value with data otherwise)
  github: CachedResult<GitHubData> | null;
  codeforces: CachedResult<CodeforcesData> | null;
  leetcode: CachedResult<LeetCodeData> | null;
  devto: CachedResult<DevToData> | null;
  huggingface: CachedResult<HuggingFaceData> | null;

  customLinks: Array<{ id: string; label: string; url: string }>;

  // Resume-derived structured content
  experience: Array<{
    id: string;
    company: string;
    role: string;
    dates: string;
    summary: string;
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    dates: string;
  }>;
  skills: string[];

  resumeCloudinaryId?: string;
  files: Array<{
    id: string;
    label: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    format: string;
    bytes: number;
  }>;
  projectImages: Array<{
    id: string;
    caption?: string;
    publicId: string;
    width?: number;
    height?: number;
  }>;
}

/**
 * Section keys in canonical display order. Layouts that build nav menus
 * generate items from this list.
 */
export type SectionKey =
  | "experience"
  | "education"
  | "skills"
  | "code"
  | "competitive"
  | "problem-solving"
  | "writing"
  | "ml"
  | "projects"
  | "links"
  | "files";

export const SECTION_LABELS: Record<SectionKey, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  code: "Code",
  competitive: "Competitive",
  "problem-solving": "Problem-solving",
  writing: "Writing",
  ml: "ML Work",
  projects: "Projects",
  links: "Links",
  files: "Files",
};

/** Predicates centralizing "should this section render" logic. */
export const has = {
  experience: (d: LayoutData) => d.experience.length > 0,
  education: (d: LayoutData) => d.education.length > 0,
  skills: (d: LayoutData) => d.skills.length > 0,
  github: (d: LayoutData) => !!d.github,
  codeforces: (d: LayoutData) => !!d.codeforces,
  leetcode: (d: LayoutData) => !!d.leetcode,
  devto: (d: LayoutData) => !!d.devto,
  huggingface: (d: LayoutData) => !!d.huggingface,
  // "Writing" currently means Dev.to. (Hashnode was removed when they moved
  // their API to a paid plan in May 2026.) Umbrella name kept so more writing
  // platforms can slot in later without renaming the section.
  writing: (d: LayoutData) => !!d.devto,
  projects: (d: LayoutData) => d.projectImages.length > 0,
  links: (d: LayoutData) => d.customLinks.length > 0,
  files: (d: LayoutData) => !!d.resumeCloudinaryId || d.files.length > 0,
  socials: (d: LayoutData) =>
    Object.values(d.socials).some((v) => typeof v === "string" && v.length > 0),
  fallbackHandles: (d: LayoutData) =>
    !!(
      (d.githubHandle && !d.github) ||
      (d.leetcodeHandle && !d.leetcode) ||
      (d.codeforcesHandle && !d.codeforces)
    ),
};

/** Compute which section keys to render for a given user. */
export function sectionsFor(d: LayoutData): SectionKey[] {
  const s: SectionKey[] = [];
  // Experience/education/skills lead — they're the "portfolio backbone".
  if (has.experience(d)) s.push("experience");
  if (has.education(d)) s.push("education");
  if (has.skills(d)) s.push("skills");
  if (has.github(d)) s.push("code");
  if (has.codeforces(d)) s.push("competitive");
  if (has.leetcode(d)) s.push("problem-solving");
  if (has.writing(d)) s.push("writing");
  if (has.huggingface(d)) s.push("ml");
  if (has.projects(d)) s.push("projects");
  if (has.links(d) || has.fallbackHandles(d)) s.push("links");
  if (has.files(d)) s.push("files");
  return s;
}
