"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { LayoutData } from "@/components/layouts/types";
import { Cards } from "./Cards";
import { ProjectModal } from "./ProjectModal";
import styles from "./spatial-walk.module.css";

/*
 * SpatialWalk — root component.
 *
 * Layout (z-axis):
 *   0: scrollTrack (tall, invisible — provides scroll height)
 *   1: sceneFixed   (Three.js canvas, fills viewport, pointer-events: none)
 *   2: overlay      (HTML cards on top of canvas, opacity driven by scroll)
 *   1000: ProjectModal (portal-mounted on body when a project is open)
 *
 * Scroll handling:
 *   - One scroll listener computes progress (0..1) from the scrollTrack's
 *     getBoundingClientRect()
 *   - Progress is written to a ref (read by Three.js render loop every
 *     frame — no React re-renders during scroll for the canvas)
 *   - Progress is ALSO set in React state, throttled to ~30 updates/sec,
 *     so the cards' fade animations follow scroll smoothly
 *
 * Track height: 600vh (six viewports). Generous so the walk feels paced —
 * not so much that it requires endless scrolling.
 */

// Three.js needs to load client-only. Dynamic import with ssr: false
// prevents Next from trying to render WebGL on the server (which would
// throw because window is undefined).
const Landscape = dynamic(
  () => import("./Landscape").then((m) => m.Landscape),
  { ssr: false },
);

const TRACK_VH = 600;

export function SpatialWalk({ data }: { data: LayoutData }) {
  const [progress, setProgress] = useState(0);
  const [openProject, setOpenProject] = useState<
    LayoutData["projects"][number] | null
  >(null);
  const [hintVisible, setHintVisible] = useState(true);

  // Ref read by Three.js render loop every frame.
  const progressRef = useRef(0);

  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf: number | null = null;
    let lastState = 0;

    const update = () => {
      raf = null;
      const rect = track.getBoundingClientRect();
      const viewport = window.innerHeight;
      const scrollable = Math.max(1, rect.height - viewport);
      const scrolled = Math.max(0, -rect.top);
      const p = Math.min(1, scrolled / scrollable);

      // Always update the ref — Three.js needs the freshest value
      progressRef.current = p;

      // Throttle React state updates to ~30/sec by only updating when
      // progress has changed meaningfully (>0.003 = 0.3%). This drives
      // card opacity/transform; finer updates aren't visually different.
      if (Math.abs(p - lastState) > 0.003) {
        setProgress(p);
        lastState = p;
      }

      if (p > 0.015 && hintVisible) setHintVisible(false);
    };

    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };

    // Initial sync
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [hintVisible]);

  return (
    <div className={styles.root}>
      {/* The Three.js scene — fixed full-viewport. Loaded client-only. */}
      <Landscape slug={data.slug} scrollProgressRef={progressRef} />

      {/* Tall invisible track that provides scrollable height. */}
      <div
        ref={trackRef}
        className={styles.scrollTrack}
        style={{ height: `${TRACK_VH}vh` }}
      />

      {/* Fixed overlay layer — HUD on top, cards in the middle, hint at
          the bottom. */}
      <div className={styles.overlay}>
        <div className={styles.hud}>
          <div className={styles.hudLeft}>
            <span className={styles.hudDot} />
            <span>{data.displayName}</span>
          </div>
          <div className={styles.hudRight}>
            <span>{Math.round(progress * 100)}%</span>
            <span className={styles.hudProgress}>
              <span
                className={styles.hudProgressFill}
                style={{ width: `${progress * 100}%` }}
              />
            </span>
          </div>
        </div>

        <div className={styles.overlayInner}>
          <Cards
            data={data}
            progress={progress}
            onOpenProject={setOpenProject}
          />
        </div>

        <div
          className={styles.scrollHint}
          data-visible={hintVisible ? "true" : "false"}
        >
          Scroll to walk ↓
        </div>
      </div>

      {/* Portal modal for project detail. */}
      <ProjectModal
        project={openProject}
        onClose={() => setOpenProject(null)}
      />
    </div>
  );
}