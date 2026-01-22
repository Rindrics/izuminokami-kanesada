import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as yaml from 'yaml';
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

      const yamlContent = `${yamlLines.join('\n')}\n`;

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

  // Read content YAML file
  const ReadContentYamlSchema = z.object({
    bookId: z.string().describe('Book ID (e.g., "lunyu")'),
    sectionId: z.string().describe('Section ID (e.g., "1")'),
    chapterId: z.string().describe('Chapter ID (e.g., "1")'),
  });

  server.registerTool(
    'read_content_yaml',
    {
      description: 'Read an existing content YAML file from contents/input/',
      inputSchema: ReadContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const filePath = path.join(
        PROJECT_ROOT,
        'contents/input',
        bookId,
        sectionId,
        `${chapterId}.yaml`,
      );

      if (!fs.existsSync(filePath)) {
        return {
          content: [
            {
              type: 'text',
              text: `File not found: ${filePath}`,
            },
          ],
          isError: true,
        };
      }

      const yamlContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.parse(yamlContent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                path: filePath,
                raw: yamlContent,
                parsed,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // Validate content with tone sandhi suggestions
  server.registerTool(
    'validate_content_with_suggestions',
    {
      description:
        'Validate content and get fix suggestions for tone sandhi patterns (4+4, 3+3)',
      inputSchema: ReadContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const filePath = path.join(
        PROJECT_ROOT,
        'contents/input',
        bookId,
        sectionId,
        `${chapterId}.yaml`,
      );

      if (!fs.existsSync(filePath)) {
        return {
          content: [
            {
              type: 'text',
              text: `File not found: ${filePath}`,
            },
          ],
          isError: true,
        };
      }

      const yamlContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.parse(yamlContent);

      // Load hanzi dictionary for tone lookup
      const hanziDictPath = path.join(
        PROJECT_ROOT,
        'src/data/hanzi-dictionary.ts',
      );
      const hanziDictContent = fs.readFileSync(hanziDictPath, 'utf-8');

      // Extract tone information using regex (simplified approach)
      const toneMap = new Map<string, number>();
      const entryRegex = /id:\s*'([^']+)'[\s\S]*?tone:\s*(\d+)/g;
      const matches = hanziDictContent.matchAll(entryRegex);
      for (const match of matches) {
        toneMap.set(match[1], parseInt(match[2], 10));
      }

      interface ToneSandhiIssue {
        segmentIndex: number;
        position: { start: number; end: number };
        chars: string;
        tones: [number, number];
        pattern: string;
        original: string;
        suggestions: Array<{ fix: string; meaning: string }>;
      }

      const issues: ToneSandhiIssue[] = [];

      // Check each segment for tone sandhi patterns
      for (let segIdx = 0; segIdx < parsed.segments.length; segIdx++) {
        const segment = parsed.segments[segIdx];
        const text = segment.text as string;

        // Find consecutive hanzi without markers
        for (let i = 0; i < text.length - 1; i++) {
          const char1 = text[i];
          const char2 = text[i + 1];

          // Skip if already has marker
          if (
            char2 === '-' ||
            char2 === '|' ||
            char1 === '-' ||
            char1 === '|'
          ) {
            continue;
          }

          // Skip if not CJK characters
          const isCJK = (c: string) => {
            const code = c.charCodeAt(0);
            return (
              (code >= 0x4e00 && code <= 0x9fff) ||
              (code >= 0x3400 && code <= 0x4dbf)
            );
          };

          if (!isCJK(char1) || !isCJK(char2)) {
            continue;
          }

          const tone1 = toneMap.get(char1);
          const tone2 = toneMap.get(char2);

          if (tone1 === undefined || tone2 === undefined) {
            continue;
          }

          // Check for tone sandhi patterns
          let pattern: string | null = null;
          if (tone1 === 4 && tone2 === 4) {
            pattern = '4+4';
          } else if (tone1 === 3 && tone2 === 3) {
            pattern = '3+3';
          }

          if (pattern) {
            const chars = char1 + char2;
            issues.push({
              segmentIndex: segIdx,
              position: { start: i, end: i + 2 },
              chars,
              tones: [tone1, tone2],
              pattern,
              original: text,
              suggestions: [
                {
                  fix: `${text.slice(0, i + 1)}-${text.slice(i + 1)}`,
                  meaning: `接続（声調変化適用: ${tone1}声→2声）`,
                },
                {
                  fix: `${text.slice(0, i + 1)}|${text.slice(i + 1)}`,
                  meaning: '独立（声調変化なし）',
                },
              ],
            });
          }
        }
      }

      if (issues.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  valid: true,
                  message: 'No tone sandhi issues found',
                  path: filePath,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                valid: false,
                message: `Found ${issues.length} tone sandhi issue(s) that need markers`,
                path: filePath,
                issues,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    },
  );
}
