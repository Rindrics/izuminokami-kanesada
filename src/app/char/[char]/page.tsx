import { BackButton } from '@/components/BackButton';
import { getDefaultMeaning } from '@/data/hanzi-dictionary';
import { stats } from '@/generated/stats';

import { CharContentList } from './CharContentList';

interface PageProps {
  params: Promise<{ char: string }>;
}

export function generateStaticParams() {
  return stats.charIndex.map((entry) => ({
    char: entry.char,
  }));
}

export default async function CharPage({ params }: PageProps) {
  const { char: rawChar } = await params;
  // Next.js encodes the param internally, so we need to decode it
  const char = decodeURIComponent(rawChar);

  // Find the character in the index
  const charEntry = stats.charIndex.find((e) => e.char === char);
  const contentIds = charEntry?.contentIds ?? [];

  // Get character info from dictionary
  const meaning = getDefaultMeaning(char);

  // Get frequency info
  const freqEntry = stats.charFrequencies.find((f) => f.char === char);

  return (
    <div className="bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton />
        <header className="mb-8">
          <h1 className="mb-2 text-5xl font-bold text-black dark:text-white">
            {char}
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

        <CharContentList char={char} contentIds={contentIds} />
      </main>
    </div>
  );
}
