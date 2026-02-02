'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PageWithSidebar } from '@/components/PageWithSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';
import { getFavorites } from '@/lib/favorites';
import type { Favorite } from '@/types/favorite';

/**
 * Get preview text from content segments
 */
function getPreviewText(contentId: string, maxLength = 30): string {
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

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const favs = await getFavorites(user.uid);
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || loading) {
      setFavorites([]);
      return;
    }

    loadFavorites();

    const handleFavoritesChanged = () => {
      loadFavorites();
    };
    window.addEventListener('favorites-changed', handleFavoritesChanged);

    return () => {
      window.removeEventListener('favorites-changed', handleFavoritesChanged);
    };
  }, [user, loading, loadFavorites]);

  if (loading || isLoading) {
    return (
      <PageWithSidebar maxWidth="4xl" showSidebar={false}>
        <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
          お気に入り一覧
        </h1>
        <div className="text-zinc-500">読み込み中...</div>
      </PageWithSidebar>
    );
  }

  if (!user) {
    return (
      <PageWithSidebar maxWidth="4xl" showSidebar={false}>
        <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
          お気に入り一覧
        </h1>
        <div className="text-zinc-500">
          お気に入り機能をご利用いただくには、右上の「
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            我入門也
          </span>
          」からログインしてください。
        </div>
      </PageWithSidebar>
    );
  }

  if (favorites.length === 0) {
    return (
      <PageWithSidebar maxWidth="4xl" showSidebar={false}>
        <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
          お気に入り一覧
        </h1>
        <div className="text-zinc-500">
          お気に入りがありません。コンテンツ詳細ページからお気に入りを追加してください。
        </div>
      </PageWithSidebar>
    );
  }

  return (
    <PageWithSidebar maxWidth="4xl" showSidebar={false}>
      <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
        お気に入り一覧
      </h1>
      <ul className="space-y-4">
        {favorites.map((favorite) => {
          const content = getContentById(favorite.contentId);
          if (!content) {
            return null;
          }

          const book = getBookById(content.book_id);
          const sectionId = favorite.contentId.split('/')[1];
          const section = getSectionById(content.book_id, sectionId);
          const preview = getPreviewText(favorite.contentId);

          return (
            <li
              key={favorite.contentId}
              className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900"
            >
              <Link
                href={`/books/${favorite.contentId}`}
                className="min-w-0 flex-1 hover:text-zinc-600 dark:hover:text-zinc-400"
              >
                <div className="mb-1 text-sm text-zinc-500">
                  {book?.name || content.book_id}
                  {section?.name && ` ${section.name}`}
                  {` ${content.chapter}`}
                </div>
                {preview && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {preview}
                  </div>
                )}
              </Link>
              <div className="shrink-0">
                <FavoriteButton contentId={favorite.contentId} />
              </div>
            </li>
          );
        })}
      </ul>
    </PageWithSidebar>
  );
}
