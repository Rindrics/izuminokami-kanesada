'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ContentType } from '@/types/collection';
import { AddToCollectionModal } from './AddToCollectionModal';

interface Props {
  contentId: string;
  contentType: ContentType;
}

export function AddToCollectionButton({ contentId, contentType }: Props) {
  const { user, loading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user || loading) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="rounded transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
        aria-label="コレクションに追加"
        title="コレクションに追加"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300"
          aria-hidden="true"
        >
          <title>コレクションに追加</title>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      </button>

      {isModalOpen && (
        <AddToCollectionModal
          contentId={contentId}
          contentType={contentType}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
