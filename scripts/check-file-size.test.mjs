#!/usr/bin/env node
/**
 * The negative self-test of the file-size gate.
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   "A gate that has never been seen red is not a gate."
 *   (docs/design/BUILD-CONTRACT.md § 7.1)
 *
 * WHAT IT DOES
 *   The gate has three channels (QA-ARC-001, QA-09 backlog item 2.1). This
 *   self-test proves every one of them:
 *
 *   1. A **new** file above the soft limit (400 lines) is an error.
 *   2. A **known legacy file that grew** beyond its recorded state is an
 *      error.
 *   3. A **known legacy file that shrank** is a success, and the recorded
 *      state is updated downward automatically.
 *   4. A **Rust file** above the hard limit (550 lines) is an error — the
 *      gate covers the Rust base (QA-ARC-007, QA-09 backlog item 2.9).
 *   5. The repository itself is green, and the run leaves the recorded state
 *      of the repository untouched.
 *
 * WHERE THE VIOLATIONS LIVE
 *   Every violation is created in a temporary directory outside the
 *   repository and is removed again in the same run. The self-test therefore
 *   leaves no state in the repository — not even for the length of a second.
 *
 * EXIT CODE
 *   0 when every assertion holds, 1 otherwise.
 *
 * EXAMPLE
 *   node scripts/check-file-size.test.mjs
 */

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const GATE = path.join(SCRIPT_DIR, 'check-file-size.mjs');
const EXCEPTIONS = path.join(SCRIPT_DIR, 'file-size.exceptions.json');

/** The result of one assertion. */
const results = [];

/**
 * Record the outcome of one assertion.
 *
 * @param {string} name the name of the assertion
 * @param {boolean} ok whether the assertion held
 * @param {string} detail what the assertion saw
 */
