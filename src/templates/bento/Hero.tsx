"use client";

import { useEffect, useState } from "react";
import type { LayoutData } from "@/components/layouts/types";
import styles from "./bento.module.css";

/*
 * Hero — the only persistent UI on the desktop home state.
 *
 * Shows: avatar + name + headline + a small meta row (local clock +
 * availability dot). Everything else lives inside dock-launched apps.
 *
 * Design intent: a single centered card with breathing room around it.
 * Looks like a clean macOS desktop with one widget — not a wall of tiles.
 */

const cloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ||
  "demo";

function cloudinaryUrl(publicId: string, transform = ""): string {
  const t = transform ? `${transform}/` : "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${t}${publicId}`;
}

export function Hero({ data }: { data: LayoutData }) {
  // Split the displayName so the last name (if any) renders in italic serif.
  // Pattern lifted from the v4 prototype's mixed-style headline treatment —
  // sans-bold first name, serif-italic last name, single h1.
  const nameParts = (data.displayName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  const avatarUrl = data.avatarCloudinaryId
    ? cloudinaryUrl(
        data.avatarCloudinaryId,
        "w_240,h_240,c_fill,g_face,f_auto,q_auto",
      )
    : null;

  // Live clock — refresh every minute (not every second; the hero is
  // a static-feeling card, second-by-second ticking would draw attention
  // away from the name).
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.hero}>
      {avatarUrl && (
        <div className={styles.heroAvatarWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={data.displayName} />
        </div>
      )}
      <h1 className={styles.heroName}>
        {firstName}
        {lastName && (
          <>
            {" "}
            <span className={styles.italic}>{lastName}</span>
          </>
        )}
      </h1>
      {data.headline && <p className={styles.heroHeadline}>{data.headline}</p>}
      <div className={styles.heroMeta}>
        <span>{time}</span>
        <span className={styles.heroMetaDivider} />
        <span className={styles.heroAvailable}>Available</span>
      </div>
    </div>
  );
}