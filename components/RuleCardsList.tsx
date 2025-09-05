import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { RiTimeFill } from 'react-icons/ri';
import { timeAgo } from '@/lib/dateUtils';
import LoadMoreButton from './LoadMoreButton';
import { Rule } from '@/types';

export default function RuleCardsList({
  items,
  loadingInitial,
  loadingMore,
  hasNext,
  onLoadMore,
  emptyText = 'No results found.',
}: {
  items: Rule[];
  loadingInitial: boolean;
  loadingMore: boolean;
  hasNext: boolean;
  onLoadMore: () => void;
  emptyText?: string;
}) {
  if (items.length === 0 && loadingInitial) {
    return <div className="py-4 text-sm text-gray-500">Loading…</div>;
  }

  if (items.length === 0) {
    return <div className="py-4 text-sm text-gray-500">{emptyText}</div>;
  }

  return (
    <>
      {items.map((rule, i) => (
        <Card className="mb-4" key={rule.guid ?? rule.uri}>
          <div className="flex">
            <span className="text-gray-500 mr-2">#{i + 1}</span>
            <div className="flex flex-col">
              <Link href={`/${rule.uri}`} className="no-underline">
                <h2 className="m-0 mb-2 text-2xl max-sm:text-lg hover:text-ssw-red">{rule.title}</h2>
              </Link>
              <h4 className="flex m-0 text-lg max-sm:text-md">
                {rule.lastUpdatedBy && <span className="font-medium">{rule.lastUpdatedBy}</span>}
                {rule.lastUpdated && (
                  <span className="flex items-center ml-4 text-gray-500 font-light">
                    <RiTimeFill className="inline mr-1" />
                    {timeAgo(rule.lastUpdated)}
                  </span>
                )}
              </h4>
            </div>
          </div>
        </Card>
      ))}

      {hasNext && (
        <div className="mt-4 flex justify-center">
          <LoadMoreButton onClick={onLoadMore} disabled={loadingMore} loading={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load More'}
          </LoadMoreButton>
        </div>
      )}
    </>
  );
}
