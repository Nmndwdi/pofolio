"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./terminal.module.css";

/*
 * ScrollSection — scroll-mode reveal that fits the terminal aesthetic.
 *
 * Where Press uses a fade-up + 8px translate (editorial settling-in), terminal
 * gets a "phosphor warm-up" effect — section starts with extra accent-color
 * glow, decays to its normal phosphor level as it enters viewport. Mimics
 * an old CRT brightening to display content.
 *
 * Implementation: IntersectionObserver fires once; classes toggle from
 * "warming" to default. CSS handles the actual glow decay via a 600ms
 * transition on text-shadow.
 *
 * Respects prefers-reduced-motion (no effect).
 */

interface Props {
  children: ReactNode;
  title: string;
}

export function ScrollSection({ children, title }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Briefly enter the "warming" state, then watch for viewport entry.
    setWarming(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          // Settle to normal phosphor (drop the extra glow).
          setWarming(false);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -100px 0px",
        threshold: 0.01,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.scrollSection} ${warming ? styles.scrollSectionWarming : ""}`}
    >
      <h2 className={styles.scrollSectionTitle}>{title}</h2>
      <div className={styles.output}>{children}</div>
    </section>
  );
}