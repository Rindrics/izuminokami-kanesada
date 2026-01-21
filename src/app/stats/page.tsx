import Link from 'next/link';
import { ClickableChar } from '@/components/ClickableChar';
import { books, getBookById } from '@/generated/books';
import { getPersonName } from '@/generated/persons';
import type { CharIndex } from '@/generated/stats';
import { stats } from '@/generated/stats';

// Key concepts to track (virtues and important terms in Confucian texts)
const keyConcepts = [
  { char: '仁', label: '仁（じん）', desc: '思いやり' },
  { char: '義', label: '義（ぎ）', desc: '正義' },
  { char: '礼', label: '礼（れい）', desc: '礼儀' },
  { char: '禮', label: '禮（れい）', desc: '礼儀' }, // 異体字
  { char: '智', label: '智（ち）', desc: '知恵' },
  { char: '信', label: '信（しん）', desc: '誠実' },
  { char: '孝', label: '孝（こう）', desc: '親孝行' },
  { char: '悌', label: '悌（てい）', desc: '兄弟愛' },
  { char: '忠', label: '忠（ちゅう）', desc: '忠義' },
  { char: '學', label: '學（がく）', desc: '学問' },
  { char: '道', label: '道（どう）', desc: '道理' },
  { char: '君', label: '君（くん）', desc: '君主' },
  { char: '民', label: '民（みん）', desc: '民衆' },
];

// Aggregation level for heatmap
type AggregationLevel = 'section' | 'book';

interface AggregatedUnit {
  id: string;
  label: string;
  totalChapters: number; // Total chapters in this unit for percentage calculation
}

