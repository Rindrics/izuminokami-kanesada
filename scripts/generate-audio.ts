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
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import textToSpeech from '@google-cloud/text-to-speech';
import yaml from 'js-yaml';

// Kunyomi dictionary types (simplified for this script)
interface KunyomiReading {
  ruby: string;
  okurigana?: string;
  is_default: boolean;
}

interface KunyomiEntry {
  text: string;
  readings: KunyomiReading[];
}

// Hanzi dictionary types
interface HanziMeaning {
  id: string;
  pinyin: string;
  tone: number;
  is_default: boolean;
}

interface HanziEntry {
  id: string;
  meanings: HanziMeaning[];
}

// Load kunyomi dictionary dynamically
function loadKunyomiDictionary(): KunyomiEntry[] {
  const dictPath = path.join(process.cwd(), 'src/data/kunyomi-dictionary.ts');
  const content = fs.readFileSync(dictPath, 'utf-8');

  const match = content.match(
    /export const kunyomiDictionary: KunyomiEntry\[\] = (\[[\s\S]*?\]);/,
  );
  if (!match) {
    console.warn('Warning: Could not load kunyomi dictionary');
    return [];
  }

  // biome-ignore lint/security/noGlobalEval: Safe - reading from local file
  const data = eval(match[1]) as KunyomiEntry[];
  return data;
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

// Get default reading from dictionary
function getDefaultReading(
  dictionary: KunyomiEntry[],
  text: string,
): string | undefined {
  const entry = dictionary.find((e) => e.text === text);
  if (!entry) return undefined;
  const defaultReading = entry.readings.find((r) => r.is_default);
  if (!defaultReading) return undefined;
  return defaultReading.ruby + (defaultReading.okurigana ?? '');
}

// Find longest matching entry starting at position in text
function findLongestMatch(
  dictionary: KunyomiEntry[],
  fullText: string,
  startPos: number,
): { text: string; reading: string; length: number } | undefined {
  // Try longer matches first (up to 4 characters for compound words)
  for (let len = 4; len >= 1; len--) {
    const substr = fullText.slice(startPos, startPos + len);
    if (substr.length < len) continue;

    const reading = getDefaultReading(dictionary, substr);
    if (reading) {
      return { text: substr, reading, length: len };
    }
  }
  return undefined;
}

// Convert Japanese text to hiragana using kunyomi dictionary
function convertToHiragana(dictionary: KunyomiEntry[], text: string): string {
  let result = '';
  let pos = 0;

  while (pos < text.length) {
    const match = findLongestMatch(dictionary, text, pos);
    if (match) {
      result += match.reading;
      pos += match.length;
    } else {
      // Keep the character as-is (hiragana, punctuation, etc.)
      result += text[pos];
      pos++;
    }
  }

  return result;
}

// Voice configuration
const VOICE_CONFIG = {
  chinese: {
    languageCode: 'cmn-CN',
    name: 'cmn-CN-Wavenet-C',
    ssmlGender: 'MALE' as const,
  },
  japanese: {
    languageCode: 'ja-JP',
    name: 'ja-JP-Wavenet-B',
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
 * Convert a segment to SSML with phoneme tags for each character
 * e.g., "子曰" -> '<phoneme alphabet="x-pinyin" ph="zi3">子</phoneme><phoneme alphabet="x-pinyin" ph="yue1">曰</phoneme>'
 */
function segmentToSsmlWithPhonemes(
  hanziDict: Map<string, HanziMeaning[]>,
  segment: InputSegment,
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

  return result;
}

/**
 * Convert Chinese text to SSML with phoneme tags
 * - Uses <phoneme alphabet="x-pinyin" ph="...">漢字</phoneme> for each character
 * - Adds pauses between segments and after punctuation
 */
export function toChineseSsml(
  hanziDict: Map<string, HanziMeaning[]>,
  segments: InputSegment[],
): string {
  // Convert each segment to SSML with phoneme tags
  const ssmlSegments = segments.map((s) =>
    segmentToSsmlWithPhonemes(hanziDict, s),
  );

  // Join segments with clause pause placeholder
  let text = ssmlSegments.join(PLACEHOLDER.clauseEnd);

  // Add pause placeholders after punctuation
  text = text
    .replace(/。/g, `。${PLACEHOLDER.sentenceEnd}`)
    .replace(/，/g, `，${PLACEHOLDER.clauseEnd}`);

  // Convert placeholders to SSML (with deduplication)
  const withPauses = placeholdersToSsml(text);

  return `<speak>${withPauses}<break time="${PAUSE_CONFIG.finalPause}"/></speak>`;
}

/**
 * Convert Japanese text to SSML with pauses
 * - Converts kanji to hiragana using kunyomi dictionary
 * - Adds pauses after punctuation for natural reading
 */
export function toJapaneseSsml(
  dictionary: KunyomiEntry[],
  japanese: string,
): string {
  // Convert kanji to hiragana
  const hiragana = convertToHiragana(dictionary, japanese);

  // Add pause placeholders after punctuation
  const text = hiragana
    .replace(/。/g, `。${PLACEHOLDER.sentenceEnd}`)
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

  // Load dictionaries
  console.log('Loading dictionaries...');
  const kunyomiDict = loadKunyomiDictionary();
  console.log(`  Kunyomi: ${kunyomiDict.length} entries`);
  const hanziDict = loadHanziDictionary();
  console.log(`  Hanzi: ${hanziDict.size} entries`);

  // Convert to SSML with pauses and phonemes
  const chineseSsml = toChineseSsml(hanziDict, content.segments);
  const japaneseSsml = toJapaneseSsml(kunyomiDict, content.japanese);

  console.log(`\nChinese SSML:\n${chineseSsml}`);
  console.log(`\nJapanese SSML:\n${japaneseSsml}`);

  // Initialize TTS client
  const client = new textToSpeech.TextToSpeechClient();

  // Generate audio files
  const outputDir = path.join(process.cwd(), 'audio', bookId, sectionId);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('\nGenerating audio...');

  // Chinese audio
  console.log('  - Chinese (cmn-CN-Wavenet-C)...');
  const chineseAudio = await generateAudio(client, chineseSsml, 'chinese');
  const chineseOutputPath = path.join(outputDir, `${chapterId}-zh.mp3`);
  fs.writeFileSync(chineseOutputPath, chineseAudio);
  console.log(`    Saved: ${chineseOutputPath}`);

  // Japanese audio
  console.log('  - Japanese (ja-JP-Wavenet-B)...');
  const japaneseAudio = await generateAudio(client, japaneseSsml, 'japanese');
  const japaneseOutputPath = path.join(outputDir, `${chapterId}-ja.mp3`);
  fs.writeFileSync(japaneseOutputPath, japaneseAudio);
  console.log(`    Saved: ${japaneseOutputPath}`);

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
