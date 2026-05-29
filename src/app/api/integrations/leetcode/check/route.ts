import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLeetCodeData } from "@/lib/integrations/leetcode";

/*
 * GET /api/integrations/leetcode/check?username=foo
 *
 * Auth-required. LeetCode usernames are alphanumeric + underscore + hyphen,
 * 1–25 chars. We're lenient on min length here because some legitimate
 * users have short handles.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ status: "invalid" });

  if (!/^[a-zA-Z0-9_-]{1,25}$/.test(username)) {
    return NextResponse.json({ status: "invalid" });
  }

  const result = await getLeetCodeData(username);
  if (!result) return NextResponse.json({ status: "not_found" });

  return NextResponse.json({
    status: "ok",
    user: {
      username: result.data.username,
      totalSolved: result.data.totalSolved,
    },
  });
}
