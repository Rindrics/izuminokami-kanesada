import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FavoriteContentList } from '@/components/FavoriteContentList';
import { PageWithSidebar } from '@/components/PageWithSidebar';
import { getAllBookIds, getBookById } from '@/generated/books';

interface Props {
  params: Promise<{ bookId: string }>;
}

export async function generateStaticParams() {
  return getAllBookIds().map((bookId) => ({ bookId }));
}

export default async function BookPage({ params }: Props) {
  const { bookId } = await params;
  const book = getBookById(bookId);

  if (!book) {
    notFound();
  }

  return (
    <PageWithSidebar showSidebar={false}>
      <header className="mb-8">
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
        <div className="lg:flex lg:flex-row-reverse lg:gap-8">
          <aside className="mb-6 lg:mb-0 lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-8">
              <Suspense fallback={null}>
                <FavoriteContentList maxItems={5} />
              </Suspense>
            </div>
          </aside>
          <ul className="space-y-2 lg:min-w-0 lg:flex-1">
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
        </div>
      </section>
    </PageWithSidebar>
  );
}
