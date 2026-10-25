#!/usr/bin/env node
/**
 * Prüft für einen Satz TSX-Dateien, ob jeder `t('…')`-Schlüssel in BEIDEN
 * Sprachdateien (src/i18n/locales/{de,en}.json, inkl. parts/) existiert.
 *
 * Aufruf:
 *   node scripts/verify-used-i18n-keys.mjs <datei> [<datei> …]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = join(ROOT, 'src/i18n/locales');
const PARTS = join(LOCALES, 'parts');

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

function loadLocale(lang) {
  const merged = flatten(
    JSON.parse(readFileSync(join(LOCALES, `${lang}.json`), 'utf8'))
  );
  // `parts/` ist ein Zwischenstand der Migration. Im Endzustand gibt es
  // eine Datei je Sprache — die Schleife ist dann ein No-op.
  if (!existsSync(PARTS)) return merged;
  for (const file of readdirSync(PARTS)) {
    if (!file.endsWith(`.${lang}.json`)) continue;
    Object.assign(
      merged,
      flatten(JSON.parse(readFileSync(join(PARTS, file), 'utf8')))
    );
  }
  return merged;
}

const de = loadLocale('de');
const en = loadLocale('en');

/**
 * Ein Schlüssel gilt als vorhanden, wenn er direkt existiert oder als
 * Pluralform (`key_one` + `key_other`) angelegt ist — so wie i18next
 * zur Laufzeit auflöst.
 */
function resolves(map, key) {
  if (key in map) return true;
  return `${key}_one` in map && `${key}_other` in map;
}

const files = process.argv.slice(2);
let missing = 0;
let used = 0;

for (const file of files) {
  const source = readFileSync(join(ROOT, file), 'utf8');
  const keys = [...source.matchAll(/\bt\(\s*'([^']+)'/g)].map((m) => m[1]);
  const unique = [...new Set(keys)];
  used += unique.length;
  const problems = unique.filter((k) => !resolves(de, k) || !resolves(en, k));
  missing += problems.length;
  console.log(
    `${file}: ${unique.length} Schlüssel, ${problems.length} fehlend`
  );
  for (const p of problems) {
    console.log(
      `    FEHLT: ${p} (de: ${resolves(de, p) ? 'ja' : 'nein'}, en: ${resolves(en, p) ? 'ja' : 'nein'})`
    );
  }
}

console.log(`\nSumme genutzte Schlüssel: ${used}, fehlend: ${missing}`);
process.exit(missing > 0 ? 1 : 0);
