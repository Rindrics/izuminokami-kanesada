import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FavoriteButton } from '@/components/FavoriteButton';
import { KeyboardNavigation } from '@/components/KeyboardNavigation';
import { ListWithFavoriteSidebar } from '@/components/ListWithFavoriteSidebar';
import { PageWithSidebar } from '@/components/PageWithSidebar';
import {
  getAdjacentSectionIds,
  getAllSectionPaths,
  getBookById,
  getSectionById,
} from '@/generated/books';
import { getContentById } from '@/generated/contents';
import { createMetadata } from '@/lib/metadata';

interface Props {
  params: Promise<{ bookId: string; sectionId: string }>;
}

export async function generateStaticParams() {
  return getAllSectionPaths().map((path) => {
    const [bookId, sectionId] = path.split('/');
    return { bookId, sectionId };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookId, sectionId } = await params;
  const book = getBookById(bookId);
  const section = getSectionById(bookId, sectionId);

  if (!book || !section) {
    return { title: '編が見つかりません' };
  }

  const title = `${section.name} - ${book.name}`;
  const description = `${book.name} ${section.name}の全章を一覧表示。現在${section.chapters.length}/${section.totalChapters}章を収録。孔子の教えを白文と訓読みで学習できます。`;

  return createMetadata({
    title,
    description,
    path: `/books/${bookId}/${sectionId}/`,
  });
}

export default async function SectionPage({ params }: Props) {
  const { bookId, sectionId } = await params;
  const book = getBookById(bookId);
  const section = getSectionById(bookId, sectionId);

  if (!book || !section) {
    notFound();
  }

  const { prev, next } = getAdjacentSectionIds(bookId, sectionId);

  const prevSection = prev ? getSectionById(bookId, prev) : null;
  const nextSection = next ? getSectionById(bookId, next) : null;

  const prevUrl = prevSection ? `/books/${bookId}/${prev}` : null;
  const nextUrl = nextSection ? `/books/${bookId}/${next}` : null;

  const prevLabel = prevSection ? `前の編（${prevSection.name}）へ` : undefined;
  const nextLabel = nextSection ? `次の編（${nextSection.name}）へ` : undefined;

  return (
    <PageWithSidebar showSidebar={false}>
      <header className="sticky top-14 z-10 mb-8 bg-zinc-50 py-4 dark:bg-black">
        <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          <span className="mx-2">&gt;</span>
          <Link href={`/books/${book.id}`} className="hover:underline">
            {book.name}
          </Link>
        </nav>
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-white">
          {section.name}
        </h1>
        <nav className="mb-8 flex items-center justify-between gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {prevUrl ? (
            <Link
              href={prevUrl}
              className="group relative flex items-center gap-2 rounded-lg px-4 py-2 text-zinc-700 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <span>←</span>
              <span className="text-sm">{prevLabel ?? '前の編'}</span>
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity delay-100 group-hover:opacity-100 dark:bg-zinc-200 dark:text-black">
                ショートカット: p
              </span>
            </Link>
          ) : (
            <div />
          )}
          {nextUrl ? (
            <Link
              href={nextUrl}
              className="group relative flex items-center gap-2 rounded-lg px-4 py-2 text-zinc-700 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <span className="text-sm">{nextLabel ?? '次の編'}</span>
              <span>→</span>
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity delay-100 group-hover:opacity-100 dark:bg-zinc-200 dark:text-black">
                ショートカット: n
              </span>
            </Link>
          ) : (
            <div />
          )}
        </nav>
        <KeyboardNavigation
          prevUrl={prevUrl}
          nextUrl={nextUrl}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          renderUI={false}
        />
      </header>

      <section>
        <h2 className="mb-4 text-lg font-medium text-zinc-600 dark:text-zinc-400">
          章一覧
        </h2>
        <ListWithFavoriteSidebar>
          <ul className="space-y-2">
            {section.chapters.map((chapter) => {
              const contentId = `${book.id}/${section.id}/${chapter}`;
              const content = getContentById(contentId);
              // Remove hyphens (tone sandhi markers) for display
              const previewText = content?.text?.replace(/-/g, '') ?? '';

              return (
                <li key={chapter}>
                  <div className="flex items-center gap-2 rounded-lg bg-white p-4 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                    <Link
                      href={`/books/${book.id}/${section.id}/${chapter}`}
                      className="flex min-w-0 flex-1 items-baseline gap-3"
                    >
                      <span className="shrink-0 text-lg font-medium text-black dark:text-white">
                        {chapter}
                      </span>
                      <span className="min-w-0 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {previewText}
                      </span>
                    </Link>
                    <div className="shrink-0">
                      <Suspense fallback={null}>
                        <FavoriteButton contentId={contentId} />
                      </Suspense>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ListWithFavoriteSidebar>
      </section>
    </PageWithSidebar>
  );
}
