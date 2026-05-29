"use client";

import { useEffect, useState } from "react";

/*
 * Resolve theme CSS variables (like --p-fg) to concrete color strings.
 *
 * Why this exists: Recharts renders to SVG and captures color props at draw
 * time. Strings like "hsl(var(--p-fg))" sometimes don't get re-evaluated
 * inside Recharts internals, so the line ends up rendered with an unparsed
 * literal (effectively transparent or black depending on browser).
 *
 * This hook mounts a hidden probe div, reads `getComputedStyle` to get the
 * raw HSL values, wraps them in `hsl(...)`, and returns ready-to-use color
 * strings.
 *
 * Client-only; returns null on first render and the resolved palette after
 * mount. Callers should fall back to a safe default until then.
 */

export interface ThemePalette {
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  border: string;
  bg: string;
  surface2: string;
}

export function useThemeColors(): ThemePalette | null {
  const [palette, setPalette] = useState<ThemePalette | null>(null);

  useEffect(() => {
    // Probe element inherits theme tokens from its parent (the .theme-* wrapper).
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.opacity = "0";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);

    const get = (name: string): string => {
      const raw = getComputedStyle(probe).getPropertyValue(name).trim();
      return raw ? `hsl(${raw})` : "#000";
    };

    setPalette({
      fg: get("--p-fg"),
      fgMuted: get("--p-fg-muted"),
      fgSubtle: get("--p-fg-subtle"),
      border: get("--p-border"),
      bg: get("--p-bg"),
      surface2: get("--p-surface-2"),
    });

    document.body.removeChild(probe);
  }, []);

  return palette;
}
