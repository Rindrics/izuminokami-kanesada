import type { KunyomiEntry } from '@/types/content';

export const kunyomiDictionary: KunyomiEntry[] = [
  {
    id: '子',
    text: '子',
    readings: [
      { id: '子-し', ruby: 'し', is_default: true, note: '敬称' },
      { id: '子-こ', ruby: 'こ', is_default: false, note: '子供' },
    ],
  },
  {
    id: '曰',
    text: '曰',
    readings: [
      { id: '曰-いわ', ruby: 'いわ', okurigana: 'く', is_default: true },
      { id: '曰-のたま', ruby: 'のたま', okurigana: 'わく', is_default: false },
    ],
  },
  {
    id: '学',
    text: '学',
    readings: [
      { id: '学-まな', ruby: 'まな', okurigana: 'ぶ', is_default: true },
    ],
  },
  {
    id: '時',
    text: '時',
    readings: [{ id: '時-とき', ruby: 'とき', is_default: true }],
  },
  {
    id: '之',
    text: '之',
    readings: [{ id: '之-これ', ruby: 'これ', is_default: true }],
  },
  {
    id: '習',
    text: '習',
    readings: [
      { id: '習-なら', ruby: 'なら', okurigana: 'う', is_default: true },
    ],
  },
  {
    id: '亦',
    text: '亦',
    readings: [{ id: '亦-ま', ruby: 'ま', okurigana: 'た', is_default: true }],
  },
  {
    id: '説',
    text: '説',
    readings: [
      { id: '説-よろこ', ruby: 'よろこ', okurigana: 'ぶ', is_default: true },
      { id: '説-と', ruby: 'と', okurigana: 'く', is_default: false },
    ],
  },
  {
    id: '朋',
    text: '朋',
    readings: [{ id: '朋-とも', ruby: 'とも', is_default: true }],
  },
  {
    id: '遠方',
    text: '遠方',
    readings: [{ id: '遠方-えんぽう', ruby: 'えんぽう', is_default: true }],
  },
  {
    id: '来',
    text: '来',
    readings: [
      { id: '来-きた', ruby: 'きた', okurigana: 'る', is_default: true },
    ],
  },
  {
    id: '有',
    text: '有',
    readings: [{ id: '有-あ', ruby: 'あ', okurigana: 'り', is_default: true }],
  },
  {
    id: '楽',
    text: '楽',
    readings: [
      { id: '楽-たの', ruby: 'たの', okurigana: 'しい', is_default: true },
    ],
  },
  {
    id: '人',
    text: '人',
    readings: [{ id: '人-ひと', ruby: 'ひと', is_default: true }],
  },
  {
    id: '知',
    text: '知',
    readings: [{ id: '知-し', ruby: 'し', okurigana: 'る', is_default: true }],
  },
  {
    id: '慍',
    text: '慍',
    readings: [
      {
        id: '慍-いか',
        ruby: 'いか',
        okurigana: 'る',
        is_default: true,
      },
      { id: '慍-うら', ruby: 'うら', okurigana: 'む', is_default: false },
    ],
  },
  {
    id: '君子',
    text: '君子',
    readings: [{ id: '君子-くんし', ruby: 'くんし', is_default: true }],
  },
  {
    id: '時習',
    text: '時習',
    readings: [{ id: '時習-じしゅう', ruby: 'じしゅう', is_default: true }],
  },
];

export function getKunyomiEntry(text: string): KunyomiEntry | undefined {
  return kunyomiDictionary.find((e) => e.text === text);
}

export function getDefaultReading(text: string): string | undefined {
  const entry = getKunyomiEntry(text);
  if (!entry) return undefined;
  const defaultReading = entry.readings.find((r) => r.is_default);
  return defaultReading?.ruby;
}

// Find longest matching entry starting at position in text
// Returns { text, ruby, length } or undefined
export function findLongestMatch(
  fullText: string,
  startPos: number,
): { text: string; ruby: string; length: number } | undefined {
  // Try longer matches first (up to 4 characters for compound words)
  for (let len = 4; len >= 1; len--) {
    const substr = fullText.slice(startPos, startPos + len);
    if (substr.length < len) continue;

    const reading = getDefaultReading(substr);
    if (reading) {
      return { text: substr, ruby: reading, length: len };
    }
  }
  return undefined;
}
