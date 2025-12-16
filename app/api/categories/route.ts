import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import client from "@/tina/__generated__/client";
import { getFetchOptions } from "@/utils/tina/get-branch";

// Helper function to fetch main category data for main branch
async function fetchMainCategoryDataMain() {
  return await client.queries.mainCategoryQuery({});
}

// Helper function factory to create branch-specific fetch functions
function createBranchFetchFunction(branch: string) {
  return async () => {
    return await client.queries.mainCategoryQuery({}, await getFetchOptions());
  };
}

// Create main branch cache at module level - this ensures tag revalidation works
const getCachedMainCategoryMain = unstable_cache(fetchMainCategoryDataMain, ["main-category-main"], {
  revalidate: 86400, // Revalidate every 24 hours (86400 seconds)
  tags: ["main-category", "branch-main"],
});

// Store branch-specific caches - created on first use but persist for the module lifetime
// All include "main-category" tag so revalidateTag("main-category") will invalidate them
const branchCacheMap = new Map<string, ReturnType<typeof unstable_cache>>();

function getCachedMainCategoryForBranch(branch: string) {
  // Create cache on first use for this branch
  // This is safe because unstable_cache with the same key returns the same cache
  if (!branchCacheMap.has(branch)) {
    const fetchFn = createBranchFetchFunction(branch);
    const cachedFn = unstable_cache(fetchFn, [`main-category-branch-${branch}`], {
      revalidate: 86400,
      tags: ["main-category", `branch-${branch}`],
    });
    branchCacheMap.set(branch, cachedFn);
  }
  return branchCacheMap.get(branch)!;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const branch = cookieStore.get("x-branch")?.value || undefined;

    // Use the appropriate cached function based on branch
    const result = branch ? await getCachedMainCategoryForBranch(branch)() : await getCachedMainCategoryMain();

    if (!result?.data?.category || result.data.category.__typename !== "CategoryMain") {
      return NextResponse.json({ categories: [] }, { status: 200 });
    }

    // Transform the data to match what CategorySelector expects
    const categories = result.data.category.index || [];
    const items = categories.flatMap((top: any) => {
      const subcats: any[] = top?.top_category?.index?.map((s: any) => s?.category).filter(Boolean) || [];
      return subcats.map((sub: any) => ({
        title: `${top?.top_category?.title || ""} | ${sub?.title?.replace("Rules to Better", "") || ""}`,
        _sys: { relativePath: `${top?.top_category?.uri}/${sub?._sys?.filename}.mdx` },
      }));
    });

    return NextResponse.json({ categories: items }, { status: 200 });
  } catch (e) {
    console.error("Failed to fetch categories:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      {
        categories: [],
        error: "Failed to fetch categories",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
