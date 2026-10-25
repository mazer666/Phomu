/**
 * The links of the media of a song.
 *
 * WHAT: the identifiers that the players of the providers need — the video
 * of YouTube, the track of Spotify and the track of Amazon Music.
 *
 * WHY a module of its own: the rules of the links are pure, and they are the
 * part of the player that breaks the most often. A link of the catalogue
 * has many shapes, and every shape has to be recognised without a DOM.
 *
 * EXAMPLE: `extractAmazonTrackId` understands the album page with a track
 * anchor, the track page, the retail link and the bare ASIN.
 */

/**
 * Extracts the video ID of a YouTube link.
 *
 * WHY the fallback to the raw value: a link of the catalogue may already be
 * the bare ID of a video.
 *
 * @param url - The link of the video.
 * @returns The ID of the video, or `null` when the link carries none.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/|.*vi?\/))([^?&"'>]+)/
  );
  return match ? match[1] : url.length === 11 ? url : null;
}

/**
 * Extracts the track ID of a Spotify link.
 *
 * @param value - The link of the track, or the URI of the track.
 * @returns The ID of the track, or `null` when the value carries none.
 */
export function extractSpotifyTrackId(value?: string): string | null {
  if (!value) return null;
  if (value.startsWith('spotify:track:'))
    return value.replace('spotify:track:', '').trim() || null;
  const match = value.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts the Amazon Music track ASIN from different link shapes.
 *
 * Supported shapes (all of them occur in the catalog):
 *   - https://music.amazon.com/tracks/<ASIN>          (standard shape for a track)
 *   - https://music.amazon.com/albums/<ALBUM>?trackAsin=<ASIN>  (preferred: album + track)
 *   - https://music.amazon.com/albums/<ASIN>            (only if it really is a track)
 *   - https://www.amazon.de/dp/<ASIN>                   (retail link to the track)
 *   - <ASIN>                                           (bare ASIN, as delivered by the old import)
 *
 * Important: an ALBUM ASIN at this position would be found, but the embed
 * then runs into the void. That is why /albums/<ASIN> without trackAsin is
 * only returned when no better shape is available.
 *
 * @param url - The link of the track.
 * @returns The ASIN of the track, or `null` when the link carries none.
 */
export function extractAmazonTrackId(url?: string): string | null {
  if (!url) return null;

  // 1) Album page with an explicit track anchor - the most reliable shape
  const trackAsinMatch = url.match(/trackAsin=([a-zA-Z0-9]{10})/);
  if (trackAsinMatch) return trackAsinMatch[1];

  // 2) Direkte Track-Seite
  const tracksMatch = url.match(/\/tracks\/([a-zA-Z0-9]{10})/);
  if (tracksMatch) return tracksMatch[1];

  // 3) Retail-Link /dp/<ASIN>
  const dpMatch = url.match(/\/dp\/([a-zA-Z0-9]{10})/);
  if (dpMatch) return dpMatch[1];

  // 4) Album page without a track anchor - only use it if there is nothing else
  const albumsMatch = url.match(/\/albums\/([a-zA-Z0-9]{10})/);
  if (albumsMatch) return albumsMatch[1];

  // 5) Bare ASIN (the old import delivered the ASIN without a URL)
  const bareMatch = url.trim().match(/^([a-zA-Z0-9]{10})$/);
  if (bareMatch) return bareMatch[1];

  return null;
}
