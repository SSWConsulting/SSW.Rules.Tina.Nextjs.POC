'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createGitHubService } from "@/lib/services/github";

const ActionTypes = {
  BEFORE: 'before',
  AFTER: 'after',
};

export default function UserRulesClientPage() {
  const searchParams = useSearchParams();
  const [notFound, setNotFound] = useState(false);
  const [noAuthorRules, setNoAuthorRules] = useState(false);
  const [filteredItems, setFilteredItems] = useState<{
    list: any[];
    filter: any;
  }>({ list: [], filter: {} });
  const [author, setAuthor] = useState<{
    fullName?: string;
    slug?: string;
    gitHubUrl?: string;
  }>({});
  const [authorRules, setAuthorRules] = useState<{
    list: any[];
    filter: any;
  }>({
    list: [],
    filter: {},
  });
  const [isAscending, setIsAscending] = useState(true);
  const [previousPageCursor, setPreviousPageCursor] = useState<string[]>([]);
  const [nextPageCursor, setNextPageCursor] = useState('');
  const [tempCursor, setTempCursor] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubService] = useState(() => createGitHubService());

  const queryStringRulesAuthor = searchParams.get('author') || '';

  useEffect(() => {
    if (queryStringRulesAuthor) {
      // For now, we'll set a mock author since we don't have CRM data
      // In a real implementation, you'd fetch this from your data source
      const mockAuthor = {
        fullName: queryStringRulesAuthor,
        slug: queryStringRulesAuthor.toLowerCase().replace(/\s+/g, '-'),
        gitHubUrl: `https://github.com/${queryStringRulesAuthor}`
      };
      setAuthor(mockAuthor);

      fetchGithubData(ActionTypes.AFTER);
    }
  }, [queryStringRulesAuthor]);

  const fetchGithubData = async (action?: string): Promise<any> => {
    try {
      setLoading(true);
      
      let cursor: string | undefined;
      let direction: 'after' | 'before' = 'after';

      if (action === ActionTypes.BEFORE) {
        cursor = previousPageCursor[previousPageCursor.length - 1];
        direction = 'before';
      } else if (action === ActionTypes.AFTER) {
        cursor = nextPageCursor;
        direction = 'after';
      }

      const searchData = await githubService.searchPullRequestsByAuthor(
        queryStringRulesAuthor, 
        cursor, 
        direction
      );

      const resultList = searchData.search.nodes;
      const allRules = resultList
        .flatMap(pr => pr.files.nodes)
        .filter(file => file.path.endsWith('rule.md'));
      const uniqueRules = getUniqueRules(allRules);
      updateFilteredItems(uniqueRules);

      const { endCursor, startCursor, hasNextPage } = searchData.search.pageInfo;
      
      if (action === ActionTypes.AFTER) {
        setPreviousPageCursor([...previousPageCursor, nextPageCursor]);
      } else if (action === ActionTypes.BEFORE) {
        previousPageCursor.pop();
      }

      setNextPageCursor(endCursor || '');
      setTempCursor(startCursor || '');
      setHasNext(hasNextPage || false);

    } catch (error) {
      console.error('Failed to fetch GitHub data:', error);
      setError('Failed to fetch rules data. Please try again later.');
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueRules = (files: any[]) => {
    const uniqueRulesMap = new Map();
    
    files.forEach(file => {
      const path = file.path;
      const ruleName = path.replace(/^rules\//, '').replace(/\/rule\.md$/, '');
      
      if (!uniqueRulesMap.has(ruleName) || 
          new Date(file.lastUpdated) > new Date(uniqueRulesMap.get(ruleName).lastUpdated)) {
        uniqueRulesMap.set(ruleName, file);
      }
    });

    return Array.from(uniqueRulesMap.values());
  }

  // TODO
  const updateFilteredItems = (filteredRule: any[]): void => {
    const mergedList = [...filteredItems.list];

    filteredRule.forEach((ruleItem) => {
      const isDuplicate = mergedList.some(
        (mergedItem) => mergedItem.path === ruleItem.path
      );

      if (!isDuplicate) {
        mergedList.push(ruleItem);
      }
    });

    // For now, we'll set the filtered items directly since we don't have the old structure
    // In a real implementation, you'd need to match these files with your CMS data
    setFilteredItems({ list: mergedList, filter: {} });
    
    // Since we don't have author information in the GitHub data yet,
    // we'll need to implement this differently
    setNotFound(mergedList.length === 0);
    setNoAuthorRules(false); // We'll need to implement this logic differently
  };

  const toggleSortOrder = (order: boolean): void => {
    filteredItems.list?.reverse();
    authorRules.list?.reverse();
    setIsAscending(order);
  };

  if (!queryStringRulesAuthor) {
    return (
      <div className="w-full">
        {/* <Breadcrumb breadcrumbText="User Rules" /> */}
        <div className="container" id="rules">
          <div className="text-center py-8">
            <h2 className="text-ssw-red text-2xl mb-4">No Author Specified</h2>
            <p>Please provide an author parameter in the URL.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* <Breadcrumb
        breadcrumbText={
          author.fullName ? `${author.fullName}'s Rules` : 'User Rules'
        }
      /> */}
      <div className="container" id="rules">
        <div className="flex flex-wrap">
          <div className="w-full lg:w-3/4 px-4">
            {author.fullName && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <h2 className="text-ssw-red">{author.fullName}&#39;s Rules</h2>

                <a
                  href={`https://ssw.com.au/people/${author.slug}/`}
                  className="underline unstyled hover:text-ssw-red"
                >
                  View people profile
                </a>
              </div>
            )}

            <hr className="mt-1 sm:mt-0" />

            <h3 className="text-ssw-red">
              Last Modified ({filteredItems.list.length})
            </h3>

            <div className="rule-index archive no-gutters rounded mb-12">
              {/* <LatestRulesContent
                filteredItems={filteredItems}
                title={filterTitle}
                notFound={notFound}
                isAscending={isAscending}
                setIsAscending={toggleSortOrder}
              /> */}
            </div>

            <h3 className="text-ssw-red">
              Acknowledged ({authorRules.list.length})
            </h3>

            <div className="rule-index archive no-gutters rounded mb-12">
              {/* <LatestRulesContent
                filteredItems={authorRules}
                title={filterTitle}
                notFound={noAuthorRules}
                isAscending={isAscending}
                setIsAscending={(order: boolean) => toggleSortOrder(order)}
              /> */}
            </div>

            <div className="text-center mb-4">
              <button
                className={`m-3 mx-6 p-2 w-32 rounded-md ${
                  hasNext
                    ? 'bg-ssw-red text-white'
                    : 'bg-ssw-grey text-gray-400'
                }`}
                onClick={() => fetchGithubData(ActionTypes.AFTER)}
                disabled={!hasNext || loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          </div>
          <div className="w-full lg:w-1/4 px-4" id="sidebar">
            {/* <SideBar ruleTotalNumber={0} /> */}
          </div>
        </div>
      </div>
    </div>
  );
}