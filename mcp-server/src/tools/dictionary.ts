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

function appendToFile(filePath: string, entry: string, marker: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the position to insert (before the closing of the object/map)
  const markerIndex = content.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Could not find insertion point in ${filePath}`);
  }

  // Insert the new entry before the marker
  const newContent =
    content.slice(0, markerIndex) + entry + '\n' + content.slice(markerIndex);

  fs.writeFileSync(filePath, newContent);
}

export function registerDictionaryTools(server: McpServer): void {
  // Add Hanzi entry
  server.registerTool(
    'add_hanzi_entry',
    {
      description: 'Add a new entry to the Hanzi dictionary',
      inputSchema: HanziEntrySchema.shape,
    },
    async ({ character, pinyin, tone, meaning }) => {
      const filePath = path.join(PROJECT_ROOT, 'src/data/hanzi-dictionary.ts');

      // Format the entry
      const entry = `  '${character}': { pinyin: '${pinyin}', tone: ${tone}, meaning: '${meaning}' },`;

      try {
        appendToFile(filePath, entry, '};');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully added Hanzi entry: ${character} -> ${pinyin}${tone} (${meaning})`,
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
      inputSchema: KunyomiEntrySchema.shape,
    },
    async ({ character, ruby }) => {
      const filePath = path.join(
        PROJECT_ROOT,
        'src/data/kunyomi-dictionary.ts',
      );

      // Format the entry
      const entry = `  '${character}': { ruby: '${ruby}' },`;

      try {
        appendToFile(filePath, entry, '};');

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
}
