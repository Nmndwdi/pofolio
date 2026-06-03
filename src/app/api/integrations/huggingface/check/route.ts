import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHuggingFaceData } from "@/lib/integrations/huggingface";

/*
 * GET /api/integrations/huggingface/check?username=foo
 *
 * Live validation for a Hugging Face username/org. Returns the same status
 * shape as the other integration check endpoints. Auth-required.
 *
 * HF usernames can include lowercase letters, digits, hyphens; we permit
 * up to 40 chars.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ status: "invalid" });

  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,39}$/.test(username)) {
    return NextResponse.json({ status: "invalid" });
  }

  const result = await getHuggingFaceData(username);
  if (!result) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json({
    status: "ok",
    preview: {
      username: result.data.username,
      totalModels: result.data.totalModels,
      totalDatasets: result.data.totalDatasets,
      totalSpaces: result.data.totalSpaces,
    },
  });
}