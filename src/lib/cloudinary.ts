import { v2 as cloudinary } from "cloudinary";

/*
 * Cloudinary helper.
 *
 * Two responsibilities:
 *   1. Sign upload payloads on the server (so the browser can POST directly
 *      to Cloudinary without our secret leaking).
 *   2. Derive transformed URLs from a stored public_id at render time.
 *
 * We never store URLs in our DB. We store public_ids. The reasons:
 *   - Same image, different sizes (40px nav avatar vs 200px section header)
 *   - We can change defaults later (e.g. swap to AVIF, add watermark)
 *     without rewriting DB rows
 *   - Cloudinary URLs are long; public_ids are short
 *
 * Configuration is read from env vars at module load. If they're missing,
 * uploads/derivation will fail at use time — we don't crash the whole app.
 */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true, // always emit https URLs
  });
}

export function isCloudinaryConfigured(): boolean {
  return !!(cloudName && apiKey && apiSecret);
}

// ─── Upload signing ────────────────────────────────────────────────────────

export interface UploadSignParams {
  /** Cloudinary upload folder, e.g. "pofolio/userId/avatars" */
  folder: string;
  /** "image" | "video" | "raw" — affects which storage bucket is used */
  resourceType: "image" | "video" | "raw";
  /** Optional explicit public_id (without folder prefix). If omitted, Cloudinary
   *  generates a random one — fine for project images, bad for avatars where
   *  we want a stable replaceable id. */
  publicId?: string;
}

export interface SignedUploadPayload {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: UploadSignParams["resourceType"];
  publicId?: string;
  /** Full upload URL the browser POSTs to. */
  uploadUrl: string;
}

/**
 * Generate the signed payload the browser needs to POST a file to Cloudinary.
 *
 * The signature is over the params we DECLARE here. The browser must include
 * exactly these params in its FormData, or Cloudinary rejects the request.
 * That's the security model: a stolen signature only works for the exact
 * folder/public_id it was signed for.
 */
export function signUpload(params: UploadSignParams): SignedUploadPayload {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary not configured");
  }

  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: params.folder,
  };
  if (params.publicId) paramsToSign.public_id = params.publicId;

  // The SDK handles alphabetical sort, joining, and SHA-1.
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret!);

  return {
    timestamp,
    signature,
    apiKey: apiKey!,
    cloudName: cloudName!,
    folder: params.folder,
    resourceType: params.resourceType,
    publicId: params.publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${params.resourceType}/upload`,
  };
}

// ─── URL derivation ────────────────────────────────────────────────────────
// Lives in src/lib/cloudinary-url.ts (client-safe — no SDK dep).
// Re-exported here so server code can still import everything from one place.

export { deriveUrl, type DeriveUrlOptions } from "./cloudinary-url";

// ─── Deletion ──────────────────────────────────────────────────────────────

/**
 * Delete an asset from Cloudinary. Used when a user removes a file or
 * replaces an avatar. Failures are logged but not surfaced — orphaned
 * Cloudinary assets are a minor cost issue, not a correctness one.
 */
export async function deleteAsset(
  publicId: string,
  resourceType: UploadSignParams["resourceType"] = "image",
): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn(`[cloudinary] failed to delete ${publicId}:`, err);
  }
}
