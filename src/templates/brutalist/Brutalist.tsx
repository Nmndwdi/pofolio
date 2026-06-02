"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LayoutData } from "@/components/layouts/types";
import { externalProfileLink } from "@/lib/external-profile-link";
import { sectionsFor, SECTION_LABELS } from "@/components/layouts/types";
import { CustomCursor } from "./CustomCursor";
import { Hero } from "./Hero";
import {
  AboutSection,
  CodeforcesFull,
  EducationSection,
  ExperienceSection,
  FilesSection,
  GitHubFull,
  LeetCodeFull,
  LinksSection,
  MLSection,
  ProjectsSection,
  SectionHeader,
  SkillsSection,
  SocialsStrip,
  WritingSection,
} from "./Sections";
import { sfx } from "./sound";
import styles from "./brutalist.module.css";

/*
 * Brutalist — main template component.
 *
 * Composes the hero + numbered sections + floating action bar. Top-bar
 * controls let the user toggle:
 *   - Palette: default (yellow) / ink (dark) / acid (green)
 *   - Grid: on / off (visible 8-column overlay)
 *   - Sound: on / off (Web Audio click+thunk on interactions)
 *
 * Section numbering matches what the eye sees: each rendered section gets
 * the next number. About counts as N°01 when present.
 *
 * Why not memoise the rendered sections: their inputs are simple and the
 * render cost is tiny (no expensive layout). Avoiding premature optimisation.
 */

type Palette = "default" | "ink" | "acid";

export function Brutalist({ data }: { data: LayoutData }) {
  const [palette, setPalette] = useState<Palette>("default");
  const [gridOn, setGridOn] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  // Keep the sound module's enabled flag synced with state. Done in effect
  // so we don't trigger a Web Audio init on every render.
  useEffect(() => {
    sfx.setEnabled(soundOn);
  }, [soundOn]);

  // Sound feedback on body clicks (interactive elements only). Delegated
  // listener — no need to wire per-element. Filters via closest() so we
  // only thunk on real interactive elements.
  useEffect(() => {
    if (!soundOn) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.("a, button, [data-cursor='hover']")) {
        sfx.thunk();
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [soundOn]);

  // Section list with stable numbering.
  const sectionKeys = sectionsFor(data);
  const ordered: Array<{ key: string; label: string }> = [];
  if (data.bio) ordered.push({ key: "about", label: "About" });
  for (const k of sectionKeys) ordered.push({ key: k, label: SECTION_LABELS[k] });

  return (
    <div className={styles.root} data-palette={palette} data-grid={gridOn ? "on" : "off"}>
      <div className={styles.gridOverlay} aria-hidden />
      <CustomCursor />

      <TopBar
        palette={palette}
        setPalette={setPalette}
        gridOn={gridOn}
        setGridOn={setGridOn}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
      />

      <FloatingActions slug={data.slug} />

      <div className={styles.wrap}>
        <Hero data={data} />
        <SocialsStrip data={data} />

        {ordered.map((item, idx) => {
          const num = String(idx + 1).padStart(2, "0");
          const ext =
            item.key !== "about"
              ? externalProfileLink(item.key as never, data)
              : null;
          return (
            <section
              key={item.key}
              id={item.key}
              className={styles.section}
            >
              <SectionHeader
                number={num}
                title={item.label}
                externalUrl={ext?.url}
                externalLabel={ext?.label}
              />
              <SectionBody sectionKey={item.key} data={data} />
            </section>
          );
        })}

        <Footer slug={data.slug} />
      </div>
    </div>
  );
}

function SectionBody({
  sectionKey,
  data,
}: {
  sectionKey: string;
  data: LayoutData;
}) {
  switch (sectionKey) {
    case "about":
      return <AboutSection data={data} />;
    case "experience":
      return <ExperienceSection data={data} />;
    case "education":
      return <EducationSection data={data} />;
    case "skills":
      return <SkillsSection data={data} />;
    case "projects":
      return <ProjectsSection data={data} />;
    case "code":
      // Full GitHub block: stats + contribution heatmap.
      return <GitHubFull data={data} />;
    case "competitive":
      // Full Codeforces block: stats + rating chart + submission heatmap.
      return <CodeforcesFull data={data} />;
    case "problem-solving":
      // Full LeetCode block: stats + submission heatmap.
      return <LeetCodeFull data={data} />;
    case "writing":
      return <WritingSection data={data} />;
    case "ml":
      return <MLSection data={data} />;
    case "links":
      return <LinksSection data={data} />;
    case "files":
      return <FilesSection data={data} />;
    default:
      return null;
  }
}

/* ─── Top bar (palette/grid/sound switches) ────────────────────────── */

function TopBar({
  palette,
  setPalette,
  gridOn,
  setGridOn,
  soundOn,
  setSoundOn,
}: {
  palette: Palette;
  setPalette: (p: Palette) => void;
  gridOn: boolean;
  setGridOn: (v: boolean) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
}) {
  // Cycle palette: default → ink → acid → default. Single button, less
  // chrome than a three-way picker.
  const cyclePalette = () => {
    if (palette === "default") setPalette("ink");
    else if (palette === "ink") setPalette("acid");
    else setPalette("default");
  };

  return (
    <div className={styles.topBar} data-print-hide>
      <button
        type="button"
        className={styles.topBarBtn}
        onClick={cyclePalette}
        title="Cycle palette"
      >
        {palette === "default"
          ? "Yellow"
          : palette === "ink"
            ? "Ink"
            : "Acid"}
      </button>
      <button
        type="button"
        className={styles.topBarBtn}
        data-active={gridOn}
        onClick={() => setGridOn(!gridOn)}
        title="Toggle grid"
      >
        Grid
      </button>
      <button
        type="button"
        className={styles.topBarBtn}
        data-active={soundOn}
        onClick={() => setSoundOn(!soundOn)}
        title="Toggle sound"
      >
        Sound
      </button>
    </div>
  );
}

/* ─── Floating actions ─────────────────────────────────────────────── */

function FloatingActions({ slug }: { slug: string }) {
  return (
    <div className={styles.actions} data-print-hide>
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
        onClick={() => window.print()}
      >
        Download PDF
      </button>
      <a
        className={styles.actionBtn}
        href={`/p/${slug}/vcard`}
        data-no-print-url
      >
        Save Contact
      </a>
    </div>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────── */

function Footer({ slug }: { slug: string }) {
  return (
    <footer className={styles.footer}>
      <span className={styles.footerLeft}>POFOLIO · /p/{slug}</span>
      <Link href="/" className={styles.footerLink} data-no-print-url>
        Make your own ↗
      </Link>
    </footer>
  );
}