'use client';

import { chord, ribbon } from 'd3-chord';
import { arc } from 'd3-shape';
import { useMemo, useState } from 'react';
import { chartTheme } from '@/lib/chart-theme';
import type { SpeakerGraph } from '@/lib/graph/types';

interface ChordDiagramProps {
  graph: SpeakerGraph;
  width?: number;
  height?: number;
}

interface HoverInfo {
  type: 'group' | 'chord';
  index?: number;
  sourceIndex?: number;
  targetIndex?: number;
}

/**
 * Chord Diagram - displays relationships between persons as chords
 */
export function ChordDiagram({
  graph,
  width = 600,
  height = 600,
}: ChordDiagramProps) {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // Filter to only person nodes
  const persons = useMemo(() => {
    return graph.nodes.filter((n) => n.type === 'person');
  }, [graph.nodes]);

  // Create adjacency matrix from edges
  const { matrix, indexToId } = useMemo(() => {
    const n = persons.length;
    const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const idx2id = persons.map((p) => p.id);
    const id2idx = new Map(persons.map((p, i) => [p.id, i]));

    for (const edge of graph.edges) {
      const srcIdx = id2idx.get(edge.source);
      const tgtIdx = id2idx.get(edge.target);
      if (srcIdx !== undefined && tgtIdx !== undefined) {
        mat[srcIdx][tgtIdx] += edge.weight;
        mat[tgtIdx][srcIdx] += edge.weight;
      }
    }

    return { matrix: mat, indexToId: idx2id, idToIndex: id2idx };
  }, [persons, graph.edges]);

  // Generate chord layout
  const chordLayout = useMemo(() => {
    return chord()
      .padAngle(0.05)
      .sortSubgroups((a, b) => b - a)(matrix);
  }, [matrix]);

  // Layout parameters
  const outerRadius = Math.min(width, height) / 2 - 40;
  const innerRadius = outerRadius - 20;

  // Arc generator for groups
  const arcGenerator = arc<{ startAngle: number; endAngle: number }>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  // Ribbon generator for chords
  const ribbonGenerator = ribbon<
    {
      source: { startAngle: number; endAngle: number };
      target: { startAngle: number; endAngle: number };
    },
    { startAngle: number; endAngle: number }
  >().radius(innerRadius);

  // Get person label by index
  const getLabel = (index: number): string => {
    const id = indexToId[index];
    const person = persons.find((p) => p.id === id);
    return person?.label || id;
  };

  // Check if group is highlighted
  const isGroupHighlighted = (index: number): boolean => {
    if (!hoverInfo) return false;
    if (hoverInfo.type === 'group') return hoverInfo.index === index;
    if (hoverInfo.type === 'chord') {
      return hoverInfo.sourceIndex === index || hoverInfo.targetIndex === index;
    }
    return false;
  };

  // Check if chord is highlighted
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

  // Get chord opacity
  const getChordOpacity = (
    sourceIndex: number,
    targetIndex: number,
  ): number => {
    if (hoverInfo) {
      return isChordHighlighted(sourceIndex, targetIndex) ? 0.8 : 0.1;
    }
    return 0.5;
  };

  // Get label position
  const getLabelPosition = (
    startAngle: number,
    endAngle: number,
  ): { x: number; y: number; rotation: number } => {
    const angle = (startAngle + endAngle) / 2;
    const labelRadius = outerRadius + 15;
    const x = Math.sin(angle) * labelRadius;
    const y = -Math.cos(angle) * labelRadius;
    // Rotate text to be readable
    let rotation = (angle * 180) / Math.PI;
    if (rotation > 90 && rotation < 270) {
      rotation += 180;
    }
    return { x, y, rotation };
  };

  // Get hover info text
  const getHoverText = (): string => {
    if (!hoverInfo) return '';
    if (hoverInfo.type === 'group' && hoverInfo.index !== undefined) {
      const label = getLabel(hoverInfo.index);
      const total = matrix[hoverInfo.index].reduce((sum, v) => sum + v, 0);
      return `${label}: ${total}回の対話`;
    }
    if (
      hoverInfo.type === 'chord' &&
      hoverInfo.sourceIndex !== undefined &&
      hoverInfo.targetIndex !== undefined
    ) {
      const srcLabel = getLabel(hoverInfo.sourceIndex);
      const tgtLabel = getLabel(hoverInfo.targetIndex);
      const count = matrix[hoverInfo.sourceIndex][hoverInfo.targetIndex];
      return `${srcLabel} ↔ ${tgtLabel}: ${count}回`;
    }
    return '';
  };

  if (persons.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        対話データがありません
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <svg
        width={width}
        height={height}
        className="mx-auto"
        role="img"
        aria-label="コード・ダイアグラム - 人物間の対話関係"
      >
        <title>コード・ダイアグラム</title>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {/* Chords (ribbons) */}
          {chordLayout.map((c) => {
            const pathData = ribbonGenerator(c);
            if (!pathData) return null;

            const isHighlighted = isChordHighlighted(
              c.source.index,
              c.target.index,
            );

            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: SVG path hover interaction
              <path
                key={`chord-${c.source.index}-${c.target.index}`}
                d={pathData}
                fill={
                  isHighlighted
                    ? chartTheme.colors.primary[500]
                    : chartTheme.colors.neutral[500]
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

          {/* Groups (arcs) */}
          {chordLayout.groups.map((group) => {
            const pathData = arcGenerator(group);
            if (!pathData) return null;

            const isHighlighted = isGroupHighlighted(group.index);
            const labelPos = getLabelPosition(group.startAngle, group.endAngle);

            return (
              <g key={`group-${group.index}`}>
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path hover interaction */}
                <path
                  d={pathData}
                  fill={
                    isHighlighted
                      ? chartTheme.colors.primary[600]
                      : chartTheme.colors.neutral[500]
                  }
                  className="cursor-pointer transition-all"
                  onMouseEnter={() =>
                    setHoverInfo({ type: 'group', index: group.index })
                  }
                  onMouseLeave={() => setHoverInfo(null)}
                />
                {/* Label */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill={
                    isHighlighted
                      ? chartTheme.colors.primary[600]
                      : chartTheme.colors.neutral[500]
                  }
                  fontWeight={isHighlighted ? 'bold' : 'normal'}
                  className="pointer-events-none"
                >
                  {getLabel(group.index)}
                </text>
              </g>
            );
          })}

          {/* Center text for hover info */}
          {hoverInfo && (
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={14}
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
            className="h-3 w-6 rounded"
            style={{ backgroundColor: chartTheme.colors.neutral[500] }}
          />
          <span>人物</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div
              className="h-1 w-4 rounded"
              style={{
                backgroundColor: chartTheme.colors.neutral[500],
                opacity: 0.3,
              }}
            />
            <span>→</span>
            <div
              className="h-3 w-4 rounded"
              style={{
                backgroundColor: chartTheme.colors.neutral[500],
                opacity: 0.8,
              }}
            />
          </div>
          <span>対話頻度（太いほど多い）</span>
        </div>
      </div>
    </div>
  );
}
