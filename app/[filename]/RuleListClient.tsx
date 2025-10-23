'use client';

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RuleList from "@/components/rule-list";

interface Props {
  initialRules: any[];
  categoryUri?: string;
  initialIncludeArchived: boolean;
}

export default function RuleListClient({ initialRules, categoryUri, initialIncludeArchived }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [includeArchived, setIncludeArchived] = useState(initialIncludeArchived);
  const [bookmarkedGuids, setBookmarkedGuids] = useState<string[]>([]);
  const bookmarkSet = useMemo(() => new Set(bookmarkedGuids), [bookmarkedGuids]);

  useEffect(() => {
    const fromUrl = searchParams.get('archived') === 'true';
    setIncludeArchived(fromUrl);
  }, [searchParams]);

  // useEffect(() => {
  //   let cancelled = false;
  //   async function fetchBookmarks() {
  //     if (authLoading) return;
  //     if (!user?.sub) {
  //       setBookmarkedGuids([]);
  //       return;
  //     }
  //     try {
  //       // const accessToken = await getAccessToken();
  //       const accessToken = null
  //       if (!accessToken) {
  //         setBookmarkedGuids([]);
  //         return;
  //       }
  //       const bookmarkResult: any = await BookmarkService.getUserBookmarks(user.sub, accessToken);
  //       const guids: string[] = (bookmarkResult?.bookmarkedRules || [])
  //         .map((b: any) => b?.ruleGuid)
  //         .filter((g: any): g is string => Boolean(g));
  //       if (!cancelled) setBookmarkedGuids(guids);
  //     } catch {
  //       if (!cancelled) setBookmarkedGuids([]);
  //     }
  //   }
  //   fetchBookmarks();
  //   return () => { cancelled = true; };
  // }, [authLoading, user?.sub]);

  const enhancedRules = useMemo(() => {
    return (initialRules || []).map((r: any) => ({
      ...r,
      isBookmarked: r?.guid ? bookmarkSet.has(r.guid) : false,
    }));
  }, [initialRules, bookmarkSet]);

  return (
    <RuleList
      rules={enhancedRules}
      categoryUri={categoryUri}
      type="category"
      includeArchived={includeArchived}
      onIncludeArchivedChange={(next) => {
        setIncludeArchived(next);
        const sp = new URLSearchParams(Array.from(searchParams.entries()));
        if (next) sp.set('archived','true'); else sp.delete('archived');
        router.replace(`?${sp.toString()}`);
      }}
    />
  );
}
