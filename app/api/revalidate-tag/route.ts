import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Validate using either bearer token (from Tina CMS) or webhook secret
    const authHeader = req.headers.get("authorization");
    const secret = req.headers.get("x-revalidate-secret");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    // Allow if bearer token is present (Tina CMS auth) or webhook secret matches
    const isAuthenticated = bearerToken || (secret && secret === process.env.TINA_WEBHOOK_SECRET);

    if (!isAuthenticated) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const tag = body?.tag;

    if (!tag || typeof tag !== "string") {
      return NextResponse.json({ error: "Tag is required and must be a string" }, { status: 400 });
    }

    revalidateTag(tag);

    return NextResponse.json({ revalidated: true, tag });
  } catch (err) {
    console.error("Error revalidating tag:", err);
    return NextResponse.json({ message: "Error revalidating tag" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

