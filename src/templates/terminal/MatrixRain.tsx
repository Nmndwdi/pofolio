"use client";

import { useEffect, useRef } from "react";
import styles from "./terminal.module.css";

/*
 * Matrix rain — the canonical "falling characters" effect.
 *
 * Why canvas instead of CSS/SVG:
 *   - 100+ trailing columns × 30 chars × 60fps = millions of paint ops.
 *     Canvas is purpose-built for this; CSS would jank.
 *   - Single canvas means single composite layer, no layout thrash.
 *
 * Color is read from the parent's --t-accent CSS variable so this matches
 * whichever terminal theme is active (green / amber / blue).
 *
 * Respects prefers-reduced-motion — falls back to static glyphs (no animation)
 * when the user has motion sensitivity preferences set.
 */

interface Props {
  enabled: boolean;
}

export function MatrixRain({ enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dropsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // ─── Resize + DPR handling ──────────────────────────────────────────
    // Canvas pixel-perfect requires sizing the bitmap to viewport*DPR while
    // keeping CSS size at viewport size. Re-run on resize.
    const fontSize = 14;
    let columns = 0;
    let drops: number[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      ctx.font = `${fontSize}px var(--t-font-mono), monospace`;
      ctx.textBaseline = "top";
      columns = Math.ceil(w / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.random() * -50);
      dropsRef.current = drops;
    };
    resize();

    // Read the accent color once at start; if theme changes, this stays
    // stale until next mount. Acceptable for a background effect.
    const accent = getComputedStyle(canvas)
      .getPropertyValue("--t-accent")
      .trim() || "#00ff66";

    // Glyph pool — Katakana + a few latin/symbols. Real Matrix uses Japanese
    // half-width kana exclusively but a small mix keeps it visually richer.
    const GLYPHS =
      "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789=+-*/<>{};:";

    const draw = () => {
      // Trailing-fade effect: paint translucent black over everything every
      // frame. Trail length = how slowly that fade compounds (lower alpha
      // = longer trail).
      ctx.fillStyle = "rgba(10, 10, 10, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = accent;
      for (let i = 0; i < columns; i++) {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(ch, x, y);

        // Reset some drops randomly when they pass the screen — keeps the
        // staggered look. Higher threshold (0.975) = sparser resets.
        if (y > window.innerHeight && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 1;
      }

      if (!reduceMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    if (reduceMotion) {
      // Static snapshot only, no animation.
      ctx.fillStyle = "rgba(10, 10, 10, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = accent;
      for (let i = 0; i < columns; i++) {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        ctx.fillText(ch, i * fontSize, Math.random() * window.innerHeight);
      }
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className={styles.matrixCanvas} />;
}