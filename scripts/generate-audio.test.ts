import { describe, expect, it } from 'vitest';
import { hanziDictionary } from '../src/data/hanzi-dictionary';
import type { HanziMeaning } from '../src/types/hanzi';
import { toChineseSsml } from './generate-audio';

// Load actual hanzi dictionary for integration testing
function loadActualHanziDictionary(): Map<string, HanziMeaning[]> {
  const charMeanings = new Map<string, HanziMeaning[]>();

  for (const entry of hanziDictionary) {
    charMeanings.set(entry.id, entry.meanings);
  }

  return charMeanings;
}

// Mock hanzi dictionary for testing (with tone marks in pinyin)
const mockHanziDict = new Map([
  ['子', [{ id: '子-zǐ', pinyin: 'zǐ', tone: 3, is_default: true }]],
  ['曰', [{ id: '曰-yuē', pinyin: 'yuē', tone: 1, is_default: true }]],
  ['學', [{ id: '學-xué', pinyin: 'xué', tone: 2, is_default: true }]],
  ['而', [{ id: '而-ér', pinyin: 'ér', tone: 2, is_default: true }]],
  ['時', [{ id: '時-shí', pinyin: 'shí', tone: 2, is_default: true }]],
  ['習', [{ id: '習-xí', pinyin: 'xí', tone: 2, is_default: true }]],
  ['之', [{ id: '之-zhī', pinyin: 'zhī', tone: 1, is_default: true }]],
  ['不', [{ id: '不-bù', pinyin: 'bù', tone: 4, is_default: true }]],
  ['亦', [{ id: '亦-yì', pinyin: 'yì', tone: 4, is_default: true }]],
  [
    '說',
    [
      { id: '說-yuè', pinyin: 'yuè', tone: 4, is_default: true },
      { id: '說-shuō', pinyin: 'shuō', tone: 1, is_default: false },
    ],
  ],
  ['乎', [{ id: '乎-hū', pinyin: 'hū', tone: 1, is_default: true }]],
  ['有', [{ id: '有-yǒu', pinyin: 'yǒu', tone: 3, is_default: true }]],
  ['朋', [{ id: '朋-péng', pinyin: 'péng', tone: 2, is_default: true }]],
  ['自', [{ id: '自-zì', pinyin: 'zì', tone: 4, is_default: true }]],
  ['遠', [{ id: '遠-yuǎn', pinyin: 'yuǎn', tone: 3, is_default: true }]],
  ['方', [{ id: '方-fāng', pinyin: 'fāng', tone: 1, is_default: true }]],
  ['來', [{ id: '來-lái', pinyin: 'lái', tone: 2, is_default: true }]],
]);

