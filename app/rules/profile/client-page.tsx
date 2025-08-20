'use client';

import { useUser } from '@auth0/nextjs-auth0';
import React, { useState } from 'react';

import ProfileBadge from '@/components/profile-badge/profile-badge';
import ProfileContent from '@/components/profile-content';
import { RiGithubFill, RiBookmarkFill } from 'react-icons/ri';


interface ProfileData {
  [key: string]: any;
}

interface ProfileClientPageProps {
  data?: ProfileData;
}

export default function ProfileClientPage({ data }: ProfileClientPageProps) {
  const [bookmarkedRulesCount, setBookmarkedRulesCount] = useState<number | undefined>();
  const { user, isLoading } = useUser();
  const isAuthenticated = !!user;

  //if (isAuthenticated) {
    return (
      <>
        <div className="shadow-lg rounded">
          <section className="mb-20 rounded">
            <div className="flex flex-col gap-8 px-12 pt-12 bg-[#f5f5f5] rounded-t">
              <div className="flex gap-8">
                <div>
                  <ProfileBadge size="6.25rem" />
                </div>
                <div>
                    <div className="text-3xl">
                    {/* {isAuthenticated ? user?.name : ''} */}
                    Jake Bayliss [SSW]
                    </div>
                    <a className="flex align-center text-[#cc4141]"
                      //href={`https://www.github.com/${user?.nickname}`}
                      href={`https://www.github.com/jakebayliss`}
                      target="_blank"
                      rel="noreferrer"
                      >
                      <RiGithubFill size={20} className=" my-2 mx-1" />
                      <span className="my-2">GitHub Profile</span>
                    </a>
                </div>
              </div>
              <button className="w-fit flex items-center px-2 pt-2 pb-1 border-b-4 border-[#cc4141]">
                Bookmarks 
                <RiBookmarkFill size={16} className="ml-2 mr-1 text-[#cc4141]" /> {bookmarkedRulesCount || 0}
              </button>
            </div>
            
            <div className="bg-white">
              <ProfileContent
                 data={data}
                 setBookmarkedRulesCount={setBookmarkedRulesCount}
               />
            </div>
          </section>
        </div>
      </>
    );
//   } else {
//     return (
//       <div className="flex items-center justify-center min-h-[400px]">
//         <p className="text-xl text-gray-600">
//           Please first login to view profile
//         </p>
//       </div>
//     );
//   }
}
