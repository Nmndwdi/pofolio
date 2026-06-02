/*
 * ASCII helpers for the terminal template.
 *
 * Builds an ASCII-art banner of the user's display name using a hand-tuned
 * "ANSI Shadow" style block alphabet. The alphabet covers A-Z + space; any
 * char we don't have falls back to a placeholder block.
 *
 * Why hand-roll instead of pulling figlet:
 *   - figlet.js is ~150KB. The whole terminal template should stay under
 *     50KB of JS. A 6-line banner alphabet is ~3KB.
 *   - We only need ONE font ("ANSI Shadow"). figlet's value is many fonts.
 *   - This way the banner ships with the template — no async loading,
 *     no FOUC, the banner renders on first paint.
 */

// Each glyph is exactly 6 lines tall, character-width varies (proportional).
// Using ║ ╗ ╝ ═ characters (Unicode box-drawing) — they render in any
// monospace font and are the canonical ANSI-shadow style.
//
// Spaces are intentional; do NOT trim or reformat this object.

/* eslint-disable no-irregular-whitespace */
const GLYPHS: Record<string, string[]> = {
  A: [
    " █████╗ ",
    "██╔══██╗",
    "███████║",
    "██╔══██║",
    "██║  ██║",
    "╚═╝  ╚═╝",
  ],
  B: [
    "██████╗ ",
    "██╔══██╗",
    "██████╔╝",
    "██╔══██╗",
    "██████╔╝",
    "╚═════╝ ",
  ],
  C: [
    " ██████╗",
    "██╔════╝",
    "██║     ",
    "██║     ",
    "╚██████╗",
    " ╚═════╝",
  ],
  D: [
    "██████╗ ",
    "██╔══██╗",
    "██║  ██║",
    "██║  ██║",
    "██████╔╝",
    "╚═════╝ ",
  ],
  E: [
    "███████╗",
    "██╔════╝",
    "█████╗  ",
    "██╔══╝  ",
    "███████╗",
    "╚══════╝",
  ],
  F: [
    "███████╗",
    "██╔════╝",
    "█████╗  ",
    "██╔══╝  ",
    "██║     ",
    "╚═╝     ",
  ],
  G: [
    " ██████╗ ",
    "██╔════╝ ",
    "██║  ███╗",
    "██║   ██║",
    "╚██████╔╝",
    " ╚═════╝ ",
  ],
  H: [
    "██╗  ██╗",
    "██║  ██║",
    "███████║",
    "██╔══██║",
    "██║  ██║",
    "╚═╝  ╚═╝",
  ],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  J: [
    "     ██╗",
    "     ██║",
    "     ██║",
    "██   ██║",
    "╚█████╔╝",
    " ╚════╝ ",
  ],
  K: [
    "██╗  ██╗",
    "██║ ██╔╝",
    "█████╔╝ ",
    "██╔═██╗ ",
    "██║  ██╗",
    "╚═╝  ╚═╝",
  ],
  L: [
    "██╗     ",
    "██║     ",
    "██║     ",
    "██║     ",
    "███████╗",
    "╚══════╝",
  ],
  M: [
    "███╗   ███╗",
    "████╗ ████║",
    "██╔████╔██║",
    "██║╚██╔╝██║",
    "██║ ╚═╝ ██║",
    "╚═╝     ╚═╝",
  ],
  N: [
    "███╗   ██╗",
    "████╗  ██║",
    "██╔██╗ ██║",
    "██║╚██╗██║",
    "██║ ╚████║",
    "╚═╝  ╚═══╝",
  ],
  O: [
    " ██████╗ ",
    "██╔═══██╗",
    "██║   ██║",
    "██║   ██║",
    "╚██████╔╝",
    " ╚═════╝ ",
  ],
  P: [
    "██████╗ ",
    "██╔══██╗",
    "██████╔╝",
    "██╔═══╝ ",
    "██║     ",
    "╚═╝     ",
  ],
  Q: [
    " ██████╗ ",
    "██╔═══██╗",
    "██║   ██║",
    "██║▄▄ ██║",
    "╚██████╔╝",
    " ╚══▀▀═╝ ",
  ],
  R: [
    "██████╗ ",
    "██╔══██╗",
    "██████╔╝",
    "██╔══██╗",
    "██║  ██║",
    "╚═╝  ╚═╝",
  ],
  S: [
    "███████╗",
    "██╔════╝",
    "███████╗",
    "╚════██║",
    "███████║",
    "╚══════╝",
  ],
  T: [
    "████████╗",
    "╚══██╔══╝",
    "   ██║   ",
    "   ██║   ",
    "   ██║   ",
    "   ╚═╝   ",
  ],
  U: [
    "██╗   ██╗",
    "██║   ██║",
    "██║   ██║",
    "██║   ██║",
    "╚██████╔╝",
    " ╚═════╝ ",
  ],
  V: [
    "██╗   ██╗",
    "██║   ██║",
    "██║   ██║",
    "╚██╗ ██╔╝",
    " ╚████╔╝ ",
    "  ╚═══╝  ",
  ],
  W: [
    "██╗    ██╗",
    "██║    ██║",
    "██║ █╗ ██║",
    "██║███╗██║",
    "╚███╔███╔╝",
    " ╚══╝╚══╝ ",
  ],
  X: [
    "██╗  ██╗",
    "╚██╗██╔╝",
    " ╚███╔╝ ",
    " ██╔██╗ ",
    "██╔╝ ██╗",
    "╚═╝  ╚═╝",
  ],
  Y: [
    "██╗   ██╗",
    "╚██╗ ██╔╝",
    " ╚████╔╝ ",
    "  ╚██╔╝  ",
    "   ██║   ",
    "   ╚═╝   ",
  ],
  Z: [
    "███████╗",
    "╚══███╔╝",
    "  ███╔╝ ",
    " ███╔╝  ",
    "███████╗",
    "╚══════╝",
  ],
  " ": ["    ", "    ", "    ", "    ", "    ", "    "],
  ".": ["   ", "   ", "   ", "   ", "██╗", "╚═╝"],
  "-": ["       ", "       ", "█████╗ ", "╚════╝ ", "       ", "       "],
  "_": ["        ", "        ", "        ", "        ", "███████╗", "╚══════╝"],
};

// Fallback for unknown chars
const FALLBACK = ["████", "████", "████", "████", "████", "████"];

/**
 * Build a multi-line ASCII-art banner of `text`. Returns a single string with
 * embedded newlines, ready to drop into <pre> or a white-space:pre container.
 *
 * Examples:
 *   asciiBanner("HELLO")  →  six-line ANSI-shadow rendering of HELLO
 *   asciiBanner("Naman Dwivedi")  →  same, case-insensitive
 */
export function asciiBanner(text: string): string {
  const chars = text.toUpperCase().split("");
  const lines: string[] = ["", "", "", "", "", ""];
  for (const ch of chars) {
    const glyph = GLYPHS[ch] ?? FALLBACK;
    for (let i = 0; i < 6; i++) {
      lines[i] += glyph[i];
    }
  }
  return lines.join("\n");
}

/**
 * Best-effort width budget: figure out how many characters we can fit before
 * the banner needs to truncate / line-break. Used by the renderer to fall
 * back to a single-line text title when the user's display name is too long.
 */
export function bannerWouldOverflow(text: string, maxWidth = 60): boolean {
  // Approximate: each char is ~8-10 ASCII columns wide. Be conservative.
  return text.length * 9 > maxWidth * 10;
}