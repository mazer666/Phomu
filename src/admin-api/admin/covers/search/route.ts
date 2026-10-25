import { NextResponse } from 'next/server';

import {
  AdminRequestError,
  MAX_JSON_BYTES,
  MAX_RESULT_FIELD_LENGTH,
  MAX_URL_LENGTH,
  assertAdminAccess,
  assertRateLimit,
  boundedOutputText,
  boundedText,
  fetchWithTimeout,
} from '@/admin-api/_lib/security';

interface SearchResult {
  id: string;
  url: string;
  thumbnail: string;
  source: 'iTunes' | 'Deezer';
  album: string;
  artist: string;
  title: string;
}

interface ItunesTrack {
  trackId: number;
  artworkUrl100: string;
  collectionName: string;
  artistName: string;
  trackName: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: {
    title: string;
    cover_xl?: string;
    cover_big?: string;
    cover_small?: string;
  };
}

/** Rate limit for the cover search (each request costs two third-party calls). */
const SEARCH_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

/**
 * Hard limit for the number of third-party entries that are looked at per
 * provider. The answer of the provider is capped as a whole (512 KB), but
 * the loop over its entries must not run over thousands of items either.
 */
const MAX_PROVIDER_ENTRIES = 25;

/** Hard limit for the number of results in the answer of the route. */
const MAX_RESULTS = 10;

function uniqueResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.source}:${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const authError = assertAdminAccess(request);
  if (authError) return authError;

  const rateLimitError = assertRateLimit(
    request,
    'cover-search',
    SEARCH_RATE_LIMIT
  );
  if (rateLimitError) return rateLimitError;

  try {
    const { searchParams } = new URL(request.url);
    let artist: string;
    let title: string;
    try {
      artist = boundedText(searchParams.get('artist'), 'artist', 120);
      title = boundedText(searchParams.get('title'), 'title', 120);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid input';
      throw new AdminRequestError(message, 400);
    }

    const results: SearchResult[] = [];

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=musicTrack&limit=5`;
    const itunesRes = await fetchWithTimeout(itunesUrl, 7000, {
      maxBytes: MAX_JSON_BYTES,
    });
    if (itunesRes.ok) {
      const itunesData = (await itunesRes.json()) as {
        results?: ItunesTrack[];
      };
      for (const track of (itunesData.results ?? []).slice(
        0,
        MAX_PROVIDER_ENTRIES
      )) {
        if (!track.artworkUrl100) continue;
        results.push({
          id: `itunes-${track.trackId}`,
          url: boundedOutputText(
            track.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg'),
            MAX_URL_LENGTH
          ),
          thumbnail: boundedOutputText(track.artworkUrl100, MAX_URL_LENGTH),
          source: 'iTunes',
          album: boundedOutputText(track.collectionName),
          artist: boundedOutputText(track.artistName),
          title: boundedOutputText(track.trackName),
        });
      }
    }

    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(`track:"${title}" artist:"${artist}"`)}&limit=5`;
    const deezerRes = await fetchWithTimeout(deezerUrl, 7000, {
      maxBytes: MAX_JSON_BYTES,
    });
    if (deezerRes.ok) {
      const deezerData = (await deezerRes.json()) as { data?: DeezerTrack[] };
      for (const track of (deezerData.data ?? []).slice(
        0,
        MAX_PROVIDER_ENTRIES
      )) {
        const bestCover = track.album.cover_xl || track.album.cover_big;
        if (!bestCover || !track.album.cover_small) continue;
        results.push({
          id: `deezer-${track.id}`,
          url: boundedOutputText(bestCover, MAX_URL_LENGTH),
          thumbnail: boundedOutputText(track.album.cover_small, MAX_URL_LENGTH),
          source: 'Deezer',
          album: boundedOutputText(track.album.title),
          artist: boundedOutputText(track.artist.name),
          title: boundedOutputText(track.title),
        });
      }
    }

    return NextResponse.json({
      results: uniqueResults(results).slice(0, MAX_RESULTS),
    });
  } catch (error) {
    if (error instanceof AdminRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // A rejected input (missing or too long search term) is reported as a
    // 400. Every other error is logged server-side and reported without
    // details - the message can contain internal information.
    console.error(
      '[admin-api] cover search failed:',
      error instanceof Error ? error.message : 'unknown error'
    );
    return NextResponse.json({ error: 'Cover search failed' }, { status: 500 });
  }
}
