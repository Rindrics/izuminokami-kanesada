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
