'use client';

import { useMemo, useState } from 'react';
import { contents } from '@/generated/contents';
import { stats } from '@/generated/stats';
import { chartTheme } from '@/lib/chart-theme';

interface CircularLayoutProps {
  width?: number;
  height?: number;
  maxChars?: number;
  maxEdges?: number;
}

interface BigramData {
  char1: string;
  char2: string;
  count: number;
}

// Key concepts for special coloring
const KEY_CONCEPTS = new Set([
  '仁',
  '義',
  '礼',
  '禮',
  '智',
  '信',
  '孝',
  '悌',
  '忠',
  '學',
  '道',
  '君',
  '民',
  '利',
]);

/**
 * Extract adjacent character pairs (bigrams) from segments
 */
function extractBigrams(blacklist: Set<string>): Map<string, number> {
  const bigrams = new Map<string, number>();

  for (const content of contents) {
    for (const segment of content.segments) {
      const text = segment.text.original;
      // Remove punctuation and spaces
      const cleanText = text.replace(/[，。？、；\s\-;！：「」『』]/g, '');

      // Extract adjacent pairs
      for (let i = 0; i < cleanText.length - 1; i++) {
        const char1 = cleanText[i];
        const char2 = cleanText[i + 1];

        // Only count CJK characters not in blacklist
        if (
          /[\u4e00-\u9fff]/.test(char1) &&
          /[\u4e00-\u9fff]/.test(char2) &&
          !blacklist.has(char1) &&
          !blacklist.has(char2)
        ) {
          // Use sorted key to treat (A,B) and (B,A) as same pair
          const key = char1 < char2 ? `${char1}-${char2}` : `${char2}-${char1}`;
          bigrams.set(key, (bigrams.get(key) || 0) + 1);
        }
      }
    }
  }

  return bigrams;
}

/**
 * Circular Layout - displays characters arranged in a circle
 * with edges showing adjacent pair frequency
 */
