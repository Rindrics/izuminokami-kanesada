'use client';

import { type HierarchyNode, hierarchy } from 'd3-hierarchy';
import { voronoiTreemap } from 'd3-voronoi-treemap';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import seedrandom from 'seedrandom';
import { getBookById } from '@/generated/books';
import type { ChapterLength } from '@/generated/stats';
import { chartTheme } from '@/lib/chart-theme';

interface VoronoiTreemapProps {
  chapterLengths: ChapterLength[];
  width?: number;
  height?: number;
}

interface TreeNode {
  name: string;
  bookId?: string;
  sectionId?: string;
  chapterId?: string;
  depth?: number;
  value?: number;
  children?: TreeNode[];
}

interface HoverInfo {
  nodeKey: string;
  label: string;
}

// Get color for a node based on its depth and book
function getNodeColor(
  bookId: string,
  depth: number,
  isHovered: boolean,
): string {
  const colors = chartTheme.getBookColorPalette(bookId);

  if (depth === 1) {
    return isHovered ? colors.light : colors.base;
  }
  if (depth === 2) {
    return isHovered ? colors.lighter : colors.light;
  }
  // depth === 3 (chapters)
  return isHovered ? colors.lighter : colors.light;
}

// Get text color based on background brightness (white for dark bg, black for light bg)
function getTextColor(_bookId: string, depth: number): string {
  // Book level (depth 1) is always dark, so use white
  if (depth === 1) return '#FFFFFF';
  // Section level (depth 2) is medium, use white
  if (depth === 2) return '#FFFFFF';
  // Chapter level (depth 3) is lighter, use dark text
  return '#1f2937';
}

/**
 * Voronoi Treemap - displays hierarchical book structure (book > section > chapter)
 */
