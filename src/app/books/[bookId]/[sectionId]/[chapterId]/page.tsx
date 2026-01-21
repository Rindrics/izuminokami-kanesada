import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HakubunWithTabs } from '@/components/HakubunWithTabs';
import { JapaneseTextWithRuby } from '@/components/JapaneseTextWithRuby';
import { getBookById, getSectionById } from '@/generated/books';
import { getAllContentIds, getContentById } from '@/generated/contents';

interface Props {
  params: Promise<{ bookId: string; sectionId: string; chapterId: string }>;
}

export async function generateStaticParams() {
  return getAllContentIds().map((contentId) => {
    const [bookId, sectionId, chapterId] = contentId.split('/');
    return { bookId, sectionId, chapterId };
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
          <h1 className="text-2xl font-bold text-black dark:text-white">
            {section.name}: {content.chapter}
          </h1>
        </header>

        <article className="space-y-6">
          <HakubunWithTabs segments={content.segments} />

          {content.japanese && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                読み下し文
              </h2>
              <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
                <p className="text-lg leading-loose text-zinc-700 dark:text-zinc-300">
                  <JapaneseTextWithRuby
                    text={content.japanese}
                    rubyData={content.japanese_ruby}
                  />
                </p>
              </div>
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
