"use client";

import { useEffect, useState } from "react";
import client from "@/tina/__generated__/client";
import { Section } from "@/components/layout/section";
import ServerCategoryPage from "@/app/[filename]/ServerCategoryPage";
import { TinaRuleWrapper } from "./TinaRuleWrapper";
import ruleToCategoryIndex from "@/rule-to-categories.json";
import categoryTitleIndex from "@/category-uri-title-map.json";
import NotFound from "@/app/not-found";

interface ClientFallbackPageProps {
  filename: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ClientFallbackPage({ filename, searchParams }: ClientFallbackPageProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Helper function to get branch from API
  const getBranchFromAPI = async (): Promise<string | undefined> => {
    try {
      const branchRes = await fetch("/api/branch", { method: "GET", cache: "no-store" });
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        const branch = branchData?.branch || "";
        return branch || undefined;
      }
    } catch (error) {
      console.error("Error fetching branch from API:", error);
    }
    return undefined;
  };

  // Helper function to get full relative path from filename
  const getFullRelativePathFromFilename = async (
    filename: string,
    fetchOptions: any
  ): Promise<string | null> => {
    let hasNextPage = true;
    let after: string | null = null;

    while (hasNextPage) {
      try {
        const res = fetchOptions
          ? await client.queries.topCategoryWithIndexQuery(
              {
                first: 50,
                after,
              },
              fetchOptions
            )
          : await client.queries.topCategoryWithIndexQuery({
              first: 50,
              after,
            });

        const topCategories = res?.data?.categoryConnection?.edges || [];

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

        hasNextPage = res?.data?.categoryConnection?.pageInfo?.hasNextPage || false;
        after = res?.data?.categoryConnection?.pageInfo?.endCursor || null;
      } catch (error) {
        console.error("Error in getFullRelativePathFromFilename:", error);
        return null;
      }
    }

    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get branch from API
        const branch = await getBranchFromAPI();
        
        // Prepare fetch options with branch header if available
        const fetchOptions = branch
          ? {
              fetchOptions: {
                headers: {
                  "x-branch": branch,
                },
              },
            }
          : undefined;

        // First, try to find the full relative path for category
        const fullPath = await getFullRelativePathFromFilename(filename, fetchOptions);
        
        // Try category first
        if (fullPath) {
          try {
            const categoryRes = fetchOptions
              ? await client.queries.categoryWithRulesQuery(
                  { relativePath: fullPath },
                  fetchOptions
                )
              : await client.queries.categoryWithRulesQuery({ relativePath: fullPath }, fetchOptions);

            if (categoryRes?.data?.category) {
              const includeArchived = String(searchParams.archived ?? "") === "true";
              const view = String(searchParams.view ?? "blurb") as "titleOnly" | "blurb" | "all";
              const page = Math.max(1, parseInt(String(searchParams.page ?? "1"), 10) || 1);
              const perPage = Math.max(1, Math.min(50, parseInt(String(searchParams.perPage ?? "10"), 10) || 10));

              setData({
                type: "category",
                category: categoryRes.data.category,
                path: fullPath,
                includeArchived,
                view,
                page,
                perPage,
              });
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching category data:", error);
          }
        }

        // Try rule data
        try {
          const ruleRes = fetchOptions
            ? await client.queries.ruleData(
                { relativePath: filename + "/rule.mdx" },
                fetchOptions
              )
            : await client.queries.ruleData({ relativePath: filename + "/rule.mdx" }, fetchOptions);

          if (ruleRes?.data?.rule) {
            const ruleUri = ruleRes.data.rule.uri;
            const ruleCategories = ruleUri ? (ruleToCategoryIndex as Record<string, string[]>)[ruleUri] : undefined;

            const ruleCategoriesMapping =
              ruleCategories?.map((categoryUri: string) => {
                return {
                  title: (categoryTitleIndex as any).categories[categoryUri],
                  uri: categoryUri,
                };
              }) || [];

            const sanitizedBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/^\/+/, "");

            setData({
              type: "rule",
              rule: ruleRes.data.rule,
              ruleCategoriesMapping,
              sanitizedBasePath,
              tinaQueryProps: {
                data: ruleRes.data,
                query: ruleRes.query,
                variables: ruleRes.variables,
              },
            });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error fetching rule data:", error);
        }

        // If we get here, nothing was found
        setIsNotFound(true);
        setLoading(false);
      } catch (error) {
        console.error("Error in client fallback fetch:", error);
        setIsNotFound(true);
        setLoading(false);
      }
    };

    fetchData();
  }, [filename, searchParams]);

  if (loading) {
    return (
      <Section>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ssw-red mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Section>
    );
  }

  if (isNotFound || !data) {
    return <NotFound />;
  }

  if (data.type === "category") {
    return (
      <Section>
        <ServerCategoryPage
          category={data.category}
          path={data.path}
          includeArchived={data.includeArchived}
          view={data.view}
          page={data.page}
          perPage={data.perPage}
        />
      </Section>
    );
  }

  if (data.type === "rule") {
    return (
      <Section>
        <TinaRuleWrapper
          tinaQueryProps={data.tinaQueryProps}
          serverRulePageProps={{
            rule: data.rule,
            ruleCategoriesMapping: data.ruleCategoriesMapping,
            sanitizedBasePath: data.sanitizedBasePath,
          }}
        />
      </Section>
    );
  }

  return null;
}

