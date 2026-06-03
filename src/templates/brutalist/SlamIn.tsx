"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./brutalist.module.css";

/*
 * SlamIn — brutalist-style scroll reveal. Section enters by sliding in
 * horizontally with a hard cubic-bezier curve that overshoots slightly and
 * settles — like a poster being slapped onto the page.
 *
 * Direction alternates left/right based on the `from` prop (callers can pass
 * "left" or "right", or omit for the default "left"). The brutalist Sections
 * component decides per-section to create rhythm — odd sections from the
 * left, even from the right.
 *
 * Implementation: IntersectionObserver with a generous rootMargin so the
 * slide-in starts BEFORE the element fully scrolls into view, ensuring the
 * animation completes by the time the reader's eye lands on it.
 *
 * Respects prefers-reduced-motion (renders in final position with no slide).
 *
 * SSR-safe: initial render has elements in their final visible state;
 * client effect briefly hides them, then the IO triggers the reveal.
 */

interface Props {
  children: ReactNode;
  /** Side the element enters from. Default: left. */
  from?: "left" | "right";
  /** Delay in ms before the reveal fires (for staggered children). */
  delay?: number;
  /** Tag — defaults to div, pass "section"/"article" for semantics. */
  as?: "div" | "section" | "article" | "header" | "footer";
  className?: string;
  id?: string;
}

export function SlamIn({
  children,
  from = "left",
  delay = 0,
  as = "div",
  className = "",
  id,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  // Start visible so SSR matches client; we'll briefly hide on mount.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    setHidden(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          if (delay > 0) {
            window.setTimeout(() => setHidden(false), delay);
          } else {
            setHidden(false);
          }
          observer.disconnect();
        }
      },
      {
        // Generous rootMargin so the slide starts before fully in view.
        rootMargin: "0px 0px -140px 0px",
        threshold: 0.01,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const Tag = as;
  const classes = [
    styles.slam,
    hidden ? (from === "right" ? styles.slamHiddenRight : styles.slamHiddenLeft) : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // @ts-expect-error — TS doesn't know `as` constrains element types.
    <Tag ref={ref} id={id} className={classes}>
      {children}
    </Tag>
  );
}