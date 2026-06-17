# Contributing to Pofolio

Thanks for your interest! Pofolio grows when people add templates, fix bugs, and improve docs. This document walks you through how to do that.

## Code of Conduct

This project adopts the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Ways to contribute

- **Ship a new template** — the primary extension point. See [docs/ADDING_A_TEMPLATE.md](docs/ADDING_A_TEMPLATE.md).
- **Improve an existing template** — fix a layout bug, add missing data, polish animation
- **Add a data source** — new platform integration (HackerRank, Kaggle, etc.)
- **Fix a bug** — find an issue labeled `good first issue` or `help wanted`
- **Improve docs** — typos, clarifications, missing examples

## Before you start

For non-trivial work, **open an issue first**. This:
- Confirms the change is wanted before you spend time on it
- Lets the maintainer flag conflicts or alternative approaches
- Gives others a chance to weigh in
- Avoids two people working on the same thing

Trivial fixes (typos, obvious bugs) can go straight to PR.

## Development setup

1. **Fork** the repo on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/Nmndwdi/pofolio.git
   cd pofolio
   ```
3. **Add the upstream remote** (so you can pull in updates):
   ```bash
   git remote add upstream https://github.com/<original-owner>/pofolio.git
   ```
4. **Install + configure**:
   ```bash
   npm install
   cp .env.example .env.local
   # Fill in .env.local — see README.md "Environment variables"
   npm run dev
   ```

## Branching

```bash
git checkout main
git pull upstream main
git checkout -b <type>/<short-description>
```

Branch name conventions:
- `feat/template-isometric-city` — new feature
- `fix/cinematic-modal-zindex` — bug fix
- `docs/clarify-env-setup` — docs only
- `chore/upgrade-nextjs` — dependencies, build config
- `refactor/share-heatmap-helper` — internal cleanup, no behavior change

## Commits

We follow a relaxed version of [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

<optional body explaining the why>
```

Examples:

- `feat(templates): add isometric-city template`
- `fix(cinematic): platform info no longer blocks project clicks`
- `docs: clarify Cloudinary upload preset setup`

Keep commits focused. Squash WIP commits before opening the PR. Prefer a clean history of meaningful changes.

## Code style

- **Prettier** formats. Run `npm run format` before committing — or set up format-on-save.
- **ESLint** lints. Run `npm run lint` and fix all errors and warnings.
- **TypeScript** strict mode. No `any` without a comment justifying it.
- **CSS Modules** only. No global CSS, no inline styles for non-dynamic values.
- **Server components by default.** Use `"use client"` only when you need state, effects, or browser APIs.

## Pull requests

1. Push your branch to your fork:
   ```bash
   git push origin <your-branch>
   ```
2. Open a PR against `main` of the upstream repo.
3. Fill out the PR template completely.
4. **Wait for CI to pass** — lint, typecheck, build must all be green.
5. **Wait for a code owner review.** The maintainer will be auto-requested via [CODEOWNERS](.github/CODEOWNERS).
6. Address review feedback by pushing more commits to the same branch. Don't force-push during review unless asked to.
7. Once approved and CI is green, a maintainer will merge.

### PR requirements

- [ ] CI passes (lint, typecheck, build)
- [ ] Changes are scoped — one PR per concern
- [ ] New code has tests (where applicable) or a manual-test plan in the PR description
- [ ] Screenshots / GIFs for any visual change
- [ ] No unrelated formatting churn
- [ ] No commits with secrets, large binaries, or `.env*` files

### What gets rejected

- Direct pushes to `main` (blocked by branch protection)
- PRs without a passing CI run
- PRs that combine unrelated changes
- PRs that add a hard dependency on a non-free service without discussion
- PRs that break existing templates' data parity

## Adding a template — the special path

Templates are the heart of this project. They get a dedicated guide and a dedicated issue template:

1. Open a **New template** issue describing the aesthetic and a rough mock
2. Wait for maintainer ack before building (so two people don't ship the same idea)
3. Build it following [docs/ADDING_A_TEMPLATE.md](docs/ADDING_A_TEMPLATE.md)
4. Open a PR with screenshots from at least 3 viewport sizes (mobile, tablet, desktop)
5. PR will be reviewed against the [Template completeness checklist](docs/ADDING_A_TEMPLATE.md#completeness-checklist)

## Reporting bugs

Use the **Bug report** issue template. Include:
- What you were doing
- What you expected
- What actually happened
- Browser + OS
- Steps to reproduce (numbered)
- Console errors and a screenshot if relevant

## Reporting security issues

**Do not file public issues for security vulnerabilities.** See [SECURITY.md](SECURITY.md) for the disclosure process.

## Releases

Releases are cut from `main` by maintainers using tags (`v1.0.0`, etc.) and GitHub Releases. You don't need to do anything for releases.

## Recognition

Every merged PR earns a place in the GitHub contributor graph. Significant contributions (new templates, major features) get a callout in the README's Acknowledgments section.

Thanks for making Pofolio better.
