# Deployment

This guide covers deploying Pofolio to **Vercel** — the recommended host. Other providers (Netlify, Railway, your own VPS) work too, but Vercel has the deepest Next.js integration and is what we test against.

## Prerequisites

Before deploying, you need:

- A **GitHub repo** with your Pofolio fork pushed to it
- A **MongoDB Atlas** cluster (free M0 tier is fine to start) — get the connection string ready
- A **Cloudinary** account with cloud name, API key, secret, and an unsigned upload preset
- An **MSG91** account with an approved email OTP template (for production auth)
- (Optional) A **custom domain** if you don't want a `.vercel.app` URL

## Step 1 — Create a Vercel account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with your **GitHub** account (this makes the next steps frictionless)
3. Authorize Vercel to access your repos (you can scope it to specific repos later)

## Step 2 — Import the project

1. From the Vercel dashboard, click **Add New** → **Project**
2. Find your `pofolio` repository in the list and click **Import**
3. On the configuration screen:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave as-is unless your repo has the app in a subfolder)
   - **Build Command:** `npm run build` (default — leave it)
   - **Output Directory:** `.next` (default — leave it)
   - **Install Command:** `npm install` (default — leave it)

**Do not click Deploy yet** — you need to add env vars first.

## Step 3 — Configure environment variables

Click **Environment Variables** to expand that section. Add each of the following. Set the **scope** to "Production, Preview, Development" unless noted otherwise.

### Core

| Key | Value | Notes |
|-----|-------|-------|
| `MONGODB_URI` | `mongodb+srv://...` | From Atlas → Connect → Drivers. Use a project-specific user with read/write access only to the pofolio database. |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Set this AFTER your first deploy, when you know the URL. For Preview deployments, Vercel auto-injects the right URL — don't set Preview scope. |
| `NEXTAUTH_SECRET` | (random 32-byte string) | Generate with `openssl rand -base64 32` |

### Cloudinary

| Key | Value |
|-----|-------|
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | name of your unsigned upload preset |

The `NEXT_PUBLIC_` prefix exposes the variable to the client. Only the upload preset name is safe to expose; never the API secret.

### Auth (MSG91)

| Key | Value |
|-----|-------|
| `MSG91_AUTH_KEY` | from MSG91 dashboard |
| `MSG91_EMAIL_TEMPLATE_ID` | your approved template ID |
| `MSG91_EMAIL_FROM` | sender address registered with MSG91 |

### Platform integrations

| Key | Value | Notes |
|-----|-------|-------|
| `GITHUB_TOKEN` | classic PAT with `read:user`, `public_repo` | Strongly recommended — anonymous GraphQL is rate-limited |
| `HUGGINGFACE_TOKEN` | read token | Optional |

### Best practices for secrets

- **Different secrets for dev vs prod.** Don't reuse the same `NEXTAUTH_SECRET` you use locally.
- **MongoDB user per environment.** Production should have its own DB user.
- **Rotate secrets** if they ever appear in a screenshot, log, or commit.

## Step 4 — Deploy

1. Click **Deploy**
2. Watch the build log. Successful Next.js build looks like:
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages
   ✓ Finalizing page optimization
   ```
3. If the build fails, click into the log to see why. Common causes:
   - Missing env var (the build references `process.env.X` and X is undefined)
   - TypeScript error (run `npm run typecheck` locally first)
   - Memory limit (rare; bump in `vercel.json` if needed)

## Step 5 — Set NEXTAUTH_URL

Now that you have your Vercel URL (e.g. `pofolio-yourname.vercel.app`):

1. Go to **Settings** → **Environment Variables**
2. Find `NEXTAUTH_URL` and edit it to `https://pofolio-yourname.vercel.app`
3. Trigger a redeploy: **Deployments** → click the latest → **Redeploy** → confirm

## Step 6 — Custom domain (optional)

