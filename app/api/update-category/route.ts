import client from "@/tina/__generated__/client";
import { type NextRequest, NextResponse } from "next/server";
import { TinaGraphQLClient } from "@/utils/tina/tina-graphql-client";
import { updateTheCategoryRuleList } from "./update-the-category-rule-list";
import {
  categorizeCategories,
  getRelativePathForCategory,
  getRuleCategories,
  ruleExistsByUriInCategory,
} from "./util";

const isDev = process.env.NODE_ENV === "development";

async function processCategories(
  categories: Array<string>,
  ruleUri: string,
  tgc: TinaGraphQLClient,
  action: "add" | "delete" = "add"
): Promise<{
  AddedCategories: string[];
  DeletedCategories: string[];
  NoChangedCategories: string[];
}> {
  const AddedCategories: string[] = [];
  const DeletedCategories: string[] = [];
  const NoChangedCategories: string[] = [];

  for (const category of categories) {
    try {
      // Normalize to Tina's expected relativePath: relative to `categories/` and must end with .mdx
      const relativePath = getRelativePathForCategory(category);

      const res = await client.queries.categoryWithRulesQuery({
        relativePath,
      });
      const ruleAlreadyExists = ruleExistsByUriInCategory(res, ruleUri);

      if (!ruleAlreadyExists && action === "add") {
        {
          const result = await updateTheCategoryRuleList(
            ruleUri,
            relativePath,
            tgc,
            action
          );
          if (result.success) {
            AddedCategories.push(relativePath);
          } else {
            NoChangedCategories.push(relativePath);
          }
        }
      } else if (ruleAlreadyExists && action === "delete") {
        const result = await updateTheCategoryRuleList(
          ruleUri,
          relativePath,
          tgc,
          action
        );
        if (result.success) {
          DeletedCategories.push(relativePath);
        } else {
          NoChangedCategories.push(relativePath);
        }
      } else {
        NoChangedCategories.push(relativePath);
      }
    } catch (e) {
      console.error("Error fetching category data for", category, e);
    }
  }
  return { AddedCategories, DeletedCategories, NoChangedCategories };
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

    const { rule, currentRuleCategories } = await getRuleCategories(ruleUri);
    // Categorize all categories to determine which ones need to be added, deleted, or no change
    const categorizedCategories = categorizeCategories(
      currentRuleCategories,
      categories
    );

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

    const tgc = new TinaGraphQLClient(token || "");

    const categoriesAddedResult = await processCategories(
      categoriesToAdd,
      ruleUri,
      tgc,
      "add"
    );
    const categoriesDeletedResult = await processCategories(
      categoriesToDelete,
      ruleUri,
      tgc,
      "delete"
    );

    return NextResponse.json({
      success: true,
      message: `Processed categories for rule ${rule?.title}`,
      URI: rule?.uri,
      AddedCategories: [
        ...categoriesAddedResult.AddedCategories,
        ...categoriesDeletedResult.AddedCategories,
      ],
      DeletedCategories: [
        ...categoriesAddedResult.DeletedCategories,
        ...categoriesDeletedResult.DeletedCategories,
      ],
      NoChangedCategories: [
        ...categoriesAddedResult.NoChangedCategories,
        ...categoriesDeletedResult.NoChangedCategories,
        ...categoriesNoChange,
      ],
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
