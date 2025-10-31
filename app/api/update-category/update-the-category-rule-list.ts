import { TinaGraphQLClient } from "@/utils/tina/tina-graphql-client";
import {
  CATEGORY_FULL_QUERY,
  CATEGORY_RULE_PATHS_QUERY,
  RULE_PATH_BY_URI_QUERY,
  UPDATE_CATEGORY_MUTATION,
} from "./constants";

export const updateTheCategoryRuleList = async (
  rule_uri: string,
  relativePath: string,
  tgc: TinaGraphQLClient,
  action: "add" | "delete" = "add"
) => {
  try {
    const categoryRulePathsRes: any = await tgc.request(
      CATEGORY_RULE_PATHS_QUERY,
      { relativePath }
    );

    const existingRulePaths: string[] = (
      categoryRulePathsRes?.category?.index || []
    )
      .map((i: any) => i?.rule?._sys?.relativePath)
      .filter((p: any) => typeof p === "string");

    const rulePathRes: any = await tgc.request(RULE_PATH_BY_URI_QUERY, {
      uris: [rule_uri],
    });

    const rulePath: string | undefined =
      rulePathRes?.ruleConnection?.edges?.[0]?.node?._sys?.relativePath;

    if (!rulePath) {
      console.warn("Could not resolve rule relativePath for uri:", rule_uri);
    } else if (existingRulePaths.includes(rulePath) && action === "add") {
      console.log(
        "Rule path already referenced in category; skipping mutation."
      );
    } else {
      // 3) Fetch full category doc so we preserve existing fields

      const categoryFullRes: any = await tgc.request(CATEGORY_FULL_QUERY, {
        relativePath,
      });
      const currentCategory: any = categoryFullRes?.category ?? {};

      let newIndex: any[] = [];
      
      if (action === "add") {
      // Build new index: keep existing + append new
      newIndex = [
        ...existingRulePaths.map((p: string) => ({
          rule: `public/uploads/rules/${p}`,
        })),
        { rule: `public/uploads/rules/${rulePath}` },
      ];
    } else if (action === "delete") {
        console.log("Deleting rule from category", relativePath, "with rule", rule_uri);
        const rulePathWithUploads = `public/uploads/rules/${rulePath}`;
        console.log("🚀 🎗️ Rule path with uploads", rulePathWithUploads);
      newIndex = existingRulePaths.filter((p: string) => p !== rulePath).map((p: string) => ({
        rule: `public/uploads/rules/${p}`,
      }));

      console.log("🚀 🎗️ New index", newIndex);
      console.log("🚀 🎗️ Existing rule paths", rulePath);
    }

      // Only send defined values to avoid clearing fields with nulls
      const pruneUndefinedAndNull = (obj: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
        );

      const categoryParams = pruneUndefinedAndNull({
        title: currentCategory?.title,
        uri: currentCategory?.uri,
        guid: currentCategory?.guid,
        consulting: currentCategory?.consulting,
        experts: currentCategory?.experts,
        redirects: Array.isArray(currentCategory?.redirects)
          ? currentCategory.redirects.filter(
              (r: unknown) => typeof r === "string"
            )
          : undefined,
        body: currentCategory?.body,
        created: currentCategory?.created,
        createdBy: currentCategory?.createdBy,
        createdByEmail: currentCategory?.createdByEmail,
        lastUpdated: currentCategory?.lastUpdated,
        lastUpdatedBy: currentCategory?.lastUpdatedBy,
        lastUpdatedByEmail: currentCategory?.lastUpdatedByEmail,
        isArchived: currentCategory?.isArchived,
        archivedreason: currentCategory?.archivedreason,
        index: newIndex,
      });

      await tgc.request(UPDATE_CATEGORY_MUTATION, {
        relativePath,
        category: categoryParams,
      });

      console.log("Updated category", relativePath, "with rule", rule_uri);
    }
    return { success: true };
  } catch (error) {
    console.error(
      "Error adding rule to category",
      rule_uri,
      "in category",
      relativePath,
      error
    );
    return { success: false, error: error };
  }
};
