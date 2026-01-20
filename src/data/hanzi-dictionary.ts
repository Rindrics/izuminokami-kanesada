// ADR-0003: Hanzi dictionary structure
export type Tone = 1 | 2 | 3 | 4;

export interface HanziMeaning {
  id: string; // "說-yuè-1"
  onyomi: string; // "エツ"
  pinyin: string; // "yuè"
  tone: Tone; // 4
  meaning_ja: string; // "喜ぶ"
  is_default: boolean;
}

export interface HanziEntry {
  id: string; // "說"
  meanings: HanziMeaning[];
  is_common: boolean;
}

export const hanziDictionary: HanziEntry[] = [
  {
    id: '子',
    meanings: [
      {
        id: '子-zǐ',
        onyomi: 'シ',
        pinyin: 'zǐ',
        tone: 3,
        meaning_ja: '子、先生',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '曰',
    meanings: [
      {
        id: '曰-yuē',
        onyomi: 'エツ',
        pinyin: 'yuē',
        tone: 1,
        meaning_ja: '言う',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '學',
    meanings: [
      {
        id: '學-xué',
        onyomi: 'ガク',
        pinyin: 'xué',
        tone: 2,
        meaning_ja: '学ぶ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '而',
    meanings: [
      {
        id: '而-ér',
        onyomi: 'ジ',
        pinyin: 'ér',
        tone: 2,
        meaning_ja: 'そして',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '時',
    meanings: [
      {
        id: '時-shí',
        onyomi: 'ジ',
        pinyin: 'shí',
        tone: 2,
        meaning_ja: '時',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '習',
    meanings: [
      {
        id: '習-xí',
        onyomi: 'シュウ',
        pinyin: 'xí',
        tone: 2,
        meaning_ja: '習う',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '之',
    meanings: [
      {
        id: '之-zhī',
        onyomi: 'シ',
        pinyin: 'zhī',
        tone: 1,
        meaning_ja: 'これ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '不',
    meanings: [
      {
        id: '不-bù',
        onyomi: 'フ',
        pinyin: 'bù',
        tone: 4,
        meaning_ja: '〜ない',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '亦',
    meanings: [
      {
        id: '亦-yì',
        onyomi: 'エキ',
        pinyin: 'yì',
        tone: 4,
        meaning_ja: 'また',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '說',
    meanings: [
      {
        id: '說-yuè',
        onyomi: 'エツ',
        pinyin: 'yuè',
        tone: 4,
        meaning_ja: '喜ぶ',
        is_default: true,
      },
      {
        id: '說-shuō',
        onyomi: 'セツ',
        pinyin: 'shuō',
        tone: 1,
        meaning_ja: '説く、言う',
        is_default: false,
      },
      {
        id: '說-shuì',
        onyomi: 'ゼイ',
        pinyin: 'shuì',
        tone: 4,
        meaning_ja: '説得する',
        is_default: false,
      },
    ],
    is_common: true,
  },
  {
    id: '乎',
    meanings: [
      {
        id: '乎-hū',
        onyomi: 'コ',
        pinyin: 'hū',
        tone: 1,
        meaning_ja: '〜か（疑問）',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '有',
    meanings: [
      {
        id: '有-yǒu',
        onyomi: 'ユウ',
        pinyin: 'yǒu',
        tone: 3,
        meaning_ja: 'ある、いる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '朋',
    meanings: [
      {
        id: '朋-péng',
        onyomi: 'ホウ',
        pinyin: 'péng',
        tone: 2,
        meaning_ja: '友',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '自',
    meanings: [
      {
        id: '自-zì',
        onyomi: 'ジ',
        pinyin: 'zì',
        tone: 4,
        meaning_ja: '自ら、〜から',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '遠',
    meanings: [
      {
        id: '遠-yuǎn',
        onyomi: 'エン',
        pinyin: 'yuǎn',
        tone: 3,
        meaning_ja: '遠い',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '方',
    meanings: [
      {
        id: '方-fāng',
        onyomi: 'ホウ',
        pinyin: 'fāng',
        tone: 1,
        meaning_ja: '方向、方法',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '來',
    meanings: [
      {
        id: '來-lái',
        onyomi: 'ライ',
        pinyin: 'lái',
        tone: 2,
        meaning_ja: '来る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '樂',
    meanings: [
      {
        id: '樂-lè',
        onyomi: 'ラク',
        pinyin: 'lè',
        tone: 4,
        meaning_ja: '楽しい',
        is_default: true,
      },
      {
        id: '樂-yuè',
        onyomi: 'ガク',
        pinyin: 'yuè',
        tone: 4,
        meaning_ja: '音楽',
        is_default: false,
      },
      {
        id: '樂-yào',
        onyomi: 'ゴウ',
        pinyin: 'yào',
        tone: 4,
        meaning_ja: '好む',
        is_default: false,
      },
    ],
    is_common: true,
  },
  {
    id: '人',
    meanings: [
      {
        id: '人-rén',
        onyomi: 'ジン',
        pinyin: 'rén',
        tone: 2,
        meaning_ja: '人',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '知',
    meanings: [
      {
        id: '知-zhī',
        onyomi: 'チ',
        pinyin: 'zhī',
        tone: 1,
        meaning_ja: '知る',
        is_default: true,
      },
      {
        id: '知-zhì',
        onyomi: 'チ',
        pinyin: 'zhì',
        tone: 4,
        meaning_ja: '知恵',
        is_default: false,
      },
    ],
    is_common: true,
  },
  {
    id: '慍',
    meanings: [
      {
        id: '慍-yùn',
        onyomi: 'ウン',
        pinyin: 'yùn',
        tone: 4,
        meaning_ja: '怒る、恨む',
        is_default: true,
      },
    ],
    is_common: false,
  },
  {
    id: '君',
    meanings: [
      {
        id: '君-jūn',
        onyomi: 'クン',
        pinyin: 'jūn',
        tone: 1,
        meaning_ja: '君主、君子',
        is_default: true,
      },
    ],
    is_common: true,
  },
];

const hanziMap = new Map(hanziDictionary.map((e) => [e.id, e]));

export function getHanziEntry(hanzi: string): HanziEntry | undefined {
  return hanziMap.get(hanzi);
}

// Get default meaning for a hanzi
export function getDefaultMeaning(hanzi: string): HanziMeaning | undefined {
  const entry = hanziMap.get(hanzi);
  return entry?.meanings.find((m) => m.is_default);
}

// Get specific meaning by id
export function getMeaningById(
  hanzi: string,
  meaningId: string,
): HanziMeaning | undefined {
  const entry = hanziMap.get(hanzi);
  return entry?.meanings.find((m) => m.id === meaningId);
}

// Get default onyomi
export function getOnyomi(hanzi: string): string | undefined {
  return getDefaultMeaning(hanzi)?.onyomi;
}

// Get default pinyin
export function getPinyin(hanzi: string): string | undefined {
  return getDefaultMeaning(hanzi)?.pinyin;
}
