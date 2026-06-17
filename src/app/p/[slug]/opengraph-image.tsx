import { ImageResponse } from "next/og";

/*
 * Open Graph image for a specific portfolio.
 *
 * Visited automatically by Twitter/WhatsApp/LinkedIn/etc. when someone shares
 * a portfolio URL. Returns a 1200×630 PNG with the user's name, headline,
 * and avatar.
 *
 * Edge runtime + fetch: we can't import Mongoose here, so we fetch the
 * minimal data via our own /api/public/[slug] endpoint. Same Vercel
 * deployment, same region, internal request — adds a few ms and is the
 * cleanest separation between the Edge OG layer and Node-only DB layer.
 *
 * If the profile doesn't exist (404 from our API) we return a generic
 * "not found" card rather than letting Next throw — share platforms
 * should still get a valid image.
 */

export const runtime = "edge";
export const alt = "Pofolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface PublicProfileResponse {
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Next 16: params is a Promise.
  const { slug } = await params;
  // Build absolute URL because Edge runtime fetch needs one.
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://pofoliox.vercel.app/";

  let profile: PublicProfileResponse | null = null;
  try {
    const res = await fetch(
      `${base}/api/public/${encodeURIComponent(slug)}`,
      // OG generation is cache-friendly: platforms re-fetch periodically.
      // 5-minute revalidate is plenty.
      { next: { revalidate: 300 } },
    );
    if (res.ok) profile = (await res.json()) as PublicProfileResponse;
  } catch {
    // fall through to "not found" rendering
  }

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#faf6ee",
            color: "#1a1f2e",
            fontFamily: "serif",
            fontSize: 56,
          }}
        >
          Profile not found · Pofolio
        </div>
      ),
      { ...size },
    );
  }

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
        {/* Top: brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            color: "rgba(26,31,46,0.7)",
          }}
        >
          <span>Pofolio</span>
          <span style={{ color: "#a4361f", fontWeight: 700 }}>.</span>
          <span style={{ marginLeft: 12, fontFamily: "monospace", fontSize: 24 }}>
            /p/{slug}
          </span>
        </div>

        {/* Middle: avatar + name + headline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            paddingTop: 20,
            paddingBottom: 20,
          }}
        >
          {profile.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              width={160}
              height={160}
              style={{
                borderRadius: 9999,
                objectFit: "cover",
                border: "2px solid rgba(26,31,46,0.1)",
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxWidth: profile.avatarUrl ? 760 : 1000,
            }}
          >
            <div
              style={{
                fontSize: profile.displayName.length > 22 ? 76 : 96,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {profile.displayName}
            </div>
            {profile.headline && (
              <div
                style={{
                  fontSize: 28,
                  color: "rgba(26,31,46,0.7)",
                  lineHeight: 1.35,
                  fontStyle: "italic",
                }}
              >
                {profile.headline}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: tag */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(26,31,46,0.55)",
            fontFamily: "monospace",
          }}
        >
          a live portfolio · pofolio.live
        </div>
      </div>
    ),
    { ...size },
  );
}
