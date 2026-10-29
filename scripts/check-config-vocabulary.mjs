#!/usr/bin/env node
/**
 * Quality gate: the shell and the base speak the same vocabulary
 * -------------------------------------------------------------------------
 * The configuration of the game crosses the bridge as strings. The shell
 * names a value one way, the base expects it another way — and the game
 * then refuses to start with "invalidConfiguration", which the player only
 * sees as a button that does nothing.
 *
 * This gate compares the two vocabularies:
 *   - the union types of the shell (`src/types/game-state.ts`)
 *   - the values the bridges accept (`platform/phomu-wasm/src/config.rs`,
 *     `platform/phomu-ffi/src/core_api.rs`)
 *
 * A value that the shell can send and the base does not accept is an error,
 * and a value the base accepts and the shell cannot send is an error too.
 *
 * Usage: npm run check:config-vocabulary
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const SHELL_TYPES = path.join(REPO_ROOT, 'src/types/game-state.ts');
const BRIDGE_FILES = [
  path.join(REPO_ROOT, 'platform/phomu-wasm/src/config.rs'),
  path.join(REPO_ROOT, 'platform/phomu-ffi/src/core_api.rs'),
];

/**
 * The union types of the shell.
 *
 * @param {string} source the content of the type file
 * @returns {Map<string, Set<string>>} the values per type
 */
function shellVocabulary(source) {
  const vocabulary = new Map();
  const pattern = /export type (\w+)\s*=\s*([^;]+);/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const values = new Set(
      [...match[2].matchAll(/'([^']+)'/g)].map((entry) => entry[1])
    );
    if (values.size > 0) vocabulary.set(match[1], values);
  }
  return vocabulary;
}

/**
 * The values the bridges accept, per enum.
 *
 * @param {string} source the content of a bridge file
 * @returns {Map<string, Set<string>>} the values per enum
 */
function bridgeVocabulary(source) {
  const vocabulary = new Map();
  const pattern = /"([^"]+)"\s*=>\s*(\w+)::/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const enumName = match[2];
    if (!vocabulary.has(enumName)) vocabulary.set(enumName, new Set());
    vocabulary.get(enumName).add(match[1]);
  }
  return vocabulary;
}

const shell = shellVocabulary(fs.readFileSync(SHELL_TYPES, 'utf8'));
const bridge = new Map();
for (const file of BRIDGE_FILES) {
  if (!fs.existsSync(file)) continue;
  for (const [name, values] of bridgeVocabulary(fs.readFileSync(file, 'utf8'))) {
    if (!bridge.has(name)) bridge.set(name, new Set());
    for (const value of values) bridge.get(name).add(value);
  }
}

console.log('Phomu quality gate: the vocabulary of the configuration');
console.log(`Shell types: ${shell.size} | Bridge enums: ${bridge.size}`);

const findings = [];

// The Rust enum is named in PascalCase, the shell type in camelCase. The
// comparison therefore runs over the normalised name.
const normalise = (name) => name.replace(/[-_]/g, '').toLowerCase();

for (const [typeName, values] of shell) {
  const wanted = normalise(typeName);
  let target = null;
  for (const [enumName, enumValues] of bridge) {
    if (normalise(enumName) === wanted) {
      target = [enumName, enumValues];
      break;
    }
  }
  if (!target) continue; // No counterpart — nothing to compare.

  const [enumName, enumValues] = target;
  const missing = [...values].filter((value) => !enumValues.has(value));
  const extra = [...enumValues].filter((value) => !values.has(value));

  for (const value of missing) {
    findings.push(
      `the shell sends "${value}" for ${typeName}, the base (${enumName}) does not accept it`,
    );
  }
  for (const value of extra) {
    findings.push(
      `the base (${enumName}) accepts "${value}", the shell (${typeName}) cannot send it`,
    );
  }
}

if (findings.length === 0) {
  console.log('✅ The shell and the base name the configuration the same way.');
  process.exit(0);
}

console.error(`\n❌ ${findings.length} mismatch(es):`);
for (const finding of findings) console.error(`   ${finding}`);
console.error(
  '\nA mismatch means the game refuses to start. The value of a configuration',
);
console.error(
  'that lives in the persisted state belongs to the shell — the base has to',
);
console.error('speak that spelling.');
process.exit(1);
