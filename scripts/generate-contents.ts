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
  persons: {
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

interface Person {
  id: string;
  name: string;
  family?: string;
  courtesy?: string;
  given?: string;
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

function loadPersonsYaml(): Person[] {
  const personsYamlPath = path.join(process.cwd(), 'contents/persons.yaml');
  if (!fs.existsSync(personsYamlPath)) {
    return [];
  }
  const content = fs.readFileSync(personsYamlPath, 'utf-8');
  return (yaml.load(content) as Person[]) ?? [];
}

function generatePersonsTypeScript(persons: Person[]): string {
  const personsStr = inspect(persons, {
    depth: null,
    compact: false,
    maxArrayLength: null,
  });

  return `/**
 * Person master data
 * Auto-generated from contents/persons.yaml
 */

export interface Person {
  id: string;
  name: string;
  family?: string;
  courtesy?: string;
  given?: string;
}

export const persons: Person[] = ${personsStr};

const personMap = new Map<string, Person>(
  persons.map((p) => [p.id, p]),
);

export function getPersonById(id: string): Person | undefined {
  return personMap.get(id);
}

export function getPersonName(id: string): string {
  return personMap.get(id)?.name ?? id;
}
`;
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
    persons: {
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

// Graph data structures for speaker relationship visualization
interface GraphNode {
  id: string;
  type: 'person' | 'concept';
  label: string;
}

interface GraphEdge {
  source: string; // node id
  target: string; // node id
  topic: string; // topic/concept (e.g., "仁", "禮")
  weight: number; // number of mentions (for edge thickness)
  contentIds: string[]; // content IDs where this edge appears
}

interface SpeakerGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Stats {
  charFrequencies: CharFrequency[];
  personFrequencies: PersonFrequency[];
  chapterLengths: ChapterLength[];
  charIndex: CharIndex[];
  frequencyBlacklist: string[];
  totalChars: number;
  totalChapters: number;
  dialogueGraph: SpeakerGraph; // Person -> Person dialogue graph
  mentionGraph: SpeakerGraph; // Person -> Concept mention graph
}

function loadFrequencyBlacklist(): string[] {
  const blacklistPath = path.join(
    process.cwd(),
    'contents/input/frequency-blacklist.yaml',
  );
  if (!fs.existsSync(blacklistPath)) {
    return [];
  }
  const content = fs.readFileSync(blacklistPath, 'utf-8');
  const data = yaml.load(content) as string[];
  return data ?? [];
}

function loadCompoundWords(): string[] {
  const compoundWordsPath = path.join(
    process.cwd(),
    'contents/input/compound-words.yaml',
  );
  if (!fs.existsSync(compoundWordsPath)) {
    return [];
  }
  const content = fs.readFileSync(compoundWordsPath, 'utf-8');
  const data = yaml.load(content) as string[];
  return data ?? [];
}

// Key concepts to track (same as in src/app/stats/page.tsx)
const KEY_CONCEPTS = [
  '仁',
  '義',
  '礼',
  '禮', // variant
  '智',
  '信',
  '孝',
  '悌',
  '忠',
  '學',
  '道',
  '君',
  '民',
];

// Parse "X 問 Y" pattern to extract questioner and topic
// Returns { questioner: string | null, topic: string | null } or null if no match
function parseQuestionPattern(text: string): {
  questioner: string | null;
  topic: string | null;
} | null {
  // Pattern: "X問Y" or "X問於Y曰" or "X問Y曰"
  // Examples: "顏淵問仁", "子禽問於子貢曰"
  if (!text.includes('問')) {
    return null;
  }

  // Try to match "X問Y" pattern (simple case)
  const simpleMatch = text.match(/^(.+?)問(.+?)$/);
  if (simpleMatch) {
    const questionerText = simpleMatch[1];
    const rest = simpleMatch[2];

    // Check if rest contains a key concept
    let topic: string | null = null;
    for (const concept of KEY_CONCEPTS) {
      if (rest.includes(concept)) {
        topic = concept;
        break;
      }
    }

    return {
      questioner: questionerText || null,
      topic,
    };
  }

  // Try to match "X問於Y曰" pattern
  const complexMatch = text.match(/^(.+?)問(?:於(.+?))?曰/);
  if (complexMatch) {
    const questionerText = complexMatch[1];
    // For "X問於Y曰", the topic might be in the following segment
    // So we return null for topic here and let the caller handle it
    return {
      questioner: questionerText || null,
      topic: null,
    };
  }

  // Try to find key concept in the text
  let topic: string | null = null;
  for (const concept of KEY_CONCEPTS) {
    if (text.includes(concept)) {
      topic = concept;
      break;
    }
  }

  if (topic) {
    // Extract questioner from text (text before "問")
    const questionerMatch = text.match(/^(.+?)問/);
    return {
      questioner: questionerMatch ? questionerMatch[1] : null,
      topic,
    };
  }

  return null;
}

// Extract concepts from text
function extractConcepts(text: string): string[] {
  const concepts: string[] = [];
  for (const concept of KEY_CONCEPTS) {
    if (text.includes(concept)) {
      concepts.push(concept);
    }
  }
  return concepts;
}

// Generate speaker graphs (dialogue and mention graphs)
function generateSpeakerGraphs(contents: OutputContent[]): {
  dialogueGraph: SpeakerGraph;
  mentionGraph: SpeakerGraph;
} {
  // Dialogue graph: Person -> Person (with topic)
  const dialogueEdges = new Map<string, GraphEdge>(); // key: "source-target-topic"
  const dialogueNodes = new Map<string, GraphNode>(); // key: person ID

  // Mention graph: Person -> Concept
  const mentionEdges = new Map<string, GraphEdge>(); // key: "source-target"
  const mentionNodes = new Map<string, GraphNode>(); // key: person ID or concept char

  // Load persons for name mapping
  const persons = loadPersonsYaml();
  const personNameToId = new Map<string, string>();
  for (const person of persons) {
    personNameToId.set(person.name, person.id);
    // Also map common aliases
    if (person.name.includes('子')) {
      personNameToId.set(person.name.replace('子', ''), person.id);
    }
  }

  for (const content of contents) {
    // First, extract dialogue relationships from actual speakers (ADR-0021)
    // Process consecutive segments with different speakers as dialogue
    let prevSpeaker: string | null = null;
    let prevSegmentIndex = -1;

    for (let i = 0; i < content.segments.length; i++) {
      const segment = content.segments[i];

      // Process actual speaker segments (not narration)
      if (segment.speaker !== null) {
        // Extract concepts from this speaker's segment
        const concepts = extractConcepts(segment.text);

        // Add person node to dialogue graph if they mention concepts
        // (even if they don't have a dialogue partner)
        if (concepts.length > 0 && !dialogueNodes.has(segment.speaker)) {
          const person = persons.find((p) => p.id === segment.speaker);
          dialogueNodes.set(segment.speaker, {
            id: segment.speaker,
            type: 'person',
            label: person?.name ?? segment.speaker,
          });
        }

        // Add concept nodes to dialogue graph
        for (const concept of concepts) {
          if (!dialogueNodes.has(concept)) {
            dialogueNodes.set(concept, {
              id: concept,
              type: 'concept',
              label: concept,
            });
          }
        }

        for (const concept of concepts) {
          const edgeKey = `${segment.speaker}-${concept}`;
          const existingEdge = mentionEdges.get(edgeKey);
          if (existingEdge) {
            existingEdge.weight += 1;
            if (!existingEdge.contentIds.includes(content.content_id)) {
              existingEdge.contentIds.push(content.content_id);
            }
          } else {
            mentionEdges.set(edgeKey, {
              source: segment.speaker,
              target: concept,
              topic: concept,
              weight: 1,
              contentIds: [content.content_id],
            });
          }

          // Add person node
          if (!mentionNodes.has(segment.speaker)) {
            const person = persons.find((p) => p.id === segment.speaker);
            mentionNodes.set(segment.speaker, {
              id: segment.speaker,
              type: 'person',
              label: person?.name ?? segment.speaker,
            });
          }

          // Add concept node
          if (!mentionNodes.has(concept)) {
            mentionNodes.set(concept, {
              id: concept,
              type: 'concept',
              label: concept,
            });
          }
        }

        // If we have a previous speaker, create dialogue edge between persons
        if (prevSpeaker && prevSpeaker !== segment.speaker) {
          // Extract topic from current or previous segment
          const currentConcepts = extractConcepts(segment.text);
          const prevConcepts =
            prevSegmentIndex >= 0
              ? extractConcepts(content.segments[prevSegmentIndex].text)
              : [];
          // Only create edge if we found a concept, skip generic dialogue edges
          const topic = currentConcepts[0] || prevConcepts[0];
          if (!topic) {
            // Skip if no concept found - we only want concept-based dialogues
            prevSpeaker = segment.speaker;
            prevSegmentIndex = i;
            continue;
          }

          const edgeKey = `${prevSpeaker}-${segment.speaker}-${topic}`;
          const existingEdge = dialogueEdges.get(edgeKey);
          if (existingEdge) {
            existingEdge.weight += 1;
            if (!existingEdge.contentIds.includes(content.content_id)) {
              existingEdge.contentIds.push(content.content_id);
            }
          } else {
            dialogueEdges.set(edgeKey, {
              source: prevSpeaker,
              target: segment.speaker,
              topic,
              weight: 1,
              contentIds: [content.content_id],
            });
          }

          // Add nodes
          if (!dialogueNodes.has(prevSpeaker)) {
            const person = persons.find((p) => p.id === prevSpeaker);
            dialogueNodes.set(prevSpeaker, {
              id: prevSpeaker,
              type: 'person',
              label: person?.name ?? prevSpeaker,
            });
          }
          if (!dialogueNodes.has(segment.speaker)) {
            const person = persons.find((p) => p.id === segment.speaker);
            dialogueNodes.set(segment.speaker, {
              id: segment.speaker,
              type: 'person',
              label: person?.name ?? segment.speaker,
            });
          }
        }

        // Check if this is a standalone speech (no dialogue partner)
        // If next segment doesn't have a different speaker, create person->concept edges
        const nextSegment =
          i + 1 < content.segments.length ? content.segments[i + 1] : null;
        const hasNextSpeaker =
          nextSegment &&
          nextSegment.speaker !== null &&
          nextSegment.speaker !== segment.speaker;

        // If no next speaker or same speaker, create person->concept edges for standalone speech
        if (!hasNextSpeaker && concepts.length > 0) {
          for (const concept of concepts) {
            const edgeKey = `${segment.speaker}-${concept}-standalone`;
            const existingEdge = dialogueEdges.get(edgeKey);
            if (existingEdge) {
              existingEdge.weight += 1;
              if (!existingEdge.contentIds.includes(content.content_id)) {
                existingEdge.contentIds.push(content.content_id);
              }
            } else {
              dialogueEdges.set(edgeKey, {
                source: segment.speaker,
                target: concept,
                topic: '', // Empty topic for person->concept edges
                weight: 1,
                contentIds: [content.content_id],
              });
            }
          }
        }

        prevSpeaker = segment.speaker;
        prevSegmentIndex = i;
      }
    }

    // Second, extract dialogue relationships from narration segments (ADR-0021)
    // Only consider narration if mentioned field contains the person
    for (let i = 0; i < content.segments.length; i++) {
      const segment = content.segments[i];

      if (segment.speaker === null) {
        const questionMatch = parseQuestionPattern(segment.text);
        if (questionMatch && questionMatch.topic && questionMatch.questioner) {
          // Find questioner by matching name from persons.yaml
          let questionerId: string | null = null;
          for (const person of persons) {
            if (
              questionMatch.questioner.includes(person.name) ||
              person.name.includes(questionMatch.questioner)
            ) {
              // Only include if this person is in mentioned list (ADR-0021)
              if (content.persons.mentioned.includes(person.id)) {
                questionerId = person.id;
                break;
              }
            }
          }

          // Find the next segment with a speaker (skip narration segments)
          let addresseeId: string | null = null;
          for (let j = i + 1; j < content.segments.length; j++) {
            const nextSegment = content.segments[j];
            if (nextSegment.speaker !== null) {
              addresseeId = nextSegment.speaker;
              break;
            }
          }

          // Create dialogue edge only if questioner is in mentioned list and we have addressee
          if (questionerId && addresseeId) {
            const edgeKey = `${questionerId}-${addresseeId}-${questionMatch.topic}`;
            const existingEdge = dialogueEdges.get(edgeKey);
            if (existingEdge) {
              existingEdge.weight += 1;
              if (!existingEdge.contentIds.includes(content.content_id)) {
                existingEdge.contentIds.push(content.content_id);
              }
            } else {
              dialogueEdges.set(edgeKey, {
                source: questionerId,
                target: addresseeId,
                topic: questionMatch.topic,
                weight: 1,
                contentIds: [content.content_id],
              });
            }

            // Add nodes
            if (!dialogueNodes.has(questionerId)) {
              const person = persons.find((p) => p.id === questionerId);
              dialogueNodes.set(questionerId, {
                id: questionerId,
                type: 'person',
                label: person?.name ?? questionerId,
              });
            }
            if (!dialogueNodes.has(addresseeId)) {
              const person = persons.find((p) => p.id === addresseeId);
              dialogueNodes.set(addresseeId, {
                id: addresseeId,
                type: 'person',
                label: person?.name ?? addresseeId,
              });
            }
          }
        }
      }
    }
  }

  return {
    dialogueGraph: {
      nodes: Array.from(dialogueNodes.values()),
      edges: Array.from(dialogueEdges.values()),
    },
    mentionGraph: {
      nodes: Array.from(mentionNodes.values()),
      edges: Array.from(mentionEdges.values()),
    },
  };
}

function generateStatsTypeScript(contents: OutputContent[]): string {
  // Load compound words and sort by length (longest first) to prioritize longer matches
  const compoundWords = loadCompoundWords().sort((a, b) => b.length - a.length);

  // Count character and compound word frequencies
  const charCounts = new Map<string, number>();
  let totalChars = 0;

  for (const content of contents) {
    // Remove punctuation, spaces, hyphens, semicolons
    const cleanText = content.text.replace(/[，。？、；\s\-;]/g, '');
    // Track which positions are already counted as part of compound words
    const usedPositions = new Set<number>();

    // First, count compound words
    for (const compound of compoundWords) {
      let searchIndex = 0;
      while (true) {
        const index = cleanText.indexOf(compound, searchIndex);
        if (index === -1) break;

        // Check if all positions in this compound are unused
        let allUnused = true;
        for (let i = 0; i < compound.length; i++) {
          if (usedPositions.has(index + i)) {
            allUnused = false;
            break;
          }
        }

        if (allUnused) {
          // Count this compound word
          charCounts.set(compound, (charCounts.get(compound) ?? 0) + 1);
          totalChars += compound.length;
          // Mark positions as used
          for (let i = 0; i < compound.length; i++) {
            usedPositions.add(index + i);
          }
        }

        searchIndex = index + 1;
      }
    }

    // Then, count individual characters (only unused positions)
    for (let i = 0; i < cleanText.length; i++) {
      if (usedPositions.has(i)) continue;

      const char = cleanText[i];
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
    for (const speaker of content.persons.speakers) {
      speakerCounts.set(speaker, (speakerCounts.get(speaker) ?? 0) + 1);
    }
    for (const mentioned of content.persons.mentioned) {
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

  // Build character index (which chapters contain each character/compound)
  const charToContentIds = new Map<string, Set<string>>();
  for (const content of contents) {
    const cleanText = content.text.replace(/[，。？、；\s\-;]/g, '');
    const usedPositions = new Set<number>();

    // First, index compound words
    for (const compound of compoundWords) {
      let searchIndex = 0;
      while (true) {
        const index = cleanText.indexOf(compound, searchIndex);
        if (index === -1) break;

        // Check if all positions in this compound are unused
        let allUnused = true;
        for (let i = 0; i < compound.length; i++) {
          if (usedPositions.has(index + i)) {
            allUnused = false;
            break;
          }
        }

        if (allUnused) {
          if (!charToContentIds.has(compound)) {
            charToContentIds.set(compound, new Set());
          }
          charToContentIds.get(compound)?.add(content.content_id);
          // Mark positions as used
          for (let i = 0; i < compound.length; i++) {
            usedPositions.add(index + i);
          }
        }

        searchIndex = index + 1;
      }
    }

    // Then, index individual characters (only unused positions)
    for (let i = 0; i < cleanText.length; i++) {
      if (usedPositions.has(i)) continue;

      const char = cleanText[i];
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

  const frequencyBlacklist = loadFrequencyBlacklist();

  // Generate graph data for speaker relationships
  const { dialogueGraph, mentionGraph } = generateSpeakerGraphs(contents);

  const stats: Stats = {
    charFrequencies,
    personFrequencies,
    chapterLengths,
    charIndex,
    frequencyBlacklist,
    totalChars,
    totalChapters: contents.length,
    dialogueGraph,
    mentionGraph,
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

export interface GraphNode {
  id: string;
  type: 'person' | 'concept';
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  topic: string;
  weight: number;
  contentIds: string[];
}

export interface SpeakerGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Stats {
  charFrequencies: CharFrequency[];
  personFrequencies: PersonFrequency[];
  chapterLengths: ChapterLength[];
  charIndex: CharIndex[];
  frequencyBlacklist: string[];
  totalChars: number;
  totalChapters: number;
  dialogueGraph: SpeakerGraph;
  mentionGraph: SpeakerGraph;
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

  // Generate persons.ts
  const persons = loadPersonsYaml();
  const personsContent = generatePersonsTypeScript(persons);
  const personsOutputPath = path.join(outputDir, 'persons.ts');
  fs.writeFileSync(personsOutputPath, personsContent);
  console.log(`Generated: ${personsOutputPath}`);

  console.log('\n=== Generation Complete ===');
}

// Check for --watch flag
const isWatchMode = process.argv.includes('--watch');

if (isWatchMode) {
  const watchPaths = [
    path.join(process.cwd(), 'contents/input'),
    path.join(process.cwd(), 'contents/books.yaml'),
    path.join(process.cwd(), 'contents/persons.yaml'),
  ];

  console.log('=== Watch Mode ===');
  console.log('Watching:');
  for (const p of watchPaths) {
    console.log(`  - ${p}`);
  }
  console.log('Press Ctrl+C to stop.\n');

  // Initial generation
  main();

  // Watch for changes
  const watcher = watch(watchPaths, {
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
