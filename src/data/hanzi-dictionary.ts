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
  {
    id: '巧',
    meanings: [
      {
        id: '巧-qiǎo',
        onyomi: 'コウ',
        pinyin: 'qiǎo',
        tone: 3,
        meaning_ja: '巧みな',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '言',
    meanings: [
      {
        id: '言-yán',
        onyomi: 'ゲン',
        pinyin: 'yán',
        tone: 2,
        meaning_ja: '言葉',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '令',
    meanings: [
      {
        id: '令-lìng',
        onyomi: 'レイ',
        pinyin: 'lìng',
        tone: 4,
        meaning_ja: '令、よい',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '色',
    meanings: [
      {
        id: '色-sè',
        onyomi: 'ショク',
        pinyin: 'sè',
        tone: 4,
        meaning_ja: '色、顔色',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '曾',
    meanings: [
      {
        id: '曾-zēng',
        onyomi: 'ソウ',
        pinyin: 'zēng',
        tone: 1,
        meaning_ja: '曾（人名）',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '吾',
    meanings: [
      {
        id: '吾-wú',
        onyomi: 'ム',
        pinyin: 'wú',
        tone: 2,
        meaning_ja: '我、私',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '日',
    meanings: [
      {
        id: '日-rì',
        onyomi: 'ニチ',
        pinyin: 'rì',
        tone: 4,
        meaning_ja: '日',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '三',
    meanings: [
      {
        id: '三-sān',
        onyomi: 'サン',
        pinyin: 'sān',
        tone: 1,
        meaning_ja: '三',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '省',
    meanings: [
      {
        id: '省-xǐng',
        onyomi: 'セイ',
        pinyin: 'xǐng',
        tone: 3,
        meaning_ja: '省みる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '身',
    meanings: [
      {
        id: '身-shēn',
        onyomi: 'シン',
        pinyin: 'shēn',
        tone: 1,
        meaning_ja: '身、自分',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '謀',
    meanings: [
      {
        id: '謀-móu',
        onyomi: 'ボウ',
        pinyin: 'móu',
        tone: 2,
        meaning_ja: '謀る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '忠',
    meanings: [
      {
        id: '忠-zhōng',
        onyomi: 'チュウ',
        pinyin: 'zhōng',
        tone: 1,
        meaning_ja: '忠、誠実',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '友',
    meanings: [
      {
        id: '友-yǒu',
        onyomi: 'ユウ',
        pinyin: 'yǒu',
        tone: 3,
        meaning_ja: '友',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '交',
    meanings: [
      {
        id: '交-jiāo',
        onyomi: 'コウ',
        pinyin: 'jiāo',
        tone: 1,
        meaning_ja: '交わる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '信',
    meanings: [
      {
        id: '信-xìn',
        onyomi: 'シン',
        pinyin: 'xìn',
        tone: 4,
        meaning_ja: '信、信用',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '傳',
    meanings: [
      {
        id: '傳-chuán',
        onyomi: 'デン',
        pinyin: 'chuán',
        tone: 2,
        meaning_ja: '伝える',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '千',
    meanings: [
      {
        id: '千-qiān',
        onyomi: 'セン',
        pinyin: 'qiān',
        tone: 1,
        meaning_ja: '千',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '乘',
    meanings: [
      {
        id: '乘-shèng',
        onyomi: 'セイ',
        pinyin: 'shèng',
        tone: 4,
        meaning_ja: '乗り物、車',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '國',
    meanings: [
      {
        id: '國-guó',
        onyomi: 'コク',
        pinyin: 'guó',
        tone: 2,
        meaning_ja: '国',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '敬',
    meanings: [
      {
        id: '敬-jìng',
        onyomi: 'ケイ',
        pinyin: 'jìng',
        tone: 4,
        meaning_ja: '敬う、慎む',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '事',
    meanings: [
      {
        id: '事-shì',
        onyomi: 'ジ',
        pinyin: 'shì',
        tone: 4,
        meaning_ja: '事、仕事',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '節',
    meanings: [
      {
        id: '節-jié',
        onyomi: 'セツ',
        pinyin: 'jié',
        tone: 2,
        meaning_ja: '節約する',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '用',
    meanings: [
      {
        id: '用-yòng',
        onyomi: 'ヨウ',
        pinyin: 'yòng',
        tone: 4,
        meaning_ja: '用いる、費用',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '愛',
    meanings: [
      {
        id: '愛-ài',
        onyomi: 'アイ',
        pinyin: 'ài',
        tone: 4,
        meaning_ja: '愛する',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '使',
    meanings: [
      {
        id: '使-shǐ',
        onyomi: 'ジ',
        pinyin: 'shǐ',
        tone: 3,
        meaning_ja: '使う、使わせる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '民',
    meanings: [
      {
        id: '民-mín',
        onyomi: 'ミン',
        pinyin: 'mín',
        tone: 2,
        meaning_ja: '民、人民',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '以',
    meanings: [
      {
        id: '以-yǐ',
        onyomi: 'イ',
        pinyin: 'yǐ',
        tone: 3,
        meaning_ja: '以て、用いる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '入',
    meanings: [
      {
        id: '入-rù',
        onyomi: 'ニュウ',
        pinyin: 'rù',
        tone: 4,
        meaning_ja: '入る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '則',
    meanings: [
      {
        id: '則-zé',
        onyomi: 'ソク',
        pinyin: 'zé',
        tone: 2,
        meaning_ja: '則ち、すなわち',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '出',
    meanings: [
      {
        id: '出-chū',
        onyomi: 'シュツ',
        pinyin: 'chū',
        tone: 1,
        meaning_ja: '出る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '謹',
    meanings: [
      {
        id: '謹-jǐn',
        onyomi: 'キン',
        pinyin: 'jǐn',
        tone: 3,
        meaning_ja: '慎む',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '汎',
    meanings: [
      {
        id: '汎-fàn',
        onyomi: 'ハン',
        pinyin: 'fàn',
        tone: 4,
        meaning_ja: '広く',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '衆',
    meanings: [
      {
        id: '衆-zhòng',
        onyomi: 'シュウ',
        pinyin: 'zhòng',
        tone: 4,
        meaning_ja: '衆、多くの人',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '親',
    meanings: [
      {
        id: '親-qīn',
        onyomi: 'シン',
        pinyin: 'qīn',
        tone: 1,
        meaning_ja: '親しむ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '行',
    meanings: [
      {
        id: '行-xíng',
        onyomi: 'セイ',
        pinyin: 'xíng',
        tone: 2,
        meaning_ja: '行う',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '餘',
    meanings: [
      {
        id: '餘-yú',
        onyomi: 'ヨ',
        pinyin: 'yú',
        tone: 2,
        meaning_ja: '余り',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '力',
    meanings: [
      {
        id: '力-lì',
        onyomi: 'リツ',
        pinyin: 'lì',
        tone: 4,
        meaning_ja: '力',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '文',
    meanings: [
      {
        id: '文-wén',
        onyomi: 'ブン',
        pinyin: 'wén',
        tone: 2,
        meaning_ja: '文、学問',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '賢',
    meanings: [
      {
        id: '賢-xián',
        onyomi: 'セン',
        pinyin: 'xián',
        tone: 2,
        meaning_ja: '賢い',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '易',
    meanings: [
      {
        id: '易-yì',
        onyomi: 'イ',
        pinyin: 'yì',
        tone: 4,
        meaning_ja: '変える、易い',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '父',
    meanings: [
      {
        id: '父-fù',
        onyomi: 'フ',
        pinyin: 'fù',
        tone: 4,
        meaning_ja: '父',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '母',
    meanings: [
      {
        id: '母-mǔ',
        onyomi: 'ボ',
        pinyin: 'mǔ',
        tone: 3,
        meaning_ja: '母',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '能',
    meanings: [
      {
        id: '能-néng',
        onyomi: 'ノウ',
        pinyin: 'néng',
        tone: 2,
        meaning_ja: '能く、できる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '竭',
    meanings: [
      {
        id: '竭-jié',
        onyomi: 'セツ',
        pinyin: 'jié',
        tone: 2,
        meaning_ja: '尽くす',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '致',
    meanings: [
      {
        id: '致-zhì',
        onyomi: 'シ',
        pinyin: 'zhì',
        tone: 4,
        meaning_ja: '致す、届ける',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '雖',
    meanings: [
      {
        id: '雖-suī',
        onyomi: 'スイ',
        pinyin: 'suī',
        tone: 1,
        meaning_ja: '雖も、たとえ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '必',
    meanings: [
      {
        id: '必-bì',
        onyomi: 'ヒツ',
        pinyin: 'bì',
        tone: 4,
        meaning_ja: '必ず',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '謂',
    meanings: [
      {
        id: '謂-wèi',
        onyomi: 'イ',
        pinyin: 'wèi',
        tone: 4,
        meaning_ja: '謂う、言う',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '重',
    meanings: [
      {
        id: '重-zhòng',
        onyomi: 'チュウ',
        pinyin: 'zhòng',
        tone: 4,
        meaning_ja: '重い、重んずる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '威',
    meanings: [
      {
        id: '威-wēi',
        onyomi: 'イ',
        pinyin: 'wēi',
        tone: 1,
        meaning_ja: '威厳',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '固',
    meanings: [
      {
        id: '固-gù',
        onyomi: 'コ',
        pinyin: 'gù',
        tone: 4,
        meaning_ja: '固い、頑固',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '主',
    meanings: [
      {
        id: '主-zhǔ',
        onyomi: 'シュ',
        pinyin: 'zhǔ',
        tone: 3,
        meaning_ja: '主とする',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '無',
    meanings: [
      {
        id: '無-wú',
        onyomi: 'ム',
        pinyin: 'wú',
        tone: 2,
        meaning_ja: '無い',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '如',
    meanings: [
      {
        id: '如-rú',
        onyomi: 'ジョ',
        pinyin: 'rú',
        tone: 2,
        meaning_ja: '如し、ごとし',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '己',
    meanings: [
      {
        id: '己-jǐ',
        onyomi: 'コ',
        pinyin: 'jǐ',
        tone: 3,
        meaning_ja: '己、自分',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '過',
    meanings: [
      {
        id: '過-guò',
        onyomi: 'コク',
        pinyin: 'guò',
        tone: 4,
        meaning_ja: '過つ、過ぎる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '勿',
    meanings: [
      {
        id: '勿-wù',
        onyomi: 'ム',
        pinyin: 'wù',
        tone: 4,
        meaning_ja: '勿れ、なかれ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '憚',
    meanings: [
      {
        id: '憚-dàn',
        onyomi: 'タン',
        pinyin: 'dàn',
        tone: 4,
        meaning_ja: '憚る、はばかる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '改',
    meanings: [
      {
        id: '改-gǎi',
        onyomi: 'カイ',
        pinyin: 'gǎi',
        tone: 3,
        meaning_ja: '改める',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '慎',
    meanings: [
      {
        id: '慎-shèn',
        onyomi: 'シン',
        pinyin: 'shèn',
        tone: 4,
        meaning_ja: '慎む',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '終',
    meanings: [
      {
        id: '終-zhōng',
        onyomi: 'チュウ',
        pinyin: 'zhōng',
        tone: 1,
        meaning_ja: '終わり',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '追',
    meanings: [
      {
        id: '追-zhuī',
        onyomi: 'ツイ',
        pinyin: 'zhuī',
        tone: 1,
        meaning_ja: '追う',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '德',
    meanings: [
      {
        id: '德-dé',
        onyomi: 'トク',
        pinyin: 'dé',
        tone: 2,
        meaning_ja: '徳',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '歸',
    meanings: [
      {
        id: '歸-guī',
        onyomi: 'キ',
        pinyin: 'guī',
        tone: 1,
        meaning_ja: '帰る、帰す',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '厚',
    meanings: [
      {
        id: '厚-hòu',
        onyomi: 'コウ',
        pinyin: 'hòu',
        tone: 4,
        meaning_ja: '厚い',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '夫',
    meanings: [
      {
        id: '夫-fū',
        onyomi: 'フ',
        pinyin: 'fū',
        tone: 1,
        meaning_ja: '夫、それ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '至',
    meanings: [
      {
        id: '至-zhì',
        onyomi: 'シ',
        pinyin: 'zhì',
        tone: 4,
        meaning_ja: '至る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '於',
    meanings: [
      {
        id: '於-yú',
        onyomi: 'オ',
        pinyin: 'yú',
        tone: 2,
        meaning_ja: '於いて、に',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '是',
    meanings: [
      {
        id: '是-shì',
        onyomi: 'ジ',
        pinyin: 'shì',
        tone: 4,
        meaning_ja: '是、これ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '邦',
    meanings: [
      {
        id: '邦-bāng',
        onyomi: 'ホウ',
        pinyin: 'bāng',
        tone: 1,
        meaning_ja: '邦、国',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '聞',
    meanings: [
      {
        id: '聞-wén',
        onyomi: 'ブン',
        pinyin: 'wén',
        tone: 2,
        meaning_ja: '聞く',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '政',
    meanings: [
      {
        id: '政-zhèng',
        onyomi: 'セイ',
        pinyin: 'zhèng',
        tone: 4,
        meaning_ja: '政、まつりごと',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '求',
    meanings: [
      {
        id: '求-qíu',
        onyomi: 'キュウ',
        pinyin: 'qíu',
        tone: 2,
        meaning_ja: '求める',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '抑',
    meanings: [
      {
        id: '抑-yì',
        onyomi: 'イ',
        pinyin: 'yì',
        tone: 4,
        meaning_ja: '抑、そもそも',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '溫',
    meanings: [
      {
        id: '溫-wēn',
        onyomi: 'オン',
        pinyin: 'wēn',
        tone: 1,
        meaning_ja: '温かい',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '良',
    meanings: [
      {
        id: '良-liáng',
        onyomi: 'リョウ',
        pinyin: 'liáng',
        tone: 2,
        meaning_ja: '良い',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '恭',
    meanings: [
      {
        id: '恭-gōng',
        onyomi: 'キョウ',
        pinyin: 'gōng',
        tone: 1,
        meaning_ja: '恭しい',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '儉',
    meanings: [
      {
        id: '儉-jiǎn',
        onyomi: 'ケン',
        pinyin: 'jiǎn',
        tone: 3,
        meaning_ja: '倹約',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '讓',
    meanings: [
      {
        id: '讓-ràng',
        onyomi: 'ジョウ',
        pinyin: 'ràng',
        tone: 4,
        meaning_ja: '譲る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '得',
    meanings: [
      {
        id: '得-dé',
        onyomi: 'トク',
        pinyin: 'dé',
        tone: 2,
        meaning_ja: '得る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '諸',
    meanings: [
      {
        id: '諸-zhū',
        onyomi: 'ショ',
        pinyin: 'zhū',
        tone: 1,
        meaning_ja: '諸、これ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '異',
    meanings: [
      {
        id: '異-yì',
        onyomi: 'イ',
        pinyin: 'yì',
        tone: 4,
        meaning_ja: '異なる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '在',
    meanings: [
      {
        id: '在-zài',
        onyomi: 'ザイ',
        pinyin: 'zài',
        tone: 4,
        meaning_ja: 'ある、いる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '觀',
    meanings: [
      {
        id: '觀-guān',
        onyomi: 'カン',
        pinyin: 'guān',
        tone: 1,
        meaning_ja: '観る、見る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '志',
    meanings: [
      {
        id: '志-zhì',
        onyomi: 'シ',
        pinyin: 'zhì',
        tone: 4,
        meaning_ja: '志',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '沒',
    meanings: [
      {
        id: '沒-mò',
        onyomi: 'ボツ',
        pinyin: 'mò',
        tone: 4,
        meaning_ja: '没する',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '年',
    meanings: [
      {
        id: '年-nián',
        onyomi: 'ネン',
        pinyin: 'nián',
        tone: 2,
        meaning_ja: '年',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '可',
    meanings: [
      {
        id: '可-kě',
        onyomi: 'カ',
        pinyin: 'kě',
        tone: 3,
        meaning_ja: 'できる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '禽',
    meanings: [
      {
        id: '禽-qín',
        onyomi: 'キン',
        pinyin: 'qín',
        tone: 2,
        meaning_ja: '鳥、禽',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '問',
    meanings: [
      {
        id: '問-wèn',
        onyomi: 'モン',
        pinyin: 'wèn',
        tone: 4,
        meaning_ja: '問う',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '貢',
    meanings: [
      {
        id: '貢-gòng',
        onyomi: 'コウ',
        pinyin: 'gòng',
        tone: 4,
        meaning_ja: '貢ぐ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '夏',
    meanings: [
      {
        id: '夏-xià',
        onyomi: 'カ',
        pinyin: 'xià',
        tone: 4,
        meaning_ja: '夏',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '悌',
    meanings: [
      {
        id: '悌-tì',
        onyomi: 'テイ',
        pinyin: 'tì',
        tone: 4,
        meaning_ja: '悌',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '由',
    meanings: [
      {
        id: '由-yóu',
        onyomi: 'ユウ',
        pinyin: 'yóu',
        tone: 2,
        meaning_ja: 'よる、由来',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '女',
    meanings: [
      {
        id: '女-rǔ',
        onyomi: 'ジョ',
        pinyin: 'rǔ',
        tone: 3,
        meaning_ja: 'なんじ（汝）',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '六',
    meanings: [
      {
        id: '六-lìu',
        onyomi: 'リク',
        pinyin: 'lìu',
        tone: 4,
        meaning_ja: '六',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '蔽',
    meanings: [
      {
        id: '蔽-bì',
        onyomi: 'ヘイ',
        pinyin: 'bì',
        tone: 4,
        meaning_ja: 'おおう、弊害',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '對',
    meanings: [
      {
        id: '對-duì',
        onyomi: 'タイ',
        pinyin: 'duì',
        tone: 4,
        meaning_ja: 'こたえる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '居',
    meanings: [
      {
        id: '居-jū',
        onyomi: 'キョ',
        pinyin: 'jū',
        tone: 1,
        meaning_ja: 'おる、居る',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '語',
    meanings: [
      {
        id: '語-yù',
        onyomi: 'ゴ',
        pinyin: 'yù',
        tone: 4,
        meaning_ja: 'かたる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '愚',
    meanings: [
      {
        id: '愚-yú',
        onyomi: 'グ',
        pinyin: 'yú',
        tone: 2,
        meaning_ja: 'おろか',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '蕩',
    meanings: [
      {
        id: '蕩-dàng',
        onyomi: 'トウ',
        pinyin: 'dàng',
        tone: 4,
        meaning_ja: 'うごく、放蕩',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '賊',
    meanings: [
      {
        id: '賊-zéi',
        onyomi: 'ゾク',
        pinyin: 'zéi',
        tone: 2,
        meaning_ja: 'そこなう、害',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '直',
    meanings: [
      {
        id: '直-zhí',
        onyomi: 'シ',
        pinyin: 'zhí',
        tone: 2,
        meaning_ja: 'なおい、正直',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '絞',
    meanings: [
      {
        id: '絞-jiǎo',
        onyomi: 'コウ',
        pinyin: 'jiǎo',
        tone: 3,
        meaning_ja: 'しぼる、きびしい',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '勇',
    meanings: [
      {
        id: '勇-yǒng',
        onyomi: 'ヨウ',
        pinyin: 'yǒng',
        tone: 3,
        meaning_ja: 'いさむ、勇気',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '剛',
    meanings: [
      {
        id: '剛-gāng',
        onyomi: 'ゴウ',
        pinyin: 'gāng',
        tone: 1,
        meaning_ja: 'つよい、剛毅',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '狂',
    meanings: [
      {
        id: '狂-kuáng',
        onyomi: 'キョウ',
        pinyin: 'kuáng',
        tone: 2,
        meaning_ja: 'くるう、狂う',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '顏',
    meanings: [
      {
        id: '顏-yán',
        onyomi: 'ガン',
        pinyin: 'yán',
        tone: 2,
        meaning_ja: 'かお',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '淵',
    meanings: [
      {
        id: '淵-yuān',
        onyomi: 'エン',
        pinyin: 'yuān',
        tone: 1,
        meaning_ja: 'ふち',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '克',
    meanings: [
      {
        id: '克-kè',
        onyomi: 'コク',
        pinyin: 'kè',
        tone: 4,
        meaning_ja: 'かつ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '復',
    meanings: [
      {
        id: '復-fù',
        onyomi: 'フク',
        pinyin: 'fù',
        tone: 4,
        meaning_ja: 'また',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '禮',
    meanings: [
      {
        id: '禮-lǐ',
        onyomi: 'リツ',
        pinyin: 'lǐ',
        tone: 3,
        meaning_ja: 'れい',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '一',
    meanings: [
      {
        id: '一-yī',
        onyomi: 'イ',
        pinyin: 'yī',
        tone: 1,
        meaning_ja: 'いち',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '天',
    meanings: [
      {
        id: '天-tiān',
        onyomi: 'テン',
        pinyin: 'tiān',
        tone: 1,
        meaning_ja: 'てん',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '下',
    meanings: [
      {
        id: '下-xià',
        onyomi: 'カ',
        pinyin: 'xià',
        tone: 4,
        meaning_ja: 'した',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '焉',
    meanings: [
      {
        id: '焉-yān',
        onyomi: 'ゲン',
        pinyin: 'yān',
        tone: 1,
        meaning_ja: 'これ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '哉',
    meanings: [
      {
        id: '哉-zāi',
        onyomi: 'サイ',
        pinyin: 'zāi',
        tone: 1,
        meaning_ja: 'かな',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '請',
    meanings: [
      {
        id: '請-qǐng',
        onyomi: 'セイ',
        pinyin: 'qǐng',
        tone: 3,
        meaning_ja: 'こ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '目',
    meanings: [
      {
        id: '目-mù',
        onyomi: 'モク',
        pinyin: 'mù',
        tone: 4,
        meaning_ja: 'もく',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '非',
    meanings: [
      {
        id: '非-fēi',
        onyomi: 'ヒ',
        pinyin: 'fēi',
        tone: 1,
        meaning_ja: 'あらず',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '視',
    meanings: [
      {
        id: '視-shì',
        onyomi: 'ジ',
        pinyin: 'shì',
        tone: 4,
        meaning_ja: 'みる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '聽',
    meanings: [
      {
        id: '聽-tīng',
        onyomi: 'チョウ',
        pinyin: 'tīng',
        tone: 1,
        meaning_ja: 'きく',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '動',
    meanings: [
      {
        id: '動-dòng',
        onyomi: 'ドウ',
        pinyin: 'dòng',
        tone: 4,
        meaning_ja: 'うごく',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '回',
    meanings: [
      {
        id: '回-huí',
        onyomi: 'カイ',
        pinyin: 'huí',
        tone: 2,
        meaning_ja: 'まわす',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '敏',
    meanings: [
      {
        id: '敏-mǐn',
        onyomi: 'ミン',
        pinyin: 'mǐn',
        tone: 3,
        meaning_ja: 'さとい',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '斯',
    meanings: [
      {
        id: '斯-sī',
        onyomi: 'シ',
        pinyin: 'sī',
        tone: 1,
        meaning_ja: 'これ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '歸',
    meanings: [
      {
        id: '歸-guī',
        onyomi: 'キ',
        pinyin: 'guī',
        tone: 1,
        meaning_ja: 'かえる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '譬',
    meanings: [
      {
        id: '譬-pì',
        onyomi: 'ヒ',
        pinyin: 'pì',
        tone: 4,
        meaning_ja: 'たとえる',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '北',
    meanings: [
      {
        id: '北-běi',
        onyomi: 'ホク',
        pinyin: 'běi',
        tone: 3,
        meaning_ja: 'きた',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '辰',
    meanings: [
      {
        id: '辰-chén',
        onyomi: 'シン',
        pinyin: 'chén',
        tone: 2,
        meaning_ja: 'しん',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '所',
    meanings: [
      {
        id: '所-suǒ',
        onyomi: 'ショ',
        pinyin: 'suǒ',
        tone: 3,
        meaning_ja: 'ところ',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '星',
    meanings: [
      {
        id: '星-xīng',
        onyomi: 'セイ',
        pinyin: 'xīng',
        tone: 1,
        meaning_ja: 'ほし',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '共',
    meanings: [
      {
        id: '共-gòng',
        onyomi: 'キョウ',
        pinyin: 'gòng',
        tone: 4,
        meaning_ja: 'ともにする',
        is_default: true,
      },
    ],
    is_common: true,
  },
  {
    id: '德',
    meanings: [
      {
        id: '德-dé',
        onyomi: 'トク',
        pinyin: 'dé',
        tone: 2,
        meaning_ja: 'とく',
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
