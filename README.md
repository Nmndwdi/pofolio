# Pofolio

> Developer portfolios that don't all look the same. Connect your coding accounts, pick a template, ship it.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Made with Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<!-- Drop a hero screenshot or animated demo here once you have one
<p align="center">
  <img src="docs/assets/hero.png" alt="Pofolio templates" width="800" />
</p>
-->

---

## What is Pofolio?

Pofolio is an open-source platform for building developer portfolios that **don't look like every other developer portfolio**. You connect your handles on GitHub, LeetCode, Codeforces, Dev.to, and Hugging Face. Pofolio fetches your activity. You pick from a growing library of templates — each one a distinct interpretation of the same underlying data — and publish.

The same portfolio data renders six different ways out of the box: a terminal HUD, a brutalist editorial layout, a newspaper, an OS-style dashboard, a 3D walk through a snowy landscape, and a scroll-jacked cinematic sequence. Adding a seventh is the project's primary extension point — see [Adding a new template](#adding-a-new-template).

Pofolio is open-source so anyone can fork, self-host, contribute new templates, or improve existing ones. Contributions go through a PR-and-review workflow described in [CONTRIBUTING.md](CONTRIBUTING.md).

## Live demo

🔗 **<!-- Add your Vercel URL here once deployed -->**

## Features

- **Multi-template rendering** — one data model, many visual interpretations
- **Auto-fetched activity** from GitHub, LeetCode, Codeforces, Dev.to, and Hugging Face — heatmaps, ratings, contributions, articles
- **Email OTP auth** via MSG91 (SMS DLT in progress) on top of NextAuth v5
- **Cloudinary media** for project hero images, galleries, and resumes
- **Resume + custom files** with public download links
- **Custom links + socials** with optional descriptions
- **Type-safe data layer** (TypeScript strict + Zod validation)
- **MongoDB** persistence via Mongoose

## Templates

| Template | Aesthetic | Highlights |
|----------|-----------|------------|
| `terminal` | Hacker CLI / monospace | Type-on prompts, ANSI accents |
| `brutalist` | Raw editorial | Big type, hard rules, unapologetic |
| `press` | Newspaper layout | Column grid, justified body, masthead |
| `bento-os` | OS-style dashboard | Tiled bento cards, system widgets |
| `spatial-walk` | 3D world (Three.js) | Walk through snowy mountains; Solo Leveling-style status windows |
| `cinematic` | Scroll-jacked film (GSAP) | Choreographed identity → experience → skills → platforms → projects |

Each template renders from the same `LayoutData` shape defined in [`src/components/layouts/types.ts`](src/components/layouts/types.ts). Adding a template means writing one new render component — no data wiring required.

## Quick start

### Prerequisites

- Node.js **20.x or 22.x**
- npm (or pnpm / yarn — adapt commands accordingly)
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- (Optional, for full features) MSG91 account for email OTP

### Local setup

```bash
# 1. Clone
git clone https://github.com/Nmndwdi/pofolio.git
cd pofolio

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local
# Open .env.local in your editor and fill in the values
# (see "Environment variables" below)

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start the production server (run build first)
npm run lint         # ESLint
npm run typecheck    # TypeScript strict check
```

## Environment variables

Copy `.env.example` to `.env.local` and populate. Required unless marked optional.

### Core

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted) |
| `NEXTAUTH_URL` | Full URL of the app (`http://localhost:3000` in dev) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth sessions (`openssl rand -base64 32`) |

### Cloudinary

| Variable | Purpose |
|----------|---------|
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset name |

### Auth (Email OTP)

| Variable | Purpose |
|----------|---------|
| `MSG91_AUTH_KEY` | MSG91 API auth key |
| `MSG91_EMAIL_TEMPLATE_ID` | Approved email OTP template ID |
| `MSG91_EMAIL_FROM` | Sender address registered with MSG91 |

### Platform integrations (optional but recommended)

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Personal access token for GitHub GraphQL (lifts rate limits) |
| `HUGGINGFACE_TOKEN` | Read token for Hugging Face Hub API |

