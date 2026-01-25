/**
 * Graph data transformation utilities
 *
 * Convert graph data between different formats for various visualization libraries.
 */

import type { ElementDefinition } from 'cytoscape';
import type { GraphEdge, SpeakerGraph } from './types';

/**
 * Cytoscape edge data with original edge reference for popup display
 */
export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  topic: string;
  weight: number;
  contentIds: string[];
  originalEdge: GraphEdge;
}

/**
 * Convert SpeakerGraph to Cytoscape ElementDefinition array
 *
 * @param graph - The source graph data
 * @returns Array of Cytoscape elements (nodes and edges)
 */
export function toCytoscapeElements(graph: SpeakerGraph): ElementDefinition[] {
  const nodes: ElementDefinition[] = graph.nodes.map((node) => ({
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
    },
  }));

  const edges: ElementDefinition[] = graph.edges.map((edge, index) => ({
    data: {
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      topic: edge.topic,
      weight: edge.weight,
      contentIds: edge.contentIds,
      originalEdge: edge,
    } satisfies CytoscapeEdgeData,
  }));

  return [...nodes, ...edges];
}
