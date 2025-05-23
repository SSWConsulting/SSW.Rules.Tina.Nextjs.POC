"use client";

import { embedComponents } from "@/components/embeds";
import Link from "next/link";
import { tinaField, useTina } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";

export interface ClientRulePageProps {
  ruleQueryProps,
  relatedCategories
}

export default function ClientRulePage(props: ClientRulePageProps) {
  const { ruleQueryProps, relatedCategories } = props;

  const ruleData = useTina({
    query: ruleQueryProps?.query,
    variables: ruleQueryProps?.variables,
    data: ruleQueryProps?.data,
  }).data;

  const rule = ruleData?.rule;

  return (
    <>
      <h1 className="font-bold mb-4" data-tina-field={tinaField(rule, "title")}>
        {rule?.title}
      </h1>
      <div data-tina-field={tinaField(rule, "body")}>
        <TinaMarkdown content={rule.body} components={embedComponents} />
      </div>

      {relatedCategories && (
        <div className="mt-8 mb-4">
          <h2 className="font-semibold">Categories:</h2>
          <ul className="list-disc ml-6">
            {relatedCategories.map((cat) => (
              <li key={cat.categoryUri}>
                <Link
                  href={`/${cat.categoryUri}`}
                  className="text-blue-600 underline"
                >
                  {cat.categoryTitle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
