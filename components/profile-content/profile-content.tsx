'use client';

import React, { useEffect, useState } from 'react';
import { Rule } from '@/types';
import RuleList from '@/components/rule-list';

interface ProfileContentProps {
  data: any; // TODO: Define proper data structure
  setBookmarkedRulesCount: (count: number) => void;
}

const ProfileContent: React.FC<ProfileContentProps> = (props) => {
  const [bookmarkedRules, setBookmarkedRules] = useState<Rule[]>([]);

  // TODO: Replace with actual Auth0 and service hooks
  const isAuthenticated = true; // Placeholder
  const user = { sub: 'placeholder-user-id' }; // Placeholder



  function getBookmarkList() {
    // TODO: Implement actual bookmark fetching logic
    console.log('Fetching bookmarks for user:', user.sub);
    
    // Placeholder: simulate fetching bookmarks
    const mockBookmarkedRules: Rule[] = [
      {
        guid: '1',
        title: 'Sample Rule 1',
        uri: 'sample-rule-1',
        excerpt: 'This is a sample rule excerpt...',
        htmlAst: null
      },
      {
        guid: '2',
        title: 'Sample Rule 2',
        uri: 'sample-rule-2',
        excerpt: 'Another sample rule excerpt...',
        htmlAst: null
      }
    ];
    
    setBookmarkedRules(mockBookmarkedRules);
    props.setBookmarkedRulesCount(mockBookmarkedRules.length);
  }

  const handleBookmarkRemoved = (ruleGuid: string) => {
    setBookmarkedRules(prevRules => prevRules.filter(rule => rule.guid !== ruleGuid));
    props.setBookmarkedRulesCount(bookmarkedRules.length - 1);
  };

  useEffect(() => {
    if (isAuthenticated) {
      getBookmarkList();
    }
  }, [isAuthenticated]);

  return (
    <>
      {bookmarkedRules ? (
        <RuleList
          rules={bookmarkedRules}
          type={'bookmark'}
          noContentMessage="No bookmarks? Use them to save rules for later!"
          onBookmarkRemoved={handleBookmarkRemoved}
        />
      ) : (
        <p className="no-content-message">Loading...</p>
      )}
    </>
  );
};





export default ProfileContent;
