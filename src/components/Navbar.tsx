import Link from 'next/link';
import { AuthButton } from './AuthButton';
import { NavLink } from './NavLink';

export function Navbar() {
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
            <NavLink href="/" exact>
              経書一覧
            </NavLink>
            <NavLink href="/sakuin">索引</NavLink>
            <NavLink href="/stats">統計</NavLink>
          </div>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
