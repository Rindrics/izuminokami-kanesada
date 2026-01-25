declare module 'd3-voronoi-treemap' {
  import type { HierarchyNode } from 'd3-hierarchy';

  export interface VoronoiTreemap<T> {
    (root: HierarchyNode<T>): HierarchyNode<T>;
    clip(): [number, number][];
    clip(clip: [number, number][]): this;
    convergenceRatio(): number;
    convergenceRatio(ratio: number): this;
    maxIterationCount(): number;
    maxIterationCount(count: number): this;
    minWeightRatio(): number;
    minWeightRatio(ratio: number): this;
    prng(): () => number;
    prng(prng: () => number): this;
  }

  export function voronoiTreemap<T>(): VoronoiTreemap<T>;
}
