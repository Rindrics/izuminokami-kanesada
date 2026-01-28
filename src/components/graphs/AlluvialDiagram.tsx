'use client';

import {
  type SankeyLink,
  type SankeyNode,
  sankey,
  sankeyLinkHorizontal,
} from 'd3-sankey';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { KEY_CONCEPTS_INFO } from '@/data/key-concepts';
import { getBookById } from '@/generated/books';
import { getPersonName } from '@/generated/persons';
import type { CharIndex, SpeakerGraph } from '@/generated/stats';
import { chartTheme } from '@/lib/chart-theme';

interface AlluvialDiagramProps {
  charIndex: CharIndex[];
  dialogueGraph: SpeakerGraph;
  mentionGraph: SpeakerGraph;
  width?: number;
  height?: number;
}

// Key concepts to track (virtues and important terms)
// Filter to only show commonly displayed concepts in alluvial diagram
const KEY_CONCEPTS = KEY_CONCEPTS_INFO.filter((c) =>
  [
    '仁',
    '義',
    '禮',
    '智',
    '信',
    '孝',
    '忠',
    '學',
    '道',
    '德',
    '民',
    '君',
    '君子',
  ].includes(c.char),
);

// Book order by approximate composition date
const BOOK_ORDER = ['lunyu', 'daxue', 'zhongyong', 'mengzi'];

type NodeType = 'book' | 'person' | 'concept';

interface NodeData {
  id: string;
  name: string;
  type: NodeType;
  color: string;
  column: number; // 0=book, 1=concept, 2=person
}

interface LinkData {
  source: string;
  target: string;
  value: number;
  // For book→concept links, store detailed chapter info
  chapterDetails?: {
    bookId: string;
    char: string;
    contentIds: string[]; // e.g., ["lunyu/1/5", "lunyu/2/3"]
  };
}

/**
 * Alluvial Diagram - shows flow: Book → Concept → Person
 */
