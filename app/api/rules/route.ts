import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import client from "@/tina/__generated__/client";
import { getFetchOptions } from "@/utils/tina/get-branch";

export const revalidate = 3600; // 60 minutes

export async function GET() {
  try {
    const PAGE_SIZE = 1000; // server-side page size
    let after: string | undefined = undefined;
    let hasNextPage = true;
    const allEdges: any[] = [];

    // Prepare fetch options with branch header if available
    const fetchOptions = await getFetchOptions();

    // Loop over all pages until exhausted
    for (let i = 0; hasNextPage; i++) {
      const res: any = fetchOptions
        ? await (client as any).queries.paginatedRulesQuery(
            {
              first: PAGE_SIZE,
              after,
            },
            fetchOptions
          )
        : await (client as any).queries.paginatedRulesQuery({
            first: PAGE_SIZE,
            after,
          });
      const data = (res?.data ?? res) as any;
      const conn = data?.ruleConnection;
      const edges = Array.isArray(conn?.edges) ? conn.edges : [];
      allEdges.push(...edges);

      hasNextPage = !!conn?.pageInfo?.hasNextPage;
      const nextCursor = conn?.pageInfo?.endCursor ?? undefined;
      if (!hasNextPage || !nextCursor || edges.length === 0) {
        hasNextPage = false;
        break;
      }
      after = nextCursor;
    }

    const items = allEdges
      .map((e: any) => e?.node)
      .filter(Boolean)
      .map((node: any) => ({
        title: node?.title || "",
        uri: node?.uri || "",
        lastUpdated: node.lastUpdated || "",
        _sys: { relativePath: node?._sys?.relativePath || "" },
      }));

    return new NextResponse(JSON.stringify(items), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("[/api/rules] error:", err);
    return NextResponse.json({ message: "Failed to fetch rules" }, { status: 500 });
  }
}
