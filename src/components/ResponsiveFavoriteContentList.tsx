'use client';

import { useEffect, useState } from 'react';
import { FavoriteContentList } from './FavoriteContentList';

interface Props {
  maxItems?: number;
  maxItemsMobile?: number;
}

export function ResponsiveFavoriteContentList({
  maxItems = 5,
  maxItemsMobile = 2,
}: Props) {
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsLargeScreen(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveMaxItems = isLargeScreen ? maxItems : maxItemsMobile;

  return <FavoriteContentList maxItems={effectiveMaxItems} />;
}
