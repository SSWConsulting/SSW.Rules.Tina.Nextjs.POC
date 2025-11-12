import { TinaGraphQLClient } from "@/utils/tina/tina-graphql-client";
import { CATEGORY_FULL_QUERY, CATEGORY_RULE_PATHS_QUERY, RULE_PATH_BY_URI_QUERY, UPDATE_CATEGORY_MUTATION } from "./constants";
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
 */
async function fetchCategoryFull(relativePath: string, tgc: TinaGraphQLClient): Promise<CategoryFullQueryResponse["category"]> {
  const categoryFullResponse = (await tgc.request(CATEGORY_FULL_QUERY, {
    relativePath,
  })) as CategoryFullQueryResponse;

  return categoryFullResponse?.category ?? {};
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

    // Fetch existing rule paths in the category
    const categoryRulePathsResponse = (await tgc.request(CATEGORY_RULE_PATHS_QUERY, { relativePath })) as CategoryQueryResponse;

    const existingRulePaths = extractExistingRulePaths(categoryRulePathsResponse);

    console.log(`📋 Category ${relativePath} currently has ${existingRulePaths.length} rule(s):`, existingRulePaths);

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
    const currentCategory = await fetchCategoryFull(relativePath, tgc);

    // Build new index based on action
    const newIndex = action === "add" ? buildIndexForAdd(existingRulePaths, rulePath) : buildIndexForDelete(existingRulePaths, rulePath);

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
