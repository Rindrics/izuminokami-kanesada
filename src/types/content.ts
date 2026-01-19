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

// ADR-0005: Japanese ruby structure
// Ruby is auto-fetched from dictionary for all kanji
// JapaneseRuby is only for overriding specific positions
export interface JapaneseRuby {
  position: number; // Character position in japanese text (0-indexed)
  text: string; // Target text "学" or "時習"
  ruby: string; // Override ruby text
  reading_id?: string; // Reference to KunyomiReading.id
}

export interface Content {
  content_id: string;
  book_id: string;
  section: string;
  chapter: string;
  text: string;
  segments: Segment[];
  characters: {
    speakers: string[];
    mentioned: string[];
  };
  japanese?: string;
  japanese_ruby?: JapaneseRuby[];
}
