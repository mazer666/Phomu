/**
 * Mode rules — the extracted game logic
 *
 * WHY: these tests pin the rules that were extracted from the React mode
 * components into `src/utils/mode-rules.ts`. They are the regression guard
 * for the extraction: if a rule changes, the conformance vectors change
 * with it — and these tests show which rule changed.
 */
import { describe, it, expect } from 'vitest';
import {
  CHEAT_PENALTY_HINT_MASTER_MUSIC,
  CHEAT_PENALTY_SURVIVOR,
  CHEAT_PENALTY_TIMELINE_DECADE,
  CHEAT_PENALTY_TIMELINE_JOKER,
  COVER_CONFUSION_VARIATION_POINTS,
  LYRICS_BONUS_POINTS,
  LYRICS_POINTS,
  SURVIVOR_POINTS,
  TIMELINE_REMOVAL_THRESHOLD,
  VIBE_CHECK_POINTS,
  VIBE_CHECK_POINTS_CHEATED,
  answerLabel,
  coverConfusionAward,
  coverConfusionPoints,
  coverConfusionVariationAward,
  evaluateModeAnswer,
  hintMasterAward,
  hintMasterPoints,
  lyricsAward,
  lyricsBonusAward,
  resolveAnswerPoints,
  survivorAward,
  timelineAnswerEffect,
  timelineCanonicalSlot,
  timelinePoints,
  timelineValidSlots,
  vibeCheckAward,
} from '@/utils/mode-rules';
import type { GameConfig } from '@/types/game-state';
import { PHOMU_CONFIG } from '@/config/game-config';

const BASE_CONFIG = {
  timeDecayEnabled: false,
  timeDecayGraceSeconds: 5,
  timeDecayStepSeconds: 5,
  timeDecayStepPoints: 1,
  minPointsPerCorrect: 1,
  timelineMaxPoints: 5,
} as unknown as GameConfig;

const SONG = {
  id: 's1',
  year: 1985,
  mood: ['Dance Floor', 'Epic'],
  isOneHitWonder: false,
  artist: 'The Example',
  links: {},
};

