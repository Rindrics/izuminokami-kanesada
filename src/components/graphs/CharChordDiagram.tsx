'use client';

import { chord, ribbon } from 'd3-chord';
import { arc } from 'd3-shape';
import { useMemo, useState } from 'react';
import { KEY_CONCEPTS_SET } from '@/data/key-concepts';
import { contents } from '@/generated/contents';
import { stats } from '@/generated/stats';
import { chartTheme } from '@/lib/chart-theme';

interface CharChordDiagramProps {
  width?: number;
  height?: number;
  maxChars?: number;
}

interface HoverInfo {
  type: 'group' | 'chord';
  index?: number;
  sourceIndex?: number;
  targetIndex?: number;
}

/**
 * Extract adjacent character pairs (bigrams) from segments
 */
function extractBigrams(blacklist: Set<string>): Map<string, number> {
  const bigrams = new Map<string, number>();

  for (const content of contents) {
    for (const segment of content.segments) {
      const text = segment.text.original;
      const cleanText = text.replace(/[，。？、；\s\-;！：「」『』]/g, '');

      for (let i = 0; i < cleanText.length - 1; i++) {
        const char1 = cleanText[i];
        const char2 = cleanText[i + 1];

        if (
          /[\u4e00-\u9fff]/.test(char1) &&
          /[\u4e00-\u9fff]/.test(char2) &&
          !blacklist.has(char1) &&
          !blacklist.has(char2)
        ) {
          const key = `${char1}-${char2}`;
          bigrams.set(key, (bigrams.get(key) || 0) + 1);
        }
      }
    }
  }

  return bigrams;
}

/**
 * Chord Diagram for character adjacency
 */
