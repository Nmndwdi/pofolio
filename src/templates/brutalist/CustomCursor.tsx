"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./brutalist.module.css";

/*
 * Custom block cursor — the brutalist signature.
 *
 * A 24px black square follows the pointer (mix-blend-mode: difference makes
 * it auto-invert against the background — black on white, white on black).
 * Over interactive elements it inflates to 56px with a spring ease.
 *
 * Implementation notes:
 *   - Position via translate3d for GPU acceleration. Setting `top/left`
 *     would trigger layout on every move; transform stays on the compositor.
 *   - Event delegation on document — we don't need per-element listeners.
 *     Walk up from event.target until we find <a>, <button>, [data-cursor].
 *   - Hidden on touch via CSS (@media (hover: none)) — the cursor only
 *     makes sense with a hovering pointer.
 *   - Hides itself for ~80ms at mount; many users move the mouse before
 *     React mounts, and we don't want a jarring "spawn at 0,0" flash.
 */

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"default" | "link" | "hidden">("hidden");

  useEffect(() => {
    // Reveal after first move, so the cursor doesn't flash at origin.
    let revealed = false;

    const onMove = (e: PointerEvent) => {
      const el = cursorRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      if (!revealed) {
        revealed = true;
        setState("default");
      }

      // Walk up from the target to find the nearest interactive ancestor.
      // Using `closest()` is faster than a manual loop and handles SVG too.
      const target = e.target as Element | null;
      const interactive =
        target?.closest?.("a, button, [data-cursor='hover']") ?? null;
      setState((prev) => {
        const next = interactive ? "link" : "default";
        return next === prev ? prev : next;
      });
    };

    const onLeave = () => setState("hidden");

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={styles.cursor}
      data-state={state}
      aria-hidden
    />
  );
}