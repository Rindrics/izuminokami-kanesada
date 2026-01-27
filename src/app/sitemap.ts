import type { MetadataRoute } from 'next';
import { books } from '@/generated/books';
import { getAllContentIds } from '@/generated/contents';

/**
 * Sitemap generator for search engine optimization
 *
 * This file automatically generates sitemap.xml at build time.
 * The sitemap includes all content pages, book pages, and section pages.
 *
 * URL Structure:
 * - Homepage: /
 * - Book page: /books/{bookId}/
 * - Section page: /books/{bookId}/{sectionId}/
 * - Content page: /books/{bookId}/{sectionId}/{chapterId}/
 * - Stats page: /stats/
 */

// Required for Next.js static export mode
export const dynamic = 'force-static';

// Get site URL from environment variable
// Configured in next.config.ts for production builds
// Can be overridden with .env.local for local development
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  // Homepage
  const homepage: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];

  // Stats page
  const statsPage: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/stats/`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // Book pages: /books/{bookId}/
  const bookPages: MetadataRoute.Sitemap = books.map((book) => ({
    url: `${BASE_URL}/books/${book.id}/`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Section pages: /books/{bookId}/{sectionId}/
  const sectionPages: MetadataRoute.Sitemap = books.flatMap((book) =>
    book.sections
      .filter((section) => section.chapters.length > 0) // Only include sections with content
      .map((section) => ({
        url: `${BASE_URL}/books/${book.id}/${section.id}/`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
      })),
  );

  // Content pages: /books/{bookId}/{sectionId}/{chapterId}/
  const contentPages: MetadataRoute.Sitemap = getAllContentIds().map(
    (contentId) => ({
      url: `${BASE_URL}/books/${contentId}/`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
  );

  return [
    ...homepage,
    ...statsPage,
    ...bookPages,
    ...sectionPages,
    ...contentPages,
  ];
}
