'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ClickableChar } from '@/components/ClickableChar';
import { getDefaultMeaning } from '@/data/hanzi-dictionary';
import { getPersonName } from '@/generated/persons';
import type { Segment } from '@/types/content';

type DisplayMode = 'plain' | 'onyomi' | 'pinyin';

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

  // First pass: extract characters and their base tones (skip hyphens only)
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

// Tone contour SVG path for background
// - shapeTone: determines the contour shape (after sandhi)
// - colorTone: determines the color (original tone, before sandhi)
function ToneContourPath({
  tone,
  color,
  opacity = 0.9,
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

// Hanzi character with ruby annotation (onyomi/pinyin)
// Ensures ruby is always centered above the character regardless of ruby length
// For pinyin mode, shows tone contour background behind character
function HanziWithRuby({
  char,
  ruby,
  effectiveTone,
  originalTone,
}: {
  char: string;
  ruby: string | undefined;
  effectiveTone?: number;
  originalTone?: number;
}) {
  const showContour = effectiveTone !== undefined && originalTone !== undefined;
  const contourColor = originalTone
    ? toneColors[originalTone as keyof typeof toneColors]
    : undefined;

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        verticalAlign: 'bottom',
        margin: '0 0.1em',
        position: 'relative',
      }}
    >
      {/* Ruby text on top */}
      <span
        className="text-xs text-zinc-500 dark:text-zinc-400"
        style={{
          lineHeight: 1,
          whiteSpace: 'nowrap',
          minHeight: '1em',
        }}
      >
        {ruby ?? ''}
      </span>
      {/* Character with optional tone contour background */}
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          lineHeight: 1.2,
        }}
      >
        {/* Tone contour background for pinyin mode */}
        {showContour && contourColor && (
          <svg
            style={{
              position: 'absolute',
              left: '-0.2em',
              top: '-0.1em',
              width: '1.4em',
              height: '1.4em',
              pointerEvents: 'none',
              zIndex: 0,
            }}
            viewBox="0 0 40 50"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <ToneContourPath tone={effectiveTone} color={contourColor} />
          </svg>
        )}
        {/* Character text - positioned above contour */}
        <span style={{ position: 'relative', zIndex: 1 }}>
          <ClickableChar char={char} />
        </span>
      </span>
    </span>
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
  const bgClass = '';

  // For plain mode, show text without hyphens, with nowrap per semantic unit
  // Spaces mark optional line break positions to prevent overflow
  // On mobile: free line breaks, On desktop (sm+): controlled breaks
  if (mode === 'plain') {
    const displayText = text.replace(/-/g, '');
    const groups = displayText.split(' ').filter((g) => g.length > 0);
    const elements: React.ReactNode[] = [];
    const seenGroups = new Map<string, number>();

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const count = seenGroups.get(group) ?? 0;
      seenGroups.set(group, count + 1);
      const isLast = i === groups.length - 1;
      // Tailwind responsive classes for margin
      // Mobile: no margin, Desktop: margin between groups
      const marginClass = isLast ? '' : 'sm:mr-3';
      elements.push(
        <span
          key={`plain-${group}-${count}`}
          className={`sm:whitespace-nowrap ${marginClass}`}
        >
          {[...group].map((char, charIdx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: characters in a group are stable and index is part of unique key
            <ClickableChar key={`${group}-${count}-${charIdx}`} char={char} />
          ))}
        </span>,
      );
    }
    return <span className={`inline ${baseClass} ${bgClass}`}>{elements}</span>;
  }

  // Parse text and apply tone sandhi
  const { chars, originalTones, effectiveTones } =
    parseTextWithToneSandhi(text);

  // Group characters by semantic units (split by spaces)
  // Each group will be wrapped in nowrap span to prevent mid-word line breaks
  // Spaces mark optional line break positions to prevent overflow
  const groups: React.ReactNode[][] = [[]];
  let currentGroupIndex = 0;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const originalTone = originalTones[i];
    const effectiveTone = effectiveTones[i];
    const meaning = getDefaultMeaning(char);

    // Space starts a new group
    if (char === ' ') {
      currentGroupIndex++;
      groups[currentGroupIndex] = [];
      continue;
    }

    const currentGroup = groups[currentGroupIndex];

    // Onyomi or Pinyin mode with ruby
    const ruby = meaning
      ? mode === 'onyomi'
        ? meaning.onyomi
        : meaning.pinyin
      : undefined;

    // For pinyin mode, pass tone info for contour background
    const showContour = mode === 'pinyin';

    currentGroup.push(
      <HanziWithRuby
        key={i}
        char={char}
        ruby={ruby}
        effectiveTone={showContour ? effectiveTone : undefined}
        originalTone={showContour ? originalTone : undefined}
      />,
    );
  }

  // Build final elements with nowrap groups
  // Use margin-right instead of separator elements to avoid leading space on new lines
  // On mobile: free line breaks, On desktop (sm+): nowrap with margin control
  const elements: React.ReactNode[] = [];
  const nonEmptyGroups = groups.filter((g) => g.length > 0);
  for (let g = 0; g < nonEmptyGroups.length; g++) {
    const group = nonEmptyGroups[g];
    const isLastGroup = g === nonEmptyGroups.length - 1;
    // Tailwind responsive classes for margin
    // Mobile: no margin, Desktop: margin between groups
    const marginClass = isLastGroup ? '' : 'sm:mr-3';
    elements.push(
      <span
        key={`group-${g}`}
        className={`sm:whitespace-nowrap ${marginClass}`}
      >
        {group}
      </span>,
    );
  }

  const wrapperClass = `inline ${baseClass} ${bgClass}`;

  return <span className={wrapperClass}>{elements}</span>;
}

