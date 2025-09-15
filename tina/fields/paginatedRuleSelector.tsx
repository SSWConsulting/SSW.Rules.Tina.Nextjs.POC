"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Button, wrapFieldsWithMeta } from "tinacms";
import { BiChevronRight, BiChevronLeft, BiChevronDown, BiSearch } from "react-icons/bi";
import { GoCircleSlash } from "react-icons/go";
import {
  Popover,
  PopoverButton,
  Transition,
  PopoverPanel,
} from "@headlessui/react";
import { client } from "../__generated__/client";
import type { RuleConnectionQuery, RuleConnectionQueryVariables } from "../__generated__/types";

interface Rule {
  id: string;
  title: string;
  uri: string;
  _sys: {
    relativePath: string;
  };
}

const RULES_PER_PAGE = 25;

export const PaginatedRuleSelectorInput = wrapFieldsWithMeta(({ input }) => {
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [startCursor, setStartCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // For reference field, input.value is a single rule path string
  const selectedRule = useMemo(() => {
    return input.value || null;
  }, [input.value]);

  const fetchRules = async (searchFilter: string = "", after?: string, before?: string, reset: boolean = false) => {
    setLoading(true);
    try {
      const ruleFilter = searchFilter.trim() ? {
        title: {
          startsWith: searchFilter
        }
      } : undefined;

      const variables: RuleConnectionQueryVariables = {
        first: after || !before ? RULES_PER_PAGE : undefined,
        last: before && !after ? RULES_PER_PAGE : undefined,
        after: after || undefined,
        before: before || undefined,
        filter: ruleFilter
      };

      console.log("Fetching rules with variables:", variables);
      
      const query = `
        query ruleConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: RuleFilter) {
          ruleConnection(
            before: $before
            after: $after
            first: $first
            last: $last
            sort: $sort
            filter: $filter
          ) {
            totalCount
            pageInfo {
              hasPreviousPage
              hasNextPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                title
                uri
                _sys {
                  relativePath
                }
              }
            }
          }
        }
      `;

      const response = await client.request({
        query,
        variables
      });
      console.log("Rules response:", response);
      
      if (response?.data?.ruleConnection) {
        const connection = response.data.ruleConnection;
        const newRules = connection.edges?.map(edge => ({
          id: edge?.node?.id || "",
          title: edge?.node?.title || "",
          uri: edge?.node?.uri || "",
          _sys: {
            relativePath: edge?.node?._sys?.relativePath || ""
          }
        })).filter(rule => rule.id) || [];

        console.log("Processed rules:", newRules, "Total:", newRules.length);

        if (reset) {
          setRules(newRules);
          setCurrentPage(1);
        } else {
          setRules(newRules);
        }

        setHasNextPage(connection.pageInfo.hasNextPage);
        setHasPreviousPage(connection.pageInfo.hasPreviousPage);
        setEndCursor(connection.pageInfo.endCursor);
        setStartCursor(connection.pageInfo.startCursor);
        setTotalCount(connection.totalCount);
      }
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 500);

    return () => clearTimeout(timer);
  }, [filter]);

  // Initial load
  useEffect(() => {
    fetchRules();
  }, []);

  // Refetch when debounced filter changes
  useEffect(() => {
    if (debouncedFilter !== filter) return; // Only when debounce is complete
    
    setCurrentPage(1);
    setEndCursor(null);
    setStartCursor(null);
    fetchRules(debouncedFilter, undefined, undefined, true);
  }, [debouncedFilter]);

  // Since we're now filtering server-side, we don't need client-side filtering
  const filteredRules = rules;

  const handleRuleSelect = (rule: Rule) => {
    const rulePath = `rules/${rule._sys.relativePath}`;
    input.onChange(rulePath);
  };

  const handleClearSelection = () => {
    input.onChange("");
  };

  const handleNextPage = () => {
    if (hasNextPage && endCursor) {
      setCurrentPage(prev => prev + 1);
      fetchRules(debouncedFilter, endCursor);
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage && startCursor) {
      setCurrentPage(prev => Math.max(1, prev - 1));
      fetchRules(debouncedFilter, undefined, startCursor);
    }
  };

  // Find the selected rule details for display
  const selectedRuleDetails = useMemo(() => {
    if (!selectedRule) return null;
    const rulePath = selectedRule.replace('rules/', '');
    return filteredRules.find(rule => rule._sys.relativePath === rulePath);
  }, [selectedRule, filteredRules]);

  const labelText = selectedRuleDetails 
    ? selectedRuleDetails.title
    : selectedRule 
      ? selectedRule.split('/').at(-1)?.replace('.mdx', '') || "Selected rule"
      : "Select a rule";

  return (
    <div className="relative z-[1000]">
      <input type="hidden" id={input.name} {...input} />
      <Popover>
        {({ open }) => (
          <>
            <PopoverButton>
              <Button
                className="text-sm h-11 px-4 justify-between w-full"
                size="custom"
                rounded="full"
                variant={open ? "secondary" : "white"}
              >
                <span>{labelText}</span>
                <BiChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </Button>
            </PopoverButton>
            <div
              className="absolute w-full min-w-[600px] max-w-4xl -bottom-2 left-0 translate-y-full z-[1000]"
            >
              <Transition
                enter="transition duration-150 ease-out"
                enterFrom="transform opacity-0 -translate-y-2"
                enterTo="transform opacity-100 translate-y-0"
                leave="transition duration-75 ease-in"
                leaveFrom="transform opacity-100 translate-y-0"
                leaveTo="transform opacity-0 -translate-y-2"
              >
                <PopoverPanel className="relative overflow-hidden rounded-lg shadow-lg bg-white border border-gray-150 z-50">
                  {({ close }) => (
                    <div className="max-h-[400px] flex flex-col w-full">
                      {/* Search header */}
                      <div className="bg-gray-50 p-3 border-b border-gray-100 z-10 shadow-sm">
                        <div className="relative">
                          <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            className="bg-white text-sm rounded-sm border border-gray-100 shadow-inner py-2 pl-10 pr-3 w-full block placeholder-gray-400"
                            onClick={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                            }}
                            value={filter}
                            onChange={(event) => {
                              setFilter(event.target.value);
                            }}
                            placeholder="Search rules..."
                          />
                        </div>
                        {selectedRule && (
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-gray-600">
                              Current: {selectedRuleDetails?.title || "Selected rule"}
                            </span>
                            <button
                              onClick={handleClearSelection}
                              className="text-xs text-blue-500 hover:text-blue-700"
                            >
                              Clear selection
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Loading state */}
                      {loading && (
                        <div className="p-4 text-center text-gray-500">
                          Loading rules...
                        </div>
                      )}

                      {/* Empty state */}
                      {!loading && filteredRules.length === 0 && (
                        <div className="p-4 text-center text-gray-400">
                          {filter ? "No rules found matching your search" : "No rules available"}
                        </div>
                      )}

                      {/* Rules list */}
                      {!loading && filteredRules.length > 0 && (
                        <div className="flex-1 overflow-y-auto">
                          {filteredRules.map((rule) => {
                            const rulePath = `rules/${rule._sys.relativePath}`;
                            const isSelected = selectedRule === rulePath;
                            
                            return (
                              <button
                                key={rule.id}
                                className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors block ${
                                  isSelected ? 'bg-blue-50 border-blue-200' : ''
                                }`}
                                onClick={() => {
                                  handleRuleSelect(rule);
                                  close();
                                }}
                              >
                                <div className="flex items-start space-x-3 w-full">
                                  <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isSelected 
                                      ? 'bg-blue-500 border-blue-500' 
                                      : 'border-gray-300 hover:border-gray-400'
                                  }`}>
                                    {isSelected && (
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="font-medium text-gray-900 text-sm leading-5 mb-1 break-words">
                                      {rule.title}
                                    </div>
                                    <div className="text-xs text-gray-500 leading-4 break-words">
                                      {rule.uri}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Pagination footer */}
                      {!loading && rules.length > 0 && (
                        <div className="bg-gray-50 p-3 border-t border-gray-100 flex items-center justify-between">
                          <div className="text-xs text-gray-600">
                            Page {currentPage} • {totalCount} total rules
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handlePreviousPage}
                              disabled={!hasPreviousPage}
                              className={`p-1 rounded ${
                                hasPreviousPage 
                                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200' 
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                            >
                              <BiChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleNextPage}
                              disabled={!hasNextPage}
                              className={`p-1 rounded ${
                                hasNextPage 
                                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200' 
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                            >
                              <BiChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </PopoverPanel>
              </Transition>
            </div>
          </>
        )}
      </Popover>
    </div>
  );
});