describe('timeline rules', () => {
  it('accepts the canonical slot for a year between two entries', () => {
    const slots = timelineValidSlots(1985, [1970, 1980, 1990]);
    expect([...slots].sort()).toEqual([2]);
    expect(timelineCanonicalSlot(1985, [1970, 1980, 1990])).toBe(2);
  });

  it('accepts the slot before and after a duplicate year', () => {
    const slots = timelineValidSlots(1980, [1970, 1980, 1990]);
    expect([...slots].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('accepts the last slot for a year after the last entry', () => {
    const slots = timelineValidSlots(2000, [1970, 1980, 1990]);
    expect([...slots]).toEqual([3]);
    expect(timelineCanonicalSlot(2000, [1970, 1980, 1990])).toBe(3);
  });

  it('awards one point per year and caps at the configured maximum', () => {
    expect(timelinePoints(0, 5)).toBe(1);
    expect(timelinePoints(3, 5)).toBe(4);
    expect(timelinePoints(9, 5)).toBe(5);
  });

  it('marks a duplicate year and offers no removal', () => {
    expect(timelineAnswerEffect([1970, 1980], 1980)).toEqual({
      isDuplicate: true,
      removalOffered: false,
    });
  });

  it('offers a removal from the eleventh year on', () => {
    const years = Array.from(
      { length: TIMELINE_REMOVAL_THRESHOLD },
      (_, i) => 1950 + i
    );
    expect(timelineAnswerEffect(years, 2020)).toEqual({
      isDuplicate: false,
      removalOffered: true,
    });
    expect(timelineAnswerEffect(years.slice(0, 9), 2020).removalOffered).toBe(
      false
    );
  });
});

describe('hint-master rules', () => {
  it('maps the hint levels to the configured point values', () => {
    expect([1, 2, 3, 4, 5].map(hintMasterPoints)).toEqual([
      ...PHOMU_CONFIG.HINT_MASTER_POINTS,
    ]);
  });

  it('gives the full amount for "both" and half for a partial answer', () => {
    expect(hintMasterAward(1, 'both')).toEqual({ isCorrect: true, points: 5 });
    expect(hintMasterAward(1, 'artist')).toEqual({
      isCorrect: true,
      points: 3,
    });
    expect(hintMasterAward(4, 'artist')).toEqual({
      isCorrect: true,
      points: 1,
    });
    expect(hintMasterAward(2, 'none')).toEqual({ isCorrect: false, points: 0 });
  });
});

describe('lyrics rules', () => {
  it('awards the base amount for the fake line only', () => {
    expect(lyricsAward(true)).toEqual({
      isCorrect: true,
      points: LYRICS_POINTS,
    });
    expect(lyricsAward(false)).toEqual({ isCorrect: false, points: 0 });
  });

  it('awards the bonus amount when the bonus round is claimed', () => {
    expect(lyricsBonusAward(true)).toEqual({
      isCorrect: true,
      points: LYRICS_BONUS_POINTS,
    });
    expect(lyricsBonusAward(false)).toEqual({ isCorrect: false, points: 0 });
  });
});

describe('vibe-check rules', () => {
  it('awards two points for a matching mood', () => {
    expect(vibeCheckAward(['Dance Floor'], 'Dance Floor', false)).toEqual({
      isCorrect: true,
      points: VIBE_CHECK_POINTS,
    });
  });

  it('awards one point after the cheat', () => {
    expect(vibeCheckAward(['Dance Floor'], 'Dance Floor', true)).toEqual({
      isCorrect: true,
      points: VIBE_CHECK_POINTS_CHEATED,
    });
  });

  it('awards nothing for a mood the song does not have', () => {
    expect(vibeCheckAward(['Dance Floor'], 'Chill', false)).toEqual({
      isCorrect: false,
      points: 0,
    });
  });
});

describe('survivor rules', () => {
  it('awards the base amount for a matching guess', () => {
    expect(survivorAward(false, false)).toEqual({
      isCorrect: true,
      points: SURVIVOR_POINTS,
    });
    expect(survivorAward(true, true)).toEqual({
      isCorrect: true,
      points: SURVIVOR_POINTS,
    });
  });

  it('awards nothing for a wrong guess', () => {
    expect(survivorAward(true, false)).toEqual({ isCorrect: false, points: 0 });
  });
});

describe('cover-confusion rules', () => {
  it('reduces the points with every hint used', () => {
    expect([0, 1, 2, 3].map(coverConfusionPoints)).toEqual([5, 4, 3, 2]);
  });

  it('awards nothing for a wrong answer', () => {
    expect(coverConfusionAward(0, false)).toEqual({
      isCorrect: false,
      points: 0,
    });
    expect(coverConfusionAward(1, true)).toEqual({
      isCorrect: true,
      points: 4,
    });
  });

  it('awards the variation amount for "cover or original?"', () => {
    expect(coverConfusionVariationAward(true, true)).toEqual({
      isCorrect: true,
      points: COVER_CONFUSION_VARIATION_POINTS,
    });
    expect(coverConfusionVariationAward(false, true)).toEqual({
      isCorrect: false,
      points: 0,
    });
  });
});

describe('central scoring', () => {
  it('labels the answer', () => {
    expect(answerLabel(true)).toBe('correct');
    expect(answerLabel(false)).toBe('incorrect');
  });

  it('keeps the base amount when the time decay is off', () => {
    expect(resolveAnswerPoints(4, true, 120, BASE_CONFIG)).toBe(4);
  });

  it('deducts one point per decay step and keeps the minimum', () => {
    const config = {
      ...BASE_CONFIG,
      timeDecayEnabled: true,
      minPointsPerCorrect: 1,
    };
    expect(resolveAnswerPoints(4, true, 10, config)).toBe(3);
    expect(resolveAnswerPoints(4, true, 60, config)).toBe(1);
  });

  it('never deducts from a wrong answer', () => {
    const config = { ...BASE_CONFIG, timeDecayEnabled: true };
    expect(resolveAnswerPoints(0, false, 600, config)).toBe(0);
  });
});

describe('the mode registry', () => {
  it('dispatches every answer kind of every mode', () => {
    const context = { timelineYears: [1970, 1980, 1990], config: BASE_CONFIG };

    expect(
      evaluateModeAnswer(
        'timeline',
        { kind: 'timeline', slot: 2 },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 4 });
    expect(
      evaluateModeAnswer(
        'hint-master',
        { kind: 'hint-master', level: 2, knew: 'both' },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 4 });
    expect(
      evaluateModeAnswer(
        'lyrics',
        { kind: 'lyrics', picked: 'fake' },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 4 });
    expect(
      evaluateModeAnswer(
        'lyrics-bonus',
        { kind: 'lyrics-bonus', claimed: true },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 2 });
    expect(
      evaluateModeAnswer(
        'vibe-check',
        { kind: 'vibe-check', mood: 'Epic' },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 2 });
    expect(
      evaluateModeAnswer(
        'survivor',
        { kind: 'survivor', guessedOneHit: false },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 3 });
    expect(
      evaluateModeAnswer(
        'cover-confusion',
        { kind: 'cover-confusion', hintsUsed: 2, pickedArtist: 'The Example' },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 3 });
    expect(
      evaluateModeAnswer(
        'cover-confusion-variation',
        { kind: 'cover-confusion-variation', guessCover: false },
        SONG,
        context
      )
    ).toEqual({ isCorrect: true, points: 3 });
  });

  it('uses the named cheat penalties', () => {
    expect(CHEAT_PENALTY_TIMELINE_DECADE).toBe(-2);
    expect(CHEAT_PENALTY_TIMELINE_JOKER).toBe(-1);
    expect(CHEAT_PENALTY_HINT_MASTER_MUSIC).toBe(-2);
    expect(CHEAT_PENALTY_SURVIVOR).toBe(-1);
  });
});
