'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageWithSidebar } from '@/components/PageWithSidebar';
import { PublicCollectionDetailModal } from '@/components/PublicCollectionDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicCollections } from '@/lib/collections';
import type { PublicCollection } from '@/types/collection';

export default function PublicCollectionsPage() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<PublicCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCollections() {
      setIsLoading(true);
      try {
        const cols = await getPublicCollections();
        setCollections(cols);
      } catch (error) {
        console.error('Failed to load public collections:', error);
        setCollections([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadCollections();
  }, []);

  if (isLoading) {
    return (
      <PageWithSidebar maxWidth="4xl" showSidebar={false}>
        <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
          公開コレクション
        </h1>
        <div className="text-zinc-500">読み込み中...</div>
      </PageWithSidebar>
    );
  }

  return (
    <PageWithSidebar maxWidth="4xl" showSidebar={false}>
      <nav className="mb-4 text-sm text-zinc-500">
        {user ? (
          <>
            <Link href="/collections" className="hover:underline">
              マイコレクション
            </Link>
            <span className="mx-2">&gt;</span>
          </>
        ) : (
          <>
            <Link href="/" className="hover:underline">
              トップ
            </Link>
            <span className="mx-2">&gt;</span>
          </>
        )}
        <span className="text-zinc-700 dark:text-zinc-300">
          公開コレクション
        </span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
        公開コレクション
      </h1>

      {collections.length === 0 ? (
        <div className="text-zinc-500">
          公開されているコレクションがありません。
        </div>
      ) : (
        <ul className="space-y-4">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => setViewingId(collection.id)}
                className="block w-full text-left hover:text-zinc-600 dark:hover:text-zinc-400"
              >
                <div className="font-medium text-black dark:text-white">
                  {collection.name}
                </div>
                {collection.description && (
                  <div className="mt-1 text-sm text-zinc-500">
                    {collection.description}
                  </div>
                )}
                <div className="mt-1 text-xs text-zinc-400">
                  {collection.contentCount}件のコンテンツ
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewingId && (
        <PublicCollectionDetailModal
          collectionId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </PageWithSidebar>
  );
}
