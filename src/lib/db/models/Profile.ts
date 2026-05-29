import {
  Schema,
  Types,
  model,
  models,
  type Model,
} from "mongoose";
import type { Section } from "@/lib/validators/section";
import type { Socials, ThemeId, LayoutId } from "@/lib/validators/profile";

/*
 * Profile = the portfolio. One per User (1:1 for now; the schema doesn't
 * enforce 1:1 because we want the option to allow multiple portfolios per
 * user later — only the unique index on userId enforces it today).
 *
 * Sections are stored as a `Mixed` array. Why Mixed and not a strict
 * sub-schema?
 *
 * Because sections are a discriminated union (see lib/validators/section.ts).
 * Mongoose's discriminator support for array sub-documents is finicky and
 * inflexible — adding a new section type would mean migrating existing docs.
 *
 * Instead: validation happens in Zod *before* anything reaches Mongoose.
 * The DB just stores well-formed JSON. This is the same trade-off Notion,
 * Linear, and most modern editor backends make.
 */

export interface ProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  slug: string;
  displayName: string;
  headline?: string;
  bio?: string;
  avatarCloudinaryId?: string;
  theme: ThemeId;
  layout: LayoutId;
  socials?: Socials;

  // Coding handles — stored directly on the profile rather than as sections.
  // The form treats them as flat fields; the public-page renderer reads them
  // and (in step 2) fetches live data from each platform's API.
  github?: string;
  leetcode?: string;
  codeforces?: string;
  devto?: string;
  hashnode?: string;
  huggingface?: string;

  // User-provided links beyond the standard socials. Each has a label + url.
  // Rendered as a "Links" section on the public page.
  customLinks?: Array<{ id: string; label: string; url: string }>;

  // Uploaded artifacts — Cloudinary public_ids, not URLs.
  // URLs are derived at render time via lib/cloudinary.ts deriveUrl().
  resumeCloudinaryId?: string;
  files?: Array<{
    id: string;
    label: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    format: string;
    bytes: number;
  }>;
  projectImages?: Array<{
    id: string;
    caption?: string;
    publicId: string;
    width?: number;
    height?: number;
  }>;

  // Resume-derived structured content. Populated by the resume parser,
  // then editable. Rendered as Experience / Education / Skills sections.
  experience?: Array<{
    id: string;
    company: string;
    role: string;
    dates: string;
    summary: string;
  }>;
  education?: Array<{
    id: string;
    institution: string;
    degree: string;
    dates: string;
  }>;
  skills?: string[];

  // Sections are validated by Zod before save; type is the union from there.
  // Kept for future use (e.g. file uploads, galleries) — not used in step 1.
  sections: Section[];
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema.Types.Mixed === any. We type-narrow at the API boundary with Zod.
const sectionShape = { type: Schema.Types.Mixed, required: true };

const profileSchema = new Schema<ProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per user (today)
      index: true,
    },

    // The public URL fragment: pofolio.vercel.app/p/<slug>
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },

    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    headline: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 500 },

    avatarCloudinaryId: { type: String, maxlength: 200 },

    // Theme = visual treatment. "minimal" is a legacy value mapped to "mono"
    // at read time by resolveTheme() in lib/theme.ts.
    theme: {
      type: String,
      enum: ["mono", "paper", "terminal", "glass", "minimal"],
      default: "mono",
    },

    // Layout = page structure. Orthogonal to theme — any combination works.
    layout: {
      type: String,
      enum: ["sidebar", "single", "multipage", "grid"],
      default: "sidebar",
    },

    // Header social handles (separate from sections — see profile.ts validator)
    socials: {
      github: String,
      linkedin: String,
      twitter: String,
      website: String,
      email: String,
    },

    // Coding handles. Validated upstream by Zod; stored as plain strings here.
    github: { type: String, trim: true, maxlength: 40 },
    leetcode: { type: String, trim: true, maxlength: 40 },
    codeforces: { type: String, trim: true, maxlength: 40 },
    devto: { type: String, trim: true, maxlength: 40 },
    hashnode: { type: String, trim: true, maxlength: 40 },
    huggingface: { type: String, trim: true, maxlength: 40 },

    // Custom links — { id, label, url } objects, validated upstream.
    customLinks: {
      type: [
        {
          _id: false, // we use our own `id`
          id: { type: String, required: true },
          label: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },

    // Uploaded artifacts. Each entry stores Cloudinary's public_id; URLs are
    // derived at render time so transformations can change without rewriting
    // the DB. See lib/cloudinary.ts.
    resumeCloudinaryId: { type: String, maxlength: 200 },

    files: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          label: { type: String, required: true },
          publicId: { type: String, required: true },
          resourceType: {
            type: String,
            enum: ["image", "video", "raw"],
            required: true,
          },
          format: { type: String, required: true },
          bytes: { type: Number, required: true },
        },
      ],
      default: [],
    },

    projectImages: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          caption: { type: String },
          publicId: { type: String, required: true },
          width: { type: Number },
          height: { type: Number },
        },
      ],
      default: [],
    },

    // Resume-derived structured content. Populated by the parser, editable.
    experience: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          company: { type: String, default: "" },
          role: { type: String, default: "" },
          dates: { type: String, default: "" },
          summary: { type: String, default: "" },
        },
      ],
      default: [],
    },
    education: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          institution: { type: String, default: "" },
          degree: { type: String, default: "" },
          dates: { type: String, default: "" },
        },
      ],
      default: [],
    },
    skills: { type: [String], default: [] },

    // Discriminated-union sections; validated upstream.
    sections: { type: [sectionShape], default: [] },

    // Whole-portfolio kill switch. A logged-out visitor sees a 404 if false.
    isPublic: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Compound index for the public lookup hot path.
// Public page does: Profile.findOne({ slug, isPublic: true }).
profileSchema.index({ slug: 1, isPublic: 1 });

export const Profile: Model<ProfileDoc> =
  (models.Profile as Model<ProfileDoc>) ??
  model<ProfileDoc>("Profile", profileSchema);
