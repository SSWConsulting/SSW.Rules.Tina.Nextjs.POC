'use client';

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RuleList from "@/components/rule-list";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { BookmarkService } from "@/lib/bookmarkService";
import { useAuth } from "@/components/auth/UserClientProvider";
import { Rule } from "@/models/Rule";

export interface OrphanedClientPageProps {
  orphanedRules: Rule[];
}

export default function OrphanedClientPage(props: OrphanedClientPageProps) {
  const { orphanedRules } = props;

  const { user, isLoading: authLoading } = useAuth();
  const [annotatedRules, setAnnotatedRules] = useState<any[]>([]);
  const [rightSidebarRules, setRightSidebarRules] = useState<any[]>([]);
  const [bookmarkedGuids, setBookmarkedGuids] = useState<string[]>([]);

  // Fetch user bookmarks as soon as auth is ready
  useEffect(() => {
    let cancelled = false;
    async function fetchBookmarks() {
      if (authLoading) return;
      if (!user?.sub) {
        setBookmarkedGuids([]);
        return;
      }
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setBookmarkedGuids([]);
          return;
        }
        const bookmarkResult: any = await BookmarkService.getUserBookmarks(user.sub, accessToken);
        const guids: string[] = (bookmarkResult?.bookmarkedRules || []).map((b: any) => b?.ruleGuid).filter((g: any): g is string => Boolean(g));
        if (!cancelled) setBookmarkedGuids(guids);
      } catch {
        if (!cancelled) setBookmarkedGuids([]);
      }
    }
    fetchBookmarks();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.sub]);

  // Derive annotated rules when baseRules or bookmarks change
  useEffect(() => {
    if (!orphanedRules || orphanedRules.length === 0) {
      setAnnotatedRules([]);
      setRightSidebarRules([]);
      return;
    }
    const bookmarkSet = new Set(bookmarkedGuids);
    
    const updated = orphanedRules.map((r: any) => ({
      ...r,
      isBookmarked: r?.guid ? bookmarkSet.has(r.guid) : false,
    }));
    setAnnotatedRules(updated);
    setRightSidebarRules(updated);
  }, [orphanedRules, bookmarkedGuids]);

  return (
    <div>
      <div className="flex">
        <div className="w-full lg:w-2/3 bg-white pt-4 p-6 rounded shadow">
          <h1 className="m-0 mb-2 text-ssw-red font-bold">Orphaned Rules</h1>
          
          {/* Warning alert card */}
          <div className="bg-red-600 text-white p-4 rounded mb-4 flex items-center">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>The rules listed below have no parent category</span>
          </div>

          <RuleList 
            rules={annotatedRules} 
            type="orphaned" 
            noContentMessage="No orphaned rules found."
          />
        </div>
        <div className="hidden lg:w-1/3 lg:block md:hidden p-6 pr-0">
          <ol className="border-l-3 border-gray-300 pl-6">
            {rightSidebarRules.map((rule, index) => (
              <li key={`sidebar-${rule.guid}-${index}`} className="py-1 ml-4">
                <Link href={rule.uri} className="text-gray-700 hover:text-ssw-red">
                  {rule.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}