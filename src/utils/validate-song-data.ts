/**
 * Song-Daten Validierung
 *
 * Prüft alle Songs in einem Pack auf Vollständigkeit und Korrektheit.
 * Wird als npm-Script ausgeführt: npm run validate-songs
 *
 * Fehler (errors)   → Song ist ungültig, das Spiel kann abstürzen
 * Warnungen (warns) → Song ist unvollständig, aber spielbar (z.B. lyrics=null)
 */

import type { PhomuSong } from '@/types/song';

// ─── Typen ────────────────────────────────────────────────────────────────────

/** Ein einzelner Validierungsfund (Fehler oder Warnung) */
interface ValidationIssue {
  songId: string;
  field: string;
  message: string;
}

/** Ergebnis der Validierung eines einzelnen Songs */
interface SongValidationResult {
  songId: string;
  title: string;
  artist: string;
  isValid: boolean;       // false = mindestens ein Fehler
  isComplete: boolean;    // false = mindestens eine Warnung (z.B. lyrics fehlen)
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** Gesamtergebnis für alle Songs */
export interface PackValidationResult {
  pack: string;
  totalSongs: number;
  validSongs: number;
  completeSongs: number;
  results: SongValidationResult[];
  allErrors: ValidationIssue[];
  allWarnings: ValidationIssue[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Erstellt ein Fehler-Objekt */
function err(songId: string, field: string, message: string): ValidationIssue {
  return { songId, field, message };
}

/** Erstellt ein Warn-Objekt */
function warn(songId: string, field: string, message: string): ValidationIssue {
  return { songId, field, message };
}

/** Prüft ob ein YouTube-Wert ein Platzhalter ist, der noch verifiziert werden muss */
function isYoutubePlaceholder(value: string): boolean {
  return value.startsWith('TODO:') || value === '' || value === 'PLACEHOLDER';
}

/** Prüft ob ein String eine gültige YouTube-Video-ID hat (11 Zeichen) */
function isYoutubeVideoId(value: string): boolean {
  // YouTube IDs sind genau 11 Zeichen, alphanumerisch + Bindestrich + Unterstrich
  return /^[a-zA-Z0-9_-]{11}$/.test(value);
}

/** Prüft ob ein String eine gültige YouTube-URL ist */
function isYoutubeUrl(value: string): boolean {
  return (
    value.includes('youtube.com/watch?v=') ||
    value.includes('youtu.be/')
  );
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

// ─── Haupt-Validierungslogik ──────────────────────────────────────────────────

/**
 * Validiert einen einzelnen Song.
 *
 * Gibt Fehler zurück wenn Pflichtfelder fehlen oder falsch sind.
 * Gibt Warnungen zurück wenn optionale Felder noch nicht ausgefüllt sind.
 */
export function validateSong(song: unknown): SongValidationResult {
  // Wir akzeptieren 'unknown', damit das Script auch JSON mit null-lyrics verarbeiten kann
  const s = song as Record<string, unknown>;

  const songId = typeof s['id'] === 'string' ? s['id'] : '(unbekannte ID)';
  const title = typeof s['title'] === 'string' ? s['title'] : '(kein Titel)';
  const artist = typeof s['artist'] === 'string' ? s['artist'] : '(kein Artist)';

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // ── Pflichtfelder (Fehler wenn fehlen) ──────────────────────────────────────

  if (!s['id'] || typeof s['id'] !== 'string') {
    errors.push(err(songId, 'id', 'Pflichtfeld fehlt: id muss ein nicht-leerer String sein'));
  }

  if (!s['title'] || typeof s['title'] !== 'string') {
    errors.push(err(songId, 'title', 'Pflichtfeld fehlt: title muss ein nicht-leerer String sein'));
  }

  if (!s['artist'] || typeof s['artist'] !== 'string') {
    errors.push(err(songId, 'artist', 'Pflichtfeld fehlt: artist muss ein nicht-leerer String sein'));
  }

  // year: muss eine Zahl zwischen 1900 und aktuellem Jahr + 1 sein
  if (typeof s['year'] !== 'number') {
    errors.push(err(songId, 'year', 'Pflichtfeld fehlt: year muss eine Zahl sein'));
  } else {
    const currentYear = new Date().getFullYear();
    if (s['year'] < 1900 || s['year'] > currentYear + 1) {
      errors.push(err(songId, 'year', `Ungültiges Jahr: ${s['year']} (erwartet: 1900–${currentYear + 1})`));
    }
  }

  // country: ISO-Code, 2 Großbuchstaben
  if (!s['country'] || typeof s['country'] !== 'string') {
    errors.push(err(songId, 'country', 'Pflichtfeld fehlt: country (z.B. "DE", "US", "GB")'));
  } else if (!/^[A-Z]{2}$/.test(s['country'] as string)) {
    errors.push(err(songId, 'country', `Ungültiger ISO-Code: "${s['country']}" (erwartet: 2 Großbuchstaben, z.B. "DE")`));
  }

  if (!s['genre'] || typeof s['genre'] !== 'string') {
    errors.push(err(songId, 'genre', 'Pflichtfeld fehlt: genre (z.B. "Pop", "Rock", "R&B")'));
  }

  // difficulty: muss 'easy', 'medium' oder 'hard' sein
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!s['difficulty'] || !validDifficulties.includes(s['difficulty'] as string)) {
    errors.push(err(songId, 'difficulty', `Ungültiger Wert für difficulty: "${s['difficulty']}" (erwartet: easy | medium | hard)`));
  }

  // mood: Array mit mindestens einem Eintrag
  if (!Array.isArray(s['mood'])) {
    errors.push(err(songId, 'mood', 'Pflichtfeld fehlt: mood muss ein Array sein (z.B. ["Dance Floor", "Nostalgic"])'));
  } else if ((s['mood'] as unknown[]).length === 0) {
    errors.push(err(songId, 'mood', 'mood-Array ist leer – mindestens ein Stimmungs-Tag erforderlich'));
  }

  if (!s['pack'] || typeof s['pack'] !== 'string') {
    errors.push(err(songId, 'pack', 'Pflichtfeld fehlt: pack (z.B. "Global Hits 1950-2026")'));
  }

  // hints: muss ein Array mit genau 5 Strings sein
  if (!Array.isArray(s['hints'])) {
    errors.push(err(songId, 'hints', 'Pflichtfeld fehlt: hints muss ein Array mit genau 5 Strings sein'));
  } else {
    const hints = s['hints'] as unknown[];
    const isYoutubeImportSong = s['pack'] === 'YouTube Collection';
    const minHints = isYoutubeImportSong ? 4 : 5;
    const maxHints = 5;
    if (hints.length < minHints || hints.length > maxHints) {
      errors.push(err(songId, 'hints', `Falsche Anzahl Hints: ${hints.length} (erwartet: ${minHints}–${maxHints})`));
    }
    hints.forEach((h, i) => {
      if (typeof h !== 'string') {
        errors.push(err(songId, `hints[${i}]`, `Hint ${i + 1} ist kein String`));
      } else if ((h as string).trim() === '') {
        // Leere Hints sind bei Stub-Songs akzeptiert – Warnung, kein Fehler
        warnings.push(warn(songId, `hints[${i}]`, `Hint ${i + 1} ist leer – bitte ausfüllen`));
      }
    });


    // Hint-Qualität: keine offensichtlichen Spoiler (Titel/Artist Tokens)
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
          warnings.push(warn(songId, `hints[${i}]`, `Hint enthält möglichen Spoiler-Token: "${token}"`));
          break;
        }
      }
    });