export function CharChordDiagram({
  width = 600,
  height = 600,
  maxChars = 30,
}: CharChordDiagramProps) {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const blacklist = useMemo(() => new Set(stats.frequencyBlacklist), []);

  // Extract bigrams
  const bigrams = useMemo(() => extractBigrams(blacklist), [blacklist]);

  // Get top characters by total adjacency count
  const topChars = useMemo(() => {
    const charCounts = new Map<string, number>();
    for (const [key, count] of bigrams) {
      const [char1, char2] = key.split('-');
      charCounts.set(char1, (charCounts.get(char1) || 0) + count);
      charCounts.set(char2, (charCounts.get(char2) || 0) + count);
    }
    return Array.from(charCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxChars)
      .map(([char]) => char);
  }, [bigrams, maxChars]);

  // Create adjacency matrix
  const { matrix, indexToChar } = useMemo(() => {
    const n = topChars.length;
    const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const charToIdx = new Map(topChars.map((c, i) => [c, i]));

    for (const [key, count] of bigrams) {
      const [char1, char2] = key.split('-');
      const idx1 = charToIdx.get(char1);
      const idx2 = charToIdx.get(char2);
      if (idx1 !== undefined && idx2 !== undefined) {
        mat[idx1][idx2] += count;
        mat[idx2][idx1] += count;
      }
    }

    return { matrix: mat, indexToChar: topChars };
  }, [topChars, bigrams]);

  // Generate chord layout
  const chordLayout = useMemo(() => {
    return chord()
      .padAngle(0.04)
      .sortSubgroups((a, b) => b - a)(matrix);
  }, [matrix]);

  // Layout parameters
  const outerRadius = Math.min(width, height) / 2 - 50;
  const innerRadius = outerRadius - 15;

  // Arc generator
  const arcGenerator = arc<{ startAngle: number; endAngle: number }>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  // Ribbon generator
  const ribbonGenerator = ribbon<
    {
      source: { startAngle: number; endAngle: number };
      target: { startAngle: number; endAngle: number };
    },
    { startAngle: number; endAngle: number }
  >().radius(innerRadius);

  // Get label position
  const getLabelPosition = (
    startAngle: number,
    endAngle: number,
  ): { x: number; y: number } => {
    const angle = (startAngle + endAngle) / 2;
    const labelRadius = outerRadius + 12;
    return {
      x: Math.sin(angle) * labelRadius,
      y: -Math.cos(angle) * labelRadius,
    };
  };

  // Check highlights
  const isGroupHighlighted = (index: number): boolean => {
    if (!hoverInfo) return false;
    if (hoverInfo.type === 'group') return hoverInfo.index === index;
    if (hoverInfo.type === 'chord') {
      return hoverInfo.sourceIndex === index || hoverInfo.targetIndex === index;
    }
    return false;
  };

  const isChordHighlighted = (
    sourceIndex: number,
    targetIndex: number,
  ): boolean => {
    if (!hoverInfo) return false;
    if (hoverInfo.type === 'chord') {
      return (
        (hoverInfo.sourceIndex === sourceIndex &&
          hoverInfo.targetIndex === targetIndex) ||
        (hoverInfo.sourceIndex === targetIndex &&
          hoverInfo.targetIndex === sourceIndex)
      );
    }
    if (hoverInfo.type === 'group') {
      return hoverInfo.index === sourceIndex || hoverInfo.index === targetIndex;
    }
    return false;
  };

  const getChordOpacity = (
    sourceIndex: number,
    targetIndex: number,
  ): number => {
    if (hoverInfo) {
      return isChordHighlighted(sourceIndex, targetIndex) ? 0.8 : 0.05;
    }
    return 0.4;
  };

  // Get color for character
  const getCharColor = (char: string, isHighlighted: boolean): string => {
    if (isHighlighted) return chartTheme.colors.primary[600];
    if (KEY_CONCEPTS_SET.has(char)) return chartTheme.colors.primary[500];
    return chartTheme.colors.neutral[500];
  };

  // Get hover text
  const getHoverText = (): string => {
    if (!hoverInfo) return '';
    if (hoverInfo.type === 'group' && hoverInfo.index !== undefined) {
      const char = indexToChar[hoverInfo.index];
      const total = matrix[hoverInfo.index].reduce((sum, v) => sum + v, 0);
      return `${char}: ${total}回`;
    }
    if (
      hoverInfo.type === 'chord' &&
      hoverInfo.sourceIndex !== undefined &&
      hoverInfo.targetIndex !== undefined
    ) {
      const char1 = indexToChar[hoverInfo.sourceIndex];
      const char2 = indexToChar[hoverInfo.targetIndex];
      const count = matrix[hoverInfo.sourceIndex][hoverInfo.targetIndex];
      return `${char1}${char2}: ${count}回`;
    }
    return '';
  };

  if (topChars.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        データがありません
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-full"
        role="img"
        aria-label="漢字隣接関係コード・ダイアグラム"
      >
        <title>漢字隣接関係</title>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {/* Chords */}
          {chordLayout.map((c) => {
            const pathData = ribbonGenerator(c) as unknown as string | null;
            if (!pathData) return null;

            const isHighlighted = isChordHighlighted(
              c.source.index,
              c.target.index,
            );

            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: SVG path hover
              <path
                key={`chord-${c.source.index}-${c.target.index}`}
                d={pathData}
                fill={
                  isHighlighted ? chartTheme.colors.primary[500] : '#9ca3af'
                }
                fillOpacity={getChordOpacity(c.source.index, c.target.index)}
                className="cursor-pointer transition-all"
                onMouseEnter={() =>
                  setHoverInfo({
                    type: 'chord',
                    sourceIndex: c.source.index,
                    targetIndex: c.target.index,
                  })
                }
                onMouseLeave={() => setHoverInfo(null)}
              />
            );
          })}

          {/* Groups (arcs) with labels */}
          {chordLayout.groups.map((group) => {
            const pathData = arcGenerator(group);
            if (!pathData) return null;

            const char = indexToChar[group.index];
            const isHighlighted = isGroupHighlighted(group.index);
            const labelPos = getLabelPosition(group.startAngle, group.endAngle);

            return (
              <g key={`group-${group.index}`}>
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path hover */}
                <path
                  d={pathData}
                  fill={getCharColor(char, isHighlighted)}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() =>
                    setHoverInfo({ type: 'group', index: group.index })
                  }
                  onMouseLeave={() => setHoverInfo(null)}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill={getCharColor(char, isHighlighted)}
                  fontWeight={
                    KEY_CONCEPTS_SET.has(char) || isHighlighted
                      ? 'bold'
                      : 'normal'
                  }
                  className="pointer-events-none"
                >
                  {char}
                </text>
              </g>
            );
          })}

          {/* Center text */}
          {hoverInfo && (
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={16}
              fill={chartTheme.colors.neutral[500]}
            >
              {getHoverText()}
            </text>
          )}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: chartTheme.colors.primary[500] }}
          />
          <span>重要概念</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: chartTheme.colors.neutral[500] }}
          />
          <span>その他の漢字</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div
              className="h-1 w-4 rounded"
              style={{ backgroundColor: '#9ca3af', opacity: 0.2 }}
            />
            <span>→</span>
            <div
              className="h-3 w-4 rounded"
              style={{ backgroundColor: '#9ca3af', opacity: 0.8 }}
            />
          </div>
          <span>隣接頻度（太いほど多い）</span>
        </div>
      </div>
    </div>
  );
}
