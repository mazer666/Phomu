import { describe, expect, it } from 'vitest';
import { parseQrIntent } from './qr-intent';

describe('parseQrIntent', () => {
  it('parses a player tag', () => {
    expect(parseQrIntent('@Alex')).toEqual({ kind: 'player', name: 'Alex' });
  });

  it('parses a pack intent', () => {
    expect(parseQrIntent('https://phomu.app/play?pack=global-hits')).toEqual({
      kind: 'pack',
      packId: 'global-hits',
    });
  });

  it('parses a session intent', () => {
    expect(parseQrIntent('https://phomu.app/play?session=ABCD')).toEqual({
      kind: 'session',
      sessionCode: 'ABCD',
    });
  });

  it('marks legacy song links as unsupported', () => {
    expect(parseQrIntent('https://phomu.app/play?id=song-123')).toEqual({
      kind: 'unsupported-song-link',
      songId: 'song-123',
    });
  });
});
