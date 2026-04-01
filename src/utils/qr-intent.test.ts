import { describe, expect, it } from 'vitest';
import { parseQrIntent } from './qr-intent';

describe('parseQrIntent', () => {
  it('parst player-tag', () => {
    expect(parseQrIntent('@Alex')).toEqual({ kind: 'player', name: 'Alex' });
  });

  it('parst pack-intent', () => {
    expect(parseQrIntent('https://phomu.app/play?pack=global-hits')).toEqual({
      kind: 'pack',
      packId: 'global-hits',
    });
  });

  it('parst session-intent', () => {
    expect(parseQrIntent('https://phomu.app/play?session=ABCD')).toEqual({
      kind: 'session',
      sessionCode: 'ABCD',
    });
  });

  it('markiert legacy song-links als unsupported', () => {
    expect(parseQrIntent('https://phomu.app/play?id=song-123')).toEqual({
      kind: 'unsupported-song-link',
      songId: 'song-123',
    });
  });
});
