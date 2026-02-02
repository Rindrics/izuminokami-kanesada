import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListWithFavoriteSidebar } from '@/components/ListWithFavoriteSidebar';
import { PageWithSidebar } from '@/components/PageWithSidebar';
import { getAllBookIds, getBookById } from '@/generated/books';
import { createMetadata } from '@/lib/metadata';

interface Props {
  params: Promise<{ bookId: string }>;
}

export async function generateStaticParams() {
  return getAllBookIds().map((bookId) => ({ bookId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookId } = await params;
  const book = getBookById(bookId);

  if (!book) {
    return { title: '書籍が見つかりません' };
  }

  const currentSections = book.sections.filter(
    (s) => s.chapters.length > 0,
  ).length;
  const currentChapters = book.sections.reduce(
    (sum, s) => sum + s.chapters.length,
    0,
  );

  const title = book.name;
  const description = `${book.name}の全編を一覧表示。現在${currentSections}/${book.totalSections}編、計${currentChapters}章を収録。白文・訓読み・読み下し文で学習できます。`;

  return createMetadata({
    title,
    description,
    path: `/books/${bookId}/`,
  });
}

export default async function BookPage({ params }: Props) {
  const { bookId } = await params;
  const book = getBookById(bookId);

  if (!book) {
    notFound();
  }

  return (
    <PageWithSidebar showSidebar={false}>
      <header className="sticky top-14 z-10 mb-8 bg-zinc-50 py-4 dark:bg-black">
        <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
        </nav>
        <h1 className="text-3xl font-bold text-black dark:text-white">
          {book.name}
        </h1>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-medium text-zinc-600 dark:text-zinc-400">
          編一覧
        </h2>
        <ListWithFavoriteSidebar>
          <ul className="space-y-2">
            {book.sections.map((section) => {
              const hasContent = section.chapters.length > 0;
              return (
                <li key={section.id}>
                  {hasContent ? (
                    <Link
                      href={`/books/${book.id}/${section.id}`}
                      className="block rounded-lg bg-white p-4 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      <span className="text-lg text-black dark:text-white">
                        {section.name}
                      </span>
                      <span className="ml-2 text-sm text-zinc-500">
                        ({section.chapters.length}/{section.totalChapters}章)
                      </span>
                    </Link>
                  ) : (
                    <div className="block cursor-not-allowed rounded-lg bg-zinc-100 p-4 opacity-50 dark:bg-zinc-800">
                      <span className="text-lg text-zinc-400 dark:text-zinc-500">
                        {section.name}
                      </span>
                      <span className="ml-2 text-sm text-zinc-400 dark:text-zinc-500">
                        (0/{section.totalChapters}章)
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </ListWithFavoriteSidebar>
      </section>
    </PageWithSidebar>
  );
}
