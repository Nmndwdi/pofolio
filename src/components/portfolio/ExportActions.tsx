"use client";

/*
 * Export actions for the public portfolio: "Download PDF" and "Save contact".
 *
 * - Download PDF: calls window.print(). A print stylesheet (@media print in
 *   globals.css) turns the live page into a clean PDF via the browser's
 *   native print-to-PDF. No server, no headless Chrome — the browser already
 *   renders the page perfectly.
 * - Save contact: links to /p/[slug]/vcard, which serves a .vcf download.
 *
 * Marked data-print-hide so the buttons themselves don't appear in the PDF.
 */

export function ExportActions({ slug }: { slug: string }) {
  return (
    <div
      data-print-hide
      className="flex flex-wrap items-center gap-2 print:hidden"
    >
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md border border-p-border bg-p-surface px-3 py-1.5 text-xs font-medium text-p-fg transition-colors hover:bg-p-surface-2"
      >
        Download PDF
      </button>
      <a
        href={`/p/${slug}/vcard`}
        data-no-print-url
        className="rounded-md border border-p-border bg-p-surface px-3 py-1.5 text-xs font-medium text-p-fg transition-colors hover:bg-p-surface-2"
      >
        Save contact
      </a>
    </div>
  );
}
