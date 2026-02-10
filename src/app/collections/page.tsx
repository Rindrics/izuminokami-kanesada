'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CollectionDetailModal } from '@/components/CollectionDetailModal';
import { CreateCollectionModal } from '@/components/CreateCollectionModal';
import { PageWithSidebar } from '@/components/PageWithSidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteCollection,
  getCollections,
  updateCollection,
} from '@/lib/collections';
import type { CollectionSummary } from '@/types/collection';

export default function CollectionsPage() {
  const { user, loading } = useAuth();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadCollections = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const cols = await getCollections(user.uid);
      setCollections(cols);
    } catch (error) {
      console.error('Failed to load collections:', error);
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || loading) {
      setCollections([]);
      return;
    }

    loadCollections();

    const handleCollectionsChanged = () => {
      loadCollections();
    };
    window.addEventListener('collections-changed', handleCollectionsChanged);

    return () => {
      window.removeEventListener(
        'collections-changed',
        handleCollectionsChanged,
      );
    };
  }, [user, loading, loadCollections]);

  const handleDelete = async (collectionId: string, collectionName: string) => {
    if (!user) return;
    if (!confirm(`「${collectionName}」を削除しますか？`)) return;

    try {
      await deleteCollection(user.uid, collectionId);
      window.dispatchEvent(new CustomEvent('collections-changed'));
    } catch (error) {
      console.error('Failed to delete collection:', error);
      alert('削除に失敗しました');
    }
  };

  const handleStartEdit = (collection: CollectionSummary) => {
    setEditingId(collection.id);
    setEditingName(collection.name);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingId || !editingName.trim()) return;

    try {
      await updateCollection(user.uid, editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      window.dispatchEvent(new CustomEvent('collections-changed'));
    } catch (error) {
      console.error('Failed to update collection:', error);
      alert('更新に失敗しました');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleTogglePublic = async (collection: CollectionSummary) => {
    if (!user) return;

    try {
      await updateCollection(user.uid, collection.id, {
        isPublic: !collection.isPublic,
      });
      window.dispatchEvent(new CustomEvent('collections-changed'));
    } catch (error) {
      console.error('Failed to toggle public status:', error);
      alert('公開設定の変更に失敗しました');
    }
  };

  if (loading || isLoading) {
    return (
      <PageWithSidebar maxWidth="4xl" showSidebar={false}>
        <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
          マイコレクション
        </h1>
        <div className="text-zinc-500">読み込み中...</div>
      </PageWithSidebar>
    );
  }

  if (!user) {
    return (
      <PageWithSidebar maxWidth="4xl" showSidebar={false}>
        <h1 className="mb-8 text-3xl font-bold text-black dark:text-white">
          マイコレクション
        </h1>
        <div className="text-zinc-500">
          コレクション機能をご利用いただくには、右上の「
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            我入門也
          </span>
          」からログインしてください。
        </div>
      </PageWithSidebar>
    );
  }

  return (
    <PageWithSidebar maxWidth="4xl" showSidebar={false}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          マイコレクション
        </h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500"
        >
          新規作成
        </button>
      </div>

      <div className="mb-4">
        <Link
          href="/collections/public"
          className="text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          公開コレクションを見る →
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="text-zinc-500">
          コレクションがありません。「新規作成」ボタンからコレクションを作成してください。
        </div>
      ) : (
        <ul className="space-y-4">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900"
            >
              {editingId === collection.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-800"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded bg-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setViewingId(collection.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black dark:text-white">
                        {collection.name}
                      </span>
                      {collection.isPublic && (
                        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          公開
                        </span>
                      )}
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
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePublic(collection)}
                      className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      title={collection.isPublic ? '非公開にする' : '公開する'}
                    >
                      {collection.isPublic ? '非公開にする' : '公開する'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(collection)}
                      className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(collection.id, collection.name)
                      }
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                    >
                      削除
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isCreating && (
        <CreateCollectionModal
          onClose={() => setIsCreating(false)}
          onCreated={() => setIsCreating(false)}
        />
      )}

      {viewingId && (
        <CollectionDetailModal
          collectionId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </PageWithSidebar>
  );
}
