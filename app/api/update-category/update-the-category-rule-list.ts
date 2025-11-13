import { readFile } from "fs/promises";
import matter from "gray-matter";
import { join } from "path";
import { TinaGraphQLClient } from "@/utils/tina/tina-graphql-client";
import { CATEGORY_FULL_QUERY, CATEGORY_FULL_QUERY_NO_INDEX, CATEGORY_RULE_PATHS_QUERY, RULE_PATH_BY_URI_QUERY, UPDATE_CATEGORY_MUTATION } from "./constants";
import {
  CategoryFullQueryResponse,
  CategoryIndexItem,
  CategoryMutationParams,
  CategoryQueryResponse,
  RuleConnectionQueryResponse,
  UpdateResult,
} from "./types";

const RULES_UPLOAD_PATH = "public/uploads/rules/";

/**
 * Extracts rule relative paths from a category query response.
 * Handles cases where rules don't have _sys.relativePath (e.g., newly added rules that don't exist yet).
 * Falls back to extracting the path from the rule string if _sys.relativePath is not available.
 */
function extractExistingRulePaths(categoryResponse: CategoryQueryResponse): string[] {
  const index = categoryResponse?.category?.index ?? [];

  return index
    .map((item) => {
      const ruleValue = item?.rule;

      // Handle case where rule is stored as a string (e.g., "public/uploads/rules/test-v3/rule")
      if (typeof ruleValue === "string") {
        // Extract relative path from "public/uploads/rules/{relativePath}"
        if (ruleValue.startsWith(RULES_UPLOAD_PATH)) {
          return ruleValue.replace(RULES_UPLOAD_PATH, "");
        }
        // If it's already a relative path, return it as is
        return ruleValue;
      }

      // Handle case where rule is an object
      if (ruleValue && typeof ruleValue === "object") {
        // First, try to get the path from _sys.relativePath (for existing rules)
        if (ruleValue._sys?.relativePath) {
          return ruleValue._sys.relativePath;
        }

        // If _sys.relativePath is not available, try to get URI and construct path
        // This handles cases where the rule reference exists but the file doesn't yet
        if ("uri" in ruleValue && typeof ruleValue.uri === "string") {
          // Construct path from URI: {uri}/rule
          return `${ruleValue.uri}/rule`;
        }
      }

      return null;
    })
    .filter((path): path is string => typeof path === "string" && path.length > 0);
}

/**
 * Resolves the rule's relative path from its URI.
 */
async function resolveRulePath(ruleUri: string, tgc: TinaGraphQLClient): Promise<string | null> {
  try {
    const rulePathResponse = (await tgc.request(RULE_PATH_BY_URI_QUERY, {
      uris: [ruleUri],
    })) as RuleConnectionQueryResponse;

    const rulePath = rulePathResponse?.ruleConnection?.edges?.[0]?.node?._sys?.relativePath;

    return rulePath ?? null;
  } catch (error) {
    console.error(`Failed to resolve rule path for URI: ${ruleUri}`, error);
    return null;
  }
}

/**
 * Reads the category file directly from the file system to extract the index
 * without GraphQL validation. This is used for create forms where rules don't exist yet.
 */
async function readCategoryIndexFromFile(relativePath: string): Promise<CategoryIndexItem[]> {
  try {
    const contentPath = process.env.LOCAL_CONTENT_RELATIVE_PATH;
    if (!contentPath) {
      console.warn("⚠️ LOCAL_CONTENT_RELATIVE_PATH not set, cannot read category file directly");
      return [];
    }

    // Adjust the path since env var is relative to tina config (subfolder) but this API runs from project root
    const adjustedContentPath = contentPath.replace("../../", "../");
    const contentRepoPath = join(process.cwd(), adjustedContentPath);

    const categoryFilePath = join(contentRepoPath, "categories", relativePath);

    // Security check: ensure the resolved path is within the content repo
    if (!categoryFilePath.startsWith(contentRepoPath)) {
      console.warn(`⚠️ Category path ${categoryFilePath} is outside content repo, skipping file read`);
      return [];
    }

    const fileContent = await readFile(categoryFilePath, "utf-8");

    // Parse frontmatter from MDX file using gray-matter
    const { data: frontmatter } = matter(fileContent);

    if (!frontmatter || !frontmatter.index) {
      console.warn(`⚠️ No index found in category file ${relativePath}`);
      return [];
    }

    // Extract index array from frontmatter
    const index = Array.isArray(frontmatter.index) ? frontmatter.index : [];

    // Convert index items to CategoryIndexItem format
    return index
      .map((item: any) => {
        // Handle different formats: {rule: "..."} or just "..." string
        if (typeof item === "string") {
          return { rule: item };
        }
        if (item && typeof item === "object" && item.rule) {
          return { rule: item.rule };
        }
        return null;
      })
      .filter((item): item is CategoryIndexItem => item !== null);
  } catch (error) {
    console.warn(`⚠️ Could not read category file ${relativePath} directly (file may not exist or be accessible):`, error);
    return [];
  }
}

