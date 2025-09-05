"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import AboutSSWCard from "@/components/AboutSSWCard";
import HelpCard from "@/components/HelpCard";
import HelpImproveCard from "@/components/HelpImproveCard";
import JoinConversationCard from "@/components/JoinConversationCard";
import RuleCount from "@/components/RuleCount";
import WhyRulesCard from "@/components/WhyRulesCard";
import { LatestRule } from "@/models/LatestRule";
import LatestRulesCard from "@/components/LatestRulesCard";
import { Card } from "@/components/ui/card";
import Dropdown from "@/components/ui/dropdown";
import { CgSortAz } from "react-icons/cg";
import { RiTimeFill } from "react-icons/ri";
import { timeAgo } from "@/lib/dateUtils";
import Link from "next/link";

interface SearchResult {
  objectID: string;
  title: string;
  slug: string;
  [key: string]: any;
}

interface RuleSearchClientPageProps {
  ruleCount: number;
  latestRulesByUpdated: LatestRule[];
}

export default function RulesSearchClientPage({ ruleCount, latestRulesByUpdated }: RuleSearchClientPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const keyword = searchParams.get("keyword") || "";
  const sortBy = searchParams.get("sortBy") || "lastUpdated";
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sortBy", newSort);
    if (keyword) params.set("keyword", keyword);
    router.push(`/search?${params.toString()}`);
  };

  const sortOptions = [
    { value: "lastUpdated", label: "Last Updated" },
    { value: "created", label: "Recently Created" }
  ];

  return (
    <>
      <div className="layout-two-columns">
        <div className="layout-main-section">
          <div className="h-[5rem]">
            <SearchBar 
              keyword={keyword}
              sortBy={sortBy}
              onResults={setSearchResults}
            />
          </div>
          
          {searchResults.length > 0 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="m-0 text-ssw-red font-bold">
                  Search Results ({searchResults.length})
                </h2>
                <div className="flex items-center space-x-2">
                  <CgSortAz className="inline" size={24} />
                  <Dropdown
                    options={sortOptions}
                    value={sortBy}
                    onChange={handleSortChange}
                  />
                </div>
              </div>

              {searchResults.map((result, index) => (
                <Card className="mb-4" key={result.objectID}>
                  <div className="flex">
                    <span className="text-gray-500 mr-2">#{index + 1}</span>
                    <div className="flex flex-col">
                      <Link href={`/${result.slug}`} className="no-underline">
                        <h2 className="m-0 mb-2 text-2xl max-sm:text-lg hover:text-ssw-red">
                          {result.title}
                        </h2>
                      </Link>
                      <h4 className="flex m-0 text-lg max-sm:text-md">
                        <span className="font-medium">{result.lastUpdatedBy || 'Unknown'}</span>
                        {result.lastUpdated && (
                          <div className="flex items-center ml-4 text-gray-500 font-light">
                            <RiTimeFill className="inline mr-1" />
                            <span>{timeAgo(result.lastUpdated)}</span>
                          </div>
                        )}
                      </h4>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
            
        </div>

        <div className="layout-sidebar">
          <div className="h-[3.5rem]">
            {ruleCount && <RuleCount count={ruleCount} />}
          </div>
          <LatestRulesCard rules={latestRulesByUpdated} />
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
