import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "@/lib/db/models";

/*
 * GET /api/search?q=<query> — global user search.
 *
 * Searches across public profiles by displayName / slug / headline / bio
 * (weighted via the Profile text index). Returns up to 12 results with the
 * fields needed to render result cards.
 *
 * No auth required — search is public, results only include public profiles.
 *
 * Strategy:
 *  - For short queries (≤2 chars) we use a case-insensitive *prefix* match
 *    on slug + displayName instead of $text, because Mongo's text search
 *    stemmer drops short tokens and would return nothing useful.
 *  - For longer queries we use $text + relevance score, which handles
 *    stemming, tokenization, and ranking for free.
 *  - We always cap at 12 results — anything more is for a future "load more".
 */

const MAX_RESULTS = 12;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  // Guard against pathological queries — the text index handles long queries
  // fine, but we have no reason to accept >200 chars and risk it.
  if (q.length > 200) {
    return NextResponse.json(
      { error: "Query too long" },
      { status: 400 },
    );
  }

  await connectDB();

  const projection = {
    slug: 1,
    displayName: 1,
    headline: 1,
    avatarCloudinaryId: 1,
  } as const;

  // Short queries: prefix-match. Long queries: $text + relevance.
  type ResultDoc = {
    slug: string;
    displayName: string;
    headline?: string;
    avatarCloudinaryId?: string;
  };
  let results: ResultDoc[];
  if (q.length <= 2) {
    // Escape regex metachars in user input.
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`^${safe}`, "i");
    results = (await Profile.find(
      {
        isPublic: true,
        $or: [{ slug: rx }, { displayName: rx }],
      },
      projection,
    )
      .limit(MAX_RESULTS)
      .lean()) as unknown as ResultDoc[];
  } else {
    // Mongo treats unquoted tokens as OR; wrapping in quotes forces phrase
    // search. We keep the unquoted form so multi-word queries like "ml eng"
    // still match someone whose headline is just "ML Engineer".
    results = (await Profile.find(
      { isPublic: true, $text: { $search: q } },
      { ...projection, score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(MAX_RESULTS)
      .lean()) as unknown as ResultDoc[];
  }

  return NextResponse.json({
    results: results.map((p) => ({
      slug: p.slug,
      displayName: p.displayName,
      headline: p.headline ?? "",
      avatarCloudinaryId: p.avatarCloudinaryId ?? "",
    })),
  });
}