// ADR-0003: Hanzi dictionary types

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
