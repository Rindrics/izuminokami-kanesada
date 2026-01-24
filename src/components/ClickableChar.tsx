'use client';

import Link from 'next/link';

interface ClickableCharProps {
  char: string;
  className?: string;
}

/**
 * A clickable character that links to the character's content list page.
 * Looks like normal text but is clickable.
 */
export function ClickableChar({ char, className = '' }: ClickableCharProps) {
  // Only make CJK characters clickable
  const isCJK = /[\u4e00-\u9fff]/.test(char);

  if (!isCJK) {
    return <span className={className}>{char}</span>;
  }

  return (
    <Link
      href={`/char/${char}`}
      className={`cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800 ${className}`}
    >
      {char}
    </Link>
  );
}
