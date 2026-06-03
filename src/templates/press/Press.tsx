"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LayoutData } from "@/components/layouts/types";
import { Grain } from "./Grain";
import { Masthead } from "./Masthead";
import { ScrollReveal } from "./ScrollReveal";
import {
  ByNumbersSpread,
  CareerNotesSpread,
  CompetitiveSpread,
  ContributorLine,
  DocumentsSpread,
  ElsewhereSpread,
  FeaturedWorkSpread,
  IndexSpread,
  LeadStorySpread,
  MachineLearningSpread,
  MoreWorkSpread,
  WritingSpread,
} from "./Sections";
import styles from "./press.module.css";

/*
 * Press v3 — composition layer.
 *
 * Renders the 11 spreads in order:
 *   1. Masthead          — full-width header
 *   2. Lead story        — bio, drop cap, 64ch single column
 *   3. Featured work     — full-bleed photo + overlay caption
 *   4. The index         — 3-col scannable (exp/edu/skills)
 *   5. Career notes      — conditional 2-col (only if substantial descriptions)
 *   6. More work         — project grid (remaining projects)
 *   7. By the numbers    — GitHub + LeetCode paired columns
 *   8. Competitive       — full-width Codeforces with rating chart
 *   9. The wire          — writing + ML + links consolidated
 *  10. Documents         — resume + uploaded files with inline preview
 *  11. Colophon          — contributor line + Pofolio credit
 *
 * Each spread wraps in ScrollReveal so it fades-up + 8px-translates as it
 * enters the viewport (respecting prefers-reduced-motion).
 *
 * Print: Grain unmounted via `isPrinting` so the SVG feTurbulence filter
 * doesn't crush print-engine pagination.
 */

export function Press({ data }: { data: LayoutData }) {
  // Unmount the Grain SVG during print. feTurbulence creates a GPU
  // compositing layer that Chrome was re-rasterizing on every page break;
  // pulling the SVG from the DOM during print lets pagination settle.
  const [isPrinting, setIsPrinting] = useState(false);
  useEffect(() => {
    const onBefore = () => setIsPrinting(true);
    const onAfter = () => setIsPrinting(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  // Pick the featured project — first project with a hero image, otherwise
  // The featured project is whichever one the user explicitly marked as
  // featured in the editor. If none is marked, the Featured Work spread
  // is skipped and ALL projects go into the More Work spread. This honors
  // the user's intent — no "automatic featuring" of arbitrary projects.
  const featuredProject = data.projects.find((p) => p.featured);
  const remainingProjects = featuredProject
    ? data.projects.filter((p) => p.id !== featuredProject.id)
    : data.projects;

  return (
    <div className={styles.root}>
      {!isPrinting && <Grain />}

      <main className={styles.page}>
        {/* Spread 1 — Masthead. Not scroll-revealed; it's above the fold and
            should be visible immediately on page load. */}
        <Masthead data={data} />

        {/* Spread 2 — Lead story */}
        {data.bio && (
          <ScrollReveal as="section" className={styles.spread}>
            <LeadStorySpread data={data} />
          </ScrollReveal>
        )}

        {/* Spread 3 — Featured work. Renders whenever the user marked a
            project as featured. If it has a hero image, gets the full-bleed
            photograph treatment; otherwise just renders title + lede +
            metadata + gallery (if any other images). */}
        {featuredProject && (
          <ScrollReveal as="section" className={styles.spread}>
            <FeaturedWorkSpread project={featuredProject} />
          </ScrollReveal>
        )}

        {/* Spread 4 — The Index (3-col scannable) */}
        <ScrollReveal as="section" className={styles.spread}>
          <IndexSpread data={data} />
        </ScrollReveal>

        {/* Spread 5 — Career notes (conditional, renders only if there's
            substantial long-form description data) */}
        <ScrollReveal as="section" className={styles.spread}>
          <CareerNotesSpread data={data} />
        </ScrollReveal>

        {/* Spread 6 — More work (clickable cards that expand on click).
            If we featured a project, this is the rest; if not, this is
            all projects. */}
        {remainingProjects.length > 0 && (
          <ScrollReveal as="section" className={styles.spread}>
            <MoreWorkSpread
              projects={remainingProjects}
              startIndex={featuredProject ? 2 : 1}
            />
          </ScrollReveal>
        )}

        {/* Spread 7 — By the numbers */}
        <ScrollReveal as="section" className={styles.spread}>
          <ByNumbersSpread data={data} />
        </ScrollReveal>

        {/* Spread 8 — Competitive (Codeforces full-width) */}
        <ScrollReveal as="section" className={styles.spread}>
          <CompetitiveSpread data={data} />
        </ScrollReveal>

        {/* Spreads 9-11 — Writing / Machine Learning / Elsewhere.
            Numbered dynamically: each only renders if its data exists, so
            we compute the running roman numeral as we go. Spreads 1-8 used
            I-VIII, so we continue from IX. */}
        {(() => {
          const ROMAN = [
            "I", "II", "III", "IV", "V", "VI", "VII", "VIII",
            "IX", "X", "XI", "XII", "XIII", "XIV",
          ];
          // Start at IX (index 8) — spreads I-VIII are already used above.
          let n = 8;
          const blocks: React.ReactNode[] = [];
          if (data.devto?.data && data.devto.data.articles.length > 0) {
            blocks.push(
              <ScrollReveal
                key="writing"
                as="section"
                className={styles.spread}
              >
                <WritingSpread data={data} num={ROMAN[n++]} />
              </ScrollReveal>,
            );
          }
          if (
            data.huggingface?.data &&
            data.huggingface.data.items.length > 0
          ) {
            blocks.push(
              <ScrollReveal
                key="ml"
                as="section"
                className={styles.spread}
              >
                <MachineLearningSpread data={data} num={ROMAN[n++]} />
              </ScrollReveal>,
            );
          }
          if (data.customLinks.length > 0) {
            blocks.push(
              <ScrollReveal
                key="elsewhere"
                as="section"
                className={styles.spread}
              >
                <ElsewhereSpread data={data} num={ROMAN[n++]} />
              </ScrollReveal>,
            );
          }
          return blocks;
        })()}

        {/* Documents */}
        <ScrollReveal as="section" className={styles.spread}>
          <DocumentsSpread data={data} />
        </ScrollReveal>

        {/* Contributor line — between content and colophon. Same "where to
            find you" treatment as a magazine's contributor credits page. */}
        <ContributorLine data={data} />

        {/* Spread 11 — Colophon */}
        <footer className={styles.colophon}>
          <div className={styles.colophonLead}>
            Typeset, edited &amp; published with <em>Pofolio</em>.
          </div>
          <Link href="/" className={styles.colophonCta}>
            Make your own ↗
          </Link>
        </footer>
      </main>
    </div>
  );
}