'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface KeyboardNavigationProps {
  prevUrl: string | null;
  nextUrl: string | null;
  prevLabel?: string;
  nextLabel?: string;
  renderUI?: boolean;
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
  renderUI = true,
}: KeyboardNavigationProps) {
  const displayPrevLabel = prevLabel ?? '前の章';
  const displayNextLabel = nextLabel ?? '次の章';
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Guard against modifier keys (Ctrl, Cmd, Alt)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Guard against composition and repeat events
      if (event.isComposing || event.repeat || event.defaultPrevented) {
        return;
      }

      const target = event.target as HTMLElement | null;

      // Ignore if user is typing in an input field, textarea, select, or contenteditable element
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target && target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'n' && nextUrl) {
        event.preventDefault();
        router.push(nextUrl);
      } else if (key === 'p' && prevUrl) {
        event.preventDefault();
        router.push(prevUrl);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, prevUrl, nextUrl]);

  if (!renderUI) {
    return null;
  }

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
