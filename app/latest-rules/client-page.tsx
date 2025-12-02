"use client";

import { useMemo, useState } from "react";
import { CgSortAz } from "react-icons/cg";
import AboutSSWCard from "@/components/AboutSSWCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import HelpCard from "@/components/HelpCard";
import HelpImproveCard from "@/components/HelpImproveCard";
import JoinConversationCard from "@/components/JoinConversationCard";
import RuleCount from "@/components/RuleCount";
import RuleListWrapper from "@/components/rule-list/rule-list-wrapper";
import SearchBar from "@/components/SearchBarWrapper";
import Dropdown from "@/components/ui/dropdown";
import WhyRulesCard from "@/components/WhyRulesCard";
import { LatestRule } from "@/models/LatestRule";
import { RuleListFilter } from "@/types/ruleListFilter";

interface LatestRuleClientPageProps {
  ruleCount: number;
  latestRulesByUpdated: LatestRule[];
  latestRulesByCreated: LatestRule[];
}

export default function LatestRuleClientPage({ ruleCount, latestRulesByUpdated, latestRulesByCreated }: LatestRuleClientPageProps) {
  const [currentSort, setCurrentSort] = useState<"lastUpdated" | "created">("lastUpdated");

  const handleSortChange = (newSort: "lastUpdated" | "created") => {
    setCurrentSort(newSort);
  };

  const latestRules = useMemo(
    () => (currentSort === "lastUpdated" ? latestRulesByUpdated : latestRulesByCreated),
    [currentSort, latestRulesByUpdated, latestRulesByCreated]
  );

  const sortOptions = [
    { value: "lastUpdated", label: "Last Updated" },
    { value: "created", label: "Recently Created" },
  ];

  return (
    <>
      <Breadcrumbs breadcrumbText="Latest Rules" />
      <div className="layout-two-columns">
        <div className="layout-main-section">
          <div className="h-20">
            <SearchBar />
          </div>

          <div className="w-full bg-white pt-4 p-6 border border-[#CCC] rounded shadow-lg">
            <div className="flex justify-between items-center mb">
              <h1 className="m-0 text-ssw-red font-bold">Latest Rules</h1>
              <div className="flex items-center space-x-2">
                <CgSortAz className="inline" size={24} />
                <Dropdown options={sortOptions} value={currentSort} onChange={(value) => handleSortChange(value as "lastUpdated" | "created")} />
              </div>
            </div>

            <RuleListWrapper rules={latestRules} initialView={RuleListFilter.Blurb} initialPerPage={10} showPagination={true} />
          </div>
        </div>

        <div className="layout-sidebar">
          <div className="h-14">{ruleCount && <RuleCount count={ruleCount} />}</div>
          <WhyRulesCard />
          <HelpImproveCard />
          <HelpCard />
          <AboutSSWCard />
          <JoinConversationCard />
        </div>
      </div>
    </>
  );
}
