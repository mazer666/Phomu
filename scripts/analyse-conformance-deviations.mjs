#!/usr/bin/env node
/**
 * The analysis of the deviations of the conformance gate
 * -------------------------------------------------------------------------
 * WHAT IT DOES
 *   It reads the two result files of the runners
 *   (`tmp/conformance-ts.json`, `tmp/conformance-rust.json`), the corpus and
 *   the list of the intentional deviations, groups **every** deviating
 *   vector by the pattern of its difference and prints, for every group:
 *
 *     - the vectors of the group and the file of the corpus they live in,
 *     - the **expectation of the vector** (`then`),
 *     - the value of the **web shell** and the value of the **Rust base**,
 *     - the place in the code of the shell and in the code of the base where
 *       the value is produced.
 *
 * WHY
 *   The gate says *that* a vector deviates. The analysis says *where* the
 *   three sides disagree — the vector is the specification, the shell and
 *   the base are the two implementations. Only a place in the code turns a
 *   difference into a decision.
 *
 * OPTIONS
 *   --ts <file>    the result file of the TypeScript runner
 *   --rust <file>  the result file of the Rust runner
 *   --vectors <dir> the corpus
 *   --out <file>   the report (default: stdout)
 *
 * EXAMPLE
 *   npm run check:conformance -- --quiet && node scripts/analyse-conformance-deviations.mjs
 */

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

/**
 * The places in the code that produce the observed values.
 *
 * WHY: a difference without a place in the code is not a finding — it is a
 * number. Every entry names the file (and the line where the file has one)
 * that produces the value on the side that produces it.
 */
const CODE_SITES = {
  currentSongId: {
    shell:
      'tools/conformance/lib/song.ts (the song of the round is read from the question of the store); ' +
      'tools/conformance/lib/harness.ts (the observation); ' +
      'src/stores/game-store-rounds.ts:191-201 (`setQuestion` sets the question, `skipBrokenSong` and `nextRound` clear it)',
    base: 'core/phomu-core/src/session/rounds.rs:66 (`self.state.round.song = None`); core/phomu-core/src/session/state.rs (the song of the round)',
  },
  phases: {
    shell: 'src/stores/game-store-rounds.ts:272-274 (`advancePhase`); src/stores/game-store-rounds.ts:228-232 (`submitAnswer`)',
    base:
      'core/phomu-core/src/session/answers.rs:210-228 (`lock_answers` sets the phase `locked-in`); ' +
      'core/phomu-core/src/session/answers.rs:243-249 (`reveal` refuses without the lock)',
  },
  roundCount: {
    shell:
      'src/stores/game-store-rounds.ts (`nextRound` logs a round with a drawn song); ' +
      'src/stores/game-store-rounds.ts:159-172',
    base: 'core/phomu-core/src/session/rounds.rs:43-57 (`next_round` logs when a song is drawn)',
  },
  currentRound: {
    shell: 'src/stores/game-store-rounds.ts:159-172 (`nextRound`)',
    base: 'core/phomu-core/src/session/rounds.rs:64',
  },
  playerScores: {
    shell: 'src/stores/game-store-players.ts (`awardPoints`)',
    base: 'core/phomu-core/src/session/answers.rs:149-151; core/phomu-core/src/session/scores.rs',
  },
  answers: {
    shell: 'src/stores/game-store-rounds.ts:228-232 (`submitAnswer`); src/utils/mode-rules.ts',
    base: 'core/phomu-core/src/session/answers.rs:100-160',
  },
  timelineYears: {
    shell: 'src/stores/game-store-timeline.ts',
    base: 'core/phomu-core/src/session/rounds.rs (the shared timeline)',
  },
  error: {
    shell: 'src/stores/game-store.ts (the shell has no typed errors)',
    base: 'core/phomu-core/src/session/answers.rs (the typed errors of the core)',
  },
  teamScores: {
    shell: 'src/stores/game-store-teams.ts',
    base: 'core/phomu-core/src/session/scores.rs',
  },
  playerTeams: {
    shell: 'src/stores/game-store-teams.ts',
    base: 'core/phomu-core/src/session/scores.rs',
  },
  teamMembers: {
    shell: 'src/stores/game-store-teams.ts',
    base: 'core/phomu-core/src/session/scores.rs',
  },
};

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
 * Loads the intentional deviations.
 *
 * @param {string} dir - the corpus directory
 * @returns {Map<string, object>}
 */
