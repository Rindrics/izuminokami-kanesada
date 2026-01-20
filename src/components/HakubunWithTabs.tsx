'use client';

import { useState } from 'react';
import {
  getDefaultMeaning,
  getMeaningById,
  type HanziMeaning,
} from '@/data/hanzi-dictionary';
import type { ContentHanzi, Segment } from '@/types/content';

type DisplayMode = 'plain' | 'onyomi' | 'pinyin' | 'visual';

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

// Tone colors
const toneColors = {
  1: '#dc2626', // red-600: high
  2: '#f97316', // orange-500: rising
  3: '#16a34a', // green-600: low/dipping
  4: '#2563eb', // blue-600: falling
  5: '#71717a', // zinc-500: neutral
};

// SVG tone contour backgrounds
function ToneContour({ tone }: { tone: number }) {
  const color = toneColors[tone as keyof typeof toneColors] || toneColors[5];

  const contourStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };

  switch (tone) {
    case 1:
      // High flat tone: horizontal line at top
      return (
        <svg
          style={contourStyle}
          viewBox="0 0 40 50"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="5"
            y1="12"
            x2="35"
            y2="12"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      );
    case 2:
      // Rising tone: line going up from bottom-left to top-right
      return (
        <svg
          style={contourStyle}
          viewBox="0 0 40 50"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="8"
            y1="38"
            x2="32"
            y2="12"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      );
    case 3:
      // Dipping tone: V shape (down then up)
      return (
        <svg
          style={contourStyle}
          viewBox="0 0 40 50"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points="5,35 20,42 35,35"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      );
    case 4:
      // Falling tone: line going down from top-left to bottom-right
      return (
        <svg
          style={contourStyle}
          viewBox="0 0 40 50"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="8"
            y1="12"
            x2="32"
            y2="38"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      );
    default:
      return null;
  }
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

  // Build elements based on mode
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const globalPos = startPos + i;
    const meaning = getMeaningAtPosition(char, globalPos, overrideMap);

    if (mode === 'visual') {
      // Visual mode: SVG contour background with normal character style
      if (meaning) {
        elements.push(
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '1.4em',
              height: '1.8em',
              verticalAlign: 'middle',
              textAlign: 'center',
            }}
          >
            {/* Background tone contour */}
            <ToneContour tone={meaning.tone} />
            {/* Character - normal style */}
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                lineHeight: '1.8em',
              }}
            >
              {char}
            </span>
          </span>,
        );
      } else {
        elements.push(
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: '1.4em',
              height: '1.8em',
              lineHeight: '1.8em',
              textAlign: 'center',
            }}
          >
            {char}
          </span>,
        );
      }
    } else {
      // Onyomi or Pinyin mode with ruby
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
  }

  // For visual mode, don't apply the isNarration color
  const wrapperClass =
    mode === 'visual' ? `inline ${bgClass}` : `inline ${baseClass} ${bgClass}`;

  return <span className={wrapperClass}>{elements}</span>;
}

// Legend item with SVG contour
function LegendItem({ tone, label }: { tone: number; label: string }) {
  const color = toneColors[tone as keyof typeof toneColors];

  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="24" viewBox="0 0 40 50" aria-hidden="true">
        {tone === 1 && (
          <line
            x1="5"
            y1="15"
            x2="35"
            y2="15"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {tone === 2 && (
          <line
            x1="8"
            y1="40"
            x2="32"
            y2="10"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {tone === 3 && (
          <polyline
            points="5,18 20,42 35,22"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {tone === 4 && (
          <line
            x1="8"
            y1="10"
            x2="32"
            y2="40"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
    </div>
  );
}

// Legend for visual mode
function ToneLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-6 text-sm">
      <LegendItem tone={1} label="1声（高平）" />
      <LegendItem tone={2} label="2声（上昇）" />
      <LegendItem tone={3} label="3声（低抑）" />
      <LegendItem tone={4} label="4声（下降）" />
    </div>
  );
}

export function HakubunWithTabs({ segments, contentHanzi }: Props) {
  const [mode, setMode] = useState<DisplayMode>('plain');
  const overrideMap = buildOverrideMap(contentHanzi);

  const tabs: { id: DisplayMode; label: string }[] = [
    { id: 'plain', label: '白文' },
    { id: 'onyomi', label: '音読み' },
    { id: 'pinyin', label: 'ピンイン' },
    { id: 'visual', label: 'ビジュアル' },
  ];

  return (
    <section>
      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
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
        <p className="text-2xl leading-loose tracking-wider">
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

        {/* Legend for visual mode */}
        {mode === 'visual' && <ToneLegend />}
      </div>
    </section>
  );
}
