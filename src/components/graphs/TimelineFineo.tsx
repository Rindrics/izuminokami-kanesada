'use client';

import { useEffect, useMemo, useState } from 'react';
import { books } from '@/generated/books';
import { contents } from '@/generated/contents';
import { persons } from '@/generated/persons';

interface TimelineFineoProps {
  width?: number;
  height?: number;
}

// Format year for display
function formatYear(year: number): string {
  if (year < 0) {
    return `紀元前${Math.abs(year)}年`;
  }
  return `${year}年`;
}

// Person colors
const PERSON_COLORS: Record<string, string> = {
  kongzi: '#7c3aed',
  zengzi: '#2563eb',
  youzi: '#0891b2',
  zigong: '#059669',
  zixia: '#16a34a',
  ziqin: '#84cc16',
  zilu: '#f59e0b',
  yanyuan: '#ef4444',
  mengzi: '#ec4899',
  'liang-huiwang': '#6b7280',
};

// Book colors
const BOOK_COLORS: Record<string, string> = {
  lunyu: '#ef4444',
  mengzi: '#f59e0b',
  daxue: '#22c55e',
  zhongyong: '#3b82f6',
};

interface PersonNode {
  id: string;
  name: string;
  birthYear: number;
  color: string;
  x: number;
  y: number;
  labelAbove: boolean; // Whether label should be above the node
}

interface BookNode {
  id: string;
  name: string;
  compositionYear: number;
  color: string;
  x: number;
  y: number;
}

interface Link {
  personId: string;
  bookId: string;
  value: number;
}

/**
 * Timeline Fineo - horizontal time axis
 * X-axis: Time (BCE years)
 * Upper lane: Persons (positioned by birth year)
 * Lower lane: Books (positioned by composition year)
 * Connections: Person → Book relationships
 */
