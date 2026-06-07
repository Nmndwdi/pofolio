"use client";

import type { LayoutData } from "@/components/layouts/types";
import styles from "./bento.module.css";

/*
 * Dock — always-visible bottom strip of app icons.
 *
 * Two groups separated by a vertical divider:
 *   1. SECTION APPS — clicking opens an in-page window with that section's
 *      content (Projects, GitHub, LeetCode, Codeforces, Skills, Career,
 *      Writing, ML, Links, Files). The orchestrator owns the open-app
 *      state; the dock just emits clicks.
 *   2. SOCIAL SHORTCUTS — clicking opens the external URL in a new tab
 *      (LinkedIn, X, GitHub profile, Website, Email, Resume). These are
 *      not "apps" — they're just shortcuts.
 *
 * Each icon has a colored gradient based on its data-color attribute (see
 * bento.module.css). The active app gets a brighter glow + a dot underneath
 * to match macOS dock-with-running-app affordance.
 *
 * An app icon is only included if its underlying data exists. We don't show
 * a LeetCode icon for someone who didn't connect LeetCode.
 */

export type AppId =
  | "about"
  | "projects"
  | "github"
  | "leetcode"
  | "codeforces"
  | "skills"
  | "career"
  | "writing"
  | "ml"
  | "links"
  | "files";

interface DockProps {
  data: LayoutData;
  openApp: AppId | null;
  onOpenApp: (app: AppId) => void;
}

interface AppEntry {
  id: AppId;
  label: string;
  short: string;
  color: string;
  /** Only render this app icon if predicate returns true given the data. */
  has: (d: LayoutData) => boolean;
}

const APPS: AppEntry[] = [
  {
    id: "about",
    label: "About",
    short: "◍",
    color: "about",
    has: (d) => !!(d.bio || d.headline),
  },
  {
    id: "projects",
    label: "Projects",
    short: "❖",
    color: "projects",
    has: (d) => d.projects.length > 0,
  },
  {
    id: "github",
    label: "GitHub",
    short: "◆",
    color: "github",
    has: (d) => !!d.github?.data,
  },
  {
    id: "leetcode",
    label: "LeetCode",
    short: "●",
    color: "leetcode",
    has: (d) => !!d.leetcode?.data,
  },
  {
    id: "codeforces",
    label: "Codeforces",
    short: "◇",
    color: "codeforces",
    has: (d) => !!d.codeforces?.data,
  },
  {
    id: "skills",
    label: "Skills",
    short: "✦",
    color: "skills",
    has: (d) => d.skillGroups.length > 0 || d.skills.length > 0,
  },
  {
    id: "career",
    label: "Career",
    short: "▲",
    color: "career",
    has: (d) => d.experience.length > 0 || d.education.length > 0,
  },
  {
    id: "writing",
    label: "Writing",
    short: "✎",
    color: "writing",
    has: (d) => !!(d.devto?.data?.articles?.length),
  },
  {
    id: "ml",
    label: "ML",
    short: "🤗",
    color: "ml",
    has: (d) => !!(d.huggingface?.data?.items?.length),
  },
  {
    id: "links",
    label: "Links",
    short: "↗",
    color: "links",
    has: (d) => d.customLinks.length > 0,
  },
  {
    id: "files",
    label: "Files",
    short: "📄",
    color: "files",
    has: (d) => !!(d.resumeCloudinaryId || d.files.length > 0),
  },
];

interface SocialShortcut {
  label: string;
  short: string;
  color: string;
  href: string;
}

function buildSocials(data: LayoutData): SocialShortcut[] {
  const out: SocialShortcut[] = [];
  if (data.socials.linkedin) {
    out.push({
      label: "LinkedIn",
      short: "in",
      color: "linkedin",
      href: data.socials.linkedin,
    });
  }
  if (data.socials.twitter) {
    out.push({
      label: "Twitter",
      short: "𝕏",
      color: "twitter",
      href: `https://twitter.com/${data.socials.twitter.replace(/^@/, "")}`,
    });
  }
  // GitHub PROFILE link — distinct from the GitHub app (which shows stats).
  // The profile link goes straight to github.com/<handle>; the app opens
  // an in-page window with contribution heatmap, stars, etc.
  if (data.socials.github || data.githubHandle) {
    const handle = data.socials.github || data.githubHandle;
    out.push({
      label: "GitHub Profile",
      short: "GH",
      color: "ghProfile",
      href: `https://github.com/${handle}`,
    });
  }
  if (data.socials.website) {
    out.push({
      label: "Website",
      short: "🌐",
      color: "website",
      href: data.socials.website,
    });
  }
  // Custom socials get the generic "custom" gradient — labels still appear
  // in the tooltip so users can see what each one is.
  for (const s of data.customSocials) {
    out.push({
      label: s.label,
      short: s.label.slice(0, 2).toUpperCase(),
      color: "custom",
      href: s.url,
    });
  }
  if (data.socials.email) {
    out.push({
      label: "Email",
      short: "@",
      color: "email",
      href: `mailto:${data.socials.email}`,
    });
  }
  if (data.resumeCloudinaryId) {
    const cloud =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
      "demo";
    out.push({
      label: "Resume",
      short: "CV",
      color: "resume",
      href: `https://res.cloudinary.com/${cloud}/raw/upload/${data.resumeCloudinaryId}`,
    });
  }
  return out;
}

export function Dock({ data, openApp, onOpenApp }: DockProps) {
  const availableApps = APPS.filter((a) => a.has(data));
  const socials = buildSocials(data);

  return (
    <div className={styles.dock}>
      {availableApps.map((app) => {
        const isActive = openApp === app.id;
        return (
          <button
            key={app.id}
            type="button"
            className={`${styles.dockApp} ${isActive ? styles.active : ""}`}
            data-color={app.color}
            onClick={() => onOpenApp(app.id)}
            aria-label={`Open ${app.label}`}
            aria-pressed={isActive}
          >
            {app.short}
            <span className={styles.tt}>{app.label}</span>
          </button>
        );
      })}
      {availableApps.length > 0 && socials.length > 0 && (
        <div className={styles.dockSep} />
      )}
      {socials.map((s, i) => (
        <a
          key={`${s.label}-${i}`}
          href={s.href}
          target={s.href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          className={styles.dockApp}
          data-color={s.color}
          aria-label={s.label}
        >
          {s.short}
          <span className={styles.tt}>{s.label}</span>
        </a>
      ))}
    </div>
  );
}