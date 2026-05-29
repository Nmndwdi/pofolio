import { ImageResponse } from "next/og";

/*
 * Auto-generated Open Graph image for the landing page.
 *
 * When someone shares pofolio.vercel.app on Twitter, WhatsApp, LinkedIn, etc.
 * the platform requests this URL and embeds the result as the preview card.
 *
 * Constraints:
 *   - This runs on the Edge runtime; no Node APIs, no Mongoose. Just JSX.
 *   - Tailwind classes don't work here — we use inline style. (Next supports
 *     a `tw=` prop for Tailwind in some versions, but it's flaky; staying
 *     explicit avoids weeks-later "why did the image break.")
 *   - 1200×630 is the de-facto standard size; smaller looks blurry on Twitter,
 *     larger gets cropped on LinkedIn.
 */

export const runtime = "edge";
export const alt = "Pofolio — your portfolio, always live.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#faf6ee",
          padding: "60px 80px",
          color: "#1a1f2e",
          fontFamily: "serif",
        }}
      >
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 32 }}>
          <span style={{ fontWeight: 400 }}>Pofolio</span>
          <span style={{ color: "#a4361f", fontWeight: 700 }}>.</span>
        </div>

        {/* Headline — central */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            paddingTop: 40,
            paddingBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            Your portfolio,{" "}
            <span style={{ color: "#a4361f", fontStyle: "italic" }}>
              always live.
            </span>
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(26,31,46,0.7)",
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            One short URL. GitHub stats, LeetCode rank, and your work — current
            without you doing anything.
          </div>
        </div>

        {/* Bottom row: specimen URL + CTA-ish text */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              padding: "10px 18px",
              backgroundColor: "#f3eddf",
              borderRadius: 8,
              color: "rgba(26,31,46,0.85)",
            }}
          >
            pofolio.live/p/yourname
          </div>
          <div style={{ color: "rgba(26,31,46,0.55)" }}>
            for students, devs, and the soon-to-be-hired
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
