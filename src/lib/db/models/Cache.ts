import {
  Schema,
  model,
  models,
  type Model,
} from "mongoose";

/* (header comment unchanged) */

export interface CacheDoc {
  provider:
    | "github"
    | "codeforces"
    | "leetcode"
    | "devto"
    | "huggingface"
    | "og";
  key: string;
  data: unknown;
  fetchedAt: Date;
  expiresAt: Date;
}

const cacheSchema = new Schema<CacheDoc>(
  {
    provider: {
      type: String,
      required: true,
      enum: [
        "github",
        "codeforces",
        "leetcode",
        "devto",
        "huggingface",
        "og",
      ],
    },
    key: { type: String, required: true },

    data: { type: Schema.Types.Mixed, required: true },

    fetchedAt: { type: Date, default: Date.now },
    // TTL index uses `expireAfterSeconds: 0` to mean "expire AT this date".
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: false }, // we have our own time fields
);

// (provider, key) is the lookup. Unique so we always overwrite, never duplicate.
cacheSchema.index({ provider: 1, key: 1 }, { unique: true });

export const Cache: Model<CacheDoc> =
  (models.Cache as Model<CacheDoc>) ??
  model<CacheDoc>("Cache", cacheSchema);