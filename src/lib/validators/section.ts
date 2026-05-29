import { z } from "zod";

/*
 * Section schemas — a discriminated union on the `type` field.
 *
 * The same Zod schemas are used in three places:
 *   1. React forms (via @hookform/resolvers/zod)
 *   2. API route handlers (request body validation)
 *   3. Mongoose schema (we infer TS types from Zod, then use them in the model)
 *
 * Adding a new section type means: add a schema below, add it to SectionSchema,
 * add a renderer in components/portfolio/. Nothing else.
 */

// ─── Common ───────────────────────────────────────────────────────────────────

const baseSectionFields = {
  // Client-generated stable id (nanoid/uuid). NOT the Mongo _id — we want the
  // section to keep its identity even when the parent Profile is rewritten.
  id: z.string().min(1).max(64),
  // Display title shown above the section on the public page. Optional because
  // some sections (e.g. a single "About" text block) read better without one.
  title: z.string().max(80).optional(),
  // Hide a section without deleting it. Useful while drafting.
  visible: z.boolean().default(true),
};

// ─── GitHub ───────────────────────────────────────────────────────────────────

export const GitHubSectionSchema = z.object({
  ...baseSectionFields,
  type: z.literal("github"),
  data: z.object({
    username: z
      .string()
      .min(1)
      .max(39) // GitHub's documented max
      .regex(/^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/, {
        message: "Invalid GitHub username",
      }),
    showStats: z.boolean().default(true), // total stars, followers, contributions
    showTopRepos: z.boolean().default(true),
    topReposCount: z.number().int().min(1).max(12).default(6),
    showLanguages: z.boolean().default(true),
    // Pin specific repos by full_name; if empty, we use the user's GitHub-pinned ones.
    pinnedRepos: z.array(z.string()).max(6).default([]),
  }),
});

// ─── Codeforces ───────────────────────────────────────────────────────────────

export const CodeforcesSectionSchema = z.object({
  ...baseSectionFields,
  type: z.literal("codeforces"),
  data: z.object({
    handle: z.string().min(1).max(24),
    showRating: z.boolean().default(true),
    showRecentContests: z.boolean().default(true),
    showSolvedCount: z.boolean().default(true),
  }),
});

// ─── LeetCode ─────────────────────────────────────────────────────────────────

export const LeetCodeSectionSchema = z.object({
  ...baseSectionFields,
  type: z.literal("leetcode"),
  data: z.object({
    username: z.string().min(1).max(40),
    showRanking: z.boolean().default(true),
    showSolvedByDifficulty: z.boolean().default(true),
    showRecentSubmissions: z.boolean().default(false),
  }),
});

// ─── Links (the v1 of your old "items") ───────────────────────────────────────

const LinkItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(60),
  url: z.string().url().max(500),
  // Lucide icon name, e.g. "github", "linkedin", "globe". Renderer maps to component.
  icon: z.string().max(40).optional(),
});

export const LinksSectionSchema = z.object({
  ...baseSectionFields,
  type: z.literal("links"),
  data: z.object({
    // Layout hint for the renderer
    layout: z.enum(["list", "grid", "buttons"]).default("buttons"),
    items: z.array(LinkItemSchema).min(1).max(30),
  }),
});

// ─── Files ────────────────────────────────────────────────────────────────────

const FileItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  // What Cloudinary returns after upload. We store IDs not URLs so we can
  // re-derive transformed URLs (resized thumbs, watermarks) at render time.
  cloudinaryId: z.string().min(1).max(200),
  resourceType: z.enum(["image", "video", "raw"]), // raw = PDF, docx, etc.
  format: z.string().max(10), // "pdf", "png", "mp4"
  bytes: z.number().int().nonnegative(),
});

export const FilesSectionSchema = z.object({
  ...baseSectionFields,
  type: z.literal("files"),
  data: z.object({
    items: z.array(FileItemSchema).min(1).max(20),
  }),
});

// ─── Gallery (images, lightbox-style) ─────────────────────────────────────────

const GalleryItemSchema = z.object({
  id: z.string().min(1).max(64),
  caption: z.string().max(140).optional(),
  cloudinaryId: z.string().min(1).max(200),
  width: z.number().int().positive().optional(), // for layout-shift-free rendering
  height: z.number().int().positive().optional(),
});

export const GallerySectionSchema = z.object({
  ...baseSectionFields,
  type: z.literal("gallery"),
  data: z.object({
    items: z.array(GalleryItemSchema).min(1).max(40),
    columns: z.number().int().min(1).max(4).default(3),
  }),
});

// ─── Text (markdown blob) ─────────────────────────────────────────────────────

export const TextSectionSchema = z.object({
  ...baseSectionFields,
  type: z.literal("text"),
  data: z.object({
    // We render as markdown on the public page (sanitized server-side).
    // 8KB cap is plenty for an "About me" section and prevents abuse.
    markdown: z.string().max(8000),
  }),
});

// ─── The discriminated union ──────────────────────────────────────────────────

export const SectionSchema = z.discriminatedUnion("type", [
  GitHubSectionSchema,
  CodeforcesSectionSchema,
  LeetCodeSectionSchema,
  LinksSectionSchema,
  FilesSectionSchema,
  GallerySectionSchema,
  TextSectionSchema,
]);

export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section["type"];