function loadIntentionalDivergences(dir) {
  const map = new Map();
  for (const candidate of [
    path.join(dir, 'intentional-divergences.json'),
    path.join(dir, '..', 'intentional-divergences.json'),
  ]) {
    if (!fs.existsSync(candidate)) continue;
    const parsed = readJson(candidate);
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
 * The name of the pattern of a difference.
 *
 * WHY: the patterns are the vocabulary of the analysis — a difference in the
 * song of the round is a different kind of finding than a difference in the
 * phase.
 *
 * @param {string} field - the root field of the difference
 * @returns {string}
 */
function patternOf(field) {
  switch (field) {
    case 'currentSongId':
      return 'A — the song of the round (the shell keeps the song of the last round)';
    case 'phases':
      return 'B — the phase of the round (the base enters `locked-in`)';
    case 'roundCount':
      return 'C — the number of the logged rounds';
    case 'currentRound':
      return 'C — the number of the logged rounds';
    case 'answers':
    case 'playerScores':
    case 'timelineYears':
      return 'D — the effect of the answer (the mode rule of the two sides differs)';
    case 'error':
      return 'E — the error of the operation';
    case 'teamScores':
    case 'playerTeams':
    case 'teamMembers':
      return 'F — the teams';
    default:
      return `X — ${field}`;
  }
}

/**
 * The value of an expectation field, formatted.
 *
 * @param {unknown} value - the value
 * @returns {string}
 */
function format(value) {
  if (value === undefined) return '(missing)';
  return JSON.stringify(value);
}

/**
 * The main routine.
 *
 * @returns {number} the exit code
 */
function main() {
  const vectorsDir = path.resolve(option('--vectors', DEFAULT_VECTORS));
  const tsFile = path.resolve(
    option('--ts', path.join(REPO_ROOT, 'tmp', 'conformance-ts.json'))
  );
  const rustFile = path.resolve(
    option('--rust', path.join(REPO_ROOT, 'tmp', 'conformance-rust.json'))
  );
  const outFile = option('--out', '');

  for (const file of [tsFile, rustFile]) {
    if (!fs.existsSync(file)) {
      console.error(
        `The result file ${file} does not exist — run "npm run check:conformance" first.`
      );
      return 2;
    }
  }

  const vectors = loadVectors(vectorsDir);
  const tsResults = loadRunner(tsFile);
  const rustResults = loadRunner(rustFile);
  const intentional = loadIntentionalDivergences(vectorsDir);
  const registry = readRegistry(
    path.join(REPO_ROOT, 'core', 'phomu-conformance', 'src', 'lib.rs')
  );

  const report = buildReport({
    vectors,
    tsResults,
    rustResults,
    intentional,
    registry,
    corpus: path.relative(REPO_ROOT, vectorsDir),
  });

  const lines = [];
  lines.push('='.repeat(72));
  lines.push('CONFORMANCE DEVIATIONS — grouped by pattern');
  lines.push('='.repeat(72));
  lines.push(
    `compared ${report.compared}, identical ${report.matching}, ` +
      `deviating ${report.deviating}, intentional ${report.intentional}, ` +
      `documented ${report.documented}, missing ${report.missing}`
  );

  // The groups: pattern -> the deviating vectors.
  const groups = new Map();
  for (const entry of report.entries.filter((e) => e.status === 'deviation')) {
    const fields = new Set();
    for (const diff of [
      ...(entry.tsDiff ?? []),
      ...(entry.rustDiff ?? []),
      ...(entry.sideDiff ?? []),
    ]) {
      fields.add(/^[^.[\]]+/.exec(diff.path)?.[0] ?? diff.path);
    }
    const key = [...fields].sort().join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  for (const [key, entries] of [...groups.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0]);
  })) {
    const fields = key.split(',');
    const patterns = [...new Set(fields.map(patternOf))];
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push(`PATTERN ${patterns.join(' | ')}`);
    lines.push(`fields: ${key}`);
    lines.push(`vectors: ${entries.length}`);
    lines.push('-'.repeat(72));
    for (const entry of entries) {
      const vector = vectors.get(entry.id);
      const ts = tsResults.get(entry.id);
      const rust = rustResults.get(entry.id);
      lines.push(`[${entry.id}] (area: ${entry.area})`);
      if (entry.detail) lines.push(`  note: ${entry.detail}`);
      lines.push(
        `  vector file: core/phomu-conformance/vectors/web-shell/${vectorFile(vectorsDir, entry.id)}`
      );
      lines.push(`  given.currentSong: ${format(vector.given.currentSong)}`);
      for (const diff of entry.tsDiff ?? []) {
        lines.push(
          `  vector(${diff.path})=${format(diff.expected)} | shell=${format(diff.actual)}`
        );
      }
      for (const diff of entry.rustDiff ?? []) {
        lines.push(
          `  vector(${diff.path})=${format(diff.expected)} | base=${format(diff.actual)}`
        );
      }
      for (const diff of entry.sideDiff ?? []) {
        lines.push(
          `  shell(${diff.path})=${format(diff.expected)} | base=${format(diff.actual)}`
        );
      }
      for (const field of fields) {
        const site = CODE_SITES[field];
        if (!site) continue;
        lines.push(`  where (shell): ${site.shell}`);
        lines.push(`  where (base) : ${site.base}`);
      }
      lines.push(
        `  shell error: ${format(ts?.observation?.error)} | base error: ${format(rust?.observation?.error)}`
      );
    }
  }

  const text = `${lines.join('\n')}\n`;
  if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(path.resolve(outFile), text, 'utf8');
    console.log(`Report written to ${outFile}`);
  } else {
    process.stdout.write(text);
  }
  return 0;
}

/**
 * The file of the corpus that holds a vector.
 *
 * @param {string} dir - the corpus directory
 * @param {string} id - the identifier of the vector
 * @returns {string}
 */
function vectorFile(dir, id) {
  const index = readJson(path.join(dir, 'index.json'));
  for (const entry of index.vectors) {
    if (entry.id === id) return entry.file;
  }
  return '(unknown)';
}

process.exit(main());
