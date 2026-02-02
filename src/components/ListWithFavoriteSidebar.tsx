'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFavoriteContentIds } from '@/lib/favorites';
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
  const [hasFavorites, setHasFavorites] = useState(false);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsLargeScreen(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Check if user has favorites
  useEffect(() => {
    if (!user || loading) {
      setIsFavoritesLoading(true);
      setHasFavorites(false);
      return;
    }

    setIsFavoritesLoading(true);
    getFavoriteContentIds(user.uid)
      .then((ids) => {
        setHasFavorites(ids.length > 0);
      })
      .catch(() => {
        setHasFavorites(false);
      })
      .finally(() => {
        setIsFavoritesLoading(false);
      });
  }, [user, loading]);

  // Show full width when not authenticated or when authenticated but no favorites exist
  if (!user && !loading) {
    return <>{children}</>;
  }

  if (!isFavoritesLoading && !hasFavorites) {
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
