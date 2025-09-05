'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import client from '@/tina/__generated__/client';
import { RuleListItemHeader } from '@/components/rule-list';
import { normalizeName, toSlug } from '@/lib/utils';
import Breadcrumbs from '@/components/Breadcrumbs';
import HelpCard from '@/components/HelpCard';
import RuleCount from '@/components/RuleCount';
import WhyRulesCard from '@/components/WhyRulesCard';
import HelpImproveCard from '@/components/HelpImproveCard';
import AboutSSWCard from '@/components/AboutSSWCard';
import JoinConversationCard from '@/components/JoinConversationCard';
import { Card } from '@/components/ui/card';
import { RiTimeFill } from 'react-icons/ri';
import { timeAgo } from '@/lib/dateUtils';
import { getUniqueRules } from '@/lib/services/github';

const ActionTypes = {
  BEFORE: 'before',
  AFTER: 'after',
} as const;

const Tabs = {
  LAST_MODIFIED: 'last-modified',
  ACKNOWLEDGMENT: 'acknowledgment',
} as const;

type TabKey = typeof Tabs[keyof typeof Tabs];

export default function UserRulesClientPage({ ruleCount }) {
  const searchParams = useSearchParams();

  const [lastModifiedRules, setLastModifiedRules] = useState<any[]>([]);
  const [authoredRules, setAuthoredRules] = useState<any[]>([]);
  const [author, setAuthor] = useState<{ fullName?: string; slug?: string; gitHubUrl?: string }>({});

  const [previousPageCursor, setPreviousPageCursor] = useState<string[]>([]);
  const [nextPageCursor, setNextPageCursor] = useState('');
  const [hasNext, setHasNext] = useState(false);

  const [loadingLastModified, setLoadingLastModified] = useState(false);
  const [loadingMoreLastModified, setLoadingMoreLastModified] = useState(false);
  const [loadingAuthored, setLoadingAuthored] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>(Tabs.LAST_MODIFIED);

  const queryStringRulesAuthor = searchParams.get('author') || '';

  const AUTHORED_PAGE_SIZE = 10;
  const [authoredNextCursor, setAuthoredNextCursor] = useState<string | null>(null);
  const [authoredHasNext, setAuthoredHasNext] = useState(false);
  const [loadingMoreAuthored, setLoadingMoreAuthored] = useState(false);


  const loadAuthorFromCrm = async (): Promise<string> => {
    try {
      const res = await fetch('/api/crm/employees');
      if (!res.ok) throw new Error('Failed to fetch CRM employees');
      const data = await res.json();
      const employees = Array.isArray(data?.value) ? data.value : [];

      const queryLower = queryStringRulesAuthor.toLowerCase();
      const match = employees.find((e: any) => (e?.gitHubUrl || '').toLowerCase().includes(queryLower));

      if (match) {
        setAuthor({
          fullName: match.fullName,
          slug: toSlug(match.fullName || queryStringRulesAuthor),
          gitHubUrl: match.gitHubUrl,
        });
        return match.fullName as string;
      } else {
        const fullName = normalizeName(queryStringRulesAuthor) || '';
        setAuthor({
          fullName,
          slug: toSlug(queryStringRulesAuthor),
          gitHubUrl: `https://github.com/${queryStringRulesAuthor}`,
        });
        return fullName;
      }
    } catch (err) {
      console.error('Error loading CRM author:', err);
      const fullName = normalizeName(queryStringRulesAuthor) || '';
      setAuthor({
        fullName,
        slug: toSlug(queryStringRulesAuthor),
        gitHubUrl: `https://github.com/${queryStringRulesAuthor}`,
      });
      return fullName;
    }
  };

  const getLastModifiedRules = async (action?: string, opts?: { append?: boolean }) => {
    const append = !!opts?.append;
    try {
      append ? setLoadingMoreLastModified(true) : setLoadingLastModified(true);
  
      let cursor: string | undefined;
      let direction: 'after' | 'before' = 'after';
  
      if (action === ActionTypes.BEFORE) {
        cursor = previousPageCursor[previousPageCursor.length - 1];
        direction = 'before';
      } else if (action === ActionTypes.AFTER) {
        cursor = nextPageCursor;
        direction = 'after';
      }
  
      const params = new URLSearchParams();
      params.set('author', queryStringRulesAuthor);
      if (cursor) params.set('cursor', cursor);
      params.set('direction', direction);
  
      const res = await fetch(`/api/github/rules/prs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch GitHub PR search');
      const prSearchData = await res.json();
  
      const resultList = prSearchData.search.nodes;
      const allRules = resultList
        .flatMap((pr: any) => pr.files.nodes)
        .filter((file: any) => file.path.endsWith('rule.mdx') || file.path.endsWith('rule.md'))
        .map((file: any) => ({
          ...file,
          path: file.path.endsWith('rule.md') ? file.path.slice(0, -3) + '.mdx' : file.path,
        }));
  
      if (allRules.length === 0 && !append) {
        setLastModifiedRules([]);
      } else if (allRules.length > 0) {
        const uniqueRules = getUniqueRules(allRules);
        await updateFilteredItems(uniqueRules, append);
      }
  
      const { endCursor, startCursor, hasNextPage } = prSearchData.search.pageInfo;
  
      if (action === ActionTypes.AFTER) {
        if (nextPageCursor) setPreviousPageCursor([...previousPageCursor, nextPageCursor]);
      } else if (action === ActionTypes.BEFORE) {
        setPreviousPageCursor((prev) => prev.slice(0, -1));
      }
  
      setNextPageCursor(endCursor || '');
      setHasNext(!!hasNextPage);
    } catch (err) {
      console.error('Failed to fetch GitHub data:', err);
    } finally {
      append ? setLoadingMoreLastModified(false) : setLoadingLastModified(false);
    }
  };

  const appendUniqueRules = (prev: any[], next: any[]) => {
    const keyOf = (r: any) => r?.guid || r?.uri;
    const seen = new Set(prev.map(keyOf));
    const merged = [...prev];
    for (const r of next) {
      const k = keyOf(r);
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(r);
      }
    }
    return merged;
  };

  const updateFilteredItems = async (uniqueRules: any[], append = false) => {
    try {
      const uris = Array.from(
        new Set(
          uniqueRules
            .map((b) => b.path.replace(/^rules\//, '').replace(/\/rule\.mdx$/, ''))
            .filter((g): g is string => Boolean(g)),
        ),
      );

      const res = await client.queries.rulesByUriQuery({ uris });
      const edges = res?.data?.ruleConnection?.edges ?? [];
      const byUri = new Map<string, any>(
        edges
          .map((e: any) => e?.node)
          .filter(Boolean)
          .map((n: any) => [n.uri, n]),
      );

      const matchedRules: any[] = uris
        .map((g) => byUri.get(g))
        .filter(Boolean)
        .map((fullRule: any) => ({
          guid: fullRule.guid,
          title: fullRule.title,
          uri: fullRule.uri,
          body: fullRule.body,
          lastUpdated: fullRule.lastUpdated,
          lastUpdatedBy: fullRule.lastUpdatedBy,
          authors:
            fullRule.authors
              ?.map((a: any) => (a && a.title ? { title: a.title } : null))
              .filter((a: any): a is { title: string } => a !== null) || [],
        }));

      setLastModifiedRules((prev) => (append ? appendUniqueRules(prev, matchedRules) : matchedRules));

      if (matchedRules.length !== uniqueRules.length) {
        const foundUris = new Set(matchedRules.map((r) => r.uri));
        const missingUris = uniqueRules
          .map((b) => b.path.replace(/^rules\//, '').replace(/\/rule\.mdx$/, ''))
          .filter((g) => !foundUris.has(g));
        console.warn(`Some bookmarked rules not found:`, missingUris);
      }
    } catch (ruleError) {
      console.error('Error fetching rule data:', ruleError);
      if (!append) setLastModifiedRules([])
    }
  };

  const getAuthoredRules = async (authorName: string, opts?: { append?: boolean }) => {
    const append = !!opts?.append;
    try {
      append ? setLoadingMoreAuthored(true) : setLoadingAuthored(true);
  
      const res = await client.queries.rulesByAuthor({
        authorTitle: authorName || '',
        first: AUTHORED_PAGE_SIZE,
        after: append ? authoredNextCursor : undefined,
      });
  
      const edges = res?.data?.ruleConnection?.edges ?? [];
      const nodes = edges.map((e: any) => e?.node).filter(Boolean);
  
      const pageInfo = res?.data?.ruleConnection?.pageInfo;
      setAuthoredNextCursor(pageInfo?.endCursor ?? null);
      setAuthoredHasNext(!!pageInfo?.hasNextPage);
  
      const batch = nodes.map((fullRule: any) => ({
        guid: fullRule.guid,
        title: fullRule.title,
        uri: fullRule.uri,
        body: fullRule.body,
        authors:
          fullRule.authors
            ?.map((a: any) => (a && a.title ? { title: a.title } : null))
            .filter((a: any): a is { title: string } => a !== null) || [],
        lastUpdated: fullRule.lastUpdated,
        lastUpdatedBy: fullRule.lastUpdatedBy
      }));
  
      setAuthoredRules((prev) => (append ? appendUniqueRules(prev, batch) : batch));
    } finally {
      append ? setLoadingMoreAuthored(false) : setLoadingAuthored(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (queryStringRulesAuthor) {
        const [_, resolvedAuthorName] = await Promise.all([getLastModifiedRules(ActionTypes.AFTER), loadAuthorFromCrm()]);
        await getAuthoredRules(resolvedAuthorName as string);
      }
    })();
  }, [queryStringRulesAuthor]);

  const handleLoadMoreLastModified = () => {
    if (loadingMoreLastModified || !hasNext) return;
    getLastModifiedRules(ActionTypes.AFTER, { append: true });
  };

  const handleLoadMoreAcknowledgment = () => {
    if (loadingMoreAuthored || !authoredHasNext) return;
    getAuthoredRules(author.fullName || '', { append: true });
  };

  const TabHeader = () => (
    <div role="tablist" aria-label="User Rules Tabs" className="flex items-center gap-2 mt-2 mb-4">
      {[
        { key: Tabs.LAST_MODIFIED, label: `Last Modified (${lastModifiedRules.length})` },
        { key: Tabs.ACKNOWLEDGMENT, label: `Acknowledgment (${authoredRules.length})` },
      ].map((t) => {
        const isActive = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(t.key)}
            className={[
              'group px-4 py-1 text-sm border rounded cursor-pointer hover:text-white transition-colors',
              'hover:bg-ssw-red/100 hover:text-white hover:cursor-pointer',
              isActive
                ? 'bg-ssw-red text-white shadow-sm'
                : 'bg-white hover:text-ssw-red',
            ].join(' ')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  const LoadMoreButton = ({
    onClick,
    disabled,
    loading,
    children,
  }: {
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    children?: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition shadow-sm',
        disabled
          ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
          : 'border-ssw-red bg-ssw-red text-white hover:bg-ssw-red/90 hover:cursor-pointer',
      ].join(' ')}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
        </svg>
      )}
      {children ?? 'Load More'}
    </button>
  );

  return (
    <>
      <Breadcrumbs breadcrumbText={author?.fullName ? `${author.fullName}'s Rules` : 'User Rules'} />

      <div className="layout-two-columns">
        <div className="layout-main-section">
          {author.fullName && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
              <h2 className="text-ssw-red">{author.fullName}&#39;s Rules</h2>
              <a href={`https://ssw.com.au/people/${author.slug}/`} className="underline unstyled hover:text-ssw-red">
                View people profile
              </a>
            </div>
          )}

          <TabHeader />

          <div className="rounded-lg border border-gray-100 bg-white p-4">
            {activeTab === Tabs.LAST_MODIFIED && (
              <div>
                {lastModifiedRules.length === 0 && loadingLastModified && (
                  <div className="py-4 text-sm text-gray-500">Loading last modified…</div>
                )}

                {lastModifiedRules.length > 0 && (
                  <>
                    {lastModifiedRules.map((rule, i) => (
                      <Card className="mb-4" key={rule.id}>
                        <div className=" flex">
                          <span className="text-gray-500 mr-2">#{i + 1}</span>
                          <div className="flex flex-col">
                            <Link href={`/${rule.uri}`} className="no-underline">
                            <h2 className="m-0 mb-2 text-2xl max-sm:text-lg hover:text-ssw-red">{rule.title}</h2>
                            </Link>
                            <h4 className="flex m-0 text-lg max-sm:text-md">
                              <span className="font-medium"> {rule.lastUpdatedBy}</span>
                              {rule.lastUpdated ? (
                                <div className="flex items-center ml-4 text-gray-500 font-light">
                                  <RiTimeFill className="inline mr-1" />
                                  <span>{timeAgo(rule.lastUpdated)}</span>
                                </div>
                              ) : (
                                ""
                              )}
                            </h4>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {hasNext && (
                      <div className="mt-4 flex justify-center">
                        <LoadMoreButton
                          onClick={handleLoadMoreLastModified}
                          disabled={loadingMoreLastModified}
                          loading={loadingMoreLastModified}
                        >
                          {loadingMoreLastModified ? 'Loading…' : 'Load More'}
                        </LoadMoreButton>
                      </div>
                    )}
                  </>
                )}

                {!loadingLastModified && lastModifiedRules.length === 0 && (
                  <div className="py-4 text-sm text-gray-500">No results found.</div>
                )}
              </div>
            )}

            {activeTab === Tabs.ACKNOWLEDGMENT && (
              <div>
                {loadingAuthored && <div className="py-4 text-sm text-gray-500">Loading authored…</div>}

                {!loadingAuthored && authoredRules.length > 0 && (
                  <>
                    {authoredRules.map((rule, i) => (
                      <Card className="mb-4" key={rule.id}>
                        <div className=" flex">
                          <span className="text-gray-500 mr-2">#{i + 1}</span>
                          <div className="flex flex-col">
                            <Link href={`/${rule.uri}`} className="no-underline">
                            <h2 className="m-0 mb-2 text-2xl max-sm:text-lg hover:text-ssw-red">{rule.title}</h2>
                            </Link>
                            <h4 className="flex m-0 text-lg max-sm:text-md">
                              <span className="font-medium"> {rule.lastUpdatedBy}</span>
                              {rule.lastUpdated ? (
                                <div className="flex items-center ml-4 text-gray-500 font-light">
                                  <RiTimeFill className="inline mr-1" />
                                  <span>{timeAgo(rule.lastUpdated)}</span>
                                </div>
                              ) : (
                                ""
                              )}
                            </h4>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {authoredHasNext && (
                      <div className="mt-4 flex justify-center">
                        <LoadMoreButton
                          onClick={handleLoadMoreAcknowledgment}
                          disabled={loadingMoreAuthored}
                          loading={loadingMoreAuthored}
                        >
                          {loadingMoreAuthored ? 'Loading…' : 'Load More'}
                        </LoadMoreButton>
                      </div>
                    )}
                  </>
                )}

                {!loadingAuthored && authoredRules.length === 0 && (
                  <div className="py-4 text-sm text-gray-500">No results found.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="layout-sidebar">
          <div className="h-[3.5rem]">
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
