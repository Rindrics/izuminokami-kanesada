'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  bookId: string;
  sectionId: string;
  chapterId: string;
  onSaved?: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'saving';

export function AudioRecorder({
  bookId,
  sectionId,
  chapterId,
  onSaved,
}: Props) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Cleanup on unmount: stop recording and release microphone
  useEffect(() => {
    return () => {
      // Stop MediaRecorder if recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording'
      ) {
        mediaRecorderRef.current.stop();
      }

      // Stop all tracks to release microphone
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('recorded');

        // Stop all tracks to release microphone
        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) {
            track.stop();
          }
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setState('recording');
    } catch (err) {
      setError(
        'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。',
      );
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setState('idle');
    chunksRef.current = [];
  };

  const saveRecording = async () => {
    if (chunksRef.current.length === 0) {
      setError('録音データがありません');
      return;
    }

    setState('saving');
    setError(null);

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, `${chapterId}-ja.webm`);
      formData.append('bookId', bookId);
      formData.append('sectionId', sectionId);
      formData.append('chapterId', chapterId);

      const response = await fetch('/api/audio/save', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      // Clean up
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      setState('idle');
      chunksRef.current = [];

      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
      setState('recorded');
      console.error('Failed to save recording:', err);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        音読み録音（開発環境）
      </h3>

      {error && (
        <div className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {state === 'idle' && (
          <button
            type="button"
            onClick={startRecording}
            className="rounded bg-red-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-600"
          >
            録音開始
          </button>
        )}

        {state === 'recording' && (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded bg-zinc-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-700"
          >
            停止
          </button>
        )}

        {state === 'recorded' && (
          <>
            <button
              type="button"
              onClick={saveRecording}
              className="rounded bg-green-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-600"
            >
              保存
            </button>
            <button
              type="button"
              onClick={discardRecording}
              className="rounded bg-zinc-400 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-500"
            >
              破棄
            </button>
          </>
        )}

        {state === 'saving' && (
          <span className="px-3 py-1.5 text-sm text-zinc-500">保存中...</span>
        )}
      </div>

      {/* Recording indicator */}
      {state === 'recording' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          録音中...
        </div>
      )}

      {/* Preview player */}
      {audioUrl && state === 'recorded' && (
        <div className="mt-3">
          {/* biome-ignore lint/a11y/useMediaCaption: Preview audio does not require captions */}
          <audio ref={audioRef} src={audioUrl} controls className="w-full" />
        </div>
      )}
    </div>
  );
}
