'use client';

import { useEffect, useMemo, useState } from 'react';
import { books } from '@/generated/books';
import { contents } from '@/generated/contents';
import { persons } from '@/generated/persons';
import { chartTheme } from '@/lib/chart-theme';

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
    const nodeDiameter = nodeRadius * 2;
    const minSpacing = nodeDiameter + 10; // Minimum X distance before jittering (with padding)

    const personNodes: PersonNode[] = [];
    for (let i = 0; i < sortedPersons.length; i++) {
      const p = sortedPersons[i];
      const x = scale(p.birthYear);

      // Find all previous nodes within minSpacing and check for actual overlap
      const nearbyNodes: PersonNode[] = [];
      for (let j = i - 1; j >= 0; j--) {
        const prevNode = personNodes[j];
        if (Math.abs(prevNode.x - x) < minSpacing) {
          nearbyNodes.push(prevNode);
        } else {
          break;
        }
      }

      // Try different Y offsets until we find one that doesn't overlap
      const jitterOffsets = [0, -50, 50, -100, 100, -150, 150];
      let yOffset = 0;
      let foundNonOverlap = false;

      for (const offset of jitterOffsets) {
        const testY = personLaneY + offset;
        const overlaps = nearbyNodes.some((prevNode) => {
          const dx = Math.abs(prevNode.x - x);
          const dy = Math.abs(prevNode.y - testY);
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < nodeDiameter;
        });

        if (!overlaps) {
          yOffset = offset;
          foundNonOverlap = true;
          break;
        }
      }

      // If still overlapping, use the last offset (farthest)
      if (!foundNonOverlap && jitterOffsets.length > 0) {
        yOffset = jitterOffsets[jitterOffsets.length - 1];
      }

      personNodes.push({
        id: p.id,
        name: p.name,
        birthYear: p.birthYear,
        color: chartTheme.getPersonColor(p.id),
        x,
        y: personLaneY + yOffset,
        labelAbove: yOffset <= 0, // Label above if jittered up or at center
      });
    }

    // Create book nodes with jitter to avoid overlap
    const sortedBooks = [...booksWithYear].sort(
      (a, b) => a.compositionYear - b.compositionYear,
    );

    const bookWidth = 40; // Width of book node rectangle
    const bookHeight = 20; // Height of book node rectangle
    const bookMinSpacing = bookWidth + 15; // Minimum X distance before jittering (with padding)

    const bookNodes: BookNode[] = [];
    for (let i = 0; i < sortedBooks.length; i++) {
      const b = sortedBooks[i];
      const x = scale(b.compositionYear);

      // Find all previous nodes within minSpacing and check for actual overlap
      const nearbyNodes: BookNode[] = [];
      for (let j = i - 1; j >= 0; j--) {
        const prevNode = bookNodes[j];
        if (Math.abs(prevNode.x - x) < bookMinSpacing) {
          nearbyNodes.push(prevNode);
        } else {
          break;
        }
      }

      // Try different Y offsets until we find one that doesn't overlap
      const jitterOffsets = [0, 40, -40, 80, -80, 120, -120];
      let yOffset = 0;
      let foundNonOverlap = false;

      for (const offset of jitterOffsets) {
        const testY = bookLaneY + offset;
        const overlaps = nearbyNodes.some((prevNode) => {
          const dx = Math.abs(prevNode.x - x);
          const dy = Math.abs(prevNode.y - testY);
          // Check if rectangles overlap
          return dx < bookWidth && dy < bookHeight;
        });

        if (!overlaps) {
          yOffset = offset;
          foundNonOverlap = true;
          break;
        }
      }

      // If still overlapping, use the last offset (farthest)
      if (!foundNonOverlap && jitterOffsets.length > 0) {
        yOffset = jitterOffsets[jitterOffsets.length - 1];
      }

      bookNodes.push({
        id: b.id,
        name: b.name,
        compositionYear: b.compositionYear,
        color: chartTheme.getBookColor(b.id),
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
    const linkId = `${link.personId}::${link.bookId}`;
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
      const delimiterIndex = hoveredLink.indexOf('::');
      const personId = hoveredLink.slice(0, delimiterIndex);
      const bookId = hoveredLink.slice(delimiterIndex + 2);
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
        // Count related books
        const relatedBooks = links
          .filter((l) => l.personId === person.id)
          .map((l) => {
            const book = bookNodes.find((b) => b.id === l.bookId);
            return book?.name;
          })
          .filter((name): name is string => name !== undefined);
        const bookCount = relatedBooks.length;
        const bookList =
          bookCount > 0
            ? `関連経書: ${relatedBooks.join('、')}（${bookCount}冊）`
            : '';
        return `${person.name}（${formatYear(person.birthYear)}生）${bookList ? ` / ${bookList}` : ''}`;
      }
      const book = bookNodes.find((b) => b.id === hoveredNode);
      if (book) {
        // Count related persons
        const relatedPersons = links
          .filter((l) => l.bookId === book.id)
          .map((l) => {
            const person = personNodes.find((p) => p.id === l.personId);
            return person?.name;
          })
          .filter((name): name is string => name !== undefined);
        const personCount = relatedPersons.length;
        const personList =
          personCount > 0
            ? `関連人物: ${relatedPersons.join('、')}（${personCount}人）`
            : '';
        return `${book.name}（${formatYear(book.compositionYear)}成立）${personList ? ` / ${personList}` : ''}`;
      }
    }
    return null;
  };

  const hoverInfo = getHoverInfo();

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
      {/* Chart */}
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        style={{ minWidth: width }}
        role="img"
        aria-label="経書と人物の時系列図"
      >
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
          経書
        </text>

        {/* Links */}
        <g>
          {links.map((link) => {
            const person = personNodes.find((p) => p.id === link.personId);
            const book = bookNodes.find((b) => b.id === link.bookId);
            if (!person || !book) return null;

            const linkId = `${link.personId}::${link.bookId}`;
            const pathData = generatePath(person, book);

            // Gradient from person to book (use hyphen for CSS ID compatibility)
            const gradientId = `tl-grad-${link.personId}-${link.bookId}`;

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
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG path hover interaction */}
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
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG circle hover interaction */}
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
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG rect hover interaction */}
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
      <div className="flex min-h-6 items-center justify-center p-3">
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
      <div className="border-t border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-700">
        横軸は時間（左が古い）。上段は人物（誕生年）、下段は経書（成立年）。線の太さは発言回数に比例。
      </div>
    </div>
  );
}
