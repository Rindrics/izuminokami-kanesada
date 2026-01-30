'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type AudioLanguage, getSegmentAudioUrl } from '@/lib/audio';

interface Props {
  bookId: string;
  sectionId: string;
  chapterId: string;
  segmentIndex: number;
  lang?: AudioLanguage;
}

export function SegmentPlayButton({
  bookId,
  sectionId,
  chapterId,
  segmentIndex,
  lang = 'zh',
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = getSegmentAudioUrl(
    bookId,
    sectionId,
    chapterId,
    segmentIndex,
    lang,
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    } else {
      // Play
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.addEventListener('ended', () => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
        });
        audioRef.current.addEventListener('error', () => {
          setIsPlaying(false);
        });
      }
      audioRef.current.play().catch((error) => {
        console.error('Failed to play segment audio:', error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  return (
    <button
      type="button"
      onClick={handlePlay}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
        isPlaying
          ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-black'
          : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600'
      }`}
      aria-label={isPlaying ? '停止' : '再生'}
      title={isPlaying ? '停止' : 'ループ再生'}
    >
      {isPlaying ? (
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>停止</title>
          <rect x="6" y="6" width="12" height="12" />
        </svg>
      ) : (
        <svg
          className="w-3 h-3 ml-0.5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>再生</title>
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
