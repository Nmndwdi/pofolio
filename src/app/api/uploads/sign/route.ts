import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { signUpload, isCloudinaryConfigured } from "@/lib/cloudinary";

/*
 * POST /api/uploads/sign
 *
 * Mints a signed Cloudinary upload payload. Auth required — only authenticated
 * users can upload to our Cloudinary account.
 *
 * Folder structure on Cloudinary:
 *   pofolio/<userId>/avatars/...      profile photos
 *   pofolio/<userId>/resume/...       resume PDF
 *   pofolio/<userId>/files/...        certificates, generic files
 *   pofolio/<userId>/projects/...     project images
 *
 * Scoping all uploads under the user's own folder means:
 *   1. We can mass-delete a user's assets when they delete their account
 *   2. A leaked signature can't be used to upload to another user's space
 *      (because the folder is part of the signed payload)
 *   3. Cloudinary's media library has a clear hierarchy
 *
 * For avatars we use a fixed public_id ("avatar") so each upload overwrites
 * the previous one — no orphaned old avatars to clean up.
 */

const Body = z.object({
  kind: z.enum(["avatar", "resume", "file", "project"]),
});

type UploadKind = z.infer<typeof Body>["kind"];

interface KindSpec {
  resourceType: "image" | "video" | "raw";
  /** Path under the user's folder. */
  subfolder: string;
  /** If set, Cloudinary uploads to this fixed id (overwriting). */
  fixedPublicId?: string;
}

const KIND_SPEC: Record<UploadKind, KindSpec> = {
  avatar: {
    resourceType: "image",
    subfolder: "avatars",
    fixedPublicId: "avatar", // overwrites; one avatar per user
  },
  resume: {
    // PDFs are "raw" in Cloudinary (no image transformations apply).
    // We could use "image" with PDF-specific transformations, but raw
    // is simpler and we only need to deliver the file, not transform it.
    resourceType: "raw",
    subfolder: "resume",
    fixedPublicId: "resume", // overwrites — one current resume per user
  },
  file: {
    resourceType: "raw",
    subfolder: "files",
    // No fixed id — generate per upload. User can have many files.
  },
  project: {
    resourceType: "image",
    subfolder: "projects",
  },
};

export async function POST(req: Request) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Uploads are not configured. Set CLOUDINARY_* env vars." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const spec = KIND_SPEC[parsed.data.kind];
  const folder = `pofolio/${session.user.id}/${spec.subfolder}`;

  const payload = signUpload({
    folder,
    resourceType: spec.resourceType,
    publicId: spec.fixedPublicId,
  });

  return NextResponse.json(payload);
}
