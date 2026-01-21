/**
 * Generate TypeScript content files from YAML input files
 *
 * This script:
 * 1. Reads YAML files from contents/input/{book}/{section}/{chapter}.yaml
 * 2. Derives fields (content_id, book_id, section, chapter, text, start_pos, end_pos, speakers)
 * 3. Generates src/generated/contents/{book}.ts files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { inspect } from 'node:util';
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

// Book metadata (duplicated here to avoid import issues)
const books = [
  {
    id: 'lunyu',
    name: '論語',
    sections: [{ id: '1', name: '学而第一', chapters: ['1', '2'] }],
  },
];

function getSectionName(bookId: string, sectionId: string): string {
  const book = books.find((b) => b.id === bookId);
  const section = book?.sections.find((s) => s.id === sectionId);
  return section?.name ?? '';
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

function generateTypeScriptFile(
  bookId: string,
  contents: OutputContent[],
): string {
  const contentsObjectStr = inspect(contents, { depth: null, compact: false });

  return `import type { Content } from '@/types/content';

/**
 * ${books.find((b) => b.id === bookId)?.name ?? bookId}
 * Auto-generated from contents/input/${bookId}/
 */
export const ${bookId}Contents: Content[] = ${contentsObjectStr};
`;
}

function main(): void {
  const inputDir = path.join(__dirname, '../contents/input');
  const outputDir = path.join(__dirname, '../src/generated/contents');

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('=== Content Generation ===\n');

  // Group contents by book
  const contentsByBook = new Map<string, OutputContent[]>();

  // Walk through input directory
  for (const bookId of fs.readdirSync(inputDir)) {
    const bookDir = path.join(inputDir, bookId);
    if (!fs.statSync(bookDir).isDirectory()) continue;

    for (const sectionId of fs.readdirSync(bookDir)) {
      const sectionDir = path.join(bookDir, sectionId);
      if (!fs.statSync(sectionDir).isDirectory()) continue;

      for (const file of fs.readdirSync(sectionDir)) {
        if (!file.endsWith('.yaml')) continue;

        const chapterId = file.replace('.yaml', '');
        const filePath = path.join(sectionDir, file);

        console.log(`Processing: ${bookId}/${sectionId}/${chapterId}`);

        const input = parseInputFile(filePath);
        const output = deriveContent(input, bookId, sectionId, chapterId);

        if (!contentsByBook.has(bookId)) {
          contentsByBook.set(bookId, []);
        }
        contentsByBook.get(bookId)?.push(output);
      }
    }
  }

  // Generate TypeScript files for each book
  for (const [bookId, contents] of contentsByBook) {
    // Sort by content_id
    contents.sort((a, b) => a.content_id.localeCompare(b.content_id));

    const tsContent = generateTypeScriptFile(bookId, contents);
    const outputPath = path.join(outputDir, `${bookId}.ts`);

    fs.writeFileSync(outputPath, tsContent);
    console.log(`Generated: ${outputPath}`);
  }

  // Generate index.ts
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
`;

  const indexPath = path.join(outputDir, 'index.ts');
  fs.writeFileSync(indexPath, indexContent);
  console.log(`Generated: ${indexPath}`);

  console.log('\n=== Generation Complete ===');
}

main();
