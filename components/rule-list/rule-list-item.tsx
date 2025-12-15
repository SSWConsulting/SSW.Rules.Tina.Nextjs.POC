"use client";

import React, { useRef } from "react";
import { tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { useMarkHighlight } from "@/lib/useMarkHighlight";
import { RuleListFilter } from "@/types/ruleListFilter";
import MarkdownComponentMapping from "../tina-markdown/markdown-component-mapping";
import RuleListItemHeader from "./rule-list-item-header";

export interface RuleListItemProps {
  rule: any;
  index: number;
  filter: RuleListFilter;
  onBookmarkRemoved?: (ruleGuid: string) => void;
}

const RuleListItem: React.FC<RuleListItemProps> = ({ rule, index, filter, onBookmarkRemoved }) => {
  function makeBlurbContent(body?: { children?: any[] }) {
    if (!body || !Array.isArray(body.children)) return;

    const index = body.children.findIndex((node) => node?.name === "endIntro");

    const blurbChildren = index === -1 ? body.children : body.children.slice(0, index);

    return {
      ...body,
      children: blurbChildren,
    };
  }

  function getContentForViewStyle(filter: RuleListFilter, body?: any) {
    if (!body) return undefined;
    if (filter === RuleListFilter.All) return body;
    if (filter === RuleListFilter.Blurb) return makeBlurbContent(body);
    return undefined;
  }

  const contentRef = useRef<HTMLDivElement>(null);
  useMarkHighlight(contentRef, "ul li div");

  return (
    <li key={index} className="p-4 border rounded shadow">
      <RuleListItemHeader rule={rule} index={index} />

      {filter !== RuleListFilter.TitleOnly && (
        <div data-tina-field={tinaField(rule, "body")} className="pt-4 pl-8 pr-2" ref={contentRef}>
          <TinaMarkdown content={getContentForViewStyle(filter, rule.body)} components={MarkdownComponentMapping} />
        </div>
      )}
    </li>
  );
};
export default RuleListItem;
