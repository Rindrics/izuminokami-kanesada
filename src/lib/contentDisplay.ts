import { getBookById, getSectionById } from '@/generated/books';
import { getContentById } from '@/generated/contents';

export interface ContentDisplayInfo {
  type: 'chapter' | 'section';
  title: string;
  preview: string;
  href: string;
}

/**
 * Get preview text for content (original text with ellipsis if needed)
 */
export function getPreviewText(contentId: string, maxLength = 30): string {
  const content = getContentById(contentId);
  if (!content || content.segments.length === 0) {
    return '';
  }
  const text = content.segments.map((s) => s.text.original).join('');
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

/**
 * Get display information for content (title, preview, href, type)
 */
export function getContentDisplayInfo(contentId: string): ContentDisplayInfo {
  const parts = contentId.split('/');
  const bookId = parts[0];
  const sectionId = parts[1];
  const chapterId = parts[2];

  const book = getBookById(bookId);
  const section = getSectionById(bookId, sectionId);

  if (chapterId) {
    const content = getContentById(contentId);
    return {
      type: 'chapter' as const,
      title: `${book?.name || bookId} ${section?.name || sectionId} ${content?.chapter || chapterId}`,
      preview: getPreviewText(contentId),
      href: `/books/${contentId}`,
    };
  } else {
    return {
      type: 'section' as const,
      title: `${book?.name || bookId} ${section?.name || sectionId}`,
      preview: section ? `${section.totalChapters}章` : '',
      href: `/books/${bookId}/${sectionId}`,
    };
  }
}
