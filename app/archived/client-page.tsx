'use client';

import React, { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import RuleCount from "@/components/RuleCount";
import LatestRulesCard from "@/components/LatestRulesCard";
import QuickLinksCard from "@/components/QuickLinksCard";
import WhyRulesCard from "@/components/WhyRulesCard";
import HelpImproveCard from "@/components/HelpImproveCard";
import AboutSSWCard from "@/components/AboutSSWCard";
import JoinConversationCard from "@/components/JoinConversationCard";
import HelpCard from "@/components/HelpCard";
import { Rule } from "@/models/Rule";
import ruleToCategories from "../../rule-to-categories.json";

export interface ArchivedClientPageProps {
  archivedRules: Rule[];
  topCategories: any[];
  latestRules?: any[];
  quickLinks?: any[];
}

export default function ArchivedClientPage(props: ArchivedClientPageProps) {
  const { archivedRules, topCategories, latestRules = [], quickLinks = [] } = props;

  // Group archived rules by category and organize by top categories
  const groupedArchivedData = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    
    // Count archived rules per category
    archivedRules.forEach((rule) => {
      const ruleFilename = rule.uri.replace('/', '').replace('.html', '');
      const categories = ruleToCategories[ruleFilename as keyof typeof ruleToCategories] || [];
      
      if (categories.length === 0) {
        categoryCount['uncategorized'] = (categoryCount['uncategorized'] || 0) + 1;
      } else {
        categories.forEach(category => {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
      }
    });
    
    // Organize by top categories
    const organizedData = topCategories.map(topCategory => {
      const subcategories = topCategory.index
        ?.map((item: any) => {
          if (!item.category) return null;
          const filename = item.category._sys.filename;
          const count = categoryCount[filename] || 0;
          return {
            ...item.category,
            archivedCount: count
          };
        })
        .filter(Boolean) || [];
      
      const totalCount = subcategories.reduce((sum, sub) => sum + sub.archivedCount, 0);
      
      return {
        ...topCategory,
        subcategories,
        totalArchivedCount: totalCount
      };
    }).filter(topCat => topCat.totalArchivedCount > 0);
    
    return { organizedData, totalCount: archivedRules.length };
  }, [archivedRules, topCategories]);

  if (archivedRules.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-xl text-gray-600">No archived rules found.</p>
      </div>
    );
  }

  return (
    <div className="layout-two-columns">
      <div className="layout-main-section">
        <div className="h-[5.5rem]">
          <h2 className="m-0 mb-4 text-ssw-red font-bold">Archived Rules</h2>
        </div>

        {groupedArchivedData.organizedData.map((topCategory, index) => (
          <Card key={index} className="mb-4">
            <h2 className="flex justify-between m-0 mb-4 text-2xl max-sm:text-lg">
              <span>{topCategory.title}</span>
              <span className="text-gray-500 text-lg">
                {topCategory.totalArchivedCount} Archived Rules
              </span>
            </h2>

            <ol>
              {topCategory.subcategories
                .filter((subCategory: any) => subCategory.archivedCount > 0)
                .map((subCategory: any, subIndex: number) => (
                <li key={subIndex} className="mb-4">
                  <div className="flex justify-between">
                    <Link 
                      href={`/${subCategory._sys.filename}?archived=true`} 
                      className="hover:text-ssw-red"
                    >
                      {subCategory.title}
                    </Link>
                    <span className="text-gray-300">
                      {subCategory.archivedCount}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <div className="layout-sidebar">
        <div className="h-[5.5rem]">
          <RuleCount count={groupedArchivedData.totalCount} label="Archived Rules" />
        </div>
        {latestRules.length > 0 && <LatestRulesCard rules={latestRules} />}
        {quickLinks.length > 0 && <QuickLinksCard links={quickLinks} />}
        <WhyRulesCard />
        <HelpImproveCard />
        <HelpCard />
        <AboutSSWCard />
        <JoinConversationCard />
      </div>
    </div>
  );
}