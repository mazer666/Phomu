import { NextResponse } from 'next/server';

interface SearchResult {
  id: string;
  url: string;
  thumbnail: string;
  source: string;
  album: string;
  artist: string;
  title: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');

  if (!artist || !title) {
    return NextResponse.json({ error: 'Artist and title required' }, { status: 400 });
  }

  const results: SearchResult[] = [];

  try {
    // 1. iTunes Search
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=musicTrack&limit=5`;
    const itunesRes = await fetch(itunesUrl);
    const itunesData: any = await itunesRes.json();
    
    if (itunesData.results) {
      itunesData.results.forEach((track: any) => {
        results.push({
          id: `itunes-${track.trackId}`,
          url: track.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg'),
          thumbnail: track.artworkUrl100,
          source: 'iTunes',
          album: track.collectionName,
          artist: track.artistName,
          title: track.trackName
        });
      });
    }

    // 2. Deezer Search
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(`track:"${title}" artist:"${artist}"`)}&limit=5`;
    const deezerRes = await fetch(deezerUrl);
    const deezerData: any = await deezerRes.json();

    if (deezerData.data) {
      deezerData.data.forEach((track: any) => {
        results.push({
          id: `deezer-${track.id}`,
          url: track.album.cover_xl || track.album.cover_big,
          thumbnail: track.album.cover_small,
          source: 'Deezer',
          album: track.album.title,
          artist: track.artist.name,
          title: track.title
        });
      });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Cover search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
