//import { TinaGraphQLClient } from "@/src/utils/tina/tina-graphql-client";
import client from "@/tina/__generated__/client";
import { type NextRequest, NextResponse } from "next/server";
import { TinaGraphQLClient } from "@/utils/tina/tina-graphql-client";
// import { generateMdxFiles } from "./generate-mdx-files";
// import type { GroupApiData } from "./types";

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
    // const client = new TinaGraphQLClient(token || "");
    console.log("✌️ category", categories);
    console.log("✌️rule", ruleUri);

    if (!Array.isArray(categories) || !ruleUri) {
      return NextResponse.json(
        { error: "Invalid data format - expected categories array and rule" },
        { status: 400 }
      );
    }

    const allCreatedFiles: string[] = [];
    const allSkippedFiles: string[] = [];
    for (const category of categories) {
        console.log("category", category);
        console.log("rule", ruleUri);

        // if (typeof category !== "string") {
        //   console.warn("Skipping non-string category entry:", category);
        //   continue;
        // }

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

              // 1) Fetch existing rule reference paths for this category (need _sys.relativePath)
              const CATEGORY_RULE_PATHS_QUERY = `
                query CategoryRulePaths($relativePath: String!) {
                  category(relativePath: $relativePath) {
                    ... on CategoryCategory {
                      index {
                        rule {
                          ... on Rule {
                            uri
                            _sys { relativePath }
                          }
                        }
                      }
                    }
                  }
                }
              `;

              const categoryRulePathsRes: any = await tgc.request(
                CATEGORY_RULE_PATHS_QUERY,
                { relativePath }
              );

              const existingRulePaths: string[] = (categoryRulePathsRes?.category?.index || [])
                .map((i: any) => i?.rule?._sys?.relativePath)
                .filter((p: any) => typeof p === "string");

              // 2) Resolve the rule's relativePath from its uri
              const RULE_PATH_BY_URI_QUERY = `
                query RulePathByUri($uris: [String!]!) {
                  ruleConnection(filter: { uri: { in: $uris } }) {
                    edges { node { uri _sys { relativePath } } }
                  }
                }
              `;

              const rulePathRes: any = await tgc.request(RULE_PATH_BY_URI_QUERY, {
                uris: [ruleUri],
              });

              const rulePath: string | undefined = rulePathRes?.ruleConnection?.edges?.[0]?.node?._sys?.relativePath;

              if (!rulePath) {
                console.warn("Could not resolve rule relativePath for uri:", ruleUri);
              } else if (existingRulePaths.includes(rulePath)) {
                console.log("Rule path already referenced in category; skipping mutation.");
              } else {
                // 3) Update the category's index with the new reference
                const UPDATE_CATEGORY_MUTATION = `
                  mutation UpdateCategoryIndex($relativePath: String!, $index: [CategoryCategoryIndexMutation]) {
                    updateCategory(relativePath: $relativePath, params: { category: { index: $index } }) {
                      __typename
                    }
                  }
                `;

                const newIndex = [
                  ...existingRulePaths.map((p) => ({ rule: p })),
                  { rule: rulePath },
                ];

                await tgc.request(UPDATE_CATEGORY_MUTATION, {
                  relativePath,
                  index: newIndex,
                });

                console.log("Updated category", relativePath, "with rule", ruleUri);
              }
            }
          } else {
          }

        } catch (e) {
          console.error("Error fetching category data for", category, e);
        }

    //   if (item._template === "apiTab") {
    //     // Process API groups within this tab
    //     for (const group of item.supermenuGroup || []) {
    //       if (group._template === "groupOfApiReferences" && group.apiGroup) {
    //         try {
    //           // Parse the group data
    //           const groupData: GroupApiData =
    //             typeof group.apiGroup === "string"
    //               ? JSON.parse(group.apiGroup)
    //               : group.apiGroup;

    //           // Generate files for this group
    //           const { createdFiles, skippedFiles } = await generateMdxFiles(
    //             groupData,
    //             client
    //           );
    //           allCreatedFiles.push(...createdFiles);
    //           allSkippedFiles.push(...skippedFiles);
    //         } catch (error) {
    //           // Continue processing other groups
    //         }
    //       }
    //     }
    //   }
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
