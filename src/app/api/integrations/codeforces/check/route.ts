import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCodeforcesData } from "@/lib/integrations/codeforces";

/*
 * GET /api/integrations/codeforces/check?handle=foo
 * Mirror of the GitHub check route. Auth-required.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const handle = url.searchParams.get("handle")?.trim();
  if (!handle) return NextResponse.json({ status: "invalid" });

  // Codeforces handles: 3-24 chars, letters/digits/underscores/hyphens/dots
  // The platform itself is permissive; we just block obvious garbage.
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(handle)) {
    return NextResponse.json({ status: "invalid" });
  }

  const result = await getCodeforcesData(handle);
  if (!result) return NextResponse.json({ status: "not_found" });

  return NextResponse.json({
    status: "ok",
    user: {
      handle: result.data.user.handle,
      rating: result.data.user.rating,
      rank: result.data.user.rank,
    },
  });
}
