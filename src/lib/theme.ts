import type { LayoutId } from "@/lib/validators/profile";

/*
 * Layout resolution.
 *
 * Only three layouts are live: terminal, brutalist, press. Everything else
 * — including the legacy values sidebar/single/multipage/grid from earlier
 * builds — gets mapped to `press` as the safest default (clean editorial,
 * works for any portfolio shape).
 *
 * Public portfolios never break because of bad enum values: we always
 * coerce to one of the three real templates.
 *
 * Note: the `theme` field still lives in the DB and zod schema (we don't
 * churn the DB shape just because the UI is hidden), but no resolver is
 * needed — templates ignore it and render their own scoped styles.
 */

const ACTIVE_LAYOUTS: LayoutId[] = ["terminal", "brutalist", "press", "bento"];

export function resolveLayout(stored: unknown): LayoutId {
  if (typeof stored !== "string") return "press";
  if ((ACTIVE_LAYOUTS as string[]).includes(stored)) return stored as LayoutId;
  // Legacy values (sidebar, single, multipage, grid) and any other unknown
  // string map to press.
  return "press";
}