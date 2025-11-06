import React from "react";
import { Section } from "@/components/layout/section";
import client from "@/tina/__generated__/client";
import { notFound } from "next/navigation";
import ruleToCategoryIndex from "@/rule-to-categories.json";
import categoryTitleIndex from "@/category-uri-title-map.json";
import ServerCategoryPage from "@/app/[filename]/ServerCategoryPage";
import { TinaRuleWrapper } from "./TinaRuleWrapper";

// We have a Tina webhook revalidating each page individually on change
// Leaving this as a fallback in case the above goes wrong
export const revalidate = 3600;

// TODO: Remove me once we are sure all pages are statically generated and no more 404's
export const dynamicParams = false;

// TODO: Remove me once we are sure all pages are statically generated and no more 404's
// Add this to force static generation - ensure that the getRuleData and getCategoryData 
// functions are called at build time and have them cached.
export const dynamic = 'force-static';

const getFullRelativePathFromFilename = async (filename: string): Promise<string | null> => {
  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const res = await client.queries.topCategoryWithIndexQuery({
      first: 50,
      after,
    });

    const topCategories = res?.data.categoryConnection?.edges || [];

    for (const edge of topCategories) {
      const node = edge?.node;
      if (node?.__typename === "CategoryTop_category") {
        const topRelativePath = node._sys.relativePath;
        const topDir = topRelativePath.replace("/index.mdx", "");

        const children = node.index || [];
        for (const child of children) {
          // @ts-ignore
          if (child?.category?._sys?.filename === filename) {
            return `${topDir}/${filename}.mdx`;
          }
        }
      }
    }

    hasNextPage = res?.data?.categoryConnection?.pageInfo?.hasNextPage;
    after = res?.data?.categoryConnection?.pageInfo?.endCursor;
  }

  return null;
};

const getCategoryData = async (filename: string) => {
  const fullPath = await getFullRelativePathFromFilename(filename);
  if (!fullPath) return;

  try {
    const res = await client.queries.categoryWithRulesQuery({
      relativePath: `${fullPath}`,
    });

    return {
      data: res.data,
      query: res.query,
      variables: res.variables,
    };
  } catch (error) {
    console.error("Error fetching category data:", error);
    // Fallback: build category data without broken rule references
    try {
      const categorySlug = filename; // route param matches category filename/slug
      const title = (categoryTitleIndex as any)?.categories?.[categorySlug] ?? categorySlug;

      // Invert ruleToCategoryIndex to get all rule URIs that include this category
      const uris: string[] = [];
      try {
        for (const [ruleUri, categories] of Object.entries(
          ruleToCategoryIndex as Record<string, string[]>
        )) {
          if (Array.isArray(categories) && categories.includes(categorySlug)) {
            uris.push(ruleUri);
          }
        }
      } catch (e) {
        console.warn("Failed to invert rule-to-category index:", e);
      }

      let rules: any[] = [];
      if (uris.length > 0) {
        try {
          const rulesRes = await client.queries.rulesByUriQuery({ uris });
          const edges = rulesRes?.data?.ruleConnection?.edges ?? [];
          rules = edges.map((e: any) => e?.node).filter(Boolean);

          // Warn about any URIs that did not resolve to a rule (likely broken/missing)
          const fetchedUris = new Set<string>(
            rules.map((r: any) => String(r?.uri || "")).filter((u: string) => u.length > 0)
          );
          const missingUris = uris.filter((u) => !fetchedUris.has(u));
          if (missingUris.length > 0) {
            console.error(
              `Category fallback: missing or broken rule URIs for category '${categorySlug}' (${fullPath}):`,
              missingUris
            );
          }
        } catch (e) {
          console.warn("Failed to fetch rules by URIs for fallback:", e);
        }
      }

      // Synthesize a minimal category shape compatible with ServerCategoryPage
      return {
        data: {
          category: {
            title,
            body: null,
            index: rules.map((r) => ({ rule: r })),
          },
        },
        query: "fallback-category-with-filtered-rules",
        variables: { relativePath: `${fullPath}` },
      };
    } catch (e) {
      console.error("Fallback building category data failed:", e);
      return null;
    }
  }
};

const getRuleData = async (filename: string) => {
  try {
    const queryFn = (client.queries as any).ruleData ?? client.queries.rule;
    const tinaProps = await queryFn({
      relativePath: filename + "/rule.mdx",
    });

    return {
      data: tinaProps.data,
      query: tinaProps.query,
      variables: tinaProps.variables,
    };
  } catch (error) {
    console.error("Error fetching rule data:", error);
    return null;
  }
};

