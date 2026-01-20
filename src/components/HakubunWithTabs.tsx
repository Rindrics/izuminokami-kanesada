'use client';

import { useState } from 'react';
import {
  getDefaultMeaning,
  getMeaningById,
  type HanziMeaning,
} from '@/data/hanzi-dictionary';
import type { ContentHanzi, Segment } from '@/types/content';

type DisplayMode = 'plain' | 'onyomi' | 'pinyin';

interface Props {
  segments: Segment[];
  contentHanzi?: ContentHanzi[];
}

// Build a map of position -> meaning for overrides
function buildOverrideMap(
  contentHanzi?: ContentHanzi[],
): Map<number, ContentHanzi> {
  const map = new Map<number, ContentHanzi>();
  if (contentHanzi) {
    for (const ch of contentHanzi) {
      map.set(ch.position, ch);
    }
  }
  return map;
}

// Get the meaning for a hanzi at a specific position
function getMeaningAtPosition(
  char: string,
  globalPos: number,
  overrideMap: Map<number, ContentHanzi>,
): HanziMeaning | undefined {
  const override = overrideMap.get(globalPos);
  if (override) {
    return getMeaningById(override.hanzi_id, override.meaning_id);
  }
  return getDefaultMeaning(char);
}

function TextWithRuby({
  text,
  mode,
  isNarration,
  startPos,
  overrideMap,
}: {
  text: string;
  mode: DisplayMode;
  isNarration: boolean;
  startPos: number;
  overrideMap: Map<number, ContentHanzi>;
}) {
  const baseClass = isNarration
    ? 'text-zinc-500 dark:text-zinc-400'
    : 'text-black dark:text-white';
  const bgClass = !isNarration
    ? 'bg-amber-50 dark:bg-amber-900/20 px-1 rounded'
    : '';

  if (mode === 'plain') {
    return <span className={`inline ${baseClass} ${bgClass}`}>{text}</span>;
  }

  // Build ruby elements for onyomi or pinyin
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const globalPos = startPos + i;
    const meaning = getMeaningAtPosition(char, globalPos, overrideMap);
    const ruby = meaning
      ? mode === 'onyomi'
        ? meaning.onyomi
        : meaning.pinyin
      : undefined;

    if (ruby) {
      elements.push(
        <ruby key={i}>
          {char}
          <rt className="text-xs text-zinc-500 dark:text-zinc-400">{ruby}</rt>
        </ruby>,
      );
    } else {
      elements.push(<span key={i}>{char}</span>);
    }
  }

  return <span className={`inline ${baseClass} ${bgClass}`}>{elements}</span>;
}

export function HakubunWithTabs({ segments, contentHanzi }: Props) {
  const [mode, setMode] = useState<DisplayMode>('plain');
  const overrideMap = buildOverrideMap(contentHanzi);

  const tabs: { id: DisplayMode; label: string }[] = [
    { id: 'plain', label: '白文' },
    { id: 'onyomi', label: '音読み' },
    { id: 'pinyin', label: 'ピンイン' },
  ];

  return (
    <section>
      {/* Tabs */}
      <div className="mb-3 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              mode === tab.id
                ? 'bg-white text-black dark:bg-zinc-900 dark:text-white'
                : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-lg rounded-tl-none bg-white p-6 shadow-sm dark:bg-zinc-900">
        <p className="text-2xl leading-relaxed tracking-wider">
          {segments.map((segment) => (
            <TextWithRuby
              key={`${segment.start_pos}-${segment.end_pos}`}
              text={segment.text}
              mode={mode}
              isNarration={segment.speaker === null}
              startPos={segment.start_pos}
              overrideMap={overrideMap}
            />
          ))}
        </p>
      </div>
    </section>
  );
}
