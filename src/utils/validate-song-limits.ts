/**
 * Hard limits for the fields of a song.
 *
 * The song data is not only written by the maintainers. The admin tool
 * (`/admin/songs`) writes edited songs into the browser storage and the
 * catalog files can be replaced by an import. Without an upper bound a
 * single field can carry megabytes of text into the renderer, into the
 * persisted state and into every export.
 *
 * Every limit below is a hard limit: a violation is an *error*, not a
 * warning. The values are chosen so that the current catalog (1 623 songs,
 * longest value per field measured on 2026-10-25) stays valid:
 *
 * | Field            | Longest value in the catalog | Limit |
 * |------------------|------------------------------|-------|
 * | id               | 45                           | 120   |
 * | title            | 91                           | 200   |
 * | artist           | 88                           | 200   |
 * | genre            | 56                           | 80    |
 * | mood entry       | 19                           | 60    |
 * | packs entry      | 29                           | 100   |
 * | hint             | 464                          | 600   |
 * | hintEvidence     | 197                          | 500   |
 * | lyric line       | 104                          | 200   |
 * | link             | 90                           | 500   |
 */

/** Maximum number of characters per field. */
export const SONG_FIELD_LIMITS = {
  id: 120,
  title: 200,
  artist: 200,
  genre: 80,
  coverUrl: 500,
  moodEntry: 60,
  moodEntries: 20,
  packEntry: 100,
  packEntries: 50,
  hint: 600,
  hintEvidence: 500,
  lyricLine: 200,
  fakeLyric: 200,
  link: 500,
  youtubeAlternatives: 10,
  supportedModes: 20,
  supportedModeEntry: 40,
  coverModeText: 200,
  coverModeId: 120,
} as const;

/** The game modes a song may declare. */
export const KNOWN_SUPPORTED_MODES = [
  'timeline',
  'hint-master',
  'lyrics',
  'vibe-check',
  'cover-confusion',
  'survivor',
] as const;

/** One violation of a hard limit. */
export interface LimitViolation {
  /** Dotted path of the field, e.g. `hints[2]`. */
  field: string;
  /** German message, usable in the CLI output of the validator. */
  message: string;
}

function textViolation(
  field: string,
  value: unknown,
  maxLength: number
): LimitViolation | null {
  if (typeof value !== 'string') return null;
  if (value.length <= maxLength) return null;
  return {
    field,
    message: `Feld zu lang: ${value.length} Zeichen (erlaubt: max. ${maxLength})`,
  };
}

function stringArrayViolations(
  field: string,
  value: unknown,
  options: { maxEntries: number; maxEntryLength: number }
): LimitViolation[] {
  const violations: LimitViolation[] = [];
  if (!Array.isArray(value)) return violations;

  if (value.length > options.maxEntries) {
    violations.push({
      field,
      message: `Zu viele Einträge: ${value.length} (erlaubt: max. ${options.maxEntries})`,
    });
  }

  value.forEach((entry, index) => {
    const entryViolation = textViolation(
      `${field}[${index}]`,
      entry,
      options.maxEntryLength
    );
    if (entryViolation) violations.push(entryViolation);
  });

  return violations;
}

/**
 * Checks every hard limit of a song and returns all violations.
 *
 * The function never throws and never fails open: a field that is missing
 * or has the wrong type is not a limit violation - the type and presence
 * checks live in `validate-song-data.ts`.
 */
