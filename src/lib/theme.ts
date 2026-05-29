import type { ThemeId, LayoutId } from "@/lib/validators/profile";

/*
 * Theme + layout resolution.
 *
 * Central helpers used wherever we need to read these fields from the
 * Profile. Two reasons this exists:
 *
 *   1. Legacy data — pre-redesign profiles have theme="minimal", which is
 *      no longer in the enum. resolveTheme maps it to "mono" rather than
 *      throwing or rendering broken.
 *   2. Anything unrecognized (manually-edited DB, future renames) → sane
 *      default. Public portfolios never break because of bad enum values.
 */

const VALID_THEMES: ThemeId[] = ["mono", "paper", "terminal", "glass"];
const VALID_LAYOUTS: LayoutId[] = ["sidebar", "single", "multipage", "grid"];

export function resolveTheme(stored: unknown): ThemeId {
  if (typeof stored !== "string") return "mono";
  if (stored === "minimal") return "mono"; // legacy alias
  if ((VALID_THEMES as string[]).includes(stored)) return stored as ThemeId;
  return "mono";
}

export function resolveLayout(stored: unknown): LayoutId {
  if (typeof stored !== "string") return "sidebar";
  if ((VALID_LAYOUTS as string[]).includes(stored)) return stored as LayoutId;
  return "sidebar";
}
