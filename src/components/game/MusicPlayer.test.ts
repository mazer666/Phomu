/**
 * Tests for the Amazon Music link resolution.
 *
 * Background: the catalog delivered the Amazon Music URLs in very different
 * shapes. The player (src/components/game/MusicPlayer.tsx) could only derive
 * a track ASIN from some of them - with bare ASINs and /tracks/ links the
 * Amazon player stayed silent. These tests cover the resolution for all
 * shapes.
 */
import { describe, it, expect } from 'vitest';
import { extractAmazonTrackId } from '@/components/game/MusicPlayer';

describe('extractAmazonTrackId', () => {
  it('reads the track ASIN from the album form with trackAsin', () => {
    expect(
      extractAmazonTrackId('https://music.amazon.com/albums/B001SPZM72?trackAsin=B001SPY6LK')
    ).toBe('B001SPY6LK');
  });

  it('reads the track ASIN from the track page', () => {
    expect(extractAmazonTrackId('https://music.amazon.com/tracks/B0F3SFFFLQ')).toBe('B0F3SFFFLQ');
  });

  it('reads the track ASIN from a retail /dp/ link', () => {
    expect(extractAmazonTrackId('https://www.amazon.de/dp/B0F3SFFFLQ')).toBe('B0F3SFFFLQ');
  });

  it('reads the track ASIN from a bare ASIN (legacy import)', () => {
    expect(extractAmazonTrackId('B0F3SFFFLQ')).toBe('B0F3SFFFLQ');
  });

  it('falls back to /albums/<ASIN> when nothing else matches', () => {
    expect(extractAmazonTrackId('https://music.amazon.com/albums/B000091CWR')).toBe('B000091CWR');
  });

  it('prefers trackAsin over the album path', () => {
    expect(
      extractAmazonTrackId('https://music.amazon.com/albums/B000091CWR?trackAsin=B073M9NBFP')
    ).toBe('B073M9NBFP');
  });

  it('returns null for empty or unusable values', () => {
    expect(extractAmazonTrackId(undefined)).toBeNull();
    expect(extractAmazonTrackId('')).toBeNull();
    expect(extractAmazonTrackId('https://music.amazon.com/')).toBeNull();
  });
});