export function TimelineFineo({
  width = 900,
  height = 500,
}: TimelineFineoProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get persons who appear in contents (as speakers)
  const activePersonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const content of contents) {
      for (const speaker of content.persons.speakers) {
        ids.add(speaker);
      }
    }
    return ids;
  }, []);

  // Get books with content
  const activeBookIds = useMemo(() => {
    const ids = new Set<string>();
    for (const content of contents) {
      ids.add(content.book_id);
    }
    return ids;
  }, []);

  // Build timeline data
  const timelineData = useMemo(() => {
    const margin = { top: 80, right: 60, bottom: 80, left: 60 };
    const personLaneY = margin.top + 70;
    const bookLaneY = height - margin.bottom - 70;

    // Filter persons with birth year and who appear in contents (type narrowing)
    const personsWithYear = persons.filter(
      (p): p is typeof p & { birthYear: number } =>
        p.birthYear !== undefined && activePersonIds.has(p.id),
    );

    // Filter books with composition year and content (type narrowing)
    const booksWithYear = books.filter(
      (b): b is typeof b & { compositionYear: number } =>
        b.compositionYear !== undefined && activeBookIds.has(b.id),
    );

    if (personsWithYear.length === 0 && booksWithYear.length === 0) {
      return null;
    }

    // Find time range
    const allYears = [
      ...personsWithYear.map((p) => p.birthYear),
      ...booksWithYear.map((b) => b.compositionYear),
    ];
    const minYear = Math.min(...allYears) - 30;
    const maxYear = Math.max(...allYears) + 30;

    // Scale function: year → x position
    const scale = (year: number): number => {
      return (
        margin.left +
        ((year - minYear) / (maxYear - minYear)) *
          (width - margin.left - margin.right)
      );
    };

    // Create person nodes with jitter to avoid overlap
    const sortedPersons = [...personsWithYear].sort(
      (a, b) => a.birthYear - b.birthYear,
    );

    // Calculate jitter for each person based on X proximity
    const nodeRadius = 14;
    const minSpacing = nodeRadius * 2.5; // Minimum X distance before jittering

    const personNodes: PersonNode[] = [];
    for (let i = 0; i < sortedPersons.length; i++) {
      const p = sortedPersons[i];
      const x = scale(p.birthYear);

      // Check how many previous nodes are within minSpacing
      let jitterIndex = 0;
      for (let j = i - 1; j >= 0; j--) {
        const prevNode = personNodes[j];
        if (Math.abs(prevNode.x - x) < minSpacing) {
          jitterIndex++;
        } else {
          break;
        }
      }

      // Alternate Y offset: 0, -35, +35, -70, +70, ...
      const jitterOffsets = [0, -40, 40, -80, 80];
      const yOffset = jitterOffsets[jitterIndex % jitterOffsets.length] || 0;

      personNodes.push({
        id: p.id,
        name: p.name,
        birthYear: p.birthYear,
        color: PERSON_COLORS[p.id] || '#6b7280',
        x,
        y: personLaneY + yOffset,
        labelAbove: yOffset <= 0, // Label above if jittered up or at center
      });
    }

    // Create book nodes with jitter to avoid overlap
    const sortedBooks = [...booksWithYear].sort(
      (a, b) => a.compositionYear - b.compositionYear,
    );

    const bookMinSpacing = 50; // Minimum X distance before jittering

    const bookNodes: BookNode[] = [];
    for (let i = 0; i < sortedBooks.length; i++) {
      const b = sortedBooks[i];
      const x = scale(b.compositionYear);

      // Check how many previous nodes are within minSpacing
      let jitterIndex = 0;
      for (let j = i - 1; j >= 0; j--) {
        const prevNode = bookNodes[j];
        if (Math.abs(prevNode.x - x) < bookMinSpacing) {
          jitterIndex++;
        } else {
          break;
        }
      }

      // Alternate Y offset for books
      const jitterOffsets = [0, 35, -35, 70, -70];
      const yOffset = jitterOffsets[jitterIndex % jitterOffsets.length] || 0;

      bookNodes.push({
        id: b.id,
        name: b.name,
        compositionYear: b.compositionYear,
        color: BOOK_COLORS[b.id] || '#6b7280',
        x,
        y: bookLaneY + yOffset,
      });
    }

    // Build links: Person → Book (based on who speaks in which book)
    const personBookCounts = new Map<string, Map<string, number>>();
    for (const content of contents) {
      const bookId = content.book_id;
      for (const speaker of content.persons.speakers) {
        let bookMap = personBookCounts.get(speaker);
        if (!bookMap) {
          bookMap = new Map();
          personBookCounts.set(speaker, bookMap);
        }
        bookMap.set(bookId, (bookMap.get(bookId) || 0) + 1);
      }
    }

    const links: Link[] = [];
    for (const [personId, bookMap] of personBookCounts) {
      const person = personNodes.find((p) => p.id === personId);
      if (!person) continue;

      for (const [bookId, count] of bookMap) {
        const book = bookNodes.find((b) => b.id === bookId);
        if (!book) continue;

        links.push({
          personId,
          bookId,
          value: count,
        });
      }
    }

    // Generate time axis ticks
    const tickStep = 50; // Every 50 years
    const ticks: number[] = [];
    const startTick = Math.ceil(minYear / tickStep) * tickStep;
    for (let year = startTick; year <= maxYear; year += tickStep) {
      ticks.push(year);
    }

    return {
      personNodes,
      bookNodes,
      links,
      margin,
      personLaneY,
      bookLaneY,
      scale,
      ticks,
      minYear,
      maxYear,
    };
  }, [activePersonIds, activeBookIds, width, height]);

  // Get link opacity
  const getLinkOpacity = (link: Link): number => {
    const linkId = `${link.personId}-${link.bookId}`;
    if (hoveredLink === linkId) return 0.8;
    if (hoveredNode) {
      if (link.personId === hoveredNode || link.bookId === hoveredNode) {
        return 0.7;
      }
      return 0.1;
    }
    return 0.35;
  };

  // Generate curved path between person and book
  const generatePath = (person: PersonNode, book: BookNode): string => {
    const startX = person.x;
    const startY = person.y + 15;
    const endX = book.x;
    const endY = book.y - 15;
    const midY = (startY + endY) / 2;

    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  };

  if (!isMounted) {
    return (
      <div
        className="mx-auto animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
        style={{ width, height }}
      />
    );
  }

  if (!timelineData) {
    return <div className="text-center text-zinc-500">データがありません</div>;
  }

  const {
    personNodes,
    bookNodes,
    links,
    margin,
    personLaneY,
    bookLaneY,
    scale,
    ticks,
  } = timelineData;

  // Get hover info
  const getHoverInfo = (): string | null => {
    if (hoveredLink) {
      const [personId, bookId] = hoveredLink.split('-');
      const person = personNodes.find((p) => p.id === personId);
      const book = bookNodes.find((b) => b.id === bookId);
      const link = links.find(
        (l) => l.personId === personId && l.bookId === bookId,
      );
      if (person && book && link) {
        return `${person.name} → ${book.name}: ${link.value}回発言`;
      }
    }
    if (hoveredNode) {
      const person = personNodes.find((p) => p.id === hoveredNode);
      if (person) {
        return `${person.name}（${formatYear(person.birthYear)}生）`;
      }
      const book = bookNodes.find((b) => b.id === hoveredNode);
      if (book) {
        return `${book.name}（${formatYear(book.compositionYear)}成立）`;
      }
    }
    return null;
  };

  const hoverInfo = getHoverInfo();

  return (
    <div className="flex flex-col gap-4">
      {/* Chart */}
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label="書籍と人物の時系列図"
      >
        <title>書籍と人物の時系列図</title>
        {/* Time axis */}
        <g>
          <line
            x1={margin.left}
            y1={height / 2}
            x2={width - margin.right}
            y2={height / 2}
            stroke="#d4d4d8"
            strokeWidth={1}
          />
          {ticks.map((year) => (
            <g
              key={year}
              transform={`translate(${scale(year)}, ${height / 2})`}
            >
              <line y1={-5} y2={5} stroke="#a1a1aa" strokeWidth={1} />
              <text
                y={20}
                textAnchor="middle"
                fontSize={9}
                fill="#71717a"
                className="dark:fill-zinc-400"
              >
                {year < 0 ? `BC${Math.abs(year)}` : year}
              </text>
            </g>
          ))}
        </g>

        {/* Lane labels */}
        <text
          x={margin.left - 10}
          y={personLaneY}
          textAnchor="end"
          fontSize={11}
          fill="#71717a"
          className="dark:fill-zinc-400"
        >
          人物
        </text>
        <text
          x={margin.left - 10}
          y={bookLaneY}
          textAnchor="end"
          fontSize={11}
          fill="#71717a"
          className="dark:fill-zinc-400"
        >
          書籍
        </text>

        {/* Links */}
        <g>
          {links.map((link) => {
            const person = personNodes.find((p) => p.id === link.personId);
            const book = bookNodes.find((b) => b.id === link.bookId);
            if (!person || !book) return null;

            const linkId = `${link.personId}-${link.bookId}`;
            const pathData = generatePath(person, book);

            // Gradient from person to book
            const gradientId = `tl-grad-${linkId}`;

            return (
              <g key={linkId}>
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={person.color} />
                    <stop offset="100%" stopColor={book.color} />
                  </linearGradient>
                </defs>
                <path
                  d={pathData}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={Math.max(Math.log(link.value + 1) * 2, 1.5)}
                  strokeOpacity={getLinkOpacity(link)}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredLink(linkId)}
                  onMouseLeave={() => setHoveredLink(null)}
                />
              </g>
            );
          })}
        </g>

        {/* Person nodes */}
        <g>
          {personNodes.map((person) => {
            const isHovered = hoveredNode === person.id;
            return (
              <g key={person.id}>
                <circle
                  cx={person.x}
                  cy={person.y}
                  r={isHovered ? 14 : 12}
                  fill={person.color}
                  fillOpacity={isHovered ? 1 : 0.9}
                  stroke={isHovered ? '#000' : '#fff'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredNode(person.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                />
                <text
                  x={person.x}
                  y={person.labelAbove ? person.y - 20 : person.y + 28}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#374151"
                  className="pointer-events-none dark:fill-zinc-300"
                >
                  {person.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Book nodes */}
        <g>
          {bookNodes.map((book) => {
            const isHovered = hoveredNode === book.id;
            return (
              <g key={book.id}>
                <rect
                  x={book.x - 20}
                  y={book.y - 10}
                  width={40}
                  height={20}
                  rx={4}
                  fill={book.color}
                  fillOpacity={isHovered ? 1 : 0.9}
                  stroke={isHovered ? '#000' : '#fff'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredNode(book.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                />
                <text
                  x={book.x}
                  y={book.y + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#fff"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {book.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      <div className="flex min-h-6 items-center justify-center">
        {hoverInfo ? (
          <span className="rounded bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {hoverInfo}
          </span>
        ) : (
          <span className="text-xs text-zinc-400">
            ノードにカーソルを合わせると詳細を表示
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        横軸は時間（左が古い）。上段は人物（誕生年）、下段は書籍（成立年）。線の太さは発言回数に比例。
      </p>
    </div>
  );
}
