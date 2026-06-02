"use client";

/*
 * Export actions for the public portfolio: "Download PDF" and "Save contact".
 *
 * Rendered as a FIXED floating panel at the bottom-right of the viewport,
 * always visible regardless of scroll position. Previously this lived in the
 * page footer, but with 10+ sections the footer was so far down most users
 * never reached it, making the actions effectively invisible. A floating
 * panel solves the discoverability problem without sacrificing screen real
 * estate (it's small and tucked into a corner).
 *
 * Mechanics:
 *   - Download PDF: calls window.print(). A print stylesheet (@media print
 *     in globals.css) turns the live page into a clean PDF via the
 *     browser's native print-to-PDF — no server, no headless Chrome.
 *   - Save contact: links to /p/[slug]/vcard, which serves a .vcf download.
 *
 * Hidden during print itself via [data-print-hide] (defined in globals.css),
 * so the buttons don't end up in the PDF.
 *
 * The console.log on click is intentional debugging plumbing — if a user
 * reports "Download doesn't work", they (or we) can open DevTools and see
 * whether the click is registering vs. whether window.print() itself is
 * failing. Keep it until we have more telemetry.
 */

export function ExportActions({ slug }: { slug: string }) {
  return (
    <div
      data-print-hide
      // Fixed positioning + high z-index so it sits above everything.
      // Bottom + right offsets give it breathing room from the viewport
      // edges. print:hidden is doubled with [data-print-hide] for belt-and-
      // -suspenders insurance.
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 print:hidden sm:bottom-6 sm:right-6"
    >
      <button
        type="button"
        // Direct inline onClick — no console.log/try-catch wrapper. The
        // wrapper was added to debug a reported "doesn't open" issue, but
        // the actual cause was Recharts stuck in a width=-1 re-render loop
        // blocking the print dialog. Charts fixed; wrapper no longer needed.
        onClick={() => window.print()}
        // Primary visual treatment so Download PDF reads as the main action.
        // Uses the foreground color as bg + inverted text — strong contrast.
        className="rounded-full bg-p-fg px-5 py-2.5 text-xs font-semibold tracking-wide text-p-bg shadow-[var(--p-shadow-2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_hsl(0_0%_0%_/0.1),0_16px_40px_-8px_hsl(0_0%_0%_/0.25)] active:translate-y-0"
      >
        Download PDF
      </button>
      <a
        href={`/p/${slug}/vcard`}
        data-no-print-url
        // Secondary treatment — same proportions, surface color, less weight.
        className="rounded-full border border-p-border/60 bg-p-surface px-5 py-2.5 text-xs font-medium text-p-fg shadow-[var(--p-shadow-1)] transition-all hover:-translate-y-0.5 hover:border-p-border hover:shadow-[var(--p-shadow-2)] active:translate-y-0"
      >
        Save contact
      </a>
    </div>
  );
}