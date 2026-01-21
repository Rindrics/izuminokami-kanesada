import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

/**
 * Punctuation characters that are forbidden in segment text
 */
const FORBIDDEN_PUNCTUATION = [
  '。',
  '、',
  '，',
  '；',
  '：',
  '！',
  '？',
  '「',
  '」',
  '『',
  '』',
  '（',
  '）',
  '【',
  '】',
  '…',
  '・',
  '．',
];

/**
 * Check if text contains forbidden punctuation
 */
function containsForbiddenPunctuation(text: string): string[] {
  const found: string[] = [];
  for (const char of text) {
    if (FORBIDDEN_PUNCTUATION.includes(char)) {
      found.push(char);
    }
  }
  return [...new Set(found)];
}

const SegmentSchema = z
  .object({
    text: z.string(),
    speaker: z.string().nullable(),
  })
  .refine(
    (segment) => containsForbiddenPunctuation(segment.text).length === 0,
    (segment) => ({
      message: `Segment text contains forbidden punctuation: ${containsForbiddenPunctuation(segment.text).join(' ')}. Do not include punctuation marks in segment text.`,
    }),
  );

const ContentYamlSchema = z.object({
  bookId: z.string().describe('Book ID (e.g., "lunyu")'),
  sectionId: z.string().describe('Section ID (e.g., "1")'),
  chapterId: z.string().describe('Chapter ID (e.g., "1")'),
  segments: z
    .array(SegmentSchema)
    .describe(
      'Content segments. IMPORTANT: Do NOT include punctuation (。、；，！？ etc.) in segment text.',
    ),
  mentioned: z.array(z.string()).describe('Mentioned character IDs'),
  japanese: z.string().describe('Japanese reading (書き下し文)'),
});

export function registerContentTools(server: McpServer): void {
  // Write content YAML file
  server.registerTool(
    'write_content_yaml',
    {
      description: 'Write a content YAML file to contents/input/',
      inputSchema: ContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId, segments, mentioned, japanese }) => {
      const dirPath = path.join(
        PROJECT_ROOT,
        'contents/input',
        bookId,
        sectionId,
      );
      const filePath = path.join(dirPath, `${chapterId}.yaml`);

      // Create directory if not exists
      fs.mkdirSync(dirPath, { recursive: true });

      // Build YAML content
      const yamlLines: string[] = ['segments:'];
      for (const segment of segments) {
        yamlLines.push(`  - text: ${segment.text}`);
        yamlLines.push(
          `    speaker: ${segment.speaker === null ? 'null' : segment.speaker}`,
        );
      }
      yamlLines.push(`mentioned: [${mentioned.join(', ')}]`);
      yamlLines.push(`japanese: ${japanese}`);

      const yamlContent = yamlLines.join('\n') + '\n';

      fs.writeFileSync(filePath, yamlContent);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote content to ${filePath}`,
          },
        ],
      };
    },
  );

  // Generate TypeScript from YAML
  server.registerTool(
    'generate_contents',
    {
      description: 'Run the content generation script (YAML -> TypeScript)',
    },
    async () => {
      try {
        const output = execSync('pnpm run generate:contents', {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
        });

        return {
          content: [
            {
              type: 'text',
              text: `Content generation successful:\n${output}`,
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
              text: `Content generation failed:\n${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Validate contents
  server.registerTool(
    'validate_contents',
    {
      description: 'Run the content validation script',
    },
    async () => {
      try {
        const output = execSync('pnpm run validate:contents', {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
        });

        return {
          content: [
            {
              type: 'text',
              text: `Validation successful:\n${output}`,
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
              text: `Validation failed:\n${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
