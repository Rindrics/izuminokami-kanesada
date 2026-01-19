import { notFound } from 'next/navigation';
import { findLongestMatch } from '@/data/kunyomi-dictionary';
import { getAllContentIds, getContentById } from '@/data/sample-contents';
import type { JapaneseRuby, Segment } from '@/types/content';

interface Props {
  params: Promise<{ id: string[] }>;
}

export async function generateStaticParams() {
  const ids = getAllContentIds();
  // "lunyu/1/1" → ["lunyu", "1", "1"]
  return ids.map((id) => ({ id: id.split('/') }));
}

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

// Build ruby map: auto from dictionary + overrides
function buildRubyMap(
  text: string,
  overrides?: JapaneseRuby[],
): Map<number, { ruby: string; length: number }> {
  const rubyMap = new Map<number, { ruby: string; length: number }>();

  // Build override map by position
  const overrideMap = new Map<number, JapaneseRuby>();
  if (overrides) {
    for (const override of overrides) {
      overrideMap.set(override.position, override);
    }
  }

  // Scan text and find ruby from dictionary or overrides
  let i = 0;
  while (i < text.length) {
    // Check for override at this position
    const override = overrideMap.get(i);
    if (override) {
      rubyMap.set(i, { ruby: override.ruby, length: override.text.length });
      i += override.text.length;
      continue;
    }

    // Try to find longest match in dictionary
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
  // Build ruby map from dictionary + overrides
  const rubyMap = buildRubyMap(text, rubyData);

  // Build skip positions for multi-char ruby
  const skipPositions = new Set<number>();
  for (const [pos, { length }] of rubyMap) {
    for (let j = 1; j < length; j++) {
      skipPositions.add(pos + j);
    }
  }

  // Build elements character by character
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    // Skip if this position is part of a multi-char ruby
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

export default async function ContentPage({ params }: Props) {
  const { id } = await params;
  // ["lunyu", "1", "1"] → "lunyu/1/1"
  const contentId = id.join('/');
  const content = getContentById(contentId);

  if (!content) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>
              {content.book_id === 'lunyu' ? '論語' : content.book_id}
            </span>
            <span className="mx-2">{'>'}</span>
            <span>{content.section}</span>
            <span className="mx-2">{'>'}</span>
            <span>{content.chapter}</span>
          </nav>
          <h1 className="text-2xl font-bold text-black dark:text-white">
            {content.section} {content.chapter}
          </h1>
        </header>

        {/* Content */}
        <article className="space-y-6">
          {/* Hakubun (white text) */}
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

          {/* Legend */}
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

          {/* Japanese reading (if available) */}
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
