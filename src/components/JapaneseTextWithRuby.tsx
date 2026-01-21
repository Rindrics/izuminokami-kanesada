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

export function JapaneseTextWithRuby({ text, rubyData }: Props) {
  // Parse inline overrides from text (e.g., 為（た）る)
  const { cleanText, overrides: inlineOverrides } = parseInlineOverrides(text);

  // Merge inline overrides with rubyData (inline takes precedence)
  const mergedOverrides = [...(rubyData ?? []), ...inlineOverrides];

  const rubyMap = buildRubyMap(cleanText, mergedOverrides);

  // Sort ruby positions for efficient lookup of next match
  const sortedPositions = Array.from(rubyMap.keys()).sort((a, b) => a - b);

  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < cleanText.length) {
    const match = rubyMap.get(i);

    if (match) {
      const rubyText = cleanText.slice(i, i + match.length);
      elements.push(
        <ruby key={i} className="ruby-annotation">
          {rubyText}
          <rt className="text-xs text-zinc-500 dark:text-zinc-400">
            {match.ruby}
          </rt>
        </ruby>,
      );
      i += match.length;
    } else {
      // Find the next ruby position to group non-ruby text
      let nextMatchIndex = cleanText.length;
      for (const pos of sortedPositions) {
        if (pos > i) {
          nextMatchIndex = pos;
          break;
        }
      }
      const nonRubyText = cleanText.slice(i, nextMatchIndex);
      elements.push(nonRubyText);
      i = nextMatchIndex;
    }
  }

  return <>{elements}</>;
}
