import { createHash } from "crypto";
import { headers } from "next/headers";
import { ScanEvent } from "@/lib/db/models/ScanEvent";

/*
 * Record a page view for a profile.
 *
 * Design goals:
 *   - Privacy-respecting: we never store IPs or full user-agents. The visitor
 *     "fingerprint" is a truncated hash of (IP + UA + date + salt), so it
 *     resets every day and can't be reversed to identify anyone. It exists
 *     only to dedupe repeated views by the same person on the same day.
 *   - Non-blocking: this is called fire-and-forget from the public page. It
 *     must never slow the render or throw into it — all errors are swallowed.
 *   - Bot-aware: obvious crawlers are classified as "bot" so the owner's
 *     counts reflect real humans.
 *
 * "View" semantics: one unique (visitor, profile, day) tuple = one view. A
 * visitor refreshing 10 times in a day counts once. This matches what a
 * portfolio owner intuitively means by "how many people viewed my page".
 */

function classifyDevice(ua: string): "mobile" | "desktop" | "bot" | "unknown" {
  const u = ua.toLowerCase();
  if (!u) return "unknown";
  if (/bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview/.test(u))
    return "bot";
  if (/mobile|android|iphone|ipad|ipod/.test(u)) return "mobile";
  return "desktop";
}

export async function recordView(
  profileId: string,
  opts: { fromQR: boolean },
): Promise<void> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    const device = classifyDevice(ua);

    // Don't record bots in the owner's view count — they aren't "people".
    if (device === "bot") return;

    // Visitor fingerprint: hash(IP + UA + UTC date + salt), truncated.
    // Including the date means the same visitor on a new day is a new view.
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      "unknown";
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const salt = process.env.AUTH_SECRET ?? "pofolio";
    const fingerprint = createHash("sha256")
      .update(`${ip}|${ua}|${day}|${salt}`)
      .digest("hex")
      .slice(0, 16);

    const referrer = h.get("referer") ?? undefined;
    const country = h.get("x-vercel-ip-country") ?? undefined;

    // Dedupe: one view per (profile, fingerprint) per day. We encode the day
    // into the fingerprint already, so an upsert on (profileId, fingerprint)
    // naturally collapses same-day repeats into one document.
    await ScanEvent.updateOne(
      { profileId, visitorFingerprint: fingerprint },
      {
        $setOnInsert: {
          profileId,
          visitorFingerprint: fingerprint,
          referrer: referrer?.slice(0, 500),
          deviceCategory: device,
          country: country?.slice(0, 2),
          fromQR: opts.fromQR,
          at: new Date(),
        },
      },
      { upsert: true },
    );
  } catch {
    // Analytics must never break the page. Swallow everything.
  }
}

/*
 * Read view stats for a profile (owner-facing dashboard).
 *
 * Returns the total view count and the last-7-days count. Lightweight by
 * design — a count and a recent window answer "is anyone looking at my
 * page?" without building a full analytics dashboard. Can be extended to a
 * time series / referrer breakdown later if wanted.
 */
export async function getViewStats(profileId: string): Promise<{
  total: number;
  last7Days: number;
}> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, last7Days] = await Promise.all([
      ScanEvent.countDocuments({ profileId }),
      ScanEvent.countDocuments({ profileId, at: { $gte: sevenDaysAgo } }),
    ]);
    return { total, last7Days };
  } catch {
    return { total: 0, last7Days: 0 };
  }
}
