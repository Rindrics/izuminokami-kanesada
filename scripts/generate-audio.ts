/**
 * Generate audio files from YAML content using Google Cloud Text-to-Speech
 *
 * Usage:
 *   pnpm generate:audio <bookId> <sectionId> <chapterId>
 *   pnpm generate:audio lunyu 1 1
 *
 * This script:
 * 1. Reads the specified YAML content file
 * 2. Extracts Chinese text (白文) and Japanese text (書き下し文)
 * 3. Generates MP3 audio using Google Cloud TTS
 * 4. Saves to audio/{bookId}/{sectionId}/{chapterId}-{lang}.mp3
 * 5. Updates audio-manifest.json with file metadata
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import textToSpeech from '@google-cloud/text-to-speech';
import yaml from 'js-yaml';
import { convertToOnyomi, ONYOMI_PAUSE_PLACEHOLDER } from '../src/lib/ruby';

// ============================================================================
// Audio Manifest Types and Functions
// ============================================================================

interface AudioFileMetadata {
  generatedAt?: string; // ISO 8601 timestamp - present when generated locally, removed after upload
  uploadedAt?: string; // ISO 8601 timestamp - present after Cloud Storage upload
  hash: string; // SHA-256 hash of the audio file
}

interface AudioManifestEntry {
  zh: AudioFileMetadata;
  ja: AudioFileMetadata;
}

type AudioManifest = Record<string, AudioManifestEntry>;

const MANIFEST_PATH = path.join(process.cwd(), 'audio-manifest.json');

/**
 * Read audio manifest from file, or return empty object if not exists
 */
function readManifest(): AudioManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {};
  }
  const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(content) as AudioManifest;
}

/**
 * Write audio manifest to file (sorted by key for consistent diffs)
 */
