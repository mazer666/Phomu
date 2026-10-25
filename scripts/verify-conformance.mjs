#!/usr/bin/env node
/**
 * The conformance gate — the Rust base against the web shell
 * -------------------------------------------------------------------------
 * WHAT IT DOES
 *   1. It runs the **TypeScript runner** against the web shell
 *      (`tools/conformance/run-ts-conformance.ts`) — the reference
 *      implementation replays the vectors of the corpus.
 *   2. It runs the **Rust runner** against the base
 *      (`cargo run -p phomu-conformance-runner`) — `core/phomu-core`
 *      replays the same vectors.
 *   3. It compares the two results **vector by vector** and writes a report
 *      that names the concrete difference of every deviating vector — the
 *      phase, the points, the winner, the error code — and never only
 *      "does not match".
 *
 * WHY
 *   The question "does the Rust base play the same game as the web shell?"
 *   is only credible if it is measured. The measurement is the replay of the
 *   same vectors on both sides and the comparison of the two observations.
 *   A deviation is **reported**, never defined away: a vector that deviates
 *   and that is not named in
 *   `core/phomu-conformance/vectors/intentional-divergences.json` fails the
 *   gate.
 *
 * EXIT CODES
 *   0 — every portable vector behaves identically on both sides (the
 *       intentional deviations are reported, they do not fail the gate).
 *   1 — at least one vector deviates, is missing on one side or could not be
 *       compared.
 *   2 — the gate itself could not run (no corpus, no runner).
 *
 * THE SHARED RESULT FORMAT
 *   Both runners write the same file — the common denominator of the
 *   comparison:
 *
 *   {
 *     "runner": "rust" | "typescript",
 *     "schemaVersion": 1,
 *     "results": [{
 *       "id": string, "area": string, "portable": boolean,
 *       "observation": {
 *         "phases": string[], "currentRound": number, "currentMode": string,
 *         "currentSongId": string | null,
 *         "currentSongSource": "random" | "qr" | null,
 *         "autoDrawIntent": boolean,
 *         "playerScores": { [playerId: string]: number },
 *         "teamScores": { [teamId: string]: number },
 *         "playerTeams": { [playerId: string]: string | null },
 *         "teamMembers": { [teamId: string]: string[] },
 *         "turnOrder": string[], "currentTurnIndex": number,
 *         "winnerId": string | null, "isGameOver": boolean,
 *         "timelineYears": number[], "playedSongIds": string[],
 *         "answers": [{ "playerId": string, "answer": string,
 *           "outcome": "correct" | "incorrect", "isCorrect": boolean,
 *           "pointsAwarded": number, "answeredInSeconds": number | null }],
 *         "roundCount": number, "totalXP": number,
 *         "censorHint": string | null, "filteredSongIds": string[] | null,
 *         "error": { "code": string, "message": string } | null
 *       }
 *     }]
 *   }
 *
 *   The format is defined by the Rust runner
 *   (`core/phomu-conformance/src/runner.rs`) and by the TypeScript runner
 *   (`tools/conformance/lib/types.ts`). A change on one side has to be made
 *   on the other side in the same commit.
 *
 * OPTIONS
 *   --vectors <dir>   the corpus (default: core/phomu-conformance/vectors/web-shell)
 *   --ts <file>       the result file of the TypeScript runner (default: it is run)
 *   --rust <file>     the result file of the Rust runner (default: it is run)
 *   --out <file>      the report (default: tmp/conformance-report.txt)
 *   --quiet           print only the summary
 *
 * EXAMPLE
 *   npm run check:conformance
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildReport, readRegistry } from './lib/conformance-report.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_VECTORS = path.join(
  REPO_ROOT,
  'core',
  'phomu-conformance',
  'vectors',
  'web-shell'
);
const REGISTRY_FILE = path.join(
  REPO_ROOT,
  'core',
  'phomu-conformance',
  'src',
  'lib.rs'
);
const DIVERGENCE_FILE = 'intentional-divergences.json';

/**
 * Reads a command line option.
 *
 * @param {string} name - the name of the option, with the leading dashes
 * @param {string} fallback - the value used when the option is missing
 * @returns {string}
 */
function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
}

/**
 * Reads a JSON file.
 *
 * @param {string} file - the path of the file
 * @returns {unknown}
 */
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Loads the corpus — the vectors and their expectations.
 *
 * @param {string} dir - the directory that holds `index.json`
 * @returns {Map<string, object>}
 */
function loadVectors(dir) {
  const index = readJson(path.join(dir, 'index.json'));
  const map = new Map();
  for (const entry of index.vectors) {
    const vector = readJson(path.join(dir, entry.file));
    map.set(vector.id, vector);
  }
  return map;
}

