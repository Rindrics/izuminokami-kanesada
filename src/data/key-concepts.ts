// Key concepts to track (virtues and important terms in Confucian texts)
// This is the source of truth for key concepts used across the application

export interface KeyConceptInfo {
  char: string;
  label: string;
  desc: string;
}

// Raw list of key concept characters (used by backend and frontend)
export const KEY_CONCEPTS: readonly string[] = [
  '仁',
  '義',
  '礼',
  '禮', // variant
  '智',
  '信',
  '孝',
  '悌',
  '忠',
  '學',
  '道',
  '君子',
  '民',
  '利',
  '怨',
  '過',
  '德',
  '改',
  '樂',
  '観',
  '謹',
  '政',
  '達',
  '知',
  '得',
  '難',
  '惡',
  '聖',
  '賢',
  '愚',
  '文',
  '友',
  '命',
  '欲',
];

// Set for fast lookup (used by graph components)
export const KEY_CONCEPTS_SET = new Set<string>(KEY_CONCEPTS);

// Extended information for frontend display (used by stats page and diagrams)
export const KEY_CONCEPTS_INFO: KeyConceptInfo[] = [
  { char: '仁', label: '仁（じん）', desc: '思いやり' },
  { char: '義', label: '義（ぎ）', desc: '正義' },
  { char: '礼', label: '礼（れい）', desc: '礼儀' },
  { char: '禮', label: '禮（れい）', desc: '礼儀' }, // 異体字
  { char: '智', label: '智（ち）', desc: '知恵' },
  { char: '信', label: '信（しん）', desc: '誠実' },
  { char: '孝', label: '孝（こう）', desc: '親孝行' },
  { char: '悌', label: '悌（てい）', desc: '兄弟愛' },
  { char: '忠', label: '忠（ちゅう）', desc: '忠義' },
  { char: '學', label: '學（がく）', desc: '学問' },
  { char: '道', label: '道（どう）', desc: '道理' },
  { char: '君', label: '君（くん）', desc: '君主' },
  { char: '君子', label: '君子（くんし）', desc: '徳のある人' },
  { char: '民', label: '民（みん）', desc: '民衆' },
  { char: '利', label: '利（り）', desc: '利益' },
  { char: '怨', label: '怨（えん）', desc: '恨み' },
  { char: '過', label: '過（か）', desc: '過ち' },
  { char: '德', label: '德（とく）', desc: '徳' },
  { char: '改', label: '改（かい）', desc: '改める' },
  { char: '樂', label: '樂（らく）', desc: '楽しむ' },
  { char: '観', label: '観（かん）', desc: '観察' },
  { char: '謹', label: '謹（きん）', desc: '謹む' },
  { char: '政', label: '政（せい）', desc: '政治' },
  { char: '達', label: '達（たつ）', desc: '達する' },
  { char: '知', label: '知（ち）', desc: '知る' },
  { char: '得', label: '得（とく）', desc: '得る' },
  { char: '難', label: '難（なん）', desc: '困難' },
  { char: '惡', label: '惡（あく）', desc: '悪' },
  { char: '聖', label: '聖（せい）', desc: '聖人' },
  { char: '賢', label: '賢（けん）', desc: '賢い' },
  { char: '愚', label: '愚（ぐ）', desc: '愚か' },
  { char: '文', label: '文（ぶん）', desc: '文' },
  { char: '友', label: '友（ゆう）', desc: '友' },
  { char: '命', label: '命（めい）', desc: '命' },
  { char: '欲', label: '欲（よく）', desc: '欲' },
];

// Helper function to get info for a concept character
export function getKeyConceptInfo(char: string): KeyConceptInfo | undefined {
  return KEY_CONCEPTS_INFO.find((info) => info.char === char);
}
