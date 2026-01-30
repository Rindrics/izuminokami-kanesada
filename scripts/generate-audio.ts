/**
 * Generate Chinese audio files from YAML content using Google Cloud Text-to-Speech
 *
 * Usage:
 *   pnpm generate:audio <bookId> <sectionId> <chapterId>
 *   pnpm generate:audio lunyu 1 1
 *
 * This script:
 * 1. Reads the specified YAML content file
 * 2. Extracts Chinese text (白文)
 * 3. Generates MP3 audio using Google Cloud TTS (Chinese only)
 * 4. Saves to audio/{bookId}/{sectionId}/{chapterId}-zh.mp3
 * 5. Updates audio-manifest.json with file metadata
 *
 * Note: Japanese onyomi audio is manually recorded and uploaded separately.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import textToSpeech from '@google-cloud/text-to-speech';
import yaml from 'js-yaml';
import { hanziDictionary } from '../src/data/hanzi-dictionary';
import {
  type AudioFileMetadata,
  type AudioManifest,
  updateSegmentAudio,
} from '../src/lib/audio-manifest';
import type { HanziMeaning } from '../src/types/hanzi';

// ============================================================================
// Audio Manifest Functions
// ============================================================================

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
 * Only updates zh entry; ja is preserved if exists (for manual recordings)
 */
function updateManifestEntry(
  manifest: AudioManifest,
  contentId: string,
  zhFilePath: string,
): void {
  const now = new Date().toISOString();
  const existingEntry = manifest[contentId];

  // For chapter-level generation (segment index 0)
  const segmentIndex = 0;
  const metadata: AudioFileMetadata = {
    generatedAt: now,
    hash: calculateFileHash(zhFilePath),
  };

  manifest[contentId] = updateSegmentAudio(
    existingEntry,
    segmentIndex,
    'zh',
    metadata,
  );
}

// ============================================================================
// Hanzi Dictionary
// ============================================================================

