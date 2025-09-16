"use client";

import { Card } from "@/components/ui/card";
import { LatestRule } from "@/models/LatestRule";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import RuleCount from "@/components/RuleCount";
import LatestRulesCard from "@/components/LatestRulesCard";
import WhyRulesCard from "@/components/WhyRulesCard";
import HelpImproveCard from "@/components/HelpImproveCard";
import AboutSSWCard from "@/components/AboutSSWCard";
import JoinConversationCard from "@/components/JoinConversationCard";
import HelpCard from "@/components/HelpCard";

export interface HomeClientPageProps {
  topCategories: any[];
  latestRules: LatestRule[];
  ruleCount: number;
  categoryRuleCounts: Record<string, number>;
}

export default function HomeClientPage(props: HomeClientPageProps) {
  const { topCategories, latestRules, ruleCount, categoryRuleCounts } = props;
  const topCategoriesWithChildren = topCategories.filter(c => c.index);
  const topCategoriesWithoutChildren = topCategories.filter(c => !c.index);

  const getTopCategoryTotal = (subCategories: any[]) => {
    console.log(categoryRuleCounts);
    return subCategories.reduce((total, category) => {
      return total + (categoryRuleCounts[category._sys.filename] || 0);
    }, 0);
  };

  return (
    <>
      <div className="layout-two-columns">
        <div className="layout-main-section">
          <div className="h-[7rem]">
            <SearchBar/>
            <h2 className="m-0 mb-4 text-ssw-red font-bold">Categories</h2>
          </div>

          {topCategoriesWithChildren.map((topCategory, index) => {
            // Calculate total rules across all categories inside this top category
            const totalRules = (topCategory.index || [])
              .map((item: any) => {
                const filename = item.category?._sys.filename;
                return filename ? categoryRuleCounts[filename] || 0 : 0;
              })
              .reduce((sum, count) => sum + count, 0);

            // Skip rendering this top category if it has no rules
            if (totalRules === 0) {
              return null;
            }

            return (
              <Card key={index} className="mb-4">
                <h2 className="flex justify-between m-0 mb-4 text-2xl max-sm:text-lg">
                  <span>{topCategory.title}</span>
                  <span className="text-gray-500 text-lg">
                    {totalRules} Rules
                  </span>
                </h2>

                <ol>
                  {topCategory.index?.map((item: any, subIndex: number) => {
                    const filename = item.category?._sys.filename;
                    const count = categoryRuleCounts[filename] || 0;

                    if (!item.category || count === 0) {
                      return null;
                    }

                    return (
                      <li key={subIndex} className="mb-4">
                        <div className="flex justify-between">
                          <Link href={`/${filename}`}>
                            {item.category.title}
                          </Link>
                          <span className="text-gray-300">{count}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            );
          })}
        </div>

        <div className="layout-sidebar">
          <div className="h-[5.5rem]">
            {ruleCount && <RuleCount count={ruleCount} />}
          </div>
          <LatestRulesCard rules={latestRules} />
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
