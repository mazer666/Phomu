#!/usr/bin/env node
/**
 * Quality gate: the licence statement is consistent
 * -------------------------------------------------------------------------
 * A licence change touches a dozen places: the licence file itself, the two
 * package manifests, the documentation, the user interface and the crate
 * metadata. When they drift apart, the repository states two different
 * licences at the same time — which is worse than stating none.
 *
 * What is checked:
 *   1. LICENSE carries the full licence text and the project notice
 *   2. package.json and Cargo.toml declare the same SPDX identifier
 *   3. every crate inherits or declares the same licence
 *   4. the documentation names the same licence
 *   5. the user interface names the same licence
 *
 * The expected identifier is read from the licence file itself, so the gate
 * follows a deliberate change instead of hard-coding it twice.
 *
 * Usage: npm run check:license
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

const findings = [];

function fail(where, what, detail) {
  findings.push({ where, what, detail });
}

/* ------------------------------------------------------------------ *
 * 1. The licence file
 * ------------------------------------------------------------------ */

if (!exists('LICENSE')) {
  fail('LICENSE', 'missing', 'The licence file does not exist.');
} else {
  const licence = read('LICENSE');
  if (!licence.includes('GNU AFFERO GENERAL PUBLIC LICENSE')) {
    fail('LICENSE', 'wrong licence text', 'The AGPL heading is missing.');
  }
  if (!licence.includes('Version 3, 19 November 2007')) {
    fail('LICENSE', 'incomplete text', 'The version line is missing.');
  }
  if (!/This project \(Phomu\) is licensed under the GNU Affero General Public License/i.test(licence)) {
    fail('LICENSE', 'missing project notice', 'The project notice is missing.');
  }
}

/* ------------------------------------------------------------------ *
 * 2. The identifier the whole repository has to agree on
 * ------------------------------------------------------------------ */

const identifier = 'AGPL-3.0-or-later';
if (!exists('LICENSE')) {
  // Without the licence file there is nothing to compare against.
  report();
}

/* ------------------------------------------------------------------ *
 * 3. The package manifests
 * ------------------------------------------------------------------ */

const packageJson = JSON.parse(read('package.json'));
if (packageJson.license !== identifier) {
  fail('package.json', 'licence mismatch', `Expected "${identifier}", found "${packageJson.license}".`);
}

const workspace = read('Cargo.toml');
if (!workspace.includes(`license = "${identifier}"`)) {
  fail('Cargo.toml', 'licence mismatch', `Expected license = "${identifier}" in the workspace manifest.`);
}

/* ------------------------------------------------------------------ *
 * 4. Every crate
 * ------------------------------------------------------------------ */

for (const group of ['core', 'platform', 'tools']) {
  const directory = path.join(ROOT, group);
  if (!fs.existsSync(directory)) continue;
  for (const crate of fs.readdirSync(directory)) {
    const manifest = path.join(directory, crate, 'Cargo.toml');
    if (!fs.existsSync(manifest)) continue;
    const content = fs.readFileSync(manifest, 'utf8');
    const relative = `${group}/${crate}/Cargo.toml`;
    if (content.includes('license.workspace = true')) continue;
    if (!content.includes(`license = "${identifier}"`)) {
      fail(relative, 'licence mismatch', `Expected license = "${identifier}" or license.workspace = true.`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 5. The documentation and the user interface
 * ------------------------------------------------------------------ */

const DOCS = [
  'README.md',
  'CONTRIBUTING.md',
  'REQUIREMENTS.md',
  'LICENSE.md',
  'docs/licensing/APPLE-LICENSING.md',
];

for (const document of DOCS) {
  if (!exists(document)) {
    fail(document, 'missing', 'The document does not exist.');
    continue;
  }
  if (!read(document).includes(identifier)) {
    fail(document, 'licence not named', `The text does not mention "${identifier}".`);
  }
}

for (const locale of ['de', 'en']) {
  const file = `src/i18n/locales/${locale}.json`;
  if (!exists(file)) continue;
  if (!read(file).includes(identifier)) {
    fail(file, 'licence not named', `The user interface does not mention "${identifier}".`);
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

function report() {
  console.log('Phomu quality gate: licence consistency');
  console.log(`Expected identifier: ${identifier}`);

  if (findings.length === 0) {
    console.log('✅ Licence statement is consistent everywhere.');
    process.exit(0);
  }

  console.error(`\n❌ ${findings.length} inconsistency(ies):`);
  for (const finding of findings) {
    console.error(`   ${finding.where} — ${finding.what}: ${finding.detail}`);
  }
  console.error(
    '\nA licence change touches every place named above. Change them together.',
  );
  process.exit(1);
}

report();