export function collectSongLimitViolations(
  song: Record<string, unknown>
): LimitViolation[] {
  const violations: LimitViolation[] = [];
  const limits = SONG_FIELD_LIMITS;

  const push = (violation: LimitViolation | null): void => {
    if (violation) violations.push(violation);
  };

  push(textViolation('id', song['id'], limits.id));
  push(textViolation('title', song['title'], limits.title));
  push(textViolation('artist', song['artist'], limits.artist));
  push(textViolation('genre', song['genre'], limits.genre));
  push(textViolation('coverUrl', song['coverUrl'], limits.coverUrl));

  violations.push(
    ...stringArrayViolations('mood', song['mood'], {
      maxEntries: limits.moodEntries,
      maxEntryLength: limits.moodEntry,
    }),
    ...stringArrayViolations('packs', song['packs'], {
      maxEntries: limits.packEntries,
      maxEntryLength: limits.packEntry,
    })
  );

  const hints = song['hints'];
  if (Array.isArray(hints)) {
    hints.forEach((hint, index) => {
      push(textViolation(`hints[${index}]`, hint, limits.hint));
    });
  }

  const hintEvidence = song['hintEvidence'];
  if (Array.isArray(hintEvidence)) {
    hintEvidence.forEach((entry, index) => {
      push(textViolation(`hintEvidence[${index}]`, entry, limits.hintEvidence));
    });
  }

  const lyrics = song['lyrics'];
  if (lyrics && typeof lyrics === 'object' && !Array.isArray(lyrics)) {
    const lyricsRecord = lyrics as Record<string, unknown>;
    const real = lyricsRecord['real'];
    if (Array.isArray(real)) {
      real.forEach((line, index) => {
        push(textViolation(`lyrics.real[${index}]`, line, limits.lyricLine));
      });
    }
    push(textViolation('lyrics.fake', lyricsRecord['fake'], limits.fakeLyric));
  }

  const links = song['links'];
  if (links && typeof links === 'object' && !Array.isArray(links)) {
    const linksRecord = links as Record<string, unknown>;
    for (const key of [
      'youtube',
      'coverLink',
      'fallbackYoutubeId',
      'spotify',
      'spotifyFreePreview',
      'appleMusic',
      'amazonMusic',
      'amazonPrimePreview',
    ]) {
      push(textViolation(`links.${key}`, linksRecord[key], limits.link));
    }
    violations.push(
      ...stringArrayViolations(
        'links.youtubeAlternatives',
        linksRecord['youtubeAlternatives'],
        {
          maxEntries: limits.youtubeAlternatives,
          maxEntryLength: limits.link,
        }
      )
    );
  }

  const supportedModes = song['supportedModes'];
  if (Array.isArray(supportedModes)) {
    if (supportedModes.length > limits.supportedModes) {
      violations.push({
        field: 'supportedModes',
        message: `Zu viele Einträge: ${supportedModes.length} (erlaubt: max. ${limits.supportedModes})`,
      });
    }
    supportedModes.forEach((mode, index) => {
      push(
        textViolation(
          `supportedModes[${index}]`,
          mode,
          limits.supportedModeEntry
        )
      );
      if (
        typeof mode === 'string' &&
        !KNOWN_SUPPORTED_MODES.includes(
          mode as (typeof KNOWN_SUPPORTED_MODES)[number]
        )
      ) {
        violations.push({
          field: `supportedModes[${index}]`,
          message: `Unbekannter Modus: "${mode}" (erlaubt: ${KNOWN_SUPPORTED_MODES.join(', ')})`,
        });
      }
    });
  }

  const coverMode = song['coverMode'];
  if (coverMode && typeof coverMode === 'object' && !Array.isArray(coverMode)) {
    const coverModeRecord = coverMode as Record<string, unknown>;
    push(
      textViolation(
        'coverMode.originalSongId',
        coverModeRecord['originalSongId'],
        limits.coverModeId
      )
    );
    push(
      textViolation(
        'coverMode.originalArtist',
        coverModeRecord['originalArtist'],
        limits.coverModeText
      )
    );
    push(
      textViolation(
        'coverMode.coverArtist',
        coverModeRecord['coverArtist'],
        limits.coverModeText
      )
    );
    push(
      textViolation(
        'coverMode.revealPrompt',
        coverModeRecord['revealPrompt'],
        limits.coverModeText
      )
    );
  }

  return violations;
}
