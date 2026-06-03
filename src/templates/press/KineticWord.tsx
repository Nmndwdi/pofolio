"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./press.module.css";

/*
 * KineticWord — single-word component that performs subtle kinetic
 * typography. Two effects:
 *
 *  1. SCROLL: as the page scrolls, the word's italic-slant axis varies
 *     between baseline (vertical) and a slight forward lean (~6°). Tied
 *     to scrollY via requestAnimationFrame so it's smooth on mobile too.
 *
 *  2. HOVER: a CSS-only transform tilt (handled in press.module.css via
 *     `.kineticAccent:hover`). Doesn't need JS — keeps the snappy
 *     pointer-feedback feel without our JS scheduling latency.
 *
 * We restrict the effect to ONE word per masthead — the whole point of
 * editorial kinetic typography is selectivity. If every word breathed,
 * nothing would feel emphasised.
 *
 * Performance: passive scroll listener + rAF throttling, sets a CSS
 * variable on the element instead of writing transforms directly so the
 * paint stays GPU-side.
 */

interface Props {
  children: ReactNode;
}

export function KineticWord({ children }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect motion preferences — kinetic typography is delightful for
    // most but a real accessibility issue for users with vestibular
    // sensitivities.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    let raf: number | null = null;
    let lastY = window.scrollY;

    const update = () => {
      raf = null;
      // Map scrollY to a small rotation in [-3deg, +3deg]. The mapping is
      // deliberately gentle — kinetic shouldn't mean nauseating.
      const scrollProgress = Math.min(1, Math.max(0, lastY / 600));
      const rotation = scrollProgress * 3; // 0 → 3deg as we scroll first ~600px
      el.style.setProperty("--press-kinetic-rotate", `${rotation}deg`);
      // Slight y-translate to enhance the "settling into place" feel.
      el.style.setProperty(
        "--press-kinetic-y",
        `${-scrollProgress * 4}px`,
      );
    };

    const onScroll = () => {
      lastY = window.scrollY;
      if (raf === null) raf = requestAnimationFrame(update);
    };

    // Initial render — make sure we read the current scroll position even
    // if the user navigated mid-scroll (e.g. via a section anchor).
    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span
      ref={ref}
      className={styles.kineticAccent}
      style={{
        // Transform reads two CSS variables that the scroll handler writes
        // to. Default values keep the initial render visually stable
        // before the effect kicks in.
        transform:
          "translateY(var(--press-kinetic-y, 0)) rotate(var(--press-kinetic-rotate, 0))",
      }}
    >
      {children}
    </span>
  );
}