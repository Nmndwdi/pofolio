/*
 * Slugs we never let users claim. Three categories:
 *   1. App routes that exist or might exist (api, admin, dashboard, ...)
 *   2. Common confusables / impersonation risks (admin, support, help, ...)
 *   3. Brand protection (pofolio, official, ...)
 *
 * Checked in the slug-availability API and on save.
 * If you add a new top-level route under /, add it here too.
 */
export const RESERVED_SLUGS = new Set<string>([
  // App routes
  "api",
  "p",
  "auth",
  "signin",
  "signup",
  "login",
  "logout",
  "register",
  "dashboard",
  "settings",
  "editor",
  "admin",
  "_next",
  "static",

  // Common/confusable
  "about",
  "help",
  "support",
  "contact",
  "terms",
  "privacy",
  "legal",
  "blog",
  "docs",
  "status",
  "pricing",
  "billing",
  "account",
  "profile",
  "user",
  "users",
  "me",

  // Brand
  "pofolio",
  "official",
  "team",
  "anthropic",
  "claude",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
