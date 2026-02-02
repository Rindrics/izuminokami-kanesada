'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';
import {
  getFavoriteContentIdsByAccessDate,
  subscribeFavoriteContentIdsByAccessDate,
} from '@/lib/access-history';
import { getFavoriteContentIds } from '@/lib/favorites';

interface Props {
  maxItems?: number;
}

/**
 * Get preview text from content segments
 */
function getPreviewText(contentId: string, maxLength = 20): string {
  const content = getContentById(contentId);
  if (!content || content.segments.length === 0) {
    return '';
  }
  const text = content.segments.map((s) => s.text.original).join('');
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

export function FavoriteContentList({ maxItems = 5 }: Props) {
  const { user, loading } = useAuth();
  const [contentIds, setContentIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || loading) {
      setContentIds([]);
      setTotalCount(0);
      return;
    }

    const currentUser = user; // Capture user value to avoid closure issues

    // Function to reload favorites and total count
    const reloadFavorites = async (userId: string) => {
      setIsLoading(true);
      try {
        const [ids, allIds] = await Promise.all([
          getFavoriteContentIdsByAccessDate(userId, maxItems),
          getFavoriteContentIds(userId),
        ]);
        setContentIds(ids);
        setTotalCount(allIds.length);
      } catch (error) {
        console.error('[FavoriteContentList] Reload failed:', error);
        setContentIds([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    reloadFavorites(currentUser.uid);

    // Subscribe to real-time updates
    const unsubscribe = subscribeFavoriteContentIdsByAccessDate(
      currentUser.uid,
      maxItems,
      async (ids) => {
        setContentIds(ids);
        setIsLoading(false);
        // Update total count when list changes
        try {
          const allIds = await getFavoriteContentIds(currentUser.uid);
          setTotalCount(allIds.length);
        } catch {
          setTotalCount(0);
        }
      },
    );

    // Listen for custom events when favorites are changed
    const handleFavoritesChanged = () => {
      reloadFavorites(currentUser.uid);
    };
    window.addEventListener('favorites-changed', handleFavoritesChanged);

    return () => {
      unsubscribe();
      window.removeEventListener('favorites-changed', handleFavoritesChanged);
    };
  }, [user, loading, maxItems]);

  // Don't show if user is not authenticated
  if (!user || loading) {
    return null;
  }

  // Don't show if there are no favorites
  if (!isLoading && contentIds.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          <Link
            href="/favorites"
            className="hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            お気に入り
          </Link>
        </h3>
        <div className="text-sm text-zinc-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        <Link
          href="/favorites"
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          お気に入り
        </Link>
      </h3>
      <ul className="space-y-2">
        {contentIds.map((contentId) => {
          const content = getContentById(contentId);
          if (!content) {
            return null;
          }

          const book = getBookById(content.book_id);
          const parts = contentId.split('/');
          const sectionId = parts.length > 1 ? parts[1] : null;
          const section = sectionId
            ? getSectionById(content.book_id, sectionId)
            : null;
          const preview = getPreviewText(contentId);

          return (
            <li key={contentId}>
              <Link
                href={`/books/${contentId}`}
                className="block rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <div className="text-xs text-zinc-500">
                  {book?.name || content.book_id}
                  {section?.name && ` ${section.name}`}
                  {` ${content.chapter}`}
                </div>
                {preview && (
                  <div className="truncate text-xs text-zinc-500">
                    {preview}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {totalCount > maxItems && (
        <div className="mt-3 border-t border-zinc-200 pt-3 text-right text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          全 {totalCount} 件中 {contentIds.length} 件を表示（
          <Link
            href="/favorites"
            className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            一覧を見る
          </Link>
          ）
        </div>
      )}
    </div>
  );
}
