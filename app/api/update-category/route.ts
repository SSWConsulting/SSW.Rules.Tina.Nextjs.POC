import client from "@/tina/__generated__/client";
import { type NextRequest, NextResponse } from "next/server";
import { TinaGraphQLClient } from "@/utils/tina/tina-graphql-client";
import { updateTheCategoryRuleList } from "./update-the-category-rule-list"; 
import { categorizeCategories,  ruleExistsByUriInCategory } from "./util";


const isDev = process.env.NODE_ENV === "development";

async function processCategories(categories: Array<string>, ruleUri: string, tgc: TinaGraphQLClient, action: "add" | "delete" = "add"): Promise<{ allCreatedFiles: string[], allSkippedFiles: string[], allDeletedFiles: string[] }> {
    
    const allCreatedFiles: string[] = [];
    const allSkippedFiles: string[] = [];
    const allDeletedFiles: string[] = [];
    for (const category of categories) {
        try {
          const rawPath =
            typeof category === "string"
              ? category
              : typeof category === "string"
              ? category
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
                if (action === "add") {
                  const result = await updateTheCategoryRuleList(ruleUri, relativePath, tgc, action);
                  if (result.success) {
                    allCreatedFiles.push(relativePath);
                  } else {
                    allSkippedFiles.push(relativePath);
                  }
                }
            }
          } else {
             if (action === "delete") {
                console.log("🎗️Deleting rule from category", relativePath, "with rule", ruleUri);
              const result = await updateTheCategoryRuleList(ruleUri, relativePath, tgc, action);
              if (result.success) {
                allDeletedFiles.push(relativePath);
              } else {
                allSkippedFiles.push(relativePath);
              }
            }
          }

        } catch (e) {
          console.error("Error fetching category data for", category, e);
        }
    }
    return { allCreatedFiles, allSkippedFiles, allDeletedFiles };
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

    const currentRule = await client.queries.rulesByUriQuery({
        uris: [ruleUri],
      });

    const ruleNode = currentRule?.data?.ruleConnection?.edges?.[0];
    const rule = ruleNode?.node;
    // Extract category relative paths from the nested structure: categories[].category._sys.relativePath
    const currentRuleCategories = rule?.categories
      ?.map((cat: any) => `categories/${cat?.category?._sys?.relativePath}`)
      .filter((path: string | undefined): path is string => !!path) || [];
    
    // Categorize all categories using the helper function
    const categorizedCategories = categorizeCategories(
      currentRuleCategories,
      categories
    );

    console.log("📊 Category Comparison:", {
      current: currentRuleCategories,
      requested: categories,
      categorized: categorizedCategories,
    });

    // Separate categories by status for easy access
    const categoriesToAdd = categorizedCategories
      .filter((c) => c.status === "add")
      .map((c) => c.category);
    const categoriesNoChange = categorizedCategories
      .filter((c) => c.status === "noChange")
      .map((c) => c.category);
    const categoriesToDelete = categorizedCategories
      .filter((c) => c.status === "delete")
      .map((c) => c.category);

    console.log("📋 Categorized:", {
      toAdd: categoriesToAdd,
      noChange: categoriesNoChange,
      toDelete: categoriesToDelete,
    });

    if (!Array.isArray(categories) || !ruleUri) {
      return NextResponse.json(
        { error: "Invalid data format - expected categories array and rule" },
        { status: 400 }
      );
    }

    const tgc = new TinaGraphQLClient(token || "");

    const addResult = await processCategories(categoriesToAdd, ruleUri, tgc, "add");
    const deleteResult = await processCategories(categoriesToDelete, ruleUri, tgc, "delete");

    const allCreatedFiles = [...addResult.allCreatedFiles, ...deleteResult.allCreatedFiles];
    const allSkippedFiles = [...addResult.allSkippedFiles, ...deleteResult.allSkippedFiles];
    const allDeletedFiles = [...deleteResult.allDeletedFiles];

    return NextResponse.json({
      success: true,
      message: `Processed ${categories.length} categories`,
      totalFilesCreated: allCreatedFiles.length,
      createdFiles: allCreatedFiles,
      skippedFiles: allSkippedFiles,
      deletedFiles: allDeletedFiles,
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


