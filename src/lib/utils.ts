import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently — later classes win even when the
 * conflict isn't lexical (e.g. `px-2` overrides `p-4`). Used everywhere.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a string to a URL-safe slug.
 * "Naman Dwivedi!" → "naman-dwivedi"
 *
 * We use this for default slug suggestions, but the user can override.
 * Server-side validation (in lib/validators/profile.ts) is the real check.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // strip punctuation, keep unicode letters/numbers
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
