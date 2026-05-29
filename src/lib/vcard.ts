/*
 * vCard (.vcf) generation.
 *
 * Produces a standards-compliant vCard 3.0 string from a profile, so a
 * visitor can tap "Save contact" and drop the person into their address
 * book — name, headline as title, email, and the portfolio URL.
 *
 * vCard 3.0 (not 4.0) for maximum device compatibility — iOS/Android/Outlook
 * all handle 3.0 reliably. Fields are escaped per RFC 6350 (commas,
 * semicolons, newlines).
 */

interface VCardInput {
  displayName: string;
  headline?: string;
  email?: string;
  website?: string;
  portfolioUrl: string;
}

/** Escape a value for vCard: backslash, comma, semicolon, newline. */
function esc(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export function buildVCard(input: VCardInput): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(input.displayName)}`,
    // N (structured name) — we only reliably have a full name, so put it all
    // in the "given" slot rather than guessing at first/last splitting.
    `N:;${esc(input.displayName)};;;`,
  ];

  if (input.headline) lines.push(`TITLE:${esc(input.headline)}`);
  if (input.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(input.email)}`);
  if (input.website) lines.push(`URL:${esc(input.website)}`);
  // The portfolio itself, labelled, so it's distinct from a personal site.
  lines.push(`URL;TYPE=Portfolio:${esc(input.portfolioUrl)}`);

  lines.push("END:VCARD");
  // vCard spec wants CRLF line endings.
  return lines.join("\r\n");
}
