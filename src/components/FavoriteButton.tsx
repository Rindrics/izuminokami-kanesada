'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addFavorite, isFavorite, removeFavorite } from '@/lib/favorites';

interface Props {
  contentId: string;
}

export function FavoriteButton({ contentId }: Props) {
  const { user, loading } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check favorite status on mount and when user changes
  useEffect(() => {
    if (!user || loading) {
      setFavorited(false);
      return;
    }

    let cancelled = false;
    const currentUser = user; // Capture user value to avoid closure issues

    async function checkFavorite() {
      // Ensure user is still available when async operation completes
      if (!currentUser) {
        return;
      }

      try {
        const isFav = await isFavorite(currentUser.uid, contentId);
        if (!cancelled) {
          setFavorited(isFav);
        }
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    }

    checkFavorite();

    return () => {
      cancelled = true;
    };
  }, [user, contentId, loading]);

  const handleToggle = async () => {
    if (!user || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      if (favorited) {
        await removeFavorite(user.uid, contentId);
        setFavorited(false);
      } else {
        await addFavorite(user.uid, contentId);
        setFavorited(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if user is not authenticated
  if (!user || loading) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className="focus:outline-none focus:ring-2 focus:ring-zinc-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={favorited ? 'お気に入りから削除' : 'お気に入りに追加'}
      title={favorited ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          favorited
            ? 'text-zinc-700 dark:text-zinc-300'
            : 'text-zinc-400 dark:text-zinc-600'
        }
        aria-hidden="true"
      >
        <title>{favorited ? 'お気に入りから削除' : 'お気に入りに追加'}</title>
        <path d="M6 4h12v16l-6-4-6 4V4z" />
      </svg>
    </button>
  );
}
