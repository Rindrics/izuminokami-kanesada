import type { HanziEntry, HanziMeaning } from '@/types/hanzi';

export interface ValidationError {
  field: string;
  message: string;
  expected?: string;
  actual?: string;
}

/**
 * Validate HanziMeaning id consistency
 * Expected format: "{hanziId}-{pinyin}" (e.g., "說-yuè")
 */
export function validateHanziMeaningId(
  hanziId: string,
  meaning: HanziMeaning,
): ValidationError | null {
  const expectedId = `${hanziId}-${meaning.pinyin}`;

  if (meaning.id !== expectedId) {
    return {
      field: 'id',
      message: `HanziMeaning id does not match expected format`,
      expected: expectedId,
      actual: meaning.id,
    };
  }

  return null;
}

/**
 * Validate all meanings in a HanziEntry
 */
export function validateHanziEntry(entry: HanziEntry): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const meaning of entry.meanings) {
    const error = validateHanziMeaningId(entry.id, meaning);
    if (error) {
      errors.push(error);
    }
  }

  // Validate that exactly one meaning is default
  const defaultMeanings = entry.meanings.filter((m) => m.is_default);
  if (defaultMeanings.length === 0) {
    errors.push({
      field: 'meanings',
      message: `HanziEntry "${entry.id}" has no default meaning`,
    });
  } else if (defaultMeanings.length > 1) {
    errors.push({
      field: 'meanings',
      message: `HanziEntry "${entry.id}" has multiple default meanings`,
      expected: '1',
      actual: String(defaultMeanings.length),
    });
  }

  return errors;
}

/**
 * Validate an array of HanziEntries
 */
export function validateHanziDictionary(
  entries: HanziEntry[],
): Map<string, ValidationError[]> {
  const errorMap = new Map<string, ValidationError[]>();

  for (const entry of entries) {
    const errors = validateHanziEntry(entry);
    if (errors.length > 0) {
      errorMap.set(entry.id, errors);
    }
  }

  return errorMap;
}
