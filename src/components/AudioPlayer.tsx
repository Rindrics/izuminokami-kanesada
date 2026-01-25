'use client';

import { useEffect, useRef, useState } from 'react';
import { type AudioLanguage, getAudioUrl, isAudioAvailable } from '@/lib/audio';

interface Props {
  bookId: string;
  sectionId: string;
  chapterId: string;
  contentId: string;
}

export function AudioPlayer({
  bookId,
  sectionId,
  chapterId,
  contentId,
}: Props) {
  const [lang, setLang] = useState<AudioLanguage>('zh');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const zhAvailable = isAudioAvailable(contentId, 'zh');
  const jaAvailable = isAudioAvailable(contentId, 'ja');

  // If current language is not available, switch to available one
  useEffect(() => {
    if (lang === 'zh' && !zhAvailable && jaAvailable) {
      setLang('ja');
    } else if (lang === 'ja' && !jaAvailable && zhAvailable) {
      setLang('zh');
    }
  }, [lang, zhAvailable, jaAvailable]);

  const currentLangAvailable =
    (lang === 'zh' && zhAvailable) || (lang === 'ja' && jaAvailable);

  const audioUrl = getAudioUrl(bookId, sectionId, chapterId, lang);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
      });
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (isLooping && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error('Failed to play audio:', error);
      });
      setIsPlaying(true);
    }
  };

  const handleLanguageChange = (newLang: AudioLanguage) => {
    const wasPlaying = isPlaying;
    if (wasPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setLang(newLang);
    // Resume playing if it was playing before
    if (wasPlaying) {
      setTimeout(() => {
        audioRef.current?.play().catch((error) => {
          console.error('Failed to play audio:', error);
        });
        setIsPlaying(true);
      }, 100);
    }
  };

  if (!zhAvailable && !jaAvailable) {
    return null;
  }

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        音声読み上げ
      </h2>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!currentLangAvailable}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? (
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <title>一時停止</title>
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg
              className="ml-1 h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <title>再生</title>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex gap-2">
            {jaAvailable && (
              <button
                type="button"
                onClick={() => handleLanguageChange('ja')}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  lang === 'ja'
                    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                音読み
              </button>
            )}
            {zhAvailable && (
              <button
                type="button"
                onClick={() => handleLanguageChange('zh')}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  lang === 'zh'
                    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                ピンイン
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={isLooping}
              onChange={(e) => setIsLooping(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-600 focus:ring-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
            />
            <span>ループ再生</span>
          </label>
        </div>
      </div>

      {/* biome-ignore lint/a11y/useMediaCaption: TTS audio does not require captions */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          console.error('Audio playback error:', e);
          setIsPlaying(false);
        }}
      />
    </section>
  );
}
