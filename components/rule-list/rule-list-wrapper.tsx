"use client";

import React, { useEffect, useState } from "react";
import { RuleListFilter } from "@/types/ruleListFilter";
import RuleList from "./rule-list";

export interface RuleListWrapperProps {
  categoryUri?: string;
  rules: any[];
  type?: string;
  noContentMessage?: string;
  onBookmarkRemoved?: (ruleGuid: string) => void;
  includeArchived?: boolean;
  onIncludeArchivedChange?: (include: boolean) => void;
  showPagination?: boolean;
  showFilterControls?: boolean;
  initialView?: RuleListFilter;
  initialPage?: number;
  initialPerPage?: number;
}

const RuleListWrapper: React.FC<RuleListWrapperProps> = ({ initialView = RuleListFilter.Blurb, initialPage = 1, initialPerPage = 10, ...props }) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialPerPage);

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    setItemsPerPage(initialPerPage);
  }, [initialPerPage]);

  return <RuleList {...props} initialFilter={initialView} initialPage={currentPage} initialItemsPerPage={itemsPerPage} />;
};

export default RuleListWrapper;
