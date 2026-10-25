/**
 * The decade hints of the Timeline mode.
 *
 * WHY: these tests pin the table of the hints and the rule that picks one of
 * them. The texts live in the locale files; the keys and the choice live
 * here.
 */
import { describe, it, expect } from 'vitest';
import {
  DECADE_HINT_FALLBACK_KEY,
  decadeHintPool,
  decadeOf,
  pickDecadeHintKey,
} from '@/components/game/modes/timeline-hints';

/** A random source that always returns the same value. */
const FIXED_RANDOM = () => 0.5;

describe('the decade of a year', () => {
  it('rounds the year down to its decade', () => {
    expect(decadeOf(1985)).toBe(1980);
    expect(decadeOf(1980)).toBe(1980);
    expect(decadeOf(1999)).toBe(1990);
    expect(decadeOf(2000)).toBe(2000);
  });

  it('knows the hints of every decade the catalogue covers', () => {
    expect(decadeHintPool(1950).length).toBeGreaterThan(0);
    expect(decadeHintPool(1960).length).toBeGreaterThan(0);
    expect(decadeHintPool(1970).length).toBeGreaterThan(0);
    expect(decadeHintPool(1980).length).toBeGreaterThan(0);
    expect(decadeHintPool(1990).length).toBeGreaterThan(0);
    expect(decadeHintPool(2000).length).toBeGreaterThan(0);
    expect(decadeHintPool(2010).length).toBeGreaterThan(0);
    expect(decadeHintPool(2020).length).toBeGreaterThan(0);
  });

  it('has no hint for a decade the catalogue does not cover', () => {
    expect(decadeHintPool(1870)).toEqual([]);
    expect(decadeHintPool(0)).toEqual([]);
  });

  it('picks a key of the pool of the decade', () => {
    const pool = decadeHintPool(1980);
    expect(pool).toContain(pickDecadeHintKey(1985, FIXED_RANDOM));
  });

  it('falls back to the generic hint for a decade without a pool', () => {
    expect(pickDecadeHintKey(1875, FIXED_RANDOM)).toBe(
      DECADE_HINT_FALLBACK_KEY
    );
  });
});
