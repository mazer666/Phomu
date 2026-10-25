#!/usr/bin/env node
/**
 * Quality gate: Sammelaufruf (check:all)
 * -------------------------------------------------------------------------
 * Führt die drei Gates des CONTRACT §6 nacheinander aus:
 *   1. i18n-Vollständigkeit   -> scripts/check-i18n-completeness.mjs
 *   2. Doku-Linkcheck         -> scripts/check-doc-links.mjs
 *   3. Dateigröße             -> scripts/check-file-size.mjs
 *
 * Anders als eine `&&`-Kette laufen **alle** Gates durch: der Bericht zeigt
 * den Zustand jedes einzelnen Gates, auch wenn eines fehlschlägt. Der
 * Exit-Code ist 1, sobald mindestens ein Gate rot ist.
 *
 * Aufruf: npm run check:all
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const GATES = [
  { name: 'i18n-Vollständigkeit', script: 'check-i18n-completeness.mjs' },
  { name: 'Doku-Linkcheck', script: 'check-doc-links.mjs' },
  { name: 'Dateigröße', script: 'check-file-size.mjs' },
];

const results = [];

for (const gate of GATES) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`GATE: ${gate.name}  (scripts/${gate.script})`);
  console.log('='.repeat(72));

  const result = spawnSync(
    process.execPath,
    [path.join(SCRIPT_DIR, gate.script)],
    {
      stdio: 'inherit',
      encoding: 'utf8',
    }
  );

  // signalStatus !== null => Gate wurde durch ein Signal beendet (z. B. SIGSEGV)
  const exitCode = result.status === null ? 1 : result.status;
  results.push({ ...gate, exitCode });
}

console.log(`\n${'='.repeat(72)}`);
console.log('ZUSAMMENFASSUNG DER QUALITÄTSGATES');
console.log('='.repeat(72));

let failed = 0;
for (const result of results) {
  const status = result.exitCode === 0 ? 'PASS' : 'FAIL';
  if (result.exitCode !== 0) failed += 1;
  console.log(`  [${status}] ${result.name} (Exit-Code ${result.exitCode})`);
}

if (failed > 0) {
  console.log(`\n❌ ${failed} von ${results.length} Gates fehlgeschlagen.`);
  process.exit(1);
}

console.log(`\n✅ Alle ${results.length} Gates bestanden.`);
process.exit(0);
