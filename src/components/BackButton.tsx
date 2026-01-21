'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
    >
      ← 戻る
    </button>
  );
}
