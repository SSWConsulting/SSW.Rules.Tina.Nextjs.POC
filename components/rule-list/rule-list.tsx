'use client';

import React, { useState } from 'react';
import { Rule } from '@/types';
import RuleListItem from './rule-list-item';
import RadioButton from '@/components/radio-button';
import { RiFileTextFill, RiBookOpenFill, RiDoubleQuotesL } from 'react-icons/ri';

export interface RuleListProps {
  rules: any[];
  type: string;
  noContentMessage?: string;
  onBookmarkRemoved?: (ruleGuid: string) => void;
}

const RuleList: React.FC<RuleListProps> = ({ rules, type, noContentMessage, onBookmarkRemoved }) => {
  const [viewStyle, setViewStyle] = useState<'titleOnly' | 'blurb' | 'all'>('titleOnly');
  const iconSize = 24;

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setViewStyle(e.target.value as 'titleOnly' | 'blurb' | 'all');
  };

  return (
    <>
      <div className="flex justify-center gap-8 border-b border-solid border-b-gray-100 p-4 text-center lg:grid-cols-5">
        <RadioButton
          id="customRadioInline1"
          name="customRadioInline1"
          value="titleOnly"
          selectedOption={viewStyle}
          handleOptionChange={handleOptionChange}
          labelText="View titles only"
          icon={<RiDoubleQuotesL size={iconSize} />}
        />
        <RadioButton
          id="customRadioInline3"
          name="customRadioInline1"
          value="blurb"
          selectedOption={viewStyle}
          handleOptionChange={handleOptionChange}
          labelText="Show blurb"
          icon={<RiFileTextFill size={iconSize} />}
        />
        <RadioButton
          id="customRadioInline2"
          name="customRadioInline1"
          value="all"
          selectedOption={viewStyle}
          handleOptionChange={handleOptionChange}
          labelText="Gimme everything!"
          icon={<RiBookOpenFill size={iconSize} />}
        />
      </div>
      
      {rules.length === 0 ? (
        <>
          <div className="no-content-message">
            <p className="no-tagged-message">
              {noContentMessage || (type === 'bookmark' ? 'No bookmarks? Use them to save rules for later!' : 'No rules found.')}
            </p>
          </div>
        </>
      ) : (
        <div className="p-12">
          <ol className="rule-number">
            {rules.map((rule) => (
              <RuleListItem
                key={rule.guid}
                rule={rule}
                viewStyle={viewStyle}
                type={type}
                onBookmarkRemoved={onBookmarkRemoved}
              />
            ))}
          </ol>
        </div>
      )}
    </>
  );
};

export default RuleList;
