#!/usr/bin/env node
/**
 * i18n merge (CONTRACT §5.3, final form)
 *
 * Merges the part files from src/i18n/locales/parts/*.json into the two
 * locale files src/i18n/locales/de.json and en.json.
 *
 * Output form: one flat file per language, nested by namespace.
 * Usage:
 *   node scripts/merge-i18n-parts.mjs          # merges and writes
 *   node scripts/merge-i18n-parts.mjs --check  # does not write, reports only
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');
const PARTS_DIR = join(LOCALES_DIR, 'parts');
const CHECK_ONLY = process.argv.includes('--check');

/** Turns a nested object into a flat dot-path map. */
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

/** Rebuilds a nested object from a flat dot-path map. */
function nest(flat) {
  const root = {};
  for (const [path, value] of Object.entries(flat)) {
    const segments = path.split('.');
    let node = root;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i];
      if (typeof node[segment] !== 'object' || node[segment] === null) {
        node[segment] = {};
      }
      node = node[segment];
    }
    node[segments[segments.length - 1]] = value;
  }
  return root;
}

/** Reads all part files of one language: parts/<name>.<lang>.json and parts/<name>.json. */
function readParts(language) {
  const merged = {};
  const sources = [];
  if (!existsSync(PARTS_DIR)) return { merged, sources };

  const files = readdirSync(PARTS_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort();
  for (const file of files) {
    const isLanguageSpecific = file.endsWith(`.${language}.json`);
    const isNeutral = !file.endsWith('.de.json') && !file.endsWith('.en.json');
    if (!isLanguageSpecific && !isNeutral) continue;

    const raw = JSON.parse(readFileSync(join(PARTS_DIR, file), 'utf8'));
    const flat = flatten(raw);
    for (const [key, value] of Object.entries(flat)) {
      if (key in merged && merged[key] !== value) {
        throw new Error(
          `Duplicate key with differing values: "${key}" ` +
            `(${sources[sources.length - 1]} vs. ${file})`
        );
      }
      merged[key] = value;
      sources.push(file);
    }
  }
  return { merged, sources };
}

const report = [];
for (const language of ['de', 'en']) {
  const basePath = join(LOCALES_DIR, `${language}.json`);
  const base = existsSync(basePath)
    ? flatten(JSON.parse(readFileSync(basePath, 'utf8')))
    : {};
  const { merged: parts, sources } = readParts(language);

  const combined = { ...base };
  const conflicts = [];
  for (const [key, value] of Object.entries(parts)) {
    if (key in combined && combined[key] !== value) {
      conflicts.push(key);
    }
    combined[key] = value;
  }

  const keyCount = Object.keys(combined).length;
  report.push({ language, keyCount, partFiles: sources.length, conflicts });

  if (conflicts.length > 0) {
    console.error(
      `✗ ${language}: ${conflicts.length} conflict(s) between base and part files:`
    );
    for (const key of conflicts) console.error(`    ${key}`);
    process.exitCode = 1;
    continue;
  }

  if (!CHECK_ONLY) {
    writeFileSync(
      basePath,
      `${JSON.stringify(nest(combined), null, 2)}\n`,
      'utf8'
    );
  }
}

for (const entry of report) {
  console.log(
    `${entry.language}: ${entry.keyCount} keys from ${entry.partFiles} part file(s)` +
      (entry.conflicts.length > 0
        ? ` — ${entry.conflicts.length} conflict(s)`
        : '')
  );
}

if (CHECK_ONLY) {
  console.log('(--check: nothing written)');
}