export function VoronoiTreemap({
  chapterLengths,
  width = 600,
  height = 500,
}: VoronoiTreemapProps) {
  const router = useRouter();
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Delay rendering to avoid hydration mismatch (voronoi-treemap uses randomness)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Build hierarchical tree data: root > books > sections > chapters
  const treeData = useMemo(() => {
    // Group by book > section > chapter
    const bookMap = new Map<
      string,
      Map<string, { chapterId: string; charCount: number }[]>
    >();

    for (const chapter of chapterLengths) {
      const [bookId, sectionId, chapterId] = chapter.contentId.split('/');

      let sectionMap = bookMap.get(bookId);
      if (!sectionMap) {
        sectionMap = new Map();
        bookMap.set(bookId, sectionMap);
      }

      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      sectionMap.get(sectionId)?.push({
        chapterId,
        charCount: chapter.charCount,
      });
    }

    // Build tree structure
    const children: TreeNode[] = [];

    for (const [bookId, sectionMap] of bookMap) {
      const book = getBookById(bookId);
      const bookNode: TreeNode = {
        name: book?.name || bookId,
        bookId,
        depth: 1,
        children: [],
      };

      for (const [sectionId, chapters] of sectionMap) {
        const sectionNode: TreeNode = {
          name: `第${sectionId}篇`,
          bookId,
          sectionId,
          depth: 2,
          children: chapters.map((ch) => ({
            name: `${ch.chapterId}章`,
            bookId,
            sectionId,
            chapterId: ch.chapterId,
            depth: 3,
            value: ch.charCount,
          })),
        };
        bookNode.children?.push(sectionNode);
      }

      // Sort sections by sectionId
      bookNode.children?.sort((a, b) => {
        const numA = Number.parseInt(a.sectionId || '0', 10);
        const numB = Number.parseInt(b.sectionId || '0', 10);
        return numA - numB;
      });

      children.push(bookNode);
    }

    // Sort books by total character count (descending)
    children.sort((a, b) => {
      const sumA = a.children?.reduce(
        (sum, sec) =>
          sum + (sec.children?.reduce((s, ch) => s + (ch.value || 0), 0) || 0),
        0,
      );
      const sumB = b.children?.reduce(
        (sum, sec) =>
          sum + (sec.children?.reduce((s, ch) => s + (ch.value || 0), 0) || 0),
        0,
      );
      return (sumB || 0) - (sumA || 0);
    });

    return { name: 'root', depth: 0, children };
  }, [chapterLengths]);

  // Total characters
  const totalChars = useMemo(() => {
    return chapterLengths.reduce((sum, ch) => sum + ch.charCount, 0);
  }, [chapterLengths]);

  // Book summary for legend
  const bookSummary = useMemo(() => {
    const summary: {
      bookId: string;
      name: string;
      charCount: number;
      sectionCount: number;
      chapterCount: number;
    }[] = [];

    for (const bookNode of treeData.children || []) {
      let charCount = 0;
      let chapterCount = 0;
      const sectionCount = bookNode.children?.length || 0;

      for (const section of bookNode.children || []) {
        for (const chapter of section.children || []) {
          charCount += chapter.value || 0;
          chapterCount++;
        }
      }

      summary.push({
        bookId: bookNode.bookId || '',
        name: bookNode.name,
        charCount,
        sectionCount,
        chapterCount,
      });
    }

    return summary;
  }, [treeData]);

  // Generate Voronoi Treemap
  const voronoiData = useMemo(() => {
    if (!treeData.children || treeData.children.length === 0) return null;

    // Filter by selected book if any
    const filteredData: TreeNode = selectedBook
      ? {
          ...treeData,
          children: treeData.children?.filter((b) => b.bookId === selectedBook),
        }
      : treeData;

    // Create hierarchy
    const root = hierarchy(filteredData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create Voronoi Treemap layout with seeded PRNG for deterministic results
    const seed = selectedBook || 'voronoi-treemap';
    const layout = voronoiTreemap<TreeNode>()
      .prng(seedrandom(seed))
      .clip([
        [0, 0],
        [0, height],
        [width, height],
        [width, 0],
      ])
      .convergenceRatio(0.001)
      .maxIterationCount(50);

    // Run layout
    layout(root as HierarchyNode<TreeNode>);

    return root;
  }, [treeData, selectedBook, width, height]);

  // Convert polygon points to SVG path
  const polygonToPath = (polygon: [number, number][]): string => {
    if (!polygon || polygon.length === 0) return '';
    return `M${polygon.map((p) => `${p[0]},${p[1]}`).join('L')}Z`;
  };

  // Get centroid of polygon for label placement
  const getCentroid = (polygon: [number, number][]): [number, number] => {
    if (!polygon || polygon.length === 0) return [0, 0];
    let x = 0;
    let y = 0;
    for (const [px, py] of polygon) {
      x += px;
      y += py;
    }
    return [x / polygon.length, y / polygon.length];
  };

  // Calculate polygon area for determining label visibility
  const getPolygonArea = (polygon: [number, number][]): number => {
    if (!polygon || polygon.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i][0] * polygon[j][1];
      area -= polygon[j][0] * polygon[i][1];
    }
    return Math.abs(area / 2);
  };

  // Build URL for navigation
  const getNodeUrl = (node: TreeNode): string => {
    const { bookId, sectionId, chapterId } = node;
    if (chapterId) {
      return `/books/${bookId}/${sectionId}/${chapterId}`;
    }
    if (sectionId) {
      return `/books/${bookId}/${sectionId}`;
    }
    return `/books/${bookId}`;
  };

  // Build label for hover info
  const getNodeLabel = (node: TreeNode, value: number | undefined): string => {
    const { bookId, sectionId, chapterId } = node;
    const bookName = bookSummary.find((b) => b.bookId === bookId)?.name || '';

    if (chapterId) {
      return `${bookName} 第${sectionId}篇 ${chapterId}章: ${value?.toLocaleString()}字`;
    }
    if (sectionId) {
      return `${bookName} ${node.name}: ${value?.toLocaleString()}字`;
    }
    return `${node.name}: ${value?.toLocaleString()}字`;
  };

  // Handle click to navigate
  const handleClick = (node: TreeNode) => {
    router.push(getNodeUrl(node));
  };

  // Show loading state on SSR to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div
          className="mx-auto animate-pulse bg-zinc-100 dark:bg-zinc-800"
          style={{ width, height }}
        />
      </div>
    );
  }

  if (!voronoiData) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        データがありません
      </div>
    );
  }

  // Get all nodes for rendering (excluding root)
  type NodeWithPolygon = HierarchyNode<TreeNode> & {
    polygon?: [number, number][];
  };
  const allNodes = voronoiData.descendants().slice(1) as NodeWithPolygon[];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Book filter buttons */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedBook(null)}
          className={`rounded px-3 py-1 text-xs transition-colors ${
            selectedBook === null
              ? 'bg-zinc-700 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          全体
        </button>
        {bookSummary.map((book) => {
          const colors = chartTheme.getBookColorPalette(book.bookId);
          return (
            <button
              key={book.bookId}
              type="button"
              onClick={() =>
                setSelectedBook(
                  selectedBook === book.bookId ? null : book.bookId,
                )
              }
              className="rounded px-3 py-1 text-xs transition-colors"
              style={{
                backgroundColor:
                  selectedBook === book.bookId ? colors.light : colors.lighter,
                color: selectedBook === book.bookId ? '#FFFFFF' : '#1f2937',
              }}
            >
              {book.name}
            </button>
          );
        })}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-full"
        role="img"
        aria-label="書籍別文字数"
      >
        {/* Render all nodes by depth (deeper = later = on top) */}
        {allNodes
          .sort((a, b) => a.depth - b.depth)
          .map((node) => {
            const polygon = node.polygon;
            if (!polygon) return null;

            const nodeKey = `${node.data.bookId}-${node.data.sectionId || ''}-${node.data.chapterId || ''}`;
            const isHovered = hoverInfo?.nodeKey === nodeKey;
            const bookId = node.data.bookId || '';
            const depth = node.depth;

            const pathData = polygonToPath(polygon);
            const [cx, cy] = getCentroid(polygon);
            const area = getPolygonArea(polygon);

            // Stroke width for inner boundaries (book boundaries drawn separately)
            // depth 1 = book, depth 2 = section, depth 3 = chapter
            let strokeWidth = 0.5;
            if (depth === 2) {
              strokeWidth = 5; // section boundaries
            } else if (depth === 3) {
              strokeWidth = isHovered ? 1.5 : 0.5; // chapter boundaries
            }

            // Show labels only for larger areas
            const showBookLabel = depth === 1;
            const showSectionLabel = depth === 2 && area > 1500;
            const showChapterLabel = depth === 3 && area > 600;

            const textColor = getTextColor(bookId, depth);

            return (
              <g key={nodeKey}>
                {/* Cell shape */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path interaction */}
                <path
                  d={pathData}
                  fill={getNodeColor(bookId, depth, isHovered)}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={strokeWidth}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() =>
                    setHoverInfo({
                      nodeKey,
                      label: getNodeLabel(node.data, node.value),
                    })
                  }
                  onMouseLeave={() => setHoverInfo(null)}
                  onClick={() => handleClick(node.data)}
                />

                {/* Book label with background for better readability */}
                {showBookLabel && (
                  <>
                    {/* Text shadow/outline for better contrast */}
                    <text
                      x={cx}
                      y={cy - 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={18}
                      fontWeight="bold"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth={3}
                      fill="none"
                      className="pointer-events-none"
                    >
                      {node.data.name}
                    </text>
                    <text
                      x={cx}
                      y={cy - 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={18}
                      fontWeight="bold"
                      fill={textColor}
                      className="pointer-events-none"
                    >
                      {node.data.name}
                    </text>
                    {/* Character count */}
                    <text
                      x={cx}
                      y={cy + 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={12}
                      fill={textColor}
                      fillOpacity={0.9}
                      className="pointer-events-none"
                    >
                      {node.value?.toLocaleString()}字
                    </text>
                  </>
                )}

                {/* Section label */}
                {showSectionLabel && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight="500"
                    fill={textColor}
                    className="pointer-events-none"
                  >
                    {node.data.name}
                  </text>
                )}

                {/* Chapter label */}
                {showChapterLabel && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={16}
                    fill={textColor}
                    className="pointer-events-none"
                  >
                    {node.data.chapterId}
                  </text>
                )}
              </g>
            );
          })}

        {/* Section boundaries - drawn after cells to be on top */}
        {allNodes
          .filter((node) => node.depth === 2)
          .map((node) => {
            const polygon = node.polygon;
            if (!polygon) return null;
            const pathData = polygonToPath(polygon);
            return (
              <path
                key={`section-border-${node.data.bookId}-${node.data.sectionId}`}
                d={pathData}
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={2}
                className="pointer-events-none"
              />
            );
          })}

        {/* Book boundaries - drawn last to be on top */}
        {allNodes
          .filter((node) => node.depth === 1)
          .map((node) => {
            const polygon = node.polygon;
            if (!polygon) return null;
            const pathData = polygonToPath(polygon);
            return (
              <path
                key={`book-border-${node.data.bookId}`}
                d={pathData}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3}
                className="pointer-events-none"
              />
            );
          })}
      </svg>

      {/* Hover info below SVG (text only, not a link) */}
      <div className="mt-2 flex h-8 items-center justify-center">
        {hoverInfo ? (
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {hoverInfo.label}（クリックで移動）
          </span>
        ) : (
          <span className="text-sm text-zinc-400">
            領域をクリックするとコンテンツに移動
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2 text-xs">
        <div className="mx-8 flex flex-wrap items-center justify-start gap-4 sm:mx-0 sm:justify-center">
          {bookSummary.map((book) => {
            const percentage = ((book.charCount / totalChars) * 100).toFixed(1);
            const colors = chartTheme.getBookColorPalette(book.bookId);
            // Use light color for legend to match non-hovered display (depth 2 and 3 use light)
            return (
              <div key={book.bookId} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: colors.light }}
                />
                <span className="text-zinc-700 dark:text-zinc-300">
                  {book.name}: {book.sectionCount}篇 {book.chapterCount}章 (
                  {percentage}%)
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-center text-zinc-700 dark:text-zinc-300">
          総文字数: {totalChars.toLocaleString()}字
        </div>
      </div>
    </div>
  );
}