function writeManifest(manifest: AudioManifest): void {
  const sortedKeys = Object.keys(manifest).sort();
  const sorted: AudioManifest = {};
  for (const key of sortedKeys) {
    sorted[key] = manifest[key];
  }
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * Calculate SHA-256 hash of a file
 */
function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Update manifest entry for a content (marks as generated, not yet uploaded)
 */
function updateManifestEntry(
  manifest: AudioManifest,
  contentId: string,
  zhFilePath: string,
  jaFilePath: string,
): void {
  const now = new Date().toISOString();
  manifest[contentId] = {
    zh: {
      generatedAt: now,
      hash: calculateFileHash(zhFilePath),
    },
    ja: {
      generatedAt: now,
      hash: calculateFileHash(jaFilePath),
    },
  };
}

// ============================================================================
// Hanzi Dictionary
// ============================================================================

// Hanzi dictionary types
interface HanziMeaning {
  id: string;
  pinyin: string;
  tone: number;
  is_default: boolean;
}

// Load hanzi dictionary dynamically
function loadHanziDictionary(): Map<string, HanziMeaning[]> {
  const dictPath = path.join(process.cwd(), 'src/data/hanzi-dictionary.ts');
  const content = fs.readFileSync(dictPath, 'utf-8');

  const charMeanings = new Map<string, HanziMeaning[]>();

  // Parse entries using regex with named capture groups
  const entryRegex =
    /\{\s*id:\s*'(?<charId>[^']+)',\s*meanings:\s*\[(?<meaningsStr>[\s\S]*?)\],\s*is_common/g;
  const meaningRegex =
    /\{\s*id:\s*'(?<id>[^']+)',[\s\S]*?pinyin:\s*'(?<pinyin>[^']+)',\s*tone:\s*(?<tone>\d+),[\s\S]*?is_default:\s*(?<isDefault>true|false)/g;

  for (const entryMatch of content.matchAll(entryRegex)) {
    const { charId, meaningsStr } = entryMatch.groups!;
    const meanings: HanziMeaning[] = [];

    for (const meaningMatch of meaningsStr.matchAll(meaningRegex)) {
      const { id, pinyin, tone, isDefault } = meaningMatch.groups!;
      meanings.push({
        id,
        pinyin,
        tone: parseInt(tone, 10),
        is_default: isDefault === 'true',
      });
    }

    if (meanings.length > 0) {
      charMeanings.set(charId, meanings);
    }
  }

  return charMeanings;
}

/**
 * Remove tone marks from pinyin and return plain pinyin
 * e.g., "yuè" -> "yue", "shuō" -> "shuo"
 */
function removeToneMarks(pinyin: string): string {
  const toneMap: Record<string, string> = {
    ā: 'a',
    á: 'a',
    ǎ: 'a',
    à: 'a',
    ē: 'e',
    é: 'e',
    ě: 'e',
    è: 'e',
    ī: 'i',
    í: 'i',
    ǐ: 'i',
    ì: 'i',
    ō: 'o',
    ó: 'o',
    ǒ: 'o',
    ò: 'o',
    ū: 'u',
    ú: 'u',
    ǔ: 'u',
    ù: 'u',
    ǖ: 'ü',
    ǘ: 'ü',
    ǚ: 'ü',
    ǜ: 'ü',
  };

  return pinyin
    .split('')
    .map((char) => toneMap[char] ?? char)
    .join('');
}

/**
 * Get pinyin with numeric tone for TTS
 * e.g., { pinyin: "yuè", tone: 4 } -> "yue4"
 */
function getPinyinWithTone(
  hanziDict: Map<string, HanziMeaning[]>,
  char: string,
  overrideMeaningId?: string,
): string | undefined {
  const meanings = hanziDict.get(char);
  if (!meanings || meanings.length === 0) return undefined;

  let meaning: HanziMeaning | undefined;

  // If override is specified, use that
  if (overrideMeaningId) {
    meaning = meanings.find((m) => m.id === overrideMeaningId);
  }

  // Otherwise use default
  if (!meaning) {
    meaning = meanings.find((m) => m.is_default);
  }

  if (!meaning) return undefined;

  // Convert to numeric tone format: "yuè" + tone 4 -> "yue4"
  const plainPinyin = removeToneMarks(meaning.pinyin);
  return `${plainPinyin}${meaning.tone}`;
}

// Voice configuration
const VOICE_CONFIG = {
  chinese: {
    languageCode: 'cmn-CN',
    // Default voice (used for single-voice generation)
    name: 'cmn-CN-Wavenet-A',
    ssmlGender: 'FEMALE' as const,
    // Speaker-specific voices for multi-voice generation
    speakers: {
      narrator: 'cmn-CN-Wavenet-A', // Female - for narration (子曰, etc.)
      kongzi: 'cmn-CN-Wavenet-C', // Male - Confucius
      other: 'cmn-CN-Wavenet-B', // Male - other characters
    },
  },
  japanese: {
    languageCode: 'ja-JP',
    name: 'ja-JP-Wavenet-C',
    ssmlGender: 'MALE' as const,
  },
};

const AUDIO_CONFIG = {
  audioEncoding: 'MP3' as const,
  speakingRate: 0.9, // Slightly slower for classical text clarity
};

interface HanziOverride {
  char: string;
  position: number;
  meaning_id: string;
}

interface InputSegment {
  text: string;
  speaker: string | null;
  hanzi_overrides?: HanziOverride[];
}

interface InputContent {
  segments: InputSegment[];
  mentioned: string[];
  japanese: string;
}

// Pause durations for SSML
const PAUSE_CONFIG = {
  sentenceEnd: '1.5s', // After sentence-ending punctuation (。)
  clauseEnd: '1s', // After clause-ending punctuation (，、)
  finalPause: '1s', // At the very end of the audio
};

// Placeholders for pauses (to avoid nested replacement issues)
const PLACEHOLDER = {
  sentenceEnd: '{{SENTENCE_BREAK}}',
  clauseEnd: '{{CLAUSE_BREAK}}',
};

/**
 * Convert placeholders to SSML break tags and deduplicate consecutive breaks
 */
function placeholdersToSsml(text: string): string {
  // First, deduplicate consecutive placeholders (keep the longer pause)
  let result = text;

  // Replace consecutive clause breaks with single clause break
  result = result.replace(
    new RegExp(`(${PLACEHOLDER.clauseEnd})+`, 'g'),
    PLACEHOLDER.clauseEnd,
  );

  // Replace sentence break followed by clause break with just sentence break
  result = result.replace(
    new RegExp(`${PLACEHOLDER.sentenceEnd}${PLACEHOLDER.clauseEnd}`, 'g'),
    PLACEHOLDER.sentenceEnd,
  );

  // Now convert placeholders to actual SSML
  result = result.replace(
    new RegExp(PLACEHOLDER.sentenceEnd, 'g'),
    `<break time="${PAUSE_CONFIG.sentenceEnd}"/>`,
  );
  result = result.replace(
    new RegExp(PLACEHOLDER.clauseEnd, 'g'),
    `<break time="${PAUSE_CONFIG.clauseEnd}"/>`,
  );

  return result;
}

/**
 * Get the voice name for a speaker
 */
function getVoiceForSpeaker(speaker: string | null): string {
  const speakers = VOICE_CONFIG.chinese.speakers;
  if (speaker === null) {
    return speakers.narrator;
  }
  if (speaker === 'kongzi') {
    return speakers.kongzi;
  }
  return speakers.other;
}

/**
 * Convert a segment to SSML with phoneme tags for each character
 * e.g., "子曰" -> '<phoneme alphabet="x-pinyin" ph="zi3">子</phoneme><phoneme alphabet="x-pinyin" ph="yue1">曰</phoneme>'
 */
function segmentToSsmlWithPhonemes(
  hanziDict: Map<string, HanziMeaning[]>,
  segment: InputSegment,
  options?: { wrapWithVoice?: boolean },
): string {
  const text = segment.text;
  const overrides = segment.hanzi_overrides ?? [];

  // Build override map by position
  const overrideMap = new Map<number, string>();
  for (const override of overrides) {
    overrideMap.set(override.position, override.meaning_id);
  }

  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle markers and spaces
    if (char === '-') {
      // Skip connection markers
      continue;
    }
    if (char === ';') {
      // Convert semicolon to comma
      result += '，';
      continue;
    }
    if (char === ' ') {
      // Space becomes clause pause
      result += PLACEHOLDER.clauseEnd;
      continue;
    }

    // Check if it's a CJK character
    const code = char.charCodeAt(0);
    const isCJK =
      (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);

    if (isCJK) {
      const overrideMeaningId = overrideMap.get(i);
      const pinyinWithTone = getPinyinWithTone(
        hanziDict,
        char,
        overrideMeaningId,
      );

      if (pinyinWithTone) {
        // Wrap in phoneme tag with numeric tone pinyin
        // Note: Google Cloud TTS uses "pinyin" (not "x-pinyin") for Chinese
        result += `<phoneme alphabet="pinyin" ph="${pinyinWithTone}">${char}</phoneme>`;
      } else {
        // No pinyin found, use character as-is
        result += char;
      }
    } else {
      // Non-CJK character (punctuation, etc.)
      result += char;
    }
  }

  // Wrap with voice tag if requested (for multi-voice Chinese)
  if (options?.wrapWithVoice) {
    const voiceName = getVoiceForSpeaker(segment.speaker);
    result = `<voice name="${voiceName}">${result}</voice>`;
  }

  return result;
}

