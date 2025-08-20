'use client';

import { useUser } from '@auth0/nextjs-auth0';
import React from 'react';
import Image from 'next/image';

interface ProfileBadgeProps {
  size?: string;
}

const ProfileBadge: React.FC<ProfileBadgeProps> = ({ size = "6.25rem" }) => {
  const { user, isLoading } = useUser();
  const isAuthenticated = !!user;
  const profile = isAuthenticated ? user : null;

  return (
    <button className="flex flex-row flex-wrap justify-center profile-container-img">
      <div className="profile-badge" key={`user_${profile?.nickname || 'anonymous'}`}>
        <ProfileImage user={profile?.nickname} size={size} />
      </div>
    </button>
  );
};

interface ProfileImageProps {
  user?: string;
  size: string;
}

function ProfileImage({ user, size }: ProfileImageProps) {
  if (user) {
    return (
      <Image
        src={`https://avatars.githubusercontent.com/${user}`}
        alt={user}
        title={user}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  } else {
    return (
      <div 
        className="bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium"
        style={{ width: size, height: size }}
      >
        <span className="text-sm">Profile</span>
      </div>
    );
  }
}

export default ProfileBadge;
