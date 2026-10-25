#!/usr/bin/env node
/**
 * The negative self-test of the module-boundary gate.
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   "A gate that has never been seen red is not a gate."
 *   (docs/design/BUILD-CONTRACT.md § 7.1)
 *
 * WHAT IT DOES
 *   1. Runs the gate against the fixture tree `ok/` and asserts exit code 0.
 *   2. Runs the gate against every negative fixture and asserts exit code 1
 *      and that the output names the violating file and the rule.
 *   3. Runs the gate against the repository and asserts that the result
 *      matches the actual state of the repository.
 *   4. **Creates a temporary violation inside the repository**: a component
 *      imports the raw catalogue, the gate must turn red, the violation is
 *      undone, the gate must turn green again, and the file must be gone
 *      afterwards. The self-test leaves no state in the repository.
 *
 * EXIT CODE
 *   0 when every assertion holds, 1 otherwise.
 *
 * EXAMPLE
 *   node scripts/check-module-boundaries.test.mjs
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const GATE = path.join(SCRIPT_DIR, 'check-module-boundaries.mjs');
const FIXTURES = path.join(SCRIPT_DIR, 'fixtures', 'module-boundaries');

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
 * Run the gate and capture its output.
 *
 * @param {string} root the tree to check
 * @returns {{status: number, output: string}} the exit code and the output
 */
function runGate(root) {
  const result = spawnSync(process.execPath, [GATE, `--root=${root}`], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  return {
    status: result.status === null ? 1 : result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/**
 * The negative fixtures of the module boundary.
 *
 * Each fixture catches a different mistake in the gate itself.
 */
const NEGATIVE_FIXTURES = [
  {
    fixture: 'raw-catalogue',
    expected: ['MB-RAW-CATALOGUE', 'src/components/game/Widget.tsx'],
  },
  {
    fixture: 'proxy-barrel',
    expected: ['MB-RAW-CATALOGUE', 'src/components/game/Widget.tsx'],
  },
  {
    fixture: 'config-imports-ui',
    expected: ['MB-CONFIG-UI', 'src/config/game-config.ts'],
  },
  {
    fixture: 'utils-imports-store',
    expected: ['MB-UTILS-STORE', 'src/utils/picker.ts'],
  },
];

/**
 * The temporary violation inside the repository.
 *
 * WHY this file: it has to live under `src/components/`, because that is
 * the directory the rule MB-RAW-CATALOGUE applies to. The file is removed
 * again in the `finally` block below.
 */
const TEMPORARY_VIOLATION = {
  file: path.join(REPO_ROOT, 'src', 'components', 'zz-module-boundary-self-test.ts'),
  content: [
    '// The temporary violation of the self-test of the module-boundary gate.',
    "// It is removed again in the same run; see scripts/check-module-boundaries.test.mjs.",
    '',
    "import { ALL_SONGS } from '@/data/songs';",
    '',
    'export const catalogueSize = ALL_SONGS.length;',
    '',
  ].join('\n'),
};

console.log('Self-test of the module-boundary gate');
console.log('='.repeat(72));

// 1. The clean fixture.
{
  const { status, output } = runGate(path.join(FIXTURES, 'ok'));
  assert(
    'the fixture "ok" is green',
    status === 0,
    `exit code ${status}\n${output}`,
  );
}

// 2. The negative fixtures.
for (const negative of NEGATIVE_FIXTURES) {
  const { status, output } = runGate(path.join(FIXTURES, negative.fixture));
  const named = negative.expected.every((needle) => output.includes(needle));
  assert(
    `the fixture "${negative.fixture}" is red and names the violation`,
    status === 1 && named,
    `exit code ${status}, the output does not name ${negative.expected.join(' and ')}\n${output}`,
  );
}

// 3. A documented example in a comment is not an import.
{
  const { status, output } = runGate(path.join(FIXTURES, 'comment-is-not-an-import'));
  assert(
    'a catalogue import in a comment is not a violation',
    status === 0,
    `exit code ${status}\n${output}`,
  );
}

// 4. The repository itself.
{
  const { status, output } = runGate(REPO_ROOT);
  assert(
    'the repository matches the state the gate reports',
    status === 0,
    `exit code ${status}\n${output}`,
  );
}

// 5. The temporary violation inside the repository.
{
  const existed = fs.existsSync(TEMPORARY_VIOLATION.file);
  console.log('');
  console.log('--- temporary violation in the repository -------------------');
  console.log(`  file: ${path.relative(REPO_ROOT, TEMPORARY_VIOLATION.file)}`);
  console.log('');

  if (existed) {
    console.log('  [SKIP] the file of the temporary violation already exists.');
  } else {
    try {
      fs.writeFileSync(TEMPORARY_VIOLATION.file, TEMPORARY_VIOLATION.content, 'utf8');
      const red = runGate(REPO_ROOT);
      console.log('--- the gate, with the violation (must be red) -------------');
      console.log(red.output.trimEnd());
      console.log(`--- exit code: ${red.status} -------------------------------`);
      console.log('');

      assert(
        'the temporary violation turns the gate red',
        red.status !== 0 && red.output.includes('MB-RAW-CATALOGUE'),
        `exit code ${red.status}\n${red.output}`,
      );
    } finally {
      fs.rmSync(TEMPORARY_VIOLATION.file, { force: true });
    }

    const green = runGate(REPO_ROOT);
    console.log('--- the gate, with the violation undone (must be green) ----');
    console.log(green.output.trimEnd());
    console.log(`--- exit code: ${green.status} -------------------------------`);
    console.log('');

    assert(
      'the undone violation turns the gate green again',
      green.status === 0,
      `exit code ${green.status}\n${green.output}`,
    );

    assert(
      'the file of the temporary violation is gone',
      !fs.existsSync(TEMPORARY_VIOLATION.file),
      `${TEMPORARY_VIOLATION.file} still exists`,
    );
  }
}

console.log('');
console.log('='.repeat(72));
const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.log(`❌ ${failed.length} of ${results.length} assertions failed.`);
  process.exit(1);
}
console.log(`✅ All ${results.length} assertions passed.`);
process.exit(0);
