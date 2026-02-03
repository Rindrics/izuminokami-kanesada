'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface KeyboardNavigationProps {
  prevUrl: string | null;
  nextUrl: string | null;
  prevLabel?: string;
  nextLabel?: string;
}

/**
 * Keyboard navigation component for content pages
 * - Press 'n' to go to next content
 * - Press 'p' to go to previous content
 * - Shows navigation buttons with tooltip hint on hover
 */
export function KeyboardNavigation({
  prevUrl,
  nextUrl,
  prevLabel,
  nextLabel,
}: KeyboardNavigationProps) {
  const displayPrevLabel = prevLabel ?? '前の章';
  const displayNextLabel = nextLabel ?? '次の章';
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

  return (
    <nav className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
      {prevUrl ? (
        <Link
          href={prevUrl}
          className="group relative flex items-center gap-2 rounded-lg px-4 py-2 text-zinc-700 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <span>←</span>
          <span>{displayPrevLabel}</span>
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity delay-100 group-hover:opacity-100 dark:bg-zinc-200 dark:text-black">
            ショートカット: p
          </span>
        </Link>
      ) : (
        <div />
      )}
      {nextUrl ? (
        <Link
          href={nextUrl}
          className="group relative flex items-center gap-2 rounded-lg px-4 py-2 text-zinc-700 transition hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <span>{displayNextLabel}</span>
          <span>→</span>
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity delay-100 group-hover:opacity-100 dark:bg-zinc-200 dark:text-black">
            ショートカット: n
          </span>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
