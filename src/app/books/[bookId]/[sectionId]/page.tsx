import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllSectionPaths, getBookById, getSectionById } from '@/data/books';
import { getContentById } from '@/generated/contents';

interface Props {
  params: Promise<{ bookId: string; sectionId: string }>;
}

export async function generateStaticParams() {
  return getAllSectionPaths().map((path) => {
    const [bookId, sectionId] = path.split('/');
    return { bookId, sectionId };
  });
}

export default async function SectionPage({ params }: Props) {
  const { bookId, sectionId } = await params;
  const book = getBookById(bookId);
  const section = getSectionById(bookId, sectionId);

  if (!book || !section) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:underline">
              トップ
            </Link>
            <span className="mx-2">&gt;</span>
            <Link href={`/books/${book.id}`} className="hover:underline">
              {book.name}
            </Link>
          </nav>
          <h1 className="text-3xl font-bold text-black dark:text-white">
            {section.name}
          </h1>
        </header>

        <section>
          <h2 className="mb-4 text-lg font-medium text-zinc-600 dark:text-zinc-400">
            章一覧
          </h2>
          <ul className="space-y-2">
            {section.chapters.map((chapter) => {
              const contentId = `${book.id}/${section.id}/${chapter}`;
              const content = getContentById(contentId);
              // Remove hyphens (tone sandhi markers) for display
              const previewText = content?.text?.replace(/-/g, '') ?? '';

              return (
                <li key={chapter}>
                  <Link
                    href={`/books/${book.id}/${section.id}/${chapter}`}
                    className="block rounded-lg bg-white p-4 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="shrink-0 text-lg font-medium text-black dark:text-white">
                        {chapter}
                      </span>
                      <span className="min-w-0 truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {previewText}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
