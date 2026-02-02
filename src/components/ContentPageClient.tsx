'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recordAccess } from '@/lib/access-history';
import { FavoriteButton } from './FavoriteButton';

interface Props {
  contentId: string;
}

/**
 * Client component for content page that handles:
 * - Recording access history
 * - Displaying favorite button
 */
export function ContentPageClient({ contentId }: Props) {
  const { user, loading } = useAuth();

  // Record access when user views the page
  useEffect(() => {
    if (!user || loading) {
      return;
    }

    // Record access asynchronously (don't block rendering)
    recordAccess(user.uid, contentId).catch((error) => {
      console.error('Failed to record access:', error);
    });
  }, [user, contentId, loading]);

  return <FavoriteButton contentId={contentId} />;
}
