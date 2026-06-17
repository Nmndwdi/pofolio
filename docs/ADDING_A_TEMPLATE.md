# Adding a new template

Templates are the heart of Pofolio. This guide walks you through building one from scratch.

## Mental model

A template is a **React component that renders portfolio data**. The data is fully prepared by the platform — you don't fetch anything, you don't worry about MongoDB, you don't handle auth. You receive a typed `data: LayoutData` prop and you decide what it looks like.

```
   ┌─────────────┐      ┌──────────────┐     ┌────────────────┐
   │ Data layer  │  →   │ LayoutData   │  →  │ Your template  │
   │ (built-in)  │      │  (typed)     │     │ (your code)    │
   └─────────────┘      └──────────────┘     └────────────────┘
```

Your template is **one folder** under `src/templates/`. That's it.

## Before you start

1. **Open a "New template proposal" issue** — get maintainer ack before you build
2. Skim two existing templates in `src/templates/` to absorb the conventions:
   - A simple one (`press` or `brutalist`)
   - A complex one (`spatial-walk` or `cinematic`)
3. Read [`src/components/layouts/types.ts`](../src/components/layouts/types.ts) end to end — that's your data contract

## File structure

Every template lives in `src/templates/<your-template>/`:

```
src/templates/your-template/
├── index.tsx                    # Default export — the entry component
├── YourTemplate.tsx             # Main component (optional split for clarity)
├── ProjectModal.tsx             # Project detail modal (most templates need one)
├── your-template.module.css     # All styles — CSS Modules
└── README.md                    # Optional: design notes
```

### `index.tsx` — the entry point

This is what the registry imports. Keep it minimal:

```tsx
"use client";

import type { LayoutData } from "@/components/layouts/types";
import { YourTemplate } from "./YourTemplate";

export default function YourTemplateIndex({ data }: { data: LayoutData }) {
  return <YourTemplate data={data} />;
}
```

### `YourTemplate.tsx` — the main render layer

This is where your work lives. Required structure:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { LayoutData } from "@/components/layouts/types";
import styles from "./your-template.module.css";

export function YourTemplate({ data }: { data: LayoutData }) {
  // Derive memoized data
  const platforms = useMemo(() => buildPlatforms(data), [data]);
  const projects = useMemo(() => buildProjects(data), [data]);

  return (
    <div className={styles.root}>
      {/* Render every required section */}
      <Identity data={data} />
      <Experience entries={data.experience} />
      <Skills data={data} />
      <Platforms platforms={platforms} />
      <Projects projects={projects} />
      <Files data={data} />
      <Links data={data} />
      <Socials data={data} />
      <Education entries={data.education} />
    </div>
  );
}
```

## The data contract

You **must** render every section of `LayoutData` that has content. Empty sections (e.g. no education entries) can be skipped — but never silently drop data the user provided.

Quick reference (always check `types.ts` for the source of truth):

| Section | Shape (abridged) |
|---------|------------------|
| `displayName` | `string` |
| `headline` | `string \| null` |
| `bio` | `string \| null` |
| `experience` | `Array<{ id, company, role, dates, summary, skills }>` |
| `skills` | `string[]` |
| `skillGroups` | `Array<{ id, name, skills }>` |
| `education` | `Array<{ id, institution, degree, field, dates, ... }>` |
| `projects` | `Array<{ id, title, description, tech, images, ... }>` |
| `featuredProjectId` | `string \| null` |
| `github / leetcode / codeforces / devto / huggingface` | `{ username, data: {...} } \| null` |
| `resumeCloudinaryId` | `string \| null` |
| `files` | `Array<{ id, label, publicId, resourceType, format }>` |
| `customLinks` | `Array<{ id, label, url, description? }>` |
| `customSocials` | `Array<{ id, label, url }>` |
| `socials` | `{ linkedin, twitter, github, website, email }` |

### Platform data — the deep one

Each platform (`github`, `leetcode`, etc.) has a rich `data` object with stats, heatmaps, contest history. Look at `spatial-walk/Cards.tsx` and `cinematic/Cinematic.tsx` for full-fidelity rendering examples — they show every stat available.

The minimum acceptable is: handle, top stats, and a heatmap (when available).

## Styling rules

- **CSS Modules only.** No styled-components, no Tailwind in this template (unless your whole template chooses Tailwind — discuss first).
- **No global selectors** (`html { ... }`, `body { ... }`) — scoped to your template
- **CSS variables** for theme tokens at the top of your file:
  ```css
  :root .root {
    --bg: #0a0a0a;
    --fg: #f5f5f5;
    --accent: #ff6b35;
  }
  ```
- **Respect `prefers-reduced-motion`** for anything that moves:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .animatedThing { animation: none; }
  }
  ```
