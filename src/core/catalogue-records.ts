/**
 * The records of the catalogue, as the base hands them over.
 *
 * WHAT: the wire type of a song record and the mapping into the model of
 * the shell.
 *
 * WHY the wire type is its own type: the bridge marshals the songs of the
 * base into JSON, and JSON knows no tuples and no unions of strings. The
 * mapping is therefore explicit — it names every field and every default,
 * so that a reader can see what the shell receives and what it makes of it.
 *
 * WHY the mapping exists at all: the administrative surfaces edit the songs
 * and work with the model of the shell (`PhomuSong`), not with the wire
 * format of the bridge.
 *
 * EXAMPLE: the record of a song without a cover art becomes a song whose
 * `coverUrl` is `undefined`.
 */
import type { CoverModeMetadata, PhomuSong } from '@/types/song';

/** The cover metadata, as the bridge sends it. */
interface WireCoverMode {
  /** The relation of the cover to the original work. */
  relationType: string;
  /** The identifier of the original song, if it is known. */
  originalSongId: string | null;
  /** The artist of the original work. */
  originalArtist: string | null;
  /** The artist of the cover version. */
  coverArtist: string | null;
  /** The year of the cover version. */
  coverYear: number | null;
  /** The sentence the reveal shows for the cover. */
  revealPrompt: string | null;
  /** The quality of the data. */
  confidence: string;
}

/** The playback window, as the bridge sends it. */
interface WirePreviewTimestamp {
  /** The second at which the playback starts. */
  start: number;
  /** The second at which the playback stops. */
  end: number;
}

/** The links of a song, as the bridge sends them. */
interface WireLinks {
  /** The YouTube link of the song. */
  youtube: string;
  /** The link of the cover version. */
  coverLink: string | null;
  /** The fallback link of the song. */
  fallbackYoutubeId: string | null;
  /** The alternative YouTube links. */
  youtubeAlternatives: string[];
  /** The Spotify link. */
  spotify: string | null;
  /** The Spotify preview link. */
  spotifyFreePreview: string | null;
  /** The Apple Music link. */
  appleMusic: string | null;
  /** The Amazon Music link. */
  amazonMusic: string | null;
  /** The Amazon Prime preview link. */
  amazonPrimePreview: string | null;
}

/** The record of one song, as the bridge sends it. */
export interface CatalogueRecord {
  /** The identifier of the song. */
  id: string;
  /** The title of the song. */
  title: string;
  /** The artist of the song. */
  artist: string;
  /** The year of the release. */
  year: number;
  /** The country of the artist. */
  country: string;
  /** The genre of the song. */
  genre: string;
  /** The URL of the cover art. */
  coverUrl: string | null;
  /** How well known the song is. */
  difficulty: string;
  /** The mood tags of the song. */
  mood: string[];
  /** The packs the song belongs to. */
  packs: string[];
  /** The hints of the song. */
  hints: string[];
  /** The sources of the hints. */
  hintEvidence: string[] | null;
  /** The lyric lines of the song — with the invented ones. */
  lyrics: { real: string[]; fake: string[] } | null;
  /** Whether the artist is a one-hit wonder. */
  isOneHitWonder: boolean;
  /** The cover metadata of the song. */
  coverMode: WireCoverMode | null;
  /** The playback window of the song. */
  previewTimestamp: WirePreviewTimestamp | null;
  /** The modes the song supports. */
  supportedModes: string[];
  /** Whether the song is on the physical card deck. */
  isQRCompatible: boolean;
  /** The streaming links of the song. */
  links: WireLinks;
}

/**
 * The relations a cover can have to the original work.
 *
 * WHY the list: the wire format carries a string, the model carries a union.
 * The mapping names the values the base knows — an unknown relation becomes
 * `original` and is therefore visible as a wrong relation in the editor.
 */
const RELATIONS: CoverModeMetadata['relationType'][] = [
  'original',
  'cover',
  'sample',
  'remix',
];

/**
 * The confidences of a cover metadata.
 *
 * WHY the list: the same reason as for the relations.
 */
const CONFIDENCES: CoverModeMetadata['confidence'][] = ['low', 'medium', 'high'];

/**
 * Picks the member of a union that the wire format carries.
 *
 * @param value - The value of the wire format.
 * @param allowed - The members of the union.
 * @param fallback - The member that is used when the value is unknown.
 * @returns The member of the union.
 */
function pick<T extends string>(
  value: string,
  allowed: T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Maps the record of the base into the model of the shell.
 *
 * WHY the mapping is explicit: the record of the base carries `null` where
 * the model of the shell carries `undefined`, and it carries strings where
 * the model carries unions. The mapping names every one of those
 * differences.
 *
 * @param record - The record of the base.
 * @returns The song of the shell.
 */
export function toSong(record: CatalogueRecord): PhomuSong {
  const coverMode = record.coverMode;
  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    year: record.year,
    country: record.country,
    genre: record.genre,
    coverUrl: record.coverUrl ?? undefined,
    difficulty: record.difficulty as PhomuSong['difficulty'],
    mood: record.mood,
    packs: record.packs,
    hints: record.hints,
    hintEvidence: record.hintEvidence ?? undefined,
    lyrics: record.lyrics
      ? { real: record.lyrics.real, fake: record.lyrics.fake }
      : null,
    isOneHitWonder: record.isOneHitWonder,
    coverMode: coverMode
      ? {
          relationType: pick(
            coverMode.relationType,
            RELATIONS,
            'original'
          ),
          originalSongId: coverMode.originalSongId ?? undefined,
          originalArtist: coverMode.originalArtist ?? undefined,
          coverArtist: coverMode.coverArtist ?? undefined,
          coverYear: coverMode.coverYear ?? undefined,
          revealPrompt: coverMode.revealPrompt ?? undefined,
          confidence: pick(coverMode.confidence, CONFIDENCES, 'medium'),
        }
      : undefined,
    previewTimestamp: record.previewTimestamp
      ? {
          start: record.previewTimestamp.start,
          end: record.previewTimestamp.end,
        }
      : undefined,
    supportedModes: record.supportedModes,
    isQRCompatible: record.isQRCompatible,
    links: {
      youtube: record.links.youtube,
      coverLink: record.links.coverLink ?? undefined,
      fallbackYoutubeId: record.links.fallbackYoutubeId ?? undefined,
      youtubeAlternatives: record.links.youtubeAlternatives,
      spotify: record.links.spotify ?? undefined,
      spotifyFreePreview: record.links.spotifyFreePreview ?? undefined,
      appleMusic: record.links.appleMusic ?? undefined,
      amazonMusic: record.links.amazonMusic ?? undefined,
      amazonPrimePreview: record.links.amazonPrimePreview ?? undefined,
    },
  };
}