/**
 * Fetches the full category document to preserve existing fields.
 * For create forms, this may fail if the index contains rules that don't exist yet.
 * In that case, we return an empty category object and handle it gracefully.
 */
async function fetchCategoryFull(
  relativePath: string,
  tgc: TinaGraphQLClient,
  skipValidation: boolean = false
): Promise<CategoryFullQueryResponse["category"]> {
  try {
    // For create forms, use query without index to avoid validation errors
    const query = skipValidation ? CATEGORY_FULL_QUERY_NO_INDEX : CATEGORY_FULL_QUERY;
    const categoryFullResponse = (await tgc.request(query, {
      relativePath,
    })) as CategoryFullQueryResponse;

    return categoryFullResponse?.category ?? {};
  } catch (error) {
    // If query fails, return empty category
    // The caller will handle building the index from scratch
    if (skipValidation) {
      console.warn(`⚠️ Failed to fetch category ${relativePath} (likely due to non-existent rules in index). Using empty category.`);
      return {};
    }
    // Re-throw if we're not skipping validation
    throw error;
  }
}

/**
 * Builds a new index array by adding a rule path.
 * Prevents duplicates by checking if the rule path already exists.
 */
function buildIndexForAdd(existingRulePaths: string[], newRulePath: string): CategoryIndexItem[] {
  // Check if rule path already exists to prevent duplicates
  if (existingRulePaths.includes(newRulePath)) {
    console.log(`⚠️ Rule path ${newRulePath} already exists in category index, skipping duplicate add`);
    // Return existing items without adding duplicate
    return existingRulePaths.map((path) => ({
      rule: `${RULES_UPLOAD_PATH}${path}`,
    }));
  }

  const existingIndexItems = existingRulePaths.map((path) => ({
    rule: `${RULES_UPLOAD_PATH}${path}`,
  }));

  return [...existingIndexItems, { rule: `${RULES_UPLOAD_PATH}${newRulePath}` }];
}

/**
 * Builds a new index array by removing a rule path.
 */
function buildIndexForDelete(existingRulePaths: string[], rulePathToRemove: string): CategoryIndexItem[] {
  return existingRulePaths
    .filter((path) => path !== rulePathToRemove)
    .map((path) => ({
      rule: `${RULES_UPLOAD_PATH}${path}`,
    }));
}

/**
 * Removes undefined and null values from an object to avoid clearing fields.
 */
function pruneUndefinedAndNull<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null)) as Partial<T>;
}

/**
 * Builds category mutation parameters from the current category data.
 */
