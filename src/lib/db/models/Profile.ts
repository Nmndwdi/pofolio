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

  github?: string;
  leetcode?: string;
  codeforces?: string;
  devto?: string;
  huggingface?: string;

  customLinks?: Array<{ id: string; label: string; url: string }>;

  resumeCloudinaryId?: string;
  files?: Array<{
    id: string;
    label: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    format: string;
    bytes: number;
  }>;

  // Projects — structured records, not just images. Each project has a title,
  // description, role/year, demo/source/video links, a gallery of images, and
  // a tech-stack list. Replaces the old `projectImages` flat gallery.
  projects?: Array<{
    id: string;
    title: string;
    description?: string;
    role?: string;
    year?: string;
    demoUrl?: string;
    sourceUrl?: string;
    videoUrl?: string;
    tech?: string[];
    images?: Array<{
      id: string;
      publicId: string;
      caption?: string;
      width?: number;
      height?: number;
    }>;
    featured?: boolean;
  }>;

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

  sections: Section[];
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const sectionShape = { type: Schema.Types.Mixed, required: true };

const profileSchema = new Schema<ProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

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
    // Headline cap bumped from 120 to 200 (matches the validator).
    headline: { type: String, trim: true, maxlength: 200 },
    // Bio cap bumped from 500 to 1500 (matches the validator).
    bio: { type: String, trim: true, maxlength: 1500 },

    avatarCloudinaryId: { type: String, maxlength: 200 },

    theme: {
      type: String,
      enum: ["mono", "paper", "terminal", "glass", "minimal"],
      default: "mono",
    },

    layout: {
      type: String,
      enum: ["sidebar", "single", "multipage", "grid"],
      default: "sidebar",
    },

    socials: {
      github: String,
      linkedin: String,
      twitter: String,
      website: String,
      email: String,
    },

    github: { type: String, trim: true, maxlength: 40 },
    leetcode: { type: String, trim: true, maxlength: 40 },
    codeforces: { type: String, trim: true, maxlength: 40 },
    devto: { type: String, trim: true, maxlength: 40 },
    huggingface: { type: String, trim: true, maxlength: 40 },

    customLinks: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          label: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },

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

    // Structured projects. Each project bundles its own image gallery, links,
    // and tech stack — far richer than the previous flat `projectImages` list.
    // No migration concerns (pre-v1, no real users yet); we're just dropping
    // the old field outright.
    projects: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          title: { type: String, required: true, trim: true, maxlength: 120 },
          description: { type: String, trim: true, maxlength: 2000 },
          role: { type: String, trim: true, maxlength: 80 },
          year: { type: String, trim: true, maxlength: 20 },
          demoUrl: { type: String, trim: true, maxlength: 500 },
          sourceUrl: { type: String, trim: true, maxlength: 500 },
          videoUrl: { type: String, trim: true, maxlength: 500 },
          tech: { type: [String], default: [] },
          images: {
            type: [
              {
                _id: false,
                id: { type: String, required: true },
                publicId: { type: String, required: true },
                caption: { type: String, trim: true, maxlength: 140 },
                width: { type: Number },
                height: { type: Number },
              },
            ],
            default: [],
          },
          featured: { type: Boolean, default: false },
        },
      ],
      default: [],
    },

    experience: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          company: { type: String, default: "" },
          role: { type: String, default: "" },
          dates: { type: String, default: "" },
          // Summary cap bumped to match the new validator's 1500.
          summary: { type: String, default: "", maxlength: 1500 },
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

    sections: { type: [sectionShape], default: [] },

    isPublic: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

profileSchema.index({ slug: 1, isPublic: 1 });

// Text index for global search on the home page. Weights tilt heavily toward
// displayName and slug — those are how someone usually searches for a
// person — with headline + bio as secondary matches. Mongo's text index is
// language-aware (English stemming/stopwords); fine for v1.
profileSchema.index(
  {
    displayName: "text",
    slug: "text",
    headline: "text",
    bio: "text",
  },
  {
    weights: { displayName: 10, slug: 8, headline: 4, bio: 1 },
    name: "profile_text_search",
  },
);

export const Profile: Model<ProfileDoc> =
  (models.Profile as Model<ProfileDoc>) ??
  model<ProfileDoc>("Profile", profileSchema);