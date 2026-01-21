import Link from 'next/link';
import { books } from '@/generated/books';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            素読庵
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            漢文素読を子供と実践する &quot;指導者&quot;
            の学習を支援する意図で作っています。
          </p>
        </header>

        <section>
          <h2 className="mb-4 text-lg font-medium text-zinc-600 dark:text-zinc-400">
            経書一覧
          </h2>
          <ul className="space-y-2">
            {books.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/books/${book.id}`}
                  className="block rounded-lg bg-white p-4 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <span className="text-lg text-black dark:text-white">
                    {book.name}
                  </span>
                  <span className="ml-2 text-sm text-zinc-500">
                    ({book.sections.length}編)
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
