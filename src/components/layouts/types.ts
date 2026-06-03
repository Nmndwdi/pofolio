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

// A single image inside a project gallery.
export interface ProjectImage {
  id: string;
  publicId: string;
  caption?: string;
  width?: number;
  height?: number;
}

// A project record — title + description + links + images + tech list.
export interface Project {
  id: string;
  title: string;
  description?: string;
  role?: string;
  year?: string;
  demoUrl?: string;
  sourceUrl?: string;
  videoUrl?: string;
  tech?: string[];
  images?: ProjectImage[];
  featured?: boolean;
}

export interface LayoutData {
  slug: string;
  displayName: string;
  headline?: string;
  bio?: string;
  avatarCloudinaryId?: string;
  socials: Socials;

  githubHandle?: string;
  leetcodeHandle?: string;
  codeforcesHandle?: string;

  github: CachedResult<GitHubData> | null;
  codeforces: CachedResult<CodeforcesData> | null;
  leetcode: CachedResult<LeetCodeData> | null;
  devto: CachedResult<DevToData> | null;
  huggingface: CachedResult<HuggingFaceData> | null;

  customLinks: Array<{
    id: string;
    label: string;
    url: string;
    /** Optional description (≤1000 chars). */
    description?: string;
  }>;

  /**
   * User-defined social/handle links beyond the built-in 5 (linkedin /
   * twitter / website / email / github in `socials`). For Mastodon, Bluesky,
   * ORCID, Polywork, Threads, etc.
   */
  customSocials: Array<{ id: string; label: string; url: string }>;

  experience: Array<{
    id: string;
    company: string;
    role: string;
    dates: string;
    summary: string;
    /** Per-experience skills — what was used in THIS role specifically. */
    skills?: string[];
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    dates: string;
    /** Optional description (coursework, thesis, GPA, ≤1000 chars). */
    description?: string;
  }>;
  /**
   * Flat list of skills. Backwards-compat with the original schema. Coexists
   * with `skillGroups` below. Templates may render either or both.
   */
  skills: string[];
  /**
   * Skills organized into named groups. Each group has a name, optional
   * description, and its own skills array. If the user only has flat skills,
   * a synthetic single group ("Skills") is provided by the page loader so
   * templates don't have to special-case the empty-groups path — they can
   * always render `skillGroups` and get something useful.
   */
  skillGroups: Array<{
    id: string;
    name: string;
    description?: string;
    skills: string[];
  }>;

  resumeCloudinaryId?: string;
  files: Array<{
    id: string;
    label: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    format: string;
    bytes: number;
    /** Optional description (≤1000 chars). */
    description?: string;
  }>;

  // Structured projects (replaces the old `projectImages` flat gallery).
  projects: Project[];
}

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

export const has = {
  experience: (d: LayoutData) => d.experience.length > 0,
  education: (d: LayoutData) => d.education.length > 0,
  skills: (d: LayoutData) => d.skills.length > 0,
  github: (d: LayoutData) => !!d.github,
  codeforces: (d: LayoutData) => !!d.codeforces,
  leetcode: (d: LayoutData) => !!d.leetcode,
  devto: (d: LayoutData) => !!d.devto,
  huggingface: (d: LayoutData) => !!d.huggingface,
  writing: (d: LayoutData) => !!d.devto,
  // Now: a project counts if it has a title (we drop title-less rows at the
  // API boundary, so any project in `projects` is a real one).
  projects: (d: LayoutData) => d.projects.length > 0,
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

export function sectionsFor(d: LayoutData): SectionKey[] {
  const s: SectionKey[] = [];
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