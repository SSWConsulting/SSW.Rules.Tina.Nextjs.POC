import React, { Suspense } from "react";
import Link from "next/link";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import MarkdownComponentMapping from "@/components/tina-markdown/markdown-component-mapping";
import RuleListClient from "./RuleListClient";

interface Props {
  categoryQueryProps: {
    data: any;
    variables?: Record<string, any>;
  };
  includeArchived: boolean;
}

export default function CategoryPageServer({ categoryQueryProps, includeArchived }: Props) {
  const { data, variables } = categoryQueryProps ?? {};
  const category = data?.category;
  const path = variables?.relativePath;

  const baseRules = Array.isArray(category?.index)
    ? category.index.flatMap((i: any) => (i?.rule ? [i.rule] : []))
    : [];

  const activeRules = baseRules.filter((r: any) => r?.isArchived !== true);
  const archivedRules = baseRules.filter((r: any) => r?.isArchived === true);
  const finalRules = includeArchived ? [...activeRules, ...archivedRules] : activeRules;

  const finalRulesForClient = finalRules.map((r: any) => ({
    guid: r.guid ?? null,
    uri: r.uri ?? '',
    title: r.title ?? '',
    isArchived: !!r.isArchived,
    archivedreason: r.archivedreason ?? null,
    // body: r.body ? JSON.parse(JSON.stringify(r.body)) : null,
  }));

  return (
    <div>
      <div className="flex">
        <div className="w-full lg:w-2/3 bg-white pt-4 p-6 border border-[#CCC] rounded shadow-lg">
          <h1 className="m-0 mb-2 text-ssw-red font-bold">
            {includeArchived ? `Archived Rules - ${category?.title}` : category?.title}
          </h1>

          <div className="text-md">
            <TinaMarkdown content={category?.body} components={MarkdownComponentMapping} />
          </div>

          <Suspense fallback={null}>
            <RuleListClient
              initialRules={finalRulesForClient}
              categoryUri={path}
              initialIncludeArchived={includeArchived}
            />
          </Suspense>
        </div>

        <div className="hidden lg:block lg:w-1/3 p-6 pr-0">
          <ol className="border-l-3 border-gray-300 pl-6">
            {finalRulesForClient.map((rule: any) => (
              <li key={`sidebar-${rule.guid}`} className="py-1 ml-4">
                <Link href={rule.uri} className="text-gray-700 hover:text-ssw-red">
                  {rule.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
