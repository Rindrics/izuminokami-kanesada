'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function AuthButton() {
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
  } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowLoginForm(false);
        setShowSignUpForm(false);
        setShowResetForm(false);
        setError(null);
        setMessage(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        読み込み中...
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="border-b border-zinc-400 text-sm text-zinc-600 hover:border-zinc-600 hover:text-black dark:border-zinc-500 dark:text-zinc-400 dark:hover:border-zinc-300 dark:hover:text-white"
          aria-expanded={showUserMenu}
          aria-haspopup="true"
        >
          {user.displayName || user.email}
        </button>
        {showUserMenu && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setShowUserMenu(false)}
              aria-label="メニューを閉じる"
              tabIndex={-1}
            />
            <div className="absolute right-0 top-full z-50 mt-2 min-w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <Link
                href="/favorites"
                onClick={() => setShowUserMenu(false)}
                className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                お気に入り一覧
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setShowUserMenu(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                我退門也
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const handleEmailAuth = async (isSignUp: boolean) => {
    setError(null);
    setMessage(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setMessage('アカウントを作成しました');
        setTimeout(() => {
          setShowSignUpForm(false);
          setEmail('');
          setPassword('');
          setMessage(null);
        }, 1500);
      } else {
        await signInWithEmail(email, password);
        setShowLoginForm(false);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(isSignUp ? '登録に失敗しました' : 'ログインに失敗しました');
      }
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);
    try {
      await resetPassword(email);
      setMessage('パスワードリセットメールを送信しました');
      setTimeout(() => {
        setShowResetForm(false);
        setEmail('');
        setMessage(null);
      }, 1500);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('パスワードリセットに失敗しました');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Google ログインに失敗しました');
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setShowLoginForm(!showLoginForm);
            setShowSignUpForm(false);
            setShowResetForm(false);
            setError(null);
            setMessage(null);
          }}
          className="border-b border-zinc-400 text-sm text-zinc-600 hover:border-zinc-600 hover:text-black dark:border-zinc-500 dark:text-zinc-400 dark:hover:border-zinc-300 dark:hover:text-white"
        >
          我入門也
        </button>
      </div>

      {(showLoginForm || showSignUpForm || showResetForm) && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => {
              setShowLoginForm(false);
              setShowSignUpForm(false);
              setShowResetForm(false);
              setError(null);
              setMessage(null);
            }}
            aria-label="フォームを閉じる"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {showResetForm ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  パスワードリセット
                </h3>
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                {error && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {message}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    送信
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetForm(false);
                      setError(null);
                      setMessage(null);
                    }}
                    className="rounded bg-zinc-200 px-3 py-2 text-sm text-black hover:bg-zinc-300 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : showSignUpForm ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  新規登録
                </h3>
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <input
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                {error && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {message}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleEmailAuth(true)}
                  className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  登録
                </button>
                <div className="flex justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignUpForm(false);
                      setShowLoginForm(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    ログインに戻る
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignUpForm(false);
                      setShowResetForm(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    パスワードを忘れた場合
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  ログイン
                </h3>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                >
                  Google でログイン
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      または
                    </span>
                  </div>
                </div>
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <input
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                {error && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleEmailAuth(false)}
                  className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  ログイン
                </button>
                <div className="flex justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginForm(false);
                      setShowSignUpForm(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    新規登録
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginForm(false);
                      setShowResetForm(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    パスワードを忘れた場合
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
