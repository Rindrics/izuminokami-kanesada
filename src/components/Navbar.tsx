import Link from 'next/link';
import { AuthButton } from './AuthButton';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-bold text-black hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
        >
          素読庵
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm">
            <Link
              href="/"
              className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
              経書一覧
            </Link>
            <Link
              href="/sakuin"
              className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
              索引
            </Link>
            <Link
              href="/stats"
              className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
            >
              統計
            </Link>
          </div>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
