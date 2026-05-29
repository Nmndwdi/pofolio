import {
  Schema,
  Types,
  model,
  models,
  type Model,
} from "mongoose";

/* (header comment unchanged) */

export interface ScanEventDoc {
  _id: Types.ObjectId;
  profileId: Types.ObjectId;
  visitorFingerprint: string;
  referrer?: string;
  deviceCategory: "mobile" | "desktop" | "bot" | "unknown";
  country?: string;
  fromQR: boolean;
  at: Date;
}

const scanEventSchema = new Schema<ScanEventDoc>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },

    // Truncated SHA-256, 16 chars. Resets daily (because date is in the input).
    visitorFingerprint: { type: String, required: true, maxlength: 32 },

    // Where they came from. The URL of the page that linked here (if any).
    referrer: { type: String, maxlength: 500 },

    // High-level UA classification — "mobile" | "desktop" | "bot" | "unknown".
    // We don't store the full UA string; it's PII-adjacent and rarely useful.
    deviceCategory: {
      type: String,
      enum: ["mobile", "desktop", "bot", "unknown"],
      default: "unknown",
    },

    // ISO country code from the request (Vercel's geo header); optional.
    country: { type: String, maxlength: 2 },

    // Was the visit *from* a QR scan vs a direct link?
    // Set when the URL contains ?ref=qr (we add it to QR-encoded URLs).
    fromQR: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "at", updatedAt: false } },
);

// Hot path: "show me the last 30 days of views for this profile".
scanEventSchema.index({ profileId: 1, at: -1 });

export const ScanEvent: Model<ScanEventDoc> =
  (models.ScanEvent as Model<ScanEventDoc>) ??
  model<ScanEventDoc>("ScanEvent", scanEventSchema);
