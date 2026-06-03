"use client";

import { useMemo } from "react";
import type { LayoutData } from "@/components/layouts/types";
import { deriveUrl } from "@/lib/cloudinary-url";
import styles from "./brutalist.module.css";

/*
 * Hero — the page's headline punch.
 *
 * The name renders at clamp(64px, 16vw, 240px) — actually massive on
 * desktop, still legible on phones. Letter-spacing is tightened (-0.04em)
 * because Archivo Black at that scale has visible gaps we want closed.
 *
 * If the user's name is two-or-more words, the LAST word gets the hazard-
 * yellow accent block treatment. Adds visual rhythm without making the
 * user mark anything up. Single-word names get no accent (the whole name
 * is the statement; an accent on the only word would be redundant).
 *
 * The hero meta strip on top is the date + slug + a small "available for
 * hire" indicator (omitted if no email — i.e. the user wants to be
 * contactable). It's the document chrome — like the masthead on a poster.
 */

export function Hero({ data }: { data: LayoutData }) {
  // Split the name so we can accent the last word. For single-word names
  // (Cher, Madonna, Naman) the whole thing renders without accent.
  const { mainName, lastWord } = useMemo(() => {
    const words = data.displayName.trim().split(/\s+/);
    if (words.length <= 1) return { mainName: data.displayName, lastWord: "" };
    return {
      mainName: words.slice(0, -1).join(" "),
      lastWord: words[words.length - 1],
    };
  }, [data.displayName]);

  // Today's date for the masthead. Format: "26.05.26" — European date,
  // dot-separated, mono-spaced. Reads as "publication date".
  const today = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(
      d.getFullYear(),
    ).slice(-2)}`;
  }, []);

  return (
    <header className={styles.hero}>
      <div className={styles.heroMeta}>
        <span>POFOLIO / {data.slug}</span>
        <span>{today}</span>
      </div>

      {/* Avatar — only rendered if the user uploaded one. Brutalist treatment:
          square (no border-radius), hard ink border, offset shadow. Sits
          above the name so it gets first eye-attention. */}
      {data.avatarCloudinaryId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deriveUrl(data.avatarCloudinaryId, {
            width: 320,
            height: 320,
            crop: "fill",
          })}
          alt={data.displayName}
          className={styles.heroAvatar}
          loading="eager"
        />
      )}

      <h1 className={styles.heroName}>
        {lastWord ? (
          <>
            {mainName}
            <br />
            <span className={styles.heroNameAccent}>{lastWord}</span>
          </>
        ) : (
          mainName
        )}
      </h1>

      {data.headline && <p className={styles.heroHeadline}>{data.headline}</p>}
    </header>
  );
}