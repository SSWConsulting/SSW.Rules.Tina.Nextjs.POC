'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
type AnyUser = { sub?: string; name?: string; email?: string; picture?: string; nickname?: string };
type Ctx = { 
  user: AnyUser | null; 
  isLoading: boolean; 
  checkAuth: () => Promise<void>;
};
const Ctx = createContext<Ctx>({ user: null, isLoading: true, checkAuth: async () => {} });
export const useAuth = () => useContext(Ctx);

const withBase = (path: string) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${p}` : p;
};

export default function UserClientProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AnyUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const inited = useRef(false);

  const checkAuth = async () => {
    try {
      const res = await fetch(withBase('/auth/profile'), { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      } else if (res.status === 401) {
        // User is not authenticated, clear any stale user data
        setUser(null);
      }
    } catch (error) {
      // Network error or other issues, don't set user
      console.debug('Auth check failed:', error);
    }
  };

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    let alive = true;
    (async () => {
      try {
        const sessionCheck = await fetch(withBase('/api/session/check'));
        const session = await sessionCheck.json();
        if(session.isAuthenticated) {
          const res = await fetch(withBase('/auth/profile'), { credentials: 'include' });
          if (alive && res.ok) setUser(await res.json());
        } else {
          setUser(null);
        }

      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => ({ user, isLoading, checkAuth }), [user, isLoading, checkAuth]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
