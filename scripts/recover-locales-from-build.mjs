#!/usr/bin/env node
/**
 * Rekonstruiert die Sprachdateien aus dem Next-Build-Cache.
 *
 * Hintergrund: Ein Migrationsschritt hat die verschachtelten Schlüssel der
 * Spielmodi (`modes.timeline.*`) durch einen Blatt-Schlüssel mit demselben
 * Namen überschrieben. Der Build-Cache `.next/` enthält die Sprachdaten
 * noch in der Form, in der sie vor dem Überschreiben in den Bundle
 * geschrieben wurden — daraus lassen sie sich verlustfrei zurückholen.
 *
 * Aufruf:
 *   node scripts/recover-locales-from-build.mjs [--out <verzeichnis>]
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

/** Alle Dateien unterhalb eines Verzeichnisses. */
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
 * Löst ein JavaScript-Stringliteral in die enthaltene JSON-Zeichenkette auf.
 *
 * Der Bundler bettet die Sprachdaten als `JSON.parse('…')` ein. Der Inhalt
 * des Literals ist die JSON-Zeichenkette, **maskiert** nach den Regeln für
 * ein JavaScript-Stringliteral: `\` → `\\`, `'` → `\'`. Diese Maskierung muss
 * rückgängig gemacht werden, damit wieder gültiges JSON entsteht.
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
        // \\ \' \" und alle unbekannten Sequenzen: das Zeichen selbst
        out += next;
        break;
    }
  }
  return out;
}

/**
 * Erkennt die Sprache eines Übersetzungsbaums an einem Schlüssel, dessen
 * Wert sich zwischen den Sprachen unterscheidet.
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
      // Kein Locale-Bundle — ignorieren.
    }
  }
}

if (candidates.length === 0) {
  console.error('Keine Sprachdaten im Build-Cache gefunden.');
  process.exit(1);
}

const languages = new Map();
for (const candidate of candidates) {
  // Zwei Formen kommen vor: der reine Übersetzungsbaum oder ein Bündel
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
    `${language}: ${count} Namespaces aus ${entry.file.replace(ROOT + '/', '')} → ${target}`
  );
}

console.log(
  `\n${languages.size} Sprachdatei(en) rekonstruiert. Prüfe sie, bevor du sie übernimmst.`
);
