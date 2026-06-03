import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDevToData } from "@/lib/integrations/devto";

/*
 * GET /api/integrations/devto/check?username=foo
 *
 * Live validation for the dev.to handle. Same shape as the github/codeforces/
 * leetcode check endpoints so the editor's useHandleCheck hook can use them
 * interchangeably. Auth-required.
 *
 * Dev.to usernames are case-insensitive alphanumerics with optional underscores;
 * we permit 1–40 chars to be safe.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ status: "invalid" });

  if (!/^[a-zA-Z0-9_]{1,40}$/.test(username)) {
    return NextResponse.json({ status: "invalid" });
  }

  const result = await getDevToData(username);
  if (!result) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json({
    status: "ok",
    preview: {
      username: result.data.username,
      articleCount: result.data.articles.length,
    },
  });
}