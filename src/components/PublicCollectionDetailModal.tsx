'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';
import { getPublicCollectionWithContents } from '@/lib/collections';
import type { CollectionWithContents } from '@/types/collection';

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

function getContentDisplayInfo(contentId: string) {
  const parts = contentId.split('/');
  const bookId = parts[0];
  const sectionId = parts[1];
  const chapterId = parts[2];

  const book = getBookById(bookId);
  const section = getSectionById(bookId, sectionId);

  if (chapterId) {
    const content = getContentById(contentId);
    return {
      type: 'chapter' as const,
      title: `${book?.name || bookId} ${section?.name || sectionId} ${content?.chapter || chapterId}`,
      preview: getPreviewText(contentId),
      href: `/books/${contentId}`,
    };
  } else {
    return {
      type: 'section' as const,
      title: `${book?.name || bookId} ${section?.name || sectionId}`,
      preview: section ? `${section.totalChapters}章` : '',
      href: `/books/${bookId}/${sectionId}`,
    };
  }
}

interface Props {
  collectionId: string;
  onClose: () => void;
}

export function PublicCollectionDetailModal({ collectionId, onClose }: Props) {
  const [collection, setCollection] = useState<CollectionWithContents | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCollection() {
      if (!collectionId) return;

      setIsLoading(true);
      try {
        const col = await getPublicCollectionWithContents(collectionId);
        setCollection(col);
      } catch (error) {
        console.error('Failed to load collection:', error);
        setCollection(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadCollection();
  }, [collectionId]);

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
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {collection.description}
                </p>
              )}
            </div>

            {collection.contents.length === 0 ? (
              <div className="mb-6 text-zinc-500">
                このコレクションにはまだコンテンツがありません。
              </div>
            ) : (
              <ul className="mb-6 space-y-3">
                {collection.contents.map((item) => {
                  const displayInfo = getContentDisplayInfo(item.contentId);

                  return (
                    <li
                      key={item.contentId}
                      className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                    >
                      <Link
                        href={displayInfo.href}
                        onClick={onClose}
                        className="block hover:text-zinc-600 dark:hover:text-zinc-400"
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
