'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FavoriteContentList } from './FavoriteContentList';

interface Props {
  children: React.ReactNode;
  maxItems?: number;
  maxItemsMobile?: number;
}

export function ListWithFavoriteSidebar({
  children,
  maxItems = 5,
  maxItemsMobile = 2,
}: Props) {
  const { user, loading } = useAuth();
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsLargeScreen(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Show full width when not authenticated
  if (!user && !loading) {
    return <>{children}</>;
  }

  const effectiveMaxItems = isLargeScreen ? maxItems : maxItemsMobile;

  return (
    <div className="lg:flex lg:flex-row-reverse lg:gap-8">
      <aside className="mb-6 lg:mb-0 lg:w-80 lg:shrink-0">
        <div className="lg:sticky lg:top-8">
          <Suspense fallback={null}>
            <FavoriteContentList maxItems={effectiveMaxItems} />
          </Suspense>
        </div>
      </aside>
      <div className="lg:min-w-0 lg:flex-1">{children}</div>
    </div>
  );
}
