import { z } from "zod";
import { slugSchema, themeIdSchema, layoutIdSchema, SocialsSchema } from "./profile";

/*
 * The editor is a structured FORM, not a section-builder.
 * The user fills these fields; we translate to the underlying section array
 * at save time. This keeps the persistence layer flexible (sections can be
 * reordered, new section types can be added) while presenting the user with
 * a much simpler "fill in the blanks" UX.
 *
 * The form is intentionally flat. Adding a new field here means:
 *   1. Add it to the schema
 *   2. Add it to the form UI
 *   3. Add a renderer for it on the public page
 * No section juggling required.
 */

const handleSchema = z
  .string()
  .trim()
  .max(40)
  .optional()
  .or(z.literal(""));

const urlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(500)
  .optional()
  .or(z.literal(""));

export const CustomLinkSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().trim().max(60),
  url: z.string().trim().max(500),
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
});

export const ProjectImageSchema = z.object({
  id: z.string().min(1).max(64),
  caption: z.string().trim().max(140).optional().or(z.literal("")),
  publicId: z.string().min(1).max(200),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

// Work-experience entry. Summary cap was 400; bumped to 1500 because real
// resume bullet sets are routinely longer than 400 chars (especially after
// the parser concatenates multiple bullets into one summary blob).
export const ExperienceSchema = z.object({
  id: z.string().min(1).max(64),
  company: z.string().trim().max(120),
  role: z.string().trim().max(120),
  dates: z.string().trim().max(60),
  summary: z.string().trim().max(1500),
});

export const EducationSchema = z.object({
  id: z.string().min(1).max(64),
  institution: z.string().trim().max(160),
  degree: z.string().trim().max(160),
  dates: z.string().trim().max(60),
});

export const ProfileFormSchema = z.object({
  displayName: z.string().trim().min(1, "Required").max(60),
  headline: z
    .string()
    .trim()
    .max(200, "Keep it under 200 chars")
    .optional()
    .or(z.literal("")),
  // Bio cap was 500; bumped to 1500 to match the experience summary limit.
  // Allows a real paragraph of context, not just a one-liner.
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

  experience: z.array(ExperienceSchema).max(15).default([]),
  education: z.array(EducationSchema).max(10).default([]),
  skills: z.array(z.string().trim().max(40)).max(50).default([]),

  resumeCloudinaryId: z.string().max(200).optional().or(z.literal("")),
  files: z.array(UploadedFileSchema).max(10).default([]),
  projectImages: z.array(ProjectImageSchema).max(12).default([]),

  theme: themeIdSchema.default("mono"),
  layout: layoutIdSchema.default("sidebar"),
});

export type ProfileFormInput = z.infer<typeof ProfileFormSchema>;

export const SlugChangeSchema = z.object({ slug: slugSchema });