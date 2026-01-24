import { getDefaultMeaning } from '@/data/hanzi-dictionary';
import { findLongestMatch } from '@/data/kunyomi-dictionary';

/**
 * Convert Japanese text (with kanji) to hiragana using kunyomi dictionary.
 * Characters not found in dictionary are kept as-is.
 *
 * @example
 * convertToHiragana("子曰く") // "しいわく"
 * convertToHiragana("学びて時に") // "まなびてときに"
 */
export function convertToHiragana(text: string): string {
  let result = '';
  let pos = 0;

  while (pos < text.length) {
    const match = findLongestMatch(text, pos);
    if (match) {
      result += match.ruby;
      pos += match.length;
    } else {
      // No match found, keep character as-is
      result += text[pos];
      pos += 1;
    }
  }

  return result;
}

// Pause placeholder for onyomi conversion
const ONYOMI_PAUSE_PLACEHOLDER = '{{PAUSE}}';

/**
 * Convert Chinese text to Japanese onyomi (katakana) reading.
 * - Converts hanzi to onyomi
 * - Converts spaces to pause placeholders (same position as Chinese pauses)
 * - Skips markers (-, ;)
 *
 * @example
 * convertToOnyomi("子曰") // "シエツ"
 * convertToOnyomi("學而時習之 不亦說乎") // "ガクジジシュウシ{{PAUSE}}フエキエツコ"
 */
export function convertToOnyomi(text: string): string {
  let result = '';

  for (const char of text) {
    // Skip connection markers
    if (char === '-') {
      continue;
    }

    // Convert semicolons to comma + pause (same as Chinese)
    if (char === ';') {
      result += `、${ONYOMI_PAUSE_PLACEHOLDER}`;
      continue;
    }

    // Convert spaces to pause placeholders
    if (char === ' ') {
      result += ONYOMI_PAUSE_PLACEHOLDER;
      continue;
    }

    // Check if it's a CJK character
    const code = char.charCodeAt(0);
    const isCJK =
      (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);

    if (isCJK) {
      const meaning = getDefaultMeaning(char);
      if (meaning?.onyomi) {
        result += meaning.onyomi;
      } else {
        // No onyomi found, keep character as-is
        result += char;
      }
    } else {
      // Non-CJK character (punctuation, etc.) - keep as-is
      result += char;
    }
  }

  return result;
}

export { ONYOMI_PAUSE_PLACEHOLDER };
