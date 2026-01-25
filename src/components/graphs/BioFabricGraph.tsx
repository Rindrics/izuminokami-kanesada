'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';
import { chartTheme } from '@/lib/chart-theme';
import type { GraphEdge, SpeakerGraph } from '@/lib/graph/types';

interface BioFabricGraphProps {
  graph: SpeakerGraph;
  height?: string;
}

/**
 * BioFabric visualization component
 *
 * Authentic BioFabric style where:
 * - Nodes are represented as horizontal lines (strands)
 * - Edges are vertical lines crossing the node strands they connect
 * - Creates a "fabric" pattern that reveals network structure
 */
export function BioFabricGraph({
  graph,
  height = '500px',
}: BioFabricGraphProps) {
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredEdgeIndex, setHoveredEdgeIndex] = useState<number | null>(null);

  // Sort nodes: persons first (by connection count), then concepts
  const sortedNodes = useMemo(() => {
    // Count connections for each node
    const connectionCount = new Map<string, number>();
    for (const edge of graph.edges) {
      connectionCount.set(
        edge.source,
        (connectionCount.get(edge.source) || 0) + 1,
      );
      connectionCount.set(
        edge.target,
        (connectionCount.get(edge.target) || 0) + 1,
      );
    }

    const persons = graph.nodes
      .filter((n) => n.type === 'person')
      .sort(
        (a, b) =>
          (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0),
      );
    const concepts = graph.nodes
      .filter((n) => n.type === 'concept')
      .sort(
        (a, b) =>
          (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0),
      );
    return [...persons, ...concepts];
  }, [graph.nodes, graph.edges]);

  // Create node index map for quick lookup
  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedNodes.forEach((node, index) => {
      map.set(node.id, index);
    });
    return map;
  }, [sortedNodes]);

  // Sort edges by source node position, then target node position
  const sortedEdges = useMemo(() => {
    return [...graph.edges].sort((a, b) => {
      const aSourceIdx = nodeIndexMap.get(a.source) ?? 0;
      const bSourceIdx = nodeIndexMap.get(b.source) ?? 0;
      if (aSourceIdx !== bSourceIdx) return aSourceIdx - bSourceIdx;

      const aTargetIdx = nodeIndexMap.get(a.target) ?? 0;
      const bTargetIdx = nodeIndexMap.get(b.target) ?? 0;
      return aTargetIdx - bTargetIdx;
    });
  }, [graph.edges, nodeIndexMap]);

  // Dimensions
  const labelWidth = 80;
  const rowHeight = 20;
  const edgeWidth = 8;
  const padding = 20;

  // Calculate SVG dimensions
  const svgWidth = labelWidth + sortedEdges.length * edgeWidth + padding * 2;
  const svgHeight = sortedNodes.length * rowHeight + padding * 2;

  // Calculate max weight for opacity normalization
  const maxWeight = useMemo(() => {
    return Math.max(...graph.edges.map((e) => e.weight), 1);
  }, [graph.edges]);

  // Get color for edge based on topic
  const getEdgeColor = (edge: GraphEdge, isHovered: boolean) => {
    if (isHovered) return chartTheme.conceptColor;

    // Color by topic for visual distinction (using darker, more visible colors)
    const topicColors: Record<string, string> = {
      仁: '#be123c', // rose-700
      義: '#0e7490', // cyan-700
      礼: '#6d28d9', // violet-700
      禮: '#6d28d9',
      智: '#047857', // emerald-700
      信: '#b45309', // amber-700
      孝: '#b91c1c', // red-700
      悌: '#1d4ed8', // blue-700
      忠: '#7e22ce', // purple-700
      學: '#0f766e', // teal-700
      道: '#4338ca', // indigo-700
      君: '#991b1b', // red-800
      民: '#166534', // green-700
      利: '#a16207', // yellow-700 (darker for visibility)
    };

    // Default to a visible gray for edges without topic
    return topicColors[edge.topic] || '#71717a'; // zinc-500
  };

  // Get opacity based on edge weight (frequency)
  const getEdgeOpacity = (edge: GraphEdge, isHovered: boolean) => {
    if (isHovered) return 1;
    // Map weight to opacity: min 0.4, max 1.0
    const normalized = edge.weight / maxWeight;
    return 0.4 + normalized * 0.6;
  };

  return (
    <div className="relative w-full overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <svg
        width={svgWidth}
        height={Math.max(svgHeight, parseInt(height, 10))}
        style={{ minWidth: svgWidth }}
        role="img"
        aria-label="BioFabric グラフ - 人物と概念の関係を織物パターンで可視化"
      >
        <title>BioFabric グラフ</title>

        {/* Background */}
        <rect
          x={0}
          y={0}
          width={svgWidth}
          height={Math.max(svgHeight, parseInt(height, 10))}
          fill="white"
          className="dark:fill-zinc-900"
        />

        {/* Node strands (horizontal lines) */}
        <g transform={`translate(${labelWidth}, ${padding})`}>
          {sortedNodes.map((node, nodeIndex) => {
            const y = nodeIndex * rowHeight + rowHeight / 2;
            const isPersonNode = node.type === 'person';

            // Check if this node is connected to the hovered edge
            const hoveredEdge =
              hoveredEdgeIndex !== null ? sortedEdges[hoveredEdgeIndex] : null;
            const isHighlighted =
              hoveredEdge !== null &&
              (hoveredEdge.source === node.id ||
                hoveredEdge.target === node.id);

            return (
              <g key={`strand-${node.id}`}>
                {/* Node label */}
                <text
                  x={-8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={isHighlighted ? 14 : 12}
                  fontWeight={isHighlighted || isPersonNode ? 'bold' : 'normal'}
                  fill={
                    isHighlighted
                      ? chartTheme.conceptColor
                      : chartTheme.conceptColor
                  }
                >
                  {node.label}
                </text>

                {/* Horizontal strand line */}
                <line
                  x1={0}
                  y1={y}
                  x2={sortedEdges.length * edgeWidth}
                  y2={y}
                  stroke={chartTheme.conceptColor}
                  strokeWidth={isHighlighted ? 3 : 2}
                  strokeOpacity={isHighlighted ? 0.8 : 0.3}
                />
              </g>
            );
          })}
        </g>

        {/* Edge lines (vertical lines crossing strands) */}
        <g transform={`translate(${labelWidth}, ${padding})`}>
          {sortedEdges.map((edge, edgeIndex) => {
            const sourceIndex = nodeIndexMap.get(edge.source);
            const targetIndex = nodeIndexMap.get(edge.target);
            const edgeKey = `${edge.source}-${edge.target}-${edge.topic}`;

            if (sourceIndex === undefined || targetIndex === undefined) {
              return null;
            }

            const x = edgeIndex * edgeWidth + edgeWidth / 2;
            const y1 =
              Math.min(sourceIndex, targetIndex) * rowHeight + rowHeight / 2;
            const y2 =
              Math.max(sourceIndex, targetIndex) * rowHeight + rowHeight / 2;
            const isHovered = hoveredEdgeIndex === edgeIndex;

            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG g cannot be replaced with button
              <g
                key={`edge-${edgeKey}`}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onMouseEnter={() => setHoveredEdgeIndex(edgeIndex)}
                onMouseLeave={() => setHoveredEdgeIndex(null)}
                onClick={() => setSelectedEdge(edge)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedEdge(edge);
                  }
                }}
              >
                {/* Vertical edge line */}
                <line
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  stroke={getEdgeColor(edge, isHovered)}
                  strokeWidth={isHovered ? 5 : Math.min(edge.weight + 2, 4)}
                  strokeOpacity={getEdgeOpacity(edge, isHovered)}
                  strokeLinecap="round"
                />

                {/* Connection dots at source and target */}
                <circle
                  cx={x}
                  cy={y1}
                  r={isHovered ? 5 : 3}
                  fill={getEdgeColor(edge, isHovered)}
                  fillOpacity={getEdgeOpacity(edge, isHovered)}
                />
                <circle
                  cx={x}
                  cy={y2}
                  r={isHovered ? 5 : 3}
                  fill={getEdgeColor(edge, isHovered)}
                  fillOpacity={getEdgeOpacity(edge, isHovered)}
                />

                {/* Invisible wider hit area for easier hovering */}
                <line
                  x1={x}
                  y1={y1}
                  x2={x}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={12}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute right-4 top-4 rounded bg-white/90 p-2 text-xs dark:bg-zinc-800/90">
        <div className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">
          凡例
        </div>
        <div className="flex flex-wrap gap-2">
          {['仁', '義', '利', '道'].map((topic) => (
            <div key={topic} className="flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: getEdgeColor({ topic } as GraphEdge, false),
                }}
              />
              <span className="text-zinc-600 dark:text-zinc-400">{topic}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Popup for selected edge */}
      {selectedEdge && (
        <div className="absolute left-4 top-4 z-10 max-w-sm rounded-lg border border-zinc-300 bg-white p-4 shadow-lg dark:border-zinc-600 dark:bg-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {selectedEdge.topic || 'エッジ詳細'} (
              {selectedEdge.contentIds.length} 件)
            </div>
            <button
              type="button"
              onClick={() => setSelectedEdge(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              ✕ 閉じる
            </button>
          </div>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {selectedEdge.contentIds.map((contentId) => {
              const [bookId, sectionId, chapterId] = contentId.split('/');
              const book = getBookById(bookId);
              const section = getSectionById(bookId, sectionId);
              const content = getContentById(contentId);
              const preview = content?.text.slice(0, 30) ?? '';
              return (
                <Link
                  key={contentId}
                  href={`/books/${bookId}/${sectionId}/${chapterId}`}
                  className="block rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <div className="font-medium">
                    {book?.name ?? bookId} /{' '}
                    {section?.name ?? `第${sectionId}編`} / 第{chapterId}章
                  </div>
                  {preview && (
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {preview}
                      {content && content.text.length > 30 && '…'}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
