"use client";

/*
 * Client-side upload helper.
 *
 * Flow:
 *   1. POST to our /api/uploads/sign endpoint with { kind }
 *   2. Receive signed payload { signature, timestamp, apiKey, folder, ... }
 *   3. Build FormData with file + the signed params
 *   4. POST directly to Cloudinary
 *   5. Return the public_id from the response
 *
 * The browser never sees our Cloudinary API secret. The signature only lets
 * the browser do this exact upload (this folder, this public_id).
 */

/**
 * Build a Cloudinary delivery URL for use in the browser (avatar previews,
 * project thumbnails). Uses the public env var.
 *
 * Returns "" if NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME isn't set, AND warns once
 * to console — without this, missing-env-var failures show as broken-image
 * icons that look like upload bugs.
 */
let warned = false;
export function clientPreviewUrl(
  publicId: string,
  transform: string,
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    if (!warned) {
      console.error(
        "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. Image previews will be broken. " +
          "Set it in .env.local (same value as CLOUDINARY_CLOUD_NAME) and restart `npm run dev`.",
      );
      warned = true;
    }
    return "";
  }
  if (!publicId) return "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

export type UploadKind = "avatar" | "resume" | "file" | "project";

export interface UploadedAsset {
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string; // "pdf", "png", "mp4", ...
  bytes: number;
  width?: number;
  height?: number;
  originalFilename: string;
}

interface CloudinaryUploadResponse {
  public_id: string;
  resource_type: "image" | "video" | "raw";
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  original_filename: string;
  // Plus many other fields we don't use.
}

interface SignedPayload {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: "image" | "video" | "raw";
  publicId?: string;
  uploadUrl: string;
}

export async function uploadFile(
  file: File,
  kind: UploadKind,
  /** Optional progress callback (0..1). */
  onProgress?: (fraction: number) => void,
): Promise<UploadedAsset> {
  // 1. Get signed payload
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  if (!signRes.ok) {
    const json = (await signRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(json.error ?? "Couldn't authorize upload");
  }
  const sig = (await signRes.json()) as SignedPayload;

  // 2. Build FormData. Field names are Cloudinary's, not ours.
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  if (sig.publicId) form.append("public_id", sig.publicId);

  // 3. POST to Cloudinary. Use XHR rather than fetch so we can report
  //    upload progress — fetch's body progress is still not widely supported.
  const result = await postWithProgress<CloudinaryUploadResponse>(
    sig.uploadUrl,
    form,
    onProgress,
  );

  // Cloudinary's `format` field is reliable for images and videos but
  // sometimes omitted for `raw` uploads (PDFs, docx, …). Fall back to the
  // original filename's extension. Without this fallback, a PDF upload
  // returns `format: undefined` which then fails our Zod schema at save
  // time — silently — because the user has no idea what's missing.
  const fallbackFormat =
    file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";

  return {
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || fallbackFormat,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    originalFilename: result.original_filename || stripExt(file.name),
  };
}

function stripExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function postWithProgress<T>(
  url: string,
  body: FormData,
  onProgress?: (fraction: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new Error("Invalid JSON from Cloudinary"));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText) as {
            error?: { message?: string };
          };
          if (parsed.error?.message) msg = parsed.error.message;
        } catch {
          /* leave msg as-is */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}
