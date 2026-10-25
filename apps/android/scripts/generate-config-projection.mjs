#!/usr/bin/env node
/**
 * Generates the projection of the game constants for the Android shell.
 *
 * WHAT: the constants of `core/phomu-config` become a Kotlin object that the
 * shell reads. The values that the base has not ported yet are read from the
 * reference implementation `src/config/game-config.ts` and are marked as
 * such.
 *
 * WHY a projection and not a table in the shell: rule K-2 of the build
 * contract says that no shell defines a game constant. Rule K-3 allows a
 * shell to hold a *generated* projection of the configuration — a file that
 * is marked as generated, is produced by a tool and is overwritten by the
 * next build. This file is that projection.
 *
 * WHY two sources: the numeric constants live in the base
 * (`core/phomu-config`), and the values that are still missing there are
 * read from the reference implementation of the web shell. The section that
 * comes from the reference implementation is the *open point* of the base:
 * every constant in it has to be ported to `core/phomu-config`, and then it
 * disappears from this projection.
 *
 * Usage:
 *   node scripts/generate-config-projection.mjs --out <file>
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '../../..');

/**
 * The constants the shell reads, and the Kotlin type they become.
 *
 * WHY the list is explicit: the projection is a *projection* of the
 * configuration, not a copy of the source file. A constant that the shell
 * does not need does not travel into the shell.
 */
const FROM_BASE = {
  DEFAULT_WIN_SCORE: 'Int',
  MAX_PLAYERS: 'Int',
  MIN_PLAYERS: 'Int',
  DEFAULT_ROUNDS_TO_PLAY: 'Int',
  MIN_ROUNDS_TO_PLAY: 'Int',
  MAX_ROUNDS_TO_PLAY: 'Int',
  DEFAULT_TARGET_POINTS: 'Int',
  DEFAULT_TARGET_TIME_MINUTES: 'Int',
  DEFAULT_TIMELINE_MAX_POINTS: 'Int',
  DEFAULT_TIME_DECAY_ENABLED: 'Boolean',
  DEFAULT_TIME_DECAY_GRACE_SECONDS: 'Int',
  DEFAULT_TIME_DECAY_STEP_SECONDS: 'Int',
  DEFAULT_TIME_DECAY_STEP_POINTS: 'Int',
  DEFAULT_MIN_POINTS_PER_CORRECT: 'Int',
  DEFAULT_NO_CHEAT_MODE: 'Boolean',
  ENABLE_CHIPS_BETTING: 'Boolean',
  COUNTDOWN_SECONDS: 'Int',
  MEDIA_AUTO_SKIP_COUNTDOWN_SECONDS: 'Int',
  HINT_MASTER_LEVEL_COUNT: 'Int',
  VIBE_CHECK_OPTION_COUNT: 'Int',
  COVER_CONFUSION_CHOICE_COUNT: 'Int',
  TIMELINE_INITIAL_YEARS: 'Int',
};

/**
 * The constants of the base that are arrays.
 *
 * WHY a separate list: an array needs a different Kotlin type and a
 * different literal than a number.
 */
const ARRAYS_FROM_BASE = {
  LOBBY_TARGET_POINTS_PRESETS: 'IntArray',
  LOBBY_ROUNDS_PRESETS: 'IntArray',
  LOBBY_MINUTES_PRESETS: 'IntArray',
};

/**
 * The values that the base has not ported yet.
 *
 * WHY they are read from the reference implementation: the shell must not
 * define a game constant of its own (rule K-2). Until the base carries
 * them, the reference implementation is the only place where they exist, and
 * the projection reads them from there.
 */
const FROM_REFERENCE = {
  DEFAULT_TEAM_MODE: 'individual',
  DEFAULT_OVERRIDE_GOVERNANCE: 'host',
  DEFAULT_HINT_RELEASE_POLICY: 'auto-publish',
  DEFAULT_AI_QUEUE_STRATEGY: 'queue-retry-pending',
  DEFAULT_MUSIC_PROVIDER: 'youtube',
};

/**
 * Reads every single-line constant of the Rust sources of the base.
 *
 * @param {string} directory the directory of the Rust sources
 * @returns {Map<string, string>} the name and the literal of every constant
 */
function readRustConstants(directory) {
  const constants = new Map();
  const pattern = /^pub const ([A-Z0-9_]+):\s*([^=]+?)\s*=\s*(.+);\s*$/;
  for (const entry of fs.readdirSync(directory)) {
    if (!entry.endsWith('.rs')) continue;
    const content = fs.readFileSync(path.join(directory, entry), 'utf8');
    for (const line of content.split('\n')) {
      const match = pattern.exec(line);
      if (!match) continue;
      constants.set(match[1], match[3].trim());
    }
  }
  return constants;
}

