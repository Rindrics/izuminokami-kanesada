import Link from 'next/link';
import { BackButton } from '@/components/BackButton';
import { getDefaultMeaning } from '@/data/hanzi-dictionary';
import { getBookById, getSectionById } from '@/generated/books';
import { contents } from '@/generated/contents';
import { stats } from '@/generated/stats';

interface PageProps {
  params: Promise<{ char: string }>;
}

export function generateStaticParams() {
  return stats.charIndex.map((entry) => ({
    char: encodeURIComponent(entry.char),
  }));
}

export default async function CharPage({ params }: PageProps) {
  const { char } = await params;
  const decodedChar = decodeURIComponent(char);

  // Find the character in the index
  const charEntry = stats.charIndex.find((e) => e.char === decodedChar);
  const contentIds = charEntry?.contentIds ?? [];

  // Get character info from dictionary
  const meaning = getDefaultMeaning(decodedChar);

  // Get frequency info
  const freqEntry = stats.charFrequencies.find((f) => f.char === decodedChar);

  return (
    <div className="bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton />
        <header className="mb-8">
          <h1 className="mb-2 text-5xl font-bold text-black dark:text-white">
            {decodedChar}
          </h1>
          {meaning && (
            <div className="text-lg text-zinc-600 dark:text-zinc-400">
              {meaning.onyomi && <span>音読み: {meaning.onyomi}</span>}
              {meaning.onyomi && meaning.pinyin && <span> / </span>}
              {meaning.pinyin && <span>ピンイン: {meaning.pinyin}</span>}
            </div>
          )}
          {freqEntry && (
            <p className="mt-2 text-sm text-zinc-500">
              出現回数: {freqEntry.count}回（全体の {freqEntry.percentage}%）
            </p>
          )}
        </header>

        <section>
          <h2 className="mb-4 text-xl font-bold text-black dark:text-white">
            「{decodedChar}」が登場する章（{contentIds.length} 件）
          </h2>

          {contentIds.length === 0 ? (
            <p className="text-zinc-500">該当する章がありません</p>
          ) : (
            <ul className="space-y-3">
              {contentIds.map((contentId) => {
                const [bookId, sectionId, chapterId] = contentId.split('/');
                const content = contents.find(
                  (c) => c.content_id === contentId,
                );
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
      </main>
    </div>
  );
}
