'use client';

import cloud from 'd3-cloud';
import { useEffect, useMemo, useRef, useState } from 'react';
import { books } from '@/generated/books';
import { contents } from '@/generated/contents';
import { persons } from '@/generated/persons';
import { stats } from '@/generated/stats';
import { chartTheme } from '@/lib/chart-theme';

type FilterType = 'all' | 'book' | 'person';

interface WordCloudProps {
  width?: number;
  height?: number;
}

interface WordData {
  text: string;
  size: number;
  count: number;
}

// Key concepts for special coloring
const KEY_CONCEPTS = new Set([
  '仁',
  '義',
  '礼',
  '禮',
  '智',
  '信',
  '孝',
  '悌',
  '忠',
  '學',
  '道',
  '君',
  '民',
  '利',
]);

/**
 * Calculate character frequencies from text
 */
function calculateCharFrequencies(
  text: string,
  blacklist: Set<string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  // Remove punctuation and spaces
  const cleanText = text.replace(/[，。？、；\s\-;！：「」『』]/g, '');

  for (const char of cleanText) {
    // Only count CJK characters
    if (/[\u4e00-\u9fff]/.test(char) && !blacklist.has(char)) {
      counts.set(char, (counts.get(char) || 0) + 1);
    }
  }

  return counts;
}

/**
 * Get text by filter
 */
function getFilteredText(
  filterType: FilterType,
  filterValue: string,
  blacklist: Set<string>,
): Map<string, number> {
  let text = '';

  if (filterType === 'all') {
    text = contents.map((c) => c.text).join('');
  } else if (filterType === 'book') {
    text = contents
      .filter((c) => c.book_id === filterValue)
      .map((c) => c.text)
      .join('');
  } else if (filterType === 'person') {
    // Get text from segments where this person is the speaker
    for (const content of contents) {
      for (const segment of content.segments) {
        if (segment.speaker === filterValue) {
          text += segment.text.original;
        }
      }
    }
  }

  return calculateCharFrequencies(text, blacklist);
}

export function WordCloud({ width = 600, height = 400 }: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState<string>('');
  const [words, setWords] = useState<
    Array<WordData & { x: number; y: number; rotate: number }>
  >([]);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  // Create blacklist set
  const blacklist = useMemo(() => {
    return new Set(stats.frequencyBlacklist);
  }, []);

  // Calculate word frequencies based on filter
  const wordData = useMemo(() => {
    const frequencies = getFilteredText(filterType, filterValue, blacklist);

    // Convert to array and sort by frequency
    const sorted = Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100); // Top 100 words

    if (sorted.length === 0) return [];

    // Normalize sizes
    const maxCount = sorted[0][1];
    const minSize = 12;
    const maxSize = 60;

    return sorted.map(([text, count]) => ({
      text,
      count,
      size: minSize + (count / maxCount) * (maxSize - minSize),
    }));
  }, [filterType, filterValue, blacklist]);

  // Generate word cloud layout
  useEffect(() => {
    if (wordData.length === 0) {
      setWords([]);
      return;
    }

    const layout = cloud<WordData>()
      .size([width, height])
      .words(wordData)
      .padding(3)
      .rotate(() => 0)
      .font('sans-serif')
      .fontSize((d) => d.size)
      .on('end', (output) => {
        setWords(
          output.map((w) => ({
            text: w.text || '',
            size: w.size || 12,
            count: (w as WordData).count || 0,
            x: w.x || 0,
            y: w.y || 0,
            rotate: w.rotate || 0,
          })),
        );
      });

    layout.start();
  }, [wordData, width, height]);

  // Get color for word
  const getWordColor = (text: string, isHovered: boolean) => {
    if (isHovered) return chartTheme.colors.primary[600];
    if (KEY_CONCEPTS.has(text)) return chartTheme.colors.primary[500];
    return chartTheme.colors.neutral[500];
  };

  // Get available speakers (persons who have spoken)
  const availableSpeakers = useMemo(() => {
    const speakerIds = new Set<string>();
    for (const content of contents) {
      for (const segment of content.segments) {
        if (segment.speaker) {
          speakerIds.add(segment.speaker);
        }
      }
    }
    return persons.filter((p) => speakerIds.has(p.id));
  }, []);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Filter controls */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-type"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            フィルタ:
          </label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as FilterType);
              setFilterValue('');
            }}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="all">全体</option>
            <option value="book">書籍別</option>
            <option value="person">人物別</option>
          </select>
        </div>

        {filterType === 'book' && (
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">書籍を選択...</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.name}
              </option>
            ))}
          </select>
        )}

        {filterType === 'person' && (
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">人物を選択...</option>
            {availableSpeakers.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        )}

        {hoveredWord && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            「{hoveredWord}」:{' '}
            {words.find((w) => w.text === hoveredWord)?.count || 0} 回
          </div>
        )}
      </div>

      {/* Word cloud SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="mx-auto"
        role="img"
        aria-label="ワードクラウド - 漢字の出現頻度を可視化"
      >
        <title>ワードクラウド</title>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {words.map((word) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: SVG text hover interaction
            <text
              key={word.text}
              textAnchor="middle"
              transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
              fontSize={word.size}
              fontWeight={KEY_CONCEPTS.has(word.text) ? 'bold' : 'normal'}
              fill={getWordColor(word.text, hoveredWord === word.text)}
              className="cursor-pointer transition-colors"
              onMouseEnter={() => setHoveredWord(word.text)}
              onMouseLeave={() => setHoveredWord(null)}
            >
              {word.text}
            </text>
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: chartTheme.colors.primary[500] }}
          />
          <span>重要概念</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: chartTheme.colors.neutral[500] }}
          />
          <span>その他</span>
        </div>
      </div>
    </div>
  );
}
