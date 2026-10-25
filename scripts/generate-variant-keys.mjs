#!/usr/bin/env node
/**
 * Generator for `src/i18n/variant-keys.ts`
 *
 * Some texts are deliberately varied (reveal wordings, feedback,
 * team names). Each family therefore has a key list. The lists are
 * **generated from the locale files** so that keys and list cannot drift
 * apart: a key that disappears from the locale file makes this file invalid.
 *
 * Usage:
 *   node scripts/generate-variant-keys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');
const TARGET = join(ROOT, 'src/i18n/variant-keys.ts');

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

const de = flatten(
  JSON.parse(readFileSync(join(LOCALES_DIR, 'de.json'), 'utf8'))
);
const en = flatten(
  JSON.parse(readFileSync(join(LOCALES_DIR, 'en.json'), 'utf8'))
);

/** All keys matching the prefix, in numeric order. */
function family(prefix, suffixPattern = /(\d+)(?:_(\d+))?$/) {
  const matches = [];
  for (const key of Object.keys(de)) {
    if (!key.startsWith(prefix)) continue;
    const tail = key.slice(prefix.length);
    const match = tail.match(suffixPattern);
    if (!match) continue;
    matches.push({
      key,
      primary: Number(match[1]),
      secondary: match[2] ? Number(match[2]) : 0,
    });
  }
  matches.sort((a, b) => a.primary - b.primary || a.secondary - b.secondary);
  return matches.map((entry) => entry.key);
}

function assertParity(keys, label) {
  for (const key of keys) {
    if (!(key in en)) {
      throw new Error(
        `Key "${key}" (${label}) is missing in en.json — DE/EN are not in parallel.`
      );
    }
  }
}

/** Families with the pattern `<prefix><n>` or `<prefix><n>_<m>`. */
const FAMILIES = [
  ['TIMELINE_GENERIC_KEYS', 'game.reveal.timeline.generic'],
  ['HINT_SUBLINE_KEYS', 'game.reveal.hint.subline'],
  ['LYRICS_FAKE_LABEL_KEYS', 'game.reveal.lyrics.fakeLabel'],
  ['VIBE_HEADLINE_KEYS', 'game.reveal.vibe.headline'],
  ['COVER_HEADLINE_KEYS', 'game.reveal.cover.headline'],
  ['SURVIVOR_YES_KEYS', 'game.reveal.survivor.yes'],
  ['SURVIVOR_NO_KEYS', 'game.reveal.survivor.no'],
  ['SCORING_HEADER_KEYS', 'game.reveal.scoringHeader'],
  ['NEXT_ROUND_KEYS', 'game.reveal.nextRoundLabel'],
  ['DRAW_LABEL_KEYS', 'game.drawing.drawLabel'],
  ['PILOT_LABEL_KEYS', 'game.drawing.pilotLabel'],
  ['FEEDBACK_CORRECT_KEYS', 'game.feedback.correct_'],
  ['FEEDBACK_WRONG_KEYS', 'game.feedback.wrong_'],
  ['LAST_ROUND_HEADLINE_KEYS', 'game.lastRound.headline'],
  ['LAST_ROUND_SUBLINE_KEYS', 'game.lastRound.subline'],
  ['FUNNY_TEAM_NAME_KEYS', 'lobby.team.funnyName'],
];

const blocks = [];

for (const [name, prefix] of FAMILIES) {
  const keys = family(prefix);
  if (keys.length === 0)
    throw new Error(`No keys found for family "${name}" (${prefix}).`);
  assertParity(keys, name);
  blocks.push(
    `/** ${keys.length} Varianten aus \`${prefix}*\`. */\n` +
      `export const ${name} = [\n${keys.map((key) => `  '${key}',`).join('\n')}\n] as const satisfies readonly TranslationKey[];`
  );
}

// ─── Decade variants: game.reveal.timeline.decade1950_1, decade1960_2, … ───
const decadeKeys = family('game.reveal.timeline.decade');
assertParity(decadeKeys, 'TIMELINE_DECADE_KEYS');
const byDecade = new Map();
for (const key of decadeKeys) {
  const match = key.match(/decade(\d{4})_(\d+)$/);
  if (!match) throw new Error(`Unexpected decade key: ${key}`);
  const decade = Number(match[1]);
  if (!byDecade.has(decade)) byDecade.set(decade, []);
  byDecade.get(decade).push(key);
}
const decades = [...byDecade.keys()].sort((a, b) => a - b);
blocks.push(
  `/** Jahrzehnt-Varianten: je Jahrzehnt eine eigene Liste. */\n` +
    `export const TIMELINE_DECADE_KEYS: Readonly<Record<number, readonly TranslationKey[]>> = {\n` +
    decades
      .map(
        (decade) =>
          `  ${decade}: [\n${byDecade
            .get(decade)
            .map((key) => `    '${key}',`)
            .join('\n')}\n  ],`
      )
      .join('\n') +
    `\n};`
);

// NOTE: the header and the per-family doc comments below are the *content* of
// the generated file `src/i18n/variant-keys.ts`. They are kept in German so
// that the generator and the committed file stay byte-identical — changing
// them would require regenerating that file as well.
const header = `/**
 * Typisierte Schlüssellisten für variierte Texte.
 *
 * GENERIERTE DATEI — nicht von Hand bearbeiten.
 * Neu erzeugen mit: \`node scripts/generate-variant-keys.mjs\`
 *
 * Der Typ \`TranslationKey\` ist die Vereinigung aller Schlüssel aus
 * \`de.json\`. Deshalb bricht der Compiler, sobald ein Schlüssel aus der
 * Sprachdatei verschwindet oder ein Tippfehler in einer Liste landet.
 */
import type { TranslationKey } from './types';
`;

const output = `${header}\n${blocks.join('\n\n')}\n`;
writeFileSync(TARGET, output, 'utf8');

console.log(
  `src/i18n/variant-keys.ts written: ${FAMILIES.length} families, ` +
    `${decades.length} decades, ${FAMILIES.reduce((sum, [name, prefix]) => sum + family(prefix).length, 0) + decadeKeys.length} keys.`
);
