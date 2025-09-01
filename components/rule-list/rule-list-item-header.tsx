'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RiGithubLine, RiPencilLine } from 'react-icons/ri';
import { IconLink } from '@/components/ui';
import Bookmark from '../Bookmark';
import { ICON_SIZE } from '@/constants';

export interface RuleListItemHeaderProps {
  rule: any;
  index: number;
}

const RuleListItemHeader: React.FC<RuleListItemHeaderProps> = ({ rule, index }) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(rule.isBookmarked);

  useEffect(() => {
    setIsBookmarked(rule.isBookmarked);
  }, [rule.isBookmarked]);

  const handleBookmarkToggle = async (newStatus: boolean) => {
    setIsBookmarked(newStatus);
  };

  return (
    <section className='mb-2'>
      <div className="flex items-center flex-col justify-between sm:flex-row">
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-500'>#{index + 1}</span>
          <h2 className="m-0 text-2xl">
            <Link href={`../${rule.uri}`} ref={linkRef} className="no-underline">
              {rule.title}
            </Link>
          </h2>
        </div>

        <div className="profile-rule-buttons flex gap-3 justify-center">
          <Bookmark 
            ruleGuid={rule.guid}
            isBookmarked={isBookmarked}
            onBookmarkToggle={handleBookmarkToggle} />
          <IconLink
            href={`./admin#/~/${rule?.uri}`}
            children={<RiPencilLine size={ICON_SIZE} />}
          />
          <IconLink 
            href={`https://github.com/SSWConsulting/SSW.Rules.Content/blob/main/rules/${rule?.uri}/rule.md`} target="_blank"
            children={<RiGithubLine size={ICON_SIZE} className="rule-icon" />}
          />
         </div>
      </div>
    </section>
  );
};

export default RuleListItemHeader;
