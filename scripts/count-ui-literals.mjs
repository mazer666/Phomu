#!/usr/bin/env node
/**
 * count-ui-literals.mjs
 *
 * Zaehlt potenziell sichtbare Literaltexte in TSX-Dateien.
 *
 * Der Scanner ist absichtlich konservativ-erweitert: er sammelt
 *  1. JSX-Textknoten (Text zwischen > und <),
 *  2. texttragende Attribute (title, placeholder, aria-label, alt, label),
 *  3. UI-Datenobjekte (label:, title:, description:, text:, sub:, note:, tagline:, name:),
 *  4. Dialogtexte (alert(), confirm()).
 *
 * Nicht erfasst werden: className-, style-, key-, href-, src-, type- und
 * data-Attribute sowie Import-Statements und Objekt-Schluessel.
 *
 * Aufruf:  node scripts/count-ui-literals.mjs [--list]
 * Exitcode: 0 (immer) — das Skript misst nur, es prueft nicht.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Dateien im Zuständigkeitsbereich dieses Workers (Shell/Lobby/Browse/Settings/Admin/Legal/Guide/UI). */
export const SCOPE_FILES = [
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/app/lobby/page.tsx',
  'src/app/browse/page.tsx',
  'src/app/settings/page.tsx',
  'src/app/settings/account/page.tsx',
  'src/app/settings/audio/page.tsx',
  'src/app/settings/game-rules/page.tsx',
  'src/app/settings/governance/page.tsx',
  'src/app/settings/profile/page.tsx',
  'src/app/admin/review/page.tsx',
  'src/app/admin/songs/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/guide/page.tsx',
  'src/components/lobby/ModeSelector.tsx',
  'src/components/lobby/PackSelector.tsx',
  'src/components/lobby/PlayerCard.tsx',
  'src/components/browse/SongCard.tsx',
  'src/components/admin/SongEditor.tsx',
  'src/components/ui/NavBar.tsx',
  'src/components/ui/ThemeSwitcher.tsx',
  'src/components/ui/Tooltip.tsx',
];

const TEXT_ATTRIBUTES = [
  'title',
  'placeholder',
  'aria-label',
  'alt',
  'label',
  'content',
];
const DATA_KEYS = [
  'label',
  'title',
  'description',
  'text',
  'sub',
  'note',
  'tagline',
  'name',
  'favourite',
  'flavour',
  'heading',
  'placeholder',
];

/** Entfernt Kommentare und Strings, die keine UI-Texte sind (Import-/Pfad-Strings). */
function stripNoise(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

function isNoiseLiteral(value) {
  const v = value.trim();
  if (!v) return true;
  // Code-Fragmente (false positives des JSX-Textregex)
  if (/[;{}]/.test(v) || /=>/.test(v)) return true;
  if (/&&/.test(v) || /\?\s*[:(]/.test(v) || /===/.test(v)) return true;
  if (/\b(const|let|var|function|return|import|export|default)\b/.test(v))
    return true;
  // reine Import-/Pfad-Strings
  if (/^(@\/|\.\.?\/|src\/|https?:\/\/)/.test(v)) return true;
  // reiner Hex-Farbwert, CSS-Variable, Zahl
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true;
  if (/^var\(--/.test(v)) return true;
  if (/^-?\d+(\.\d+)?$/.test(v)) return true;
  // reine Symbole/Emojis/Punktuation (z. B. "✕", "✓", "🕹️", "→") sind erlaubt
  if (!/\p{L}/u.test(v)) return true;
  return false;
}

function extractLiterals(src) {
  const found = [];
  const clean = stripNoise(src);

  // 1. JSX-Textknoten: >Text<
  const jsxText = />\s*([^<>{}][^<>{}]*?)\s*</g;
  for (const m of clean.matchAll(jsxText)) {
    const value = m[1];
    if (!isNoiseLiteral(value))
      found.push({ kind: 'jsx-text', value: value.trim() });
  }

  // 2. texttragende Attribute
  for (const attr of TEXT_ATTRIBUTES) {
    const re = new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`, 'g');
    for (const m of clean.matchAll(re)) {
      if (!isNoiseLiteral(m[1]))
        found.push({ kind: `attr:${attr}`, value: m[1].trim() });
    }
    const re2 = new RegExp(`\\b${attr}\\s*=\\s*'([^']*)'`, 'g');
    for (const m of clean.matchAll(re2)) {
      if (!isNoiseLiteral(m[1]))
        found.push({ kind: `attr:${attr}`, value: m[1].trim() });
    }
  }

  // 3. UI-Datenobjekte
  for (const key of DATA_KEYS) {
    const re = new RegExp(`\\b${key}\\s*:\\s*"([^"]*)"`, 'g');
    for (const m of clean.matchAll(re)) {
      if (!isNoiseLiteral(m[1]))
        found.push({ kind: `data:${key}`, value: m[1].trim() });
    }
    const re2 = new RegExp(`\\b${key}\\s*:\\s*'([^']*)'`, 'g');
    for (const m of clean.matchAll(re2)) {
      if (!isNoiseLiteral(m[1]))
        found.push({ kind: `data:${key}`, value: m[1].trim() });
    }
  }

  // 4. alert()/confirm()
  for (const fn of ['alert', 'confirm']) {
    const re = new RegExp(`\\b${fn}\\(\\s*"([^"]*)"`, 'g');
    for (const m of clean.matchAll(re)) {
      found.push({ kind: `call:${fn}`, value: m[1].trim() });
    }
    const re2 = new RegExp(`\\b${fn}\\(\\s*'([^']*)'`, 'g');
    for (const m of clean.matchAll(re2)) {
      found.push({ kind: `call:${fn}`, value: m[1].trim() });
    }
  }

  return found;
}

const args = process.argv.slice(2);
const showList = args.includes('--list');

let total = 0;
const perFile = [];

for (const rel of SCOPE_FILES) {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) {
    console.error(`FEHLT: ${rel}`);
    continue;
  }
  const literals = extractLiterals(readFileSync(abs, 'utf8'));
  total += literals.length;
  perFile.push({ rel, literals });
  console.log(`${String(literals.length).padStart(3)}  ${rel}`);
  if (showList) {
    for (const l of literals) {
      console.log(`        [${l.kind}] ${JSON.stringify(l.value)}`);
    }
  }
}

console.log('---');
console.log(`Literaltexte gesamt: ${total}`);
console.log(`Dateien geprueft: ${perFile.length}`);

if (showList) {
  console.log('\n=== Alle Fundstellen ===');
  for (const f of perFile) {
    for (const l of f.literals) {
      console.log(`${f.rel}\t${l.kind}\t${JSON.stringify(l.value)}`);
    }
  }
}