1. **Settings** → **Domains** → **Add**
2. Type your domain (e.g. `pofolio.example.com`)
3. Vercel will show you DNS records to add at your registrar:
   - For an apex domain (`example.com`): an `A` record pointing to Vercel's IP
   - For a subdomain (`portfolio.example.com`): a `CNAME` record pointing to `cname.vercel-dns.com`
4. Wait for DNS propagation (usually < 1 hour)
5. Vercel auto-provisions an SSL cert via Let's Encrypt
6. Update `NEXTAUTH_URL` to the custom domain and redeploy

## Step 7 — Production database setup

If your MongoDB cluster has IP allowlisting enabled:

1. Vercel uses dynamic IPs for serverless functions, so you can't allowlist specific IPs
2. Either: allow `0.0.0.0/0` on the Atlas cluster (and rely on user/password for security), or
3. Better: use [Vercel + MongoDB Atlas integration](https://vercel.com/integrations/mongodbatlas) which sets up a static peering

For most users, `0.0.0.0/0` with a strong user password is fine.

## Step 8 — Verify

Visit your deployment URL and check:

- [ ] Landing page renders
- [ ] Sign-in via email OTP works (check inbox → enter OTP → land on dashboard)
- [ ] Editor lets you create a portfolio
- [ ] Cloudinary uploads work (try uploading a project image)
- [ ] GitHub / LeetCode / Codeforces fetches return real data
- [ ] Your test portfolio renders in all 6 templates

## Preview deployments — automatic for PRs

Once Vercel is connected, every PR opened against `main` gets its own **preview deployment** at a unique URL. The Vercel bot comments on the PR with the link. This is gold for:

- Reviewers checking visual changes without pulling the branch
- Catching env var / build issues before merge
- Sharing in-progress work with stakeholders

You don't need to do anything to enable this — it's on by default once the repo is connected.

## Continuous deployment

- **Push to `main`** → Production deployment (automatic)
- **Open / push to a PR** → Preview deployment (automatic)

To pause deploys, disable the GitHub integration or use the **Deployment Protection** settings.

## Monitoring

Vercel provides basic monitoring for free:

- **Deployments** tab: build history and rollback
- **Analytics** (paid tier): visitor counts, page perf
- **Logs**: real-time function logs at **Functions** → click any function

For deeper observability, integrate Sentry or LogRocket — both have free tiers.

## Rollback

If a production deploy breaks something:

1. **Deployments** tab
2. Find a previous green deploy
3. Click the `...` menu → **Promote to Production**

This is instant — the old deployment is already built. Then push a fix to `main` to roll forward properly.

## Costs

Vercel's **Hobby** tier is free and includes:
- 100 GB bandwidth / month
- 100 GB-hours of serverless function compute
- Unlimited preview deploys

For a typical portfolio app, this is more than enough. Watch the **Usage** tab; if you grow past it, the **Pro** tier is $20/month.

MongoDB Atlas **M0** is free forever with 512 MB storage. Cloudinary **Free** is 25 GB storage + 25 GB monthly bandwidth.

## Alternatives to Vercel

- **Netlify** — Next.js works, slightly less integrated
- **Railway** — full Node.js host, more control over the runtime
- **Self-hosted** — `npm run build && npm run start` behind any reverse proxy (nginx, Caddy)

Pofolio doesn't lock you in; the codebase is standard Next.js.

## Troubleshooting

**Build fails with "Cannot find module '@/...'"** — TypeScript path aliases not resolved. Check `tsconfig.json` `paths` and `next.config.js` `webpack` config.

**Auth callback returns 500** — Check `NEXTAUTH_URL` matches your deployed URL exactly (including `https://`).

**Cloudinary uploads fail with 401** — Upload preset is signed; needs to be unsigned for client-side uploads. Recreate as unsigned.

**Database connection times out** — Atlas IP allowlist. Add `0.0.0.0/0` or set up Vercel-Atlas integration.

**Site loads but data is missing** — Check Vercel **Functions** logs for errors during data fetching. Often a missing platform API token.

Open a GitHub issue with the failing build log if you're stuck.