export async function generateStaticParams() {
  try {
    if (!client?.queries) {
      console.error("Client or queries not available");
      return [];
    }

    const filenames = new Set<string>();
    let after: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const res = await client.queries.allRulesPaths({
        first: 200,
        after,
      }).catch((err: any) => {
        console.warn("allRuleFoldersQuery page fetch error:", err?.message || err);
        return null;
      });

      const edges = res?.data?.ruleConnection?.edges ?? [];
      for (const e of edges) {
        // e.g. "definition-of-done/rule.mdx" => "definition-of-done"
        const rel = e?.node?._sys?.relativePath;
        const folder = rel?.split("/")?.[0];
        if (folder) filenames.add(folder);
      }

      const p = res?.data?.ruleConnection?.pageInfo;
      hasNext = !!p?.hasNextPage;
      after = p?.endCursor ?? null;
    }

    const fetchAllPages = async (queryFunction: (args?: any) => Promise<any>, queryName: string) => {
      const allEdges: any[] = [];
      let hasNextPage = true;
      let after: string | null = null;

      while (hasNextPage) {
        try {
          const result = await queryFunction({ first: 50, after }).catch((err) => {
            const isRecordNotFound = err?.message?.includes("Unable to find record");
            if (!isRecordNotFound) {
              console.warn(`Error fetching ${queryName}:`, err?.message || err);
            }
            return { data: { [`${queryName}Connection`]: { edges: [], pageInfo: { hasNextPage: false } } } };
          });

          const connection = result?.data?.[`${queryName}Connection`];
          if (connection?.edges && Array.isArray(connection.edges)) {
            allEdges.push(...connection.edges);
          }

          hasNextPage = connection?.pageInfo?.hasNextPage || false;
          after = connection?.pageInfo?.endCursor || null;
        } catch (err) {
          console.warn(`Error fetching ${queryName} page:`, err);
          hasNextPage = false;
        }
      }

      return allEdges;
    };

    const fetchAllTopCategoriesWithChildren = async () => {
      const allChildCategories: { filename: string }[] = [];
      let hasNextPage = true;
      let after: string | null = null;

      while (hasNextPage) {
        try {
          const res = await client.queries.topCategoryWithIndexQuery({
            first: 50,
            after,
          });

          const topCategories = res?.data.categoryConnection?.edges || [];
          for (const edge of topCategories) {
            const node = edge?.node;
            if (node?.__typename === "CategoryTop_category") {
              const children = node.index || [];
              for (const child of children) {
                if (child?.category?.__typename === "CategoryCategory" && child?.category?._sys?.filename) {
                  allChildCategories.push({ filename: child.category._sys.filename });
                }
              }
            }
          }

          hasNextPage = res?.data?.categoryConnection?.pageInfo?.hasNextPage;
          after = res?.data?.categoryConnection?.pageInfo?.endCursor;
        } catch (err) {
          console.warn("Error fetching top categories with children:", err);
          hasNextPage = false;
        }
      }

      return allChildCategories;
    };

    const [allCategoryEdges, childCategories] = await Promise.all([
      fetchAllPages(client.queries.categoryConnection, "category"),
      fetchAllTopCategoriesWithChildren(),
    ]);

    for (const page of allCategoryEdges) {
      try {
        const fn = page?.node?._sys?.filename;
        if (fn && fn !== "index") filenames.add(fn);
      } catch (err) {
        console.warn("Error processing category page:", err);
      }
    }
    for (const c of childCategories) {
      filenames.add(c.filename);
    }

    const fileCategories = Object.keys((categoryTitleIndex as any).categories || {});
    for (const fn of fileCategories) filenames.add(fn);

    const paths = Array.from(filenames || []).map((filename) => ({ filename }));

    console.log(`🚀 generateStaticParams: rules + categories total=${paths.length}`);
    return paths;
  } catch (error) {
    console.error("Error fetching static params:", error);
    return [];
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ filename: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { filename } = await params;

  const category = await getCategoryData(filename);
  if (category?.data) {
    const sp = (await searchParams) ?? {};
    const includeArchived = String(sp.archived ?? "") === "true";
    const view = String(sp.view ?? "blurb") as "titleOnly" | "blurb" | "all";
    const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
    const perPage = Math.max(1, Math.min(50, parseInt(String(sp.perPage ?? "10"), 10) || 10));

    return (
      <Section>
        <ServerCategoryPage
          category={category.data.category}
          path={category.variables?.relativePath}
          includeArchived={includeArchived}
          view={view}
          page={page}
          perPage={perPage}
        />
      </Section>
    );
  }

  const rule = await getRuleData(filename);
  const ruleUri = rule?.data.rule.uri;
  const ruleCategories = ruleUri ? (ruleToCategoryIndex as Record<string, string[]>)[ruleUri] : undefined;

  const ruleCategoriesMapping =
    ruleCategories?.map((categoryUri: string) => {
      return {
        title: (categoryTitleIndex as any).categories[categoryUri],
        uri: categoryUri,
      };
    }) || [];

  if (rule?.data) {
    const sanitizedBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/^\/+/, "");
    return (
      <Section>
        <TinaRuleWrapper
          tinaQueryProps={rule}
          serverRulePageProps={{
            rule: rule.data.rule,
            ruleCategoriesMapping: ruleCategoriesMapping,
            sanitizedBasePath: sanitizedBasePath,
          }}
        />
      </Section>
    );
  }

  notFound();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ filename: string }>;
}) {
  const { filename } = await params;

  try {
    const category = await getCategoryData(filename);
    if (category?.data?.category && "title" in category.data.category) {
      return {
        title: `${category.data.category.title} | SSW.Rules`,
      };
    }

    const rule = await getRuleData(filename);
    if (rule?.data?.rule?.title) {
      const metadata: any = {
        title: `${rule.data.rule.title} | SSW.Rules`,
      };

      if (rule.data.rule.seoDescription) {
        metadata.description = rule.data.rule.seoDescription;
      }

      return metadata;
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return {
    title: "SSW.Rules",
  };
}
