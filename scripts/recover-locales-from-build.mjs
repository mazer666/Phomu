#!/usr/bin/env node
/**
 * Reconstructs the locale files from the Next build cache.
 *
 * Background: a migration step overwrote the nested keys of the game modes
 * (`modes.timeline.*`) with a leaf key of the same name. The build cache
 * `.next/` still contains the locale data in the form it had before the
 * overwrite was written into the bundle — from there it can be recovered
 * without loss.
 *
 * Usage:
 *   node scripts/recover-locales-from-build.mjs [--out <directory>]
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const NEXT_DIR = join(ROOT, '.next');

/** All files below a directory. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Resolves a JavaScript string literal into the JSON character string it
 * contains.
 *
 * The bundler embeds the locale data as `JSON.parse('…')`. The content of
 * the literal is the JSON character string, **escaped** according to the
 * rules for a JavaScript string literal: `\` → `\\`, `'` → `\'`. This
 * escaping has to be undone so that valid JSON emerges again.
 */
function toJsonText(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char !== '\\') {
      out += char;
      continue;
    }
    const next = raw[i + 1];
    i += 1;
    switch (next) {
      case 'n':
        out += '\n';
        break;
      case 't':
        out += '\t';
        break;
      case 'r':
        out += '\r';
        break;
      case 'b':
        out += '\b';
        break;
      case 'f':
        out += '\f';
        break;
      case 'u': {
        const hex = raw.slice(i + 1, i + 5);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
        } else {
          out += 'u';
        }
        break;
      }
      default:
        // \\ \' " and all unknown sequences: the character itself
        out += next;
        break;
    }
  }
  return out;
}

/**
 * Detects the language of a translation tree via a key whose value differs
 * between the languages.
 */
function classify(translation) {
  const back = translation?.common?.back;
  return back === 'Back' ? 'en' : 'de';
}

const candidates = [];
for (const file of walk(NEXT_DIR)) {
  if (!/\.(js|map)$/.test(file)) continue;
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const marker = "JSON.parse('";
  let pos = 0;
  while ((pos = source.indexOf(marker, pos)) !== -1) {
    const start = pos + marker.length;
    let index = start;
    let raw = '';
    while (index < source.length) {
      const char = source[index];
      if (char === '\\') {
        raw += char + source[index + 1];
        index += 2;
        continue;
      }
      if (char === "'") break;
      raw += char;
      index += 1;
    }
    pos = index + 1;

    try {
      const parsed = JSON.parse(toJsonText(raw));
      if (parsed && typeof parsed === 'object' && parsed.app && parsed.modes) {
        candidates.push({ file, data: parsed });
      }
    } catch {
      // No locale bundle — ignore.
    }
  }
}

if (candidates.length === 0) {
  console.error('No locale data found in the build cache.');
  process.exit(1);
}

const languages = new Map();
for (const candidate of candidates) {
  // Two forms occur: the plain translation tree or a bundle
  // `{ de: { translation }, en: { translation } }`.
  const bundles = candidate.data.translation
    ? Object.entries(candidate.data).map(([language, value]) => [
        language,
        value.translation ?? value,
      ])
    : [[classify(candidate.data), candidate.data]];

  for (const [language, translation] of bundles) {
    if (!translation || typeof translation !== 'object') continue;
    if (languages.has(language)) continue;
    languages.set(language, { data: translation, file: candidate.file });
  }
}

const outDir = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : join(ROOT, '.locale-recovery');

mkdirSync(outDir, { recursive: true });

for (const [language, entry] of languages) {
  const target = join(outDir, `${language}.json`);
  writeFileSync(target, `${JSON.stringify(entry.data, null, 2)}\n`, 'utf8');
  const count = Object.keys(entry.data).length;
  console.log(
    `${language}: ${count} namespaces from ${entry.file.replace(ROOT + '/', '')} → ${target}`
  );
}

console.log(
  `\n${languages.size} locale file(s) reconstructed. Review them before you take them over.`
);
