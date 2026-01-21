import type { Book, Section } from '@/types/book';
import type { Content } from '@/types/content';

export type { Book, Section };

export const books: Book[] = [
  {
    id: 'lunyu',
    name: '論語',
    sections: [
      {
        id: '1',
        name: '学而第一',
        chapters: ['1', '2'],
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
    // Use - to mark connected characters for tone sandhi detection
    // 不-亦 means 不 and 亦 are connected (4声+4声 → 2声+4声)
    text: '子曰 學而時習之 不-亦說乎 有朋自遠方來 不-亦樂乎 人不知而不慍 不-亦君子乎',
    segments: [
      { text: '子曰', start_pos: 0, end_pos: 2, speaker: null },
      {
        text: '學而時習之 不-亦說乎 有朋自遠方來 不-亦樂乎 人不知而不慍 不-亦君子乎',
        start_pos: 3,
        end_pos: 41, // +3 for the hyphens
        speaker: 'kongzi',
      },
    ],
    characters: {
      speakers: ['kongzi'],
      mentioned: [],
    },
    japanese:
      '子曰く、学びて之を時習す、亦た説ばしからずや。朋遠方より来る有り、亦た楽しからずや。人知らずして慍らず、亦た君子ならずや。',
    // Tone sandhi is now auto-detected from - markers
  },
  {
    content_id: 'lunyu/1/2',
    book_id: 'lunyu',
    section: '学而第一',
    chapter: '2',
    text: '有子曰 其為人也孝弟 而好犯上者 鮮矣; 不-好犯上 而好作亂者 未之有也; 君子務本 本立而道生; 孝弟也者 其為仁之本與',
    segments: [
      { text: '有子曰', start_pos: 0, end_pos: 3, speaker: null },
      {
        text: '其為人也孝弟 而好犯上者 鮮矣; 不-好犯上 而好作亂者 未之有也; 君子務本 本立而道生; 孝弟也者 其為仁之本與',
        start_pos: 4,
        end_pos: 62,
        speaker: 'youzi',
      },
    ],
    characters: {
      speakers: ['youzi'],
      mentioned: [],
    },
    japanese:
      '有子曰く、其の人と為りや孝弟にして、上を犯すを好む者は鮮し。上を犯すを好まずして、乱を作すを好む者は、未だ之れ有らざるなり。君子は本を務む、本立ちて道生ず。孝弟なる者は、其れ仁の本たるか。',
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
