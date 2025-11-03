"use client";

import Link from "next/link";

export type RelatedRule = { uri: string; title: string };

interface RelatedRulesProps {
  items: RelatedRule[];
  emptyText?: string;
  className?: string;
}

const RelatedRules = ({ items, emptyText = "No related rules.", className }: RelatedRulesProps) => {
  if (!items || items.length === 0) {
    return <div className="text-sm text-gray-500">{emptyText}</div>;
  }

  return (
    <ul className={className ?? "pl-4"}>
      {items.map((rule) => (
        <li key={rule.uri} className="not-last:mb-2">
          <Link href={`/${rule.uri}`} className="no-underline">
            {rule.title}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default RelatedRules;
