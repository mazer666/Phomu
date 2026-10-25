#!/usr/bin/env node
/**
 * Adds the predefined keys from CONTRACT.md §5.1/§5.2 to both locale files
 * and adds them to the generated key lists.
 *
 * Existing values are **not** overwritten. A deviating value is reported so
 * that a human can decide — the script never overwrites an existing
 * translation.
 *
 * Usage:
 *   node scripts/seed-shared-keys.mjs          # adds and writes
 *   node scripts/seed-shared-keys.mjs --check  # does not write, reports only
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');
const CHECK_ONLY = process.argv.includes('--check');

/**
 * The shared base that must be present identically in EVERY language.
 *
 * IMPORTANT: there are **no** mode display names here. `modes.timeline` would
 * be a leaf and would destroy the nested object `modes.timeline.*` (name,
 * description, decade hints …) in the same namespace. The display name of a
 * mode lives in `modes.<mode>.name`.
 * Proper names (Phomu, Spotify, YouTube, Jackbox, Music Wall) deliberately
 * stay the same — that is correct and not a translation error.
 */
const SHARED = {
  de: {
    'common.appName': 'Phomu',
    'common.back': 'Zurück',
    'common.cancel': 'Abbrechen',
    'common.close': 'Schließen',
    'common.confirm': 'Bestätigen',
    'common.continue': 'Weiter',
    'common.start': 'Starten',
    'common.finish': 'Beenden',
    'common.next': 'Weiter',
    'common.previous': 'Zurück',
    'common.retry': 'Erneut versuchen',
    'common.loading': 'Lädt …',
    'common.error': 'Fehler',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    'common.player': 'Spieler',
    'common.player_one': 'Spieler',
    'common.player_other': 'Spieler',
    'common.points': 'Punkte',
    'common.points_one': 'Punkt',
    'common.points_other': 'Punkte',
    'common.round': 'Runde',
    'common.round_one': 'Runde',
    'common.round_other': 'Runden',
    'common.team': 'Team',
    'common.teams': 'Teams',
    'common.song': 'Song',
    'common.songs': 'Songs',
    'common.pause': 'Pause',
    'common.play': 'Abspielen',
    'common.skip': 'Überspringen',
    'common.settings': 'Einstellungen',
    'common.help': 'Hilfe',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'common.search': 'Suchen',
    'common.all': 'Alle',
    'common.none': 'Keine',
    'common.optional': 'Optional',
    'common.required': 'Pflichtfeld',
    'common.copy': 'Kopieren',
    'common.share': 'Teilen',
    'common.language': 'Sprache',
    'common.theme': 'Design',
    'common.privacyNotice': 'Datenschutzhinweis',
    'common.notAvailable': 'Nicht verfügbar',
    'errors.generic': 'Etwas ist schiefgelaufen.',
    'errors.network': 'Netzwerkfehler. Bitte prüfe deine Verbindung.',
    'errors.audioBlocked':
      'Der Ton wird von deinem Browser blockiert. Bitte tippe auf Play.',
    'errors.notFound': 'Nicht gefunden.',
    'errors.unauthorized': 'Nicht berechtigt.',
    'a11y.musicPlaying': 'Musik läuft',
    'a11y.musicPaused': 'Musik pausiert',
    'a11y.closeDialog': 'Dialog schließen',
    'a11y.timerRemaining': 'Noch {{seconds}} Sekunden',
    'themes.jackbox': 'Jackbox Party',
    'themes.spotify': 'Spotify',
    'themes.youtube': 'YouTube',
    'themes.musicwall': 'Music Wall',
  },
  en: {
    'common.appName': 'Phomu',
    'common.back': 'Back',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.continue': 'Continue',
    'common.start': 'Start',
    'common.finish': 'Finish',
    'common.next': 'Next',
    'common.previous': 'Back',
    'common.retry': 'Try again',
    'common.loading': 'Loading …',
    'common.error': 'Error',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.player': 'Player',
    'common.player_one': 'Player',
    'common.player_other': 'Players',
    'common.points': 'Points',
    'common.points_one': 'Point',
    'common.points_other': 'Points',
    'common.round': 'Round',
    'common.round_one': 'Round',
    'common.round_other': 'Rounds',
    'common.team': 'Team',
    'common.teams': 'Teams',
    'common.song': 'Song',
    'common.songs': 'Songs',
    'common.pause': 'Pause',
    'common.play': 'Play',
    'common.skip': 'Skip',
    'common.settings': 'Settings',
    'common.help': 'Help',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.search': 'Search',
    'common.all': 'All',
    'common.none': 'None',
    'common.optional': 'Optional',
    'common.required': 'Required',
    'common.copy': 'Copy',
    'common.share': 'Share',
    'common.language': 'Language',
    'common.theme': 'Theme',
    'common.privacyNotice': 'Privacy notice',
    'common.notAvailable': 'Not available',
    'errors.generic': 'Something went wrong.',
    'errors.network': 'Network error. Please check your connection.',
    'errors.audioBlocked': 'Audio is blocked by your browser. Please tap play.',
    'errors.notFound': 'Not found.',
    'errors.unauthorized': 'Unauthorized.',
    'a11y.musicPlaying': 'Music is playing',
    'a11y.musicPaused': 'Music is paused',
    'a11y.closeDialog': 'Close dialog',
    'a11y.timerRemaining': '{{seconds}} seconds remaining',
    'themes.jackbox': 'Jackbox Party',
    'themes.spotify': 'Spotify',
    'themes.youtube': 'YouTube',
    'themes.musicwall': 'Music Wall',
  },
};

function flatten(object, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

function nest(flat) {
  const root = {};
  for (const [path, value] of Object.entries(flat)) {
    const segments = path.split('.');
    let node = root;
    for (let i = 0; i < segments.length - 1; i += 1) {
      if (typeof node[segments[i]] !== 'object' || node[segments[i]] === null) {
        node[segments[i]] = {};
      }
      node = node[segments[i]];
    }
    node[segments[segments.length - 1]] = value;
  }
  return root;
}

let problems = 0;

for (const language of ['de', 'en']) {
  const file = join(LOCALES_DIR, `${language}.json`);
  const current = flatten(JSON.parse(readFileSync(file, 'utf8')));
  const wanted = SHARED[language];

  let added = 0;
  for (const [key, value] of Object.entries(wanted)) {
    if (key in current) {
      if (current[key] !== value) {
        console.error(
          `⚠ ${language}: "${key}" already exists with a different value ` +
            `(${JSON.stringify(current[key])} instead of ${JSON.stringify(value)}) — not overwritten.`
        );
        problems += 1;
      }
      continue;
    }
    current[key] = value;
    added += 1;
  }

  console.log(
    `${language}: ${added} keys added, ${Object.keys(current).length} in total.`
  );
  if (!CHECK_ONLY) {
    writeFileSync(file, `${JSON.stringify(nest(current), null, 2)}\n`, 'utf8');
  }
}

if (problems > 0) {
  console.error(`\n${problems} deviation(s) — please decide by hand.`);
  process.exitCode = 1;
}
