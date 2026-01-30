'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State machine for segment-based audio player
 * Based on TLA+ model verification (models/AudioPlayer.tla)
 *
 * Verified properties:
 * - RangeIsOrdered: rangeStart <= rangeEnd
 * - PlayingHasCurrentSegment: playing => currentSegment > 0
 * - StoppedHasNoCurrentSegment: stopped => currentSegment === null
 * - CurrentSegmentInRange: currentSegment is within valid range
 */

export type PlayState = 'stopped' | 'playing';
export type PlayMode = 'full' | 'range';

export interface SegmentPlayerState {
  playState: PlayState;
  mode: PlayMode;
  loopEnabled: boolean;
  rangeStart: number;
  rangeEnd: number;
  currentSegment: number | null; // null when stopped, 0-indexed when playing
}

export interface SegmentPlayerActions {
  play: () => void;
  pause: () => void;
  toggleLoop: () => void;
  setRange: (start: number, end: number) => void;
  setFullMode: () => void;
  playSingleSegment: (segmentIndex: number) => void;
  onSegmentComplete: () => void;
}

interface UseSegmentPlayerProps {
  numSegments: number;
  onSegmentChange?: (segmentIndex: number | null) => void;
}

export function useSegmentPlayer({
  numSegments,
  onSegmentChange,
}: UseSegmentPlayerProps): [SegmentPlayerState, SegmentPlayerActions] {
  // Initial state matches TLA+ Init
  const [state, setState] = useState<SegmentPlayerState>({
    playState: 'stopped',
    mode: 'full',
    loopEnabled: false,
    rangeStart: 0,
    rangeEnd: numSegments - 1,
    currentSegment: null,
  });

  // Track previous segment for change detection
  const prevSegmentRef = useRef<number | null>(null);

  // Notify on segment change
  useEffect(() => {
    if (state.currentSegment !== prevSegmentRef.current) {
      prevSegmentRef.current = state.currentSegment;
      onSegmentChange?.(state.currentSegment);
    }
  }, [state.currentSegment, onSegmentChange]);

  // Update range bounds when numSegments changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      rangeEnd: Math.min(prev.rangeEnd, numSegments - 1),
      rangeStart: Math.min(prev.rangeStart, numSegments - 1),
    }));
  }, [numSegments]);

  // Helper: get first segment of current range
  const getFirstSegment = useCallback(
    (mode: PlayMode, rangeStart: number): number => {
      return mode === 'full' ? 0 : rangeStart;
    },
    [],
  );

  // Helper: get last segment of current range
  const getLastSegment = useCallback(
    (mode: PlayMode, rangeEnd: number): number => {
      return mode === 'full' ? numSegments - 1 : rangeEnd;
    },
    [numSegments],
  );

  // Action: Play (matches TLA+ Play action)
  const play = useCallback(() => {
    setState((prev) => {
      if (prev.playState === 'playing') return prev;
      return {
        ...prev,
        playState: 'playing',
        currentSegment: getFirstSegment(prev.mode, prev.rangeStart),
      };
    });
  }, [getFirstSegment]);

  // Action: Pause (matches TLA+ Pause action)
  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.playState === 'stopped') return prev;
      return {
        ...prev,
        playState: 'stopped',
        currentSegment: null,
      };
    });
  }, []);

  // Action: Toggle Loop (matches TLA+ ToggleLoop action)
  const toggleLoop = useCallback(() => {
    setState((prev) => ({
      ...prev,
      loopEnabled: !prev.loopEnabled,
    }));
  }, []);

  // Action: Set Range (matches TLA+ SetRange action)
  const setRange = useCallback(
    (start: number, end: number) => {
      // Validate: start <= end (RangeIsOrdered invariant)
      if (start > end || start < 0 || end >= numSegments) {
        console.warn('Invalid range:', { start, end, numSegments });
        return;
      }

      setState((prev) => ({
        ...prev,
        mode: 'range',
        rangeStart: start,
        rangeEnd: end,
        // If playing, restart from range start
        currentSegment: prev.playState === 'playing' ? start : null,
      }));
    },
    [numSegments],
  );

  // Action: Set Full Mode (matches TLA+ SetFullMode action)
  const setFullMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'full',
      rangeStart: 0,
      rangeEnd: numSegments - 1,
      // If playing, restart from beginning
      currentSegment: prev.playState === 'playing' ? 0 : null,
    }));
  }, [numSegments]);

  // Action: Play Single Segment (matches TLA+ PlaySingleSegment action)
  const playSingleSegment = useCallback(
    (segmentIndex: number) => {
      if (segmentIndex < 0 || segmentIndex >= numSegments) {
        console.warn('Invalid segment index:', segmentIndex);
        return;
      }

      setState({
        playState: 'playing',
        mode: 'range',
        rangeStart: segmentIndex,
        rangeEnd: segmentIndex,
        currentSegment: segmentIndex,
        loopEnabled: true, // Single segment auto-loops
      });
    },
    [numSegments],
  );

  // Action: On Segment Complete (matches TLA+ Advance action)
  const onSegmentComplete = useCallback(() => {
    setState((prev) => {
      if (prev.playState !== 'playing' || prev.currentSegment === null) {
        return prev;
      }

      const lastSegment = getLastSegment(prev.mode, prev.rangeEnd);
      const currentSeg = prev.currentSegment;

      if (currentSeg < lastSegment) {
        // Next segment exists
        return {
          ...prev,
          currentSegment: currentSeg + 1,
        };
      }

      // Reached end of range
      if (prev.loopEnabled) {
        // Loop: go back to start
        const firstSegment = getFirstSegment(prev.mode, prev.rangeStart);
        return {
          ...prev,
          currentSegment: firstSegment,
        };
      }

      // Stop
      return {
        ...prev,
        playState: 'stopped',
        currentSegment: null,
      };
    });
  }, [getFirstSegment, getLastSegment]);

  const actions: SegmentPlayerActions = {
    play,
    pause,
    toggleLoop,
    setRange,
    setFullMode,
    playSingleSegment,
    onSegmentComplete,
  };

  return [state, actions];
}
