import type { Metadata } from 'next';

/**
 * Creates metadata for a page with common defaults
 */
export function createMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  // Truncate description to 160 characters (SEO best practice)
  const truncatedDescription =
    description.length > 160
      ? description.substring(0, 157) + '...'
      : description;

  return {
    title,
    description: truncatedDescription,
    openGraph: {
      title,
      description: truncatedDescription,
      url: path,
    },
    twitter: {
      title,
      description: truncatedDescription,
    },
  };
}

/**
 * Removes tone sandhi markers from Chinese text
 */
export function cleanChineseText(text: string): string {
  return text.replace(/-/g, '');
}