/**
 * Convert Chinese text to SSML with phoneme tags and multi-voice support
 * - Uses <phoneme alphabet="x-pinyin" ph="...">漢字</phoneme> for each character
 * - Uses <voice name="..."> tags to switch voices by speaker
 * - Adds pauses between segments and after punctuation
 */
export function toChineseSsml(
  hanziDict: Map<string, HanziMeaning[]>,
  segments: InputSegment[],
): string {
  // Convert each segment to SSML with phoneme tags and voice tags
  const ssmlSegments = segments.map((s) =>
    segmentToSsmlWithPhonemes(hanziDict, s, { wrapWithVoice: true }),
  );

  // Join segments with clause pause placeholder
  let text = ssmlSegments.join(PLACEHOLDER.clauseEnd);

  // Add pause placeholders after punctuation (but not inside voice tags)
  // We need to handle this carefully since punctuation is inside voice tags
  text = text
    .replace(/。/g, `。${PLACEHOLDER.sentenceEnd}`)
    .replace(/，/g, `，${PLACEHOLDER.clauseEnd}`);

  // Convert placeholders to SSML (with deduplication)
  const withPauses = placeholdersToSsml(text);

  return `<speak>${withPauses}<break time="${PAUSE_CONFIG.finalPause}"/></speak>`;
}

/**
 * Convert Chinese segments to Japanese onyomi SSML
 * - Converts each hanzi to its Japanese onyomi (katakana) reading
 * - Adds pauses at same positions as Chinese (spaces, semicolons, segment boundaries)
 */
export function toJapaneseOnyomiSsml(segments: InputSegment[]): string {
  // Convert each segment to onyomi (with pause placeholders)
  const onyomiSegments = segments.map((s) => convertToOnyomi(s.text));

  // Join segments with clause pause placeholder
  let text = onyomiSegments.join(PLACEHOLDER.clauseEnd);

  // Convert onyomi pause placeholders to our standard placeholders
  text = text.replace(
    new RegExp(ONYOMI_PAUSE_PLACEHOLDER, 'g'),
    PLACEHOLDER.clauseEnd,
  );

  // Add pause placeholders after punctuation
  text = text
    .replace(/。/g, `。${PLACEHOLDER.sentenceEnd}`)
    .replace(/，/g, `，${PLACEHOLDER.clauseEnd}`)
    .replace(/、/g, `、${PLACEHOLDER.clauseEnd}`);

  // Convert placeholders to SSML (with deduplication)
  const withPauses = placeholdersToSsml(text);

  return `<speak>${withPauses}<break time="${PAUSE_CONFIG.finalPause}"/></speak>`;
}

