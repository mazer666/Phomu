#!/usr/bin/env npx tsx
/**
 * The TypeScript conformance runner
 *
 * WHY: the web shell is the reference implementation of the game rules. This
 * runner replays the shared conformance vectors against it and writes the
 * observations as JSON — the same format the Rust runner produces. The
 * comparison script then decides vector by vector whether the two
 * implementations behave identically.
 *
 * WHAT: it reads the corpus, runs every vector through the harness and
 * writes the result file. It never modifies the reference.
 *
 * EXAMPLE: `npx tsx tools/conformance/run-ts-conformance.ts --out /tmp/ts.json`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultVectorsDir, loadVectors } from './lib/loader';
import { runVector } from './lib/harness';
import type { RunnerResult } from './lib/types';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

/**
 * Reads a command line option.
 *
 * @param name - the name of the option, with the leading dashes
 * @param fallback - the value used when the option is missing
 */
function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1]!;
}

function main(): void {
  const vectorsDir = path.resolve(
    option('--vectors', defaultVectorsDir(REPO_ROOT))
  );
  const outFile = option(
    '--out',
    path.join(REPO_ROOT, 'tmp', 'conformance-ts.json')
  );
  const only = option('--only', '');

  const vectors = loadVectors(vectorsDir);
  const selected = only
    ? vectors.filter((vector) => vector.id === only)
    : vectors;

  if (selected.length === 0) {
    console.error(`No vector matches "${only}".`);
    process.exit(2);
  }

  const results: RunnerResult['results'] = [];
  for (const vector of selected) {
    const observation = runVector(vector);
    results.push({
      id: vector.id,
      area: vector.area,
      portable: vector.portable,
      observation,
    });
  }

  const result: RunnerResult = {
    runner: 'typescript',
    schemaVersion: 1,
    results,
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  // A vector error is only a failure when the vector does not expect one —
  // the error vectors of the corpus expect exactly that.
  const unexpected = results.filter(
    (entry) =>
      entry.observation.error !== null &&
      vectors.find((vector) => vector.id === entry.id)?.then.error == null
  );

  console.log(
    `TypeScript conformance runner: ${results.length} vector(s) executed, ` +
      `${results.length - unexpected.length} without an unexpected vector error.`
  );
  console.log(`Result file: ${outFile}`);
  if (unexpected.length > 0) {
    for (const entry of unexpected) {
      console.error(
        `  ${entry.id}: ${entry.observation.error?.code} — ${entry.observation.error?.message}`
      );
    }
    process.exit(1);
  }
}

main();
