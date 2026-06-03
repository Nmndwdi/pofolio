import { z } from "zod";
import { slugSchema, themeIdSchema, layoutIdSchema, SocialsSchema } from "./profile";

/*
 * Editor form schema. Maps 1:1 onto the EditorForm UI. The API normalizes
 * (drops empty rows etc.) before persisting.
 */

const handleSchema = z
  .string()
  .trim()
  .max(40)
  .optional()
  .or(z.literal(""));

/*
 * Standard "long description" field — used for the new description slots on
 * customLinks, education, files (and skill groups). 1000 chars accommodates
 * ~150 words / 10-12 bullet-equivalent points, which the user explicitly
 * requested. EditorForm renders a live counter below each one.
 */
const longDescription = z
  .string()
  .trim()
  .max(1000, "Keep it under 1000 characters")
  .optional()
  .or(z.literal(""));

/*
 * customSocials = user-defined social/handle links beyond the fixed five
 * (linkedin/twitter/website/email/github). Used for platforms like Mastodon,
 * Bluesky, Polywork, ORCID, Mastodon, etc. Each entry: label (the platform
 * or descriptor) + url. Distinct from customLinks (which are general-purpose
 * "here is something interesting" links with descriptions).
 */
export const CustomSocialSchema = z
  .object({
    id: z.string().min(1).max(64),
    label: z.string().trim().max(40),
    url: z.string().trim().max(500),
  })
  .refine(
    (v) => {
      // Empty placeholder rows are OK (we drop them at the API boundary).
      if (!v.label && !v.url) return true;
      // If either is present, both must be — and url must parse.
      if (v.label && v.url) {
        try {
          new URL(v.url);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    },
    {
      message: "Both label and a valid URL are required (or leave both empty)",
    },
  );

export const CustomLinkSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().max(60),
  url: z.string().trim().max(500),
  // New: optional description (e.g. "A side project I built in 2024 to learn
  // Rust"). 1000 chars matches the universal description-field cap.
  description: longDescription,
}).refine(
  (v) => {
    if (!v.label && !v.url) return true;
    if (v.label && v.url) {
      try {
        new URL(v.url);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },
  {
    message: "Both label and a valid URL are required (or leave both empty)",
  },
);

export const UploadedFileSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  publicId: z.string().min(1).max(200),
  resourceType: z.enum(["image", "video", "raw"]),
  format: z.string().trim().max(10).default(""),
  bytes: z.number().int().nonnegative(),
  // New: optional description per file. Useful for certificates ("Issued by
  // ECCouncil — credential id ABC-123"), case studies, supporting docs.
  description: longDescription,
});

// A single image inside a project's gallery.
export const ProjectImageSchema = z.object({
  id: z.string().min(1).max(64),
  publicId: z.string().min(1).max(200),
  caption: z.string().trim().max(140).optional().or(z.literal("")),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

// A URL that's either empty (placeholder) or a real http(s) URL. Used by
// the per-project demo/source/video link fields, which are all optional.
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid http(s) URL" },
  );

// A project record. `title` is the only required field — everything else can
// be filled in over time. Empty title means an empty placeholder row from the
// editor, which the API normalize step drops (same pattern as customLinks /
// experience).
export const ProjectSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  role: z.string().trim().max(80).optional().or(z.literal("")),
  year: z.string().trim().max(20).optional().or(z.literal("")),
  demoUrl: optionalUrl,
  sourceUrl: optionalUrl,
  videoUrl: optionalUrl,
  tech: z.array(z.string().trim().max(40)).max(20).default([]),
  images: z.array(ProjectImageSchema).max(12).default([]),
  featured: z.boolean().default(false),
});

export const ExperienceSchema = z.object({
  id: z.string().min(1).max(64),
  company: z.string().trim().max(120),
  role: z.string().trim().max(120),
  dates: z.string().trim().max(60),
  summary: z.string().trim().max(1500),
  // New: per-experience skills. Picked specifically for THIS role
  // ("Elasticsearch, Kibana, Terraform" for the Finnsavvy role; "React,
  // Node.js" for the Consultadd role). Distinct from the global skills /
  // skillGroups below — those are the user's overall toolkit; these
  // contextualize what was used WHERE.
  skills: z.array(z.string().trim().max(40)).max(20).default([]),
});

export const EducationSchema = z.object({
  id: z.string().min(1).max(64),
  institution: z.string().trim().max(160),
  degree: z.string().trim().max(160),
  dates: z.string().trim().max(60),
  // New: optional description — coursework, GPA, thesis topic, honors.
  description: longDescription,
});

/*
 * SkillGroup — a named bucket of skills with an optional description.
 *
 *   { name: "Backend",      skills: ["Node.js", "Python", "PostgreSQL"], description: "Production APIs and data pipelines" }
 *   { name: "Observability",skills: ["Elasticsearch", "Kibana", "Grafana"] }
 *
 * Coexists with the flat `skills` array during migration. At read time
 * (in LayoutData construction), templates see BOTH the flat list AND the
 * groups; if the user has only filled in flat skills, an auto-migration
 * synthesizes a single group called "Skills" containing them. Conversely,
 * if the user has only groups, the flat array stays empty. Templates can
 * choose to render whichever is richer.
 */
export const SkillGroupSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().max(60),
  description: longDescription,
  skills: z.array(z.string().trim().max(40)).max(50).default([]),
});

export const ProfileFormSchema = z.object({
  displayName: z.string().trim().min(1, "Required").max(60),
  headline: z
    .string()
    .trim()
    .max(200, "Keep it under 200 chars")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(1500, "Keep bio under 1500 chars")
    .optional()
    .or(z.literal("")),

  avatarCloudinaryId: z.string().max(200).optional().or(z.literal("")),

  socials: SocialsSchema.default({}),

  github: handleSchema,
  leetcode: handleSchema,
  codeforces: handleSchema,
  devto: handleSchema,
  huggingface: handleSchema,

  customLinks: z.array(CustomLinkSchema).max(20).default([]),

  // New: user-defined social/handle links beyond the built-in 5 (LinkedIn,
  // Twitter, GitHub, website, email). For Mastodon, Bluesky, ORCID,
  // Polywork, Threads, etc.
  customSocials: z.array(CustomSocialSchema).max(15).default([]),

  experience: z.array(ExperienceSchema).max(15).default([]),
  education: z.array(EducationSchema).max(10).default([]),
  skills: z.array(z.string().trim().max(40)).max(50).default([]),

  // New: skills organized into named groups. Coexists with `skills` above —
  // templates may render either or both. EditorForm renders both UIs so users
  // can pick their preferred organization style.
  skillGroups: z.array(SkillGroupSchema).max(10).default([]),

  resumeCloudinaryId: z.string().max(200).optional().or(z.literal("")),
  files: z.array(UploadedFileSchema).max(10).default([]),

  // Projects: up to 20 structured project records (replaces the old
  // projectImages flat gallery).
  projects: z.array(ProjectSchema).max(20).default([]),

  theme: themeIdSchema.default("mono"),
  layout: layoutIdSchema.default("sidebar"),
});

export type ProfileFormInput = z.infer<typeof ProfileFormSchema>;

export const SlugChangeSchema = z.object({ slug: slugSchema });