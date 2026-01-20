import type { Content } from '@/types/content';

// Book metadata
export interface Book {
  id: string; // "lunyu"
  name: string; // "論語"
  sections: Section[];
}

// Section (編) metadata
export interface Section {
  id: string; // "1"
  name: string; // "学而第一"
  chapters: string[]; // ["1", "2", "3", ...]
}

export const books: Book[] = [
  {
    id: 'lunyu',
    name: '論語',
    sections: [
      {
        id: '1',
        name: '学而第一',
        chapters: ['1'],
      },
    ],
  },
];

export const sampleContents: Content[] = [
  {
    content_id: 'lunyu/1/1',
    book_id: 'lunyu',
    section: '学而第一',
    chapter: '1',
    text: '子曰 學而時習之 不亦說乎 有朋自遠方來 不亦樂乎 人不知而不慍 不亦君子乎',
    segments: [
      { text: '子曰', start_pos: 0, end_pos: 2, speaker: null },
      {
        text: '學而時習之 不亦說乎 有朋自遠方來 不亦樂乎 人不知而不慍 不亦君子乎',
        start_pos: 3,
        end_pos: 38,
        speaker: 'kongzi',
      },
    ],
    characters: {
      speakers: ['kongzi'],
      mentioned: [],
    },
    japanese:
      '子曰く、学びて之を時習す、亦た説ばしからずや。朋遠方より来る有り、亦た楽しからずや。人知らずして慍らず、亦た君子ならずや。',
  },
];

// Book queries
export function getBookById(id: string): Book | undefined {
  return books.find((b) => b.id === id);
}

export function getAllBookIds(): string[] {
  return books.map((b) => b.id);
}

// Section queries
export function getSectionById(
  bookId: string,
  sectionId: string,
): Section | undefined {
  const book = getBookById(bookId);
  return book?.sections.find((s) => s.id === sectionId);
}

export function getAllSectionPaths(): string[] {
  const paths: string[] = [];
  for (const book of books) {
    for (const section of book.sections) {
      paths.push(`${book.id}/${section.id}`);
    }
  }
  return paths;
}

// Content queries
export function getContentById(id: string): Content | undefined {
  return sampleContents.find((c) => c.content_id === id);
}

export function getAllContentIds(): string[] {
  return sampleContents.map((c) => c.content_id);
}
