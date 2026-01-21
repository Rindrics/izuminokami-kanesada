// ADR-0002: Person data structure

export interface Person {
  id: string; // Pinyin-based ID (e.g., "kongzi")
  name: string; // Display name (e.g., "孔子")
  courtesy_name?: string; // 字 (e.g., "仲尼")
  personal_name?: string; // 諱 (e.g., "丘")
  aliases: string[]; // Alternative names (e.g., ["夫子", "孔丘"])
  pinyin?: string; // Pronunciation (e.g., "Kǒng Zǐ")
  description?: string; // Brief description
}
