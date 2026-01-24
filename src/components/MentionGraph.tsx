'use client';

import cytoscape, {
  type Core,
  type EdgeSingular,
  type ElementDefinition,
  type NodeSingular,
  type StylesheetStyle,
} from 'cytoscape';
// @ts-expect-error - cytoscape-fcose doesn't have TypeScript definitions
import fcose from 'cytoscape-fcose';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';
import { chartTheme } from '@/lib/chart-theme';
import type { GraphEdgeWithContentIds, SpeakerGraph } from './DialogueGraph';

// Register fcose layout
cytoscape.use(fcose);

interface MentionGraphProps {
  graph: SpeakerGraph;
  height?: string;
}

export function MentionGraph({ graph, height = '600px' }: MentionGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedEdge, setSelectedEdge] =
    useState<GraphEdgeWithContentIds | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert graph data to Cytoscape format
    const elements: ElementDefinition[] = [
      // Add nodes
      ...graph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
        },
      })),
      // Add edges
      ...graph.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          topic: edge.topic,
          weight: edge.weight,
          contentIds: edge.contentIds,
          originalEdge: edge, // Store original edge for popup
        },
      })),
    ];

    // Cytoscape stylesheet (similar to DialogueGraph but optimized for person-concept relationships)
    const stylesheet: StylesheetStyle[] = [
      {
        selector: 'node[type = "person"]',
        style: {
          width: 'label',
          height: 'label',
          shape: 'round-rectangle',
          'border-width': 2,
          'border-color': chartTheme.colors.neutral[200],
          'background-color': (node) => {
            const nodeData = node.data() as { id: string };
            return chartTheme.personColor;
          },
          label: chartTheme.cytoscape.node.label,
          'text-valign': 'center',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': '100px',
          color: chartTheme.cytoscape.node.textColor,
          'font-size': chartTheme.cytoscape.node.fontSize,
          'font-weight': chartTheme.cytoscape.node.fontWeight,
          padding: '8px',
        },
      },
      {
        selector: 'node[type = "concept"]',
        style: {
          width: 50,
          height: 50,
          shape: 'ellipse', // Circle shape
          'border-width': 2,
          'border-color': chartTheme.colors.neutral[200],
          label: chartTheme.cytoscape.node.label,
          'text-valign': chartTheme.cytoscape.node.textValign,
          'text-halign': chartTheme.cytoscape.node.textHalign,
          color: '#FFFFFF', // White text for concept nodes
          'font-size': 18,
          'font-weight': 'bold',
          'background-color': chartTheme.conceptColor,
        },
      },
      {
        selector: 'edge',
        style: {
          width: (edge: EdgeSingular) => {
            const edgeData = edge.data() as { weight: number };
            const { min, max } = chartTheme.styles.edgeWidth;
            // Normalize weight to edge width
            const normalizedWeight = Math.min(edgeData.weight || 1, 10);
            return min + (normalizedWeight / 10) * (max - min);
          },
          'line-color': chartTheme.cytoscape.edge.lineColor,
          'target-arrow-color': chartTheme.cytoscape.edge.targetArrowColor,
          'target-arrow-shape': chartTheme.cytoscape.edge.targetArrowShape,
          'curve-style': chartTheme.cytoscape.edge.curveStyle,
          label: chartTheme.cytoscape.edge.label,
          'text-rotation': chartTheme.cytoscape.edge.textRotation,
          'text-margin-y': chartTheme.cytoscape.edge.textMarginY,
          'font-size': chartTheme.cytoscape.edge.fontSize,
          color: chartTheme.cytoscape.edge.textColor,
        },
      },
    ];

    // Create Cytoscape instance
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: stylesheet,
    });

    // Run layout with fcose (better overlap prevention)
    const layout = cy.layout({
      name: 'fcose',
      // @ts-expect-error - fcose layout options are not fully typed
      quality: 'proof', // Use highest quality for best overlap prevention
      randomize: true,
      animate: false, // Disable animation for faster rendering
      animationDuration: 0,
      animationEasing: undefined,
      fit: true,
      padding: 100,
      nodeDimensionsIncludeLabels: true,
      uniformNodeDimensions: false,
      packComponents: true, // Pack disconnected components separately
      step: 'all', // Run all steps

      // Node repulsion and spacing
      nodeRepulsion: (node: NodeSingular) => {
        const nodeType = node.data('type');
        // Concepts need more space
        if (nodeType === 'concept') {
          return 10000;
        }
        // Persons need even more space
        return 15000;
      },
      idealEdgeLength: 300, // Longer edges for person-concept relationships
      edgeElasticity: 0.1,
      nestingFactor: 0.1,
      gravity: 0.1,
      gravityRangeCompound: 1.5,
      gravityCompound: 1.0,
      gravityRange: 3.8,
      initialEnergyOnIncremental: 0.3,

      // Tiling options for disconnected components
      tilingPaddingVertical: 50,
      tilingPaddingHorizontal: 50,
    });

    layout.run();

    cyRef.current = cy;

    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graph]);

  // Separate effect for event handlers (doesn't trigger layout)
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Remove existing event handlers to avoid duplicates
    cy.off('mouseover', 'edge');
    cy.off('mouseout', 'edge');
    cy.off('tap', 'edge');
    cy.off('tap', 'node');

    // Handle edge hover to show popup with content links
    cy.on('mouseover', 'edge', (evt) => {
      if (isPinned) return; // Don't update position if pinned
      const edge = evt.target;
      const edgeData = edge.data() as {
        originalEdge: GraphEdgeWithContentIds;
        contentIds: string[];
      };
      const pos = evt.renderedPosition || evt.position;

      setSelectedEdge(edgeData.originalEdge);
      setPopupPosition({
        x: pos.x + (containerRef.current?.offsetLeft || 0),
        y: pos.y + (containerRef.current?.offsetTop || 0),
      });
    });

    // Handle edge click to pin popup
    cy.on('tap', 'edge', (evt) => {
      evt.stopPropagation(); // Prevent layout from being triggered
      const edge = evt.target;
      const edgeData = edge.data() as {
        originalEdge: GraphEdgeWithContentIds;
        contentIds: string[];
      };
      const pos = evt.renderedPosition || evt.position;

      setSelectedEdge(edgeData.originalEdge);
      setPopupPosition({
        x: pos.x + (containerRef.current?.offsetLeft || 0),
        y: pos.y + (containerRef.current?.offsetTop || 0),
      });
      setIsPinned(true);
    });

    // Close popup when mouse leaves edge (only if not pinned)
    cy.on('mouseout', 'edge', () => {
      if (!isPinned) {
        setSelectedEdge(null);
        setPopupPosition(null);
      }
    });

    // Enable zoom and pan
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      console.log('Node clicked:', node.data());
    });
  }, [isPinned]);

  // Handle ESC key to close popup (both hover and pinned states)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedEdge) {
        setIsPinned(false);
        setSelectedEdge(null);
        setPopupPosition(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEdge]);

  return (
    <div className="relative w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div ref={containerRef} style={{ width: '100%', height }} />
      {selectedEdge && popupPosition && (
        <div
          className="absolute z-10 rounded-lg border border-zinc-300 bg-white p-4 shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px',
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              関連コンテンツ ({selectedEdge.contentIds.length} 件)
            </div>
            {isPinned && (
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                ESC で閉じる
              </div>
            )}
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
