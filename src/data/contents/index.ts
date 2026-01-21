import type { Content } from '@/types/content';
import { lunyuContents } from './lunyu';

// Re-export individual book contents
export { lunyuContents } from './lunyu';

/**
 * All contents from all books
 */
export const contents: Content[] = [...lunyuContents];

// Content queries
export function getContentById(id: string): Content | undefined {
  return contents.find((c) => c.content_id === id);
}

export function getAllContentIds(): string[] {
  return contents.map((c) => c.content_id);
}
