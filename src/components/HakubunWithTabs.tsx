'use client';

import { useState } from 'react';
import { getDefaultMeaning } from '@/data/hanzi-dictionary';
import type { Segment } from '@/types/content';

type DisplayMode = 'plain' | 'onyomi' | 'pinyin' | 'visual';

interface Props {
  segments: Segment[];
}

// Parse text with - markers and detect tone sandhi
// Returns: { chars, originalTones, effectiveTones }
// - originalTones: base tones from dictionary (for color)
// - effectiveTones: tones after sandhi applied (for contour shape)
function parseTextWithToneSandhi(text: string): {
  chars: string[];
  originalTones: (number | undefined)[];
  effectiveTones: (number | undefined)[];
} {
  const chars: string[] = [];
  const originalTones: (number | undefined)[] = [];

  // First pass: extract characters and their base tones (skip hyphens)
  for (const char of text) {
    if (char !== '-') {
      chars.push(char);
      const meaning = getDefaultMeaning(char);
      originalTones.push(meaning?.tone);
    }
  }

  // Second pass: detect connected groups and apply tone sandhi
  const effectiveTones = [...originalTones];
  let i = 0;
  let textIndex = 0;

  while (textIndex < text.length) {
    // Check if this starts a connected group
    if (text[textIndex] !== '-' && textIndex + 1 < text.length) {
      // Look ahead for connected characters (marked with -)
      const groupIndices: number[] = [i];
      let lookAhead = textIndex + 1;

      while (lookAhead < text.length && text[lookAhead] === '-') {
        lookAhead++; // skip hyphen
        if (lookAhead < text.length && text[lookAhead] !== '-') {
          groupIndices.push(i + groupIndices.length);
          lookAhead++;
        }
      }

      // If we found a group, apply tone sandhi
      if (groupIndices.length > 1) {
        const groupTones = groupIndices.map((idx) => originalTones[idx]);

        // Apply tone sandhi rules to the group
        for (let j = 0; j < groupTones.length - 1; j++) {
          const current = groupTones[j];
          const next = groupTones[j + 1];

          // Rule: 4声+4声 → 2声+4声
          if (current === 4 && next === 4) {
            effectiveTones[groupIndices[j]] = 2;
          }
          // Rule: 3声+3声 → 2声+3声
          if (current === 3 && next === 3) {
            effectiveTones[groupIndices[j]] = 2;
          }
        }

        // Skip past the group
        i += groupIndices.length;
        textIndex = lookAhead;
        continue;
      }
    }

    if (text[textIndex] !== '-') {
      i++;
    }
    textIndex++;
  }

  return { chars, originalTones, effectiveTones };
}

// Tone colors
const toneColors = {
  1: '#dc2626', // red-600: high
  2: '#f97316', // orange-500: rising
  3: '#16a34a', // green-600: low/dipping
  4: '#2563eb', // blue-600: falling
};

// Shared tone contour SVG content
// Returns the SVG element (line or polyline) for a given tone
function ToneContourPath({
  tone,
  color,
  opacity = 0.8,
}: {
  tone: number;
  color: string;
  opacity?: number;
}) {
  switch (tone) {
    case 1:
      // High flat tone: horizontal line at top
      return (
        <line
          x1="5"
          y1="12"
          x2="35"
          y2="12"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          opacity={opacity}
        />
      );
    case 2:
      // Rising tone: line going up from bottom-left to top-right
      return (
        <line
          x1="8"
          y1="38"
          x2="32"
          y2="12"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          opacity={opacity}
        />
      );
    case 3:
      // Dipping tone: V shape (down then up)
      return (
        <polyline
          points="5,35 20,42 35,35"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
        />
      );
    case 4:
      // Falling tone: line going down from top-left to bottom-right
      return (
        <line
          x1="8"
          y1="12"
          x2="32"
          y2="38"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          opacity={opacity}
        />
      );
    default:
      return null;
  }
}

// SVG tone contour backgrounds for inline display
// - shapeTone: determines the contour shape (after sandhi)
// - colorTone: determines the color (original tone, before sandhi)
function ToneContour({
  shapeTone,
  colorTone,
}: {
  shapeTone: number;
  colorTone: number;
}) {
  const color = toneColors[colorTone as keyof typeof toneColors] || '#71717a';

  const contourStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };

  return (
    <svg
      style={contourStyle}
      viewBox="0 0 40 50"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <ToneContourPath tone={shapeTone} color={color} />
    </svg>
  );
}

function TextWithRuby({
  text,
  mode,
  isNarration,
}: {
  text: string;
  mode: DisplayMode;
  isNarration: boolean;
}) {
  const baseClass = isNarration
    ? 'text-zinc-500 dark:text-zinc-400'
    : 'text-black dark:text-white';
  const bgClass = !isNarration
    ? 'bg-amber-50 dark:bg-amber-900/20 px-1 rounded'
    : '';

  // For plain mode, just show text without hyphens
  if (mode === 'plain') {
    const displayText = text.replace(/-/g, '');
    return (
      <span className={`inline ${baseClass} ${bgClass}`}>{displayText}</span>
    );
  }

  // Parse text and apply tone sandhi
  const { chars, originalTones, effectiveTones } =
    parseTextWithToneSandhi(text);

  // Build elements based on mode
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const originalTone = originalTones[i];
    const effectiveTone = effectiveTones[i];
    const meaning = getDefaultMeaning(char);

    if (mode === 'visual') {
      // Visual mode: SVG contour background with normal character style
      if (effectiveTone !== undefined && originalTone !== undefined) {
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
            {/* Background tone contour - shape from effectiveTone, color from originalTone */}
            <ToneContour shapeTone={effectiveTone} colorTone={originalTone} />
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

  // For visual mode, use non-narration color even for narration segments
  const effectiveBaseClass =
    mode === 'visual' && isNarration ? 'text-black dark:text-white' : baseClass;

  const wrapperClass = `inline ${effectiveBaseClass} ${bgClass}`;

  return <span className={wrapperClass}>{elements}</span>;
}

// Legend item with SVG contour (uses shared ToneContourPath)
function LegendItem({ tone, label }: { tone: number; label: string }) {
  const color = toneColors[tone as keyof typeof toneColors];

  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="24" viewBox="0 0 40 50" aria-hidden="true">
        <ToneContourPath tone={tone} color={color} opacity={1} />
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

export function HakubunWithTabs({ segments }: Props) {
  const [mode, setMode] = useState<DisplayMode>('plain');

  const tabs: { id: DisplayMode; label: string }[] = [
    { id: 'plain', label: '白文' },
    { id: 'onyomi', label: '音読み' },
    { id: 'pinyin', label: 'ピンイン' },
    { id: 'visual', label: 'ビジュアル' },
  ];

  return (
    <section>
      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            role="tab"
            id={`hakubun-tab-${tab.id}`}
            aria-selected={mode === tab.id}
            aria-controls="hakubun-panel"
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
      <div
        id="hakubun-panel"
        role="tabpanel"
        aria-labelledby={`hakubun-tab-${mode}`}
        className="rounded-lg rounded-tl-none bg-white p-6 shadow-sm dark:bg-zinc-900"
      >
        <p className="text-2xl leading-loose tracking-wider">
          {segments.map((segment) => (
            <TextWithRuby
              key={`${segment.start_pos}-${segment.end_pos}`}
              text={segment.text}
              mode={mode}
              isNarration={segment.speaker === null}
            />
          ))}
        </p>

        {/* Legend for visual mode */}
        {mode === 'visual' && <ToneLegend />}
      </div>
    </section>
  );
}
