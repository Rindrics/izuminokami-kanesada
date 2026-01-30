import Link from 'next/link';
import { getDefaultMeaning } from '@/data/hanzi-dictionary';
import { books } from '@/generated/books';
import { stats } from '@/generated/stats';

// Convert contentId to display format (e.g., "lunyu/1/1" -> "論語1-1")
function formatContentId(contentId: string): string {
  const [bookId, sectionId, chapterId] = contentId.split('/');
  const book = books.find((b) => b.id === bookId);
  const bookName = book?.name.substring(0, 1) ?? bookId;
  return `${bookName}${sectionId}-${chapterId}`;
}

// Get first kana character for grouping (ア行、カ行、etc.)
function getKanaGroup(onyomi: string): string {
  const firstChar = onyomi.charAt(0);
  const kanaGroups: Record<string, string> = {
    ア: 'ア',
    イ: 'ア',
    ウ: 'ア',
    エ: 'ア',
    オ: 'ア',
    カ: 'カ',
    キ: 'カ',
    ク: 'カ',
    ケ: 'カ',
    コ: 'カ',
    ガ: 'カ',
    ギ: 'カ',
    グ: 'カ',
    ゲ: 'カ',
    ゴ: 'カ',
    サ: 'サ',
    シ: 'サ',
    ス: 'サ',
    セ: 'サ',
    ソ: 'サ',
    ザ: 'サ',
    ジ: 'サ',
    ズ: 'サ',
    ゼ: 'サ',
    ゾ: 'サ',
    タ: 'タ',
    チ: 'タ',
    ツ: 'タ',
    テ: 'タ',
    ト: 'タ',
    ダ: 'タ',
    ヂ: 'タ',
    ヅ: 'タ',
    デ: 'タ',
    ド: 'タ',
    ナ: 'ナ',
    ニ: 'ナ',
    ヌ: 'ナ',
    ネ: 'ナ',
    ノ: 'ナ',
    ハ: 'ハ',
    ヒ: 'ハ',
    フ: 'ハ',
    ヘ: 'ハ',
    ホ: 'ハ',
    バ: 'ハ',
    ビ: 'ハ',
    ブ: 'ハ',
    ベ: 'ハ',
    ボ: 'ハ',
    パ: 'ハ',
    ピ: 'ハ',
    プ: 'ハ',
    ペ: 'ハ',
    ポ: 'ハ',
    マ: 'マ',
    ミ: 'マ',
    ム: 'マ',
    メ: 'マ',
    モ: 'マ',
    ヤ: 'ヤ',
    ユ: 'ヤ',
    ヨ: 'ヤ',
    ラ: 'ラ',
    リ: 'ラ',
    ル: 'ラ',
    レ: 'ラ',
    ロ: 'ラ',
    ワ: 'ワ',
    ヲ: 'ワ',
    ン: 'ワ',
  };
  return kanaGroups[firstChar] ?? 'ワ'; // Fallback to ワ行 for rare kana
}

const kanaOrder = ['ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ'];

// Get onyomi for a character or compound word
// For compound words, concatenate each character's onyomi
function getOnyomi(text: string): string {
  // Try the full text first (single character)
  if (text.length === 1) {
    const meaning = getDefaultMeaning(text);
    return meaning?.onyomi ?? '';
  }

  // For compound words, concatenate each character's onyomi
  const onyomiParts: string[] = [];
  for (const char of text) {
    const meaning = getDefaultMeaning(char);
    if (meaning?.onyomi) {
      onyomiParts.push(meaning.onyomi);
    }
  }

  return onyomiParts.length > 0 ? onyomiParts.join('') : '';
}

export default function IndexPage() {
  // Add onyomi to each entry and sort
  const entriesWithOnyomi = stats.charIndex
    .map((entry) => ({
      ...entry,
      onyomi: getOnyomi(entry.char),
    }))
    .filter((entry) => entry.onyomi !== ''); // Remove entries without onyomi

  // Sort by onyomi (Japanese phonetic order)
  entriesWithOnyomi.sort((a, b) => a.onyomi.localeCompare(b.onyomi, 'ja'));

  // Group by kana row
  const byKanaGroup = new Map<string, typeof entriesWithOnyomi>();
  for (const entry of entriesWithOnyomi) {
    const group = getKanaGroup(entry.onyomi);
    if (!byKanaGroup.has(group)) {
      byKanaGroup.set(group, []);
    }
    byKanaGroup.get(group)?.push(entry);
  }

  return (
    <div className="bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:underline">
              トップ
            </Link>
            {' / '}
            <Link href="/stats" className="hover:underline">
              統計
            </Link>
          </nav>
          <h1 className="text-3xl font-bold text-black dark:text-white">
            漢字索引
          </h1>
        </header>

        {/* Quick navigation */}
        <nav className="mb-6 flex flex-wrap gap-2">
          {kanaOrder
            .filter((k) => byKanaGroup.has(k))
            .map((group) => (
              <a
                key={group}
                href={`#group-${group}`}
                className="rounded px-3 py-1 text-sm hover:bg-zinc-300 dark:hover:bg-zinc-600"
              >
                {group}行
              </a>
            ))}
        </nav>

        <section className="mb-8 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
          {kanaOrder
            .filter((group) => byKanaGroup.has(group))
            .map((group) => {
              const chars = byKanaGroup.get(group) ?? [];
              return (
                <div key={group} id={`group-${group}`} className="mb-6">
                  <h2 className="ml-[-10px] mb-5 text-lg font-bold text-black dark:text-white">
                    {group}行
                  </h2>
                  <div className="columns-3 gap-4">
                    {chars.map((entry) => (
                      <div
                        key={entry.char}
                        className="mb-2 flex break-inside-avoid items-baseline gap-2 mb-5"
                      >
                        <div className="relative inline-flex items-center justify-center">
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm text-zinc-400">
                            {entry.onyomi}
                          </span>
                          <Link
                            href={`/char/${encodeURIComponent(entry.char)}`}
                            className="inline-block text-xl text-black hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {entry.char}
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {entry.contentIds.map((id) => (
                            <Link
                              key={id}
                              href={`/books/${id}`}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                              {formatContentId(id)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </section>
      </main>
    </div>
  );
}
