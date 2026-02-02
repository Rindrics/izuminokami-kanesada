'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';
import { getFavoriteContentIdsByAccessDate } from '@/lib/access-history';

interface Props {
  maxItems?: number;
}

export function FavoriteContentList({ maxItems = 5 }: Props) {
  const { user, loading } = useAuth();
  const [contentIds, setContentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || loading) {
      setContentIds([]);
      return;
    }

    let cancelled = false;
    const currentUser = user; // Capture user value to avoid closure issues

    async function loadFavoriteContents() {
      // Ensure user is still available when async operation completes
      if (!currentUser) {
        return;
      }

      setIsLoading(true);
      try {
        const ids = await getFavoriteContentIdsByAccessDate(
          currentUser.uid,
          maxItems,
        );
        if (!cancelled) {
          setContentIds(ids);
        }
      } catch (error) {
        console.error('Failed to load favorite contents:', error);
        if (!cancelled) {
          setContentIds([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFavoriteContents();

    return () => {
      cancelled = true;
    };
  }, [user, loading, maxItems]);

  // Don't show if user is not authenticated
  if (!user || loading) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          お気に入り
        </h3>
        <div className="text-sm text-zinc-500">読み込み中...</div>
      </div>
    );
  }

  if (contentIds.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          お気に入り
        </h3>
        <div className="text-sm text-zinc-500">お気に入りがありません</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        お気に入り
      </h3>
      <ul className="space-y-2">
        {contentIds.map((contentId) => {
          const content = getContentById(contentId);
          if (!content) {
            return null;
          }

          const book = getBookById(content.book_id);
          const section = getSectionById(
            content.book_id,
            contentId.split('/')[1],
          );

          return (
            <li key={contentId}>
              <Link
                href={`/books/${contentId}`}
                className="block rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <div className="font-medium">
                  {section?.name || book?.name || contentId}
                </div>
                <div className="text-xs text-zinc-500">{content.chapter}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