function assert(name, ok, detail) {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${name}`);
  if (!ok) console.log(`         ${detail}`);
}

/**
 * Run the gate against a tree.
 *
 * @param {string} root the tree to check
 * @param {string} exceptionsPath the exception table of the tree
 * @returns {{status: number, output: string}} the exit code and the output
 */
function runGate(root, exceptionsPath) {
  const result = spawnSync(
    process.execPath,
    [GATE, `--root=${root}`, `--exceptions=${exceptionsPath}`],
    { encoding: 'utf8', cwd: REPO_ROOT },
  );
  return {
    status: result.status === null ? 1 : result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/**
 * Write a file with a given number of lines.
 *
 * @param {string} file the path of the file
 * @param {number} lines the number of lines
 */
function writeLines(file, lines) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const content = Array.from({ length: lines }, (_, index) => `line ${index + 1}`).join('\n');
  fs.writeFileSync(file, `${content}\n`, 'utf8');
}

/**
 * Write an exception table.
 *
 * @param {string} file the path of the table
 * @param {Record<string, {lines: number, reason: string}>} exceptions the recorded states
 */
function writeTable(file, exceptions) {
  const document = {
    $comment: ['The recorded state of every known legacy file above the soft limit.'],
    schemaVersion: 1,
    softLimit: 400,
    hardLimit: 550,
    exceptions,
  };
  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}

/**
 * Read the recorded states of a table.
 *
 * @param {string} file the path of the table
 * @returns {Record<string, {lines: number, reason: string}>} the recorded states
 */
function readTable(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8')).exceptions ?? {};
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phomu-file-size-'));

console.log('Self-test of the file-size gate');
console.log('='.repeat(72));
console.log(`temporary trees: ${temporaryRoot}`);
console.log('');

/**
 * Create a tree with one file and one exception table.
 *
 * @param {string} name the name of the tree
 * @param {string} file the path of the file, relative to the tree
 * @param {number} lines the number of lines of the file
 * @param {Record<string, {lines: number, reason: string}>|null} exceptions the recorded states
 * @returns {{root: string, table: string}} the tree and its table
 */
function createTree(name, file, lines, exceptions) {
  const root = path.join(temporaryRoot, name);
  fs.mkdirSync(root, { recursive: true });
  writeLines(path.join(root, file), lines);
  const table = path.join(root, 'file-size.exceptions.json');
  writeTable(table, exceptions ?? {});
  return { root, table };
}

// 1. A tree without a violation is green.
{
  const { root, table } = createTree('ok', 'src/small.ts', 120, null);
  const { status, output } = runGate(root, table);
  assert(
    'a tree without a violation is green',
    status === 0,
    `exit code ${status}\n${output}`,
  );
}

// 2. A new file above the soft limit is an error.
{
  const { root, table } = createTree('new-oversized', 'src/new-large.ts', 450, null);
  const { status, output } = runGate(root, table);
  assert(
    'a new file of 450 lines turns the gate red',
    status === 1 && output.includes('new file above the soft limit (400)'),
    `exit code ${status}\n${output}`,
  );
}

// 3. A known legacy file that grew is an error.
{
  const { root, table } = createTree('legacy-grown', 'src/legacy.ts', 120, {
    'src/legacy.ts': { lines: 100, reason: 'the file is above the soft limit' },
  });
  const { status, output } = runGate(root, table);
  assert(
    'a legacy file that grew turns the gate red',
    status === 1 && output.includes('grew by 20 lines beyond its recorded state (100)'),
    `exit code ${status}\n${output}`,
  );
}

// 4. A known legacy file that shrank is a success and updates the record.
{
  const { root, table } = createTree('legacy-shrunk', 'src/legacy.ts', 410, {
    'src/legacy.ts': { lines: 420, reason: 'the file is above the soft limit' },
  });
  const { status, output } = runGate(root, table);
  const recorded = readTable(table);
  assert(
    'a legacy file that shrank is green',
    status === 0,
    `exit code ${status}\n${output}`,
  );
  assert(
    'the recorded state of a shrunk legacy file is updated downward',
    recorded['src/legacy.ts']?.lines === 410,
    JSON.stringify(recorded),
  );
}

// 5. A known legacy file below the soft limit loses its exception.
{
  const { root, table } = createTree('legacy-converged', 'src/legacy.ts', 120, {
    'src/legacy.ts': { lines: 420, reason: 'the file is above the soft limit' },
  });
  const { status } = runGate(root, table);
  const recorded = readTable(table);
  assert(
    'a legacy file below the soft limit is green',
    status === 0,
    `exit code ${status}`,
  );
  assert(
    'the exception of a converged legacy file is removed',
    recorded['src/legacy.ts'] === undefined,
    JSON.stringify(recorded),
  );
}

// 6. A Rust file above the hard limit is an error.
{
  const { root, table } = createTree('rust-oversized', 'core/phomu-core/src/lib.rs', 600, null);
  const { status, output } = runGate(root, table);
  assert(
    'a Rust file of 600 lines turns the gate red',
    status === 1 && output.includes('core/phomu-core/src/lib.rs'),
    `exit code ${status}\n${output}`,
  );
}

// 7. The repository itself.
{
  const before = crypto
    .createHash('sha256')
    .update(fs.readFileSync(EXCEPTIONS))
    .digest('hex');
  const result = spawnSync(process.execPath, [GATE], { encoding: 'utf8', cwd: REPO_ROOT });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const after = crypto
    .createHash('sha256')
    .update(fs.readFileSync(EXCEPTIONS))
    .digest('hex');

  assert(
    'the repository is green',
    result.status === 0,
    `exit code ${result.status}\n${output}`,
  );
  assert(
    'the run leaves the recorded state of the repository untouched',
    before === after,
    `${before} against ${after}`,
  );
}

fs.rmSync(temporaryRoot, { recursive: true, force: true });
assert(
  'the temporary trees are removed',
  !fs.existsSync(temporaryRoot),
  `${temporaryRoot} still exists`,
);

console.log('');
console.log('='.repeat(72));
const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.log(`❌ ${failed.length} of ${results.length} assertions failed.`);
  process.exit(1);
}
console.log(`✅ All ${results.length} assertions passed.`);
process.exit(0);
