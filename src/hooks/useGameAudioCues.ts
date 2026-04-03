'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { GameMode } from '@/config/game-config';
import { GAME_SFX, MODE_CUES } from '@/utils/game-audio-cues';

interface UseGameAudioCuesInput {
  currentMode: GameMode;
  roundPhase: 'drawing' | 'question' | 'locked-in' | 'reveal' | 'scoring';
  answerCount: number;
  lastAnswerCorrect: boolean | null;
  isGameOver: boolean;
  sfxEnabled: boolean;
  sfxVolume: number;
}

/**
 * One-shot audio cues for gameplay events.
 *
 * Design goals:
 * - Never interrupt normal music flow (only short SFX).
 * - No user-visible errors if assets are missing.
 * - Prevent duplicate triggers on rerenders.
 */
export function useGameAudioCues({
  currentMode,
  roundPhase,
  answerCount,
  lastAnswerCorrect,
  isGameOver,
  sfxEnabled,
  sfxVolume,
}: UseGameAudioCuesInput) {
  const previousPhaseRef = useRef(roundPhase);
  const previousAnswerCountRef = useRef(answerCount);
  const previousGameOverRef = useRef(isGameOver);
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const playCue = useCallback((assetPath: string, volume = 0.28) => {
    if (typeof window === 'undefined') return;
    if (!sfxEnabled) return;

    try {
      let audio = audioCacheRef.current.get(assetPath);
      if (!audio) {
        audio = new Audio(assetPath);
        audio.preload = 'auto';
        audioCacheRef.current.set(assetPath, audio);
      }

      audio.pause();
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume * sfxVolume));

      void audio.play().catch(() => {
        // Silent fail by design (missing asset / blocked autoplay / decode error)
      });
    } catch {
      // Silent fail by design
    }
  }, [sfxEnabled, sfxVolume]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;

    if (roundPhase === 'question' && previousPhase !== 'question') {
      playCue(MODE_CUES[currentMode], 0.22);
    }

    if (roundPhase === 'reveal' && previousPhase !== 'reveal') {
      playCue(GAME_SFX.reveal, 0.26);
    }

    previousPhaseRef.current = roundPhase;
  }, [roundPhase, currentMode, playCue]);

  useEffect(() => {
    if (answerCount > previousAnswerCountRef.current) {
      if (lastAnswerCorrect === true) {
        playCue(GAME_SFX.correct, 0.3);
      } else if (lastAnswerCorrect === false) {
        playCue(GAME_SFX.incorrect, 0.3);
      }
    }

    previousAnswerCountRef.current = answerCount;
  }, [answerCount, lastAnswerCorrect, playCue]);

  useEffect(() => {
    const previousGameOver = previousGameOverRef.current;
    if (isGameOver && !previousGameOver) {
      playCue(GAME_SFX.win, 0.34);
    }
    previousGameOverRef.current = isGameOver;
  }, [isGameOver, playCue]);
}
