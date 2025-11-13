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
 * Fetches the full category document to preserve existing fields.
 * Tries multiple strategies to ensure we get complete data:
 * 1. First tries with index (for update forms)
 * 2. Falls back to query without index if validation fails
 * 3. Returns null only if both queries fail completely
 */
async function fetchCategoryFull(
  relativePath: string,
  tgc: TinaGraphQLClient,
  skipValidation: boolean = false
): Promise<CategoryFullQueryResponse["category"] | null> {
  // For create forms, use query without index to avoid validation errors
  if (skipValidation) {
    try {
      const categoryFullResponse = (await tgc.request(CATEGORY_FULL_QUERY_NO_INDEX, {
        relativePath,
      })) as CategoryFullQueryResponse;
      return categoryFullResponse?.category ?? null;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch category ${relativePath} without index:`, error);
      return null;
    }
  }

  // For update forms: try with index first, then without index if validation fails
  try {
    const categoryFullResponse = (await tgc.request(CATEGORY_FULL_QUERY, {
      relativePath,
    })) as CategoryFullQueryResponse;
    return categoryFullResponse?.category ?? null;
  } catch (error) {
    // If query with index fails (likely due to non-existent rules in index), try without index
    console.warn(`⚠️ Failed to fetch category ${relativePath} with index, trying without index:`, error);
    try {
      const categoryFullResponse = (await tgc.request(CATEGORY_FULL_QUERY_NO_INDEX, {
        relativePath,
      })) as CategoryFullQueryResponse;
      return categoryFullResponse?.category ?? null;
    } catch (secondError) {
      console.error(`❌ Failed to fetch category ${relativePath} with both queries:`, secondError);
      return null;
    }
  }
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
 * Gets existing rule paths for a category using GraphQL only.
 */
async function getExistingRulePaths(relativePath: string, tgc: TinaGraphQLClient, skipRulePathResolution: boolean): Promise<string[]> {
  // Try to get rule paths from GraphQL for both create and update forms
  try {
    const categoryRulePathsResponse = (await tgc.request(CATEGORY_RULE_PATHS_QUERY, { relativePath })) as CategoryQueryResponse;
    const graphqlRulePaths = extractExistingRulePaths(categoryRulePathsResponse);
    console.log(`📋 Category ${relativePath} currently has ${graphqlRulePaths.length} rule(s):`, graphqlRulePaths);
    return graphqlRulePaths;
  } catch (error) {
    // If GraphQL query fails, log warning and return empty array
    // This can happen for create forms when rules don't exist yet
    if (skipRulePathResolution) {
      console.log(`📋 Category ${relativePath} - create form, GraphQL query failed, assuming empty rule list`);
    } else {
      console.warn(`⚠️ GraphQL query failed for category ${relativePath}, assuming empty index:`, error);
    }
    return [];
  }
}

/**
 * Resolves or constructs the rule path based on the context.
 */
async function getRulePath(ruleUri: string, tgc: TinaGraphQLClient, skipRulePathResolution: boolean): Promise<string | null> {
  if (skipRulePathResolution) {
    // For create forms: construct path directly from URI without any query/resolution
    const rulePath = constructRulePathFromUri(ruleUri);
    console.log(`🔨 Constructed rule path from URI: ${rulePath} (for new rule - no resolution attempted)`);
    return rulePath;
  }

  // For update forms: resolve the path by querying the existing rule
  const rulePath = await resolveRulePath(ruleUri, tgc);
  console.log(`🔍 Resolved rule path from query: ${rulePath}`);
  return rulePath;
}

/**
 * Gets the existing index from GraphQL, trying multiple strategies.
 * Returns the index in the format needed for mutations.
 */
async function getExistingIndexFromGraphQL(relativePath: string, tgc: TinaGraphQLClient): Promise<CategoryIndexItem[]> {
  // First, try to get index from the full category query (most complete)
  try {
    const categoryFullResponse = (await tgc.request(CATEGORY_FULL_QUERY, {
      relativePath,
    })) as CategoryFullQueryResponse;
    const index = (categoryFullResponse?.category as any)?.index || [];
    if (index.length > 0) {
      // Convert to CategoryIndexItem format
      return index
        .map((item: any) => {
          const ruleValue = item?.rule;
          if (typeof ruleValue === "string") {
            return { rule: ruleValue };
          }
          if (ruleValue?._sys?.relativePath) {
            return { rule: `${RULES_UPLOAD_PATH}${ruleValue._sys.relativePath}` };
          }
          if (ruleValue?.uri) {
            return { rule: `${RULES_UPLOAD_PATH}${ruleValue.uri}/rule` };
          }
          return null;
        })
        .filter((item): item is CategoryIndexItem => item !== null);
    }
  } catch (error) {
    // If that fails, try the rule paths query
    console.log(`⚠️ Full category query failed, trying rule paths query:`, error);
  }

  // Fall back to rule paths query - construct index items from URIs
  try {
    const categoryRulePathsResponse = (await tgc.request(CATEGORY_RULE_PATHS_QUERY, {
      relativePath,
    })) as CategoryQueryResponse;
    const index = categoryRulePathsResponse?.category?.index || [];
    // Convert to CategoryIndexItem format
    return index
      .map((item: any) => {
        const ruleValue = item?.rule;
        if (ruleValue?.uri) {
          // Construct path from URI
          return { rule: `${RULES_UPLOAD_PATH}${ruleValue.uri}/rule` };
        }
        return null;
      })
      .filter((item): item is CategoryIndexItem => item !== null);
  } catch (error) {
    console.warn(`⚠️ Could not get index from GraphQL for category ${relativePath}:`, error);
    return [];
  }
}

/**
 * Gets the full category document with proper index handling using GraphQL only.
 * Uses multiple query strategies to ensure we get complete data even when some rules don't exist.
 */
async function getCategoryWithIndex(
  relativePath: string,
  tgc: TinaGraphQLClient,
  skipRulePathResolution: boolean
): Promise<CategoryFullQueryResponse["category"]> {
  if (skipRulePathResolution) {
    // For create forms: try to fetch with index first, fall back to without index if validation fails
    console.log(`🔨 Create form - trying to fetch category with index first`);
    let category = await fetchCategoryFull(relativePath, tgc, false);

    if (!category) {
      // If fetching with index failed, try without index
      console.log(`⚠️ Failed to fetch category with index, trying without index`);
      category = await fetchCategoryFull(relativePath, tgc, true);

      if (!category) {
        throw new Error(`Failed to fetch category ${relativePath} via GraphQL. Cannot proceed without category data.`);
      }

      // If we had to fetch without index, try to get the existing index separately
      console.log(`📖 Attempting to get existing index separately to preserve existing rules`);
      const existingIndex = await getExistingIndexFromGraphQL(relativePath, tgc);
      (category as any).index = existingIndex;
      console.log(`📦 Preserved ${existingIndex.length} existing rule(s) from separate query`);
      return category;
    }

    // If we got the category with index, use it
    const graphqlIndex = (category as any)?.index || [];
    (category as any).index = graphqlIndex;
    return category;
  }

  // For update forms: try to fetch with index first
  const category = await fetchCategoryFull(relativePath, tgc, false);

  if (!category) {
    throw new Error(`Failed to fetch category ${relativePath} via GraphQL. Cannot proceed without category data.`);
  }

  const graphqlIndex = (category as any)?.index || [];
  (category as any).index = graphqlIndex;

  return category;
}

/**
 * Normalizes paths for comparison to handle different formats consistently.
 */
function normalizePathForComparison(path: string | null): string | null {
  if (!path) return null;
  let normalized = path.trim();
  // Remove RULES_UPLOAD_PATH prefix if present
  if (normalized.startsWith(RULES_UPLOAD_PATH)) {
    normalized = normalized.replace(RULES_UPLOAD_PATH, "");
  }
  // Normalize slashes but keep the structure
  normalized = normalized.replace(/\/+/g, "/");
  // Remove trailing slashes except if it ends with /rule
  if (normalized.endsWith("/rule")) {
    return normalized;
  }
  return normalized.replace(/\/+$/, "");
}

/**
 * Extracts path from an index item for comparison.
 */
function getPathFromIndexItem(item: any): string | null {
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
}

/**
 * Gets all possible path representations from an index item.
 */
function getAllPathsFromIndexItem(item: any): string[] {
  const paths: string[] = [];
  const ruleValue = item?.rule;

  if (typeof ruleValue === "string") {
    let path = ruleValue;
    if (path.startsWith(RULES_UPLOAD_PATH)) {
      path = path.replace(RULES_UPLOAD_PATH, "");
    }
    paths.push(path);
  } else if (ruleValue && typeof ruleValue === "object") {
    if (ruleValue._sys?.relativePath) {
      paths.push(ruleValue._sys.relativePath);
    }
    if (ruleValue.uri) {
      paths.push(`${ruleValue.uri}/rule`);
    }
  }

  return paths.map((p) => normalizePathForComparison(p)).filter((p): p is string => p !== null);
}

/**
 * Checks if an index item matches the rule to delete.
 */
function shouldDeleteIndexItem(item: any, ruleUri: string, normalizedRulePath: string | null): boolean {
  if (!normalizedRulePath) return false;

  const ruleValue = item?.rule;

  // First, try to match by URI (most reliable identifier)
  if (ruleValue && typeof ruleValue === "object") {
    const itemUri = ruleValue.uri;
    if (itemUri && typeof itemUri === "string" && itemUri === ruleUri) {
      return true;
    }
  }

  // If URI didn't match, try to match by path
  const itemPaths = getAllPathsFromIndexItem(item);
  if (itemPaths.length > 0) {
    const pathMatches = itemPaths.some((itemPath) => itemPath === normalizedRulePath);
    if (pathMatches) {
      return true;
    }
  }

  // Also check if the path can be derived from URI (for string items)
  if (ruleValue && typeof ruleValue === "string") {
    let cleanPath = ruleValue;
    if (cleanPath.startsWith(RULES_UPLOAD_PATH)) {
      cleanPath = cleanPath.replace(RULES_UPLOAD_PATH, "");
    }

    const normalizedStringPath = normalizePathForComparison(cleanPath);
    if (normalizedStringPath && normalizedStringPath === normalizedRulePath) {
      return true;
    }

    // Check if the path contains the URI
    const constructedPathFromUri = `${ruleUri}/rule`;
    const normalizedConstructedPath = normalizePathForComparison(constructedPathFromUri);
    if (normalizedConstructedPath && normalizedStringPath === normalizedConstructedPath) {
      return true;
    }

    if (normalizedStringPath?.includes(ruleUri) || cleanPath.includes(ruleUri)) {
      return true;
    }
  }

  return false;
}

/**
 * Preserves the exact format of existing index items.
 */
function preserveIndexItemFormat(item: any): CategoryIndexItem {
  const ruleValue = item?.rule;
  return {
    rule: typeof ruleValue === "string" ? ruleValue : `${RULES_UPLOAD_PATH}${getPathFromIndexItem(item) || ""}`,
  };
}

/**
 * Builds a new index for adding a rule.
 */
function buildIndexForAddAction(existingIndex: any[], rulePath: string): CategoryIndexItem[] {
  // Check if rule already exists in the index
  const ruleExists = existingIndex.some((item) => getPathFromIndexItem(item) === rulePath);
  if (ruleExists) {
    console.log(`⚠️ Rule path ${rulePath} already exists in category index, skipping duplicate add`);
    return existingIndex.map(preserveIndexItemFormat).filter((item) => item.rule);
  }

  // Add new rule to existing index, preserving existing items' exact string format
  return [...existingIndex.map(preserveIndexItemFormat), { rule: `${RULES_UPLOAD_PATH}${rulePath}` }];
}

/**
 * Builds a new index for deleting a rule.
 */
function buildIndexForDeleteAction(existingIndex: any[], ruleUri: string, rulePath: string): CategoryIndexItem[] {
  const normalizedRulePath = normalizePathForComparison(rulePath);
  console.log(`🗑️ Deleting rule with URI: ${ruleUri}, path: ${rulePath} (normalized: ${normalizedRulePath})`);

  const newIndex = existingIndex
    .filter((item) => {
      const shouldDelete = shouldDeleteIndexItem(item, ruleUri, normalizedRulePath);
      if (shouldDelete) {
        console.log(`✅ Found matching item to delete`);
      }
      return !shouldDelete;
    })
    .map(preserveIndexItemFormat);

  console.log(`📊 Delete operation: ${existingIndex.length} items before, ${newIndex.length} items after`);

  // If no items were deleted but we expected to delete one, log a warning
  if (existingIndex.length === newIndex.length) {
    console.warn(`⚠️ No items were deleted! Expected to delete rule with URI: ${ruleUri}, path: ${rulePath}`);
  }

  return newIndex;
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

    // Step 1: Get existing rule paths from GraphQL
    const existingRulePaths = await getExistingRulePaths(relativePath, tgc, skipRulePathResolution);

    // Step 2: Resolve or construct the rule path
    rulePath = await getRulePath(ruleUri, tgc, skipRulePathResolution);
    if (!rulePath) {
      console.error(`❌ Could not resolve rule relativePath for URI: ${ruleUri}`);
      return { success: false, error: "Rule path not found" };
    }

    // Step 3: Validate preconditions (skip for create forms)
    if (!skipRulePathResolution) {
      if (existingRulePaths.includes(rulePath) && action === "add") {
        console.log(`⏭️ Rule path already referenced in category ${relativePath}; skipping mutation.`);
        return { success: true };
      }
      if (!existingRulePaths.includes(rulePath) && action === "delete") {
        console.log(`⏭️ Rule path not found in category ${relativePath}; nothing to delete.`);
        return { success: true };
      }
    } else if (existingRulePaths.includes(rulePath) && action === "add") {
      // For create forms, log if rule path already exists (shouldn't happen for new rules)
      console.warn(
        `⚠️ Rule path ${rulePath} already exists in category ${relativePath} for new rule ${ruleUri}. This might indicate a duplicate or the rule was created before.`
      );
    }

    // Step 4: Get the full category document with proper index handling
    const currentCategory = await getCategoryWithIndex(relativePath, tgc, skipRulePathResolution);

    // Step 5: Get the existing index from the category document
    let existingIndex: any[] = (currentCategory as any)?.index || [];

    // For create forms, if we got existing rule paths but the index is empty,
    // try to reconstruct the index from the rule paths we got earlier
    if (skipRulePathResolution && existingIndex.length === 0 && existingRulePaths.length > 0) {
      console.log(`⚠️ Index is empty but we have ${existingRulePaths.length} existing rule path(s). Reconstructing index.`);
      existingIndex = existingRulePaths.map((path) => ({
        rule: `${RULES_UPLOAD_PATH}${path}`,
      }));
      (currentCategory as any).index = existingIndex;
    }

    console.log(
      `📦 Existing index has ${existingIndex.length} item(s), format:`,
      existingIndex.map((item: any) => ({
        ruleType: typeof item?.rule,
        ruleValue: typeof item?.rule === "string" ? item.rule.substring(0, 50) : "object",
      }))
    );

    // Step 6: Build new index based on action
    const newIndex = action === "add" ? buildIndexForAddAction(existingIndex, rulePath) : buildIndexForDeleteAction(existingIndex, ruleUri, rulePath);

    // Step 7: Check if the index actually changed (to detect if it was a duplicate)
    const indexChanged =
      JSON.stringify(newIndex) !==
      JSON.stringify(
        existingRulePaths.map((path) => ({
          rule: `${RULES_UPLOAD_PATH}${path}`,
        }))
      );

    if (!indexChanged && action === "add") {
      console.warn(`⚠️ Rule ${ruleUri} (path: ${rulePath}) already exists in category ${relativePath}. No mutation needed.`);
      return { success: true };
    }

    // Step 8: Build category parameters for mutation
    const categoryParams = buildCategoryParams(currentCategory, newIndex);

    // Step 9: Perform the mutation
    console.log(`🔧 Preparing mutation for category ${relativePath} with ${newIndex.length} rule(s) in index`);
    console.log(`🔧 New index will include rule path: ${rulePath} (full: ${RULES_UPLOAD_PATH}${rulePath})`);

    try {
      await tgc.request(UPDATE_CATEGORY_MUTATION, {
        relativePath,
        category: categoryParams,
      });
    } catch (mutationError) {
      console.error(`❌ GraphQL mutation failed for category ${relativePath}:`, mutationError);
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

    if (error instanceof Error) {
      console.error(`❌ Error details: ${error.message}`);
      console.error(`❌ Error stack:`, error.stack);
    }

    return { success: false, error };
  }
}
