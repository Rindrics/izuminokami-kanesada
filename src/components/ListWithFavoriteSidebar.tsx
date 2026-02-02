'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FavoriteContentList } from './FavoriteContentList';

interface Props {
  children: React.ReactNode;
  maxItems?: number;
}

export function ListWithFavoriteSidebar({ children, maxItems = 5 }: Props) {
  const { user, loading } = useAuth();

  // Show full width when not authenticated
  if (!user && !loading) {
    return <>{children}</>;
  }

  return (
    <div className="lg:flex lg:flex-row-reverse lg:gap-8">
      <aside className="mb-6 lg:mb-0 lg:w-80 lg:shrink-0">
        <div className="lg:sticky lg:top-8">
          <Suspense fallback={null}>
            <FavoriteContentList maxItems={maxItems} />
          </Suspense>
        </div>
      </aside>
      <div className="lg:min-w-0 lg:flex-1">{children}</div>
    </div>
  );
}