/**
 * Reads the string constants of the reference implementation.
 *
 * @param {string} file the path of the reference configuration
 * @returns {Map<string, string>} the name and the value of every constant
 */
function readReferenceConstants(file) {
  const constants = new Map();
  const pattern = /^\s*([A-Z0-9_]+):\s*'([^']*)'/;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = pattern.exec(line);
    if (!match) continue;
    constants.set(match[1], match[2]);
  }
  return constants;
}

/**
 * Turns a Rust literal into a Kotlin literal.
 *
 * @param {string} literal the literal of the Rust source
 * @param {string} type the Kotlin type the literal becomes
 * @returns {string} the Kotlin literal
 */
function toKotlinLiteral(literal, type) {
  if (type === 'IntArray') {
    const numbers = literal
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return `intArrayOf(${numbers.join(', ')})`;
  }
  if (type === 'Boolean') {
    return literal === 'true' ? 'true' : 'false';
  }
  if (type === 'Int') {
    return literal.replace(/_/g, '');
  }
  return literal;
}

/**
 * Runs the generator.
 *
 * @param {string[]} argv the arguments of the process
 */
function main(argv) {
  const outIndex = argv.indexOf('--out');
  if (outIndex === -1 || argv[outIndex + 1] === undefined) {
    throw new Error('the argument --out is required');
  }
  const out = argv[outIndex + 1];

  const rustConstants = readRustConstants(
    path.join(REPOSITORY_ROOT, 'core/phomu-config/src'),
  );
  const referenceConstants = readReferenceConstants(
    path.join(REPOSITORY_ROOT, 'src/config/game-config.ts'),
  );

  const missingBase = Object.keys(FROM_BASE).filter(
    (name) => !rustConstants.has(name),
  );
  if (missingBase.length > 0) {
    throw new Error(
      `the base does not carry the constants: ${missingBase.join(', ')}`,
    );
  }
  const missingArrays = Object.keys(ARRAYS_FROM_BASE).filter(
    (name) => !rustConstants.has(name),
  );
  if (missingArrays.length > 0) {
    throw new Error(
      `the base does not carry the constants: ${missingArrays.join(', ')}`,
    );
  }
  const missingReference = Object.keys(FROM_REFERENCE).filter(
    (name) => !referenceConstants.has(name),
  );
  if (missingReference.length > 0) {
    throw new Error(
      `the reference implementation does not carry the constants: ${missingReference.join(', ')}`,
    );
  }

  const lines = [
    'package de.phomu.config',
    '',
    '/**',
    ' * GENERATED FILE — DO NOT EDIT.',
    ' *',
    ' * The file is written by apps/android/scripts/generate-config-projection.mjs',
    ' * out of the constants of the base (core/phomu-config) and out of the',
    ' * reference implementation of the web shell (src/config/game-config.ts).',
    ' * A hand edit here is overwritten by the next build.',
    ' *',
    ' * WHY a projection exists: rule K-2 of the build contract says that no',
    ' * shell defines a game constant, and rule K-3 allows a shell to hold a',
    ' * generated projection of the configuration. This object is that',
    ' * projection.',
    ' */',
    'object GeneratedGameConfig {',
    '',
    '    // ── The constants of the base (core/phomu-config) ──────────────────',
  ];

  for (const [name, type] of Object.entries(FROM_BASE)) {
    const literal = toKotlinLiteral(rustConstants.get(name), type);
    lines.push(`    const val ${name}: ${type} = ${literal}`);
  }
  for (const [name, type] of Object.entries(ARRAYS_FROM_BASE)) {
    const literal = toKotlinLiteral(rustConstants.get(name), type);
    lines.push(`    val ${name}: ${type} = ${literal}`);
  }

  lines.push('');
  lines.push('    // ── The values the base has not ported yet ───────────────────────');
  lines.push('    //');
  lines.push('    // WHY they are here: the base does not carry these values yet,');
  lines.push('    // and the shell must not define a game constant of its own. As soon');
  lines.push('    // as the base carries them, they move into the section above and');
  lines.push('    // this section disappears.');
  for (const [name, value] of Object.entries(FROM_REFERENCE)) {
    lines.push(`    const val ${name}: String = "${value}"`);
  }
  lines.push('}');
  lines.push('');

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n'));
  process.stdout.write(
    `generate-config-projection: ${Object.keys(FROM_BASE).length + Object.keys(ARRAYS_FROM_BASE).length} ` +
      `constants from the base, ${Object.keys(FROM_REFERENCE).length} from the reference ` +
      `implementation → ${out}\n`,
  );
}

main(process.argv.slice(2));
