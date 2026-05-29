import { Schema, model, models, type Model } from "mongoose";

/*
 * User = authentication identity.
 * Portfolio data lives on the Profile model. One User has one Profile.
 *
 * Why split? NextAuth (and most auth libraries) wants a "user" record with
 * a stable shape: id, email, password hash, OAuth provider IDs, email
 * verification status. Mixing portfolio fields in here would mean every
 * profile edit touches the auth document. Keeping them separate also makes
 * "delete my portfolio but keep my account" trivially possible later.
 */

/*
 * Explicit interface (rather than InferSchemaType) because Mongoose's inference
 * widens optional fields to `unknown` in some versions. Explicit typing also
 * acts as documentation for what fields exist.
 */
export interface UserDoc {
  email: string;
  name: string;
  passwordHash?: string;
  googleId?: string;
  githubId?: string;
  emailVerified?: Date | null;
  // Email-verification token (sent on signup). Stored hashed for the same
  // reason the reset token is — DB leak shouldn't enable account takeover.
  verifyTokenHash?: string;
  verifyTokenExpiresAt?: Date;
  // Throttle: when did we last send a verification email to this user?
  // Used to rate-limit "resend" requests to once per minute.
  verifyEmailLastSentAt?: Date;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // creates the unique index
      lowercase: true,
      trim: true,
      index: true,
    },

    // Display name from sign-up. Editable later via the dashboard.
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    // bcrypt hash. Optional because OAuth-only accounts won't have one.
    passwordHash: { type: String, select: false }, // never returned by default

    // OAuth provider IDs. Sparse-indexed so multiple users can have null.
    googleId: { type: String, index: { unique: true, sparse: true } },
    githubId: { type: String, index: { unique: true, sparse: true } },

    emailVerified: { type: Date, default: null },

    // Email verification (sent on signup). Same hashing pattern as reset.
    verifyTokenHash: { type: String, select: false },
    verifyTokenExpiresAt: { type: Date, select: false },
    verifyEmailLastSentAt: { type: Date, select: false },

    // Password reset flow — opaque token + expiry.
    // Stored hashed (sha256) so a DB leak doesn't hand attackers reset URLs.
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true, // createdAt + updatedAt
    // Strip sensitive fields from JSON serialization. Belt-and-braces with
    // `select: false` above.
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpiresAt;
        delete ret.verifyTokenHash;
        delete ret.verifyTokenExpiresAt;
        return ret;
      },
    },
  },
);

// The `models.User ?? model(...)` pattern is required for Next.js hot reload.
// Without it, you'd get "OverwriteModelError: Cannot overwrite `User` model"
// on every code change in dev.
export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>("User", userSchema);
