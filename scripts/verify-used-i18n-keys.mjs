#!/usr/bin/env node
/**
 * Checks for a set of TSX files whether every `t('…')` key exists in BOTH
 * locale files (src/i18n/locales/{de,en}.json, including parts/).
 *
 * Usage:
 *   node scripts/verify-used-i18n-keys.mjs <file> [<file> …]
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
  // `parts/` is an intermediate state of the migration. In the final state
  // there is one file per language — the loop is then a no-op.
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
 * A key counts as present if it exists directly or is created as a plural
 * form (`key_one` + `key_other`) — the way i18next resolves it at runtime.
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
  console.log(`${file}: ${unique.length} keys, ${problems.length} missing`);
  for (const p of problems) {
    console.log(
      `    MISSING: ${p} (de: ${resolves(de, p) ? 'yes' : 'no'}, en: ${resolves(en, p) ? 'yes' : 'no'})`
    );
  }
}

console.log(`\nTotal keys used: ${used}, missing: ${missing}`);
process.exit(missing > 0 ? 1 : 0);
