import type { Book, Section } from '@/types/book';

export type { Book, Section };

/**
 * Book metadata definitions
 */
export const books: Book[] = [
  {
    id: 'lunyu',
    name: '論語',
    sections: [
      {
        id: '1',
        name: '学而第一',
        chapters: ['1', '2', '3', '4'],
      },
    ],
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
