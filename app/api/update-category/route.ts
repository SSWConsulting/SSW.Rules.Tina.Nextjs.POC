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

// Normalizes a category path to a consistent format for comparison
function normalizeCategoryPathForComparison(categoryPath: string): string {
  // Remove leading content/ or categories/ if present
  let normalized = categoryPath
    .replace(/^content\//, "")
    .replace(/^categories\//, "");
  
  // Ensure it ends with .mdx
  if (!normalized.endsWith(".mdx")) {
    normalized = `${normalized}.mdx`;
  }
  
  // Return with categories/ prefix for consistency
  return `categories/${normalized}`;
}

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
                  const result = await addARuleToTheCategory(category, ruleUri, relativePath, tgc, action);
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
              const result = await addARuleToTheCategory(category, ruleUri, relativePath, tgc, action);
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

type CategoryStatus = "add" | "noChange" | "delete";

interface CategoryComparison {
  category: string;
  status: CategoryStatus;
}

/**
 * Compares current rule categories with requested categories and categorizes them.
 * @param currentCategories - Array of current category paths from the rule
 * @param requestedCategories - Array of requested category paths (can be strings or objects)
 * @returns Array of CategoryComparison objects with category path and status
 */
function categorizeCategories(
  currentCategories: string[],
  requestedCategories: Array<string | { category?: string }>
): CategoryComparison[] {
  // Normalize requested categories to the same format
  const normalizedRequested = requestedCategories.map((cat) => {
    const rawPath =
      typeof cat === "string"
        ? cat
        : typeof cat?.category === "string"
        ? cat.category
        : "";
    return normalizeCategoryPathForComparison(rawPath);
  });

  // Normalize current categories (they might already have categories/ prefix)
  const normalizedCurrent = currentCategories.map((cat) => {
    // If it already has categories/ prefix, keep it; otherwise normalize it
    if (cat.startsWith("categories/")) {
      return cat;
    }
    return normalizeCategoryPathForComparison(cat);
  });

  // Create a Set for faster lookup
  const currentSet = new Set(normalizedCurrent);
  const requestedSet = new Set(normalizedRequested);

  const result: CategoryComparison[] = [];

  // Find categories to add (in requested but not in current)
  normalizedRequested.forEach((cat) => {
    if (!currentSet.has(cat)) {
      result.push({ category: cat, status: "add" });
    }
  });

  // Find categories with no change (in both lists)
  normalizedRequested.forEach((cat) => {
    if (currentSet.has(cat)) {
      result.push({ category: cat, status: "noChange" });
    }
  });

  // Find categories to delete (in current but not in requested)
  normalizedCurrent.forEach((cat) => {
    if (!requestedSet.has(cat)) {
      result.push({ category: cat, status: "delete" });
    }
  });

  return result;
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


