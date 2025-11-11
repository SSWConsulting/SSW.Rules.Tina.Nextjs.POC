import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import client from "@/tina/__generated__/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const first = parseInt(searchParams.get("first") || "50", 10);
    const after = searchParams.get("after") || null;

    const cookieStore = await cookies();
    const branch = cookieStore.get("x-branch")?.value || undefined;

    // Fetch top categories using the Tina client with branch support
    let result;
    if (branch) {
      result = await client.queries.topCategoryWithIndexQuery(
        { first, after },
        {
          fetchOptions: {
            headers: {
              "x-branch": branch,
            },
          },
        }
      );
    } else {
      result = await client.queries.topCategoryWithIndexQuery({ first, after });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching top categories from Tina:", error);
    return NextResponse.json(
      { error: "Failed to fetch top categories", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

