/**
 * Song data validation
 *
 * Checks all songs in a pack for completeness and correctness.
 * Run as an npm script: npm run validate-songs
 *
 * Errors (errors)    → the song is invalid, the game can crash
 * Warnings (warns)  → the song is incomplete but playable (e.g. lyrics=null)
 */

import type { PhomuSong } from '@/types/song';
import { MIN_SONG_YEAR, MAX_SONG_YEAR_OFFSET } from '@/config/song-year-range';
import { collectSongLimitViolations } from '@/utils/validate-song-limits';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single validation finding (error or warning) */
interface ValidationIssue {
  songId: string;
  field: string;
  message: string;
}

/** The validation result of a single song */
interface SongValidationResult {
  songId: string;
  title: string;
  artist: string;
  isValid: boolean; // false = at least one error
  isComplete: boolean; // false = at least one warning (e.g. lyrics missing)
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** Overall result for all songs */
export interface PackValidationResult {
  pack: string;
  totalSongs: number;
  validSongs: number;
  completeSongs: number;
  results: SongValidationResult[];
  allErrors: ValidationIssue[];
  allWarnings: ValidationIssue[];
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Creates an error object */
function err(songId: string, field: string, message: string): ValidationIssue {
  return { songId, field, message };
}

/** Creates a warning object */
function warn(songId: string, field: string, message: string): ValidationIssue {
  return { songId, field, message };
}

/** Checks whether a YouTube value is a placeholder that still needs verification */
function isYoutubePlaceholder(value: string): boolean {
  return value.startsWith('TODO:') || value === '' || value === 'PLACEHOLDER';
}

/** Checks whether a string is a valid YouTube video ID (11 characters) */
function isYoutubeVideoId(value: string): boolean {
  // YouTube IDs are exactly 11 characters, alphanumeric + hyphen + underscore
  return /^[a-zA-Z0-9_-]{11}$/.test(value);
}

/** Checks whether a string is a valid YouTube URL */
function isYoutubeUrl(value: string): boolean {
  return value.includes('youtube.com/watch?v=') || value.includes('youtu.be/');
}

function normalizeForComparison(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main validation logic ──────────────────────────────────────────────────

/**
 * Validates a single song.
 *
 * Returns errors when required fields are missing or wrong.
 * Returns warnings when optional fields are not filled in yet.
 */
export function validateSong(song: unknown): SongValidationResult {
  // We accept 'unknown' so that the script can also process JSON with null lyrics
  const s = song as Record<string, unknown>;

  const songId = typeof s['id'] === 'string' ? s['id'] : '(unbekannte ID)';
  const title = typeof s['title'] === 'string' ? s['title'] : '(kein Titel)';
  const artist =
    typeof s['artist'] === 'string' ? s['artist'] : '(kein Artist)';

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // ── Hard limits (lengths, counts, unknown modes) ─────────────────────
  // A violation is an error, not a warning: the catalog is thereby not
  // accepted "fail open". The limits are defined in
  // src/utils/validate-song-limits.ts.
  for (const violation of collectSongLimitViolations(s)) {
    errors.push(err(songId, violation.field, violation.message));
  }

  // ── Required fields (error when missing) ──────────────────────────────────────

  if (!s['id'] || typeof s['id'] !== 'string') {
    errors.push(
      err(
        songId,
        'id',
        'Pflichtfeld fehlt: id muss ein nicht-leerer String sein'
      )
    );
  }

  if (!s['title'] || typeof s['title'] !== 'string') {
    errors.push(
      err(
        songId,
        'title',
        'Pflichtfeld fehlt: title muss ein nicht-leerer String sein'
      )
    );
  }

  if (!s['artist'] || typeof s['artist'] !== 'string') {
    errors.push(
      err(
        songId,
        'artist',
        'Pflichtfeld fehlt: artist muss ein nicht-leerer String sein'
      )
    );
  }

  // year: must be a number between MIN_SONG_YEAR and the current year + 1.
  // The lower bound is deliberately below 1900, because the catalog also contains classical
  // works (Vivaldi, Bach, Mozart ...). See config/song-year-range.ts.
  if (typeof s['year'] !== 'number') {
    errors.push(
      err(songId, 'year', 'Pflichtfeld fehlt: year muss eine Zahl sein')
    );
  } else if (!Number.isInteger(s['year'])) {
    errors.push(
      err(
        songId,
        'year',
        `Ungültiges Jahr: ${s['year']} (muss eine ganze Zahl sein)`
      )
    );
  } else {
    const currentYear = new Date().getFullYear();
    if (
      s['year'] < MIN_SONG_YEAR ||
      s['year'] > currentYear + MAX_SONG_YEAR_OFFSET
    ) {
      errors.push(
        err(
          songId,
          'year',
          `Ungültiges Jahr: ${s['year']} (erwartet: ${MIN_SONG_YEAR}–${currentYear + MAX_SONG_YEAR_OFFSET})`
        )
      );
    }
  }

  // country: ISO code, 2 upper-case letters
  if (!s['country'] || typeof s['country'] !== 'string') {
    errors.push(
      err(
        songId,
        'country',
        'Pflichtfeld fehlt: country (z.B. "DE", "US", "GB")'
      )
    );
  } else if (!/^[A-Z]{2}$/.test(s['country'] as string)) {
    errors.push(
      err(
        songId,
        'country',
        `Ungültiger ISO-Code: "${s['country']}" (erwartet: 2 Großbuchstaben, z.B. "DE")`
      )
    );
  }

  if (!s['genre'] || typeof s['genre'] !== 'string') {
    errors.push(
      err(
        songId,
        'genre',
        'Pflichtfeld fehlt: genre (z.B. "Pop", "Rock", "R&B")'
      )
    );
  }

  // difficulty: must be 'easy', 'medium' or 'hard'
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (
    !s['difficulty'] ||
    !validDifficulties.includes(s['difficulty'] as string)
  ) {
    errors.push(
      err(
        songId,
        'difficulty',
        `Ungültiger Wert für difficulty: "${s['difficulty']}" (erwartet: easy | medium | hard)`
      )
    );
  }

  // mood: array with at least one entry
  if (!Array.isArray(s['mood'])) {
    errors.push(
      err(
        songId,
        'mood',
        'Pflichtfeld fehlt: mood muss ein Array sein (z.B. ["Dance Floor", "Nostalgic"])'
      )
    );
  } else if ((s['mood'] as unknown[]).length === 0) {
    errors.push(
      err(
        songId,
        'mood',
        'mood-Array ist leer – mindestens ein Stimmungs-Tag erforderlich'
      )
    );
  }

  // packs: array with at least one entry
  if (!Array.isArray(s['packs'])) {
    errors.push(
      err(
        songId,
        'packs',
        'Pflichtfeld fehlt: packs muss ein Array sein (z.B. ["Global Hits 1950-2026"])'
      )
    );
  } else if ((s['packs'] as string[]).length === 0) {
    errors.push(
      err(
        songId,
        'packs',
        'packs-Array ist leer – mindestens eine Pack-Zuordnung erforderlich'
      )
    );
  }

  // hints: must be an array with exactly 5 strings
  if (!Array.isArray(s['hints'])) {
    errors.push(
      err(
        songId,
        'hints',
        'Pflichtfeld fehlt: hints muss ein Array mit genau 5 Strings sein'
      )
    );
  } else {
    const hints = s['hints'] as unknown[];
    const isYoutubeImportSong = (s['packs'] as string[]).includes(
      'YouTube Collection'
    );
    const minHints = isYoutubeImportSong ? 4 : 5;
    const maxHints = 5;
    if (hints.length < minHints || hints.length > maxHints) {
      errors.push(
        err(
          songId,
          'hints',
          `Falsche Anzahl Hints: ${hints.length} (erwartet: ${minHints}–${maxHints})`
        )
      );
    }
    hints.forEach((h, i) => {
      if (typeof h !== 'string') {
        errors.push(
          err(songId, `hints[${i}]`, `Hint ${i + 1} ist kein String`)
        );
      } else if ((h as string).trim() === '') {
        // Empty hints are accepted for stub songs – warning, not error
        warnings.push(
          warn(
            songId,
            `hints[${i}]`,
            `Hint ${i + 1} ist leer – bitte ausfüllen`
          )
        );
      }
    });

    // Hint quality: no obvious spoilers (title/artist tokens)
    const normalizedTitle = normalizeForComparison(title);
    const normalizedArtist = normalizeForComparison(artist);
    const spoilerTokens = new Set([
      ...normalizedTitle.split(' ').filter((t) => t.length >= 4),
      ...normalizedArtist.split(' ').filter((t) => t.length >= 4),
    ]);

    hints.forEach((h, i) => {
      const normalizedHint = normalizeForComparison(String(h));
      for (const token of spoilerTokens) {
        if (token && normalizedHint.includes(token)) {
          warnings.push(
            warn(
              songId,
              `hints[${i}]`,
              `Hint enthält möglichen Spoiler-Token: "${token}"`
            )
          );
          break;
        }
      }
    });

    // Verifiability: if hintEvidence is present there must be 5 sources
    if (Array.isArray(s['hintEvidence'])) {
      const evidence = s['hintEvidence'] as unknown[];
      if (evidence.length !== 5) {
        warnings.push(
          warn(
            songId,
            'hintEvidence',
            `Falsche Anzahl hintEvidence: ${evidence.length} (erwartet: 5)`
          )
        );
      }
      evidence.forEach((ev, i) => {
        if (typeof ev !== 'string' || !/^https?:\/\//.test(ev)) {
          warnings.push(
            warn(
              songId,
              `hintEvidence[${i}]`,
              'hintEvidence muss eine gültige URL sein (http/https)'
            )
          );
        }
      });
    } else {
      warnings.push(
        warn(
          songId,
          'hintEvidence',
          'Keine hintEvidence vorhanden – Prüfbarkeit der Hints eingeschränkt'
        )
      );
    }
  }

  // isOneHitWonder: must be a boolean
  if (typeof s['isOneHitWonder'] !== 'boolean') {
    errors.push(
      err(
        songId,
        'isOneHitWonder',
        'Pflichtfeld fehlt: isOneHitWonder muss true oder false sein'
      )
    );
  }

  // links.youtube: must be present
  const links = s['links'] as Record<string, unknown> | undefined;
  if (!links || typeof links !== 'object') {
    errors.push(
      err(
        songId,
        'links',
        'Pflichtfeld fehlt: links-Objekt (mindestens links.youtube)'
      )
    );
  } else {
    const youtube = links['youtube'];
    if (youtube === undefined || youtube === null) {
      errors.push(
        err(
          songId,
          'links.youtube',
          'Pflichtfeld fehlt: links.youtube (Video-ID oder URL)'
        )
      );
    } else if (typeof youtube !== 'string') {
      errors.push(
        err(songId, 'links.youtube', 'links.youtube muss ein String sein')
      );
    } else if (isYoutubePlaceholder(youtube)) {
      // Placeholder → warning, not error (fine during development)
      warnings.push(
        warn(
          songId,
          'links.youtube',
          `YouTube-Link ist noch ein Platzhalter ("${youtube}") – bitte verifizieren`
        )
      );
    } else if (!isYoutubeVideoId(youtube) && !isYoutubeUrl(youtube)) {
      warnings.push(
        warn(
          songId,
          'links.youtube',
          `YouTube-Wert sieht ungewöhnlich aus: "${youtube}" (erwartet: 11-stellige ID oder URL)`
        )
      );
    }

    const fallbackYoutubeId = links['fallbackYoutubeId'];
    if (fallbackYoutubeId !== undefined) {
      if (
        typeof fallbackYoutubeId !== 'string' ||
        isYoutubePlaceholder(fallbackYoutubeId)
      ) {
        warnings.push(
          warn(
            songId,
            'links.fallbackYoutubeId',
            'fallbackYoutubeId sollte eine gültige YouTube-ID oder URL sein'
          )
        );
      } else if (
        !isYoutubeVideoId(fallbackYoutubeId) &&
        !isYoutubeUrl(fallbackYoutubeId)
      ) {
        warnings.push(
          warn(
            songId,
            'links.fallbackYoutubeId',
            `fallbackYoutubeId sieht ungewöhnlich aus: "${fallbackYoutubeId}"`
          )
        );
      }
    }

    const youtubeAlternatives = links['youtubeAlternatives'];
    if (youtubeAlternatives !== undefined) {
      if (!Array.isArray(youtubeAlternatives)) {
        warnings.push(
          warn(
            songId,
            'links.youtubeAlternatives',
            'youtubeAlternatives sollte ein Array aus YouTube-IDs/URLs sein'
          )
        );
      } else {
        youtubeAlternatives.forEach((alternative, index) => {
          if (
            typeof alternative !== 'string' ||
            isYoutubePlaceholder(alternative)
          ) {
            warnings.push(
              warn(
                songId,
                `links.youtubeAlternatives[${index}]`,
                'Alternative sollte eine gültige YouTube-ID oder URL sein'
              )
            );
            return;
          }
          if (!isYoutubeVideoId(alternative) && !isYoutubeUrl(alternative)) {
            warnings.push(
              warn(
                songId,
                `links.youtubeAlternatives[${index}]`,
                `Alternative sieht ungewöhnlich aus: "${alternative}"`
              )
            );
          }
        });
      }
    }

    const spotify = links['spotify'];
    if (spotify !== undefined && spotify !== '') {
      if (typeof spotify !== 'string') {
        warnings.push(
          warn(
            songId,
            'links.spotify',
            'spotify sollte ein String sein (spotify:track:... oder URL)'
          )
        );
      } else if (
        !spotify.startsWith('spotify:track:') &&
        !spotify.includes('open.spotify.com/track/')
      ) {
        warnings.push(
          warn(
            songId,
            'links.spotify',
            `spotify sieht ungewöhnlich aus: "${spotify}"`
          )
        );
      }
    }

    const spotifyFreePreview = links['spotifyFreePreview'];
    if (spotifyFreePreview !== undefined && spotifyFreePreview !== '') {
      if (typeof spotifyFreePreview !== 'string') {
        warnings.push(
          warn(
            songId,
            'links.spotifyFreePreview',
            'spotifyFreePreview sollte eine URL als String sein'
          )
        );
      } else if (!/^https?:\/\//.test(spotifyFreePreview)) {
        warnings.push(
          warn(
            songId,
            'links.spotifyFreePreview',
            `spotifyFreePreview ist keine gültige URL: "${spotifyFreePreview}"`
          )
        );
      }
    }

    const amazonMusic = links['amazonMusic'];
    if (amazonMusic !== undefined && amazonMusic !== '') {
      if (typeof amazonMusic !== 'string') {
        warnings.push(
          warn(
            songId,
            'links.amazonMusic',
            'amazonMusic sollte ein String (URL) sein'
          )
        );
      } else if (!/^https?:\/\//.test(amazonMusic)) {
        warnings.push(
          warn(
            songId,
            'links.amazonMusic',
            `amazonMusic ist keine gültige URL: "${amazonMusic}"`
          )
        );
      }
    }

    const amazonPrimePreview = links['amazonPrimePreview'];
    if (amazonPrimePreview !== undefined && amazonPrimePreview !== '') {
      if (typeof amazonPrimePreview !== 'string') {
        warnings.push(
          warn(
            songId,
            'links.amazonPrimePreview',
            'amazonPrimePreview sollte eine URL als String sein'
          )
        );
      } else if (!/^https?:\/\//.test(amazonPrimePreview)) {
        warnings.push(
          warn(
            songId,
            'links.amazonPrimePreview',
            `amazonPrimePreview ist keine gültige URL: "${amazonPrimePreview}"`
          )
        );
      }
    }
  }

  // ── Warnings (song playable, but incomplete) ────────────────────────────

  // lyrics: null is OK (the admin tool fills this in), but report it as a warning
  if (s['lyrics'] === null) {
    warnings.push(
      warn(
        songId,
        'lyrics',
        'Lyrics noch nicht eingetragen – im Admin-Tool unter /admin/songs ausfüllen'
      )
    );
  } else if (s['lyrics'] !== null && typeof s['lyrics'] === 'object') {
    // If lyrics are present, real (3 strings) and fake (1 string) must be there
    const lyrics = s['lyrics'] as Record<string, unknown>;
    if (
      !Array.isArray(lyrics['real']) ||
      (lyrics['real'] as unknown[]).length !== 3
    ) {
      errors.push(
        err(
          songId,
          'lyrics.real',
          'lyrics.real muss ein Array mit genau 3 echten Liedzeilen sein'
        )
      );
    }
    if (!lyrics['fake'] || typeof lyrics['fake'] !== 'string') {
      errors.push(
        err(
          songId,
          'lyrics.fake',
          'lyrics.fake muss ein String (die gefälschte Liedzeile) sein'
        )
      );
    }
  }

  // coverMode: optional, but if present relationType/confidence must be valid
  if (s['coverMode'] !== undefined) {
    const cm = s['coverMode'] as Record<string, unknown>;
    const validRelationTypes = ['original', 'cover', 'sample', 'remix'];
    const validConfidence = ['low', 'medium', 'high'];

    if (!cm || typeof cm !== 'object') {
      errors.push(err(songId, 'coverMode', 'coverMode muss ein Objekt sein'));
    } else {
      if (!validRelationTypes.includes(cm['relationType'] as string)) {
        errors.push(
          err(
            songId,
            'coverMode.relationType',
            `Ungültiger Wert: "${cm['relationType']}" (erwartet: original|cover|sample|remix)`
          )
        );
      }
      if (!validConfidence.includes(cm['confidence'] as string)) {
        errors.push(
          err(
            songId,
            'coverMode.confidence',
            `Ungültiger Wert: "${cm['confidence']}" (erwartet: low|medium|high)`
          )
        );
      }
      if (
        cm['coverYear'] !== undefined &&
        typeof cm['coverYear'] !== 'number'
      ) {
        errors.push(
          err(
            songId,
            'coverMode.coverYear',
            'coverMode.coverYear muss eine Zahl sein'
          )
        );
      }
    }
  }

  // previewTimestamp: optional, but if present start < end must hold
  if (s['previewTimestamp'] !== undefined) {
    const pt = s['previewTimestamp'] as Record<string, unknown>;
    if (typeof pt['start'] !== 'number' || typeof pt['end'] !== 'number') {
      errors.push(
        err(
          songId,
          'previewTimestamp',
          'previewTimestamp muss start und end als Zahlen (Sekunden) enthalten'
        )
      );
    } else if (pt['start'] >= pt['end']) {
      errors.push(
        err(
          songId,
          'previewTimestamp',
          `previewTimestamp.start (${pt['start']}) muss kleiner als end (${pt['end']}) sein`
        )
      );
    }
  }

  const isValid = errors.length === 0;
  const isComplete = isValid && warnings.length === 0;

  return { songId, title, artist, isValid, isComplete, errors, warnings };
}

/**
 * Validates all songs in a pack JSON.
 *
 * Expects an object with { songs: unknown[] }.
 * Returns a complete validation result.
 */
export function validatePack(packData: unknown): PackValidationResult {
  const data = packData as Record<string, unknown>;
  const meta = data['meta'] as Record<string, unknown> | undefined;
  const packName = (meta?.['pack'] as string) ?? 'Unbekanntes Pack';
  const songs = Array.isArray(data['songs']) ? data['songs'] : [];

  const results = songs.map(validateSong);

  const allErrors = results.flatMap((r) => r.errors);
  const allWarnings = results.flatMap((r) => r.warnings);
  const validSongs = results.filter((r) => r.isValid).length;
  const completeSongs = results.filter((r) => r.isComplete).length;

  return {
    pack: packName,
    totalSongs: songs.length,
    validSongs,
    completeSongs,
    results,
    allErrors,
    allWarnings,
  };
}

// ─── CLI output (for npm run validate-songs) ─────────────────────────────────

/**
 * Prints the validation result to the console in colour.
 * Called directly when this file is started as a script.
 */
function printValidationResult(result: PackValidationResult): void {
  const RESET = '\x1b[0m';
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const GREEN = '\x1b[32m';
  const BOLD = '\x1b[1m';
  const DIM = '\x1b[2m';

  console.log(`\n${BOLD}🎵 Phomu Song-Validierung${RESET}`);
  console.log(`${DIM}File: ${result.pack}${RESET}`);
  console.log('─'.repeat(60));

  // Summary
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Gesamt:       ${result.totalSongs} Songs`);
  console.log(
    `   Gültig:       ${GREEN}${result.validSongs}${RESET} / ${result.totalSongs}`
  );
  console.log(
    `   Vollständig:  ${result.completeSongs === result.totalSongs ? GREEN : YELLOW}${result.completeSongs}${RESET} / ${result.totalSongs}`
  );

  if (result.allErrors.length > 0) {
    console.log(`   Fehler:       ${RED}${result.allErrors.length}${RESET}`);
  }
  if (result.allWarnings.length > 0) {
    console.log(
      `   Warnungen:    ${YELLOW}${result.allWarnings.length}${RESET}`
    );
  }

  // Detailed output per song (only if there are problems)
  const problemSongs = result.results.filter(
    (r) => !r.isValid || !r.isComplete
  );

  if (problemSongs.length > 0) {
    console.log(`\n${BOLD}Details (Songs mit Problemen):${RESET}`);

    for (const song of problemSongs) {
      const statusIcon = !song.isValid
        ? `${RED}✗${RESET}`
        : `${YELLOW}⚠${RESET}`;
      console.log(
        `\n  ${statusIcon} ${BOLD}${song.title}${RESET} – ${song.artist} (${song.songId})`
      );

      for (const e of song.errors) {
        console.log(`     ${RED}FEHLER${RESET} [${e.field}]: ${e.message}`);
      }
      for (const w of song.warnings) {
        console.log(`     ${YELLOW}WARN ${RESET} [${w.field}]: ${w.message}`);
      }
    }
  }

  // Final message
  console.log('\n' + '─'.repeat(60));
  if (result.allErrors.length === 0) {
    console.log(`${GREEN}✓ Alle Songs sind gültig!${RESET}`);
    if (result.allWarnings.length > 0) {
      console.log(
        `${YELLOW}⚠ ${result.allWarnings.length} Warnung(en) – Songs sind spielbar, aber unvollständig.${RESET}`
      );
    }
  } else {
    console.log(
      `${RED}✗ ${result.allErrors.length} Fehler gefunden – bitte beheben!${RESET}`
    );
  }
  console.log('');
}

// ─── Script entry point ────────────────────────────────────────────────────

// Only executed when this file is called directly (not on import)
// Usage: npx tsx src/utils/validate-song-data.ts [path/to/file.json]
async function main() {
  const fs = await import('fs');
  const path = await import('path');

  // Default pack file or the one given as an argument
  const targetFile = process.argv[2] ?? 'src/data/songs/A1.json';
  const absolutePath = path.resolve(process.cwd(), targetFile);

  console.log(`Lese Datei: ${absolutePath}`);

  let rawData: unknown;
  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    rawData = JSON.parse(content);
  } catch (e) {
    console.error(`\n❌ Fehler beim Lesen/Parsen der Datei: ${absolutePath}`);
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const result = validatePack(rawData);
  printValidationResult(result);

  // Exit code 1 when errors are present (for CI/CD)
  if (result.allErrors.length > 0) {
    process.exit(1);
  }
}

// Only run when called directly
const isMainModule = process.argv[1]?.includes('validate-song-data');
if (isMainModule) {
  main();
}
