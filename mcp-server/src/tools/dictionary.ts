import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as yaml from 'yaml';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

/**
 * Safe path segment pattern: alphanumeric, hyphen, underscore only
 * Prevents path traversal attacks (e.g., "../", "/", etc.)
 */
const SAFE_PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate that a path segment is safe (no path traversal)
 */
function isSafePathSegment(segment: string): boolean {
  return SAFE_PATH_SEGMENT_PATTERN.test(segment) && !segment.includes('..');
}

/**
 * Validate that the resolved path is within the allowed base directory
 */
function isPathWithinBase(filePath: string, baseDir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedPath.startsWith(resolvedBase + path.sep);
}

/**
 * Zod schema for safe path segment (prevents path traversal)
 */
const SafePathSegmentSchema = z.string().refine(isSafePathSegment, {
  message:
    'Invalid path segment: must contain only alphanumeric characters, hyphens, or underscores',
});

/**
 * Check if a character is a CJK character
 */
function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)
  );
}

const HanziEntrySchema = z.object({
  character: z.string().describe('Chinese character (e.g., "學")'),
  pinyin: z.string().describe('Pinyin without tone number (e.g., "xue")'),
  tone: z
    .number()
    .min(1)
    .max(5)
    .describe('Tone number (1-4, or 5 for neutral)'),
  meaning: z.string().describe('Japanese meaning (e.g., "学ぶ")'),
});

const KunyomiEntrySchema = z.object({
  character: z
    .string()
    .describe('Kanji character or compound (e.g., "學" or "有子")'),
  ruby: z
    .string()
    .describe('Ruby reading in hiragana (e.g., "まな" or "ゆうし")'),
});

const UpdateOnyomiSchema = z.object({
  character: z.string().describe('Chinese character (e.g., "天")'),
  pinyin: z.string().describe('Pinyin with tone mark (e.g., "tiān")'),
  onyomi: z.string().describe('Onyomi reading in katakana (e.g., "テン")'),
});

/**
 * Append an entry to an array in a TypeScript file
 * Looks for the closing `];` of the array and inserts before it
 */
function appendToArray(filePath: string, entry: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the last `];` which closes the main array
  const closingBracketIndex = content.lastIndexOf('];');
  if (closingBracketIndex === -1) {
    throw new Error(`Could not find array closing bracket in ${filePath}`);
  }

  // Insert the new entry before the closing bracket
  const newContent =
    content.slice(0, closingBracketIndex) +
    entry +
    '\n' +
    content.slice(closingBracketIndex);

  fs.writeFileSync(filePath, newContent);
}

/**
 * Convert pinyin base + tone number to pinyin with tone mark
 */
function addToneMark(pinyin: string, tone: number): string {
  const toneMarks: Record<string, string[]> = {
    a: ['ā', 'á', 'ǎ', 'à', 'a'],
    e: ['ē', 'é', 'ě', 'è', 'e'],
    i: ['ī', 'í', 'ǐ', 'ì', 'i'],
    o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
    u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
    ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  };

  // Find the vowel to add tone mark (simplified: first vowel found)
  // Priority: a/e > ou > last vowel
  const vowelPriority = ['a', 'e', 'ou', 'i', 'o', 'u', 'ü'];
  const lowerPinyin = pinyin.toLowerCase();

  for (const v of vowelPriority) {
    if (v === 'ou' && lowerPinyin.includes('ou')) {
      const idx = lowerPinyin.indexOf('o');
      return (
        pinyin.slice(0, idx) + toneMarks.o[tone - 1] + pinyin.slice(idx + 1)
      );
    }
    if (lowerPinyin.includes(v) && v !== 'ou') {
      const idx = lowerPinyin.indexOf(v);
      return (
        pinyin.slice(0, idx) + toneMarks[v][tone - 1] + pinyin.slice(idx + 1)
      );
    }
  }

  return pinyin;
}