    // Prüfbarkeit: wenn hintEvidence vorhanden, muss es 5 Quellen geben
    if (Array.isArray(s['hintEvidence'])) {
      const evidence = s['hintEvidence'] as unknown[];
      if (evidence.length !== 5) {
        warnings.push(warn(songId, 'hintEvidence', `Falsche Anzahl hintEvidence: ${evidence.length} (erwartet: 5)`));
      }
      evidence.forEach((ev, i) => {
        if (typeof ev !== 'string' || !/^https?:\/\//.test(ev)) {
          warnings.push(warn(songId, `hintEvidence[${i}]`, 'hintEvidence muss eine gültige URL sein (http/https)'));
        }
      });
    } else {
      warnings.push(warn(songId, 'hintEvidence', 'Keine hintEvidence vorhanden – Prüfbarkeit der Hints eingeschränkt'));
    }
  }

  // isOneHitWonder: muss boolean sein
  if (typeof s['isOneHitWonder'] !== 'boolean') {
    errors.push(err(songId, 'isOneHitWonder', 'Pflichtfeld fehlt: isOneHitWonder muss true oder false sein'));
  }

  // links.youtube: muss vorhanden sein
  const links = s['links'] as Record<string, unknown> | undefined;
  if (!links || typeof links !== 'object') {
    errors.push(err(songId, 'links', 'Pflichtfeld fehlt: links-Objekt (mindestens links.youtube)'));
  } else {
    const youtube = links['youtube'];
    if (youtube === undefined || youtube === null) {
      errors.push(err(songId, 'links.youtube', 'Pflichtfeld fehlt: links.youtube (Video-ID oder URL)'));
    } else if (typeof youtube !== 'string') {
      errors.push(err(songId, 'links.youtube', 'links.youtube muss ein String sein'));
    } else if (isYoutubePlaceholder(youtube)) {
      // Platzhalter → Warnung, kein Fehler (ist in der Entwicklung OK)
      warnings.push(warn(songId, 'links.youtube', `YouTube-Link ist noch ein Platzhalter ("${youtube}") – bitte verifizieren`));
    } else if (!isYoutubeVideoId(youtube) && !isYoutubeUrl(youtube)) {
      warnings.push(warn(songId, 'links.youtube', `YouTube-Wert sieht ungewöhnlich aus: "${youtube}" (erwartet: 11-stellige ID oder URL)`));
    }

    const fallbackYoutubeId = links['fallbackYoutubeId'];
    if (fallbackYoutubeId !== undefined) {
      if (typeof fallbackYoutubeId !== 'string' || isYoutubePlaceholder(fallbackYoutubeId)) {
        warnings.push(warn(songId, 'links.fallbackYoutubeId', 'fallbackYoutubeId sollte eine gültige YouTube-ID oder URL sein'));
      } else if (!isYoutubeVideoId(fallbackYoutubeId) && !isYoutubeUrl(fallbackYoutubeId)) {
        warnings.push(warn(songId, 'links.fallbackYoutubeId', `fallbackYoutubeId sieht ungewöhnlich aus: "${fallbackYoutubeId}"`));
      }
    }

    const youtubeAlternatives = links['youtubeAlternatives'];
    if (youtubeAlternatives !== undefined) {
      if (!Array.isArray(youtubeAlternatives)) {
        warnings.push(warn(songId, 'links.youtubeAlternatives', 'youtubeAlternatives sollte ein Array aus YouTube-IDs/URLs sein'));
      } else {
        youtubeAlternatives.forEach((alternative, index) => {
          if (typeof alternative !== 'string' || isYoutubePlaceholder(alternative)) {
            warnings.push(warn(songId, `links.youtubeAlternatives[${index}]`, 'Alternative sollte eine gültige YouTube-ID oder URL sein'));
            return;
          }
          if (!isYoutubeVideoId(alternative) && !isYoutubeUrl(alternative)) {
            warnings.push(warn(songId, `links.youtubeAlternatives[${index}]`, `Alternative sieht ungewöhnlich aus: "${alternative}"`));
          }
        });
      }
    }
  }

  // ── Warnungen (Song spielbar, aber unvollständig) ────────────────────────────

  // lyrics: null ist OK (Admin-Tool füllt dies aus), aber als Warnung melden
  if (s['lyrics'] === null) {
    warnings.push(warn(songId, 'lyrics', 'Lyrics noch nicht eingetragen – im Admin-Tool unter /admin/songs ausfüllen'));
  } else if (s['lyrics'] !== null && typeof s['lyrics'] === 'object') {
    // Wenn lyrics vorhanden, müssen real (3 Strings) und fake (1 String) da sein
    const lyrics = s['lyrics'] as Record<string, unknown>;
    if (!Array.isArray(lyrics['real']) || (lyrics['real'] as unknown[]).length !== 3) {
      errors.push(err(songId, 'lyrics.real', 'lyrics.real muss ein Array mit genau 3 echten Liedzeilen sein'));
    }
    if (!lyrics['fake'] || typeof lyrics['fake'] !== 'string') {
      errors.push(err(songId, 'lyrics.fake', 'lyrics.fake muss ein String (die gefälschte Liedzeile) sein'));
    }
  }

  // coverMode: optional, aber wenn vorhanden muss relationType/confidence valide sein
  if (s['coverMode'] !== undefined) {
    const cm = s['coverMode'] as Record<string, unknown>;
    const validRelationTypes = ['original', 'cover', 'sample', 'remix'];
    const validConfidence = ['low', 'medium', 'high'];

    if (!cm || typeof cm !== 'object') {
      errors.push(err(songId, 'coverMode', 'coverMode muss ein Objekt sein'));
    } else {
      if (!validRelationTypes.includes(cm['relationType'] as string)) {
        errors.push(err(songId, 'coverMode.relationType', `Ungültiger Wert: "${cm['relationType']}" (erwartet: original|cover|sample|remix)`));
      }
      if (!validConfidence.includes(cm['confidence'] as string)) {
        errors.push(err(songId, 'coverMode.confidence', `Ungültiger Wert: "${cm['confidence']}" (erwartet: low|medium|high)`));
      }
      if (cm['coverYear'] !== undefined && typeof cm['coverYear'] !== 'number') {
        errors.push(err(songId, 'coverMode.coverYear', 'coverMode.coverYear muss eine Zahl sein'));
      }
    }
  }

  // previewTimestamp: optional, aber wenn vorhanden muss start < end sein
  if (s['previewTimestamp'] !== undefined) {
    const pt = s['previewTimestamp'] as Record<string, unknown>;
    if (typeof pt['start'] !== 'number' || typeof pt['end'] !== 'number') {
      errors.push(err(songId, 'previewTimestamp', 'previewTimestamp muss start und end als Zahlen (Sekunden) enthalten'));
    } else if (pt['start'] >= pt['end']) {
      errors.push(err(songId, 'previewTimestamp', `previewTimestamp.start (${pt['start']}) muss kleiner als end (${pt['end']}) sein`));
    }
  }

  const isValid = errors.length === 0;
  const isComplete = isValid && warnings.length === 0;

  return { songId, title, artist, isValid, isComplete, errors, warnings };
}

