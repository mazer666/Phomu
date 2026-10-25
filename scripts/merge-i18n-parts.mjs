#!/usr/bin/env node
/**
 * i18n-Merge (CONTRACT §5.3, Schlussform)
 *
 * Führt die Teildateien aus src/i18n/locales/parts/*.json in die beiden
 * Sprachdateien src/i18n/locales/de.json und en.json zusammen.
 *
 * Ausgabeform: eine flache Datei je Sprache, verschachtelt nach Namespace.
 * Aufruf:
 *   node scripts/merge-i18n-parts.mjs          # merged und schreibt
 *   node scripts/merge-i18n-parts.mjs --check  # schreibt nicht, meldet nur
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');
const PARTS_DIR = join(LOCALES_DIR, 'parts');
const CHECK_ONLY = process.argv.includes('--check');

/** Macht aus einem verschachtelten Objekt eine flache Punktpfad-Map. */
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

/** Baut aus einer flachen Punktpfad-Map wieder ein verschachteltes Objekt. */
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

/** Liest alle Teildateien einer Sprache: parts/<name>.<lang>.json und parts/<name>.json. */
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
          `Doppelter Schlüssel mit unterschiedlichen Werten: "${key}" ` +
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
      `✗ ${language}: ${conflicts.length} Konflikt(e) zwischen Basis und Teildateien:`
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
    `${entry.language}: ${entry.keyCount} Schlüssel aus ${entry.partFiles} Teildatei(en)` +
      (entry.conflicts.length > 0
        ? ` — ${entry.conflicts.length} Konflikt(e)`
        : '')
  );
}

if (CHECK_ONLY) {
  console.log('(--check: nichts geschrieben)');
}
