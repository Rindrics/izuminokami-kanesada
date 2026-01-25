'use client';

import { useState } from 'react';
import { DialogueGraph } from '@/components/DialogueGraph';
import { BioFabricGraph } from '@/components/graphs/BioFabricGraph';
import type { SpeakerGraph } from '@/lib/graph/types';

type VisualizationType = 'network' | 'biofabric';

interface DialogueGraphSectionProps {
  graph: SpeakerGraph;
}

/**
 * Section component for dialogue graph with visualization type selector
 */
export function DialogueGraphSection({ graph }: DialogueGraphSectionProps) {
  const [visualizationType, setVisualizationType] =
    useState<VisualizationType>('network');

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-black dark:text-white">
          対話相関図
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVisualizationType('network')}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              visualizationType === 'network'
                ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            ネットワーク
          </button>
          <button
            type="button"
            onClick={() => setVisualizationType('biofabric')}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              visualizationType === 'biofabric'
                ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            BioFabric
          </button>
        </div>
      </div>
      <p className="mb-3 text-sm text-zinc-500">
        {visualizationType === 'network'
          ? '人物間の対話関係と人物から概念への言及関係を可視化（エッジの太さは言及回数に比例）'
          : '人物と概念の関係をマトリクス形式で表示（縦軸: 人物/概念、横軸: エッジ）'}
      </p>
      {visualizationType === 'network' ? (
        <DialogueGraph graph={graph} />
      ) : (
        <BioFabricGraph graph={graph} />
      )}
    </section>
  );
}
