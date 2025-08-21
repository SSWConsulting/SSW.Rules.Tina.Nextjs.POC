'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

  const filterTitle = 'Results';
  const queryStringRulesAuthor = searchParams.get('author') || '';

  const normalizeName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/\s*[({[].*?[})\]]/g, '') // Remove anything inside (), [], {} and the (),[],{} themselves
      .replace(/ø/g, 'oe') // replace all 'ø' with 'oe'
      .replace(/\p{Diacritic}/gu, '')
      .trim();
  };

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
    }
  }, [queryStringRulesAuthor]);

  useEffect(() => {
    if (author.fullName) {
      fetchPageData();
    }
  }, [author]);

  const fetchPageData = async (action?: string): Promise<void> => {
    try {
      setLoading(true);
      const searchData = await fetchGithubData(action);
      const resultList = searchData.nodes;
      const extractedFiles = getExtractedFiles(resultList);
      const filteredRules = filterUniqueRules(extractedFiles);
      updateFilteredItems(filteredRules);
    } catch (err) {
      setNotFound(true);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGithubData = async (action?: string): Promise<any> => {
    // This is a mock implementation since we don't have the actual GitHub API setup
    // In a real implementation, you'd use the GitHub GraphQL API
    const githubOwner = process.env.NEXT_PUBLIC_GITHUB_ORG || 'SSWConsulting';
    const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO || 'SSW.Rules.Content';
    const token = process.env.NEXT_PUBLIC_GITHUB_API_PAT;
    const resultPerPage = 40;
    const filesPerPullRequest = 20;

    let cursorQuery = '';
    if (action === ActionTypes.BEFORE) {
      cursorQuery = `before: "${
        previousPageCursor[previousPageCursor.length - 1]
      }"`;
    } else if (action === ActionTypes.AFTER) {
      setPreviousPageCursor([...previousPageCursor, tempCursor]);
      cursorQuery = `after: "${nextPageCursor}"`;
    }

    // Mock response for now - replace with actual GitHub API call
    const mockData = {
      data: {
        search: {
          pageInfo: {
            endCursor: 'mock-cursor',
            startCursor: 'mock-start',
            hasNextPage: false,
          },
          nodes: [],
        },
      },
    };

    if (action === ActionTypes.BEFORE) {
      previousPageCursor.pop();
    }

    const { endCursor, startCursor, hasNextPage } = mockData.data.search.pageInfo;

    setNextPageCursor(endCursor || '');
    setTempCursor(startCursor || '');
    setHasNext(hasNextPage || false);

    return mockData.data?.search;
  };

  const getExtractedFiles = (resultList: any[]): any[] => {
    const extractedFiles: any[] = [];

    for (let i = 0; i < resultList.length; i++) {
      const nodes = [...resultList[i].files.nodes];
      const updatedTime = resultList[i].mergedAt;

      nodes.forEach((path: any) => {
        extractedFiles.push({
          file: {
            node: {
              path: getRulePath(path.path),
              lastUpdated: updatedTime,
            },
          },
        });
      });
    }

    return extractedFiles;
  };

  const getRulePath = (path: string): string => {
    const lastSlashIndex = path.lastIndexOf('/');
    if (
      path.includes('.md') &&
      !path.includes('categories') &&
      lastSlashIndex !== -1
    ) {
      return path.substring(0, lastSlashIndex + 1);
    } else {
      return path;
    }
  };

  const filterUniqueRules = (extractedFiles: any[]): any[] => {
    // Mock rules data - replace with actual data from your CMS
    const mockRules = [
      {
        frontmatter: {
          title: 'Sample Rule 1',
          authors: [{ title: author.fullName }],
        },
        fields: {
          slug: '/sample-rule-1/',
        },
      },
      {
        frontmatter: {
          title: 'Sample Rule 2',
          authors: [{ title: author.fullName }],
        },
        fields: {
          slug: '/sample-rule-2/',
        },
      },
    ];

    const uniqueRuleTitles = new Set();
    const filteredRules = extractedFiles
      .map((r) => {
        const rule = mockRules.find((rule) => {
          const newSlug = rule.fields.slug.slice(
            1,
            rule.fields.slug.length - 5
          );
          return newSlug === r.file.node.path;
        });

        if (rule && !uniqueRuleTitles.has(rule.frontmatter.title)) {
          uniqueRuleTitles.add(rule.frontmatter.title);
          return { item: rule, file: r.file };
        } else {
          return null;
        }
      })
      .filter((result) => result !== null);

    return filteredRules;
  };

  const updateFilteredItems = (filteredRule: any[]): void => {
    const mergedList = [...filteredItems.list];

    filteredRule.forEach((ruleItem) => {
      const isDuplicate = mergedList.some(
        (mergedItem) => mergedItem.file.node.path === ruleItem.file.node.path
      );

      if (!isDuplicate) {
        mergedList.push(ruleItem);
      }
    });

    const acknowledgmentsList = mergedList.filter((ruleItem) => {
      const authorList = ruleItem.item.frontmatter.authors?.flatMap((author: any) =>
        normalizeName(author.title)
      );

      return authorList.includes(author.fullName);
    });

    setNotFound(mergedList.length === 0);
    setNoAuthorRules(acknowledgmentsList.length === 0);
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
                onClick={() => fetchPageData(ActionTypes.AFTER)}
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