describe('toChineseSsml', () => {
  it('should add pause between segments', () => {
    const segments = [
      { text: { original: '子曰', japanese: '子曰く、' }, speaker: null },
      {
        text: { original: '學而時習之', japanese: '学びて之を時習す。' },
        speaker: 'kongzi',
      },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Should have a break between segments
    expect(result).toContain('<break time="1.0s"/>');
    // Should NOT have nested breaks
    expect(result).not.toContain('<break<break');
    expect(result).not.toContain('time="1.0s"/>time=');
  });

  it('should convert spaces to pauses', () => {
    const segments = [
      {
        text: {
          original: '學而時習之 不亦說乎',
          japanese: '学びて之を時習す、亦た説ばしからずや。',
        },
        speaker: 'kongzi',
      },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Should have pause where space was
    expect(result).toContain('<break time="1.3s"/>');
  });

  it('should generate phoneme tags with numeric tone pinyin', () => {
    const segments = [
      { text: { original: '子曰', japanese: '子曰く、' }, speaker: null },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Should have phoneme tags with numeric tones (e.g., zi3, yue1)
    // Note: Google Cloud TTS uses "pinyin" (not "x-pinyin") for Chinese
    expect(result).toContain(
      '<phoneme alphabet="pinyin" ph="zi3">子</phoneme>',
    );
    expect(result).toContain(
      '<phoneme alphabet="pinyin" ph="yue1">曰</phoneme>',
    );
  });

  it('should use default pinyin for polyphonic characters', () => {
    const segments = [
      { text: { original: '說', japanese: '説' }, speaker: 'kongzi' },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Should use default pinyin (yue4 for 說, meaning "喜ぶ")
    expect(result).toContain(
      '<phoneme alphabet="pinyin" ph="yue4">說</phoneme>',
    );
  });

  it('should use overridden pinyin when specified', () => {
    const segments = [
      {
        text: { original: '說', japanese: '説' },
        speaker: 'kongzi',
        hanzi_overrides: [{ char: '說', position: 0, meaning_id: '說-shuō' }],
      },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Should use overridden pinyin (shuo1)
    expect(result).toContain(
      '<phoneme alphabet="pinyin" ph="shuo1">說</phoneme>',
    );
  });

  it('should not create nested or broken break tags', () => {
    const segments = [
      { text: { original: '子曰', japanese: '子曰く、' }, speaker: null },
      {
        text: {
          original: '學而時習之 不亦說乎',
          japanese: '学びて之を時習す、亦た説ばしからずや。',
        },
        speaker: 'kongzi',
      },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Valid SSML checks
    expect(result).not.toContain('<break<break');
    expect(result).not.toContain('time="1s"/>time=');
    expect(result).not.toContain('/>/>');

    // Should start and end with speak tags
    expect(result).toMatch(/^<speak>.*<\/speak>$/);
  });

  it('should deduplicate consecutive pauses', () => {
    const segments = [
      { text: { original: '子曰', japanese: '子曰く、' }, speaker: null },
      {
        text: { original: ' 學而時習之', japanese: '学びて之を時習す。' },
        speaker: 'kongzi',
      },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Should have single pause, not consecutive
    expect(result).not.toContain('<break time="1.0s"/><break time="1.0s"/>');
  });

  it('should remove connection markers (-)', () => {
    const segments = [
      {
        text: { original: '不-亦說乎', japanese: '亦た説ばしからずや。' },
        speaker: 'kongzi',
      },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Connection marker should be removed (不-亦 becomes 不亦)
    // Check that phoneme tags are adjacent without hyphen between them
    expect(result).toContain('>不</phoneme><phoneme');
    expect(result).toContain('>亦</phoneme>');
    // Should NOT have standalone hyphen between phoneme tags
    expect(result).not.toMatch(/<\/phoneme>-<phoneme/);
  });

  it('should convert semicolons to Chinese commas', () => {
    const segments = [
      {
        text: {
          original: '不亦說乎; 有朋自遠方來',
          japanese: '亦た説ばしからずや。朋遠方より来る有り。',
        },
        speaker: 'kongzi',
      },
    ];
    const result = toChineseSsml(mockHanziDict, segments);

    // Semicolon should become comma with pause
    expect(result).toContain('，</s><break time="1.3s"/>');
    expect(result).not.toContain(';');
  });
});

describe('loadActualHanziDictionary', () => {
  it('should parse 說 with yuè as default', () => {
    const dict = loadActualHanziDictionary();
    const meanings = dict.get('說');

    expect(meanings).toBeDefined();
    expect(meanings?.length).toBeGreaterThanOrEqual(2);

    // Find the default meaning
    const defaultMeaning = meanings?.find((m) => m.is_default);
    expect(defaultMeaning).toBeDefined();
    expect(defaultMeaning?.pinyin).toBe('yuè');
  });

  it('should parse 樂 with lè as default', () => {
    const dict = loadActualHanziDictionary();
    const meanings = dict.get('樂');

    expect(meanings).toBeDefined();

    const defaultMeaning = meanings?.find((m) => m.is_default);
    expect(defaultMeaning).toBeDefined();
    expect(defaultMeaning?.pinyin).toBe('lè');
  });
});

describe('toChineseSsml with actual dictionary', () => {
  it('should use yue4 for 說 in actual dictionary', () => {
    const actualDict = loadActualHanziDictionary();
    const segments = [
      { text: { original: '說', japanese: '説' }, speaker: null },
    ];
    const result = toChineseSsml(actualDict, segments);

    // Should use yue4 (default, meaning "喜ぶ") not shuo1 (meaning "言う")
    expect(result).toContain('ph="yue4"');
    expect(result).not.toContain('ph="shuo1"');
  });
});
