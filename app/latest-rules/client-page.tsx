'use client';

import SearchBar from '@/components/SearchBar';

export default function LatestRuleClientPage() {

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
                
              </div>
    
              
            </div>
          </div>
        </>
  );
}
