'use client';

import React from 'react';
import { RiArrowRightCircleFill } from 'react-icons/ri';
import { Rule } from '@/types';
import RuleListItemHeader from './rule-list-item-header';
import { IconLink } from '@/components/ui';

export interface RuleListItemProps {
  rule: Rule;
  viewStyle: string;
  type: string;
  onBookmarkRemoved?: (ruleGuid: string) => void;
}

const RuleListItem: React.FC<RuleListItemProps> = ({ rule, viewStyle, type, onBookmarkRemoved }) => {

  return (
    <div className="mb-3">
      <li key={rule.guid}>
        <RuleListItemHeader 
          rule={rule} 
          type={type} 
          onBookmarkRemoved={onBookmarkRemoved}
        />
        
        <section className={`p-4 ${viewStyle === 'blurb' ? 'visible' : 'hidden'}`}>
          <div dangerouslySetInnerHTML={{ __html: rule.excerpt || '' }} />
            <IconLink href={`/${rule.uri}`}
                title={`Read more about ${rule.title}`}
                className="my-5">
                <RiArrowRightCircleFill className="inline mr-1" />
                Read more
            </IconLink>
        </section>
        
        <section className={`rule-content px-4 mb-4 ${viewStyle === 'all' ? 'visible' : 'hidden'}`}>
          {/* TODO: Implement markdown rendering */}
          <p>Full content view - implement markdown rendering</p>
        </section>
      </li>
    </div>
  );
};

export default RuleListItem;