function buildCategoryParams(currentCategory: CategoryFullQueryResponse["category"], newIndex: CategoryIndexItem[]): CategoryMutationParams {
  return pruneUndefinedAndNull({
    title: currentCategory?.title,
    uri: currentCategory?.uri,
    guid: currentCategory?.guid,
    consulting: currentCategory?.consulting,
    experts: currentCategory?.experts,
    redirects: Array.isArray(currentCategory?.redirects) ? currentCategory.redirects.filter((r): r is string => typeof r === "string") : undefined,
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
}

/**
 * Constructs a rule path from its URI (for new rules that don't exist yet).
 */
function constructRulePathFromUri(ruleUri: string): string {
  // Rule paths are constructed as {uri}/rule based on the slugify function
  return `${ruleUri}/rule`;
}

/**
 * Updates a category's rule list by adding or deleting a rule.
 */
export async function updateTheCategoryRuleList(
  ruleUri: string,
  relativePath: string,
  tgc: TinaGraphQLClient,
  action: "add" | "delete" = "add",
  skipRulePathResolution: boolean = false
): Promise<UpdateResult> {
  // Declare rulePath outside try block so it's accessible in catch
  let rulePath: string | null = null;

  try {
    console.log(`🔄 Processing category ${relativePath} for rule ${ruleUri} (action: ${action}, skipResolution: ${skipRulePathResolution})`);

    // For create forms, skip the query that tries to resolve rules (which will fail for non-existent rules)
    // Instead, fetch the full category document directly which includes the index without validation
    let existingRulePaths: string[] = [];
    let categoryForIndex: CategoryFullQueryResponse["category"] | undefined;

    // Always read the index from file first to preserve existing rules (including non-existent ones)
    // This is important because GraphQL queries may fail or return empty results if rules don't exist yet
    console.log(`📖 Reading category index directly from file to preserve existing rules...`);
    const existingIndexFromFile = await readCategoryIndexFromFile(relativePath);

    if (skipRulePathResolution) {
      // For create forms: fetch full category WITHOUT index to avoid validation errors
      console.log(`🔨 Skipping rule path resolution query for create form - fetching category without index`);
      categoryForIndex = await fetchCategoryFull(relativePath, tgc, true); // skipValidation = true

      // Extract paths from the file-based index for comparison purposes
      existingRulePaths = existingIndexFromFile
        .map((item) => {
          const ruleValue = item.rule;
          if (typeof ruleValue === "string") {
            if (ruleValue.startsWith(RULES_UPLOAD_PATH)) {
              return ruleValue.replace(RULES_UPLOAD_PATH, "");
            }
            return ruleValue;
          }
          return null;
        })
        .filter((path): path is string => typeof path === "string" && path.length > 0);

      console.log(`📋 Category ${relativePath} has ${existingRulePaths.length} rule(s) from file (preserved):`, existingRulePaths);

      // Store the existing index from file for later use when building newIndex
      // This preserves the exact format of existing rules
      (categoryForIndex as any).index = existingIndexFromFile;
    } else {
      // For update forms: try GraphQL query first, but fall back to file if it fails or returns empty
      try {
        const categoryRulePathsResponse = (await tgc.request(CATEGORY_RULE_PATHS_QUERY, { relativePath })) as CategoryQueryResponse;
        const graphqlRulePaths = extractExistingRulePaths(categoryRulePathsResponse);

        // Use file-based index if GraphQL returns fewer rules (likely due to non-existent rules)
        if (graphqlRulePaths.length < existingIndexFromFile.length) {
          console.log(
            `⚠️ GraphQL query returned ${graphqlRulePaths.length} rule(s), but file has ${existingIndexFromFile.length}. Using file-based index to preserve all rules.`
          );
          existingRulePaths = existingIndexFromFile
            .map((item) => {
              const ruleValue = item.rule;
              if (typeof ruleValue === "string") {
                if (ruleValue.startsWith(RULES_UPLOAD_PATH)) {
                  return ruleValue.replace(RULES_UPLOAD_PATH, "");
                }
                return ruleValue;
              }
              return null;
            })
            .filter((path): path is string => typeof path === "string" && path.length > 0);
        } else {
          existingRulePaths = graphqlRulePaths;
        }
        console.log(`📋 Category ${relativePath} currently has ${existingRulePaths.length} rule(s):`, existingRulePaths);
      } catch (error) {
        // If GraphQL query fails, fall back to file-based index
        console.warn(`⚠️ GraphQL query failed for category ${relativePath}, using file-based index:`, error);
        existingRulePaths = existingIndexFromFile
          .map((item) => {
            const ruleValue = item.rule;
            if (typeof ruleValue === "string") {
              if (ruleValue.startsWith(RULES_UPLOAD_PATH)) {
                return ruleValue.replace(RULES_UPLOAD_PATH, "");
              }
              return ruleValue;
            }
            return null;
          })
          .filter((path): path is string => typeof path === "string" && path.length > 0);
        console.log(`📋 Category ${relativePath} has ${existingRulePaths.length} rule(s) from file (fallback):`, existingRulePaths);
      }
    }

    // Resolve the rule's relative path from its URI
    // For new rules (create form), NEVER try to resolve the path - just construct it from URI
    // This is because the rule doesn't exist yet, so querying for it will fail
    if (skipRulePathResolution) {
      // For create forms: construct path directly from URI without any query/resolution
      rulePath = constructRulePathFromUri(ruleUri);
      console.log(`🔨 Constructed rule path from URI: ${rulePath} (for new rule - no resolution attempted)`);
    } else {
      // For update forms: resolve the path by querying the existing rule
      rulePath = await resolveRulePath(ruleUri, tgc);
      console.log(`🔍 Resolved rule path from query: ${rulePath}`);
    }

    if (!rulePath) {
      console.error(`❌ Could not resolve rule relativePath for URI: ${ruleUri}`);
      return { success: false, error: "Rule path not found" };
    }

    // Skip existence checks for new rules (create form)
    if (!skipRulePathResolution) {
      // Early return if rule already exists and we're trying to add
      if (existingRulePaths.includes(rulePath) && action === "add") {
        console.log(`⏭️ Rule path already referenced in category ${relativePath}; skipping mutation.`);
        return { success: true };
      }

      // Early return if rule doesn't exist and we're trying to delete
      if (!existingRulePaths.includes(rulePath) && action === "delete") {
        console.log(`⏭️ Rule path not found in category ${relativePath}; nothing to delete.`);
        return { success: true };
      }
    } else {
      // For create forms, log if rule path already exists (shouldn't happen for new rules)
      if (existingRulePaths.includes(rulePath) && action === "add") {
        console.warn(
          `⚠️ Rule path ${rulePath} already exists in category ${relativePath} for new rule ${ruleUri}. This might indicate a duplicate or the rule was created before.`
        );
      }
    }

    // Fetch full category document to preserve existing fields
    // For create forms, we already fetched this above, so reuse it
    let currentCategory: CategoryFullQueryResponse["category"];
    if (skipRulePathResolution) {
      // Reuse the category we already fetched above
      currentCategory = categoryForIndex!;
    } else {
      // For update forms, try to fetch with index, but if it fails or returns empty, use file-based index
      try {
        currentCategory = await fetchCategoryFull(relativePath, tgc);
        // If the GraphQL index is empty but we have rules from file, use file-based index
        const graphqlIndex = (currentCategory as any)?.index || [];
        if (graphqlIndex.length === 0 && existingIndexFromFile.length > 0) {
          console.log(`⚠️ GraphQL returned empty index but file has ${existingIndexFromFile.length} rule(s). Using file-based index.`);
          (currentCategory as any).index = existingIndexFromFile;
        }
      } catch (error) {
        // If fetching fails, try without index and use file-based index
        console.warn(`⚠️ Failed to fetch category with index, trying without index and using file-based index:`, error);
        currentCategory = await fetchCategoryFull(relativePath, tgc, true); // skipValidation = true
        (currentCategory as any).index = existingIndexFromFile;
      }
    }

    // Get the existing index from the category document to preserve the exact format
    // This is important because some rules in the index might not exist yet (newly added)
    // and we need to preserve their format to avoid validation errors
    // If index is still empty but we have file-based index, use that
    let existingIndex: any[] = (currentCategory as any)?.index || [];
    if (existingIndex.length === 0 && existingIndexFromFile.length > 0) {
      console.log(`📦 Using file-based index (${existingIndexFromFile.length} items) as GraphQL index is empty`);
      existingIndex = existingIndexFromFile;
    }
    console.log(
      `📦 Existing index has ${existingIndex.length} item(s), format:`,
      existingIndex.map((item: any) => ({
        ruleType: typeof item?.rule,
        ruleValue: typeof item?.rule === "string" ? item.rule.substring(0, 50) : "object",
      }))
    );

    // Helper function to extract path from an index item for comparison
    const getPathFromIndexItem = (item: any): string | null => {
      const ruleValue = item?.rule;
      if (typeof ruleValue === "string") {
        if (ruleValue.startsWith(RULES_UPLOAD_PATH)) {
          return ruleValue.replace(RULES_UPLOAD_PATH, "");
        }
        return ruleValue;
      }
      if (ruleValue?._sys?.relativePath) {
        return ruleValue._sys.relativePath;
      }
      if (ruleValue?.uri) {
        return `${ruleValue.uri}/rule`;
      }
      return null;
    };

    // Build new index based on action
    // CRITICAL: Preserve existing index items' exact string format to avoid validation errors
    // If existing items are stored as strings like "public/uploads/rules/{path}", keep them as strings
    // This prevents TinaCMS from trying to validate/resolve rules that don't exist yet
    let newIndex: CategoryIndexItem[];

    if (action === "add") {
      // Check if rule already exists in the index
      const ruleExists = existingIndex.some((item) => getPathFromIndexItem(item) === rulePath);
      if (ruleExists) {
        console.log(`⚠️ Rule path ${rulePath} already exists in category index, skipping duplicate add`);
        // Return existing index, preserving exact string format
        newIndex = existingIndex
          .map((item: any) => {
            // Preserve the exact rule value as a string - don't convert or transform it
            const ruleValue = item?.rule;
            return {
              rule: typeof ruleValue === "string" ? ruleValue : `${RULES_UPLOAD_PATH}${getPathFromIndexItem(item) || ""}`,
            };
          })
          .filter((item) => item.rule);
      } else {
        // Add new rule to existing index, preserving existing items' exact string format
        newIndex = [
          ...existingIndex.map((item: any) => {
            // Preserve the exact rule value as a string - don't convert or transform it
            const ruleValue = item?.rule;
            return {
              rule: typeof ruleValue === "string" ? ruleValue : `${RULES_UPLOAD_PATH}${getPathFromIndexItem(item) || ""}`,
            };
          }),
          { rule: `${RULES_UPLOAD_PATH}${rulePath}` },
        ];
      }
    } else {
      // For delete, remove the rule from existing index, preserving format of remaining items
      newIndex = existingIndex
        .filter((item: any) => getPathFromIndexItem(item) !== rulePath)
        .map((item: any) => {
          const ruleValue = item?.rule;
          return {
            rule: typeof ruleValue === "string" ? ruleValue : `${RULES_UPLOAD_PATH}${getPathFromIndexItem(item) || ""}`,
          };
        });
    }

    // Check if the index actually changed (to detect if it was a duplicate)
    const indexChanged =
      JSON.stringify(newIndex) !==
      JSON.stringify(
        existingRulePaths.map((path) => ({
          rule: `${RULES_UPLOAD_PATH}${path}`,
        }))
      );

    if (!indexChanged && action === "add") {
      console.warn(`⚠️ Rule ${ruleUri} (path: ${rulePath}) already exists in category ${relativePath}. No mutation needed.`);
      // Still return success since the rule is already in the category
      return { success: true };
    }

    // Build category parameters for mutation
    const categoryParams = buildCategoryParams(currentCategory, newIndex);

    // Log the mutation details for debugging
    console.log(`🔧 Preparing mutation for category ${relativePath} with ${newIndex.length} rule(s) in index`);
    console.log(`🔧 New index will include rule path: ${rulePath} (full: ${RULES_UPLOAD_PATH}${rulePath})`);

    // Perform the mutation
    try {
      await tgc.request(UPDATE_CATEGORY_MUTATION, {
        relativePath,
        category: categoryParams,
      });
    } catch (mutationError) {
      console.error(`❌ GraphQL mutation failed for category ${relativePath}:`, mutationError);
      // Re-throw to be caught by outer catch
      throw mutationError;
    }

    // Note: After mutation, TinaCMS may trigger re-indexing which can show errors like
    // "Unable to find collection for file" if the rule file doesn't exist yet.
    // These are expected and don't affect the mutation success - they're just indexing warnings.

    console.log(`✅ Successfully ${action === "add" ? "added" : "removed"} rule ${ruleUri} (path: ${rulePath}) to/from category ${relativePath}`);

    return { success: true };
  } catch (error) {
    const pathInfo = rulePath ? `(path: ${rulePath})` : "(path: not resolved)";
    console.error(`❌ Error ${action === "add" ? "adding" : "removing"} rule ${ruleUri} ${pathInfo} to/from category ${relativePath}:`, error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error(`❌ Error details: ${error.message}`);
      console.error(`❌ Error stack:`, error.stack);
    }

    return { success: false, error };
  }
}
