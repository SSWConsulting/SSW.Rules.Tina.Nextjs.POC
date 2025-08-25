'use client';

import { useUser, getAccessToken } from '@auth0/nextjs-auth0';
import React, { useState, useEffect } from 'react';
import RuleList from '@/components/rule-list';
import { BookmarkedRule, UserBookmarksResponse, Rule } from '@/types';
import { BookmarkService } from '@/lib/bookmarkService';
import client from '@/tina/__generated__/client';
import Image from 'next/image';
import { RiGithubFill, RiBookmarkFill } from 'react-icons/ri';

interface ProfileData {
  [key: string]: any;
}

interface ProfileClientPageProps {
  data?: ProfileData;
}

export default function ProfileClientPage({ data }: ProfileClientPageProps) {
  const [bookmarkedRules, setBookmarkedRules] = useState<BookmarkedRule[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const { user, isLoading: authLoading } = useUser();
  const isAuthenticated = !!user;

  async function getBookmarkList() {
    if (!user?.sub) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        console.error('No access token available');
        setIsLoading(false);
        return;
      }

      const bookmarkResult: UserBookmarksResponse = await BookmarkService.getUserBookmarks(user.sub, accessToken);
      
      if (!bookmarkResult.error && bookmarkResult.bookmarkedRules) {
        setBookmarkedRules(bookmarkResult.bookmarkedRules);
        setBookmarkCount(bookmarkResult.bookmarkedRules.length);
        
        if (bookmarkResult.bookmarkedRules.length > 0) {
          try {
            const allRulesResponse = await client.queries.ruleConnection();
            const allRules = allRulesResponse?.data?.ruleConnection?.edges || [];
            
            const matchedRules: any[] = [];
            bookmarkResult.bookmarkedRules.forEach(bookmark => {
              const fullRule = allRules.find(edge => edge?.node?.guid === bookmark.ruleGuid)?.node;
              if (fullRule && fullRule.guid && fullRule.title && fullRule.uri) {
                matchedRules.push({
                  guid: fullRule.guid,
                  title: fullRule.title,
                  uri: fullRule.uri,
                  body: fullRule.body,
                  authors: fullRule.authors?.map(author => author && author.title ? { title: author.title } : null).filter((author): author is { title: string } => author !== null) || [],
                });
              } else {
                console.warn(`No rule found for bookmark with URI: ${bookmark.ruleGuid}`);
              }
            });
            
            setRules(matchedRules);

            if (matchedRules.length !== bookmarkResult.bookmarkedRules.length) {
              const foundUris = matchedRules.map(rule => rule.uri);
              const missingUris = bookmarkResult.bookmarkedRules.map(bookmark => bookmark.ruleGuid).filter(uri => !foundUris.includes(uri));
              console.warn(`Some bookmarked rules not found:`, missingUris);
            }
          } catch (ruleError) {
            console.error('Error fetching rule data:', ruleError);
            setRules([]);
          }
        } else {
          setRules([]);
        }
        
      } else {
        console.error('Failed to fetch bookmarks:', bookmarkResult.message);
        setBookmarkedRules([]);
        setBookmarkCount(0);
        setRules([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setBookmarkedRules([]);
      setBookmarkCount(0);
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleBookmarkRemoved = async (ruleGuid: string) => {
    if (!user?.sub) {
      console.error('No user ID available');
      return;
    }

    try {
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        console.error('No access token available');
        return;
      }

      const removeResult = await BookmarkService.removeBookmark(
        { ruleGuid, UserId: user.sub },
        accessToken
      );

      if (removeResult.error) {
        console.error('Failed to remove bookmark:', removeResult.message);
        return;
      }

      setBookmarkedRules(prevRules => {
        const updatedRules = prevRules.filter(bookmark => bookmark.ruleGuid !== ruleGuid);
        setBookmarkCount(updatedRules.length);
        return updatedRules;
      });
      
      setRules(prevRules => {
        return prevRules.filter(rule => rule.guid !== ruleGuid);
      });
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      getBookmarkList();
    }
  }, [authLoading, user]);

  if (isAuthenticated) {
    return (
      <>
        <div className="shadow-lg rounded">
          <section className="mb-20 rounded">
            <div className="flex flex-col gap-8 px-12 pt-12 bg-[#f5f5f5] rounded-t">
              <div className="flex gap-8">
                <Image
                    src={`https://avatars.githubusercontent.com/${user?.nickname}`}
                    alt={user?.nickname || ''}
                    title={user?.nickname}
                    width={100}
                    height={100}
                    className="rounded-full object-cover"
                  />
                <div>
                    <div className="text-3xl">
                    {isAuthenticated ? user?.name : ''}
                    </div>
                    <a className="flex align-center text-[#cc4141]"
                      href={`https://www.github.com/${user?.nickname}`}
                      target="_blank"
                      rel="noreferrer"
                      >
                      <RiGithubFill size={20} className=" my-2 mx-1" />
                      <span className="my-2">GitHub Profile</span>
                    </a>
                </div>
              </div>
              <div className="w-fit flex items-center px-2 pt-2 pb-1 border-b-4 border-[#cc4141]">
                Bookmarks 
                <RiBookmarkFill size={16} className="ml-2 mr-1 text-[#cc4141]" /> {bookmarkCount}
              </div>
            </div>
            
            <div className="bg-white">
              {authLoading || isLoading ? (
                <div className="flex items-center justify-center min-h-[400px] p-12">
                  <p className="text-xl text-gray-600">
                    Loading your bookmarks...
                    </p>
                  </div>
              ) : (
                <RuleList
                  rules={rules}
                  type={'bookmark'}
                  noContentMessage="No bookmarks? Use them to save rules for later!"
                  onBookmarkRemoved={handleBookmarkRemoved}
                />
              )}
            </div>
          </section>
        </div>
      </>
    );
  } else {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-xl text-gray-600">
          Please first login to view profile
        </p>
      </div>
    );
  }
}