async function generateAudio(
  client: InstanceType<typeof textToSpeech.TextToSpeechClient>,
  ssml: string,
  language: 'chinese' | 'japanese',
): Promise<Buffer> {
  const voiceConfig = VOICE_CONFIG[language];

  const [response] = await client.synthesizeSpeech({
    input: { ssml },
    voice: {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.name,
      ssmlGender: voiceConfig.ssmlGender,
    },
    audioConfig: AUDIO_CONFIG,
  });

  if (!response.audioContent) {
    throw new Error(`No audio content returned for ${language} SSML`);
  }

  return Buffer.from(response.audioContent as Uint8Array);
}

function parseYamlContent(filePath: string): InputContent {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content) as InputContent;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error(
      'Usage: pnpm generate:audio <bookId> <sectionId> <chapterId>',
    );
    console.error('Example: pnpm generate:audio lunyu 1 1');
    process.exit(1);
  }

  const [bookId, sectionId, chapterId] = args;
  const contentId = `${bookId}/${sectionId}/${chapterId}`;

  console.log(`=== Audio Generation: ${contentId} ===\n`);

  // Check for credentials
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.',
    );
    console.error(
      'Please set it to the path of your service account JSON file.',
    );
    process.exit(1);
  }

  // Load YAML content
  const yamlPath = path.join(
    process.cwd(),
    'contents/input',
    bookId,
    sectionId,
    `${chapterId}.yaml`,
  );

  if (!fs.existsSync(yamlPath)) {
    console.error(`Error: Content file not found: ${yamlPath}`);
    process.exit(1);
  }

  console.log(`Reading: ${yamlPath}`);
  const content = parseYamlContent(yamlPath);

  // Load hanzi dictionary
  console.log('Loading hanzi dictionary...');
  const hanziDict = loadHanziDictionary();
  console.log(`  Hanzi: ${hanziDict.size} entries`);

  // Convert to SSML with pauses and phonemes
  const chineseSsml = toChineseSsml(hanziDict, content.segments);
  const japaneseOnyomiSsml = toJapaneseOnyomiSsml(content.segments);

  console.log(`\nChinese SSML:\n${chineseSsml}`);
  console.log(`\nJapanese Onyomi SSML:\n${japaneseOnyomiSsml}`);

  // Initialize TTS client
  const client = new textToSpeech.TextToSpeechClient();

  // Generate audio files
  const outputDir = path.join(process.cwd(), 'audio', bookId, sectionId);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('\nGenerating audio...');

  // Chinese audio (multi-voice)
  const { speakers } = VOICE_CONFIG.chinese;
  console.log('  - Chinese (multi-voice)...');
  console.log(`      Narrator: ${speakers.narrator}`);
  console.log(`      Kongzi: ${speakers.kongzi}`);
  console.log(`      Others: ${speakers.other}`);
  const chineseAudio = await generateAudio(client, chineseSsml, 'chinese');
  const chineseOutputPath = path.join(outputDir, `${chapterId}-zh.mp3`);
  fs.writeFileSync(chineseOutputPath, chineseAudio);
  console.log(`    Saved: ${chineseOutputPath}`);

  // Japanese onyomi audio
  console.log(`  - Japanese Onyomi (${VOICE_CONFIG.japanese.name})...`);
  const japaneseAudio = await generateAudio(
    client,
    japaneseOnyomiSsml,
    'japanese',
  );
  const japaneseOutputPath = path.join(outputDir, `${chapterId}-ja.mp3`);
  fs.writeFileSync(japaneseOutputPath, japaneseAudio);
  console.log(`    Saved: ${japaneseOutputPath}`);

  // Update audio manifest
  console.log('\nUpdating audio manifest...');
  const manifest = readManifest();
  updateManifestEntry(
    manifest,
    contentId,
    chineseOutputPath,
    japaneseOutputPath,
  );
  writeManifest(manifest);
  console.log(`  Updated: ${MANIFEST_PATH}`);

  console.log('\n=== Generation Complete ===');
}

// Only run main when executed directly (not when imported for testing)
const isMainModule =
  process.argv[1]?.endsWith('generate-audio.ts') ||
  process.argv[1]?.includes('generate-audio');

if (isMainModule) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
