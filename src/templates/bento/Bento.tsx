"use client";

import { useEffect, useState } from "react";
import type { LayoutData } from "@/components/layouts/types";
import styles from "./bento.module.css";
import { Hero } from "./Hero";
import { Dock, type AppId } from "./Dock";
import { AppWindow } from "./AppWindow";
import {
  AboutApp,
  ProjectsApp,
  GitHubApp,
  LeetCodeApp,
  CodeforcesApp,
  SkillsApp,
  CareerApp,
  WritingApp,
  MLApp,
  LinksApp,
  FilesApp,
} from "./apps";

/*
 * Bento OS — orchestrator.
 *
 * The portfolio renders as a desktop OS:
 *   - Hero card centered on the desktop (avatar + name + headline + meta)
 *   - Persistent menubar at top
 *   - Persistent dock at bottom — clicking an icon opens its app
 *   - Apps render inside a modal window (AppWindow); one app at a time
 *
 * State: a single `openApp` value ("projects" | "github" | … | null).
 * Clicking a dock app sets it; closing the window or clicking another app
 * updates it. URL state via `?app=<id>` so visitors can share deep links.
 *
 * No drag-and-drop, no persisted layout — the redesign retired that. The
 * `bentoLayout` field in the schema is no longer read or written.
 */

const APP_TITLES: Record<AppId, string> = {
  about: "About",
  projects: "Projects",
  github: "GitHub",
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  skills: "Skills",
  career: "Career",
  writing: "Writing",
  ml: "ML",
  links: "Links",
  files: "Files",
};

const VALID_APPS = new Set<AppId>([
  "about",
  "projects",
  "github",
  "leetcode",
  "codeforces",
  "skills",
  "career",
  "writing",
  "ml",
  "links",
  "files",
]);

function isValidApp(value: string | null): value is AppId {
  return !!value && VALID_APPS.has(value as AppId);
}

export function Bento({ data }: { data: LayoutData }) {
  const [openApp, setOpenApp] = useState<AppId | null>(null);

  // Sync open app to ?app=… URL param. Read once on mount (so visitors
  // who land on /p/<slug>?app=projects see Projects open immediately);
  // write on every state change. We use replaceState so back-button
  // history doesn't get spammed with every app switch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("app");
    if (isValidApp(fromUrl)) setOpenApp(fromUrl);
    // We only read on mount — subsequent URL changes from the orchestrator
    // itself shouldn't re-trigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (openApp) params.set("app", openApp);
    else params.delete("app");
    const qs = params.toString();
    const newUrl =
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", newUrl);
  }, [openApp]);

  // Lock body scroll while a window is open — the window has its own
  // scroll container, and letting the page scroll behind it feels glitchy.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (openApp) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [openApp]);

  return (
    <div className={styles.root}>
      <Menubar data={data} openApp={openApp} onCloseApp={() => setOpenApp(null)} />

      <main className={styles.desktop}>
        <Hero data={data} />
        <div className={styles.openHint}>
          ↓ click a dock icon to open
        </div>
      </main>

      {openApp && (
        <AppWindow
          title={APP_TITLES[openApp]}
          onClose={() => setOpenApp(null)}
        >
          {renderApp(openApp, data)}
        </AppWindow>
      )}

      <Dock
        data={data}
        openApp={openApp}
        onOpenApp={(app) => setOpenApp(app)}
      />
    </div>
  );
}

function renderApp(app: AppId, data: LayoutData): React.ReactNode {
  switch (app) {
    case "about":
      return <AboutApp data={data} />;
    case "projects":
      return <ProjectsApp data={data} />;
    case "github":
      return <GitHubApp data={data} />;
    case "leetcode":
      return <LeetCodeApp data={data} />;
    case "codeforces":
      return <CodeforcesApp data={data} />;
    case "skills":
      return <SkillsApp data={data} />;
    case "career":
      return <CareerApp data={data} />;
    case "writing":
      return <WritingApp data={data} />;
    case "ml":
      return <MLApp data={data} />;
    case "links":
      return <LinksApp data={data} />;
    case "files":
      return <FilesApp data={data} />;
  }
}

/* ─── Menubar ────────────────────────────────────────────────────── */
function Menubar({
  data,
  openApp,
  onCloseApp,
}: {
  data: LayoutData;
  openApp: AppId | null;
  onCloseApp: () => void;
}) {
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const appName = `◍ ${data.slug || "user"}.os`;
  return (
    <div className={styles.menubar}>
      <div className={styles.menubarL}>
        <span className={`${styles.menuItem} ${styles.appName}`}>{appName}</span>
        {/* "Index" returns to the home/desktop state — useful when a window
         * is open and the user wants to see the hero again. When no app is
         * open it's just a noop label. */}
        <button
          type="button"
          className={styles.menuItem}
          onClick={onCloseApp}
        >
          Index
        </button>
        {openApp && (
          <span className={`${styles.menuItem} ${styles.active}`}>
            {APP_TITLES[openApp]}
          </span>
        )}
      </div>
      <div className={styles.menubarR}>
        <span className={styles.indicator}>
          <span className={styles.indicatorDot} />
          Available
        </span>
        <span className={`${styles.indicator} ${styles.clock}`}>{time}</span>
      </div>
    </div>
  );
}