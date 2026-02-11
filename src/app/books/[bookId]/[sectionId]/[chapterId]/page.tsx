import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioRecorder } from '@/components/AudioRecorder';
import { ContentPageClient } from '@/components/ContentPageClient';
import { CopyJapaneseTextButton } from '@/components/CopyJapaneseTextButton';
import { HakubunWithTabs } from '@/components/HakubunWithTabs';
import { JapaneseTextWithRuby } from '@/components/JapaneseTextWithRuby';
import { KeyboardNavigation } from '@/components/KeyboardNavigation';
import { ResponsiveFavoriteContentList } from '@/components/ResponsiveFavoriteContentList';
import { getBookById, getSectionById } from '@/generated/books';
import {
  getAdjacentContentIds,
  getAllContentIds,
  getContentById,
} from '@/generated/contents';
import { cleanChineseText, createMetadata } from '@/lib/metadata';

const isDev = process.env.NODE_ENV === 'development';

interface Props {
  params: Promise<{ bookId: string; sectionId: string; chapterId: string }>;
}

export async function generateStaticParams() {
  return getAllContentIds().map((contentId) => {
    const [bookId, sectionId, chapterId] = contentId.split('/');
    return { bookId, sectionId, chapterId };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookId, sectionId, chapterId } = await params;
  const contentId = `${bookId}/${sectionId}/${chapterId}`;

  const content = getContentById(contentId);
  const book = getBookById(bookId);
  const section = getSectionById(bookId, sectionId);

  if (!content || !book || !section) {
    return { title: '章が見つかりません' };
  }

  // Extract first 100 characters of original text for description
  const previewText = cleanChineseText(content.text).substring(0, 100);

  const title = `${section.name}: ${content.chapter}`;
  const description = `${book.name} ${section.name}の第${content.chapter}章。${previewText}`;

  return createMetadata({
    title,
    description,
    path: `/books/${contentId}/`,
  });
}

export default async function ContentPage({ params }: Props) {
  const { bookId, sectionId, chapterId } = await params;
  const contentId = `${bookId}/${sectionId}/${chapterId}`;
  const content = getContentById(contentId);
  const book = getBookById(bookId);
  const section = getSectionById(bookId, sectionId);

  if (!content || !book || !section) {
    notFound();
  }

  const { prev, next } = getAdjacentContentIds(contentId);

  const prevContent = prev ? getContentById(prev) : null;
  const nextContent = next ? getContentById(next) : null;

  // Extract book ID from content ID
  const prevBookId = prev ? prev.split('/')[0] : null;
  const nextBookId = next ? next.split('/')[0] : null;

  // Get book objects if crossing books
  const prevBook =
    prevBookId && prevBookId !== bookId ? getBookById(prevBookId) : null;
  const nextBook =
    nextBookId && nextBookId !== bookId ? getBookById(nextBookId) : null;

  const prevUrl = prevContent ? `/books/${prev}` : null;
  const nextUrl = nextContent ? `/books/${next}` : null;

  // Extract first 3 characters of original text for display, with ellipsis if longer
  const getContentLabelText = (c: ReturnType<typeof getContentById>) => {
    if (!c?.segments?.length) return '';
    const fullText = c.segments.map((s) => s?.text?.original ?? '').join('');

    const maxLength = 3;
    return fullText.length > maxLength
      ? `${fullText.slice(0, maxLength)}...`
      : fullText;
  };

  const prevLabel = prevContent
    ? prevBook
      ? `${prevBook.name}（${getContentLabelText(prevContent)}）へ`
      : `前の章（${getContentLabelText(prevContent)}）へ`
    : undefined;
  const nextLabel = nextContent
    ? nextBook
      ? `${nextBook.name}（${getContentLabelText(nextContent)}）へ`
      : `次の章（${getContentLabelText(nextContent)}）へ`
    : undefined;

  return (
    <div className="bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="sticky top-14 z-10 mb-8 bg-zinc-50 py-4 dark:bg-black">
          <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:underline">
              トップ
            </Link>
            <span className="mx-2">&gt;</span>
            <Link href={`/books/${book.id}`} className="hover:underline">
              {book.name}
            </Link>
            <span className="mx-2">&gt;</span>
            <Link
              href={`/books/${book.id}/${section.id}`}
              className="hover:underline"
            >
              {section.name}
            </Link>
            <span className="mx-2">&gt;</span>
            <span>{content.chapter}</span>
          </nav>
          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {section.name}: {content.chapter}
            </h1>
            <Suspense fallback={null}>
              <ContentPageClient contentId={contentId} />
            </Suspense>
          </div>
          <nav className="flex items-center justify-between gap-1 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            {prevUrl ? (
              <Link
                href={prevUrl}
                className="group relative flex items-center gap-1.5 rounded px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <span>←</span>
                <span>{prevLabel ?? '前の章'}</span>
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
                className="group relative flex items-center gap-1.5 rounded px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <span>{nextLabel ?? '次の章'}</span>
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

        <div className="lg:flex lg:flex-row-reverse lg:gap-8">
          {/* AudioPlayer: top on mobile, right column on desktop */}
          <aside className="mb-6 space-y-4 lg:mb-0 lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-8 lg:space-y-4">
              <Suspense fallback={null}>
                <AudioPlayer
                  bookId={bookId}
                  sectionId={sectionId}
                  chapterId={chapterId}
                  contentId={contentId}
                  segmentCount={content.segments.length}
                  segmentTexts={content.segments.map((s) => s.text.original)}
                />
              </Suspense>
              <Suspense fallback={null}>
                <ResponsiveFavoriteContentList />
              </Suspense>
            </div>
          </aside>

          {/* Main content */}
          <article className="space-y-6 lg:flex-1 lg:min-w-0">
            {isDev && (
              <AudioRecorder
                bookId={bookId}
                sectionId={sectionId}
                chapterId={chapterId}
              />
            )}

            <Suspense
              fallback={<div className="text-zinc-500">読み込み中...</div>}
            >
              <HakubunWithTabs
                segments={content.segments}
                bookId={bookId}
                sectionId={sectionId}
                chapterId={chapterId}
              />
            </Suspense>

            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                読み下し文
              </h2>
              <div className="relative rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
                <div className="absolute right-4 top-4">
                  <CopyJapaneseTextButton segments={content.segments} />
                </div>
                <div className="space-y-2 text-lg leading-loose text-zinc-700 dark:text-zinc-300">
                  {content.segments.map((segment) => (
                    <p key={`${segment.start_pos}-${segment.end_pos}`}>
                      <JapaneseTextWithRuby text={segment.text.japanese} />
                    </p>
                  ))}
                </div>
              </div>
            </section>
          </article>
        </div>

        <div className="mt-6 text-sm text-zinc-500">
          <a
            href={`https://github.com/Rindrics/izuminokami-kanesada/blob/main/contents/input/${contentId}.yaml`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            このページの元データを見る
          </a>
        </div>
      </main>
    </div>
  );
}