export function AlluvialDiagram({
  charIndex,
  dialogueGraph,
  mentionGraph,
  width = 700,
  height = 500,
}: AlluvialDiagramProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Build a map from char to contentIds
  const charToContentIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of charIndex) {
      map.set(entry.char, entry.contentIds);
    }
    return map;
  }, [charIndex]);

  // Get available books from data
  const availableBooks = useMemo(() => {
    const bookIds = new Set<string>();
    for (const entry of charIndex) {
      for (const contentId of entry.contentIds) {
        bookIds.add(contentId.split('/')[0]);
      }
    }
    return BOOK_ORDER.filter((id) => bookIds.has(id));
  }, [charIndex]);

  // Get persons who have spoken
  const availablePersons = useMemo(() => {
    const personIds = new Set<string>();
    for (const node of dialogueGraph.nodes) {
      if (node.type === 'person') {
        personIds.add(node.id);
      }
    }
    return Array.from(personIds);
  }, [dialogueGraph]);

  // Filter concepts that actually appear in the data
  const presentConcepts = useMemo(() => {
    return KEY_CONCEPTS.filter((c) => charToContentIds.has(c.char));
  }, [charToContentIds]);

  // Build concept -> person mapping from mentionGraph edges
  const conceptPersonCounts = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();

    // Use mentionGraph edges instead of parsing text directly
    for (const edge of mentionGraph.edges) {
      // Edge format: source (person) -> target (concept)
      if (edge.source && edge.target) {
        let personMap = counts.get(edge.target);
        if (!personMap) {
          personMap = new Map();
          counts.set(edge.target, personMap);
        }
        // Use weight as count (weight represents mention frequency)
        personMap.set(
          edge.source,
          (personMap.get(edge.source) || 0) + edge.weight,
        );
      }
    }

    return counts;
  }, [mentionGraph]);

  // Build book -> concept mapping from mentionGraph edges (for accurate weights)
  const bookConceptCounts = useMemo(() => {
    const counts = new Map<string, Map<string, number>>(); // bookId -> concept -> count

    for (const edge of mentionGraph.edges) {
      // Edge format: source (person) -> target (concept)
      if (edge.target && edge.contentIds) {
        const concept = edge.target;
        // Derive unique bookIds from contentIds to avoid double-counting weight
        const uniqueBookIds = new Set(
          edge.contentIds.map((contentId) => contentId.split('/')[0]),
        );
        // Add weight once per unique book
        for (const bookId of uniqueBookIds) {
          let conceptMap = counts.get(bookId);
          if (!conceptMap) {
            conceptMap = new Map();
            counts.set(bookId, conceptMap);
          }
          conceptMap.set(concept, (conceptMap.get(concept) || 0) + edge.weight);
        }
      }
    }

    return counts;
  }, [mentionGraph]);

  // Build Sankey data with 3 columns: Book → Concept → Person
  const sankeyData = useMemo(() => {
    const nodes: NodeData[] = [];
    const links: LinkData[] = [];

    // Add book nodes (column 0 - left)
    for (const bookId of availableBooks) {
      const book = getBookById(bookId);
      nodes.push({
        id: `book-${bookId}`,
        name: book?.name || bookId,
        type: 'book',
        color: chartTheme.getBookColor(bookId),
        column: 0,
      });
    }

    // Add concept nodes (column 1 - center)
    for (const concept of presentConcepts) {
      nodes.push({
        id: `concept-${concept.char}`,
        name: concept.char,
        type: 'concept',
        color: chartTheme.getConceptTopicColor(concept.char),
        column: 1,
      });
    }

    // Get persons who have mentioned concepts
    const personsWithConcepts = new Set<string>();
    for (const [, personMap] of conceptPersonCounts) {
      for (const personId of personMap.keys()) {
        if (availablePersons.includes(personId)) {
          personsWithConcepts.add(personId);
        }
      }
    }

    // Add person nodes (column 2 - right)
    for (const personId of personsWithConcepts) {
      nodes.push({
        id: `person-${personId}`,
        name: getPersonName(personId),
        type: 'person',
        color: chartTheme.getPersonColor(personId),
        column: 2,
      });
    }

    // Add links: Book → Concept (with chapter details)
    // Use bookConceptCounts calculated above for accurate weights
    for (const concept of presentConcepts) {
      const contentIds = charToContentIds.get(concept.char) || [];
      const bookContentIds = new Map<string, string[]>();

      for (const contentId of contentIds) {
        const bookId = contentId.split('/')[0];
        let ids = bookContentIds.get(bookId);
        if (!ids) {
          ids = [];
          bookContentIds.set(bookId, ids);
        }
        ids.push(contentId);
      }

      for (const [bookId, ids] of bookContentIds) {
        if (availableBooks.includes(bookId)) {
          // Use actual mention frequency from mentionGraph instead of chapter count
          const mentionCount =
            bookConceptCounts.get(bookId)?.get(concept.char) || 0;
          // Fallback to chapter count if no mentions found (shouldn't happen, but safety check)
          const value = mentionCount > 0 ? mentionCount : ids.length;

          links.push({
            source: `book-${bookId}`,
            target: `concept-${concept.char}`,
            value,
            chapterDetails: {
              bookId,
              char: concept.char,
              contentIds: ids,
            },
          });
        }
      }
    }

    // Add links: Concept → Person
    for (const [char, personMap] of conceptPersonCounts) {
      if (presentConcepts.some((c) => c.char === char)) {
        for (const [personId, count] of personMap) {
          if (personsWithConcepts.has(personId)) {
            links.push({
              source: `concept-${char}`,
              target: `person-${personId}`,
              value: count,
            });
          }
        }
      }
    }

    return { nodes, links };
  }, [
    availableBooks,
    availablePersons,
    presentConcepts,
    conceptPersonCounts,
    charToContentIds,
    bookConceptCounts,
  ]);

  // Create Sankey layout
  const sankeyLayout = useMemo(() => {
    if (sankeyData.nodes.length === 0 || sankeyData.links.length === 0)
      return null;

    const margin = { top: 30, right: 80, bottom: 20, left: 80 };

    // Create node index map
    const nodeIndexMap = new Map<string, number>();
    sankeyData.nodes.forEach((node, i) => {
      nodeIndexMap.set(node.id, i);
    });

    // Filter out links with invalid nodes
    const validLinks = sankeyData.links.filter(
      (link) => nodeIndexMap.has(link.source) && nodeIndexMap.has(link.target),
    );

    if (validLinks.length === 0) return null;

    // Convert links to use indices, preserving chapterDetails
    const indexedLinks = validLinks.map((link) => ({
      source: nodeIndexMap.get(link.source) ?? 0,
      target: nodeIndexMap.get(link.target) ?? 0,
      value: link.value,
      chapterDetails: link.chapterDetails,
    }));

    const generator = sankey<NodeData, LinkData>()
      .nodeWidth(15)
      .nodePadding(12)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    const result = generator({
      nodes: sankeyData.nodes.map((n) => ({ ...n })),
      links: indexedLinks as unknown as SankeyLink<NodeData, LinkData>[],
    });

    return {
      nodes: result.nodes,
      links: result.links,
      margin,
    };
  }, [sankeyData, width, height]);

  // Helper to format chapter name from contentId
  const formatChapterName = (contentId: string): string => {
    const [bookId, sectionId, chapterId] = contentId.split('/');
    const book = getBookById(bookId);
    if (!book) return contentId;

    const section = book.sections.find((s) => s.id === sectionId);
    if (!section) return `第${sectionId}篇第${chapterId}章`;

    return `${section.name}第${chapterId}章`;
  };

  // Handle node click
  const handleNodeClick = (node: SankeyNode<NodeData, LinkData>) => {
    if (node.type === 'book') {
      const bookId = node.id.replace('book-', '');
      router.push(`/books/${bookId}`);
    } else if (node.type === 'concept') {
      const char = node.id.replace('concept-', '');
      router.push(`/char/${char}`);
    }
    // Person nodes don't have a dedicated page yet
  };

  // Handle link click (for book→concept links)
  const handleLinkClick = (link: SankeyLink<NodeData, LinkData>) => {
    const linkWithDetails = link as SankeyLink<NodeData, LinkData> & {
      chapterDetails?: LinkData['chapterDetails'];
    };
    if (linkWithDetails.chapterDetails) {
      const { char, bookId } = linkWithDetails.chapterDetails;
      router.push(`/char/${char}?book=${bookId}`);
    }
  };

  // Get hover info text (or JSX for detailed tooltips)
  const getHoverInfo = (): React.ReactNode | null => {
    if (!sankeyLayout) return null;

    if (hoveredLink) {
      const link = sankeyLayout.links.find((l) => {
        const s = l.source as SankeyNode<NodeData, LinkData>;
        const t = l.target as SankeyNode<NodeData, LinkData>;
        return `${s.id}-${t.id}` === hoveredLink;
      });

      if (link) {
        const sourceNode = link.source as SankeyNode<NodeData, LinkData>;
        const targetNode = link.target as SankeyNode<NodeData, LinkData>;
        const linkWithDetails = link as SankeyLink<NodeData, LinkData> & {
          chapterDetails?: LinkData['chapterDetails'];
        };

        if (
          sourceNode.type === 'book' &&
          targetNode.type === 'concept' &&
          linkWithDetails.chapterDetails
        ) {
          const { contentIds } = linkWithDetails.chapterDetails;
          const chapterNames = contentIds
            .slice(0, 5)
            .map((id) => formatChapterName(id));
          const hasMore = contentIds.length > 5;

          return (
            <div className="text-left">
              <div className="font-medium">
                {sourceNode.name} → 「{targetNode.name}」
              </div>
              <ul className="mt-1 list-inside list-disc text-xs">
                {chapterNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
                {hasMore && <li>他 {contentIds.length - 5} 章...</li>}
              </ul>
              <div className="mt-1 text-xs text-zinc-500">
                クリックで一覧を表示
              </div>
            </div>
          );
        }
        if (sourceNode.type === 'concept' && targetNode.type === 'person') {
          return `${sourceNode.name} → ${targetNode.name}: ${link.value}回言及`;
        }
      }
    }

    if (hoveredNode) {
      const node = sankeyLayout.nodes.find((n) => n.id === hoveredNode);
      if (node) {
        if (node.type === 'book' || node.type === 'concept') {
          return 'クリックで詳細ページへ移動';
        }
        return `${node.name}`;
      }
    }

    return null;
  };

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

  if (!sankeyLayout || sankeyLayout.nodes.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        データがありません
      </div>
    );
  }

  const { nodes, links } = sankeyLayout;

  // Get link opacity based on hover state
  const getLinkOpacity = (link: SankeyLink<NodeData, LinkData>): number => {
    const sourceNode = link.source as SankeyNode<NodeData, LinkData>;
    const targetNode = link.target as SankeyNode<NodeData, LinkData>;
    const linkId = `${sourceNode.id}-${targetNode.id}`;

    if (hoveredLink === linkId) return 0.8;
    if (hoveredNode) {
      if (sourceNode.id === hoveredNode || targetNode.id === hoveredNode) {
        return 0.6;
      }
      return 0.1;
    }
    return 0.4;
  };

  const hoverInfo = getHoverInfo();

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <svg
        width={width}
        height={height}
        className="mx-auto"
        role="img"
        aria-label="沖積図 - 書籍・概念・人物の関係"
      >
        {/* Column labels */}
        <text
          x={sankeyLayout.margin.left}
          y={16}
          fontSize={11}
          fill="#6b7280"
          textAnchor="start"
        >
          書籍
        </text>
        <text
          x={width / 2}
          y={16}
          fontSize={11}
          fill="#6b7280"
          textAnchor="middle"
        >
          概念
        </text>
        <text
          x={width - sankeyLayout.margin.right}
          y={16}
          fontSize={11}
          fill="#6b7280"
          textAnchor="end"
        >
          人物
        </text>

        {/* Links */}
        <g>
          {links.map((link) => {
            const sourceNode = link.source as SankeyNode<NodeData, LinkData>;
            const targetNode = link.target as SankeyNode<NodeData, LinkData>;
            const linkId = `${sourceNode.id}-${targetNode.id}`;
            const pathData = (
              sankeyLinkHorizontal() as (link: unknown) => string | null
            )(link);

            if (!pathData) return null;

            // Use source color for book→concept, target color for concept→person
            const strokeColor =
              sourceNode.type === 'concept'
                ? targetNode.color
                : sourceNode.color;

            const linkWithDetails = link as SankeyLink<NodeData, LinkData> & {
              chapterDetails?: LinkData['chapterDetails'];
            };
            const isClickable = !!linkWithDetails.chapterDetails;

            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: SVG path elements cannot use semantic HTML
              <path
                key={linkId}
                d={pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth={Math.max(link.width || 1, 1.5)}
                strokeOpacity={getLinkOpacity(link)}
                className={`transition-opacity ${isClickable ? 'cursor-pointer' : ''}`}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onMouseEnter={() => setHoveredLink(linkId)}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={() => isClickable && handleLinkClick(link)}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    handleLinkClick(link);
                  }
                }}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const x0 = node.x0 ?? 0;
            const x1 = node.x1 ?? 0;
            const y0 = node.y0 ?? 0;
            const y1 = node.y1 ?? 0;
            const isHovered = hoveredNode === node.id;

            // Determine label position based on node type
            const labelX =
              node.type === 'book'
                ? x0 - 6
                : node.type === 'person'
                  ? x1 + 6
                  : (x0 + x1) / 2;
            const labelAnchor =
              node.type === 'book'
                ? 'end'
                : node.type === 'person'
                  ? 'start'
                  : 'middle';
            // All labels at vertical center of node
            const labelY = (y0 + y1) / 2;

            return (
              <g key={node.id}>
                {/* Node rectangle */}
                {/* biome-ignore lint/a11y/useSemanticElements: SVG rect elements cannot use semantic HTML */}
                <rect
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={Math.max(y1 - y0, 2)}
                  fill={node.color}
                  fillOpacity={isHovered ? 1 : 0.9}
                  stroke={isHovered ? '#000' : 'none'}
                  strokeWidth={isHovered ? 2 : 0}
                  className="cursor-pointer transition-all"
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => handleNodeClick(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNodeClick(node);
                    }
                  }}
                />

                {/* Node label */}
                <text
                  x={labelX}
                  y={labelY}
                  dy="0.35em"
                  textAnchor={labelAnchor}
                  fontSize={node.type === 'concept' ? 12 : 10}
                  fontWeight={node.type === 'concept' ? 'bold' : 'normal'}
                  fill={isHovered ? '#000' : '#374151'}
                  className="pointer-events-none dark:fill-zinc-300"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover info */}
      <div className="mt-2 flex min-h-8 items-center justify-center">
        {hoverInfo ? (
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            {hoverInfo}
          </div>
        ) : (
          <span className="text-sm text-zinc-400">
            ノードやリンクにカーソルを合わせると詳細を表示
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-700 dark:text-zinc-300">
        <span className="font-medium">書籍:</span>
        {availableBooks.map((bookId) => {
          const book = getBookById(bookId);
          return (
            <div key={bookId} className="flex items-center gap-1">
              <div
                className="h-3 w-3 rounded"
                style={{ backgroundColor: chartTheme.getBookColor(bookId) }}
              />
              <span>{book?.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
