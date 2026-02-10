'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  addContentToCollection,
  getCollections,
  getCollectionsForContent,
  removeContentFromCollection,
} from '@/lib/collections';
import type {
  CollectionSummary,
  ContentCollectionInfo,
  ContentType,
} from '@/types/collection';
import { CreateCollectionModal } from './CreateCollectionModal';

interface Props {
  contentId: string;
  contentType: ContentType;
  onClose: () => void;
}

export function AddToCollectionModal({
  contentId,
  contentType,
  onClose,
}: Props) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [includedIn, setIncludedIn] = useState<ContentCollectionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const currentUser = user;

    async function loadData() {
      setIsLoading(true);
      try {
        const [cols, included] = await Promise.all([
          getCollections(currentUser.uid),
          getCollectionsForContent(currentUser.uid, contentId),
        ]);
        setCollections(cols);
        setIncludedIn(included);
      } catch (error) {
        console.error('Failed to load collections:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, contentId]);

  const handleToggle = async (collectionId: string, isIncluded: boolean) => {
    if (!user || togglingId) return;

    setTogglingId(collectionId);

    try {
      if (isIncluded) {
        await removeContentFromCollection(user.uid, collectionId, contentId);
        setIncludedIn((prev) =>
          prev.filter((c) => c.collectionId !== collectionId),
        );
      } else {
        await addContentToCollection(
          user.uid,
          collectionId,
          contentId,
          contentType,
        );
        const col = collections.find((c) => c.id === collectionId);
        if (col) {
          setIncludedIn((prev) => [
            ...prev,
            {
              collectionId: col.id,
              collectionName: col.name,
            },
          ]);
        }
      }
      window.dispatchEvent(new CustomEvent('collections-changed'));
    } catch (error) {
      console.error('Failed to toggle collection:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleCollectionCreated = async (newCollectionId: string) => {
    setIsCreating(false);
    if (!user) return;

    // コレクション一覧を再読み込み
    const cols = await getCollections(user.uid);
    setCollections(cols);

    // 新しいコレクションにコンテンツを追加
    try {
      await addContentToCollection(
        user.uid,
        newCollectionId,
        contentId,
        contentType,
      );
      const newCol = cols.find((c) => c.id === newCollectionId);
      if (newCol) {
        setIncludedIn((prev) => [
          ...prev,
          {
            collectionId: newCol.id,
            collectionName: newCol.name,
          },
        ]);
      }
      window.dispatchEvent(new CustomEvent('collections-changed'));
    } catch (error) {
      console.error('Failed to add content to new collection:', error);
    }
  };

  const isIncluded = (collectionId: string) =>
    includedIn.some((c) => c.collectionId === collectionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-bold text-black dark:text-white">
          コレクションに追加
        </h2>

        {isLoading ? (
          <div className="py-8 text-center text-zinc-500">読み込み中...</div>
        ) : (
          <>
            {collections.length === 0 ? (
              <div className="mb-4 text-zinc-500">コレクションがありません</div>
            ) : (
              <ul className="mb-4 max-h-60 space-y-2 overflow-y-auto">
                {collections.map((col) => {
                  const included = isIncluded(col.id);
                  const isToggling = togglingId === col.id;
                  return (
                    <li key={col.id}>
                      <button
                        type="button"
                        onClick={() => handleToggle(col.id, included)}
                        disabled={isToggling}
                        className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition disabled:opacity-50 ${
                          included
                            ? 'bg-zinc-100 dark:bg-zinc-800'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-zinc-700 dark:text-zinc-300">
                            {col.name}
                          </span>
                          {col.description && (
                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-500">
                              {col.description}
                            </span>
                          )}
                        </div>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          {col.isPublic && (
                            <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                              公開
                            </span>
                          )}
                          {included && (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="text-zinc-700 dark:text-zinc-300"
                              aria-hidden="true"
                            >
                              <title>追加済み</title>
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mb-4 w-full rounded-lg border-2 border-dashed border-zinc-300 p-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
            >
              + 新しいコレクションを作成
            </button>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                閉じる
              </button>
            </div>
          </>
        )}

        {isCreating && (
          <CreateCollectionModal
            onClose={() => setIsCreating(false)}
            onCreated={handleCollectionCreated}
          />
        )}
      </div>
    </div>
  );
}
