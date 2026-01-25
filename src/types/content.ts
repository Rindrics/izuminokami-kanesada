// ADR-0001 based content types

export interface Segment {
  text: string;
  start_pos: number;
  end_pos: number;
  speaker: string | null; // null = narration
}

// ADR-0005: Kunyomi dictionary types
export interface KunyomiReading {
  id: string; // "学-まな-1"
  ruby: string; // "まな"
  okurigana?: string; // "ぶ" (okurigana hint)
  is_default: boolean;
  note?: string; // Usage note
}

export interface KunyomiEntry {
  id: string; // "学" or "時習"
  text: string; // Target text
  readings: KunyomiReading[];
}

// ADR-0003: Tone change information
export interface ToneChange {
  original_tone: number;
  changed_tone: number;
  reason: string; // e.g., "不+4声→2声", "3声+3声→2声+3声"
}

// ADR-0003: Content-specific hanzi usage
// Override default readings or tone changes for specific positions
export interface ContentHanzi {
  hanzi_id: string; // "說"
  meaning_id?: string; // "說-yuè" - which meaning to use (optional)
  position: number; // Position in the full text (0-indexed)
  tone_change?: ToneChange; // Tone sandhi information
}

export interface Content {
  content_id: string;
  book_id: string;
  section: string;
  chapter: string;
  text: string;
  segments: Segment[];
  persons: {
    speakers: string[];
    mentioned: string[];
  };
  japanese?: string;
  content_hanzi?: ContentHanzi[]; // Override hanzi readings in white text
}
