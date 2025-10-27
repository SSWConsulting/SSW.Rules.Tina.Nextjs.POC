"use client";
import React, { useState, useMemo, useRef } from 'react';
import RuleListItem from './rule-list-item';
import RadioButton from '@/components/radio-button';
import { RiPencilLine, RiGithubLine } from 'react-icons/ri';
import { RuleListFilter } from '@/types/ruleListFilter';
import { IconLink } from '../ui';
import { ICON_SIZE } from '@/constants';
import Pagination from '@/components/ui/pagination';

export interface RuleListProps {
  categoryUri?: string;
  rules: any[];
  type?: string;
  noContentMessage?: string;
  onBookmarkRemoved?: (ruleGuid: string) => void;
  includeArchived?: boolean;
  onIncludeArchivedChange?: (include: boolean) => void;
  showPagination?: boolean;
  showFilterControls?: boolean;
  initialFilter?: RuleListFilter;
  initialPage?: number;
  initialItemsPerPage?: number;
}

const RuleList: React.FC<RuleListProps> = ({ 
  categoryUri, 
  rules, 
  type, 
  noContentMessage, 
  onBookmarkRemoved, 
  includeArchived = false, 
  onIncludeArchivedChange, 
  showPagination = true, 
  showFilterControls = true,
  initialFilter = RuleListFilter.Blurb,
  initialPage = 1,
  initialItemsPerPage = 10
}) => {
  const [filter, setFilter] = useState<RuleListFilter>(initialFilter);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const filterSectionRef = useRef<HTMLDivElement>(null);

  const displayItemsPerPage = useMemo(
    () => (showPagination ? itemsPerPage : rules.length),
    [showPagination, itemsPerPage, rules.length]
  );

  const totalPages = displayItemsPerPage >= rules.length ? 1 : Math.ceil(rules.length / displayItemsPerPage);

  const paginatedRules = useMemo(() => {
    if (displayItemsPerPage >= rules.length) {
      return rules; // Show all rules
    }
    const startIndex = (currentPage - 1) * displayItemsPerPage;
    const endIndex = startIndex + displayItemsPerPage;
    return rules.slice(startIndex, endIndex);
  }, [rules, currentPage, displayItemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to just above the filter options when page changes
    setTimeout(() => {
      if (filterSectionRef.current) {
        const rect = filterSectionRef.current.getBoundingClientRect();
        const offsetTop = window.pageYOffset + rect.top - 5; // 5px above the filter section
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
      }
    }, 50); // Small delay to ensure DOM is updated
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value as RuleListFilter);
  };

  const handleIncludeArchivedChange = (include: boolean) => {
    setCurrentPage(1); // Reset to first page when toggling archived
    if (onIncludeArchivedChange) {
      onIncludeArchivedChange(include);
    }
  };

  if (rules.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-xl text-gray-600">{noContentMessage || 'No rules found.'}</p>
      </div>
    );
  }

  return (
    <>
      <div ref={filterSectionRef} className="flex flex-col-reverse justify-between items-center mt-2 sm:flex-row sm:mt-0">
        <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 py-4 text-center lg:grid-cols-5">
          {showFilterControls && (
            <div className="flex items-center">
              <span className="mr-4 hidden sm:block">Show Me</span>
              <RadioButton
                id="customRadioInline1"
                value="titleOnly"
                selectedOption={filter}
                handleOptionChange={handleOptionChange}
                labelText="Titles"
                position='first'
              />
              <RadioButton id="customRadioInline3" value="blurb" selectedOption={filter} handleOptionChange={handleOptionChange} labelText="Blurbs" position='middle'/>
              <RadioButton id="customRadioInline2" value="all" selectedOption={filter} handleOptionChange={handleOptionChange} labelText="Everything" position='last'/>
            </div>
          )}
          
          {onIncludeArchivedChange && (
            <label className="flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-gray-50 transition-colors bg-white sm:ml-2">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => handleIncludeArchivedChange(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded focus:ring-ssw-red focus:ring-2 accent-ssw-red"
              />
              <span className="text-gray-700">Include Archived</span>
            </label>
          )}

          {showFilterControls && (<span className="mx-3 hidden sm:block">{rules.length} Rules</span>)}
        </div>
        {type === 'category' && (
          <div className="hidden md:flex gap-2">
            <IconLink
              href={`admin/index.html#/collections/edit/category/${categoryUri?.slice(0, -4)}`}
              title="Edit category"
              tooltipOpaque={true}
              children={<RiPencilLine size={ICON_SIZE} />}
            />
            <IconLink
              href={`https://github.com/SSWConsulting/SSW.Rules.Content/blob/${process.env.NEXT_PUBLIC_TINA_BRANCH}/categories/${categoryUri}`}
              target="_blank"
              title="View category on GitHub"
              tooltipOpaque={true}
              children={<RiGithubLine size={ICON_SIZE} className="rule-icon" />}
            />
          </div>
        )}
      </div>

      <ol className="flex flex-col justify-between gap-2 p-0 list-none">
        {paginatedRules.map((rule, i) => (
          <RuleListItem 
            key={`${rule.guid}-${rule.uri}-${(currentPage - 1) * itemsPerPage + i}`} 
            rule={rule} 
            index={(currentPage - 1) * itemsPerPage + i} 
            onBookmarkRemoved={onBookmarkRemoved} 
            filter={filter} 
          />
        ))}
      </ol>

      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={rules.length}
          itemsPerPage={displayItemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </>
  );
};

export default RuleList;
