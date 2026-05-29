import type { NextAuthConfig } from "next-auth";

/*
 * Edge-runtime-safe NextAuth config.
 *
 * This file is imported by proxy.ts, which runs on the Edge runtime —
 * no Node APIs, no Mongoose, no bcrypt. So we declare the providers and
 * route logic here, but the actual `authorize` callback (which needs DB
 * access) lives in auth.ts and gets merged in there.
 *
 * The trick: we list providers WITHOUT their authorize functions here. The
 * full auth.ts spreads this config and adds back the Credentials provider
 * with its real authorize. Middleware doesn't need to authenticate users —
 * it just needs to know "is there a valid session cookie?" — and the JWT
 * verification happens in pure JS with no DB call.
 */

export const authConfig = {
  // Custom URLs for our own pages (instead of NextAuth's default)
  pages: {
    signIn: "/signin",
    error: "/signin", // surface auth errors on the sign-in page
  },

  // We use JWT sessions (not DB sessions) — Edge-safe, no per-request DB read.
  session: { strategy: "jwt" },

  // Providers list. The Credentials provider is added in auth.ts because its
  // `authorize` function needs DB + bcrypt. Google/GitHub OAuth providers
  // also live in auth.ts — they're not Edge-incompatible per se, but keeping
  // all providers in one file is simpler than splitting them.
  providers: [],

  callbacks: {
    /*
     * `authorized` runs on every request that hits the proxy. Return true to
     * allow, false to redirect to signIn page. Used for route gating.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/editor") ||
        nextUrl.pathname.startsWith("/settings");
      const isOnAuthPage =
        nextUrl.pathname === "/signin" ||
        nextUrl.pathname === "/signup" ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password");

      if (isOnDashboard) return isLoggedIn;
      if (isOnAuthPage && isLoggedIn) {
        // Already signed in — bounce away from auth pages to dashboard.
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },

    /*
     * `jwt` and `session` shape what's in the cookie and what server code sees
     * when it calls auth(). We add `id` and `slug` so server components can
     * load the right Profile without a separate User → Profile lookup.
     *
     * The full versions live in auth.ts because the initial token population
     * needs a DB lookup. Here we just declare the shape.
     */
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.slug === "string") session.user.slug = token.slug;
      return session;
    },
  },
} satisfies NextAuthConfig;

/*
 * Type augmentation: tell NextAuth that our session.user has these extra fields.
 * Without this, `session.user.slug` is a TS error.
 *
 * In v5 the JWT type lives inside next-auth itself, not next-auth/jwt.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      slug?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface JWT {
    slug?: string;
  }
}
