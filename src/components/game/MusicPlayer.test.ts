/**
 * Tests fuer die Amazon-Music-Link-Aufloesung.
 *
 * Hintergrund: Der Katalog lieferte die Amazon-Music-URLs in sehr unterschiedlichen
 * Formen. Der Player (src/components/game/MusicPlayer.tsx) konnte daraus nur einen
 * Teil als Track-ASIN ableiten - bei nackten ASINs und /tracks/-Links blieb der
 * Amazon-Player ohne Ton. Diese Tests sichern die Aufloesung fuer alle Formen ab.
 */
import { describe, it, expect } from 'vitest';
import { extractAmazonTrackId } from '@/components/game/MusicPlayer';

describe('extractAmazonTrackId', () => {
  it('liest die Track-ASIN aus der Album-Form mit trackAsin', () => {
    expect(
      extractAmazonTrackId('https://music.amazon.com/albums/B001SPZM72?trackAsin=B001SPY6LK')
    ).toBe('B001SPY6LK');
  });

  it('liest die Track-ASIN aus der Track-Seite', () => {
    expect(extractAmazonTrackId('https://music.amazon.com/tracks/B0F3SFFFLQ')).toBe('B0F3SFFFLQ');
  });

  it('liest die Track-ASIN aus einem Retail-/dp/-Link', () => {
    expect(extractAmazonTrackId('https://www.amazon.de/dp/B0F3SFFFLQ')).toBe('B0F3SFFFLQ');
  });

  it('liest die Track-ASIN aus einer nackten ASIN (Alt-Import)', () => {
    expect(extractAmazonTrackId('B0F3SFFFLQ')).toBe('B0F3SFFFLQ');
  });

  it('faellt auf /albums/<ASIN> zurueck, wenn sonst nichts passt', () => {
    expect(extractAmazonTrackId('https://music.amazon.com/albums/B000091CWR')).toBe('B000091CWR');
  });

  it('bevorzugt trackAsin vor dem Album-Pfad', () => {
    expect(
      extractAmazonTrackId('https://music.amazon.com/albums/B000091CWR?trackAsin=B073M9NBFP')
    ).toBe('B073M9NBFP');
  });

  it('liefert null fuer leere oder unbrauchbare Werte', () => {
    expect(extractAmazonTrackId(undefined)).toBeNull();
    expect(extractAmazonTrackId('')).toBeNull();
    expect(extractAmazonTrackId('https://music.amazon.com/')).toBeNull();
  });
});
