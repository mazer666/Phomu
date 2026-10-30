/**
 * The picture of a mode.
 *
 * WHAT: the test of the variant of the picture — the picture of a mode
 * changes from game to game, and it stays the same during the game.
 *
 * WHY the test exists: a picture that changes under the finger of the
 * player is a picture that was not there. And a picture that never changes
 * is a picture that the lobby shows to every player of every game.
 *
 * EXAMPLE: the same seed brings the same variant, another seed another one.
 */
import { describe, expect, it } from 'vitest';
import { modeArtVariant } from './ModeArt';

describe('the variant of the picture of a mode', () => {
  it('is the same for the same game', () => {
    const spiel = 'b7c1f2de-4b1a-4c2e-9f55-0d3a7c1b2e33';

    expect(modeArtVariant('timeline', spiel)).toBe(
      modeArtVariant('timeline', spiel)
    );
  });

  it('is one of the three variants', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const variante = modeArtVariant('lyrics', seed);
      expect([1, 2, 3]).toContain(variante);
    }
  });

  it('gives the modes of one game their own pictures', () => {
    const spiel = 'b7c1f2de-4b1a-4c2e-9f55-0d3a7c1b2e33';
    const varianten = new Set(
      (['timeline', 'hint-master', 'lyrics', 'vibe-check', 'survivor', 'cover-confusion'] as const).map(
        (modus) => modeArtVariant(modus, spiel)
      )
    );

    // WHY: the six pictures of a game should not all be the same number —
    // otherwise the lobby shows the same picture six times.
    expect(varianten.size).toBeGreaterThan(1);
  });

  it('changes with the game', () => {
    const varianten = new Set(
      Array.from({ length: 12 }, (_, i) => modeArtVariant('timeline', `spiel-${i}`))
    );

    expect(varianten.size).toBeGreaterThan(1);
  });
});
