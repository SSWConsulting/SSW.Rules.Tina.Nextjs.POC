"use client";

import React, { useState, useEffect } from "react";
import SignIn from "@/components/auth/SignIn";
import { MenuWrapper } from "@/components/MenuWrapper";
import { MegaMenuWrapper } from "@/components/server/MegaMenuWrapper";
import { getMegamenu } from "@/utils/get-mega-menu";

export const Header = () => {
  type MenuDataType = {
    data?: {
      megamenu?: {
        menuGroups?: any[];
      };
    };
  } | null;

  const [menuData, setMenuData] = useState<MenuDataType>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMegamenu();
        setMenuData(data);
      } catch (err) {
        console.error("Error fetching menu data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  return (
    <header>
      <nav className="bg-[var(--card)] fixed z-20 w-full border-b backdrop-blur-3xl">
        <div className="mx-auto max-w-screen-xl px-8 transition-all duration-300 flex justify-between">
          {loading ? (
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
            </div>
          ) : error ? (
            <div className="flex items-center text-red-500">
              Menu unavailable
            </div>
          ) : (
            <MenuWrapper>
              <MegaMenuWrapper menu={menuData?.data?.megamenu?.menuGroups || []} />
            </MenuWrapper>
          )}
          {/* <SignIn /> */}
        </div>
      </nav>
    </header>
  );
};