import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

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

/**
 * Derive onyomi from pinyin (simplified mapping)
 */
function deriveOnyomi(pinyin: string): string {
  const mappings: Record<string, string> = {
    zi: 'シ',
    yue: 'エツ',
    xue: 'ガク',
    er: 'ジ',
    shi: 'ジ',
    xi: 'シュウ',
    zhi: 'シ',
    bu: 'フ',
    yi: 'イ',
    hu: 'コ',
    you: 'ユウ',
    peng: 'ホウ',
    yuan: 'エン',
    fang: 'ホウ',
    lai: 'ライ',
    le: 'ラク',
    ren: 'ジン',
    yun: 'ウン',
    jun: 'クン',
    qi: 'キ',
    wei: 'イ',
    ye: 'ヤ',
    xiao: 'コウ',
    di: 'テイ',
    ti: 'テイ',
    hao: 'コウ',
    fan: 'ハン',
    shang: 'ジョウ',
    zhe: 'シャ',
    xian: 'セン',
    zuo: 'サク',
    luan: 'ラン',
    wu: 'ム',
    ben: 'ホン',
    li: 'リツ',
    dao: 'ドウ',
    sheng: 'セイ',
    qian: 'セン',
    guo: 'コク',
    jing: 'ケイ',
    xin: 'シン',
    jie: 'セツ',
    yong: 'ヨウ',
    ai: 'アイ',
    min: 'ミン',
    qiao: 'コウ',
    yan: 'ゲン',
    ling: 'レイ',
    se: 'ショク',
    zeng: 'ソウ',
    san: 'サン',
    xing: 'セイ',
    shen: 'シン',
    mou: 'ボウ',
    zhong: 'チュウ',
    jiao: 'コウ',
    chuan: 'デン',
    ri: 'ニチ',
  };

  return mappings[pinyin.toLowerCase()] ?? 'TODO';
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

      // Convert pinyin to pinyin with tone mark
      const pinyinWithTone = addToneMark(pinyin, tone);
      const onyomi = deriveOnyomi(pinyin);
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
}