function KeyConceptsHeatmap({
  charIndex,
  charFrequencies,
}: {
  charIndex: CharIndex[];
  charFrequencies: { char: string; count: number }[];
}) {
  // Build a map from char to contentIds
  const charToContentIds = new Map<string, string[]>();
  for (const entry of charIndex) {
    charToContentIds.set(entry.char, entry.contentIds);
  }

  // Build a map from char to total count
  const charToCount = new Map<string, number>();
  for (const cf of charFrequencies) {
    charToCount.set(cf.char, cf.count);
  }

  // Get all unique contentIds
  const allContentIds = [...new Set(charIndex.flatMap((e) => e.contentIds))];

  // Determine aggregation level based on data size
  // If multiple books exist, aggregate by book; otherwise by section
  const bookIds = [...new Set(allContentIds.map((id) => id.split('/')[0]))];
  const aggregationLevel: AggregationLevel =
    bookIds.length > 1 ? 'book' : 'section';

  // Build a map for book -> section -> totalChapters
  const sectionTotalChapters = new Map<string, number>();
  const bookTotalChapters = new Map<string, number>();
  for (const book of books) {
    let bookTotal = 0;
    for (const section of book.sections) {
      const key = `${book.id}/${section.id}`;
      sectionTotalChapters.set(key, section.totalChapters);
      bookTotal += section.totalChapters;
    }
    bookTotalChapters.set(book.id, bookTotal);
  }

  // Get aggregation units
  let units: AggregatedUnit[] = [];
  if (aggregationLevel === 'book') {
    // Aggregate by book
    units = bookIds.sort().map((bookId) => ({
      id: bookId,
      label: getBookById(bookId)?.name ?? bookId,
      totalChapters: bookTotalChapters.get(bookId) ?? 1,
    }));
  } else {
    // Aggregate by section (book/section)
    const sectionIds = [
      ...new Set(
        allContentIds.map((id) => {
          const [bookId, sectionId] = id.split('/');
          return `${bookId}/${sectionId}`;
        }),
      ),
    ].sort((a, b) => {
      const [bookA, secA] = a.split('/');
      const [bookB, secB] = b.split('/');
      return bookA.localeCompare(bookB) || Number(secA) - Number(secB);
    });
    units = sectionIds.map((sectionId) => ({
      id: sectionId,
      label: `第${sectionId.split('/')[1]}編`,
      totalChapters: sectionTotalChapters.get(sectionId) ?? 1,
    }));
  }

  // Count occurrences per unit for each concept (returns count of chapters containing the char)
  function countChaptersInUnit(char: string, unitId: string): number {
    const contentIds = charToContentIds.get(char) ?? [];
    return contentIds.filter((id) => id.startsWith(unitId)).length;
  }

  // Calculate percentage of chapters containing the character in a unit
  function getPercentageInUnit(char: string, unit: AggregatedUnit): number {
    const count = countChaptersInUnit(char, unit.id);
    return (count / unit.totalChapters) * 100;
  }

  // Filter to concepts that actually appear
  const presentConcepts = keyConcepts.filter((c) =>
    charToContentIds.has(c.char),
  );

  // Get background color based on percentage (0-100%)
  function getCellColor(percentage: number): string {
    if (percentage === 0) return 'bg-zinc-100 dark:bg-zinc-800';
    if (percentage < 25) return 'bg-blue-200 dark:bg-blue-900';
    if (percentage < 50) return 'bg-blue-400 dark:bg-blue-700';
    if (percentage < 75) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-blue-600 dark:bg-blue-500';
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="sticky left-0 bg-white px-3 py-2 text-left font-medium text-zinc-500 dark:bg-zinc-900">
              概念
            </th>
            {units.map((unit) => (
              <th
                key={unit.id}
                className="px-3 py-2 text-center font-medium text-zinc-500"
              >
                {unit.label}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium text-zinc-500">
              総出現
            </th>
          </tr>
        </thead>
        <tbody>
          {presentConcepts.map((concept) => {
            const totalCount = charToCount.get(concept.char) ?? 0;
            return (
              <tr
                key={concept.char}
                className="border-b border-zinc-100 dark:border-zinc-800"
              >
                <td className="sticky left-0 bg-white px-3 py-2 dark:bg-zinc-900">
                  <span
                    className="text-lg text-black dark:text-white"
                    title={concept.desc}
                  >
                    <ClickableChar char={concept.char} />
                  </span>
                </td>
                {units.map((unit) => {
                  const count = countChaptersInUnit(concept.char, unit.id);
                  const percentage = getPercentageInUnit(concept.char, unit);
                  return (
                    <td key={unit.id} className="px-3 py-2 text-center">
                      <div
                        className={`mx-auto flex h-8 w-12 items-center justify-center rounded ${getCellColor(percentage)}`}
                        title={`${concept.char}: ${count}/${unit.totalChapters}章 (${percentage.toFixed(0)}%) - ${unit.label}`}
                      >
                        {percentage > 0 && (
                          <span className="text-xs font-medium text-white">
                            {percentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-medium text-black dark:text-white">
                  {totalCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {presentConcepts.length === 0 && (
        <p className="p-4 text-center text-zinc-500">
          該当する概念が見つかりませんでした
        </p>
      )}
      <div className="border-t border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-700">
        集計単位: {aggregationLevel === 'book' ? '書籍別' : '編別'}
        {' / '}
        各編における出現率（%）で表示
      </div>
    </div>
  );
}

// Create Set from generated blacklist for efficient lookup
const frequencyBlacklist = new Set(stats.frequencyBlacklist);

export default function StatsPage() {
  // Filter out blacklisted characters and take top 10
  const topChars = stats.charFrequencies
    .filter((cf) => !frequencyBlacklist.has(cf.char))
    .slice(0, 10);

  // Calculate cumulative coverage
  let cumulative = 0;
  const coverage = topChars.map((cf) => {
    cumulative += cf.percentage;
    return Math.round(cumulative * 100) / 100;
  });

  // Average chapter length
  const avgLength =
    Math.round(
      (stats.chapterLengths.reduce((sum, cl) => sum + cl.charCount, 0) /
        stats.chapterLengths.length) *
        10,
    ) / 10;

  return (
    <div className="bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:underline">
              トップ
            </Link>
          </nav>
          <h1 className="text-3xl font-bold text-black dark:text-white">
            データで見る四書五経
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            収録コンテンツの統計分析
          </p>
        </header>

        {/* Data Source */}
        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-medium text-zinc-500">
            データソース
          </h2>
          <ul className="space-y-1 text-sm">
            {books.map((book) => (
              <li key={book.id} className="text-black dark:text-white">
                {book.name}:{' '}
                <span className="text-zinc-500">
                  {book.sections.length}/{book.totalSections} 編
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Overview */}
        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="text-2xl font-bold text-black dark:text-white">
              {stats.totalChapters}
            </div>
            <div className="text-sm text-zinc-500">章</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="text-2xl font-bold text-black dark:text-white">
              {stats.totalChars}
            </div>
            <div className="text-sm text-zinc-500">総文字数</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="text-2xl font-bold text-black dark:text-white">
              {stats.charFrequencies.length}
            </div>
            <div className="text-sm text-zinc-500">異なり字数</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="text-2xl font-bold text-black dark:text-white">
              {avgLength}
            </div>
            <div className="text-sm text-zinc-500">平均文字数/章</div>
          </div>
        </section>

        {/* Character Frequency */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-black dark:text-white">
            漢字頻度ランキング
          </h2>
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    順位
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    漢字
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500">
                    出現回数
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500">
                    割合
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500">
                    累積
                  </th>
                </tr>
              </thead>
              <tbody>
                {topChars.map((cf, i) => (
                  <tr
                    key={cf.char}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-4 py-2 text-2xl text-black dark:text-white">
                      <ClickableChar char={cf.char} />
                    </td>
                    <td className="px-4 py-2 text-right text-black dark:text-white">
                      {cf.count}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">
                      {cf.percentage}%
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">
                      {coverage[i]}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            上位 10 字で全体の {coverage[coverage.length - 1]}% をカバー
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              除外された漢字（{stats.frequencyBlacklist.length} 字）
            </summary>
            <div className="mt-2 flex flex-wrap gap-2 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
              {stats.frequencyBlacklist
                .map((char) => {
                  const freq = stats.charFrequencies.find(
                    (cf) => cf.char === char,
                  );
                  return { char, count: freq?.count ?? 0 };
                })
                .sort((a, b) => b.count - a.count)
                .map(({ char, count }) => (
                  <span key={char} className="text-zinc-600 dark:text-zinc-400">
                    <ClickableChar char={char} />（{count}回）
                  </span>
                ))}
            </div>
          </details>
        </section>

        {/* Person Frequency */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-black dark:text-white">
            人物登場頻度
          </h2>
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    人物
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500">
                    発話回数
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500">
                    言及回数
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-500">
                    合計
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.personFrequencies.map((pf) => (
                  <tr
                    key={pf.person}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-2 text-black dark:text-white">
                      {getPersonName(pf.person)}
                    </td>
                    <td className="px-4 py-2 text-right text-black dark:text-white">
                      {pf.speakerCount}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">
                      {pf.mentionedCount}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-black dark:text-white">
                      {pf.totalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Key Concepts Heatmap */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-black dark:text-white">
            徳目・重要概念の分布
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            各章における重要概念の出現（色が濃いほど多く出現）
          </p>
          <KeyConceptsHeatmap
            charIndex={stats.charIndex}
            charFrequencies={stats.charFrequencies}
          />
        </section>
      </main>
    </div>
  );
}
