'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface KeyboardNavigationProps {
  prevUrl: string | null;
  nextUrl: string | null;
}

/**
 * Keyboard navigation component for content pages
 * - Press 'n' to go to next content
 * - Press 'p' to go to previous content
 */
export function KeyboardNavigation({
  prevUrl,
  nextUrl,
}: KeyboardNavigationProps) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === 'n' && nextUrl) {
        router.push(nextUrl);
      } else if (event.key === 'p' && prevUrl) {
        router.push(prevUrl);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, prevUrl, nextUrl]);

  // Render navigation hints
  return (
    <div className="fixed bottom-4 right-4 flex gap-2 text-xs text-zinc-400 dark:text-zinc-600">
      {prevUrl && (
        <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
          p: 前へ
        </span>
      )}
      {nextUrl && (
        <span className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
          n: 次へ
        </span>
      )}
    </div>
  );
}
