'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AudioLanguage,
  getSegmentAudioUrl,
  isAudioAvailable,
} from '@/lib/audio';

interface Props {
  bookId: string;
  sectionId: string;
  chapterId: string;
  contentId: string;
  segmentCount: number;
  segmentTexts: string[];
}

export function AudioPlayer({
  bookId,
  sectionId,
  chapterId,
  contentId,
  segmentCount,
  segmentTexts,
}: Props) {
  const zhAvailable = isAudioAvailable(contentId, 'zh');
  const jaAvailable = isAudioAvailable(contentId, 'ja');

  const getValidLang = (): AudioLanguage => {
    if (zhAvailable) return 'zh';
    if (jaAvailable) return 'ja';
    return 'zh';
  };

  const [lang, setLang] = useState<AudioLanguage>(getValidLang);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<boolean[]>(() =>
    new Array(segmentCount).fill(true),
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset when content changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentId change should reset state
  useEffect(() => {
    setSelectedSegments(new Array(segmentCount).fill(true));
    setCurrentSegment(null);
    setIsPlaying(false);
  }, [segmentCount, contentId]);

  // Reset language when availability changes
  useEffect(() => {
    const currentLangAvailable =
      (lang === 'zh' && zhAvailable) || (lang === 'ja' && jaAvailable);
    if (!currentLangAvailable) {
      const validLang = zhAvailable ? 'zh' : jaAvailable ? 'ja' : 'zh';
      setLang(validLang);
    }
  }, [lang, zhAvailable, jaAvailable]);

  const currentLangAvailable =
    (lang === 'zh' && zhAvailable) || (lang === 'ja' && jaAvailable);

  // Get first selected segment index
  const getFirstSelectedSegment = useCallback((): number | null => {
    const idx = selectedSegments.findIndex((s) => s);
    return idx >= 0 ? idx : null;
  }, [selectedSegments]);

  // Get next selected segment after current
  const getNextSelectedSegment = useCallback(
    (current: number): number | null => {
      for (let i = current + 1; i < selectedSegments.length; i++) {
        if (selectedSegments[i]) return i;
      }
      return null;
    },
    [selectedSegments],
  );

  // Play a specific segment
  const playSegment = useCallback(
    (segmentIndex: number) => {
      const url = getSegmentAudioUrl(
        bookId,
        sectionId,
        chapterId,
        segmentIndex,
        lang,
      );

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        const next = getNextSelectedSegment(segmentIndex);
        if (next !== null) {
          setCurrentSegment(next);
          playSegment(next);
        } else if (isLooping) {
          const first = getFirstSelectedSegment();
          if (first !== null) {
            setCurrentSegment(first);
            playSegment(first);
          } else {
            setIsPlaying(false);
            setCurrentSegment(null);
          }
        } else {
          setIsPlaying(false);
          setCurrentSegment(null);
        }
      });

      audio.addEventListener('error', () => {
        setIsPlaying(false);
        setCurrentSegment(null);
      });

      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
        setCurrentSegment(null);
      });
    },
    [
      bookId,
      sectionId,
      chapterId,
      lang,
      isLooping,
      getNextSelectedSegment,
      getFirstSelectedSegment,
    ],
  );

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentSegment(null);
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      // Start from first selected segment
      const first = getFirstSelectedSegment();
      if (first !== null) {
        setIsPlaying(true);
        setCurrentSegment(first);
        playSegment(first);
      }
    }
  };

  const handleLanguageChange = (newLang: AudioLanguage) => {
    const wasPlaying = isPlaying;
    const wasSegment = currentSegment;

    if (wasPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setLang(newLang);

    // Resume playing if it was playing before
    if (wasPlaying && wasSegment !== null) {
      setTimeout(() => {
        setIsPlaying(true);
        playSegment(wasSegment);
      }, 100);
    }
  };

  const toggleSegment = (index: number) => {
    // Stop playback when selection changes
    stopPlayback();
    setSelectedSegments((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const selectAll = () => {
    stopPlayback();
    setSelectedSegments(new Array(segmentCount).fill(true));
  };

  const selectNone = () => {
    stopPlayback();
    setSelectedSegments(new Array(segmentCount).fill(false));
  };

  // Get preview text (first few chars without hyphens, with fadeout effect)
  const getPreviewText = (text: string): string => {
    const clean = text.replace(/-/g, '').replace(/ /g, '');
    return clean.slice(0, 4);
  };

  const selectedCount = selectedSegments.filter(Boolean).length;

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
          disabled={!currentLangAvailable || selectedCount === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          aria-label={isPlaying ? '停止' : '再生'}
        >
          {isPlaying ? (
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <title>停止</title>
              <rect x="6" y="6" width="12" height="12" />
            </svg>
          ) : (
            <svg
              className="ml-1 h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <title>再生</title>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex flex-1 flex-col gap-2">
          {zhAvailable && jaAvailable && (
            <div className="flex gap-2">
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
            </div>
          )}

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

      {/* Segment selection */}
      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            再生する文節
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              全選択
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              全解除
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedSegments.map((selected, index) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: segment indices are stable
              key={index}
              type="button"
              onClick={() => toggleSegment(index)}
              className={`rounded px-2 py-1 text-sm transition-colors ${
                selected
                  ? 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600'
                  : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700'
              }`}
              aria-label={`文節 ${index + 1}`}
              aria-pressed={selected}
            >
              <span
                style={{
                  background:
                    'linear-gradient(to right, currentColor 0%, currentColor 40%, transparent 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {getPreviewText(segmentTexts[index] || '')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
