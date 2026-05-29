/*
 * Client-safe Cloudinary URL builder.
 *
 * Lives separately from src/lib/cloudinary.ts because that module imports the
 * full Cloudinary Node SDK (for signing + deletion), which Webpack can't
 * bundle for the browser (it pulls in Node's `fs`).
 *
 * Anything that runs in a client component should import deriveUrl from
 * HERE, not from "@/lib/cloudinary". Server-only code can use either.
 *
 * Reads NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME — must be set in both server-only
 * (CLOUDINARY_CLOUD_NAME) AND browser-exposed (NEXT_PUBLIC_*) env vars.
 */

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export interface DeriveUrlOptions {
  width?: number;
  height?: number;
  /** "fill" crops to exact dimensions; "fit" preserves aspect ratio. */
  crop?: "fill" | "fit" | "thumb" | "scale";
  /** "auto" lets Cloudinary pick the best format (AVIF, WebP) per browser. */
  format?: "auto" | "jpg" | "png" | "webp" | "avif";
  /** "auto" lets Cloudinary pick a quality balancing size vs visual fidelity. */
  quality?: "auto" | number;
  /** For raw resources (PDFs etc.), no transformations apply. */
  resourceType?: "image" | "video" | "raw";
}

/**
 * Build a Cloudinary delivery URL for a stored public_id with optional
 * transformations. Returns "" if the env var isn't set — caller should
 * render a sensible placeholder when that happens.
 */
export function deriveUrl(
  publicId: string,
  opts: DeriveUrlOptions = {},
): string {
  if (!cloudName) return "";
  if (!publicId) return "";
  const resourceType = opts.resourceType ?? "image";

  if (resourceType === "raw") {
    return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`;
  }

  const transformations: string[] = [];
  if (opts.width) transformations.push(`w_${opts.width}`);
  if (opts.height) transformations.push(`h_${opts.height}`);
  if (opts.crop) transformations.push(`c_${opts.crop}`);
  transformations.push(`f_${opts.format ?? "auto"}`);
  transformations.push(
    typeof opts.quality === "number"
      ? `q_${opts.quality}`
      : `q_${opts.quality ?? "auto"}`,
  );
  const transformPart = transformations.join(",");
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transformPart}/${publicId}`;
}
