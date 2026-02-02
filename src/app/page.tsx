import Link from 'next/link';
import { ListWithFavoriteSidebar } from '@/components/ListWithFavoriteSidebar';
import { PageWithSidebar } from '@/components/PageWithSidebar';
import { books } from '@/generated/books';

export default function Home() {
  return (
    <PageWithSidebar showSidebar={false}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">
          素読庵
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          漢文素読を子供と実践する &quot;指導者&quot;
          の学習を支援する意図で作っています。
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium text-zinc-600 dark:text-zinc-400">
          経書一覧
        </h2>
        <ListWithFavoriteSidebar>
          <ul className="space-y-2">
            {books.map((book) => {
              const currentSections = book.sections.filter(
                (s) => s.chapters.length > 0,
              ).length;
              const currentChapters = book.sections.reduce(
                (sum, s) => sum + s.chapters.length,
                0,
              );
              const totalChapters = book.sections.reduce(
                (sum, s) => sum + s.totalChapters,
                0,
              );
              const hasContent = currentChapters > 0;
              const isSingleSection = book.totalSections === 1;

              const progressText = isSingleSection
                ? `${currentChapters}/${totalChapters}章`
                : `${currentSections}/${book.totalSections}編、計${currentChapters}章`;

              const disabledText = isSingleSection
                ? `0/${totalChapters}章`
                : `0/${book.totalSections}編`;

              return (
                <li key={book.id}>
                  {hasContent ? (
                    <Link
                      href={`/books/${book.id}`}
                      className="block rounded-lg bg-white p-4 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      <span className="text-lg text-black dark:text-white">
                        {book.name}
                      </span>
                      <span className="ml-2 text-sm text-zinc-500">
                        ({progressText})
                      </span>
                    </Link>
                  ) : (
                    <div className="block cursor-not-allowed rounded-lg bg-zinc-100 p-4 opacity-50 dark:bg-zinc-800">
                      <span className="text-lg text-zinc-400 dark:text-zinc-500">
                        {book.name}
                      </span>
                      <span className="ml-2 text-sm text-zinc-400 dark:text-zinc-500">
                        ({disabledText})
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
