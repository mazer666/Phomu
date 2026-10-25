#!/usr/bin/env node
/**
 * count-ui-literals.mjs
 *
 * Counts potentially visible literal texts in TSX files.
 *
 * The scanner is deliberately conservative-extended: it collects
 *  1. JSX text nodes (text between > and <),
 *  2. text-bearing attributes (title, placeholder, aria-label, alt, label),
 *  3. UI data objects (label:, title:, description:, text:, sub:, note:, tagline:, name:),
 *  4. dialog texts (alert(), confirm()).
 *
 * Not captured: className-, style-, key-, href-, src-, type- and
 * data-attributes as well as import statements and object keys.
 *
 * Usage:  node scripts/count-ui-literals.mjs [--list]
 * Exit code: 0 (always) — the script only measures, it does not check.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Files in the scope of this worker (shell/lobby/browse/settings/admin/legal/guide/UI). */
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

/** Removes comments and strings that are no UI texts (import/path strings). */
function stripNoise(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

function isNoiseLiteral(value) {
  const v = value.trim();
  if (!v) return true;
  // Code fragments (false positives of the JSX text regex)
  if (/[;{}]/.test(v) || /=>/.test(v)) return true;
  if (/&&/.test(v) || /\?\s*[:(]/.test(v) || /===/.test(v)) return true;
  if (/\b(const|let|var|function|return|import|export|default)\b/.test(v))
    return true;
  // pure import/path strings
  if (/^(@\/|\.\.?\/|src\/|https?:\/\/)/.test(v)) return true;
  // pure hex colour value, CSS variable, number
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true;
  if (/^var\(--/.test(v)) return true;
  if (/^-?\d+(\.\d+)?$/.test(v)) return true;
  // pure symbols/emojis/punctuation (e.g. "✕", "✓", "🕹️", "→") are allowed
  if (!/\p{L}/u.test(v)) return true;
  return false;
}

function extractLiterals(src) {
  const found = [];
  const clean = stripNoise(src);

  // 1. JSX text nodes: >Text<
  const jsxText = />\s*([^<>{}][^<>{}]*?)\s*</g;
  for (const m of clean.matchAll(jsxText)) {
    const value = m[1];
    if (!isNoiseLiteral(value))
      found.push({ kind: 'jsx-text', value: value.trim() });
  }

  // 2. text-bearing attributes
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

  // 3. UI data objects
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
    console.error(`MISSING: ${rel}`);
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
console.log(`Total literal texts: ${total}`);
console.log(`Files checked: ${perFile.length}`);

if (showList) {
  console.log('\n=== All findings ===');
  for (const f of perFile) {
    for (const l of f.literals) {
      console.log(`${f.rel}\t${l.kind}\t${JSON.stringify(l.value)}`);
    }
  }
}
