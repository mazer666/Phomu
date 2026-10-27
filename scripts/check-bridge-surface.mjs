#!/usr/bin/env node
/**
 * Quality gate: the bridge surface of the session
 * -------------------------------------------------------------------------
 * WHAT IT CHECKS
 *   The acceptance criterion of QA-RST-003 (docs/qa/QA-11-RUST-BASE.md):
 *
 *   > Every state-changing operation of the session has a bridge symbol or
 *   > a written exemption; a gate fails when a new operation has neither.
 *
 *   The gate reads three things:
 *
 *   1. the **declaration** — `platform/bridge-surface.json`: every public
 *      operation of the session with the bridge symbol that reaches it or
 *      the written reason why it is not exposed;
 *   2. the **session** — the `pub fn` of `impl Session` in
 *      `core/phomu-core/src/**`;
 *   3. the **bridges** — the `pub fn phomu_*` in `platform/<bridge>/src/**`.
 *
 *   and it fails when
 *
 *   | Rule | Severity | Meaning |
 *   |---|---|---|
 *   | BS-001 | error | an operation of the session is not declared |
 *   | BS-002 | error | a declared operation has neither a bridge nor an exemption |
 *   | BS-003 | error | a declaration names a bridge symbol that exists in no bridge |
 *   | BS-004 | error | a declaration names an operation the session does not have |
 *   | BS-005 | error | a declaration names a bridge symbol **and** an exemption |
 *   | BS-101 | warning | an operation is exempted instead of being exported |
 *   | BS-102 | warning | the bridge that exports the symbol does not call the operation |
 *
 * BEHAVIOUR
 *   - Exit code 0 when no rule is violated. The warnings are printed, they
 *     do not block: an exemption is a legal answer, not an error.
 *   - Exit code 1 when at least one error is found. Every error names the
 *     operation, the rule and the place.
 *
 * OPTIONS
 *   --root=<path>         check a different tree (the isolated proof)
 *   --declaration=<path>  check against a different declaration
 *   --quiet               print only the findings and the summary
 *   --self-test           run the negative self-test of the gate and exit
 *
 * EXAMPLE
 *   node scripts/check-bridge-surface.mjs
 *   node scripts/check-bridge-surface.mjs --self-test
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  evaluateSurface,
  readDeclaration,
} from './lib/bridge-surface.mjs';
import {
  collectBridgeSymbols,
  collectCalledOperations,
  collectSessionOperations,
} from './lib/rust-surface.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const FIXTURES = path.join(SCRIPT_DIR, 'fixtures', 'bridge-surface');

/**
 * Read an option of the form `--name=value`.
 *
 * @param {string} name the option name
 * @param {string|undefined} fallback the value used when the option is absent
 * @returns {string} the value of the option
 */
