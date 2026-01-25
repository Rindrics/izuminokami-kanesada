/**
 * Graph data types for visualization
 *
 * These types are used by multiple graph visualization components
 * (Cytoscape, BioFabric, etc.) to ensure consistent data structures.
 */

/**
 * A node in the graph, representing either a person or a concept
 */
export interface GraphNode {
  id: string;
  type: 'person' | 'concept';
  label: string;
}

/**
 * An edge in the graph, representing a relationship between nodes
 */
export interface GraphEdge {
  source: string;
  target: string;
  topic: string;
  weight: number;
  contentIds: string[];
}

/**
 * A complete graph structure with nodes and edges
 */
export interface SpeakerGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
