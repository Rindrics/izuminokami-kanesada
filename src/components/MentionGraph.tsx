'use client';

import type { ElementDefinition, Stylesheet } from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import { chartTheme } from '@/lib/chart-theme';
import type { SpeakerGraph } from './DialogueGraph';

interface MentionGraphProps {
  graph: SpeakerGraph;
  height?: string;
}

export function MentionGraph({ graph, height = '600px' }: MentionGraphProps) {
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

  // Cytoscape stylesheet (similar to DialogueGraph but optimized for person-concept relationships)
  const stylesheet: Stylesheet[] = [
    {
      selector: 'node[type = "person"]',
      style: {
        width: chartTheme.cytoscape.node.width,
        height: chartTheme.cytoscape.node.height,
        shape: chartTheme.cytoscape.node.shape,
        'border-width': chartTheme.cytoscape.node.borderWidth,
        'border-color': chartTheme.cytoscape.node.borderColor,
        label: chartTheme.cytoscape.node.label,
        'text-valign': chartTheme.cytoscape.node.textValign,
        'text-halign': chartTheme.cytoscape.node.textHalign,
        color: chartTheme.cytoscape.node.textColor,
        'font-size': chartTheme.cytoscape.node.fontSize,
        'font-weight': chartTheme.cytoscape.node.fontWeight,
        'background-color': (node) => {
          const nodeData = node.data() as { id: string };
          return (
            chartTheme.personColors[nodeData.id] ||
            chartTheme.colors.primary[500]
          );
        },
      },
    },
    {
      selector: 'node[type = "concept"]',
      style: {
        width: 50,
        height: 50,
        shape: 'round-rectangle',
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

  // Layout options optimized for bipartite graph (person-concept)
  const layout = {
    name: 'cose-bilkent',
    idealEdgeLength: 100,
    nodeOverlap: 20,
    refresh: 20,
    fit: true,
    padding: 30,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: 4500,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  };

  return (
    <div className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height }}
        stylesheet={stylesheet}
        layout={layout}
        cy={(cy) => {
          // Enable zoom and pan
          cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            console.log('Node clicked:', node.data());
          });
        }}
      />
    </div>
  );
}
