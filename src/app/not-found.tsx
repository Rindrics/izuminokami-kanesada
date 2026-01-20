import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <p className="text-6xl font-light tracking-widest text-zinc-300 dark:text-zinc-700">
          四〇四
        </p>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            此路不通
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            お探しのコンテンツはありません
          </p>
        </div>

        <blockquote className="max-w-md border-l-2 border-zinc-300 pl-4 text-left dark:border-zinc-700">
          <p className="text-zinc-600 dark:text-zinc-400">
            子曰く、過ちて改めざる、是を過ちと謂う。
          </p>
          <footer className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
            ― 論語・衛霊公第十五-30
          </footer>
        </blockquote>

        <Link
          href="/"
          className="rounded-lg bg-zinc-900 px-6 py-3 text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
          title="書籍一覧へ戻る"
        >
          歸去來兮
        </Link>
      </main>
    </div>
  );
}
