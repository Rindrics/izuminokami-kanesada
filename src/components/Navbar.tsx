'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthButton } from './AuthButton';

const navLinks = [
  { href: '/', label: '経書一覧', exact: true },
  { href: '/sakuin', label: '索引' },
  { href: '/stats', label: '統計' },
];

export function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-(--navbar-height) max-w-4xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-bold text-black hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
        >
          素読庵
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm">
            {navLinks.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={
                  isActive(href, exact)
                    ? 'rounded bg-zinc-100 px-2 py-1 text-black dark:bg-zinc-800 dark:text-white'
                    : 'px-2 py-1 text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white'
                }
              >
                {label}
              </Link>
            ))}
          </div>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
