'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLinkProps = {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
};

export function NavLink({ href, exact, children }: NavLinkProps) {
  const pathname = usePathname();

  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={
        isActive
          ? 'rounded bg-zinc-100 px-2 py-1 text-black dark:bg-zinc-800 dark:text-white'
          : 'px-2 py-1 text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white'
      }
    >
      {children}
    </Link>
  );
}
