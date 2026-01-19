import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findLongestMatch } from '@/data/kunyomi-dictionary';
import {
  getAllBookIds,
  getAllContentIds,
  getAllSectionPaths,
  getBookById,
  getContentById,
  getSectionById,
} from '@/data/sample-contents';
import type { JapaneseRuby, Segment } from '@/types/content';

interface Props {
  params: Promise<{ id: string[] }>;
}

export async function generateStaticParams() {
  const params: { id: string[] }[] = [];

  // Book pages: /contents/lunyu
  for (const bookId of getAllBookIds()) {
    params.push({ id: [bookId] });
  }

  // Section pages: /contents/lunyu/1
  for (const path of getAllSectionPaths()) {
    params.push({ id: path.split('/') });
  }

  // Content pages: /contents/lunyu/1/1
  for (const contentId of getAllContentIds()) {
    params.push({ id: contentId.split('/') });
  }

  return params;
}

// ============================================
// Book Page: /contents/lunyu
// ============================================
function BookPage({ bookId }: { bookId: string }) {
  const book = getBookById(bookId);

  if (!book) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            {book.name}
          </h1>
        </header>

        <section>
          <h2 className="mb-4 text-lg font-medium text-zinc-600 dark:text-zinc-400">
            編一覧
          </h2>
          <ul className="space-y-2">
            {book.sections.map((section) => (
              <li key={section.id}>
                <Link
                  href={`/contents/${book.id}/${section.id}`}
                  className="block rounded-lg bg-white p-4 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <span className="text-lg text-black dark:text-white">
                    {section.name}
                  </span>
                  <span className="ml-2 text-sm text-zinc-500">
                    ({section.chapters.length}章)
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

// ============================================
// Section Page: /contents/lunyu/1
// ============================================
function SectionPage({
  bookId,
  sectionId,
}: {
  bookId: string;
  sectionId: string;
}) {
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
            <Link href={`/contents/${book.id}`} className="hover:underline">
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
          <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {section.chapters.map((chapter) => (
              <li key={chapter}>
                <Link
                  href={`/contents/${book.id}/${section.id}/${chapter}`}
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <span className="text-lg text-black dark:text-white">
                    {chapter}
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

// ============================================
// Content Page: /contents/lunyu/1/1
// ============================================
function SegmentView({ segment }: { segment: Segment }) {
  const isNarration = segment.speaker === null;

  return (
    <span
      className={`
        inline
        ${isNarration ? 'text-zinc-500 dark:text-zinc-400' : 'text-black dark:text-white'}
        ${!isNarration ? 'bg-amber-50 dark:bg-amber-900/20 px-1 rounded' : ''}
      `}
    >
      {segment.text}
    </span>
  );
}

function buildRubyMap(
  text: string,
  overrides?: JapaneseRuby[],
): Map<number, { ruby: string; length: number }> {
  const rubyMap = new Map<number, { ruby: string; length: number }>();

  const overrideMap = new Map<number, JapaneseRuby>();
  if (overrides) {
    for (const override of overrides) {
      overrideMap.set(override.position, override);
    }
  }

  let i = 0;
  while (i < text.length) {
    const override = overrideMap.get(i);
    if (override) {
      rubyMap.set(i, { ruby: override.ruby, length: override.text.length });
      i += override.text.length;
      continue;
    }

    const match = findLongestMatch(text, i);
    if (match) {
      rubyMap.set(i, { ruby: match.ruby, length: match.length });
      i += match.length;
    } else {
      i += 1;
    }
  }

  return rubyMap;
}

function JapaneseTextWithRuby({
  text,
  rubyData,
}: {
  text: string;
  rubyData?: JapaneseRuby[];
}) {
  const rubyMap = buildRubyMap(text, rubyData);

  const skipPositions = new Set<number>();
  for (const [pos, { length }] of rubyMap) {
    for (let j = 1; j < length; j++) {
      skipPositions.add(pos + j);
    }
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    if (skipPositions.has(i)) {
      continue;
    }

    const match = rubyMap.get(i);

    if (match) {
      const rubyText = text.slice(i, i + match.length);
      elements.push(
        <ruby key={i} className="ruby-annotation">
          {rubyText}
          <rt className="text-xs text-zinc-500 dark:text-zinc-400">
            {match.ruby}
          </rt>
        </ruby>,
      );
    } else {
      elements.push(<span key={i}>{text[i]}</span>);
    }
  }

  return <>{elements}</>;
}

function ContentPage({
  bookId,
  sectionId,
  chapterId,
}: {
  bookId: string;
  sectionId: string;
  chapterId: string;
}) {
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
            <Link href={`/contents/${book.id}`} className="hover:underline">
              {book.name}
            </Link>
            <span className="mx-2">{'>'}</span>
            <Link
              href={`/contents/${book.id}/${section.id}`}
              className="hover:underline"
            >
              {section.name}
            </Link>
            <span className="mx-2">{'>'}</span>
            <span>{content.chapter}</span>
          </nav>
          <h1 className="text-2xl font-bold text-black dark:text-white">
            {section.name} {content.chapter}
          </h1>
        </header>

        <article className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              白文
            </h2>
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
              <p className="text-2xl leading-relaxed tracking-wider">
                {content.segments.map((segment) => (
                  <SegmentView
                    key={`${segment.start_pos}-${segment.end_pos}`}
                    segment={segment}
                  />
                ))}
              </p>
            </div>
          </section>

          <section className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-amber-50 dark:bg-amber-900/20" />
              <span className="text-zinc-600 dark:text-zinc-400">発言</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-zinc-100 dark:bg-zinc-800" />
              <span className="text-zinc-600 dark:text-zinc-400">
                ナレーション
              </span>
            </div>
          </section>

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

// ============================================
// Router
// ============================================
export default async function Page({ params }: Props) {
  const { id } = await params;

  switch (id.length) {
    case 1:
      // /contents/lunyu → Book page
      return <BookPage bookId={id[0]} />;
    case 2:
      // /contents/lunyu/1 → Section page
      return <SectionPage bookId={id[0]} sectionId={id[1]} />;
    case 3:
      // /contents/lunyu/1/1 → Content page
      return <ContentPage bookId={id[0]} sectionId={id[1]} chapterId={id[2]} />;
    default:
      notFound();
  }
  }
