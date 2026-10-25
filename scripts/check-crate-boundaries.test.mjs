#!/usr/bin/env node
/**
 * The negative self-test of the crate-boundary gate.
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   "A gate that has never been seen red is not a gate."
 *   (docs/design/BUILD-CONTRACT.md § 7.1)
 *
 * WHAT IT DOES
 *   1. Runs the gate against the fixture tree `ok/` and asserts exit code 0.
 *   2. Runs the gate against every negative fixture of § 7.3 and asserts
 *      exit code 1 and that the output names the violating edge.
 *   3. Runs the gate against a tree without a Cargo workspace and asserts
 *      that it reports `SKIPPED` and exits 0.
 *   4. Runs the gate against the repository and asserts that the result
 *      matches the actual state of the repository.
 *   5. **Creates a temporary violation inside the repository**: a crate gets a
 *      forbidden dependency, the gate must turn red, the violation is undone,
 *      the gate must turn green again, and the manifest must be byte
 *      identical to the original afterwards. The self-test leaves no state in
 *      the repository.
 *
 * EXIT CODE
 *   0 when every assertion holds, 1 otherwise.
 *
 * EXAMPLE
 *   node scripts/check-crate-boundaries.test.mjs
 */

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const GATE = path.join(SCRIPT_DIR, 'check-crate-boundaries.mjs');
const FIXTURES = path.join(SCRIPT_DIR, 'fixtures', 'crate-boundaries');

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
 * The negative fixtures of BUILD-CONTRACT § 7.3.
 *
 * Each fixture catches a different mistake in the gate itself.
 */
const NEGATIVE_FIXTURES = [
  {
    fixture: 'violation',
    edge: 'core/phomu-core depends on crate platform/phomu-ffi',
  },
  {
    fixture: 'shell-direct-core',
    edge: 'apps/android depends on crate core/phomu-core',
  },
  {
    fixture: 'format-cross-area',
    edge: 'formats/phomu-qr depends on crate core/phomu-core',
  },
  {
    fixture: 'errors-not-leaf',
    edge: 'core/phomu-errors depends on crate core/phomu-config',
  },
  {
    fixture: 'include-outside',
    edge: 'core/phomu-core includes a file outside its own directory',
  },
  {
    fixture: 'abi-mismatch',
    edge: 'does not match the ABI version of',
  },
];

/**
 * The manifests the temporary in-repository violation may use.
 *
 * The list is ordered: a tool crate comes first, because a tool is never
 * part of a release build and a concurrent build therefore cannot be
 * disturbed by the temporary change for longer than the two gate runs.
 */
const VIOLATION_TARGETS = [
  {
    manifest: 'tools/catalog-tool/Cargo.toml',
    dependency: 'phomu-ffi = { path = "../../platform/phomu-ffi" }',
    edge: 'tools/catalog-tool depends on crate platform/phomu-ffi',
  },
  {
    manifest: 'tools/media-report/Cargo.toml',
    dependency: 'phomu-ffi = { path = "../../platform/phomu-ffi" }',
    edge: 'tools/media-report depends on crate platform/phomu-ffi',
  },
  {
    manifest: 'tools/conformance-runner/Cargo.toml',
    dependency: 'phomu-ffi = { path = "../../platform/phomu-ffi" }',
    edge: 'tools/conformance-runner depends on crate platform/phomu-ffi',
  },
  {
    manifest: 'platform/phomu-capi/Cargo.toml',
    dependency: 'catalog-tool = { path = "../../tools/catalog-tool" }',
    edge: 'platform/phomu-capi depends on crate tools/catalog-tool',
  },
];

console.log('Self-test of the crate-boundary gate');
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
  assert(
    `the fixture "${negative.fixture}" is red and names the edge`,
    status === 1 && output.includes(negative.edge),
    `exit code ${status}, the output does not name "${negative.edge}"\n${output}`,
  );
}

// 3. A tree without a Cargo workspace.
{
  const { status, output } = runGate(path.join(FIXTURES, 'does-not-exist'));
  assert(
    'a tree without a Cargo workspace is skipped with exit code 0',
    status === 0 && output.includes('SKIPPED'),
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
  const target = VIOLATION_TARGETS.find((candidate) =>
    fs.existsSync(path.join(REPO_ROOT, candidate.manifest)),
  );

  if (!target) {
    console.log(
      '  [SKIP] the temporary violation in the repository: no crate of the ' +
        'repository can carry it yet',
    );
  } else {
    const manifestPath = path.join(REPO_ROOT, target.manifest);
    const original = fs.readFileSync(manifestPath, 'utf8');
    const originalHash = crypto.createHash('sha256').update(original).digest('hex');
    const violated = injectDependency(original, target.dependency);

    console.log('');
    console.log('--- temporary violation in the repository -------------------');
    console.log(`  manifest: ${target.manifest}`);
    console.log(`  added:    ${target.dependency}`);
    console.log('');

    try {
      fs.writeFileSync(manifestPath, violated, 'utf8');
      const red = runGate(REPO_ROOT);
      console.log('--- the gate, with the violation (must be red) -------------');
      console.log(red.output.trimEnd());
      console.log(`--- exit code: ${red.status} -------------------------------`);
      console.log('');
      assert(
        'the temporary violation turns the gate red',
        red.status !== 0 && red.output.includes(target.edge),
        `exit code ${red.status}, the output does not name "${target.edge}"\n${red.output}`,
      );
    } finally {
      fs.writeFileSync(manifestPath, original, 'utf8');
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

    const restored = fs.readFileSync(manifestPath, 'utf8');
    const restoredHash = crypto.createHash('sha256').update(restored).digest('hex');
    assert(
      'the manifest is byte identical to the original',
      restoredHash === originalHash,
      `${originalHash} against ${restoredHash}`,
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

/**
 * Insert a dependency into the `[dependencies]` section of a manifest.
 *
 * The result is a valid manifest: the temporary violation has to be a
 * violation of the *rule*, not a syntax error.
 *
 * @param {string} manifest the original manifest
 * @param {string} dependency the dependency line to insert
 * @returns {string} the manifest with the dependency
 */
function injectDependency(manifest, dependency) {
  const lines = manifest.split('\n');
  const sectionIndex = lines.findIndex((line) => line.trim() === '[dependencies]');
  if (sectionIndex === -1) {
    return `${manifest.replace(/\s*$/, '')}\n\n[dependencies]\n${dependency}\n`;
  }
  const inserted = [...lines];
  inserted.splice(sectionIndex + 1, 0, dependency);
  return inserted.join('\n');
}
