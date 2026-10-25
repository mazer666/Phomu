/**
 * The report of a missing link.
 *
 * WHAT: the rule that decides whether a song may be reported again, and the
 * payload that the report carries.
 *
 * WHY a module of its own: the report is the way the players tell the table
 * that a song does not play. The rule of the rate limit and the payload are
 * pure — and they are the part that must not report the same song twice.
 *
 * EXAMPLE: `evaluateMissingReport` answers the question "may this song be
 * reported?" without touching the storage of the browser.
 */

/** The state of the report of the player. */
export type ReportStatus = 'idle' | 'sent' | 'rate-limited' | 'duplicate';

/** What the report of a missing link may do. */
export type ReportDecision =
  | { kind: 'send' }
  | { kind: 'duplicate' }
  | { kind: 'rate-limited' };

/** The storage of the reports of the player. */
export interface ReportStorage {
  /** The moments of the reports of the last hour. */
  timestamps: number[];
  /** The moment of the last report of every song. */
  songs: Record<string, number>;
}

/** The empty storage of the reports. */
export const EMPTY_REPORT_STORAGE: ReportStorage = {
  timestamps: [],
  songs: {},
};

/** The number of reports that one hour allows. */
export const MAX_REPORTS_PER_HOUR = 5;

/** The length of the hour in milliseconds. */
export const HOUR_MS = 60 * 60 * 1000;

/**
 * Decides whether a song may be reported.
 *
 * WHY the song wins over the rate limit: a song that was reported already
 * is known, and the player gets the same answer without filling the quota
 * of the hour.
 *
 * @param storage - The reports of the player so far.
 * @param songId - The identifier of the song.
 * @param now - The current moment in milliseconds.
 */
export function evaluateMissingReport(
  storage: ReportStorage,
  songId: string,
  now: number
): ReportDecision {
  if (storage.songs[songId]) {
    return { kind: 'duplicate' };
  }

  const recent = storage.timestamps.filter((ts) => now - ts < HOUR_MS);
  if (recent.length >= MAX_REPORTS_PER_HOUR) {
    return { kind: 'rate-limited' };
  }

  return { kind: 'send' };
}

/** The payload of the report of a missing link. */
export interface MissingReportPayload {
  /** The identifier of the song. */
  songId: string;
  /** The title of the song, if the shell knows it. */
  songTitle: string | null;
  /** The artist of the song, if the shell knows it. */
  songArtist: string | null;
  /** The pack of the song, if the shell knows it. */
  songPack: string | null;
  /** The provider that the player wanted to use. */
  preferredMusicProvider: string;
  /** Whether the song has a YouTube link. */
  hasYoutube: boolean;
  /** Whether the song has a Spotify link. */
  hasSpotify: boolean;
  /** Whether the song has a preview of Spotify. */
  hasSpotifyFreePreview: boolean;
  /** Whether the song has an Amazon Music link. */
  hasAmazonMusic: boolean;
  /** Whether the song has a preview of Amazon Prime. */
  hasAmazonPrimePreview: boolean;
  /** The time zone of the player. */
  timezone: string;
  /** The locale of the player. */
  locale: string;
  /** The region of the player. */
  region: string;
  /** The anonymous device of the player. */
  deviceId: string;
  /** The moment of the report. */
  timestamp: string;
}

/** Everything the payload of the report is built from. */
export interface MissingReportInput {
  /** The identifier of the song. */
  songId: string;
  /** The title of the song, if the shell knows it. */
  songTitle?: string;
  /** The artist of the song, if the shell knows it. */
  songArtist?: string;
  /** The pack of the song, if the shell knows it. */
  songPack?: string;
  /** The provider that the player wanted to use. */
  preferredMusicProvider: string;
  /** Whether the song has a YouTube link. */
  hasYoutube: boolean;
  /** Whether the song has a Spotify link. */
  hasSpotify: boolean;
  /** Whether the song has a preview of Spotify. */
  hasSpotifyFreePreview: boolean;
  /** Whether the song has an Amazon Music link. */
  hasAmazonMusic: boolean;
  /** Whether the song has a preview of Amazon Prime. */
  hasAmazonPrimePreview: boolean;
  /** The time zone of the player. */
  timezone: string;
  /** The locale of the player. */
  locale: string;
  /** The region of the player. */
  region: string;
  /** The anonymous device of the player. */
  deviceId: string;
  /** The current moment in milliseconds. */
  now: number;
}

/**
 * The payload of the report of a missing link.
 *
 * WHY the region of the player: most of the broken links are blocked for a
 * country, and the region tells the table where the block comes from.
 */
export function buildMissingReportPayload(
  input: MissingReportInput
): MissingReportPayload {
  return {
    songId: input.songId,
    songTitle: input.songTitle ?? null,
    songArtist: input.songArtist ?? null,
    songPack: input.songPack ?? null,
    preferredMusicProvider: input.preferredMusicProvider,
    hasYoutube: input.hasYoutube,
    hasSpotify: input.hasSpotify,
    hasSpotifyFreePreview: input.hasSpotifyFreePreview,
    hasAmazonMusic: input.hasAmazonMusic,
    hasAmazonPrimePreview: input.hasAmazonPrimePreview,
    timezone: input.timezone,
    locale: input.locale,
    region: input.region,
    deviceId: input.deviceId,
    timestamp: new Date(input.now).toISOString(),
  };
}

/**
 * The title of the issue of the report.
 *
 * WHY a title and not the name of the song alone: the table reads the list
 * of the issues, and the artist comes first.
 */
export function missingReportTitle(
  payload: MissingReportPayload
): string {
  return `[Missing Link] ${payload.songArtist ?? 'Unknown Artist'} - ${
    payload.songTitle ?? payload.songId
  }`;
}

/**
 * The body of the issue of the report.
 *
 * WHY the payload as a JSON block: the table can read the fields without
 * parsing the prose of an issue.
 */
export function missingReportBody(payload: MissingReportPayload): string {
  return [
    '## Missing Playback Report (Auto-generated)',
    '',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');
}
