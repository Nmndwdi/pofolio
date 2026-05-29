import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGitHubData } from "@/lib/integrations/github";

/*
 * GET /api/integrations/github/check?username=foo
 *
 * Lightweight existence check used by the editor for inline validation.
 * Internally calls our cached fetcher — so a successful check primes the
 * cache for the public page render, no extra API calls there.
 *
 * Auth-required to prevent abuse (anonymous users hammering this would
 * burn through GitHub rate limit).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ status: "invalid" });
  }
  // Mirror GitHub's own rules — letters, digits, hyphens, no leading hyphen,
  // 1-39 chars. Avoids hitting their API for obviously bad input.
  if (!/^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/.test(username)) {
    return NextResponse.json({ status: "invalid" });
  }

  const result = await getGitHubData(username);
  if (!result) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json({
    status: "ok",
    user: {
      login: result.data.user.login,
      name: result.data.user.name,
      publicRepos: result.data.user.publicRepos,
    },
  });
}
