// Book and Section types

export interface Book {
  id: string; // "lunyu"
  name: string; // "論語"
  compositionYear?: number; // Year of composition (negative for BCE, e.g., -479)
  totalSections: number; // Total number of sections in the book (e.g., 20 for Lunyu)
  sections: Section[];
}

export interface Section {
  id: string; // "1"
  name: string; // "学而第一"
  totalChapters: number; // Total number of chapters in the section (e.g., 16 for 学而第一)
  chapters: string[]; // ["1", "2", "3", ...]
}
