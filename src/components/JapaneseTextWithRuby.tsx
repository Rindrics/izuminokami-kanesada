import { findLongestMatch } from '@/data/kunyomi-dictionary';
import type { JapaneseRuby } from '@/types/content';

/**
 * Parse inline override notation: 漢字（読み）
 * Returns the clean text (without override brackets) and extracted overrides
 */
function parseInlineOverrides(text: string): {
  cleanText: string;
  overrides: JapaneseRuby[];
} {
  const overrides: JapaneseRuby[] = [];
  // Match: CJK character followed by full-width parentheses with hiragana inside
  const pattern = /([一-龥])（([ぁ-ん]+)）/g;

  let cleanText = '';
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    // Add text before this match
    cleanText += text.slice(lastIndex, match.index);

    // Record the override at the position in clean text
    const position = cleanText.length;
    const kanji = match[1];
    const ruby = match[2];

    overrides.push({
      position,
      text: kanji,
      ruby,
    });

    // Add the kanji (without brackets and reading) to clean text
    cleanText += kanji;
    lastIndex = (match.index ?? 0) + match[0].length;
  }

  // Add remaining text after last match
  cleanText += text.slice(lastIndex);

  return { cleanText, overrides };
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
      // Guard: verify override text matches actual text at position
      const target = text.slice(i, i + override.text.length);
      if (target === override.text) {
        rubyMap.set(i, { ruby: override.ruby, length: override.text.length });
        i += override.text.length;
        continue;
      }
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

interface Props {
  text: string;
  rubyData?: JapaneseRuby[];
}

/**
 * Line break priority for Japanese text:
 * 1. Punctuation (。、) - highest priority
 * 2. Space - medium priority
 * 3. Any other position - lowest priority (natural wrap)
 */
type BreakPriority = 'punctuation' | 'space' | 'none';

interface Segment {
  text: string;
  startPos: number;
  breakAfter: BreakPriority;
}

/**
 * Split text into segments by punctuation and spaces
 */
function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let currentSegment = '';
  let startPos = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '。' || char === '、') {
      // Include punctuation in current segment, then break
      currentSegment += char;
      segments.push({
        text: currentSegment,
        startPos,
        breakAfter: 'punctuation',
      });
      currentSegment = '';
      startPos = i + 1;
    } else if (char === ' ') {
      // Space: end current segment (don't include space)
      if (currentSegment.length > 0) {
        segments.push({
          text: currentSegment,
          startPos,
          breakAfter: 'space',
        });
      }
      currentSegment = '';
      startPos = i + 1;
    } else {
      currentSegment += char;
    }
  }

  // Add remaining segment
  if (currentSegment.length > 0) {
    segments.push({
      text: currentSegment,
      startPos,
      breakAfter: 'none',
    });
  }

  return segments;
}

/**
 * Render a single segment with ruby annotations
 */
function SegmentWithRuby({
  segment,
  rubyMap,
  basePosition,
}: {
  segment: string;
  rubyMap: Map<number, { ruby: string; length: number }>;
  basePosition: number;
}) {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < segment.length) {
    const globalPos = basePosition + i;
    const match = rubyMap.get(globalPos);

    if (match) {
      const rubyText = segment.slice(i, i + match.length);
      elements.push(
        <ruby key={globalPos} className="ruby-annotation">
          {rubyText}
          <rt className="text-xs text-zinc-500 dark:text-zinc-400">
            {match.ruby}
          </rt>
        </ruby>,
      );
      i += match.length;
    } else {
      // Find next ruby position within this segment
      let nextMatchIndex = segment.length;
      for (const pos of rubyMap.keys()) {
        const localPos = pos - basePosition;
        if (localPos > i && localPos < nextMatchIndex) {
          nextMatchIndex = localPos;
        }
      }
      const nonRubyText = segment.slice(i, nextMatchIndex);
      elements.push(nonRubyText);
      i = nextMatchIndex;
    }
  }

  return <>{elements}</>;
}

export function JapaneseTextWithRuby({ text, rubyData }: Props) {
  // Parse inline overrides from text (e.g., 為（た）る)
  const { cleanText, overrides: inlineOverrides } = parseInlineOverrides(text);

  // Merge inline overrides with rubyData (inline takes precedence)
  const mergedOverrides = [...(rubyData ?? []), ...inlineOverrides];

  const rubyMap = buildRubyMap(cleanText, mergedOverrides);

  // Split text into segments by punctuation and spaces
  const segments = splitIntoSegments(cleanText);

  // If no segments, render plain text
  if (segments.length === 0) {
    return (
      <SegmentWithRuby segment={cleanText} rubyMap={rubyMap} basePosition={0} />
    );
  }

  // Render each segment with appropriate break hints
  // On mobile: free line breaks (no margin control)
  // On desktop (sm+): priority-based breaks with margin
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < segments.length; i++) {
    const { text: segmentText, startPos, breakAfter } = segments[i];

    // Tailwind classes for responsive margin
    // Mobile: no margin (free breaks), Desktop: priority-based margin
    const marginClass =
      breakAfter === 'punctuation'
        ? 'sm:mr-3'
        : breakAfter === 'space'
          ? 'sm:mr-2'
          : '';

    elements.push(
      <span key={startPos} className={`inline ${marginClass}`}>
        <SegmentWithRuby
          segment={segmentText}
          rubyMap={rubyMap}
          basePosition={startPos}
        />
      </span>,
    );
  }

  return <>{elements}</>;
}
