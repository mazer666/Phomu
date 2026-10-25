import { NextResponse } from 'next/server';

import { assertAdminAccess, boundedText, fetchWithTimeout } from '@/admin-api/_lib/security';

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

  try {
    const { searchParams } = new URL(request.url);
    const artist = boundedText(searchParams.get('artist'), 'artist', 120);
    const title = boundedText(searchParams.get('title'), 'title', 120);

    const results: SearchResult[] = [];

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=musicTrack&limit=5`;
    const itunesRes = await fetchWithTimeout(itunesUrl);
    if (itunesRes.ok) {
      const itunesData = (await itunesRes.json()) as { results?: ItunesTrack[] };
      for (const track of itunesData.results ?? []) {
        if (!track.artworkUrl100) continue;
        results.push({
          id: `itunes-${track.trackId}`,
          url: track.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg'),
          thumbnail: track.artworkUrl100,
          source: 'iTunes',
          album: track.collectionName,
          artist: track.artistName,
          title: track.trackName,
        });
      }
    }

    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(`track:"${title}" artist:"${artist}"`)}&limit=5`;
    const deezerRes = await fetchWithTimeout(deezerUrl);
    if (deezerRes.ok) {
      const deezerData = (await deezerRes.json()) as { data?: DeezerTrack[] };
      for (const track of deezerData.data ?? []) {
        const bestCover = track.album.cover_xl || track.album.cover_big;
        if (!bestCover || !track.album.cover_small) continue;
        results.push({
          id: `deezer-${track.id}`,
          url: bestCover,
          thumbnail: track.album.cover_small,
          source: 'Deezer',
          album: track.album.title,
          artist: track.artist.name,
          title: track.title,
        });
      }
    }

    return NextResponse.json({ results: uniqueResults(results).slice(0, 10) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cover search failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
