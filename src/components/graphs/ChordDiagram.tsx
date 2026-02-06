'use client';

import { chord, ribbon } from 'd3-chord';
import { arc } from 'd3-shape';
import { useMemo, useState } from 'react';
import { KEY_CONCEPTS } from '@/data/key-concepts';
import { chartTheme } from '@/lib/chart-theme';
import type { GraphEdge, SpeakerGraph } from '@/lib/graph/types';

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
  topic?: string;
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

  // Create adjacency matrix from edges (aggregate all edges for layout)
  // Filter to only person-to-person edges
  const { matrix, indexToId, edgesByPair } = useMemo(() => {
    const n = persons.length;
    const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const idx2id = persons.map((p) => p.id);
    const id2idx = new Map(persons.map((p, i) => [p.id, i]));
    const edgesMap = new Map<string, GraphEdge[]>();

    // Filter to only person-to-person edges
    const personToPersonEdges = graph.edges.filter((edge) => {
      const srcNode = graph.nodes.find((n) => n.id === edge.source);
      const tgtNode = graph.nodes.find((n) => n.id === edge.target);
      return srcNode?.type === 'person' && tgtNode?.type === 'person';
    });

    for (const edge of personToPersonEdges) {
      const srcIdx = id2idx.get(edge.source);
      const tgtIdx = id2idx.get(edge.target);
      if (srcIdx !== undefined && tgtIdx !== undefined) {
        mat[srcIdx][tgtIdx] += edge.weight;
        mat[tgtIdx][srcIdx] += edge.weight;

        // Group edges by person pair and topic
        const pairKey = `${Math.min(srcIdx, tgtIdx)}-${Math.max(srcIdx, tgtIdx)}`;
        if (!edgesMap.has(pairKey)) {
          edgesMap.set(pairKey, []);
        }
        edgesMap.get(pairKey)?.push(edge);
      }
    }

    return {
      matrix: mat,
      indexToId: idx2id,
      idToIndex: id2idx,
      edgesByPair: edgesMap,
    };
  }, [persons, graph.edges, graph.nodes]);

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

  // Get concepts actually used in the graph (from edges)
  const usedConcepts = useMemo(() => {
    const conceptSet = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.topic && KEY_CONCEPTS.includes(edge.topic)) {
        conceptSet.add(edge.topic);
      }
    }
    // Sort by KEY_CONCEPTS order for consistent display
    return KEY_CONCEPTS.filter((c) => conceptSet.has(c));
  }, [graph.edges]);

  // Get color for edge based on topic (same as BioFabricGraph)
  const getEdgeColor = (topic: string | undefined, isHovered: boolean) => {
    if (isHovered) return chartTheme.conceptColor;
    return chartTheme.getConceptTopicColor(topic);
  };

  // Check if chord is highlighted (for a specific topic)
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
      hoverInfo.targetIndex !== undefined &&
      hoverInfo.topic
    ) {
      const srcLabel = getLabel(hoverInfo.sourceIndex);
      const tgtLabel = getLabel(hoverInfo.targetIndex);
      const pairKey = `${Math.min(hoverInfo.sourceIndex, hoverInfo.targetIndex)}-${Math.max(hoverInfo.sourceIndex, hoverInfo.targetIndex)}`;
      const edges = edgesByPair.get(pairKey) || [];
      const topicEdges = edges.filter((e) => e.topic === hoverInfo.topic);
      const count = topicEdges.reduce((sum, e) => sum + e.weight, 0);
      return `${srcLabel} ↔ ${tgtLabel} (${hoverInfo.topic}): ${count}回`;
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
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-full"
        role="img"
        aria-label="コード・ダイアグラム - 人物間の対話関係"
      >
        <title>コード・ダイアグラム</title>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {/* Chords (ribbons) - one per edge/topic */}
          {Array.from(edgesByPair.entries())
            .flatMap(([pairKey, edges]) => {
              const [srcIdxStr, tgtIdxStr] = pairKey.split('-');
              const srcIdx = Number.parseInt(srcIdxStr, 10);
              const tgtIdx = Number.parseInt(tgtIdxStr, 10);
              const sourceGroup = chordLayout.groups[srcIdx];
              const targetGroup = chordLayout.groups[tgtIdx];

              if (!sourceGroup || !targetGroup) return null;

              // Sort edges by topic for consistent ordering
              const sortedEdges = [...edges].sort((a, b) =>
                (a.topic || '').localeCompare(b.topic || ''),
              );

              // Calculate cumulative weights for positioning
              const totalWeight = sortedEdges.reduce(
                (sum, e) => sum + e.weight,
                0,
              );
              let cumulativeWeight = 0;

              return sortedEdges.map((edge, edgeIndex) => {
                const _weightRatio = edge.weight / totalWeight;
                const startRatio = cumulativeWeight / totalWeight;
                const endRatio = (cumulativeWeight + edge.weight) / totalWeight;
                cumulativeWeight += edge.weight;

                const sourceAngleRange =
                  sourceGroup.endAngle - sourceGroup.startAngle;
                const targetAngleRange =
                  targetGroup.endAngle - targetGroup.startAngle;

                // Create a chord for this specific edge
                const chordData = {
                  source: {
                    startAngle:
                      sourceGroup.startAngle + sourceAngleRange * startRatio,
                    endAngle:
                      sourceGroup.startAngle + sourceAngleRange * endRatio,
                  },
                  target: {
                    startAngle:
                      targetGroup.startAngle + targetAngleRange * startRatio,
                    endAngle:
                      targetGroup.startAngle + targetAngleRange * endRatio,
                  },
                };

                const pathData = ribbonGenerator(chordData) as unknown as
                  | string
                  | null;
                if (!pathData) return null;

                const isHighlighted = isChordHighlighted(srcIdx, tgtIdx);
                const edgeColor = getEdgeColor(edge.topic, isHighlighted);

                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: SVG path hover interaction
                  <path
                    key={`chord-${edge.source}-${edge.target}-${edge.topic}-${edgeIndex}`}
                    d={pathData}
                    fill={edgeColor}
                    fillOpacity={getChordOpacity(srcIdx, tgtIdx)}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() =>
                      setHoverInfo({
                        type: 'chord',
                        sourceIndex: srcIdx,
                        targetIndex: tgtIdx,
                        topic: edge.topic,
                      })
                    }
                    onMouseLeave={() => setHoverInfo(null)}
                  />
                );
              });
            })
            .filter((item) => item !== null)}

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
      <div className="mt-4 space-y-3">
        {/* Person and dialogue frequency legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
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

        {/* Concept legend */}
        {usedConcepts.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              概念:
            </span>
            {usedConcepts.map((topic) => (
              <div key={topic} className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: getEdgeColor(topic, false),
                  }}
                />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {topic}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