- **Responsive from the start.** Don't bolt mobile on at the end.

## Animation rules

If your template uses GSAP, Three.js, or any continuous animation:

- **Memoize everything** that feeds into `useEffect` dependency arrays. A re-render mid-animation tears down the render loop.
- **`refs` for animated values**, not state. Setting state every frame triggers React re-renders.
- **Always cleanup.** Return a cleanup function from `useEffect` that calls `tl.kill()`, `ctx.revert()`, or removes event listeners.
- **`will-change` on heavy elements**, not everything (it has a cost).

## Project modal

Most templates need a way to show full project detail when a user clicks a project card. Pattern used by other templates:

```tsx
// Inside YourTemplate.tsx
const [openProject, setOpenProject] = useState<Project | null>(null);

// ...later, on each project card:
<div onClick={() => setOpenProject(project)} role="button" tabIndex={0}>...</div>

// ...at the end of the component:
<ProjectModal project={openProject} onClose={() => setOpenProject(null)} />
```

`ProjectModal` should use `createPortal(modal, document.body)` so it escapes any pinned/transformed parents.

## Registration

After your template is built, register it in the template registry (file location varies — usually `src/templates/registry.ts` or `src/lib/templates.ts`):

```ts
import yourTemplate from "./your-template";

export const TEMPLATES = {
  // ... existing
  "your-template": {
    id: "your-template",
    name: "Your Template",
    description: "One-line description.",
    component: yourTemplate,
    thumbnail: "/templates/your-template.png",
  },
} as const;
```

Add a thumbnail at `public/templates/your-template.png` (recommended: 1200×630, optimized).

## Completeness checklist

Before opening the PR, verify every box:

### Data coverage
- [ ] Renders all of `data.experience` (no silent truncation)
- [ ] Renders skills (`skillGroups` if present, else flat `skills`)
- [ ] Renders all platforms the user has connected, with full stats + heatmap (year-filtered)
- [ ] Renders featured project + all other projects
- [ ] Project modal opens and shows all project images, tech, links, description
- [ ] Renders resume + all custom files
- [ ] Renders all custom links (including `description` field if present)
- [ ] Renders all socials (built-in + custom)
- [ ] Renders all education entries

### Responsiveness
- [ ] Works at 320px (smallest mobile)
- [ ] Works at 640px (large mobile / small tablet)
- [ ] Works at 1024px (tablet / small desktop)
- [ ] Works at 1920px (full desktop)

### Accessibility
- [ ] Keyboard navigation works for all interactive elements
- [ ] `role` / `tabIndex` / `aria-*` on click-handlers that aren't `<button>` or `<a>`
- [ ] Color contrast meets WCAG AA for body text
- [ ] Respects `prefers-reduced-motion`

### Performance
- [ ] No layout shift on load (set explicit dimensions for images)
- [ ] Animation runs at 60fps on a mid-tier laptop
- [ ] No memory leaks (GSAP timelines killed, Three.js scenes disposed)

### Build
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

### PR
- [ ] Screenshots from 3 viewport sizes attached
- [ ] (For animated templates) Screen recording attached
- [ ] Updated `README.md` template table
- [ ] Linked back to the original "New template proposal" issue

## Help

Stuck? Open a draft PR early and tag the maintainer in a comment. Better to get feedback at 50% than discover at 100% that the approach won't merge.
