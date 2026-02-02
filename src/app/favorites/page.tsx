'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';
import { getFavorites } from '@/lib/favorites';
import type { Favorite } from '@/types/favorite';

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || loading) {
      setFavorites([]);
      return;
    }

    let cancelled = false;
    const currentUser = user; // Capture user value to avoid closure issues

    async function loadFavorites() {
      // Ensure user is still available when async operation completes
      if (!currentUser) {
        return;
      }

      setIsLoading(true);
      try {
        const favs = await getFavorites(currentUser.uid);
        if (!cancelled) {
          setFavorites(favs);
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
        if (!cancelled) {
          setFavorites([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || isLoading) {
    return (
      <div className="bg-zinc-50 dark:bg-black">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
            お気に入り
          </h1>
          <div className="text-zinc-500">読み込み中...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-zinc-50 dark:bg-black">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
            お気に入り
          </h1>
          <div className="text-zinc-500">
            お気に入り機能をご利用いただくには、ログインが必要です。
          </div>
        </main>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-black">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
            お気に入り
          </h1>
          <div className="text-zinc-500">
            お気に入りがありません。コンテンツ詳細ページからお気に入りを追加してください。
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
          お気に入り
        </h1>
        <ul className="space-y-4">
          {favorites.map((favorite) => {
            const content = getContentById(favorite.contentId);
            if (!content) {
              return null;
            }

            const book = getBookById(content.book_id);
            const section = getSectionById(
              content.book_id,
              favorite.contentId.split('/')[1],
            );

            return (
              <li
                key={favorite.contentId}
                className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900"
              >
                <Link
                  href={`/books/${favorite.contentId}`}
                  className="block hover:text-zinc-600 dark:hover:text-zinc-400"
                >
                  <div className="mb-1 font-medium text-zinc-900 dark:text-white">
                    {section?.name || book?.name || favorite.contentId}
                  </div>
                  <div className="text-sm text-zinc-500">{content.chapter}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