function option(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const root = path.resolve(option('root', REPO_ROOT));
const declarationPath = path.resolve(
  option('declaration', path.join(root, 'platform', 'bridge-surface.json')),
);
const quiet = process.argv.includes('--quiet');

/**
 * Print a line unless the gate runs in the quiet mode.
 *
 * @param {string} text the line to print
 */
function say(text) {
  if (!quiet) console.log(text);
}

/**
 * Run the gate against a tree and return the findings.
 *
 * @param {string} tree the root of the tree
 * @param {string} declaration the path of the declaration
 * @returns {{findings: Array<any>, stats: object}} the findings and the numbers
 */
function inspect(tree, declaration) {
  const parsed = readDeclaration(declaration);
  const session = collectSessionOperations(tree);
  const symbols = collectBridgeSymbols(tree);
  const called = collectCalledOperations(tree);
  const result = evaluateSurface(parsed, session, symbols, called, declaration);
  return { findings: [...parsed.errors, ...result.findings], stats: result.stats };
}

/**
 * Run the gate and return the exit code.
 *
 * @returns {number} the exit code
 */
function main() {
  const { findings, stats } = inspect(root, declarationPath);
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  say('Bridge surface gate');
  say('='.repeat(72));
  say(`root:        ${root}`);
  say(`declaration: ${declarationPath}`);
  say(`session operations: ${stats.sessionOperations}`);
  say(`bridge symbols:      ${stats.bridgeSymbols}`);
  say(`declared operations: ${stats.declared}`);
  say(`  state-changing:    ${stats.stateChanging}`);
  say(`  read-only:         ${stats.readOnly}`);
  say(`  with a bridge:     ${stats.withBridge}`);
  say(`  with an exemption: ${stats.withExemption}`);
  say('');

  if (warnings.length > 0) {
    console.log(`${warnings.length} warning(s):`);
    for (const warning of warnings) {
      console.log(`  [${warning.rule}] ${warning.message}`);
      console.log(`      ${warning.file}${warning.line > 0 ? `:${warning.line}` : ''}`);
      console.log(`      ${warning.detail}`);
    }
    console.log('');
  }

  if (errors.length === 0) {
    console.log('No bridge surface violation found.');
    return 0;
  }

  console.log(`${errors.length} bridge surface violation(s) found:`);
  for (const error of errors) {
    console.log(`  [${error.rule}] ${error.message}`);
    console.log(`      ${error.file}${error.line > 0 ? `:${error.line}` : ''}`);
    console.log(`      ${error.detail}`);
  }
  return 1;
}

/* ------------------------------------------------------------------ *
 * The negative self-test
 * ------------------------------------------------------------------ */

/**
 * The result of one assertion.
 */
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
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}`);
  if (!ok) console.log(`         ${detail}`);
}

/**
 * Run the gate and capture its output.
 *
 * @param {string} tree the tree to check
 * @returns {{status: number, output: string}} the exit code and the output
 */
function runGate(tree) {
  const result = spawnSync(process.execPath, [path.join(SCRIPT_DIR, 'check-bridge-surface.mjs'), `--root=${tree}`], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  return {
    status: result.status === null ? 1 : result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/**
 * The negative fixtures of the gate.
 *
 * Each fixture catches a different mistake in the gate itself.
 */
const NEGATIVE_FIXTURES = [
  {
    fixture: 'missing-operation',
    expected: 'is not declared',
  },
  {
    fixture: 'typo-bridge',
    expected: 'exists in no bridge',
  },
  {
    fixture: 'uncovered-operation',
    expected: 'neither a bridge symbol nor an exemption',
  },
  {
    fixture: 'unknown-operation',
    expected: 'which the session does not have',
  },
  {
    fixture: 'bridge-and-exemption',
    expected: 'names a bridge symbol and an exemption',
  },
];

/**
 * The negative self-test of the gate.
 *
 * WHY IT EXISTS
 *   "A gate that has never been seen red is not a gate."
 *   (docs/design/BUILD-CONTRACT.md § 7.1)
 *
 * WHAT IT DOES
 *   1. Runs the gate against the fixture tree `ok/` and asserts exit code 0.
 *   2. Runs the gate against every negative fixture and asserts exit code 1
 *      and that the output names the violation.
 *   3. Runs the gate against the repository and asserts exit code 0.
 *   4. Creates a temporary violation **inside the repository**: an operation
 *      is removed from the declaration, the gate has to turn red; the
 *      declaration is restored, the gate has to turn green again. The second
 *      violation renames a bridge symbol — the typo a copy-and-paste
 *      produces. The declaration has to be byte identical to the original
 *      afterwards. The self-test leaves no state in the repository.
 *
 * @returns {number} the exit code
 */
function selfTest() {
  console.log('Self-test of the bridge-surface gate');
  console.log('='.repeat(72));

  // 1. The clean fixture.
  {
    const { status, output } = runGate(path.join(FIXTURES, 'ok'));
    assert(
      'the fixture "ok" is green',
      status === 0 && !output.includes('violation(s) found'),
      `exit code ${status}\n${output}`,
    );
  }

  // 2. The negative fixtures.
  for (const negative of NEGATIVE_FIXTURES) {
    const { status, output } = runGate(path.join(FIXTURES, negative.fixture));
    assert(
      `the fixture "${negative.fixture}" is red and names the violation`,
      status === 1 && output.includes(negative.expected),
      `exit code ${status}, the output does not name "${negative.expected}"\n${output}`,
    );
  }

  // 3. The repository itself.
  {
    const { status, output } = runGate(REPO_ROOT);
    assert(
      'the repository matches the state the gate reports',
      status === 0,
      `exit code ${status}\n${output}`,
    );
  }

  // 4. The temporary violations inside the repository.
  const declarationFile = path.join(REPO_ROOT, 'platform', 'bridge-surface.json');
  const original = fs.readFileSync(declarationFile, 'utf8');
  const originalHash = crypto.createHash('sha256').update(original).digest('hex');
  const parsed = JSON.parse(original);

  const violations = [
    {
      title: 'an operation is removed from the declaration',
      mutate: (declaration) => {
        const index = declaration.operations.findIndex(
          (entry) => entry.name === 'Session::award_points',
        );
        declaration.operations.splice(index, 1);
      },
      expected: 'is not declared',
    },
    {
      title: 'a bridge symbol is renamed (the typo of a copy and paste)',
      mutate: (declaration) => {
        const entry = declaration.operations.find(
          (candidate) => candidate.name === 'Session::award_points',
        );
        entry.bridge = 'phomu_session_award_point';
      },
      expected: 'exists in no bridge',
    },
  ];

  for (const violation of violations) {
    const declaration = JSON.parse(original);
    violation.mutate(declaration);
    console.log('');
    console.log(`--- temporary violation: ${violation.title} ---`);
    console.log('');

    try {
      fs.writeFileSync(declarationFile, `${JSON.stringify(declaration, null, 2)}\n`, 'utf8');
      const red = runGate(REPO_ROOT);
      console.log('--- the gate, with the violation (must be red) -------------');
      console.log(red.output.trimEnd());
      console.log(`--- exit code: ${red.status} -------------------------------`);
      console.log('');
      assert(
        `the temporary violation turns the gate red: ${violation.title}`,
        red.status !== 0 && red.output.includes(violation.expected),
        `exit code ${red.status}, the output does not name "${violation.expected}"\n${red.output}`,
      );
    } finally {
      fs.writeFileSync(declarationFile, original, 'utf8');
    }
  }

  const green = runGate(REPO_ROOT);
  console.log('--- the gate, with the violations undone (must be green) -----');
  console.log(green.output.trimEnd());
  console.log(`--- exit code: ${green.status} -------------------------------`);
  console.log('');

  assert(
    'the undone violations turn the gate green again',
    green.status === 0,
    `exit code ${green.status}\n${green.output}`,
  );

  const restored = fs.readFileSync(declarationFile, 'utf8');
  const restoredHash = crypto.createHash('sha256').update(restored).digest('hex');
  assert(
    'the declaration is byte identical to the original',
    restoredHash === originalHash,
    `${originalHash} against ${restoredHash}`,
  );

  console.log('');
  console.log('='.repeat(72));
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.log(`❌ ${failed.length} of ${results.length} assertions failed.`);
    return 1;
  }
  console.log(`✅ All ${results.length} assertions passed.`);
  return 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest());
}

process.exit(main());