export function registerDictionaryTools(server: McpServer): void {
  // Add Hanzi entry
  server.registerTool(
    'add_hanzi_entry',
    {
      description: 'Add a new entry to the Hanzi dictionary',
      inputSchema: HanziEntrySchema,
    },
    async ({ character, pinyin, tone, meaning }) => {
      const filePath = path.join(PROJECT_ROOT, 'src/data/hanzi-dictionary.ts');

      // Check for duplicate entry before adding
      try {
        const hanziDictPath = path.join(
          PROJECT_ROOT,
          'src/data/hanzi-dictionary.ts',
        );
        const hanziDictModule = await import(pathToFileURL(hanziDictPath).href);
        const { hanziDictionary } = hanziDictModule;

        // Check if an entry with the same id already exists
        // Type assertion: hanziDictionary is exported as HanziEntry[]
        const existingEntry = (
          hanziDictionary as Array<{ id: string; meanings: unknown[] }>
        ).find((e) => e.id === character);
        if (existingEntry) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Duplicate entry: Character "${character}" already exists in hanzi-dictionary.\n\nExisting entry has ${existingEntry.meanings.length} meaning(s).\nIf you want to add a new meaning, please update the existing entry manually or use a different approach.`,
              },
            ],
            isError: true,
          };
        }
      } catch (importError) {
        // If import fails, log warning but continue (might be first entry or build issue)
        console.warn(
          'Could not check for duplicates (dictionary import failed):',
          importError instanceof Error
            ? importError.message
            : String(importError),
        );
      }

      // Convert pinyin to pinyin with tone mark
      const pinyinWithTone = addToneMark(pinyin, tone);
      // Set onyomi to 'TODO' - must be updated manually using update_hanzi_onyomi tool
      const onyomi = 'TODO';
      const entryId = `${character}-${pinyinWithTone}`;

      // Format the entry as HanziEntry
      const entry = `  {
    id: '${character}',
    meanings: [
      {
        id: '${entryId}',
        onyomi: '${onyomi}',
        pinyin: '${pinyinWithTone}',
        tone: ${tone},
        meaning_ja: '${meaning}',
        is_default: true,
      },
    ],
    is_common: true,
  },`;

      try {
        appendToArray(filePath, entry);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully added Hanzi entry: ${character} -> ${pinyinWithTone} (${meaning})`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to add Hanzi entry: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Add Kunyomi entry
  server.registerTool(
    'add_kunyomi_entry',
    {
      description: 'Add a new entry to the Kunyomi dictionary',
      inputSchema: KunyomiEntrySchema,
    },
    async ({ character, ruby }) => {
      const filePath = path.join(
        PROJECT_ROOT,
        'src/data/kunyomi-dictionary.ts',
      );

      const entryId = `${character}-${ruby}`;

      // Format the entry as KunyomiEntry
      const entry = `  {
    id: '${character}',
    text: '${character}',
    readings: [{ id: '${entryId}', ruby: '${ruby}', is_default: true }],
  },`;

      try {
        appendToArray(filePath, entry);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully added Kunyomi entry: ${character} -> ${ruby}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to add Kunyomi entry: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Update onyomi for existing hanzi entry
  server.registerTool(
    'update_hanzi_onyomi',
    {
      description:
        'Update the onyomi reading for an existing hanzi dictionary entry. ' +
        'Use this when onyomi is set to "TODO" and needs to be registered.',
      inputSchema: UpdateOnyomiSchema,
    },
    async ({ character, pinyin, onyomi }) => {
      const filePath = path.join(PROJECT_ROOT, 'src/data/hanzi-dictionary.ts');

      try {
        let content = fs.readFileSync(filePath, 'utf-8');

        // Find the entry for this character and pinyin
        // Pattern: id: 'character-pinyin', onyomi: 'TODO', pinyin: 'pinyin', ...
        // Use negative lookahead to ensure we don't match across multiple meaning objects
        const meaningId = `${character}-${pinyin}`;
        const pattern = new RegExp(
          `(id:\\s*'${meaningId.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          )}',(?:(?!onyomi:)[^}])*onyomi:\\s*')TODO'`,
          's',
        );

        if (!pattern.test(content)) {
          return {
            content: [
              {
                type: 'text',
                text: `Entry not found for character "${character}" with pinyin "${pinyin}" and onyomi "TODO". Please check the dictionary file.`,
              },
            ],
            isError: true,
          };
        }

        // Replace 'TODO' with the actual onyomi
        content = content.replace(pattern, `$1${onyomi}'`);

        fs.writeFileSync(filePath, content);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated onyomi for ${character} (${pinyin}): TODO -> ${onyomi}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to update onyomi: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Check missing readings for content
  const CheckMissingReadingsSchema = z.object({
    bookId: SafePathSegmentSchema.describe('Book ID (e.g., "lunyu")'),
    sectionId: SafePathSegmentSchema.describe('Section ID (e.g., "1")'),
    chapterId: SafePathSegmentSchema.describe('Chapter ID (e.g., "1")'),
  });

  server.registerTool(
    'check_missing_readings',
    {
      description:
        'Check for missing onyomi and kunyomi readings in a content. ' +
        'Scans all characters in the content and reports which characters lack ' +
        'onyomi registration (TODO in hanzi-dictionary) or kunyomi registration (not in kunyomi-dictionary).',
      inputSchema: CheckMissingReadingsSchema,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const baseDir = path.join(PROJECT_ROOT, 'contents/input');
      const yamlPath = path.join(
        baseDir,
        bookId,
        sectionId,
        `${chapterId}.yaml`,
      );

      // Defense in depth: verify path is within allowed directory
      if (!isPathWithinBase(yamlPath, baseDir)) {
        return {
          content: [
            {
              type: 'text',
              text: 'Invalid path: access denied',
            },
          ],
          isError: true,
        };
      }

      if (!fs.existsSync(yamlPath)) {
        return {
          content: [
            {
              type: 'text',
              text: `Content file not found: ${yamlPath}`,
            },
          ],
          isError: true,
        };
      }

      // Read and parse YAML
      const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
      const parsed = yaml.parse(yamlContent);

      // Collect all unique CJK characters from the content
      const characters = new Set<string>();
      for (const segment of parsed.segments || []) {
        const text = segment.text?.original || '';
        for (const char of text) {
          if (isCJK(char)) {
            characters.add(char);
          }
        }
      }

      if (characters.size === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No CJK characters found in content ${bookId}/${sectionId}/${chapterId}`,
            },
          ],
        };
      }

      // Load hanzi dictionary
      const hanziDictPath = path.join(
        PROJECT_ROOT,
        'src/data/hanzi-dictionary.ts',
      );
      const hanziDictModule = await import(pathToFileURL(hanziDictPath).href);
      const { hanziDictionary } = hanziDictModule;

      // Build a map of characters to their meanings
      type MeaningInfo = {
        id: string;
        pinyin: string;
        tone: number;
        meaning_ja: string;
        onyomi: string;
        is_default: boolean;
      };

      const charMeanings = new Map<
        string,
        { id: string; meanings: MeaningInfo[] }
      >();
      for (const entry of hanziDictionary) {
        charMeanings.set(entry.id, entry);
      }

      // Load kunyomi dictionary
      const kunyomiDictPath = path.join(
        PROJECT_ROOT,
        'src/data/kunyomi-dictionary.ts',
      );
      const kunyomiDictModule = await import(
        pathToFileURL(kunyomiDictPath).href
      );
      const { kunyomiDictionary } = kunyomiDictModule;

      // Build a set of characters with kunyomi
      const kunyomiChars = new Set<string>();
      for (const entry of kunyomiDictionary) {
        kunyomiChars.add(entry.id);
      }

      // Check each character
      interface MissingOnyomi {
        char: string;
        pinyin: string;
        meaning_ja: string;
      }

      interface MissingKunyomi {
        char: string;
      }

      interface NotInHanziDict {
        char: string;
      }

      const missingOnyomi: MissingOnyomi[] = [];
      const missingKunyomi: MissingKunyomi[] = [];
      const notInHanziDict: NotInHanziDict[] = [];

      for (const char of characters) {
        const entry = charMeanings.get(char);

        if (!entry) {
          // Character not in hanzi dictionary at all
          notInHanziDict.push({ char });
          continue;
        }

        // Check for missing onyomi (TODO)
        for (const meaning of entry.meanings) {
          if (meaning.onyomi === 'TODO') {
            missingOnyomi.push({
              char,
              pinyin: meaning.pinyin,
              meaning_ja: meaning.meaning_ja,
            });
          }
        }

        // Check for missing kunyomi
        if (!kunyomiChars.has(char)) {
          missingKunyomi.push({ char });
        }
      }

      // Build response
      const contentId = `${bookId}/${sectionId}/${chapterId}`;
      let responseText = `=== Reading Check for ${contentId} ===\n`;
      responseText += `Total unique CJK characters: ${characters.size}\n\n`;

      let hasIssues = false;

      if (notInHanziDict.length > 0) {
        hasIssues = true;
        responseText += `❌ Not in hanzi-dictionary (${notInHanziDict.length}):\n`;
        for (const item of notInHanziDict) {
          responseText += `  - "${item.char}"\n`;
          responseText += `    Action: Use add_hanzi_entry to register this character\n`;
        }
        responseText += '\n';
      }

      if (missingOnyomi.length > 0) {
        hasIssues = true;
        responseText += `❌ Missing onyomi - TODO (${missingOnyomi.length}):\n`;
        for (const item of missingOnyomi) {
          responseText += `  - "${item.char}" (${item.pinyin}: ${item.meaning_ja})\n`;
          responseText += `    Action: Use update_hanzi_onyomi with character="${item.char}", pinyin="${item.pinyin}", onyomi="適切な音読み"\n`;
        }
        responseText += '\n';
      }

      if (missingKunyomi.length > 0) {
        hasIssues = true;
        responseText += `⚠️ Missing kunyomi (${missingKunyomi.length}):\n`;
        for (const item of missingKunyomi) {
          responseText += `  - "${item.char}"\n`;
          responseText += `    Action: Use add_kunyomi_entry with character="${item.char}", ruby="適切な読み"\n`;
        }
        responseText += '\n';
      }

      if (!hasIssues) {
        responseText += `✓ All characters have complete readings registered.\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
        isError:
          hasIssues && (notInHanziDict.length > 0 || missingOnyomi.length > 0),
      };
    },
  );
}
