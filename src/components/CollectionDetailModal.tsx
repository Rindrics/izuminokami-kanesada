'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCollectionWithContents,
  removeContentFromCollection,
} from '@/lib/collections';
import { getContentDisplayInfo } from '@/lib/contentDisplay';
import type { CollectionWithContents } from '@/types/collection';

interface Props {
  collectionId: string;
  onClose: () => void;
}

export function CollectionDetailModal({ collectionId, onClose }: Props) {
  const { user } = useAuth();
  const [collection, setCollection] = useState<CollectionWithContents | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadCollection = useCallback(async () => {
    if (!user || !collectionId) return;

    setIsLoading(true);
    try {
      const col = await getCollectionWithContents(user.uid, collectionId);
      setCollection(col);
    } catch (error) {
      console.error('Failed to load collection:', error);
      setCollection(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, collectionId]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const handleRemoveContent = async (contentId: string) => {
    if (!user || removingId) return;

    setRemovingId(contentId);
    try {
      await removeContentFromCollection(user.uid, collectionId, contentId);
      window.dispatchEvent(new CustomEvent('collections-changed'));
      await loadCollection();
    } catch (error) {
      console.error('Failed to remove content:', error);
      alert('削除に失敗しました');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        {isLoading ? (
          <div className="py-8 text-center text-zinc-500">読み込み中...</div>
        ) : !collection ? (
          <div className="text-zinc-500">コレクションが見つかりません。</div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-black dark:text-white">
                  {collection.name}
                </h2>
                {collection.isPublic && (
                  <span className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                    公開
                  </span>
                )}
              </div>
              {collection.description && (
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {collection.description}
                </p>
              )}
            </div>

            {collection.contents.length === 0 ? (
              <div className="mb-6 text-zinc-500">
                コンテンツがありません。各章やセクションの詳細ページから追加してください。
              </div>
            ) : (
              <ul className="mb-6 space-y-3">
                {collection.contents.map((item) => {
                  const displayInfo = getContentDisplayInfo(item.contentId);
                  const isRemoving = removingId === item.contentId;

                  return (
                    <li
                      key={item.contentId}
                      className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                    >
                      <Link
                        href={displayInfo.href}
                        onClick={onClose}
                        className="min-w-0 flex-1 hover:text-zinc-600 dark:hover:text-zinc-400"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700">
                            {item.contentType === 'section' ? '編' : '章'}
                          </span>
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {displayInfo.title}
                          </span>
                        </div>
                        {displayInfo.preview && (
                          <div className="mt-1 text-sm text-zinc-500">
                            {displayInfo.preview}
                          </div>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemoveContent(item.contentId)}
                        disabled={isRemoving}
                        className="shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20"
                      >
                        {isRemoving ? '...' : '削除'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
