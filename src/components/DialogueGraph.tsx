'use client';

import cytoscape, {
  type Core,
  type ElementDefinition,
  type Stylesheet,
} from 'cytoscape';
// @ts-expect-error - cytoscape-fcose doesn't have TypeScript definitions
import fcose from 'cytoscape-fcose';
import { useEffect, useRef } from 'react';
import { chartTheme } from '@/lib/chart-theme';

// Register fcose layout
cytoscape.use(fcose);

// Graph data types (temporary, will be imported from generated/stats.ts later)
export interface GraphNode {
  id: string;
  type: 'person' | 'concept';
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  topic: string;
  weight: number;
}

export interface SpeakerGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface DialogueGraphProps {
  graph: SpeakerGraph;
  height?: string;
}

export function DialogueGraph({ graph, height = '600px' }: DialogueGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

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
        },
      })),
    ];

    // Cytoscape stylesheet
    const stylesheet: Stylesheet[] = [
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
            return (
              chartTheme.personColors[nodeData.id] ||
              chartTheme.colors.primary[500]
            );
          },
          label: chartTheme.cytoscape.node.label,
          'text-valign': 'center',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 100,
          color: chartTheme.cytoscape.node.textColor,
          'font-size': chartTheme.cytoscape.node.fontSize,
          'font-weight': chartTheme.cytoscape.node.fontWeight,
          padding: 8,
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
          color: chartTheme.cytoscape.node.textColor,
          'font-size': 18,
          'font-weight': 'bold',
          'background-color': chartTheme.conceptColor,
        },
      },
      {
        selector: 'edge',
        style: {
          width: (edge) => {
            const edgeData = edge.data() as { weight: number };
            const { min, max } = chartTheme.styles.edgeWidth;
            // Normalize weight to edge width (assuming max weight is around 10)
            const normalizedWeight = Math.min(edgeData.weight || 1, 10);
            return min + (normalizedWeight / 10) * (max - min);
          },
          'line-color': chartTheme.cytoscape.edge.lineColor,
          'target-arrow-color': chartTheme.cytoscape.edge.targetArrowColor,
          'target-arrow-shape': chartTheme.cytoscape.edge.targetArrowShape,
          'curve-style': chartTheme.cytoscape.edge.curveStyle,
          label: (edge) => {
            const edgeData = edge.data() as { topic: string };
            // Only show label if topic is not empty (person->person edges)
            return edgeData.topic || '';
          },
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
      nodeRepulsion: (node) => {
        const nodeType = node.data('type');
        // Concepts need more space
        if (nodeType === 'concept') {
          return 10000;
        }
        // Persons need even more space
        return 15000;
      },
      idealEdgeLength: (edge) => {
        const sourceType = edge.source().data('type');
        const targetType = edge.target().data('type');
        // Person-to-concept edges should be longer
        if (sourceType === 'person' && targetType === 'concept') {
          return 300;
        }
        // Person-to-person edges
        return 250;
      },
      edgeElasticity: (edge) => {
        const sourceType = edge.source().data('type');
        const targetType = edge.target().data('type');
        // Person-to-concept edges
        if (sourceType === 'person' && targetType === 'concept') {
          return 0.1;
        }
        // Person-to-person edges
        return 0.2;
      },
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

    // Enable zoom and pan
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      console.log('Node clicked:', node.data());
    });

    cyRef.current = cy;

    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graph]);

  return (
    <div className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
}
