import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./press.module.css";

/*
 * Masthead — Press v3 Spread #1.
 *
 * Visual structure:
 *   ─────── TOP RIBBON (full-width hairline) ───────
 *   POFOLIO · VOL.I · ISSUE №01            · DATE ·
 *
 *   [avatar]
 *
 *   ┌──────────────────────────────┐  ┌────────────┐
 *   │                              │  │ ROLE       │
 *   │   NAME (huge serif italic)   │  │ value      │
 *   │                              │  │ STUDIED    │
 *   └──────────────────────────────┘  │ value      │
 *                                     │ BASED IN   │
 *                                     │ value      │
 *                                     └────────────┘
 *
 *   ─────────────────────────────
 *   "The deck — headline statement set
 *    italic with hanging quotes."
 *
 * No floating kinetic word — the layout speaks for itself.
 */

export function Masthead({ data }: { data: LayoutData }) {
  // Edition number derived from slug hash so it's stable per portfolio.
  const editionNum = (() => {
    if (!data.slug) return "I";
    let h = 0;
    for (let i = 0; i < data.slug.length; i++) {
      h = (h * 31 + data.slug.charCodeAt(i)) | 0;
    }
    const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return ROMAN[Math.abs(h) % ROMAN.length];
  })();

  // Today's date for the ribbon. en-US locale to avoid SSR hydration mismatch
  // (server in IST returned a different format than the client locale).
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Byline stack — show whichever role/education/location values we have.
  // Each row only renders if its value is present.
  const bylines: Array<{ label: string; value: React.ReactNode }> = [];
  if (data.experience[0]?.role) {
    bylines.push({
      label: "Role",
      value: (
        <>
          {data.experience[0].role}
          {data.experience[0].company && (
            <span style={{ color: "var(--press-muted)" }}>
              {" "}at {data.experience[0].company}
            </span>
          )}
        </>
      ),
    });
  }
  if (data.education[0]?.institution) {
    bylines.push({
      label: "Studied",
      value: data.education[0].institution,
    });
  }
  if (data.socials.website) {
    bylines.push({
      label: "Online",
      value: (() => {
        try {
          return new URL(data.socials.website).host.replace(/^www\./, "");
        } catch {
          return data.socials.website;
        }
      })(),
    });
  }

  return (
    <header className={styles.masthead}>
      <div className={styles.topRibbon}>
        <span>Pofolio · Vol. {editionNum} · Issue №01</span>
        <span>{today}</span>
      </div>

      {data.avatarCloudinaryId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(data.avatarCloudinaryId, {
            width: 240,
            height: 240,
            crop: "fill",
          })}
          alt={data.displayName}
          className={styles.mastheadAvatar}
          loading="eager"
        />
      )}

      <div className={styles.headliner}>
        <h1 className={styles.mastheadName}>{data.displayName}</h1>

        {bylines.length > 0 && (
          <div className={styles.bylineStack}>
            {bylines.map((b) => (
              <div key={b.label} className={styles.bylineRow}>
                <span className={styles.bylineLabel}>{b.label}</span>
                <span className={styles.bylineValue}>{b.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.headline && (
        <p className={styles.deck}>
          &ldquo;{data.headline}&rdquo;
        </p>
      )}
    </header>
  );
}