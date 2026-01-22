import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <div className="bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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
        </section>
      </main>
    </div>
  );
}