/**
 * Loads the result file of a runner.
 *
 * @param {string} file - the path of the file
 * @returns {Map<string, object>}
 */
function loadRunner(file) {
  const parsed = readJson(file);
  const map = new Map();
  for (const entry of parsed.results ?? []) {
    map.set(entry.id, entry);
  }
  return map;
}

/**
 * Loads the intentional deviations — the differences that are deliberate.
 *
 * WHY: the file lies next to the corpus — in the directory of the corpus
 * itself or in the directory of the vectors.
 *
 * @param {string} dir - the corpus directory
 * @returns {Map<string, object>} the vector id -> the deviation
 */
function loadIntentionalDivergences(dir) {
  const map = new Map();
  const candidates = [
    path.join(dir, DIVERGENCE_FILE),
    path.join(dir, '..', DIVERGENCE_FILE),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const parsed = readJson(file);
    for (const divergence of parsed.divergences ?? []) {
      for (const id of divergence.vectors ?? []) {
        map.set(id, divergence);
      }
    }
    break;
  }
  return map;
}

/**
 * Runs a command and returns its output.
 *
 * @param {string} command - the program
 * @param {string[]} args - the arguments
 * @returns {{status: number, message: string}}
 */
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  if (result.error) {
    return { status: 127, message: String(result.error) };
  }
  return {
    status: result.status ?? 1,
    message: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  };
}

/**
 * Runs the TypeScript runner.
 *
 * @param {string} vectorsDir - the corpus
 * @param {string} outFile - the file the runner writes
 * @returns {{status: number, message: string}}
 */
function runTypeScript(vectorsDir, outFile) {
  return run('npx', [
    'tsx',
    'tools/conformance/run-ts-conformance.ts',
    '--vectors',
    vectorsDir,
    '--out',
    outFile,
  ]);
}

/**
 * Runs the Rust runner.
 *
 * @param {string} vectorsDir - the corpus
 * @param {string} outFile - the file the runner writes
 * @returns {{status: number, message: string}}
 */
function runRust(vectorsDir, outFile) {
  return run('cargo', [
    'run',
    '-p',
    'phomu-conformance-runner',
    '--',
    '--vectors',
    vectorsDir,
    '--out',
    outFile,
  ]);
}

/**
 * Compares the corpus and writes the report.
 *
 * @returns {number} the exit code of the gate
 */
function main() {
  const quiet = process.argv.includes('--quiet');
  const vectorsDir = path.resolve(option('--vectors', DEFAULT_VECTORS));
  const outFile = path.resolve(
    option('--out', path.join(REPO_ROOT, 'tmp', 'conformance-report.txt'))
  );
  const tsFile = option('--ts', '');
  const rustFile = option('--rust', '');

  if (!fs.existsSync(path.join(vectorsDir, 'index.json'))) {
    console.error(`The corpus ${vectorsDir} has no index.json.`);
    process.exit(2);
  }

  const workDir = path.join(REPO_ROOT, 'tmp');
  fs.mkdirSync(workDir, { recursive: true });

  // 1. the reference side
  let tsResultFile = tsFile;
  if (!tsResultFile) {
    tsResultFile = path.join(workDir, 'conformance-ts.json');
    const result = runTypeScript(vectorsDir, tsResultFile);
    if (!quiet) console.log(`TypeScript runner: ${result.message}`);
    if (result.status !== 0) {
      console.error('The TypeScript runner failed — the gate cannot run.');
      process.exit(2);
    }
  }

  // 2. the Rust side
  let rustResultFile = rustFile;
  if (!rustResultFile) {
    rustResultFile = path.join(workDir, 'conformance-rust.json');
    const result = runRust(vectorsDir, rustResultFile);
    if (!quiet) console.log(`Rust runner: ${result.message}`);
    if (result.status !== 0) {
      console.error('The Rust runner failed — the gate cannot run.');
      process.exit(2);
    }
  }

  const report = buildReport({
    vectors: loadVectors(vectorsDir),
    tsResults: loadRunner(tsResultFile),
    rustResults: loadRunner(rustResultFile),
    intentional: loadIntentionalDivergences(vectorsDir),
    registry: readRegistry(REGISTRY_FILE),
    corpus: path.relative(REPO_ROOT, vectorsDir),
  });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, report.text, 'utf8');
  if (!quiet) process.stdout.write(report.text);
  else console.log(`Report written to ${outFile}`);

  process.exit(report.failed === 0 ? 0 : 1);
}

main();