// Load hanzi dictionary from module exports
function loadHanziDictionary(): Map<string, HanziMeaning[]> {
  const charMeanings = new Map<string, HanziMeaning[]>();

  for (const entry of hanziDictionary) {
    charMeanings.set(entry.id, entry.meanings);
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

// Voice configuration (Chinese only; Japanese onyomi is manually recorded)
const VOICE_CONFIG = {
  chinese: {
    languageCode: 'cmn-CN',
    name: 'cmn-CN-Wavenet-B',
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

interface InputSegmentText {
  original: string;
  japanese: string;
}

interface InputSegment {
  text: InputSegmentText;
  speaker: string | null;
  hanzi_overrides?: HanziOverride[];
}

interface InputContent {
  segments: InputSegment[];
  mentioned: string[];
}

// Base pause durations for SSML (in seconds)
const BASE_PAUSE = {
  sentenceEnd: 1.5, // After sentence-ending punctuation (。)
  clauseEnd: 1.0, // After clause-ending punctuation (，、)
  spacePause: 0.3, // For spaces within segments (shorter than clause pause)
  finalPause: 1.0, // At the very end of the audio
};

// Character-specific prosody parameters
// pitch: semitones relative to default (negative = lower)
// rate: speaking rate multiplier (lower = slower)
// pauseMultiplier: multiplier for pause durations (higher = longer pauses)
interface SpeakerProsody {
  pitch: string; // e.g., "-6st" for 6 semitones lower
  rate: number; // e.g., 0.8 for 80% speed
  pauseMultiplier: number; // e.g., 1.5 for 50% longer pauses
}

const SPEAKER_PROSODY: Record<string, SpeakerProsody> = {
  // Confucius: lowest voice, slowest, longest pauses
  kongzi: {
    pitch: '-10st',
    rate: 0.8,
    pauseMultiplier: 1.3,
  },
  // Narrator (null speaker): low voice, slightly slow, normal pauses
  narrator: {
    pitch: '-4st',
    rate: 0.8,
    pauseMultiplier: 1.1,
  },
  // Other characters: normal voice, slightly slow, slightly longer pauses
  other: {
    pitch: '3st',
    rate: 0.9,
    pauseMultiplier: 1.3,
  },
};

/**
 * Get prosody parameters for a speaker
 */
function getSpeakerProsody(speaker: string | null): SpeakerProsody {
  if (speaker === null) {
    return SPEAKER_PROSODY.narrator;
  }
  return SPEAKER_PROSODY[speaker] ?? SPEAKER_PROSODY.other;
}

// Placeholders for pauses (to avoid nested replacement issues)
const PLACEHOLDER = {
  sentenceEnd: '{{SENTENCE_BREAK}}',
  clauseEnd: '{{CLAUSE_BREAK}}',
  spacePause: '{{SPACE_BREAK}}',
};

/**
 * Convert placeholders to SSML break tags with specified pause multiplier
 */
function placeholdersToSsml(text: string, pauseMultiplier = 1.0): string {
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

  // Calculate adjusted pause durations
  const sentencePause = (BASE_PAUSE.sentenceEnd * pauseMultiplier).toFixed(1);
  const clausePause = (BASE_PAUSE.clauseEnd * pauseMultiplier).toFixed(1);
  const spacePause = (BASE_PAUSE.spacePause * pauseMultiplier).toFixed(1);

  // Now convert placeholders to actual SSML
  result = result.replace(
    new RegExp(PLACEHOLDER.sentenceEnd, 'g'),
    `<break time="${sentencePause}s"/>`,
  );
  result = result.replace(
    new RegExp(PLACEHOLDER.clauseEnd, 'g'),
    `<break time="${clausePause}s"/>`,
  );
  result = result.replace(
    new RegExp(PLACEHOLDER.spacePause, 'g'),
    `<break time="${spacePause}s"/>`,
  );

  return result;
}

/**
 * Convert a segment to SSML with phoneme tags for each character
 * e.g., "子曰" -> '<phoneme alphabet="pinyin" ph="zi3">子</phoneme><phoneme alphabet="pinyin" ph="yue1">曰</phoneme>'
 */
function segmentToSsmlWithPhonemes(
  hanziDict: Map<string, HanziMeaning[]>,
  segment: InputSegment,
): string {
  const text = segment.text.original;
  const overrides = segment.hanzi_overrides ?? [];

  // Build override map by position
  const overrideMap = new Map<number, string>();
  for (const override of overrides) {
    // Validate override position and character match
    if (override.position < 0 || override.position >= text.length) {
      console.warn(
        `⚠️  Skipping invalid override: position ${override.position} is out of bounds for text of length ${text.length}`,
      );
      continue;
    }

    const actualChar = text[override.position];
    if (actualChar !== override.char) {
      console.warn(
        `⚠️  Skipping invalid override: expected character "${override.char}" at position ${override.position}, but found "${actualChar}"`,
      );
      continue;
    }

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
      // Space becomes shorter pause
      result += PLACEHOLDER.spacePause;
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

  return result;
}

/**
 * Wrap content with sentence tags, splitting on break tags
 * e.g., "A<break.../>B<break.../>C" -> "<s>A</s><break.../><s>B</s><break.../><s>C</s>"
 */
function wrapWithSentenceTags(content: string): string {
  // Split content by break tags while preserving the breaks
  const breakPattern = /(<break[^>]*\/>)/g;
  const parts = content.split(breakPattern);

  return parts
    .map((part) => {
      // If it's a break tag, keep it as-is
      if (part.match(breakPattern)) {
        return part;
      }
      // If it's non-empty content, wrap with <s> tags
      if (part.trim()) {
        return `<s>${part}</s>`;
      }
      return part;
    })
    .join('');
}

/**
 * Convert Chinese text to SSML with phoneme tags and character-specific prosody
 * - Uses <phoneme alphabet="pinyin" ph="...">漢字</phoneme> for each character
 * - Uses <prosody> tags for character-specific pitch and rate
 * - Uses <p> tags to wrap each speaker's utterance (paragraph)
 * - Uses <s> tags to wrap each sentence within the utterance
 * - Adjusts pause durations based on character's pauseMultiplier
 */
export function toChineseSsml(
  hanziDict: Map<string, HanziMeaning[]>,
  segments: InputSegment[],
): string {
  // Process each segment individually with its own prosody settings
  const processedSegments: string[] = [];

  for (const segment of segments) {
    const prosody = getSpeakerProsody(segment.speaker);

    // Convert segment to SSML with phoneme tags (without prosody wrapper yet)
    let segmentContent = segmentToSsmlWithPhonemes(hanziDict, segment);

    // Add pause placeholders after punctuation within this segment
    segmentContent = segmentContent
      .replace(/。/g, `。${PLACEHOLDER.sentenceEnd}`)
      .replace(/，/g, `，${PLACEHOLDER.clauseEnd}`);

    // Convert placeholders to SSML with character-specific pause multiplier
    segmentContent = placeholdersToSsml(
      segmentContent,
      prosody.pauseMultiplier,
    );

    // Wrap break-separated parts with <s> tags
    const withSentenceTags = wrapWithSentenceTags(segmentContent);

    // Wrap with prosody tag for pitch and rate
    const withProsody = `<prosody pitch="${prosody.pitch}" rate="${prosody.rate}">${withSentenceTags}</prosody>`;

    // Wrap with paragraph tag (one speaker's utterance = one paragraph)
    const withParagraph = `<p>${withProsody}</p>`;

    processedSegments.push(withParagraph);
  }

  // Join segments with clause pauses (use narrator's pause duration as default between segments)
  const segmentPause = BASE_PAUSE.clauseEnd.toFixed(1);
  const result = processedSegments.join(`<break time="${segmentPause}s"/>`);

  // Add final pause
  const finalPause = BASE_PAUSE.finalPause.toFixed(1);
  return `<speak>${result}<break time="${finalPause}s"/></speak>`;
}

async function generateChineseAudio(
  client: InstanceType<typeof textToSpeech.TextToSpeechClient>,
  ssml: string,
): Promise<Buffer> {
  const [response] = await client.synthesizeSpeech({
    input: { ssml },
    voice: {
      languageCode: VOICE_CONFIG.chinese.languageCode,
      name: VOICE_CONFIG.chinese.name,
      ssmlGender: VOICE_CONFIG.chinese.ssmlGender,
    },
    audioConfig: AUDIO_CONFIG,
  });

  if (!response.audioContent) {
    throw new Error('No audio content returned for Chinese SSML');
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

  // Convert to SSML with pauses and phonemes (Chinese only; Japanese onyomi is manually recorded)
  const chineseSsml = toChineseSsml(hanziDict, content.segments);

  console.log(`\nChinese SSML:\n${chineseSsml}`);

  // Initialize TTS client
  const client = new textToSpeech.TextToSpeechClient();

  // Generate audio files
  const outputDir = path.join(process.cwd(), 'audio', bookId, sectionId);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('\nGenerating audio...');

  // Chinese audio
  console.log(`  - Chinese (${VOICE_CONFIG.chinese.name})...`);
  const chineseAudio = await generateChineseAudio(client, chineseSsml);
  const chineseOutputPath = path.join(outputDir, `${chapterId}-zh.mp3`);
  fs.writeFileSync(chineseOutputPath, chineseAudio);
  console.log(`    Saved: ${chineseOutputPath}`);

  // Update audio manifest
  console.log('\nUpdating audio manifest...');
  const manifest = readManifest();
  updateManifestEntry(manifest, contentId, chineseOutputPath);
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
