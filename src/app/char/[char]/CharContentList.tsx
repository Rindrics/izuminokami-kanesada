'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import { getBookById, getSectionById } from '@/generated/books';
import { contents } from '@/generated/contents';

interface CharContentListProps {
  char: string;
  contentIds: string[];
}

function CharContentListInner({ char, contentIds }: CharContentListProps) {
  const searchParams = useSearchParams();
  const bookFilter = searchParams.get('book');

  // Filter by book if specified
  const filteredContentIds = useMemo(() => {
    if (!bookFilter) return contentIds;
    return contentIds.filter((id) => id.startsWith(`${bookFilter}/`));
  }, [contentIds, bookFilter]);

  // Get book name for filter display
  const filterBook = bookFilter ? getBookById(bookFilter) : null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-black dark:text-white">
        「{char}」が登場する章
        {filterBook ? (
          <span className="ml-2 text-base font-normal text-zinc-500">
            （{filterBook.name}のみ: {filteredContentIds.length} 件 /{' '}
            <Link
              href={`/char/${char}`}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              全 {contentIds.length} 件を表示
            </Link>
            ）
          </span>
        ) : (
          <span className="ml-2 text-base font-normal text-zinc-500">
            （{contentIds.length} 件）
          </span>
        )}
      </h2>

      {filteredContentIds.length === 0 ? (
        <p className="text-zinc-500">該当する章がありません</p>
      ) : (
        <ul className="space-y-3">
          {filteredContentIds.map((contentId) => {
            const [bookId, sectionId, chapterId] = contentId.split('/');
            const content = contents.find((c) => c.content_id === contentId);
            const preview = content?.text.slice(0, 50) ?? '';
            const book = getBookById(bookId);
            const section = getSectionById(bookId, sectionId);
            return (
              <li key={contentId}>
                <Link
                  href={`/books/${bookId}/${sectionId}/${chapterId}`}
                  className="block rounded-lg bg-white p-4 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <div className="text-black dark:text-white">
                    {book?.name ?? bookId} /{' '}
                    {section?.name ?? `第${sectionId}編`} / 第{chapterId}章
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {preview}
                    {content && content.text.length > 50 && '…'}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function CharContentList(props: CharContentListProps) {
  return (
    <Suspense
      fallback={
        <section>
          <h2 className="mb-4 text-xl font-bold text-black dark:text-white">
            「{props.char}」が登場する章
            <span className="ml-2 text-base font-normal text-zinc-500">
              （{props.contentIds.length} 件）
            </span>
          </h2>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        </section>
      }
    >
      <CharContentListInner {...props} />
    </Suspense>
  );
}
