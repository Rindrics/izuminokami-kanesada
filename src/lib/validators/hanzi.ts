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

  // Check for duplicate entries by id
  const seenIds = new Map<string, number>();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (seenIds.has(entry.id)) {
      const firstIndex = seenIds.get(entry.id)!;
      const errors = errorMap.get(entry.id) || [];
      errors.push({
        field: 'id',
        message: `Duplicate entry: Character "${entry.id}" appears multiple times in dictionary (first at index ${firstIndex}, again at index ${i})`,
        expected: 'unique',
        actual: `duplicate at index ${i}`,
      });
      errorMap.set(entry.id, errors);
    } else {
      seenIds.set(entry.id, i);
    }
  }

  // Validate each entry
  for (const entry of entries) {
    const errors = validateHanziEntry(entry);
    if (errors.length > 0) {
      const existingErrors = errorMap.get(entry.id) || [];
      errorMap.set(entry.id, [...existingErrors, ...errors]);
    }
  }

  return errorMap;
}
