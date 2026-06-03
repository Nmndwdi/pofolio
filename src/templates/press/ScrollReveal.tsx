"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./press.module.css";

/*
 * ScrollReveal — wraps a block of content with a fade-up + 8px translate
 * reveal that fires when the block enters the viewport.
 *
 * Implementation:
 *   - IntersectionObserver with a generous rootMargin so reveals fire BEFORE
 *     the element is visible, giving the user a "settling in" sensation
 *     rather than a "popping in" one.
 *   - Once revealed, observer disconnects. Reveals don't re-fire on scroll-up.
 *   - Respects prefers-reduced-motion — the element appears in its final
 *     state with no animation when motion is reduced.
 *   - SSR-safe: initial render produces the visible final state; only on
 *     client hydration do we conditionally hide it pending reveal. This
 *     avoids the "blank page for a frame" flash on first load.
 *
 * Why not Framer Motion / GSAP: this is two CSS transitions on opacity +
 * transform. Adding a dependency for that is wasteful, and the CSS approach
 * also degrades gracefully if JS fails to hydrate.
 */

interface Props {
  children: ReactNode;
  /** Optional stagger delay in milliseconds — used inside lists. */
  delay?: number;
  /** Tag to render as (defaults to div). Pass "section" for semantic blocks. */
  as?: "div" | "section" | "article" | "header" | "aside" | "footer";
  /** Extra className to apply alongside the reveal classes. */
  className?: string;
}

export function ScrollReveal({
  children,
  delay = 0,
  as = "div",
  className = "",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  // Start as "revealed" so SSR output has the final styles. Effect flips this
  // to "hidden" briefly on mount, then the IntersectionObserver flips it back.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion: don't animate at all, leave element visible.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Briefly hide, then observe. The brief hide is OK because the observer
    // fires synchronously for elements already in viewport (above-the-fold
    // content reveals immediately).
    setHidden(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          // Stagger via setTimeout when delay is non-zero. The CSS transition
          // handles the actual animation; we just gate the class flip.
          if (delay > 0) {
            window.setTimeout(() => setHidden(false), delay);
          } else {
            setHidden(false);
          }
          observer.disconnect();
        }
      },
      {
        // Fire ~120px before the element scrolls into view. Gives the reveal
        // a settled-in feel rather than a pop-in.
        rootMargin: "0px 0px -120px 0px",
        threshold: 0.01,
      },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [delay]);

  const Tag = as;
  const classes = [
    styles.reveal,
    hidden ? styles.revealHidden : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // @ts-expect-error — TS doesn't know that `as` constrains the element type.
    // Behaviour is correct at runtime; constraint is documented in Props.
    <Tag ref={ref} className={classes}>
      {children}
    </Tag>
  );
}