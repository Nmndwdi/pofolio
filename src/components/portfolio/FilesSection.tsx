"use client";

import { useState } from "react";
import Link from "next/link";
import { deriveUrl } from "@/lib/cloudinary-url";
import type { LayoutData } from "@/components/layouts/types";

/*
 * Files section — resume + miscellaneous files with inline preview.
 *
 * Why preview is open by default (changed from initial implementation):
 *  - Most users have 1-3 files (resume + maybe a certificate). Hiding the
 *    contents behind a "View" click trades discovery for theoretical perf
 *    that doesn't matter at that scale.
 *  - Users can still collapse via the Hide button if they want.
 *  - If we ever ship a user with 10+ files and it actually becomes a perf
 *    issue, we can default just the first 2 to open. v1 isn't there.
 *
 * Approach for the embed itself: a plain <iframe> pointing at the Cloudinary
 * raw URL. The browser's built-in PDF viewer renders it.
 *
 * NOTE on 401 errors: Cloudinary free/new accounts block PDF and ZIP
 * delivery by default ("Customer is marked as untrusted"). If you see a
 * 401, go to Cloudinary Settings → Security → uncheck "PDF and ZIP files
 * delivery". This is an account-level setting; nothing we can fix in code.
 *
 * Images render inline directly. Videos use the native <video> element.
 */

type FileItem = LayoutData["files"][number];

export function FilesSection({ data }: { data: LayoutData }) {
  const hasResume = !!data.resumeCloudinaryId;
  const hasFiles = data.files.length > 0;
  if (!hasResume && !hasFiles) return null;

  return (
    <ul className="space-y-3">
      {hasResume && data.resumeCloudinaryId && (
        <li>
          <FileEntry
            publicId={data.resumeCloudinaryId}
            label="Resume"
            resourceType="raw"
            format="pdf"
          />
        </li>
      )}
      {data.files.map((f) => (
        <li key={f.id}>
          <FileEntry
            publicId={f.publicId}
            label={f.label}
            resourceType={f.resourceType}
            format={f.format}
          />
        </li>
      ))}
    </ul>
  );
}

function FileEntry({
  publicId,
  label,
  resourceType,
  format,
}: {
  publicId: string;
  label: string;
  resourceType: FileItem["resourceType"];
  format: string;
}) {
  const url = deriveUrl(publicId, { resourceType });
  const fmtLower = format.toLowerCase();
  const isPdf = resourceType === "raw" && fmtLower === "pdf";
  const isImage = resourceType === "image";
  const isVideo = resourceType === "video";

  // Default to OPEN — users want to see contents inline, not click through.
  // The Hide button below still lets them collapse it if they want.
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="overflow-hidden rounded-md border border-p-border bg-p-surface">
      {/* Header row — always visible */}
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        <span className="rounded bg-p-surface-2 px-2 py-0.5 font-p-mono text-xs uppercase text-p-fg-muted">
          {format || "file"}
        </span>
        <span className="flex-1 truncate font-medium text-p-fg">{label}</span>

        {/* Inline PDFs / images / videos: show a "View"/"Hide" toggle. */}
        {(isPdf || isImage || isVideo) && (
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            className="text-xs text-p-fg-muted hover:text-p-fg"
            // Hidden in print to avoid the toggle button being captured.
            data-print-hide
          >
            {showPreview ? "Hide" : "View"}
          </button>
        )}

        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-p-fg-muted hover:text-p-fg"
          // Doesn't expand the URL in print (existing data-no-print-url
          // convention used elsewhere).
          data-no-print-url
        >
          Open ↗
        </Link>
      </div>

      {/* Preview pane — rendered only when the user opens it */}
      {showPreview && (
        <div className="border-t border-p-border bg-p-bg">
          {isPdf && (
            // Use <object> rather than <iframe> for PDFs. Two reasons:
            //  1. It's the semantically-correct element for embedding
            //     non-HTML content with a specific MIME type.
            //  2. Chrome's built-in PDF viewer fails inside iframes that
            //     have a restrictive `sandbox` attribute (it needs
            //     allow-downloads internally). The same PDF URL that opens
            //     fine in a new tab will show a broken-document icon in a
            //     sandboxed iframe. <object> uses the browser's PDF
            //     pipeline directly and avoids the issue entirely.
            //
            // The inner <p> is shown only if the browser can't render
            // application/pdf at all (very old / mobile-Safari edge cases).
            <object
              data={url}
              type="application/pdf"
              className="block h-[80vh] w-full"
              aria-label={label}
            >
              <p className="p-6 text-sm text-p-fg-muted">
                Your browser can&apos;t render this PDF inline.{" "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Open it in a new tab
                </a>{" "}
                instead.
              </p>
            </object>
          )}
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deriveUrl(publicId, { width: 1600 })}
              alt={label}
              className="block max-h-[80vh] w-full object-contain"
              loading="lazy"
            />
          )}
          {isVideo && (
            <video
              src={url}
              controls
              className="block max-h-[80vh] w-full"
              preload="metadata"
            />
          )}
        </div>
      )}
    </div>
  );
}