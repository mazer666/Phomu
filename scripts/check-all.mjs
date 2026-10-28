#!/usr/bin/env node
/**
 * Quality gate: combined run (check:all)
 * -------------------------------------------------------------------------
 * Runs the gates of CONTRACT §6 one after another:
 *   1. i18n completeness      -> scripts/check-i18n-completeness.mjs
 *   2. Doc link check         -> scripts/check-doc-links.mjs
 *   3. File size              -> scripts/check-file-size.mjs
 *   4. Documentation language -> scripts/check-doc-language.mjs
 *   5. Crate boundaries       -> scripts/check-crate-boundaries.mjs
 *   6. Bridge surface         -> scripts/check-bridge-surface.mjs
 *   7. Module boundaries      -> scripts/check-module-boundaries.mjs
 *   8. Licence consistency    -> scripts/check-license.mjs
 *
 * Unlike an `&&` chain, **all** gates run through: the report shows the
 * state of every single gate, even if one of them fails. The exit code is 1
 * as soon as at least one gate is red.
 *
 * Usage: npm run check:all
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const GATES = [
  { name: 'i18n completeness', script: 'check-i18n-completeness.mjs' },
  { name: 'Doc link check', script: 'check-doc-links.mjs' },
  { name: 'File size', script: 'check-file-size.mjs' },
  { name: 'Documentation language', script: 'check-doc-language.mjs' },
  { name: 'Crate boundaries', script: 'check-crate-boundaries.mjs' },
  { name: 'Bridge surface', script: 'check-bridge-surface.mjs' },
  { name: 'Module boundaries', script: 'check-module-boundaries.mjs' },
  { name: 'Licence consistency', script: 'check-license.mjs' },
  { name: 'Cloudflare headers', script: 'generate-cloudflare-headers.mjs', args: ['--check'] },
  { name: 'GitHub workflows', script: 'check-workflows.mjs' },
  { name: 'Catalogue artefact', script: 'build-catalogue.mjs', args: ['--check'] },
];

const results = [];

for (const gate of GATES) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`GATE: ${gate.name}  (scripts/${gate.script})`);
  console.log('='.repeat(72));

  const result = spawnSync(
    process.execPath,
    [path.join(SCRIPT_DIR, gate.script), ...(gate.args ?? [])],
    {
      stdio: 'inherit',
      encoding: 'utf8',
    }
  );

  // signalStatus !== null => the gate was terminated by a signal (e.g. SIGSEGV)
  const exitCode = result.status === null ? 1 : result.status;
  results.push({ ...gate, exitCode });
}

console.log(`\n${'='.repeat(72)}`);
console.log('SUMMARY OF THE QUALITY GATES');
console.log('='.repeat(72));

let failed = 0;
for (const result of results) {
  const status = result.exitCode === 0 ? 'PASS' : 'FAIL';
  if (result.exitCode !== 0) failed += 1;
  console.log(`  [${status}] ${result.name} (exit code ${result.exitCode})`);
}

if (failed > 0) {
  console.log(`\n❌ ${failed} of ${results.length} gates failed.`);
  process.exit(1);
}

console.log(`\n✅ All ${results.length} gates passed.`);
process.exit(0);
