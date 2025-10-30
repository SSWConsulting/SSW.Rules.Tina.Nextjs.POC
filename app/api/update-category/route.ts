import client from "@/tina/__generated__/client";
import { type NextRequest, NextResponse } from "next/server";
import { TinaGraphQLClient } from "@/utils/tina/tina-graphql-client";
import { addARuleToTheCategory } from "./add-a-rule-to-the-category";


const isDev = process.env.NODE_ENV === "development";

// Checks whether a rule with the given URI already exists in the provided
// category query result returned by `categoryWithRulesQuery`.
function ruleExistsByUriInCategory(result: unknown, targetUri: string): boolean {
  try {
    const category: any = (result as any)?.data?.category;
    const indexItems: any[] | undefined = category?.index;
    if (!Array.isArray(indexItems)) return false;

    return indexItems.some((item: any) => item?.rule?.uri === targetUri);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categories, ruleUri } = await request.json();
    const authHeader = request.headers.get("authorization");

    if (!isDev && (!authHeader || !authHeader.startsWith("Bearer "))) {
      return NextResponse.json(
        { error: "Missing Authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader?.replace("Bearer ", "");

    if (!Array.isArray(categories) || !ruleUri) {
      return NextResponse.json(
        { error: "Invalid data format - expected categories array and rule" },
        { status: 400 }
      );
    }

    const allCreatedFiles: string[] = [];
    const allSkippedFiles: string[] = [];
    for (const category of categories) {
        try {
          const rawPath =
            typeof category === "string"
              ? category
              : typeof category?.category === "string"
              ? category.category
              : "";


          // Normalize to Tina's expected relativePath: relative to `categories/` and must end with .mdx
          let relativePath = rawPath
            .replace(/^content\//, "")
            .replace(/^categories\//, "");
          if (!relativePath.endsWith(".mdx")) relativePath = `${relativePath}.mdx`;

          const res = await client.queries.categoryWithRulesQuery({
            relativePath,
          });
          const exists = ruleExistsByUriInCategory(res, ruleUri);
          console.log(
            "Category data for",
            relativePath,
            "- rule exists with URI?",
            exists
          );

          if (!exists) {
            {
              const tgc = new TinaGraphQLClient(token || "");

              const result = await addARuleToTheCategory(category, ruleUri, relativePath, tgc);
              if (result.success) {
                allCreatedFiles.push(relativePath);
              } else {
                allSkippedFiles.push(relativePath);
              }
            }
          } else {
          }

        } catch (e) {
          console.error("Error fetching category data for", category, e);
        }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${categories.length} categories`,
      totalFilesCreated: allCreatedFiles.length,
      createdFiles: allCreatedFiles,
      skippedFiles: allSkippedFiles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process navigation API groups",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
