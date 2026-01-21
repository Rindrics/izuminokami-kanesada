/**
 * Generate TypeScript content files from YAML input files
 *
 * This script:
 * 1. Reads books.yaml for book metadata
 * 2. Reads YAML files from contents/input/{book}/{section}/{chapter}.yaml
 * 3. Derives fields (content_id, book_id, section, chapter, text, start_pos, end_pos, speakers)
 * 4. Generates src/generated/books.ts and src/generated/contents/{book}.ts files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { inspect } from 'node:util';
import { watch } from 'chokidar';
import yaml from 'js-yaml';

interface InputSegment {
  text: string;
  speaker: string | null;
}

interface InputContent {
  segments: InputSegment[];
  mentioned: string[];
  japanese: string;
}

interface OutputSegment {
  text: string;
  start_pos: number;
  end_pos: number;
  speaker: string | null;
}

interface OutputContent {
  content_id: string;
  book_id: string;
  section: string;
  chapter: string;
  text: string;
  segments: OutputSegment[];
  characters: {
    speakers: string[];
    mentioned: string[];
  };
  japanese: string;
}

interface InputSection {
  id: string;
  name: string;
  totalChapters: number;
}

interface InputBook {
  id: string;
  name: string;
  totalSections: number;
  sections: InputSection[];
}

interface OutputSection {
  id: string;
  name: string;
  totalChapters: number;
  chapters: string[];
}

interface OutputBook {
  id: string;
  name: string;
  totalSections: number;
  sections: OutputSection[];
}

// Global books data (loaded from YAML)
let booksData: InputBook[] = [];

function validateBooksYaml(books: InputBook[]): void {
  for (const book of books) {
    if (typeof book.totalSections !== 'number' || book.totalSections <= 0) {
      throw new Error(
        `Book "${book.id}" is missing required field "totalSections" (must be a positive number)`,
      );
    }

    for (const section of book.sections) {
      if (
        typeof section.totalChapters !== 'number' ||
        section.totalChapters <= 0
      ) {
        throw new Error(
          `Section "${section.id}" in book "${book.id}" is missing required field "totalChapters" (must be a positive number)`,
        );
      }
    }
  }
}

function loadBooksYaml(): void {
  const booksYamlPath = path.join(process.cwd(), 'contents/books.yaml');
  const content = fs.readFileSync(booksYamlPath, 'utf-8');
  booksData = yaml.load(content) as InputBook[];

  // Validate required fields
  validateBooksYaml(booksData);
}

function getSectionName(bookId: string, sectionId: string): string {
  const book = booksData.find((b) => b.id === bookId);
  const section = book?.sections.find((s) => s.id === sectionId);
  return section?.name ?? '';
}

function getBookName(bookId: string): string {
  const book = booksData.find((b) => b.id === bookId);
  return book?.name ?? bookId;
}

function parseInputFile(filePath: string): InputContent {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content) as InputContent;
}

function deriveContent(
  input: InputContent,
  bookId: string,
  sectionId: string,
  chapterId: string,
): OutputContent {
  const contentId = `${bookId}/${sectionId}/${chapterId}`;
  const sectionName = getSectionName(bookId, sectionId);

  // Build text and segments with positions
  const outputSegments: OutputSegment[] = [];
  let currentPos = 0;

  for (const segment of input.segments) {
    const startPos = currentPos;
    const endPos = currentPos + segment.text.length;

    outputSegments.push({
      text: segment.text,
      start_pos: startPos,
      end_pos: endPos,
      speaker: segment.speaker,
    });

    // Add 1 for space between segments
    currentPos = endPos + 1;
  }

  // Derive text from segments
  const text = input.segments.map((s) => s.text).join(' ');

  // Derive speakers from segments
  const speakers = [
    ...new Set(
      input.segments
        .filter((s) => s.speaker !== null)
        .map((s) => s.speaker as string),
    ),
  ];

  return {
    content_id: contentId,
    book_id: bookId,
    section: sectionName,
    chapter: chapterId,
    text,
    segments: outputSegments,
    characters: {
      speakers,
      mentioned: input.mentioned,
    },
    japanese: input.japanese,
  };
}

function generateContentTypeScriptFile(
  bookId: string,
  contents: OutputContent[],
): string {
  const contentsObjectStr = inspect(contents, { depth: null, compact: false });

  return `import type { Content } from '@/types/content';

/**
 * ${getBookName(bookId)}
 * Auto-generated from contents/input/${bookId}/
 */
