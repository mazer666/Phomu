/**
 * Spicy feedback quip in the active language.
 *
 * The quip itself is picked deterministically from the message pool (seeded
 * by the song id), so the same line is shown in every language. Only the
 * wording is translated — the German original stays the fallback for a
 * missing key.
 */
'use client';

import { useTranslation } from 'react-i18next';

import {
  CORRECT_MESSAGES,
  WRONG_MESSAGES,
  getSpicyMessage,
  hashSeed,
} from '@/utils/feedback-messages';
import {
  FEEDBACK_CORRECT_KEYS,
  FEEDBACK_WRONG_KEYS,
} from '@/i18n/variant-keys';

/**
 * Returns the spicy feedback quip for the given seed in the active language.
 * @param isCorrect whether the round was answered correctly
 * @param seed deterministic seed (the song id)
 */
export function useSpicyMessage(isCorrect: boolean, seed: string): string {
  const { t } = useTranslation();

  const pool = isCorrect ? CORRECT_MESSAGES : WRONG_MESSAGES;
  const keys = isCorrect ? FEEDBACK_CORRECT_KEYS : FEEDBACK_WRONG_KEYS;
  const index = hashSeed(seed) % pool.length;

  return t(keys[index % keys.length]!, {
    // The German original is the fallback for a missing key.
    defaultValue: getSpicyMessage(isCorrect, seed),
  });
}