/**
 * Validiert alle Songs in einem Pack-JSON.
 *
 * Erwartet ein Objekt mit { songs: unknown[] }.
 * Gibt ein vollständiges Validierungsergebnis zurück.
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

// ─── CLI-Ausgabe (für npm run validate-songs) ─────────────────────────────────

/**
 * Gibt das Validierungsergebnis farbig in der Konsole aus.
 * Wird direkt aufgerufen wenn diese Datei als Script gestartet wird.
 */
function printValidationResult(result: PackValidationResult): void {
  const RESET = '\x1b[0m';
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const GREEN = '\x1b[32m';
  const BOLD = '\x1b[1m';
  const DIM = '\x1b[2m';

  console.log(`\n${BOLD}🎵 Phomu Song-Validierung${RESET}`);
  console.log(`${DIM}Pack: ${result.pack}${RESET}`);
  console.log('─'.repeat(60));

  // Zusammenfassung
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Gesamt:       ${result.totalSongs} Songs`);
  console.log(`   Gültig:       ${GREEN}${result.validSongs}${RESET} / ${result.totalSongs}`);
  console.log(`   Vollständig:  ${result.completeSongs === result.totalSongs ? GREEN : YELLOW}${result.completeSongs}${RESET} / ${result.totalSongs}`);

  if (result.allErrors.length > 0) {
    console.log(`   Fehler:       ${RED}${result.allErrors.length}${RESET}`);
  }
  if (result.allWarnings.length > 0) {
    console.log(`   Warnungen:    ${YELLOW}${result.allWarnings.length}${RESET}`);
  }

  // Detaillierte Ausgabe pro Song (nur wenn Probleme vorhanden)
  const problemSongs = result.results.filter((r) => !r.isValid || !r.isComplete);

  if (problemSongs.length > 0) {
    console.log(`\n${BOLD}Details (Songs mit Problemen):${RESET}`);

    for (const song of problemSongs) {
      const statusIcon = !song.isValid ? `${RED}✗${RESET}` : `${YELLOW}⚠${RESET}`;
      console.log(`\n  ${statusIcon} ${BOLD}${song.title}${RESET} – ${song.artist} (${song.songId})`);

      for (const e of song.errors) {
        console.log(`     ${RED}FEHLER${RESET} [${e.field}]: ${e.message}`);
      }
      for (const w of song.warnings) {
        console.log(`     ${YELLOW}WARN ${RESET} [${w.field}]: ${w.message}`);
      }
    }
  }

  // Abschlussmeldung
  console.log('\n' + '─'.repeat(60));
  if (result.allErrors.length === 0) {
    console.log(`${GREEN}✓ Alle Songs sind gültig!${RESET}`);
    if (result.allWarnings.length > 0) {
      console.log(`${YELLOW}⚠ ${result.allWarnings.length} Warnung(en) – Songs sind spielbar, aber unvollständig.${RESET}`);
    }
  } else {
    console.log(`${RED}✗ ${result.allErrors.length} Fehler gefunden – bitte beheben!${RESET}`);
  }
  console.log('');
}

// ─── Script-Einstiegspunkt ────────────────────────────────────────────────────

// Wird nur ausgeführt, wenn diese Datei direkt aufgerufen wird (nicht beim Import)
// Verwendung: npx tsx src/utils/validate-song-data.ts [pfad/zur/datei.json]
async function main() {
  const fs = await import('fs');
  const path = await import('path');

  // Standard-Pack-Datei oder per Argument angeben
  const targetFile = process.argv[2] ?? 'src/data/packs/global-hits.json';
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

  // Exit-Code 1 wenn Fehler vorhanden (für CI/CD)
  if (result.allErrors.length > 0) {
    process.exit(1);
  }
}

// Nur ausführen wenn direkt aufgerufen
const isMainModule = process.argv[1]?.includes('validate-song-data');
if (isMainModule) {
  main();
}