export function CircularLayout({
  width = 600,
  height = 600,
  maxChars = 60,
  maxEdges = 150,
}: CircularLayoutProps) {
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<BigramData | null>(null);

  const blacklist = useMemo(() => new Set(stats.frequencyBlacklist), []);

  // Extract bigrams from segments
  const bigrams = useMemo(() => extractBigrams(blacklist), [blacklist]);

  // Get top characters that appear in bigrams
  const charSet = useMemo(() => {
    const chars = new Map<string, number>();
    for (const [key, count] of bigrams) {
      const [char1, char2] = key.split('-');
      chars.set(char1, (chars.get(char1) || 0) + count);
      chars.set(char2, (chars.get(char2) || 0) + count);
    }
    return chars;
  }, [bigrams]);

  // Top N characters by total bigram frequency
  const topChars = useMemo(() => {
    return Array.from(charSet.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxChars)
      .map(([char]) => char);
  }, [charSet, maxChars]);

  const topCharSet = useMemo(() => new Set(topChars), [topChars]);

  // Filter bigrams to only include top characters
  const filteredBigrams = useMemo(() => {
    const result: BigramData[] = [];
    for (const [key, count] of bigrams) {
      const [char1, char2] = key.split('-');
      if (topCharSet.has(char1) && topCharSet.has(char2)) {
        result.push({ char1, char2, count });
      }
    }
    return result.sort((a, b) => b.count - a.count).slice(0, maxEdges);
  }, [bigrams, topCharSet, maxEdges]);

  // Calculate positions on circle
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 60;

  // Calculate position for each character
  const charPositions = useMemo(() => {
    const positions = new Map<
      string,
      { x: number; y: number; totalCount: number }
    >();
    topChars.forEach((char, i) => {
      const angle = (i / topChars.length) * 2 * Math.PI - Math.PI / 2;
      positions.set(char, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        totalCount: charSet.get(char) || 0,
      });
    });
    return positions;
  }, [topChars, centerX, centerY, radius, charSet]);

  // Get max bigram count for normalization
  const maxBigramCount = useMemo(() => {
    return Math.max(...filteredBigrams.map((b) => b.count), 1);
  }, [filteredBigrams]);

  // Get max char count for normalization
  const maxCharCount = useMemo(() => {
    return Math.max(...Array.from(charSet.values()), 1);
  }, [charSet]);

  // Calculate opacity based on frequency (higher count = more opaque)
  const getEdgeOpacity = (count: number, isHovered: boolean): number => {
    if (isHovered) return 1.0;
    const minOpacity = 0.1;
    const maxOpacity = 0.8;
    return minOpacity + (count / maxBigramCount) * (maxOpacity - minOpacity);
  };

  // Get font size based on frequency
  const getFontSize = (count: number): number => {
    const minSize = 10;
    const maxSize = 18;
    return minSize + (count / maxCharCount) * (maxSize - minSize);
  };

  // Get color for character
  const getColor = (char: string, isHovered: boolean): string => {
    if (isHovered) return chartTheme.colors.primary[600];
    if (KEY_CONCEPTS.has(char)) return chartTheme.colors.primary[500];
    return chartTheme.colors.neutral[500];
  };

  // Check if character is connected to hovered char
  const isCharHighlighted = (char: string): boolean => {
    if (hoveredChar === char) return true;
    if (hoveredEdge) {
      return char === hoveredEdge.char1 || char === hoveredEdge.char2;
    }
    if (hoveredChar) {
      return filteredBigrams.some(
        (b) =>
          (b.char1 === hoveredChar && b.char2 === char) ||
          (b.char2 === hoveredChar && b.char1 === char),
      );
    }
    return false;
  };

  // Check if edge is highlighted
  const isEdgeHighlighted = (bigram: BigramData): boolean => {
    if (hoveredEdge === bigram) return true;
    if (hoveredChar) {
      return bigram.char1 === hoveredChar || bigram.char2 === hoveredChar;
    }
    return false;
  };

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <svg
        width={width}
        height={height}
        className="mx-auto"
        role="img"
        aria-label="サーキュラーレイアウト - 隣接漢字ペアの出現頻度"
      >
        {/* Reference circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={chartTheme.colors.neutral[200]}
          strokeWidth={1}
          strokeDasharray="4 4"
          className="dark:stroke-zinc-700"
        />

        {/* Edges between adjacent pairs */}
        {filteredBigrams.map((bigram) => {
          const pos1 = charPositions.get(bigram.char1);
          const pos2 = charPositions.get(bigram.char2);
          if (!pos1 || !pos2) return null;

          const isHighlighted = isEdgeHighlighted(bigram);

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: SVG line hover interaction
            <line
              key={`${bigram.char1}-${bigram.char2}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke={
                isHighlighted
                  ? chartTheme.colors.primary[600]
                  : chartTheme.colors.neutral[500]
              }
              strokeWidth={isHighlighted ? 2 : 1}
              strokeOpacity={getEdgeOpacity(bigram.count, isHighlighted)}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredEdge(bigram)}
              onMouseLeave={() => setHoveredEdge(null)}
            />
          );
        })}

        {/* Characters with background */}
        {topChars.map((char) => {
          const pos = charPositions.get(char);
          if (!pos) return null;

          const isHighlighted = isCharHighlighted(char);
          const fontSize = getFontSize(pos.totalCount);

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: SVG group hover interaction
            <g
              key={char}
              onMouseEnter={() => setHoveredChar(char)}
              onMouseLeave={() => setHoveredChar(null)}
              className="cursor-pointer"
            >
              {/* Background circle to hide edges - only shown when highlighted */}
              {isHighlighted && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={fontSize * 0.7}
                  className="fill-white dark:fill-zinc-900"
                />
              )}
              {/* Character text */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontWeight={
                  KEY_CONCEPTS.has(char) || isHighlighted ? 'bold' : 'normal'
                }
                fill={getColor(char, isHighlighted)}
                className="pointer-events-none transition-all"
              >
                {char}
              </text>
            </g>
          );
        })}

        {/* Center label */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fill="#a1a1aa"
        >
          {hoveredEdge
            ? `${hoveredEdge.char1}${hoveredEdge.char2}: ${hoveredEdge.count}回`
            : hoveredChar
              ? `${hoveredChar}: ${charSet.get(hoveredChar) || 0}回`
              : ''}
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: chartTheme.colors.primary[500] }}
          />
          <span>重要概念</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-4"
            style={{ backgroundColor: '#9ca3af', opacity: 0.1 }}
          />
          <span>低頻度ペア</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-4"
            style={{ backgroundColor: '#9ca3af', opacity: 0.6 }}
          />
          <span>高頻度ペア</span>
        </div>
      </div>
    </div>
  );
}
