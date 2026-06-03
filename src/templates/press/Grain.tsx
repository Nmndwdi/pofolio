import styles from "./press.module.css";

/*
 * Grain overlay — fixed-position SVG noise above page content.
 *
 * Why SVG instead of a PNG/CSS pattern:
 *   - Crisp at any DPR without bundling a big image asset
 *   - One-time render (filters are GPU-accelerated, no re-paint cost)
 *   - feTurbulence gives us a continuous pseudo-random noise that doesn't
 *     tile visibly the way a PNG noise texture would
 *
 * Parameters tuned for "newsprint" feel:
 *   - baseFrequency: 0.85 → fine grain, not blotchy
 *   - numOctaves: 2 → just enough complexity to avoid pattern repetition
 *   - feColorMatrix → push to dark warm-grey, then opacity does the rest
 *     via CSS in the module
 */

export function Grain() {
  return (
    <svg
      className={styles.grain}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      // Cover the viewport regardless of size — preserveAspectRatio:none lets
      // the noise stretch without changing its character (noise looks the
      // same scaled up or down).
      preserveAspectRatio="none"
    >
      <filter id="press-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="2"
          stitchTiles="stitch"
        />
        {/*
         * feColorMatrix: kill RGB channels (zero them out) so only alpha
         * varies — produces a pure grayscale grain with no color cast.
         * The 0.6 in the alpha row's last column boosts opacity slightly
         * above the underlying noise's natural alpha distribution.
         */}
        <feColorMatrix
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0.6 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#press-noise)" />
    </svg>
  );
}