> **Never commit `.env.local`.** It's already in `.gitignore`. Anything secret stays out of the repo; share via `.env.example` (placeholders only).

## Tech stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Language:** TypeScript 5 (strict mode)
- **UI:** React 19, CSS Modules
- **3D / animation:** Three.js (spatial-walk), GSAP + ScrollTrigger (cinematic)
- **Database:** MongoDB via Mongoose 8
- **Auth:** NextAuth v5 (beta) with MSG91 Email OTP
- **Media:** Cloudinary
- **Validation:** Zod

## Project structure

```
pofolio/
├── src/
│   ├── app/                  # Next.js App Router routes
│   ├── components/
│   │   └── layouts/
│   │       └── types.ts      # Canonical LayoutData type — every template reads this
│   ├── templates/
│   │   ├── terminal/         # one template = one folder
│   │   ├── brutalist/
│   │   ├── press/
│   │   ├── bento-os/
│   │   ├── spatial-walk/
│   │   └── cinematic/
│   ├── lib/                  # Shared utilities (cloudinary, db, fetchers)
│   └── models/               # Mongoose schemas
├── docs/                     # Contributor docs
│   ├── ADDING_A_TEMPLATE.md
│   └── DEPLOYMENT.md
├── .github/                  # PR / issue templates, CODEOWNERS, CI
└── public/                   # Static assets
```

## Data sources

Pofolio pulls activity from these platforms when the user provides a handle:

- **GitHub** — repos, languages, contributions heatmap (GraphQL API)
- **LeetCode** — problems solved, ratings, contest history, submissions heatmap
- **Codeforces** — rating history, recent contests, submissions heatmap (official API)
- **Dev.to** — published articles
- **Hugging Face** — public models and datasets

Fetchers live in `src/lib/integrations/` (or similar — adjust if your structure differs). They're called server-side; the resulting data is stored on the user's portfolio document and refreshed periodically.

## Adding a new template

The fastest way to make Pofolio yours is to ship a template. The data is handled — you write a render layer.

**Quick version:**

1. Create `src/templates/your-template/`
2. Export a default React component from `index.tsx` accepting `{ data: LayoutData }`
3. Use CSS Modules (`your-template.module.css`) for styles — never global CSS
4. Register the template in the template registry (see `src/templates/registry.ts` or equivalent)
5. Verify all data sections render: identity, experience, skills, platforms, projects, files, links, socials, education
6. Open a PR using the **New template** issue → PR template

The full guide is at [docs/ADDING_A_TEMPLATE.md](docs/ADDING_A_TEMPLATE.md).

## Contributing

We use a standard fork → PR → review workflow. Direct pushes to `main` are blocked; every change goes through a PR with required approval and passing CI.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. It covers:

- Forking and branching
- Setting up your dev environment
- Code style (Prettier + ESLint enforced)
- Commit conventions
- PR requirements
- How code review works

## Roadmap

- [ ] More templates — editorial-magazine, isometric-city, neon-cyberpunk, retro-arcade, kanban
- [ ] Custom domain support for hosted portfolios
- [ ] Theming hooks (let users tweak colors/fonts per template)
- [ ] More data sources (HackerRank, Kaggle, Stack Overflow)
- [ ] Portfolio analytics opt-in
- [ ] PWA / offline mode for visitors

Got an idea? [Open a feature request](../../issues/new/choose).

## Security

If you discover a security vulnerability, please **do not open a public issue**. Email the maintainer directly — see [SECURITY.md](SECURITY.md) for the disclosure process.

## License

Pofolio is released under the [MIT License](LICENSE). You can use it commercially, modify it, and self-host it. Contributions you submit are licensed under the same terms.

## Acknowledgments

Built by [Naman](https://github.com/Nmndwdi) and contributors.

Powered by:
- [Next.js](https://nextjs.org)
- [Three.js](https://threejs.org)
- [GSAP](https://gsap.com)
- [Cloudinary](https://cloudinary.com)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Vercel](https://vercel.com) for hosting

The 3D spatial-walk landscape draws inspiration from [Solo Leveling's](https://en.wikipedia.org/wiki/Solo_Leveling) status-window UI language.
