import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as yaml from 'yaml';
import { z } from 'zod';
import {
  isPathWithinBase,
  SafePathSegmentSchema,
} from '../utils/path-safety.js';

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

const SegmentTextSchema = z.object({
  original: z.string().describe('Chinese text (白文)'),
  japanese: z.string().describe('Japanese reading (書き下し文)'),
});

const SegmentSchema = z
  .object({
    text: SegmentTextSchema,
    speaker: z.string().nullable(),
    hanzi_overrides: z
      .array(HanziOverrideSchema)
      .optional()
      .describe(
        'Override readings for polyphonic characters (e.g., 說 can be yuè/shuō/shuì)',
      ),
  })
  .refine(
    (segment) =>
      containsForbiddenPunctuation(segment.text.original).length === 0,
    (segment) => ({
      message: `Segment text contains forbidden punctuation: ${containsForbiddenPunctuation(segment.text.original).join(' ')}. Do not include punctuation marks in segment text.`,
    }),
  );

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
});

export function registerContentTools(server: McpServer): void {
  // Write content YAML file
  server.registerTool(
    'write_content_yaml',
    {
      description: 'Write a content YAML file to contents/input/',
      inputSchema: ContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId, segments, mentioned }) => {
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
        const text = segment.text.original;

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

            if (isSpeakerMatchingName) {
              // Auto-fix: speaker matches the name in narration, set to null
              narrationWarnings.push({
                segmentIndex: i,
                text,
                currentSpeaker: segment.speaker,
                suggestedSpeaker: null,
                reason: `This appears to be narration ("${potentialName}${nextChar}"), not direct speech. Speaker should be null (narrator) per ADR-0021.`,
              });
              segment.speaker = null;
              break; // Found a match, no need to check other lengths
            } else if (segment.speaker !== null) {
              // Warning only: narration pattern detected but speaker doesn't match
              // Don't auto-fix since we're not certain
              narrationWarnings.push({
                segmentIndex: i,
                text,
                currentSpeaker: segment.speaker,
                suggestedSpeaker: null,
                reason: `Narration pattern detected ("${potentialName}${nextChar}"), but speaker "${segment.speaker}" doesn't match "${potentialName}". Please review per ADR-0021.`,
              });
              // Don't modify segment.speaker - let user decide
            }
          }
        }
      }

      // Build YAML content
      const yamlLines: string[] = ['segments:'];
      for (const segment of segments) {
        yamlLines.push('  - text:');
        yamlLines.push(`      original: ${segment.text.original}`);
        yamlLines.push(`      japanese: ${segment.text.japanese}`);
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

      // Will be set after polyphonic character analysis
      // Placeholder - actual value determined below
      const pinyinReviewedLineIndex = yamlLines.length;
      yamlLines.push('pinyin_reviewed: false'); // Default, will be updated

      // Analyze pinyin for polyphonic characters
      // Dynamically import the dictionary to get the latest data without regex parsing
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

      const charMeanings = new Map<string, MeaningInfo[]>();
      for (const entry of hanziDictionary) {
        charMeanings.set(entry.id, entry.meanings);
      }

      // Analyze each segment for polyphonic characters and missing onyomi
      interface PinyinAnalysis {
        segmentIndex: number;
        position: number;
        char: string;
        defaultPinyin: string;
        defaultMeaning: string;
        defaultOnyomi: string;
        isPolyphonic: boolean;
        alternatives?: Array<{
          meaning_id: string;
          pinyin: string;
          meaning_ja: string;
        }>;
      }

      const pinyinAnalysis: PinyinAnalysis[] = [];
      const missingOnyomiChars: Array<{
        segmentIndex: number;
        position: number;
        char: string;
        pinyin: string;
        meaning_ja: string;
      }> = [];

      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segment = segments[segIdx];
        const text = segment.text.original;

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
            defaultOnyomi: defaultMeaning.onyomi,
            isPolyphonic: meanings.length > 1,
          };

          // Check if onyomi is missing (TODO)
          if (defaultMeaning.onyomi === 'TODO') {
            missingOnyomiChars.push({
              segmentIndex: segIdx,
              position: pos,
              char,
              pinyin: defaultMeaning.pinyin,
              meaning_ja: defaultMeaning.meaning_ja,
            });
          }

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

      // Always set pinyin_reviewed to false - human review is required
      yamlLines[pinyinReviewedLineIndex] = `pinyin_reviewed: false`;

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
        responseText += `\n⚠️ pinyin_reviewed: false (人間によるレビューが必要)

多音字は検出されませんでしたが、ピンインの確認が必要です。
確認後、set_pinyin_reviewed を呼び出してから generate_audio を実行してください。`;
      }

      // Check for missing onyomi (TODO) - this is a blocking error
      let hasMissingOnyomi = false;
      if (missingOnyomiChars.length > 0) {
        hasMissingOnyomi = true;
        responseText += `\n\n❌ Missing Onyomi (音読み未登録) - BLOCKING ERROR

=== Onyomi Registration Required ===
The following characters have onyomi set to "TODO" in hanzi-dictionary.
You must register onyomi readings before proceeding:

${missingOnyomiChars
  .map(
    (a) =>
      `- Segment ${a.segmentIndex}, position ${a.position}: "${a.char}"
    Pinyin: ${a.pinyin}
    Meaning: ${a.meaning_ja}
    Action: Use update_hanzi_onyomi tool with character="${a.char}", pinyin="${a.pinyin}", onyomi="適切な音読み"`,
  )
  .join('\n\n')}

Note: Onyomi is required for Japanese audio generation (onyomi reading).
This content cannot be published until all onyomi readings are registered.`;
      }

      // Step 3: Generate contents and validate
      responseText += `\n\n=== Validating Content ===\n`;
      let hasValidationErrors = hasMissingOnyomi;
      try {
        // Regenerate contents from YAML files
        execSync('pnpm generate:contents', {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        // Run validate:contents script to check all changed contents
        // This uses the same validation logic as the pre-push hook
        try {
          const validateOutput = execSync('pnpm run validate:contents', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            stdio: 'pipe',
          });

          // Check if the output contains the target content ID
          const contentId = `${bookId}/${sectionId}/${chapterId}`;
          if (validateOutput.includes(`PASS: ${contentId}`)) {
            responseText += `✓ Validation PASSED for ${contentId}\n`;
            // Extract warnings if any
            const lines = validateOutput.split('\n');
            const contentLines: string[] = [];
            let inContentSection = false;
            for (const line of lines) {
              if (line.includes(`PASS: ${contentId}`)) {
                inContentSection = true;
                contentLines.push(line);
              } else if (inContentSection && line.trim().startsWith('WARN:')) {
                contentLines.push(line);
              } else if (inContentSection && line.trim() !== '') {
                inContentSection = false;
              }
            }
            if (contentLines.length > 1) {
              responseText += `\nWarnings:\n`;
              for (const line of contentLines.slice(1)) {
                responseText += `  ${line.trim()}\n`;
              }
            }
          } else if (validateOutput.includes(`FAIL: ${contentId}`)) {
            hasValidationErrors = true;
            responseText += `❌ Validation FAILED for ${contentId}\n\n`;
            // Extract errors for this content
            const lines = validateOutput.split('\n');
            const errorLines: string[] = [];
            let inContentSection = false;
            for (const line of lines) {
              if (line.includes(`FAIL: ${contentId}`)) {
                inContentSection = true;
                errorLines.push(line);
              } else if (inContentSection && line.trim().startsWith('- [')) {
                errorLines.push(line);
              } else if (inContentSection && line.trim().startsWith('WARN:')) {
                errorLines.push(line);
              } else if (
                inContentSection &&
                line.trim() !== '' &&
                !line.trim().startsWith('-')
              ) {
                inContentSection = false;
              }
            }
            for (const line of errorLines) {
              responseText += `  ${line.trim()}\n`;
            }
          } else {
            // Content not in validation output (might not be changed or not found)
            responseText += `⚠️ Content "${contentId}" not found in validation output.\n`;
            responseText += `Validation output:\n${validateOutput}\n`;
          }
        } catch (validateError) {
          // validate:contents failed (exit code 1)
          hasValidationErrors = true;
          let errorOutput = '';
          let stderrOutput = '';

          if (validateError && typeof validateError === 'object') {
            const execError = validateError as {
              stdout?: string;
              stderr?: string;
              message?: string;
            };
            if (execError.stdout) {
              errorOutput = execError.stdout;
            }
            if (execError.stderr) {
              stderrOutput = execError.stderr;
            }
            if (!errorOutput && execError.message) {
              errorOutput = execError.message;
            }
          } else if (validateError instanceof Error) {
            errorOutput = validateError.message;
          } else {
            errorOutput = String(validateError);
          }

          responseText += `❌ Validation FAILED\n\n`;
          if (errorOutput) {
            responseText += `Output:\n${errorOutput}\n`;
          }
          if (stderrOutput) {
            responseText += `Error:\n${stderrOutput}\n`;
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        responseText += `⚠️ Failed to generate contents: ${errorMessage}\n`;
        hasValidationErrors = true;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
        isError: hasValidationErrors,
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

  // Generate audio for content (Chinese only; Japanese onyomi is manually recorded)
  server.registerTool(
    'generate_audio',
    {
      description:
        'Generate Chinese audio file for a content using Google Cloud TTS and automatically upload to Cloud Storage. ' +
        'Japanese onyomi audio is manually recorded and uploaded separately. ' +
        'Requires pinyin_reviewed: true in the YAML file, GOOGLE_APPLICATION_CREDENTIALS and GCS_BUCKET environment variables.',
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
          `pnpm tsx scripts/generate-and-upload-audio.ts ${bookId} ${sectionId} ${chapterId}`,
          {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            timeout: 180000, // 3 minutes timeout (generation + upload)
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
        const segmentText = segment.text as {
          original: string;
          japanese: string;
        };
        const text = segmentText.original;

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

      // Check if Chinese audio file exists, regenerate if missing
      // (Japanese onyomi is manually recorded, not auto-generated)
      const zhPath = path.join(
        audioDir,
        bookId,
        sectionId,
        `${chapterId}-zh.mp3`,
      );

      const zhMissing = !fs.existsSync(zhPath);

      if (zhMissing) {
        const missingFiles = ['zh'];

        // Check pinyin_reviewed flag before regenerating audio
        const yamlPath = path.join(
          PROJECT_ROOT,
          'contents',
          'input',
          bookId,
          sectionId,
          `${chapterId}.yaml`,
        );

        if (!fs.existsSync(yamlPath)) {
          return {
            content: [
              {
                type: 'text',
                text: `YAML file not found: ${yamlPath}\nCannot check pinyin_reviewed flag.`,
              },
            ],
            isError: true,
          };
        }

        const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
        const parsed = yaml.parse(yamlContent);

        if (parsed.pinyin_reviewed !== true) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Cannot regenerate audio: pinyin_reviewed is not true.

Missing local files: ${missingFiles.join(', ')}

Please follow this workflow:
1. Review polyphonic characters using get_polyphonic_info
2. Update hanzi_overrides if needed using write_content_yaml
3. Call set_pinyin_reviewed to mark as reviewed
4. Then call upload_audio again (or generate_audio first)`,
              },
            ],
            isError: true,
          };
        }

        // Regenerate and upload audio files using orchestrator
        try {
          const output = execSync(
            `pnpm tsx scripts/generate-and-upload-audio.ts ${bookId} ${sectionId} ${chapterId}`,
            {
              cwd: PROJECT_ROOT,
              encoding: 'utf-8',
              timeout: 180000, // 3 minutes timeout (generation + upload)
            },
          );

          return {
            content: [
              {
                type: 'text',
                text: `Missing local files (${missingFiles.join(', ')}). Regenerated and uploaded:\n${output}`,
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
                text: `Missing local files (${missingFiles.join(', ')}). Attempted regeneration and upload but failed:\n${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Run upload script (files exist, only upload needed)
      try {
        const output = execSync(
          `pnpm tsx scripts/upload-audio.ts ${bookId} ${sectionId} ${chapterId}`,
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

  // Validate content (same validation as pre-push hook)
  server.registerTool(
    'validate_content',
    {
      description:
        'Validate a content using the same validation logic as the pre-push hook. ' +
        'This will regenerate contents from YAML files and validate the specified content. ' +
        'Use this after write_content_yaml to catch validation errors before pushing.',
      inputSchema: ReadContentYamlSchema.shape,
    },
    async ({ bookId, sectionId, chapterId }) => {
      const contentId = `${bookId}/${sectionId}/${chapterId}`;

      // Step 1: Regenerate contents from YAML files
      console.error(`Regenerating contents for validation...`);
      try {
        execSync('pnpm generate:contents', {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to regenerate contents:\n${errorMessage}`,
            },
          ],
          isError: true,
        };
      }

      // Step 2: Load generated contents and validate
      try {
        // Dynamic import to get the latest generated contents after regeneration
        // Use pathToFileURL to ensure tsx can resolve .ts files correctly
        const contentsPath = path.join(
          PROJECT_ROOT,
          'src/generated/contents/index.ts',
        );
        const contentsModule = await import(pathToFileURL(contentsPath).href);
        const { contents } = contentsModule;
        const validatorPath = path.join(
          PROJECT_ROOT,
          'src/lib/validators/content.ts',
        );
        const { validateContent } = await import(
          pathToFileURL(validatorPath).href
        );

        const content = contents.find(
          (c: { content_id: string }) => c.content_id === contentId,
        );

        if (!content) {
          return {
            content: [
              {
                type: 'text',
                text: `Content "${contentId}" not found in generated contents. Make sure the YAML file exists and was generated correctly.`,
              },
            ],
            isError: true,
          };
        }

        const result = validateContent(content);
        const errors = result.errors.filter(
          (e: { severity: string }) => e.severity === 'error',
        );
        const warnings = result.errors.filter(
          (e: { severity: string }) => e.severity === 'warning',
        );

        if (errors.length > 0) {
          let errorText = `❌ Validation FAILED for ${contentId}\n\n`;
          errorText += 'Errors:\n';
          for (const error of errors) {
            errorText += `  - [${error.path}] ${error.message}\n`;
          }

          if (warnings.length > 0) {
            errorText += '\nWarnings:\n';
            for (const warning of warnings) {
              errorText += `  - [${warning.path}] ${warning.message}\n`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: errorText,
              },
            ],
            isError: true,
          };
        }

        let successText = `✓ Validation PASSED for ${contentId}\n`;

        if (warnings.length > 0) {
          successText += '\nWarnings:\n';
          for (const warning of warnings) {
            successText += `  - [${warning.path}] ${warning.message}\n`;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: successText,
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

  // Suggest hanzi overrides for polyphonic characters
  server.registerTool(
    'suggest_hanzi_overrides',
    {
      description:
        'Analyze a content and suggest hanzi_overrides for polyphonic characters (多音字). ' +
        'For each polyphonic character in the content, shows the default pinyin/meaning ' +
        'and available alternatives. Use this to identify where hanzi_overrides might be needed ' +
        'when the default reading does not match the intended meaning in context.',
      inputSchema: ReadContentYamlSchema.shape,
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
        console.error(`Content file not found: ${yamlPath}`);
        return {
          content: [
            {
              type: 'text',
              text: 'Content file not found. Please verify the file path and try again.',
            },
          ],
          isError: true,
        };
      }

      // Read and parse YAML
      let yamlContent: string;
      try {
        yamlContent = fs.readFileSync(yamlPath, 'utf-8');
      } catch (err) {
        console.error(`Error reading YAML file: ${yamlPath}`, err);
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to read content file. Please try again.',
            },
          ],
          isError: true,
        };
      }
      const parsed = yaml.parse(yamlContent);

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

      type HanziEntry = {
        id: string;
        meanings: MeaningInfo[];
        is_common: boolean;
      };

      const charMeanings = new Map<string, HanziEntry>();
      for (const entry of hanziDictionary as HanziEntry[]) {
        charMeanings.set(entry.id, entry);
      }

      // Analyze each segment
      interface PolyphonicAnalysis {
        segmentIndex: number;
        position: number;
        char: string;
        defaultPinyin: string;
        defaultMeaning: string;
        defaultMeaningId: string;
        alternatives: Array<{
          meaning_id: string;
          pinyin: string;
          meaning_ja: string;
        }>;
        hasOverride: boolean;
        currentOverrideMeaningId: string | null;
      }

      const analysis: PolyphonicAnalysis[] = [];
      const notInDict: Array<{ segmentIndex: number; char: string }> = [];

      // Check if a character is CJK
      const isCJK = (char: string): boolean => {
        const code = char.charCodeAt(0);
        return (
          (code >= 0x4e00 && code <= 0x9fff) ||
          (code >= 0x3400 && code <= 0x4dbf)
        );
      };

      for (let segIdx = 0; segIdx < (parsed.segments || []).length; segIdx++) {
        const segment = parsed.segments[segIdx];
        const original = segment.text?.original || '';

        // Get existing hanzi_overrides for this segment
        const existingOverrides = new Map<string, string>();
        if (segment.hanzi_overrides) {
          for (const override of segment.hanzi_overrides) {
            const key = `${override.char}-${override.position}`;
            existingOverrides.set(key, override.meaning_id);
          }
        }

        // Analyze each character in original
        for (let pos = 0; pos < original.length; pos++) {
          const char = original[pos];

          // Skip if not CJK
          if (!isCJK(char)) continue;

          const entry = charMeanings.get(char);

          if (!entry) {
            notInDict.push({ segmentIndex: segIdx, char });
            continue;
          }

          // Only include polyphonic characters (2+ meanings)
          if (entry.meanings.length < 2) continue;

          const defaultMeaning = entry.meanings.find((m) => m.is_default);
          const alternatives = entry.meanings.filter((m) => !m.is_default);

          if (!defaultMeaning) continue;

          const overrideKey = `${char}-${pos}`;
          const hasOverride = existingOverrides.has(overrideKey);

          analysis.push({
            segmentIndex: segIdx,
            position: pos,
            char,
            defaultPinyin: defaultMeaning.pinyin,
            defaultMeaning: defaultMeaning.meaning_ja,
            defaultMeaningId: defaultMeaning.id,
            alternatives: alternatives.map((m) => ({
              meaning_id: m.id,
              pinyin: m.pinyin,
              meaning_ja: m.meaning_ja,
            })),
            hasOverride,
            currentOverrideMeaningId:
              existingOverrides.get(overrideKey) || null,
          });
        }
      }

      // Build response
      const contentId = `${bookId}/${sectionId}/${chapterId}`;
      let responseText = `=== Hanzi Override Analysis for ${contentId} ===\n\n`;

      // Characters not in dictionary
      if (notInDict.length > 0) {
        const uniqueChars = [...new Set(notInDict.map((c) => c.char))];
        responseText += `⚠️ Characters not in hanzi-dictionary (${uniqueChars.length}):\n`;
        for (const char of uniqueChars) {
          responseText += `  - "${char}" → add_hanzi_entry to register\n`;
        }
        responseText += '\n';
      }

      // Polyphonic characters analysis
      if (analysis.length > 0) {
        responseText += `📝 Polyphonic characters (多音字) found:\n\n`;
        for (const item of analysis) {
          responseText += `Segment ${item.segmentIndex}, position ${item.position}: "${item.char}"\n`;
          responseText += `  Default: ${item.defaultPinyin} (${item.defaultMeaning})\n`;
          responseText += `  Alternatives:\n`;
          for (const alt of item.alternatives) {
            responseText += `    - ${alt.pinyin} (${alt.meaning_ja}) → meaning_id: "${alt.meaning_id}"\n`;
          }
          if (item.hasOverride) {
            responseText += `  ✓ Currently overridden to: ${item.currentOverrideMeaningId}\n`;
          } else {
            responseText += `  → If default is wrong, add hanzi_overrides:\n`;
            responseText += `      - char: ${item.char}\n`;
            responseText += `        position: ${item.position}\n`;
            responseText += `        meaning_id: "適切なmeaning_id"\n`;
          }
          responseText += '\n';
        }
      } else if (notInDict.length === 0) {
        responseText += `✓ No polyphonic characters found in this content.\n`;
      }

      // Summary
      const totalPolyphonic = analysis.length;
      const withOverrides = analysis.filter((a) => a.hasOverride).length;
      const needsReview = totalPolyphonic - withOverrides;
      const uniqueNotInDict = new Set(notInDict.map((item) => item.char)).size;

      responseText += `--- Summary ---\n`;
      responseText += `Total polyphonic characters: ${totalPolyphonic}\n`;
      responseText += `Characters with overrides: ${withOverrides}\n`;
      responseText += `Characters needing review: ${needsReview}\n`;
      responseText += `Characters not in dictionary: ${uniqueNotInDict}\n`;

      if (needsReview > 0) {
        responseText += `\n⚠️ Review the ${needsReview} polyphonic character(s) without overrides.\n`;
        responseText += `Consider the context (especially the japanese reading) to determine the correct meaning.\n`;
        responseText += `Add hanzi_overrides in write_content_yaml if the default is incorrect.\n`;
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

  // Auto-apply hanzi overrides based on context-based disambiguation
  const AutoApplyHanziOverridesSchema = z.object({
    bookId: SafePathSegmentSchema.describe('Book ID (e.g., "lunyu")'),
    sectionId: SafePathSegmentSchema.describe('Section ID (e.g., "1")'),
    chapterId: SafePathSegmentSchema.describe(
      'Chapter ID without .yaml (e.g., "1")',
    ),
  });

  server.registerTool(
    'auto_apply_hanzi_overrides',
    {
      description:
        'Automatically detect and apply hanzi overrides based on context. ' +
        'Analyzes the japanese field to infer correct readings for polyphonic characters ' +
        'and generates hanzi_overrides entries. Updates the YAML file with overrides.',
      inputSchema: AutoApplyHanziOverridesSchema,
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
        console.error(`Content file not found: ${yamlPath}`);
        return {
          content: [
            {
              type: 'text',
              text: 'Content file not found. Please verify the file path and try again.',
            },
          ],
          isError: true,
        };
      }

      // Read and parse YAML
      let yamlContent: string;
      try {
        yamlContent = fs.readFileSync(yamlPath, 'utf-8');
      } catch (err) {
        console.error(`Error reading YAML file: ${yamlPath}`, err);
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to read content file. Please try again.',
            },
          ],
          isError: true,
        };
      }

      const parsed = yaml.parse(yamlContent) as Record<string, unknown>;

      // Load hanzi dictionary
      const hanziDictPath = path.join(
        PROJECT_ROOT,
        'src/data/hanzi-dictionary.ts',
      );
      const hanziDictModule = await import(pathToFileURL(hanziDictPath).href);
      const { hanziDictionary } = hanziDictModule;

      type MeaningInfo = {
        id: string;
        pinyin: string;
        tone: number;
        meaning_ja: string;
        onyomi: string;
        is_default: boolean;
      };

      type HanziEntry = {
        id: string;
        meanings: MeaningInfo[];
        is_common: boolean;
      };

      const charMeanings = new Map<string, HanziEntry>();
      for (const entry of hanziDictionary as HanziEntry[]) {
        charMeanings.set(entry.id, entry);
      }

      const segments =
        (parsed.segments as Array<{
          text?: { japanese?: string; original?: string };
          hanzi_overrides?: Array<{
            char: string;
            position: number;
            meaning_id: string;
          }>;
        }>) || [];

      // Check if a character is CJK
      const isCJK = (char: string): boolean => {
        const code = char.charCodeAt(0);
        return (
          (code >= 0x4e00 && code <= 0x9fff) ||
          (code >= 0x3400 && code <= 0x4dbf)
        );
      };

      let appliedOverridesCount = 0;
      let responseText = `=== Auto-Apply Hanzi Overrides for ${bookId}/${sectionId}/${chapterId} ===\n\n`;

      // Process each segment
      const overrideRegex = /([一-龥\u3400-\u4DBF])（([ぁ-ん]+)）/g;

      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segment = segments[segIdx];
        const original = (segment.text?.original as string) || '';
        const japanese = (segment.text?.japanese as string) || '';

        if (!japanese) continue;

        // Extract position-based overrides from japanese text (mirrors parseInlineOverrides)
        const positionBasedOverrides = new Map<
          number,
          { kanji: string; ruby: string }
        >();
        let cleanText = '';
        let lastIndex = 0;

        for (const match of japanese.matchAll(overrideRegex)) {
          cleanText += japanese.slice(lastIndex, match.index);
          const position = cleanText.length;
          const kanji = match[1];
          const ruby = match[2];

          positionBasedOverrides.set(position, { kanji, ruby });

          cleanText += kanji;
          lastIndex = (match.index ?? 0) + match[0].length;
        }
        cleanText += japanese.slice(lastIndex);

        if (positionBasedOverrides.size === 0) continue;

        // Map cleanText positions to original positions
        let japaneseKanjiIndex = 0;
        const overridesToAdd: Array<{
          char: string;
          position: number;
          meaning_id: string;
        }> = [];

        for (let origPos = 0; origPos < original.length; origPos++) {
          const char = original[origPos];
          if (!isCJK(char)) continue;

          // Find position in cleanText
          let cleanTextPos = 0;
          let currentKanjiCount = 0;
          for (let i = 0; i < cleanText.length; i++) {
            if (isCJK(cleanText[i])) {
              if (currentKanjiCount === japaneseKanjiIndex) {
                cleanTextPos = i;
                break;
              }
              currentKanjiCount++;
            }
          }

          const override = positionBasedOverrides.get(cleanTextPos);
          if (override) {
            // Find meaning_id matching the ruby (reading)
            const entry = charMeanings.get(char);
            if (entry && entry.meanings.length > 1) {
              // Find the meaning that matches this ruby reading
              const matchingMeaning = entry.meanings.find((m) =>
                m.meaning_ja.includes(override.ruby),
              );

              if (matchingMeaning) {
                overridesToAdd.push({
                  char,
                  position: origPos,
                  meaning_id: matchingMeaning.id,
                });
              }
            }
          }

          japaneseKanjiIndex++;
        }

        // Add overrides to segment
        if (overridesToAdd.length > 0) {
          if (!segment.hanzi_overrides) {
            segment.hanzi_overrides = [];
          }

          for (const override of overridesToAdd) {
            // Check if override already exists
            const exists = (
              segment.hanzi_overrides as Array<{
                char: string;
                position: number;
                meaning_id: string;
              }>
            ).some(
              (o) =>
                o.char === override.char && o.position === override.position,
            );

            if (!exists) {
              (
                segment.hanzi_overrides as Array<{
                  char: string;
                  position: number;
                  meaning_id: string;
                }>
              ).push(override);
              appliedOverridesCount++;
            }
          }

          responseText += `Segment ${segIdx}: Applied ${overridesToAdd.length} override(s)\n`;
          for (const override of overridesToAdd) {
            responseText += `  - char: ${override.char}, position: ${override.position}, meaning_id: ${override.meaning_id}\n`;
          }
          responseText += '\n';
        }
      }

      if (appliedOverridesCount === 0) {
        responseText += 'No context-based overrides found to apply.\n';
        return {
          content: [{ type: 'text', text: responseText }],
        };
      }

      // Write updated YAML back
      try {
        const updatedYaml = yaml.stringify(parsed, { indent: 2 });
        fs.writeFileSync(yamlPath, updatedYaml);

        responseText += `\n✓ Successfully applied and saved ${appliedOverridesCount} override(s) to ${yamlPath}`;
        return {
          content: [{ type: 'text', text: responseText }],
        };
      } catch (err) {
        console.error(`Error writing YAML file: ${yamlPath}`, err);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to save updated content. Overrides detected but not saved: ${appliedOverridesCount}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // List primer contents for a book
  const ListPrimersSchema = z.object({
    bookId: SafePathSegmentSchema.describe('Book ID (e.g., "lunyu")'),
  });

  server.registerTool(
    'list_primers',
    {
      description:
        'List all primer contents for a book. ' +
        'Primers are example contents (primer: true in YAML) that AI can reference ' +
        'to learn the style and format of the book. ' +
        'Use this to find examples before generating new content.',
      inputSchema: ListPrimersSchema,
    },
    async ({ bookId }) => {
      const baseDir = path.join(PROJECT_ROOT, 'contents/input');
      const bookDir = path.join(baseDir, bookId);

      // Defense in depth: verify path is within allowed directory
      if (!isPathWithinBase(bookDir, baseDir)) {
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

      if (!fs.existsSync(bookDir)) {
        return {
          content: [
            {
              type: 'text',
              text: `Book directory not found: ${bookDir}`,
            },
          ],
          isError: true,
        };
      }

      // Find all YAML files with primer: true
      interface PrimerInfo {
        contentId: string;
        sectionId: string;
        chapterId: string;
        path: string;
      }

      const primers: PrimerInfo[] = [];

      // Recursively scan directories
      const scanDir = (dir: string, sectionId?: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const entryPath = path.join(dir, entry.name);

            // Symlink protection: detect and skip symlinks
            try {
              const stats = fs.lstatSync(entryPath);
              if (stats.isSymbolicLink()) {
                console.warn(`Skipping symlink for security: ${entryPath}`);
                continue;
              }
            } catch (err) {
              console.warn(`Failed to check symlink status: ${entryPath}`, err);
              continue;
            }

            // This is a section directory
            scanDir(entryPath, entry.name);
          } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
            try {
              const content = fs.readFileSync(entryPath, 'utf-8');
              const parsed = yaml.parse(content);

              if (parsed.primer === true) {
                const chapterId = entry.name.replace('.yaml', '');
                primers.push({
                  contentId: `${bookId}/${sectionId}/${chapterId}`,
                  sectionId: sectionId || '',
                  chapterId,
                  path: entryPath,
                });
              }
            } catch (err) {
              // Log error for visibility, but continue scanning other files
              console.warn(
                `Failed to parse YAML at ${entryPath}:`,
                err instanceof Error ? err.message : String(err),
              );
            }
          }
        }
      };

      scanDir(bookDir);

      if (primers.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No primer contents found for book "${bookId}".\n\nTo create a primer, add "primer: true" to a YAML content file.`,
            },
          ],
        };
      }

      // Sort by section and chapter
      primers.sort((a, b) => {
        const sectionCmp = a.sectionId.localeCompare(b.sectionId, undefined, {
          numeric: true,
        });
        if (sectionCmp !== 0) return sectionCmp;
        return a.chapterId.localeCompare(b.chapterId, undefined, {
          numeric: true,
        });
      });

      let responseText = `=== Primer Contents for "${bookId}" ===\n\n`;
      responseText += `Found ${primers.length} primer(s):\n\n`;

      for (const primer of primers) {
        responseText += `- ${primer.contentId}\n`;
      }

      responseText += `\nUse read_primer_content to view the full content of a primer.`;

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

  // Read primer content
  server.registerTool(
    'read_primer_content',
    {
      description:
        'Read the full content of a primer. ' +
        'Use this to learn the style and format before generating new content.',
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
              text: `Content file not found: ${filePath}`,
            },
          ],
          isError: true,
        };
      }

      const yamlContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.parse(yamlContent);

      if (parsed.primer !== true) {
        return {
          content: [
            {
              type: 'text',
              text: `Warning: This content is not marked as a primer (primer: true not set).\n\nContent:\n${yamlContent}`,
            },
          ],
        };
      }

      const contentId = `${bookId}/${sectionId}/${chapterId}`;
      let responseText = `=== Primer Content: ${contentId} ===\n\n`;
      responseText += `--- YAML Source ---\n${yamlContent}\n`;
      responseText += `--- Parsed Structure ---\n`;
      responseText += JSON.stringify(parsed, null, 2);

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
}
