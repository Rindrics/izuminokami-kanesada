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
 * Displays graph data as a matrix-like view where:
 * - Rows represent nodes (persons and concepts)
 * - Columns represent edges connecting nodes
 * - Cells are filled where a node participates in an edge
 */
export function BioFabricGraph({
  graph,
  height = '600px',
}: BioFabricGraphProps) {
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredEdgeIndex, setHoveredEdgeIndex] = useState<number | null>(null);

  // Sort nodes: persons first, then concepts
  const sortedNodes = useMemo(() => {
    const persons = graph.nodes.filter((n) => n.type === 'person');
    const concepts = graph.nodes.filter((n) => n.type === 'concept');
    return [...persons, ...concepts];
  }, [graph.nodes]);

  // Create node index map for quick lookup
  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedNodes.forEach((node, index) => {
      map.set(node.id, index);
    });
    return map;
  }, [sortedNodes]);

  // Cell dimensions
  const cellWidth = 24;
  const cellHeight = 32;
  const labelWidth = 80;
  const headerHeight = 40;

  // Calculate SVG dimensions
  const svgWidth = labelWidth + graph.edges.length * cellWidth + 20;
  const svgHeight = headerHeight + sortedNodes.length * cellHeight + 20;

  return (
    <div className="relative w-full overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ minWidth: svgWidth, minHeight: parseInt(height, 10) }}
        role="img"
        aria-label="BioFabric グラフ - 人物と概念の関係を可視化"
      >
        <title>BioFabric グラフ</title>
        {/* Header row - edge topics */}
        <g transform={`translate(${labelWidth}, 0)`}>
          {graph.edges.map((edge, edgeIndex) => {
            const headerKey = `${edge.source}-${edge.target}-${edge.topic}`;
            return (
              <g
                key={`header-${headerKey}`}
                transform={`translate(${edgeIndex * cellWidth}, 0)`}
              >
                {/* biome-ignore lint/a11y/useSemanticElements: SVG text cannot be replaced with button */}
                <text
                  x={cellWidth / 2}
                  y={headerHeight - 8}
                  textAnchor="middle"
                  fontSize={12}
                  fill={
                    hoveredEdgeIndex === edgeIndex
                      ? chartTheme.conceptColor
                      : chartTheme.colors.neutral[500]
                  }
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
                  {edge.topic || '→'}
                </text>
              </g>
            );
          })}
        </g>

        {/* Node labels (rows) */}
        <g transform={`translate(0, ${headerHeight})`}>
          {sortedNodes.map((node, nodeIndex) => (
            <g
              key={`label-${node.id}`}
              transform={`translate(0, ${nodeIndex * cellHeight})`}
            >
              <text
                x={labelWidth - 8}
                y={cellHeight / 2 + 4}
                textAnchor="end"
                fontSize={14}
                fontWeight={node.type === 'person' ? 'bold' : 'normal'}
                fill={
                  node.type === 'person'
                    ? chartTheme.personColor
                    : chartTheme.conceptColor
                }
              >
                {node.label}
              </text>
            </g>
          ))}
        </g>

        {/* Grid cells */}
        <g transform={`translate(${labelWidth}, ${headerHeight})`}>
          {/* Background grid lines */}
          {sortedNodes.map((node, nodeIndex) => (
            <line
              key={`hline-${node.id}`}
              x1={0}
              y1={nodeIndex * cellHeight + cellHeight / 2}
              x2={graph.edges.length * cellWidth}
              y2={nodeIndex * cellHeight + cellHeight / 2}
              stroke={chartTheme.colors.neutral[200]}
              strokeWidth={1}
            />
          ))}
          {graph.edges.map((edge) => {
            const edgeIndex = graph.edges.indexOf(edge);
            return (
              <line
                key={`vline-${edge.source}-${edge.target}-${edge.topic}`}
                x1={edgeIndex * cellWidth + cellWidth / 2}
                y1={0}
                x2={edgeIndex * cellWidth + cellWidth / 2}
                y2={sortedNodes.length * cellHeight}
                stroke={chartTheme.colors.neutral[200]}
                strokeWidth={1}
              />
            );
          })}

          {/* Edge cells */}
          {graph.edges.map((edge, edgeIndex) => {
            const sourceIndex = nodeIndexMap.get(edge.source);
            const targetIndex = nodeIndexMap.get(edge.target);
            const edgeKey = `${edge.source}-${edge.target}-${edge.topic}`;

            if (sourceIndex === undefined || targetIndex === undefined) {
              return null;
            }

            const isHovered = hoveredEdgeIndex === edgeIndex;
            const minIndex = Math.min(sourceIndex, targetIndex);
            const maxIndex = Math.max(sourceIndex, targetIndex);

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
                {/* Vertical line connecting source and target */}
                <line
                  x1={edgeIndex * cellWidth + cellWidth / 2}
                  y1={minIndex * cellHeight + cellHeight / 2}
                  x2={edgeIndex * cellWidth + cellWidth / 2}
                  y2={maxIndex * cellHeight + cellHeight / 2}
                  stroke={
                    isHovered
                      ? chartTheme.conceptColor
                      : chartTheme.colors.neutral[400]
                  }
                  strokeWidth={isHovered ? 3 : Math.min(edge.weight + 1, 4)}
                />

                {/* Source node marker */}
                <circle
                  cx={edgeIndex * cellWidth + cellWidth / 2}
                  cy={sourceIndex * cellHeight + cellHeight / 2}
                  r={isHovered ? 6 : 4}
                  fill={chartTheme.personColor}
                />

                {/* Target node marker */}
                <circle
                  cx={edgeIndex * cellWidth + cellWidth / 2}
                  cy={targetIndex * cellHeight + cellHeight / 2}
                  r={isHovered ? 6 : 4}
                  fill={
                    graph.nodes.find((n) => n.id === edge.target)?.type ===
                    'concept'
                      ? chartTheme.conceptColor
                      : chartTheme.personColor
                  }
                />
              </g>
            );
          })}
        </g>
      </svg>

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
