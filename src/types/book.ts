// Book and Section types

export interface Book {
  id: string; // "lunyu"
  name: string; // "論語"
  sections: Section[];
}

export interface Section {
  id: string; // "1"
  name: string; // "学而第一"
  chapters: string[]; // ["1", "2", "3", ...]
}
