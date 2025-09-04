'use client';

import SearchBar from '@/components/SearchBar';
import RuleCount from '@/components/RuleCount';
import WhyRulesCard from '@/components/WhyRulesCard';
import HelpImproveCard from '@/components/HelpImproveCard';
import AboutSSWCard from '@/components/AboutSSWCard';
import JoinConversationCard from '@/components/JoinConversationCard';
import HelpCard from '@/components/HelpCard';
import { LatestRule } from '@/models/LatestRule';

interface LatestRuleClientPageProps {
  ruleCount: number;
  latestRules: LatestRule[];
}

export default function LatestRuleClientPage({ ruleCount, latestRules }: LatestRuleClientPageProps) {

  return (
       <>
          <div className="layout-two-columns">
            <div className="layout-main-section">
              <div className="h-[7rem]">
                <SearchBar showSort={false} />
                <h2 className="m-0 mb-4 text-ssw-red font-bold">Latest Rules</h2>
              </div>
            </div>
    
            <div className="layout-sidebar">
              <div className="h-[5rem]">
                {ruleCount && <RuleCount count={ruleCount} />}
              </div>
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
