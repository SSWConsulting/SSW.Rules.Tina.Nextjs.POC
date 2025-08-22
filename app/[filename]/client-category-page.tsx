"use client";

import React, { useMemo, useState } from "react";
import { useTina } from "tinacms/dist/react";
import Link from "next/link";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import MarkdownComponentMapping from "@/components/tina-markdown/markdown-component-mapping";

export interface ClientCategoryPageProps {
  categoryQueryProps;
}

function collectIntroEmbeds(nodes: any[]): any[] {
  const out: any[] = [];
  for (const n of nodes || []) {
    if (n?.name === "introEmbed") out.push(n);
    if (Array.isArray(n?.children)) out.push(...collectIntroEmbeds(n.children));
  }
  return out;
}

function makeBlurbContent(body: any) {
  const embeds = collectIntroEmbeds(body.children);
  return { type: "root", children: embeds };
}

export default function ClientCategoryPage(props: ClientCategoryPageProps) {
  const { categoryQueryProps } = props;

  const categoryData = useTina({
    query: categoryQueryProps?.query,
    variables: categoryQueryProps?.variables,
    data: categoryQueryProps?.data,
  }).data;

  const category = categoryData;

  const [mode, setMode] = useState<"all" | "blurb">("all");

  const btnClass = (active: boolean) =>
    `inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition cursor-pointer
     ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"}`;

  return (
    <>
      <h1 className="font-bold mb-4">{category.title}</h1>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={btnClass(mode === "all")}
          onClick={() => setMode("all")}
          aria-pressed={mode === "all"}
        >
          Show All
        </button>
        <button
          type="button"
          className={btnClass(mode === "blurb")}
          onClick={() => setMode("blurb")}
          aria-pressed={mode === "blurb"}
        >
          Show blurb
        </button>
      </div>

      <ul className="space-y-8">
        {category.index &&
          category.index.map((x) => {
            const content = useMemo(
              () => (mode === "all" ? x?.rule?.body : makeBlurbContent(x?.rule?.body)),
              [mode, x?.rule?.body]
            );

            return (
              <li key={x?.rule?.uri}>
                <Link href={`/${x?.rule?.uri}`} className="font-medium underline underline-offset-4">
                  {x?.rule?.title}
                </Link>
                <div className="mt-4 prose max-w-none">
                  <TinaMarkdown content={content} components={MarkdownComponentMapping} />
                </div>
              </li>
            );
          })}
      </ul>
    </>
  );
}
