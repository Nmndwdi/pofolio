import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/*
 * Proxy runs on every matched request, on the Edge runtime.
 *
 * (In Next 14 this file was `middleware.ts` with a `middleware` export. Next
 * 16 renamed the convention to `proxy` — same behavior, new name. The file
 * must export a function as either the default export or a named `proxy`
 * export; we do both for clarity.)
 *
 * We instantiate NextAuth with ONLY authConfig (no providers, no DB) — the
 * `authorized` callback in authConfig handles route gating using the JWT
 * cookie alone, no DB read needed.
 *
 * Critical: do NOT import @/lib/auth/index.ts here. That file pulls in
 * Mongoose, which doesn't run on Edge — the build will fail.
 */
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  /*
   * Match everything EXCEPT:
   *  - api routes (NextAuth handles its own auth routes; others are explicit)
   *  - _next/static, _next/image (Next internals)
   *  - public files (favicon, og images, etc.)
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
