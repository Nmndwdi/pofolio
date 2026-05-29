# Pofolio

A portfolio generator with a permanent QR code. Users sign up, link their GitHub/Codeforces/LeetCode/etc., and get a public page at `pofolio.vercel.app/p/<slug>` that auto-updates as their stats change. The QR on a printed resume keeps working forever.

## Stack

- **Next.js 15 (App Router)** — full-stack, server components, SSR portfolio pages for SEO
- **MongoDB + Mongoose** — flexible schema fits the section-based portfolio model
- **NextAuth v5** — email/password + Google + GitHub OAuth
- **Tailwind v3 + shadcn-style CSS variables** — theme switching at the portfolio level
- **Cloudinary** — file/image/video uploads
- **TypeScript everywhere** — strict mode, Zod for runtime validation

## Local setup

```bash
git clone <repo>
cd pofolio
npm install
cp .env.example .env.local
# fill in MONGODB_URI and AUTH_SECRET at minimum
npm run dev
```

Visit `http://localhost:3000`.

### Required env vars to boot

- `MONGODB_URI` — MongoDB Atlas free tier works
- `AUTH_SECRET` — `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for dev

The rest are optional until you build that feature.

## Architecture at a glance

```
Public traffic → /p/[slug]                  (server-rendered, cached)
                    ↓ reads
                 Profile (Mongo) ← Cache (Mongo, TTL'd)
                    ↑ writes              ↑ refreshes from
Authenticated → /(dashboard)/editor      GitHub / Codeforces / LeetCode APIs
                    ↓ via
                 /api/portfolio/...        (NextAuth session required)
```

The public portfolio page never hits upstream APIs directly — it reads from the `Cache` collection, which a server-side fetcher refills on a TTL (default 1 hour). This means:

- GitHub never sees per-visitor traffic from your app
- The page renders fast even when GitHub is slow
- You stay well under the 5000 req/hour authenticated rate limit

## Folder layout

See `src/` — comments at the top of each subfolder explain what belongs there.

## Status

🚧 Scaffolding only. Models, auth, and integrations are next.
