'use client';

import { useMemo, useState } from 'react';
import { KEY_CONCEPTS } from '@/data/key-concepts';
import { contents } from '@/generated/contents';
import { getPersonName } from '@/generated/persons';
import type { PersonFrequency } from '@/generated/stats';

interface ChernoffFacesProps {
  personFrequencies: PersonFrequency[];
  width?: number;
  height?: number;
}

// Filter to only show commonly displayed concepts in Chernoff faces
const DISPLAYED_CONCEPTS = KEY_CONCEPTS.filter((c) =>
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
    '君子',
  ].includes(c),
);

interface FaceData {
  personId: string;
  name: string;
  speakerCount: number;
  mentionedCount: number;
  conceptCount: number;
  medianLength: number; // Median length of utterances
}

// Normalize value to 0-1 range
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

// Single face component
function ChernoffFace({
  data,
  x,
  y,
  size,
  maxSpeaker,
  maxMentioned,
  maxConcepts,
  maxMedianLength,
  isHovered,
  onHover,
}: {
  data: FaceData;
  x: number;
  y: number;
  size: number;
  maxSpeaker: number;
  maxMentioned: number;
  maxConcepts: number;
  maxMedianLength: number;
  isHovered: boolean;
  onHover: (personId: string | null) => void;
}) {
  // Normalize values to 0-1 range
  const speakerNorm = normalize(data.speakerCount, 0, maxSpeaker);
  const mentionedNorm = normalize(data.mentionedCount, 0, maxMentioned);
  const conceptNorm = normalize(data.conceptCount, 0, maxConcepts);
  const medianLengthNorm = normalize(data.medianLength, 0, maxMedianLength);

  // Face parameters based on data
  const faceRadius = size * (0.3 + speakerNorm * 0.2); // 30-50% of size
  const eyeSize = 3 + mentionedNorm * 6; // 3-9px
  const eyeY = -faceRadius * 0.2;
  const eyeSpacing = faceRadius * 0.4;
  const browAngle = -20 + conceptNorm * 40; // -20 to +20 degrees
  const mouthWidth = faceRadius * (0.3 + speakerNorm * 0.4); // 30-70% of face based on speaker count
  const mouthCurve = -5 + speakerNorm * 15; // Smile based on speaker count

  // Nose size (width and height) based on median utterance length
  const noseWidth = 3 + medianLengthNorm * 5; // 3-8px width
  const noseHeight = faceRadius * (0.25 + medianLengthNorm * 0.15); // Scale with face

  const faceColor = isHovered ? '#fde68a' : '#fef3c7'; // Highlight on hover
  const featureColor = '#374151';

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: SVG g elements cannot use semantic HTML
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => onHover(data.personId)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer"
    >
      {/* Face */}
      <ellipse
        cx={0}
        cy={0}
        rx={faceRadius}
        ry={faceRadius * 1.1}
        fill={faceColor}
        stroke={isHovered ? '#f59e0b' : featureColor}
        strokeWidth={isHovered ? 2 : 1.5}
      />

      {/* Left eye */}
      <ellipse
        cx={-eyeSpacing}
        cy={eyeY}
        rx={eyeSize * 0.8}
        ry={eyeSize}
        fill="white"
        stroke={featureColor}
        strokeWidth={1}
      />
      <circle
        cx={-eyeSpacing}
        cy={eyeY}
        r={eyeSize * 0.4}
        fill={featureColor}
      />

      {/* Right eye */}
      <ellipse
        cx={eyeSpacing}
        cy={eyeY}
        rx={eyeSize * 0.8}
        ry={eyeSize}
        fill="white"
        stroke={featureColor}
        strokeWidth={1}
      />
      <circle cx={eyeSpacing} cy={eyeY} r={eyeSize * 0.4} fill={featureColor} />

      {/* Left eyebrow */}
      <line
        x1={-eyeSpacing - eyeSize}
        y1={eyeY - eyeSize - 3}
        x2={-eyeSpacing + eyeSize}
        y2={eyeY - eyeSize - 3}
        stroke={featureColor}
        strokeWidth={2}
        strokeLinecap="round"
        transform={`rotate(${-browAngle}, ${-eyeSpacing}, ${eyeY - eyeSize - 3})`}
      />

      {/* Right eyebrow */}
      <line
        x1={eyeSpacing - eyeSize}
        y1={eyeY - eyeSize - 3}
        x2={eyeSpacing + eyeSize}
        y2={eyeY - eyeSize - 3}
        stroke={featureColor}
        strokeWidth={2}
        strokeLinecap="round"
        transform={`rotate(${browAngle}, ${eyeSpacing}, ${eyeY - eyeSize - 3})`}
      />

      {/* Nose - size (width & height) based on median utterance length */}
      <path
        d={`M 0 ${eyeY + 5} L ${noseWidth} ${eyeY + 5 + noseHeight} L ${-noseWidth} ${eyeY + 5 + noseHeight} Z`}
        fill="none"
        stroke={featureColor}
        strokeWidth={1.5}
      />

      {/* Mouth */}
      <path
        d={`M ${-mouthWidth} ${faceRadius * 0.5} Q 0 ${faceRadius * 0.5 + mouthCurve} ${mouthWidth} ${faceRadius * 0.5}`}
        fill="none"
        stroke={featureColor}
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* Name label */}
      <text
        y={faceRadius * 1.1 + 18}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
        fill="#374151"
        className="dark:fill-zinc-300"
      >
        {data.name}
      </text>
    </g>
  );
}

