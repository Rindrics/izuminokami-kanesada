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

/**
 * Schema for hanzi reading override within a segment
 * Used to specify non-default readings for polyphonic characters
 */
const HanziOverrideSchema = z.object({
  char: z.string().describe('The character to override (e.g., "說")'),
  position: z
    .number()
    .describe(
      'Position within the segment text (0-indexed, including markers)',
    ),
  meaning_id: z
    .string()
    .describe(
      'The meaning ID from hanzi-dictionary (e.g., "說-yuè" for "喜ぶ")',
    ),
});

const SegmentSchema = z
  .object({
    text: z.string(),
    speaker: z.string().nullable(),
    hanzi_overrides: z
      .array(HanziOverrideSchema)
      .optional()
      .describe(
        'Override readings for polyphonic characters (e.g., 說 can be yuè/shuō/shuì)',
      ),
  })
  .refine(
    (segment) => containsForbiddenPunctuation(segment.text).length === 0,
    (segment) => ({
      message: `Segment text contains forbidden punctuation: ${containsForbiddenPunctuation(segment.text).join(' ')}. Do not include punctuation marks in segment text.`,
    }),
  );

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

const ContentYamlSchema = z.object({
  bookId: SafePathSegmentSchema.describe('Book ID (e.g., "lunyu")'),
  sectionId: SafePathSegmentSchema.describe('Section ID (e.g., "1")'),
  chapterId: SafePathSegmentSchema.describe('Chapter ID (e.g., "1")'),
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
      const baseDir = path.join(PROJECT_ROOT, 'contents/input');
      const dirPath = path.join(baseDir, bookId, sectionId);
      const filePath = path.join(dirPath, `${chapterId}.yaml`);

      // Defense in depth: verify path is within allowed directory
      if (!isPathWithinBase(filePath, baseDir)) {
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

      // Create directory if not exists
      fs.mkdirSync(dirPath, { recursive: true });

      // Detect narration patterns and validate speaker assignments (ADR-0021)
      // Narration verbs that indicate third-person narration
      const NARRATION_VERBS = ['問', '曰', '答', '對', '謂', '告', '言', '云'];

      interface NarrationWarning {
        segmentIndex: number;
        text: string;
        currentSpeaker: string | null;
        suggestedSpeaker: null;
        reason: string;
      }

      const narrationWarnings: NarrationWarning[] = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const text = segment.text;

        // Skip if speaker is already null (narrator)
        if (segment.speaker === null) {
          continue;
        }

        // Check if segment matches narration pattern: "CharacterName + NarrationVerb + ..."
        // Pattern: 1-3 characters (potential character name) followed by a narration verb
        for (
          let nameLen = 1;
          nameLen <= 3 && nameLen < text.length;
          nameLen++
        ) {
          const potentialName = text.slice(0, nameLen);
          const nextChar = text[nameLen];

          if (NARRATION_VERBS.includes(nextChar)) {
            // This looks like narration: "CharacterName + Verb"
            // If speaker is set to a character ID, it should be null (narrator)
            // We check if the speaker matches the potential name or is in mentioned list
            const isSpeakerMatchingName =
              segment.speaker === potentialName ||
              (mentioned.includes(segment.speaker) &&
                mentioned.includes(potentialName));

            if (isSpeakerMatchingName || segment.speaker !== null) {
              narrationWarnings.push({
                segmentIndex: i,
                text,
                currentSpeaker: segment.speaker,
                suggestedSpeaker: null,
                reason: `This appears to be narration ("${potentialName}${nextChar}"), not direct speech. Speaker should be null (narrator) per ADR-0021.`,
              });
              // Auto-fix: set speaker to null
              segment.speaker = null;
              break; // Found a match, no need to check other lengths
            }
          }
        }
      }

      // Build YAML content
      const yamlLines: string[] = ['segments:'];
      for (const segment of segments) {
        yamlLines.push(`  - text: ${segment.text}`);
        yamlLines.push(
          `    speaker: ${segment.speaker === null ? 'null' : segment.speaker}`,
        );
        // Add hanzi_overrides if present
        if (segment.hanzi_overrides && segment.hanzi_overrides.length > 0) {
          yamlLines.push('    hanzi_overrides:');
          for (const override of segment.hanzi_overrides) {
            yamlLines.push(`      - char: ${override.char}`);
            yamlLines.push(`        position: ${override.position}`);
            yamlLines.push(`        meaning_id: ${override.meaning_id}`);
          }
        }
      }
      yamlLines.push(`mentioned: [${mentioned.join(', ')}]`);
      yamlLines.push(`japanese: ${japanese}`);

      // Will be set after polyphonic character analysis
      // Placeholder - actual value determined below
      const pinyinReviewedLineIndex = yamlLines.length;
      yamlLines.push('pinyin_reviewed: false'); // Default, will be updated

      // Analyze pinyin for polyphonic characters
      const hanziDictPath = path.join(
        PROJECT_ROOT,
        'src/data/hanzi-dictionary.ts',
      );
      const hanziDictContent = fs.readFileSync(hanziDictPath, 'utf-8');

      // Build a map of characters to their meanings
      interface MeaningInfo {
        id: string;
        pinyin: string;
        tone: number;
        meaning_ja: string;
        is_default: boolean;
      }

      const charMeanings = new Map<string, MeaningInfo[]>();
      const entryRegex =
        /\{\s*id:\s*'([^']+)',\s*meanings:\s*\[([\s\S]*?)\],\s*is_common/g;
      const meaningRegex =
        /\{\s*id:\s*'([^']+)',[\s\S]*?pinyin:\s*'([^']+)',\s*tone:\s*(\d+),\s*meaning_ja:\s*'([^']+)',\s*is_default:\s*(true|false)/g;

      for (const entryMatch of hanziDictContent.matchAll(entryRegex)) {
        const charId = entryMatch[1];
        const meaningsStr = entryMatch[2];
        const meanings: MeaningInfo[] = [];

        for (const meaningMatch of meaningsStr.matchAll(meaningRegex)) {
          meanings.push({
            id: meaningMatch[1],
            pinyin: meaningMatch[2],
            tone: parseInt(meaningMatch[3], 10),
            meaning_ja: meaningMatch[4],
            is_default: meaningMatch[5] === 'true',
          });
        }

        if (meanings.length > 0) {
          charMeanings.set(charId, meanings);
        }
      }

      // Analyze each segment for polyphonic characters
      interface PinyinAnalysis {
        segmentIndex: number;
        position: number;
        char: string;
        defaultPinyin: string;
        defaultMeaning: string;
        isPolyphonic: boolean;
        alternatives?: Array<{
          meaning_id: string;
          pinyin: string;
          meaning_ja: string;
        }>;
      }

      const pinyinAnalysis: PinyinAnalysis[] = [];

      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segment = segments[segIdx];
        const text = segment.text;

        for (let pos = 0; pos < text.length; pos++) {
          const char = text[pos];

          // Skip non-CJK characters
          const code = char.charCodeAt(0);
          const isCJK =
            (code >= 0x4e00 && code <= 0x9fff) ||
            (code >= 0x3400 && code <= 0x4dbf);
          if (!isCJK) continue;

          const meanings = charMeanings.get(char);
          if (!meanings || meanings.length === 0) continue;

          const defaultMeaning = meanings.find((m) => m.is_default);
          if (!defaultMeaning) continue;

          const analysis: PinyinAnalysis = {
            segmentIndex: segIdx,
            position: pos,
            char,
            defaultPinyin: defaultMeaning.pinyin,
            defaultMeaning: defaultMeaning.meaning_ja,
            isPolyphonic: meanings.length > 1,
          };

          // Include alternatives for polyphonic characters
          if (meanings.length > 1) {
            analysis.alternatives = meanings
              .filter((m) => !m.is_default)
              .map((m) => ({
                meaning_id: m.id,
                pinyin: m.pinyin,
                meaning_ja: m.meaning_ja,
              }));
          }

          pinyinAnalysis.push(analysis);
        }
      }

      // Filter to only show polyphonic characters for review
      const polyphonicChars = pinyinAnalysis.filter((a) => a.isPolyphonic);

      // Set pinyin_reviewed based on whether there are polyphonic characters
      const pinyinReviewed = polyphonicChars.length === 0;
      yamlLines[pinyinReviewedLineIndex] = `pinyin_reviewed: ${pinyinReviewed}`;

      // Write the YAML file with the correct pinyin_reviewed value
      const yamlContent = `${yamlLines.join('\n')}\n`;
      fs.writeFileSync(filePath, yamlContent);

      // Build response text with warnings
      let responseText = `Successfully wrote content to ${filePath}\n`;

      // Add narration warnings if any
      if (narrationWarnings.length > 0) {
        responseText += `\n⚠️ Narration pattern detected and auto-corrected (ADR-0021):\n`;
        for (const warning of narrationWarnings) {
          responseText += `- Segment ${warning.segmentIndex}: "${warning.text}"
    Changed speaker from "${warning.currentSpeaker}" to null (narrator)
    Reason: ${warning.reason}\n`;
        }
        responseText += `\n`;
      }

      // Add pinyin review status
      if (polyphonicChars.length > 0) {
        responseText += `⚠️ pinyin_reviewed: false (多音字の確認が必要)

=== Pinyin Analysis (Review Required) ===
The following polyphonic characters were found. Please verify the default reading is correct for the context:

${polyphonicChars
  .map(
    (a) =>
      `- Segment ${a.segmentIndex}, position ${a.position}: "${a.char}"
    Default: ${a.defaultPinyin} (${a.defaultMeaning})
    Alternatives: ${a.alternatives?.map((alt) => `${alt.pinyin} (${alt.meaning_ja}) → use meaning_id: "${alt.meaning_id}"`).join(', ')}`,
  )
  .join('\n\n')}

After reviewing, call write_content_yaml again with hanzi_overrides if needed.
Then call set_pinyin_reviewed to mark the content as reviewed before generating audio.`;
      } else {
        responseText += `\n✓ pinyin_reviewed: true (多音字なし、音声生成可能)`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
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
    bookId: SafePathSegmentSchema.describe('Book ID (e.g., "lunyu")'),
    sectionId: SafePathSegmentSchema.describe('Section ID (e.g., "1")'),
    chapterId: SafePathSegmentSchema.describe('Chapter ID (e.g., "1")'),
  });

  server.registerTool(
    'read_content_yaml',
    {
      description: 'Read an existing content YAML file from contents/input/',
      inputSchema: ReadContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const baseDir = path.join(PROJECT_ROOT, 'contents/input');
      const filePath = path.join(
        baseDir,
        bookId,
        sectionId,
        `${chapterId}.yaml`,
      );

      // Defense in depth: verify path is within allowed directory
      if (!isPathWithinBase(filePath, baseDir)) {
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

  // Get polyphonic character information
  const GetPolyphonicInfoSchema = z.object({
    char: z
      .string()
      .optional()
      .describe(
        'Specific character to look up. If omitted, returns all polyphonic characters.',
      ),
  });

  server.registerTool(
    'get_polyphonic_info',
    {
      description:
        'Get information about polyphonic characters (多音字) from hanzi-dictionary. ' +
        'Use this to determine which meaning_id to use for hanzi_overrides.',
      inputSchema: GetPolyphonicInfoSchema.shape,
    },
    async ({ char }) => {
      // Load hanzi dictionary
      const hanziDictPath = path.join(
        PROJECT_ROOT,
        'src/data/hanzi-dictionary.ts',
      );
      const hanziDictContent = fs.readFileSync(hanziDictPath, 'utf-8');

      // Parse the dictionary to find entries with multiple meanings
      interface Meaning {
        id: string;
        pinyin: string;
        tone: number;
        meaning_ja: string;
        is_default: boolean;
      }

      interface PolyphonicEntry {
        char: string;
        meanings: Meaning[];
      }

      const polyphonics: PolyphonicEntry[] = [];

      // Use regex to extract entries (simplified parsing)
      const entryRegex =
        /\{\s*id:\s*'([^']+)',\s*meanings:\s*\[([\s\S]*?)\],\s*is_common/g;
      const meaningRegex =
        /\{\s*id:\s*'([^']+)',[\s\S]*?pinyin:\s*'([^']+)',\s*tone:\s*(\d+),\s*meaning_ja:\s*'([^']+)',\s*is_default:\s*(true|false)/g;

      for (const entryMatch of hanziDictContent.matchAll(entryRegex)) {
        const charId = entryMatch[1];
        const meaningsStr = entryMatch[2];

        // Only include if looking for specific char or if it has multiple meanings
        const meanings: Meaning[] = [];
        for (const meaningMatch of meaningsStr.matchAll(meaningRegex)) {
          meanings.push({
            id: meaningMatch[1],
            pinyin: meaningMatch[2],
            tone: parseInt(meaningMatch[3], 10),
            meaning_ja: meaningMatch[4],
            is_default: meaningMatch[5] === 'true',
          });
        }

        // Filter: only polyphonic (2+ meanings) or matching specific char
        if (char) {
          if (charId === char && meanings.length > 0) {
            polyphonics.push({ char: charId, meanings });
          }
        } else if (meanings.length >= 2) {
          polyphonics.push({ char: charId, meanings });
        }
      }

      if (polyphonics.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: char
                ? `Character "${char}" not found or has only one meaning.`
                : 'No polyphonic characters found.',
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
                count: polyphonics.length,
                polyphonics,
                usage:
                  'Use meaning_id in hanzi_overrides to specify which reading to use for TTS.',
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // Set pinyin_reviewed flag
  server.registerTool(
    'set_pinyin_reviewed',
    {
      description:
        'Mark content as pinyin-reviewed after verifying polyphonic character readings. ' +
        'Call this after reviewing and setting hanzi_overrides if needed.',
      inputSchema: ReadContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const yamlPath = path.join(
        PROJECT_ROOT,
        'contents/input',
        bookId,
        sectionId,
        `${chapterId}.yaml`,
      );

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

      const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
      const parsed = yaml.parse(yamlContent);

      if (parsed.pinyin_reviewed === true) {
        return {
          content: [
            {
              type: 'text',
              text: `Content is already marked as pinyin_reviewed: true`,
            },
          ],
        };
      }

      // Update the flag
      parsed.pinyin_reviewed = true;

      // Write back (preserving structure)
      const updatedYaml = yaml.stringify(parsed, { lineWidth: 0 });
      fs.writeFileSync(yamlPath, updatedYaml);

      return {
        content: [
          {
            type: 'text',
            text: `✓ Set pinyin_reviewed: true for ${bookId}/${sectionId}/${chapterId}\n\nYou can now call generate_audio.`,
          },
        ],
      };
    },
  );

  // Generate audio for content
  server.registerTool(
    'generate_audio',
    {
      description:
        'Generate audio files (Chinese and Japanese) for a content using Google Cloud TTS. ' +
        'Requires pinyin_reviewed: true in the YAML file and GOOGLE_APPLICATION_CREDENTIALS environment variable.',
      inputSchema: ReadContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const yamlPath = path.join(
        PROJECT_ROOT,
        'contents/input',
        bookId,
        sectionId,
        `${chapterId}.yaml`,
      );

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

      // Check pinyin_reviewed flag
      const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
      const parsed = yaml.parse(yamlContent);

      if (parsed.pinyin_reviewed !== true) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Cannot generate audio: pinyin_reviewed is not true.

Please follow this workflow:
1. Review polyphonic characters using get_polyphonic_info
2. Update hanzi_overrides if needed using write_content_yaml
3. Call set_pinyin_reviewed to mark as reviewed
4. Then call generate_audio again`,
            },
          ],
          isError: true,
        };
      }

      try {
        const output = execSync(
          `pnpm generate:audio ${bookId} ${sectionId} ${chapterId}`,
          {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            timeout: 120000, // 2 minutes timeout for TTS API calls
          },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Audio generation successful:\n${output}`,
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
              text: `Audio generation failed:\n${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
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
      const baseDir = path.join(PROJECT_ROOT, 'contents/input');
      const filePath = path.join(
        baseDir,
        bookId,
        sectionId,
        `${chapterId}.yaml`,
      );

      // Defense in depth: verify path is within allowed directory
      if (!isPathWithinBase(filePath, baseDir)) {
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

  // Upload audio to Cloud Storage
  server.registerTool(
    'upload_audio',
    {
      description:
        'Upload generated audio files to Cloud Storage. ' +
        'If local files are missing, automatically regenerates them first. ' +
        'Requires GCS_BUCKET and GOOGLE_APPLICATION_CREDENTIALS environment variables.',
      inputSchema: ReadContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const contentId = `${bookId}/${sectionId}/${chapterId}`;
      const manifestPath = path.join(PROJECT_ROOT, 'audio-manifest.json');
      const audioDir = path.join(PROJECT_ROOT, 'audio');

      // Check manifest exists
      if (!fs.existsSync(manifestPath)) {
        return {
          content: [
            {
              type: 'text',
              text: `Audio manifest not found: ${manifestPath}\nRun generate_audio first.`,
            },
          ],
          isError: true,
        };
      }

      // Read manifest
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const entry = manifest[contentId];

      if (!entry) {
        return {
          content: [
            {
              type: 'text',
              text: `Content "${contentId}" not found in manifest.\nRun generate_audio first.`,
            },
          ],
          isError: true,
        };
      }

      // Check if local files exist, regenerate if missing
      const zhPath = path.join(
        audioDir,
        bookId,
        sectionId,
        `${chapterId}-zh.mp3`,
      );
      const jaPath = path.join(
        audioDir,
        bookId,
        sectionId,
        `${chapterId}-ja.mp3`,
      );

      const zhMissing = !fs.existsSync(zhPath);
      const jaMissing = !fs.existsSync(jaPath);

      if (zhMissing || jaMissing) {
        const missingFiles = [];
        if (zhMissing) missingFiles.push('zh');
        if (jaMissing) missingFiles.push('ja');

        // Regenerate audio files
        try {
          execSync(`pnpm generate:audio ${bookId} ${sectionId} ${chapterId}`, {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            timeout: 120000,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: 'text',
                text: `Missing local files (${missingFiles.join(', ')}). Attempted regeneration but failed:\n${errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        // Re-read manifest after regeneration
        const updatedManifest = JSON.parse(
          fs.readFileSync(manifestPath, 'utf-8'),
        );
        manifest[contentId] = updatedManifest[contentId];
      }

      // Run upload script
      try {
        const output = execSync(
          `pnpm upload:audio ${bookId} ${sectionId} ${chapterId}`,
          {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            timeout: 120000,
          },
        );

        return {
          content: [
            {
              type: 'text',
              text: `Upload successful:\n${output}`,
            },
          ],
        };
      } catch (error: unknown) {
        // Extract detailed error information from execSync
        let errorDetails = '';
        if (error && typeof error === 'object') {
          const execError = error as {
            stdout?: string;
            stderr?: string;
            message?: string;
          };
          if (execError.stdout) {
            errorDetails += `stdout:\n${execError.stdout}\n`;
          }
          if (execError.stderr) {
            errorDetails += `stderr:\n${execError.stderr}\n`;
          }
        }
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Upload failed:\n${errorMessage}\n${errorDetails}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
