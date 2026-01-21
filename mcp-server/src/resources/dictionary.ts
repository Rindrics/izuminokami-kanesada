import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

function readDictionaryFile(filename: string): string {
  const filePath = path.join(PROJECT_ROOT, 'src/data', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

export function registerDictionaryResources(server: McpServer): void {
  // Hanzi dictionary
  server.resource(
    'dictionary://hanzi',
    'Hanzi Dictionary (pinyin and meanings)',
    async () => {
      const content = readDictionaryFile('hanzi-dictionary.ts');
      return {
        contents: [
          {
            uri: 'dictionary://hanzi',
            mimeType: 'text/typescript',
            text: content,
          },
        ],
      };
    },
  );

  // Kunyomi dictionary
  server.resource(
    'dictionary://kunyomi',
    'Kunyomi Dictionary (Japanese readings)',
    async () => {
      const content = readDictionaryFile('kunyomi-dictionary.ts');
      return {
        contents: [
          {
            uri: 'dictionary://kunyomi',
            mimeType: 'text/typescript',
            text: content,
          },
        ],
      };
    },
  );
}
