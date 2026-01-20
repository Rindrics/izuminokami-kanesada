import { findLongestMatch } from '@/data/kunyomi-dictionary';
import type { JapaneseRuby } from '@/types/content';

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
  const rubyMap = buildRubyMap(text, rubyData);

  // Sort ruby positions for efficient lookup of next match
  const sortedPositions = Array.from(rubyMap.keys()).sort((a, b) => a - b);

  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
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
      i += match.length;
    } else {
      // Find the next ruby position to group non-ruby text
      let nextMatchIndex = text.length;
      for (const pos of sortedPositions) {
        if (pos > i) {
          nextMatchIndex = pos;
          break;
        }
      }
      const nonRubyText = text.slice(i, nextMatchIndex);
      elements.push(nonRubyText);
      i = nextMatchIndex;
    }
  }

  return <>{elements}</>;
}