export function HakubunWithTabs({ segments }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read mode from query parameter, default to 'plain'
  const modeParam = searchParams.get('mode');
  const mode: DisplayMode =
    modeParam === 'onyomi' || modeParam === 'pinyin' ? modeParam : 'plain';

  // Update URL when mode changes
  const handleModeChange = (newMode: DisplayMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newMode === 'plain') {
      params.delete('mode');
    } else {
      params.set('mode', newMode);
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, {
      scroll: false,
    });
  };

  const tabs: { id: DisplayMode; label: string }[] = [
    { id: 'plain', label: '白文' },
    { id: 'onyomi', label: '音読み' },
    { id: 'pinyin', label: 'ピンイン' },
  ];

  return (
    <section>
      {/* Tabs */}
      <div className="mb-3 flex flex-wrap gap-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleModeChange(tab.id)}
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
        <div className="text-2xl leading-loose tracking-wider">
          {(() => {
            // Check if all segments are narration (no speakers)
            const allNarration = segments.every((s) => s.speaker === null);

            // Group consecutive segments by speaker
            const groups: {
              speaker: string | null;
              segments: typeof segments;
            }[] = [];
            for (const segment of segments) {
              const lastGroup = groups[groups.length - 1];
              if (lastGroup && lastGroup.speaker === segment.speaker) {
                lastGroup.segments.push(segment);
              } else {
                groups.push({ speaker: segment.speaker, segments: [segment] });
              }
            }

            return groups.map((group, groupIndex) => {
              // If all segments are narration, don't dim the text
              const isNarration = allNarration ? false : group.speaker === null;
              const prevGroup = groups[groupIndex - 1];
              const prevIsNarration = prevGroup && prevGroup.speaker === null;
              const isFirstGroup = groupIndex === 0;

              // Detect implicit speaker change (speaker changed without narrator)
              const isImplicitSpeakerChange =
                !isFirstGroup &&
                group.speaker !== null &&
                prevGroup &&
                prevGroup.speaker !== null &&
                prevGroup.speaker !== group.speaker;

              // Determine wrapper element and properties
              let Wrapper: 'div' | 'span' = 'span';
              const wrapperProps: { className?: string } = {};

              if (!isFirstGroup) {
                Wrapper = 'div';
                // Speech after narration or implicit speaker change: add indent
                if (
                  !isNarration &&
                  (prevIsNarration || isImplicitSpeakerChange)
                ) {
                  wrapperProps.className = 'block pl-4';
                }
              }

              const firstSegment = group.segments[0];
              const lastSegment = group.segments[group.segments.length - 1];

              return (
                <Wrapper
                  key={`${firstSegment.start_pos}-${lastSegment.end_pos}`}
                  {...wrapperProps}
                >
                  {/* Show implicit speaker name (no indent) */}
                  {isImplicitSpeakerChange && group.speaker && (
                    <span className="block -ml-4 text-zinc-300 dark:text-zinc-600">
                      ― {getPersonName(group.speaker)} ―
                    </span>
                  )}
                  {group.segments.map((segment, segIndex) => (
                    <span key={`${segment.start_pos}-${segment.end_pos}`}>
                      {segIndex > 0 && <br />}
                      <TextWithRuby
                        text={segment.text.original}
                        mode={mode}
                        isNarration={isNarration}
                      />
                    </span>
                  ))}
                </Wrapper>
              );
            });
          })()}
        </div>
      </div>
    </section>
  );
}