export const ${bookId}Contents: Content[] = ${contentsObjectStr};
`;
}

function generateBooksTypeScript(outputBooks: OutputBook[]): string {
  const booksObjectStr = inspect(outputBooks, { depth: null, compact: false });

  return `import type { Book, Section } from '@/types/book';

export type { Book, Section };

/**
 * Book metadata definitions
 * Auto-generated from contents/books.yaml
 */
export const books: Book[] = ${booksObjectStr};

// Book queries
export function getBookById(id: string): Book | undefined {
  return books.find((b) => b.id === id);
}

export function getAllBookIds(): string[] {
  return books.map((b) => b.id);
}

// Section queries
export function getSectionById(
  bookId: string,
  sectionId: string,
): Section | undefined {
  const book = getBookById(bookId);
  return book?.sections.find((s) => s.id === sectionId);
}

export function getAllSectionPaths(): string[] {
  const paths: string[] = [];
  for (const book of books) {
    for (const section of book.sections) {
      paths.push(\`\${book.id}/\${section.id}\`);
    }
  }
  return paths;
}
`;
}

interface CharFrequency {
  char: string;
  count: number;
  percentage: number;
}

interface PersonFrequency {
  person: string;
  speakerCount: number;
  mentionedCount: number;
  totalCount: number;
}

interface ChapterLength {
  contentId: string;
  charCount: number;
  segmentCount: number;
}

interface CharIndex {
  char: string;
  contentIds: string[];
}

interface Stats {
  charFrequencies: CharFrequency[];
  personFrequencies: PersonFrequency[];
  chapterLengths: ChapterLength[];
  charIndex: CharIndex[];
  totalChars: number;
  totalChapters: number;
}

function generateStatsTypeScript(contents: OutputContent[]): string {
  // Count character frequencies (Chinese characters only)
  const charCounts = new Map<string, number>();
  let totalChars = 0;

  for (const content of contents) {
    // Remove punctuation, spaces, hyphens, semicolons
    const cleanText = content.text.replace(/[，。？、；\s\-;]/g, '');
    for (const char of cleanText) {
      // Only count CJK characters
      if (/[\u4e00-\u9fff]/.test(char)) {
        charCounts.set(char, (charCounts.get(char) ?? 0) + 1);
        totalChars++;
      }
    }
  }

  // Sort by frequency and calculate percentage
  const charFrequencies: CharFrequency[] = [...charCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([char, count]) => ({
      char,
      count,
      percentage: Math.round((count / totalChars) * 10000) / 100,
    }));

  // Count person frequencies
  const speakerCounts = new Map<string, number>();
  const mentionedCounts = new Map<string, number>();

  for (const content of contents) {
    for (const speaker of content.characters.speakers) {
      speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + 1);
    }
    for (const mentioned of content.characters.mentioned) {
      mentionedCounts.set(mentioned, (mentionedCounts.get(mentioned) ?? 0) + 1);
    }
  }

  // Combine all persons
  const allPersons = new Set([
    ...speakerCounts.keys(),
    ...mentionedCounts.keys(),
  ]);
  const personFrequencies: PersonFrequency[] = [...allPersons]
    .map((person) => ({
      person,
      speakerCount: speakerCounts.get(person) ?? 0,
      mentionedCount: mentionedCounts.get(person) ?? 0,
      totalCount:
        (speakerCounts.get(person) ?? 0) + (mentionedCounts.get(person) ?? 0),
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  // Calculate chapter lengths
  const chapterLengths: ChapterLength[] = contents.map((content) => ({
    contentId: content.content_id,
    charCount: content.text.replace(/[，。？、；\s\-;]/g, '').length,
    segmentCount: content.segments.length,
  }));

  // Build character index (which chapters contain each character)
  const charToContentIds = new Map<string, Set<string>>();
  for (const content of contents) {
    const cleanText = content.text.replace(/[，。？、；\s\-;]/g, '');
    for (const char of cleanText) {
      if (/[\u4e00-\u9fff]/.test(char)) {
        if (!charToContentIds.has(char)) {
          charToContentIds.set(char, new Set());
        }
        charToContentIds.get(char)?.add(content.content_id);
      }
    }
  }

  // Sort index by frequency (most common characters first)
  const charIndex: CharIndex[] = [...charToContentIds.entries()]
    .map(([char, contentIds]) => ({
      char,
      contentIds: [...contentIds].sort(),
    }))
    .sort((a, b) => b.contentIds.length - a.contentIds.length);

  const stats: Stats = {
    charFrequencies,
    personFrequencies,
    chapterLengths,
    charIndex,
    totalChars,
    totalChapters: contents.length,
  };

  const statsObjectStr = inspect(stats, {
    depth: null,
    compact: false,
    maxArrayLength: null,
  });

  return `/**
 * Statistics data
 * Auto-generated from contents
 */

export interface CharFrequency {
  char: string;
  count: number;
  percentage: number;
}

export interface PersonFrequency {
  person: string;
  speakerCount: number;
  mentionedCount: number;
  totalCount: number;
}

export interface ChapterLength {
  contentId: string;
  charCount: number;
  segmentCount: number;
}

export interface CharIndex {
  char: string;
  contentIds: string[];
}

export interface Stats {
  charFrequencies: CharFrequency[];
  personFrequencies: PersonFrequency[];
  chapterLengths: ChapterLength[];
  charIndex: CharIndex[];
  totalChars: number;
  totalChapters: number;
}

export const stats: Stats = ${statsObjectStr};
`;
}

function main(): void {
  const inputDir = path.join(process.cwd(), 'contents/input');
  const outputDir = path.join(process.cwd(), 'src/generated');
  const contentsOutputDir = path.join(outputDir, 'contents');

  // Ensure output directories exist
  fs.mkdirSync(contentsOutputDir, { recursive: true });

  console.log('=== Content Generation ===\n');

  // Load books metadata from YAML
  loadBooksYaml();

  // Track chapters per book/section for books.ts generation
  const chaptersBySection = new Map<string, string[]>();

  // Group contents by book
  const contentsByBook = new Map<string, OutputContent[]>();

  // Walk through input directory
  for (const bookId of fs.readdirSync(inputDir)) {
    const bookDir = path.join(inputDir, bookId);
    if (!fs.statSync(bookDir).isDirectory()) continue;

    for (const sectionId of fs.readdirSync(bookDir)) {
      const sectionDir = path.join(bookDir, sectionId);
      if (!fs.statSync(sectionDir).isDirectory()) continue;

      const sectionKey = `${bookId}/${sectionId}`;
      const chapters: string[] = [];

      for (const file of fs.readdirSync(sectionDir)) {
        if (!file.endsWith('.yaml')) continue;

        const chapterId = file.replace('.yaml', '');
        chapters.push(chapterId);
        const filePath = path.join(sectionDir, file);

        console.log(`Processing: ${bookId}/${sectionId}/${chapterId}`);

        const input = parseInputFile(filePath);
        const output = deriveContent(input, bookId, sectionId, chapterId);

        if (!contentsByBook.has(bookId)) {
          contentsByBook.set(bookId, []);
        }
        contentsByBook.get(bookId)?.push(output);
      }

      // Sort chapters numerically
      chapters.sort((a, b) => Number(a) - Number(b));
      chaptersBySection.set(sectionKey, chapters);
    }
  }

  // Generate TypeScript files for each book's contents
  for (const [bookId, contents] of contentsByBook) {
    // Sort by section (numeric) then chapter (numeric)
    contents.sort((a, b) => {
      const [, sectionA, chapterA] = a.content_id.split('/');
      const [, sectionB, chapterB] = b.content_id.split('/');

      const sectionDiff = Number(sectionA) - Number(sectionB);
      if (sectionDiff !== 0) return sectionDiff;

      return Number(chapterA) - Number(chapterB);
    });

    const tsContent = generateContentTypeScriptFile(bookId, contents);
    const outputPath = path.join(contentsOutputDir, `${bookId}.ts`);

    fs.writeFileSync(outputPath, tsContent);
    console.log(`Generated: ${outputPath}`);
  }

  // Generate contents/index.ts
  const bookIds = [...contentsByBook.keys()].sort();
  const indexContent = `import type { Content } from '@/types/content';
${bookIds.map((id) => `import { ${id}Contents } from './${id}';`).join('\n')}

// Re-export individual book contents
${bookIds.map((id) => `export { ${id}Contents } from './${id}';`).join('\n')}

/**
 * All contents from all books
 * Auto-generated from contents/input/
 */
export const contents: Content[] = [
${bookIds.map((id) => `  ...${id}Contents,`).join('\n')}
];

// Content queries
export function getContentById(id: string): Content | undefined {
  return contents.find((c) => c.content_id === id);
}

export function getAllContentIds(): string[] {
  return contents.map((c) => c.content_id);
}

/**
 * Get adjacent content IDs (previous and next) for navigation
 * Returns null if there is no previous/next content
 */
export function getAdjacentContentIds(
  currentId: string,
): { prev: string | null; next: string | null } {
  const index = contents.findIndex((c) => c.content_id === currentId);

  if (index === -1) {
    return { prev: null, next: null };
  }

  const prev = index > 0 ? contents[index - 1].content_id : null;
  const next = index < contents.length - 1 ? contents[index + 1].content_id : null;

  return { prev, next };
}
`;

  const indexPath = path.join(contentsOutputDir, 'index.ts');
  fs.writeFileSync(indexPath, indexContent);
  console.log(`Generated: ${indexPath}`);

  // Generate books.ts with chapters derived from input directory
  const outputBooks: OutputBook[] = booksData.map((book) => ({
    id: book.id,
    name: book.name,
    totalSections: book.totalSections,
    sections: book.sections.map((section) => ({
      id: section.id,
      name: section.name,
      totalChapters: section.totalChapters,
      chapters: chaptersBySection.get(`${book.id}/${section.id}`) ?? [],
    })),
  }));

  const booksContent = generateBooksTypeScript(outputBooks);
  const booksOutputPath = path.join(outputDir, 'books.ts');
  fs.writeFileSync(booksOutputPath, booksContent);
  console.log(`Generated: ${booksOutputPath}`);

  // Generate stats.ts with statistics data
  const allContents = [...contentsByBook.values()].flat();
  const statsContent = generateStatsTypeScript(allContents);
  const statsOutputPath = path.join(outputDir, 'stats.ts');
  fs.writeFileSync(statsOutputPath, statsContent);
  console.log(`Generated: ${statsOutputPath}`);

  console.log('\n=== Generation Complete ===');
}

// Check for --watch flag
const isWatchMode = process.argv.includes('--watch');

if (isWatchMode) {
  const watchPath = path.join(process.cwd(), 'contents/input');

  console.log('=== Watch Mode ===');
  console.log(`Watching: ${watchPath}`);
  console.log('Press Ctrl+C to stop.\n');

  // Initial generation
  main();

  // Watch for changes in contents/input directory
  const watcher = watch(watchPath, {
    ignored: /(^|[/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher
    .on('ready', () => {
      console.log('Watching for changes...\n');
    })
    .on('change', (filePath) => {
      console.log(`\n[change] ${filePath}`);
      try {
        main();
      } catch (error) {
        console.error('Generation failed:', error);
      }
    })
    .on('add', (filePath) => {
      console.log(`\n[add] ${filePath}`);
      try {
        main();
      } catch (error) {
        console.error('Generation failed:', error);
      }
    })
    .on('unlink', (filePath) => {
      console.log(`\n[delete] ${filePath}`);
      try {
        main();
      } catch (error) {
        console.error('Generation failed:', error);
      }
    });
} else {
  main();
}
