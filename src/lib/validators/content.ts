import { hanziDictionary } from '@/data/hanzi-dictionary';
import { kunyomiDictionary } from '@/data/kunyomi-dictionary';
import type { Content, Segment } from '@/types/content';

export interface ValidationError {
  path: string; // "segments[0].start_pos"
  message: string; // "start_pos must be >= 0"
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate required fields exist and have correct types
 */
function validateRequiredFields(content: Content): ValidationError[] {
  const errors: ValidationError[] = [];

  const requiredStringFields: (keyof Content)[] = [
    'content_id',
    'book_id',
    'section',
    'chapter',
    'text',
  ];

  for (const field of requiredStringFields) {
    if (typeof content[field] !== 'string' || content[field] === '') {
      errors.push({
        path: field,
        message: `${field} is required and must be a non-empty string`,
        severity: 'error',
      });
    }
  }

  if (!Array.isArray(content.segments)) {
    errors.push({
      path: 'segments',
      message: 'segments is required and must be an array',
      severity: 'error',
    });
  }

  if (!content.characters) {
    errors.push({
      path: 'characters',
      message: 'characters is required',
      severity: 'error',
    });
  } else {
    if (!Array.isArray(content.characters.speakers)) {
      errors.push({
        path: 'characters.speakers',
        message: 'characters.speakers is required and must be an array',
        severity: 'error',
      });
    }
    if (!Array.isArray(content.characters.mentioned)) {
      errors.push({
        path: 'characters.mentioned',
        message: 'characters.mentioned is required and must be an array',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate segment positions and coverage
 */
function validateSegments(
  segments: Segment[],
  text: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (segments.length === 0) {
    errors.push({
      path: 'segments',
      message: 'segments must not be empty',
      severity: 'error',
    });
    return errors;
  }

  // Sort segments by start_pos for coverage check
  const sortedSegments = [...segments].sort(
    (a, b) => a.start_pos - b.start_pos,
  );

  for (let i = 0; i < sortedSegments.length; i++) {
    const segment = sortedSegments[i];
    const segmentIndex = segments.indexOf(segment);

    // Check start_pos is valid
    if (segment.start_pos < 0) {
      errors.push({
        path: `segments[${segmentIndex}].start_pos`,
        message: 'start_pos must be >= 0',
        severity: 'error',
      });
    }

    // Check end_pos is valid
    if (segment.end_pos > text.length) {
      errors.push({
        path: `segments[${segmentIndex}].end_pos`,
        message: `end_pos (${segment.end_pos}) exceeds text length (${text.length})`,
        severity: 'error',
      });
    }

    // Check start_pos < end_pos
    if (segment.start_pos >= segment.end_pos) {
      errors.push({
        path: `segments[${segmentIndex}]`,
        message: `start_pos (${segment.start_pos}) must be less than end_pos (${segment.end_pos})`,
        severity: 'error',
      });
    }

    // Check segment text matches the text slice
    const expectedText = text.slice(segment.start_pos, segment.end_pos);
    if (segment.text !== expectedText) {
      errors.push({
        path: `segments[${segmentIndex}].text`,
        message: `segment text does not match text slice`,
        severity: 'error',
      });
    }

    // Check for overlap with previous segment
    if (i > 0) {
      const prevSegment = sortedSegments[i - 1];
      if (segment.start_pos < prevSegment.end_pos) {
        errors.push({
          path: `segments[${segmentIndex}]`,
          message: `segment overlaps with previous segment`,
          severity: 'error',
        });
      }
    }
  }

  // Check segments cover the entire text (excluding spaces between segments)
  const firstSegment = sortedSegments[0];
  const lastSegment = sortedSegments[sortedSegments.length - 1];

  if (firstSegment.start_pos !== 0) {
    // Allow leading space
    const leadingText = text.slice(0, firstSegment.start_pos);
    if (leadingText.trim() !== '') {
      errors.push({
        path: 'segments',
        message: `text before first segment is not covered: "${leadingText}"`,
        severity: 'error',
      });
    }
  }

  if (lastSegment.end_pos !== text.length) {
    // Allow trailing space
    const trailingText = text.slice(lastSegment.end_pos);
    if (trailingText.trim() !== '') {
      errors.push({
        path: 'segments',
        message: `text after last segment is not covered: "${trailingText}"`,
        severity: 'error',
      });
    }
  }

  // Check gaps between segments
  for (let i = 1; i < sortedSegments.length; i++) {
    const prevSegment = sortedSegments[i - 1];
    const currSegment = sortedSegments[i];
    const gapStart = prevSegment.end_pos;
    const gapEnd = currSegment.start_pos;

    if (gapStart < gapEnd) {
      const gapText = text.slice(gapStart, gapEnd);
      // Only whitespace is allowed in gaps
      if (gapText.trim() !== '') {
        errors.push({
          path: 'segments',
          message: `gap between segments contains non-whitespace: "${gapText}"`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate connection markers (ADR-0007)
 * - `-` must have characters before and after
 * - No consecutive `-`
 */
function validateConnectionMarkers(text: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for consecutive hyphens
  if (text.includes('--')) {
    errors.push({
      path: 'text',
      message: 'consecutive connection markers (--) are not allowed',
      severity: 'error',
    });
  }

  // Check each hyphen has characters before and after
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '-') {
      const charBefore = text[i - 1];
      const charAfter = text[i + 1];

      // Check character before (not space, undefined, or another hyphen)
      if (!charBefore || charBefore === ' ' || charBefore === '-') {
        errors.push({
          path: 'text',
          message: `connection marker at position ${i} has no valid character before it`,
          severity: 'error',
        });
      }

      // Check character after (not space, undefined, or another hyphen)
      if (!charAfter || charAfter === ' ' || charAfter === '-') {
        errors.push({
          path: 'text',
          message: `connection marker at position ${i} has no valid character after it`,
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate characters.speakers against segment speakers
 */
function validateSpeakers(content: Content): ValidationError[] {
  const errors: ValidationError[] = [];

  // Collect all speakers from segments
  const segmentSpeakers = new Set<string>();
  for (const segment of content.segments) {
    if (segment.speaker !== null) {
      segmentSpeakers.add(segment.speaker);
    }
  }

  // Check that all segment speakers are in characters.speakers
  for (const speaker of segmentSpeakers) {
    if (!content.characters.speakers.includes(speaker)) {
      errors.push({
        path: 'characters.speakers',
        message: `segment speaker "${speaker}" is not listed in characters.speakers`,
        severity: 'error',
      });
    }
  }

  // Warn if characters.speakers contains speakers not in any segment
  for (const speaker of content.characters.speakers) {
    if (!segmentSpeakers.has(speaker)) {
      errors.push({
        path: 'characters.speakers',
        message: `"${speaker}" is listed in characters.speakers but not used in any segment`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

/**
 * Check if a character is a CJK ideograph (hanzi/kanji)
 */
function isHanzi(char: string): boolean {
  const code = char.charCodeAt(0);
  // CJK Unified Ideographs: U+4E00 - U+9FFF
  // CJK Unified Ideographs Extension A: U+3400 - U+4DBF
  return (
    (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)
  );
}

/**
 * Extract unique hanzi characters from text
 */
function extractHanzi(text: string): string[] {
  const hanziSet = new Set<string>();
  for (const char of text) {
    if (isHanzi(char)) {
      hanziSet.add(char);
    }
  }
  return Array.from(hanziSet);
}

/**
 * Validate that all hanzi in text are registered in hanzi-dictionary (pinyin)
 */
function validateHanziInDictionary(text: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const hanziChars = extractHanzi(text);
  const registeredHanzi = new Set(hanziDictionary.map((e) => e.id));

  const missingHanzi: string[] = [];
  for (const hanzi of hanziChars) {
    if (!registeredHanzi.has(hanzi)) {
      missingHanzi.push(hanzi);
    }
  }

  if (missingHanzi.length > 0) {
    errors.push({
      path: 'text',
      message: `hanzi not registered in hanzi-dictionary (missing pinyin): ${missingHanzi.join(', ')}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate that all kanji in japanese text are registered in kunyomi-dictionary (reading)
 * Only validates if japanese field is present
 */
function validateKunyomiInDictionary(
  japanese: string | undefined,
): ValidationError[] {
  if (!japanese) {
    return [];
  }

  const errors: ValidationError[] = [];
  const kanjiChars = extractHanzi(japanese);

  // Build a set of all kanji covered by kunyomi dictionary
  // Note: kunyomi dictionary can have compound entries like "遠方", "君子"
  const coveredKanji = new Set<string>();
  for (const entry of kunyomiDictionary) {
    for (const char of entry.text) {
      if (isHanzi(char)) {
        coveredKanji.add(char);
      }
    }
  }

  const missingKanji: string[] = [];
  for (const kanji of kanjiChars) {
    if (!coveredKanji.has(kanji)) {
      missingKanji.push(kanji);
    }
  }

  if (missingKanji.length > 0) {
    errors.push({
      path: 'japanese',
      message: `kanji not registered in kunyomi-dictionary (missing reading): ${missingKanji.join(', ')}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate a Content object
 */
export function validateContent(content: Content): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Validate required fields
  errors.push(...validateRequiredFields(content));

  // Early return if basic structure is invalid
  if (errors.some((e) => e.severity === 'error')) {
    return { valid: false, errors };
  }

  // 2. Validate segments
  errors.push(...validateSegments(content.segments, content.text));

  // 3. Validate connection markers
  errors.push(...validateConnectionMarkers(content.text));

  // 4. Validate speakers
  errors.push(...validateSpeakers(content));

  // 5. Validate hanzi in text are in hanzi-dictionary (pinyin)
  errors.push(...validateHanziInDictionary(content.text));

  // 6. Validate kanji in japanese are in kunyomi-dictionary (reading)
  errors.push(...validateKunyomiInDictionary(content.japanese));

  const hasErrors = errors.some((e) => e.severity === 'error');
  return { valid: !hasErrors, errors };
}
