import type { HanziEntry, HanziMeaning } from '@/types/hanzi';

export type { HanziEntry, HanziMeaning };

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
  {
    id: '其',
    meanings: [
      {
        id: '其-qí',
        onyomi: 'キ',
        pinyin: 'qí',
        tone: 2,
        meaning_ja: 'その',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '為',
    meanings: [
      {
        id: '為-wéi',
        onyomi: 'イ',
        pinyin: 'wéi',
        tone: 2,
        meaning_ja: 'なす、する',
        is_default: true,
      },
      {
        id: '為-wèi',
        onyomi: 'イ',
        pinyin: 'wèi',
        tone: 4,
        meaning_ja: 'ため',
        is_default: false,
      },
    ],
    is_common: true,
  },
  {
    id: '也',
    meanings: [
      {
        id: '也-yě',
        onyomi: 'ヤ',
        pinyin: 'yě',
        tone: 3,
        meaning_ja: '〜なり（断定）',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '孝',
    meanings: [
      {
        id: '孝-xiào',
        onyomi: 'コウ',
        pinyin: 'xiào',
        tone: 4,
        meaning_ja: '孝行',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '弟',
    meanings: [
      {
        id: '弟-dì',
        onyomi: 'テイ',
        pinyin: 'dì',
        tone: 4,
        meaning_ja: '弟',
        is_default: true,
      },
      {
        id: '弟-tì',
        onyomi: 'テイ',
        pinyin: 'tì',
        tone: 4,
        meaning_ja: '悌、弟としての道',
        is_default: false,
      },
    ],
    is_common: true,
  },
  {
    id: '好',
    meanings: [
      {
        id: '好-hào',
        onyomi: 'コウ',
        pinyin: 'hào',
        tone: 4,
        meaning_ja: '好む',
        is_default: true,
      },
      {
        id: '好-hǎo',
        onyomi: 'コウ',
        pinyin: 'hǎo',
        tone: 3,
        meaning_ja: '良い',
        is_default: false,
      },
    ],
    is_common: true,
  },
  {
    id: '犯',
    meanings: [
      {
        id: '犯-fàn',
        onyomi: 'ハン',
        pinyin: 'fàn',
        tone: 4,
        meaning_ja: '犯す',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '上',
    meanings: [
      {
        id: '上-shàng',
        onyomi: 'ジョウ',
        pinyin: 'shàng',
        tone: 4,
        meaning_ja: '上、目上',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '者',
    meanings: [
      {
        id: '者-zhě',
        onyomi: 'シャ',
        pinyin: 'zhě',
        tone: 3,
        meaning_ja: '〜する者',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '鮮',
    meanings: [
      {
        id: '鮮-xiǎn',
        onyomi: 'セン',
        pinyin: 'xiǎn',
        tone: 3,
        meaning_ja: '少ない',
        is_default: true,
      },
      {
        id: '鮮-xiān',
        onyomi: 'セン',
        pinyin: 'xiān',
        tone: 1,
        meaning_ja: '新鮮',
        is_default: false,
      },
    ],
    is_common: true,
  },
  {
    id: '矣',
    meanings: [
      {
        id: '矣-yǐ',
        onyomi: 'イ',
        pinyin: 'yǐ',
        tone: 3,
        meaning_ja: '〜である（断定）',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '作',
    meanings: [
      {
        id: '作-zuò',
        onyomi: 'サク',
        pinyin: 'zuò',
        tone: 4,
        meaning_ja: '作る、起こす',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '亂',
    meanings: [
      {
        id: '亂-luàn',
        onyomi: 'ラン',
        pinyin: 'luàn',
        tone: 4,
        meaning_ja: '乱、乱れ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '未',
    meanings: [
      {
        id: '未-wèi',
        onyomi: 'ミ',
        pinyin: 'wèi',
        tone: 4,
        meaning_ja: 'いまだ〜ず',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '務',
    meanings: [
      {
        id: '務-wù',
        onyomi: 'ム',
        pinyin: 'wù',
        tone: 4,
        meaning_ja: '務める',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '本',
    meanings: [
      {
        id: '本-běn',
        onyomi: 'ホン',
        pinyin: 'běn',
        tone: 3,
        meaning_ja: '本、根本',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '立',
    meanings: [
      {
        id: '立-lì',
        onyomi: 'リツ',
        pinyin: 'lì',
        tone: 4,
        meaning_ja: '立つ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '道',
    meanings: [
      {
        id: '道-dào',
        onyomi: 'ドウ',
        pinyin: 'dào',
        tone: 4,
        meaning_ja: '道',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '生',
    meanings: [
      {
        id: '生-shēng',
        onyomi: 'セイ',
        pinyin: 'shēng',
        tone: 1,
        meaning_ja: '生まれる、生じる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '仁',
    meanings: [
      {
        id: '仁-rén',
        onyomi: 'ジン',
        pinyin: 'rén',
        tone: 2,
        meaning_ja: '仁、思いやり',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '與',
    meanings: [
      {
        id: '與-yǔ',
        onyomi: 'ヨ',
        pinyin: 'yǔ',
        tone: 3,
        meaning_ja: '与える、〜と',
        is_default: true,
      },
      {
        id: '與-yú',
        onyomi: 'ヨ',
        pinyin: 'yú',
        tone: 2,
        meaning_ja: '〜か（疑問）',
        is_default: false,
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
