import { z } from "zod";
import { SectionSchema } from "./section";

/*
 * Slug rules:
 * - 3-30 chars (short enough to be brandable, long enough to be unique)
 * - Lowercase letters, digits, hyphens
 * - Cannot start or end with a hyphen
 * - No consecutive hyphens
 *
 * Reserved slugs (api, p, admin, dashboard, settings, …) are checked separately
 * in the API handler — keeping them here would require importing app routing
 * config into a pure validation file.
 */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(30, "At most 30 characters")
  .regex(
    /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,28}[a-z0-9]$/,
    "Use lowercase letters, digits, and single hyphens",
  );

/*
 * Theme = visual treatment (colors, fonts, mood).
 * Layout = page structure (single / sidebar / multi-page / grid).
 *
 * They're orthogonal — any theme works with any layout. The user picks both
 * separately in the editor.
 *
 * Legacy "minimal" values from earlier builds are mapped to "mono" at read
 * time by resolveTheme() in src/lib/theme.ts.
 */
export const themeIdSchema = z.enum([
  "mono",     // clean white, sans, sharp accents — default
  "paper",    // warm cream, serif, editorial
  "terminal", // dark, mono everywhere, green accent
  "glass",    // dark with translucent panels
]);
export type ThemeId = z.infer<typeof themeIdSchema>;

export const layoutIdSchema = z.enum([
  // Three fully self-contained templates, each under src/templates/.
  // Legacy values (sidebar, single, multipage, grid) were retired in the
  // template-architecture migration; the API normalize step coerces any
  // legacy value to "press" before save.
  "terminal",  // interactive CLI portfolio — type commands, get output
  "brutalist", // neo-brutalism — massive type, hard shadows, hazard yellow
  "press",     // editorial newspaper — serif masthead, oxblood-on-cream
  "bento",
]);
export type LayoutId = z.infer<typeof layoutIdSchema>;

/*
 * Social handles live on the Profile (not as sections) because they're tiny
 * and almost everyone wants them in the header. Sections are for richer,
 * fetched/embedded content.
 */
/*
 * Socials. Each field is OPTIONAL — but the form sends empty strings rather
 * than undefined for unfilled inputs (controlled inputs need a value). So
 * each field accepts either: missing/undefined, an empty string, or a value
 * matching its constraint. The API normalize step coerces "" → undefined
 * before saving so we don't litter the DB with empty strings.
 */
export const SocialsSchema = z.object({
  github: z.string().max(40).optional().or(z.literal("")),
  linkedin: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  twitter: z.string().max(15).optional().or(z.literal("")),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
});

export const ProfileSchema = z.object({
  slug: slugSchema,
  displayName: z.string().trim().min(1).max(60),
  headline: z.string().trim().max(120).optional(), // "Final-year CS @ IIT, building stuff"
  bio: z.string().trim().max(500).optional(),
  // Cloudinary public_id, not a URL — same reasoning as in section.ts
  avatarCloudinaryId: z.string().max(200).optional(),
  theme: themeIdSchema.default("mono"),
  layout: layoutIdSchema.default("press"),
  socials: SocialsSchema.default({}),
  sections: z.array(SectionSchema).max(20).default([]),
  // Future: per-section visibility is on the section itself; whole-portfolio
  // privacy goes here. For v1 everything is public.
  isPublic: z.boolean().default(true),
});

// Partial schema for PATCH endpoints — every field optional, but if present
// must still satisfy its constraints.
export const ProfilePatchSchema = ProfileSchema.partial();

export type ProfileInput = z.infer<typeof ProfileSchema>;
export type ProfilePatchInput = z.infer<typeof ProfilePatchSchema>;
export type Socials = z.infer<typeof SocialsSchema>;