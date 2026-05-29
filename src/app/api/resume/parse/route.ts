import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resumeParser } from "@/lib/resume";

/*
 * POST /api/resume/parse
 *
 * Accepts a PDF file (multipart/form-data, field name "file"), runs it
 * through the resume parser, returns a ParsedResume the editor uses to
 * pre-fill its fields.
 *
 * Deliberately separate from the Cloudinary resume upload:
 *   - Parsing and storing are independent concerns. A user can parse a
 *     resume to pre-fill the form WITHOUT saving that PDF as their public
 *     resume, and vice versa.
 *   - Parsing failures must never block resume upload.
 *
 * The PDF bytes are processed in-memory and discarded — we never store the
 * file here. Auth-required so this can't be used as a free PDF-parsing
 * service by anonymous callers.
 *
 * Note on body size: resumes are small (well under 1 MB typically). We cap
 * at 10 MB to reject obviously-wrong uploads early. This route handles the
 * file in memory, unlike the Cloudinary flow which streams browser→Cloudinary
 * directly — but a 10 MB cap on an in-memory PDF parse is fine.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data with a 'file' field" },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Resumes should be well under 10 MB." },
      { status: 413 },
    );
  }

  // Loose content-type check. Browsers sometimes send octet-stream for PDFs,
  // so we don't hard-reject on type — pdf-parse will fail clearly if it's
  // genuinely not a PDF, and we catch that below.
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const parsed = await resumeParser.parse(bytes);
    return NextResponse.json({ ok: true, parsed });
  } catch (err) {
    // Genuine parse failure (corrupt PDF, scanned image with no text).
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Couldn't parse that file. Make sure it's a text-based PDF.",
      },
      { status: 422 },
    );
  }
}
