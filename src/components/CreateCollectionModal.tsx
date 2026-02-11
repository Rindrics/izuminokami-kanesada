'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createCollection } from '@/lib/collections';

interface Props {
  onClose: () => void;
  onCreated: (collectionId: string) => void;
}

export function CreateCollectionModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const collectionId = await createCollection(
        user.uid,
        name.trim(),
        description.trim() || undefined,
        isPublic,
      );
      window.dispatchEvent(new CustomEvent('collections-changed'));
      onCreated(collectionId);
    } catch (err) {
      console.error('Failed to create collection:', err);
      setError(
        err instanceof Error ? err.message : 'コレクションの作成に失敗しました',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-bold text-black dark:text-white">
          新しいコレクションを作成
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="collection-name"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              id="collection-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 試験対策、名言集"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              required
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="collection-description"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              説明（任意）
            </label>
            <textarea
              id="collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="コレクションの説明を入力"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-600 focus:ring-zinc-500 dark:border-zinc-700"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                公開する（他のユーザーが閲覧できます）
              </span>
            </label>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-600 dark:hover:bg-zinc-500"
            >
              {isLoading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