/**
 * Chernoff Faces - visualize person statistics as face features
 */
export function ChernoffFaces({
  personFrequencies,
  width = 700,
  height = 500,
}: ChernoffFacesProps) {
  const [hoveredPerson, setHoveredPerson] = useState<string | null>(null);
  // Calculate additional metrics for each person
  const faceData = useMemo(() => {
    const data: FaceData[] = [];

    // Build person -> concepts mapping and utterance lengths
    const personConcepts = new Map<string, Set<string>>();
    const personUtteranceLengths = new Map<string, number[]>();

    for (const content of contents) {
      for (const segment of content.segments) {
        if (segment.speaker) {
          const text = segment.text.original;

          // Track utterance lengths
          if (!personUtteranceLengths.has(segment.speaker)) {
            personUtteranceLengths.set(segment.speaker, []);
          }
          personUtteranceLengths.get(segment.speaker)?.push(text.length);

          // Track concepts mentioned
          for (const concept of DISPLAYED_CONCEPTS) {
            if (text.includes(concept)) {
              if (!personConcepts.has(segment.speaker)) {
                personConcepts.set(segment.speaker, new Set());
              }
              personConcepts.get(segment.speaker)?.add(concept);
            }
          }
        }
      }
    }

    // Helper to calculate median
    const median = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    // Build face data for each person with frequency data
    for (const pf of personFrequencies) {
      if (pf.speakerCount > 0) {
        const lengths = personUtteranceLengths.get(pf.person) ?? [];
        data.push({
          personId: pf.person,
          name: getPersonName(pf.person),
          speakerCount: pf.speakerCount,
          mentionedCount: pf.mentionedCount,
          conceptCount: personConcepts.get(pf.person)?.size ?? 0,
          medianLength: median(lengths),
        });
      }
    }

    return data;
  }, [personFrequencies]);

  // Calculate max values for normalization
  const maxValues = useMemo(() => {
    return {
      maxSpeaker: Math.max(...faceData.map((d) => d.speakerCount), 1),
      maxMentioned: Math.max(...faceData.map((d) => d.mentionedCount), 1),
      maxConcepts: Math.max(...faceData.map((d) => d.conceptCount), 1),
      maxMedianLength: Math.max(...faceData.map((d) => d.medianLength), 1),
    };
  }, [faceData]);

  // Calculate grid layout
  const cols = Math.ceil(Math.sqrt(faceData.length));
  const rows = Math.ceil(faceData.length / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const faceSize = Math.min(cellWidth, cellHeight) * 0.8;

  if (faceData.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        データがありません
      </div>
    );
  }

  // Get hovered person data for tooltip
  const hoveredData = hoveredPerson
    ? faceData.find((d) => d.personId === hoveredPerson)
    : null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-full"
        role="img"
        aria-label="顔型チャート - 人物の統計を顔の特徴で表現"
      >
        {faceData.map((data, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = cellWidth * col + cellWidth / 2;
          const y = cellHeight * row + cellHeight / 2;

          return (
            <ChernoffFace
              key={data.personId}
              data={data}
              x={x}
              y={y}
              size={faceSize}
              {...maxValues}
              isHovered={hoveredPerson === data.personId}
              onHover={setHoveredPerson}
            />
          );
        })}
      </svg>

      {/* Hover info */}
      <div className="mt-2 flex min-h-12 items-center justify-center">
        {hoveredData ? (
          <div className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span className="font-bold">{hoveredData.name}</span>
            <span className="mx-2">|</span>
            <span>発言: {hoveredData.speakerCount}回</span>
            <span className="mx-2">|</span>
            <span>言及された: {hoveredData.mentionedCount}回</span>
            <span className="mx-2">|</span>
            <span>概念: {hoveredData.conceptCount}種</span>
            <span className="mx-2">|</span>
            <span>
              発言長: {Math.round(hoveredData.medianLength)}字（中央値）
            </span>
          </div>
        ) : (
          <span className="text-sm text-zinc-400">
            人物にカーソルを合わせると詳細を表示
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="text-center font-medium">凡例</div>
        <div className="flex flex-wrap justify-center gap-4">
          <span>顔の大きさ: 発言回数</span>
          <span>目の大きさ: 言及された回数</span>
          <span>眉の角度: 言及した概念数</span>
          <span>鼻の幅: 発言の長さ（中央値）</span>
          <span>口の大きさ: 発言回数</span>
        </div>
      </div>
    </div>
  );
}
