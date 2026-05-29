import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

import { authConfig } from "./config";
import { connectDB } from "@/lib/db/mongoose";
import { User, Profile } from "@/lib/db/models";
import { verifyPassword } from "./password";
import { SignInSchema } from "@/lib/validators/auth";
import { slugify } from "@/lib/utils";

/*
 * Full NextAuth setup, server-side only. Imports Mongoose (Node-only) so
 * this file MUST NOT be imported from proxy.ts. Use auth/config.ts there.
 *
 * Three providers:
 *  - Credentials (email/password)
 *  - Google OAuth   (only registered if env vars are set)
 *  - GitHub OAuth   (only registered if env vars are set)
 *
 * Conditional registration: if a developer hasn't filled in OAuth env vars
 * (e.g. you're running locally without Google credentials), we skip those
 * providers instead of crashing on startup.
 */

const oauthProviders = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  oauthProviders.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // `allowDangerousEmailAccountLinking` lets a user who signed up with
      // password later sign in via Google with the same email and have it
      // linked to the existing account. Safe here because Google verifies
      // emails. Don't enable for unverified providers.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  oauthProviders.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // The fields here are mostly cosmetic in v5 (used by NextAuth's default
      // sign-in page, which we're replacing). Real validation is in authorize.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = SignInSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        await connectDB();
        const user = await User.findOne({ email }).select("+passwordHash");
        if (!user || !user.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        // Block sign-in until email is verified.
        // We intentionally return null (same as wrong password) rather than
        // throwing a custom-message error: NextAuth v5 swallows custom messages
        // from authorize() and replaces them with a generic "CredentialsSignin"
        // code. The client detects the unverified case via a separate
        // /api/auth/account-status endpoint when sign-in fails.
        if (!user.emailVerified) return null;

        // What we return here becomes the initial JWT payload (via the jwt
        // callback below). Keep it small — JWT goes in a cookie on every req.
        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
        };
      },
    }),
    ...oauthProviders,
  ],

  callbacks: {
    ...authConfig.callbacks,

    /*
     * `signIn` runs after successful authentication, before the session is
     * issued. We use it to:
     *   - Provision a User record on first OAuth sign-in
     *   - Provision a Profile record for any new user (OAuth or credentials)
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        // Credentials signup created the User+Profile already; nothing to do.
        return true;
      }

      // OAuth path
      if (!user.email) return false;

      await connectDB();

      let dbUser = await User.findOne({ email: user.email });
      if (!dbUser) {
        dbUser = await User.create({
          email: user.email,
          name: user.name ?? (profile?.name as string) ?? "User",
          // Provider id stored for re-linking; password hash stays null.
          ...(account?.provider === "google" && {
            googleId: account.providerAccountId,
          }),
          ...(account?.provider === "github" && {
            githubId: account.providerAccountId,
          }),
          emailVerified: new Date(),
        });
      }

      // Make sure a Profile exists. Slug seed: their name, then email-local-part,
      // then a random fallback. Uniqueness check happens before we save.
      const existingProfile = await Profile.findOne({ userId: dbUser._id });
      if (!existingProfile) {
        const seeds = [
          slugify(dbUser.name ?? ""),
          slugify(dbUser.email.split("@")[0] ?? ""),
        ].filter((s) => s.length >= 3);

        let slug = "";
        for (const seed of seeds) {
          if (!(await Profile.exists({ slug: seed }))) {
            slug = seed;
            break;
          }
          // Fallback: append random suffix until unique
          for (let i = 0; i < 5; i++) {
            const candidate = `${seed}-${Math.random().toString(36).slice(2, 6)}`;
            if (!(await Profile.exists({ slug: candidate }))) {
              slug = candidate;
              break;
            }
          }
          if (slug) break;
        }
        if (!slug) {
          // Truly cosmic bad luck — totally random slug
          slug = `user-${Math.random().toString(36).slice(2, 10)}`;
        }

        await Profile.create({
          userId: dbUser._id,
          slug,
          displayName: dbUser.name,
          theme: "minimal",
          sections: [],
        });
      }

      // Reassign user.id so the JWT carries our Mongo ObjectId, not the
      // OAuth provider's ID.
      user.id = String(dbUser._id);
      return true;
    },

    /*
     * Populate the JWT with the user's profile slug on first issuance, so
     * server components can read session.user.slug without a DB hit.
     *
     * We re-fetch the slug if the user has no token.slug yet (first sign-in)
     * — afterwards it's just carried along.
     */
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
      }
      // On initial sign-in OR explicit session.update() call, refresh slug
      if (token.sub && (!token.slug || trigger === "update")) {
        await connectDB();
        const profile = await Profile.findOne({ userId: token.sub })
          .select("slug")
          .lean();
        if (profile) token.slug = profile.slug;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.slug === "string") session.user.slug = token.slug;
      return session;
    },
  },
});
