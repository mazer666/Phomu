#!/usr/bin/env node
/**
 * The conformance comparison
 *
 * WHY: the proof that the Rust base plays the same game as the web shell is
 * a vector-by-vector comparison of two observation files. This script does
 * that comparison and writes a report that names the concrete difference of
 * every deviating vector — not just "does not match".
 *
 * WHAT: three comparisons per vector
 *   1. TypeScript observation vs. the expectation of the vector
 *      (does the reference still do what the vector says?)
 *   2. Rust observation vs. the expectation of the vector
 *      (does the Rust base do what the vector says?)
 *   3. Rust observation vs. the TypeScript observation
 *      (do both implementations behave identically?)
 *
 * Exit code 1 as soon as a **portable** vector deviates or is missing on one
 * side. Vectors that are marked as not portable are reported separately as
 * documented divergences — they do not fail the gate.
 *
 * EXAMPLE: `node tools/conformance/compare-conformance.mjs --ts /tmp/ts.json --rust /tmp/rust.json`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffValues, missingExpectationFields } from './lib/diff.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_VECTORS = path.join(
  REPO_ROOT,
  'core',
  'phomu-conformance',
  'vectors',
  'web-shell'
);

/**
 * The error codes of the vector layer.
 *
 * WHY: the observation carries two namespaces of errors. The failure of the
 * **vector layer** means that the input could not be executed at all — the
 * runner stops the replay and the vector proves nothing. The typed error of
 * the **core** means that the input was executed and the rules refused it —
 * that is a behaviour of the implementation and therefore part of the
 * comparison (CORE-111; `docs/design/PLATFORM-ARCHITECTURE.md` § 1.4, the
 * promise of the same named error situations).
 *
 * The two namespaces are told apart by the code: the vector layer names its
 * failures, the core carries the numeric code of its error
 * (`core/phomu-errors/src/lib.rs`). The codes of the vector layer are
 * listed here, so that the comparison never mistakes a refusal of the rules
 * for a gap in the proof.
 */
const VECTOR_LAYER_ERROR_CODES = new Set(['UNKNOWN_SONG', 'NO_CURRENT_SONG']);

/**
 * Whether an error code belongs to the vector layer.
 *
 * @param {string} code - the code of the observed error
 * @returns {boolean}
 */
function isVectorLayerError(code) {
  return VECTOR_LAYER_ERROR_CODES.has(code);
}

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
 * Formats a value for the report.
 *
 * @param {unknown} value - the value
 * @returns {string}
 */
function format(value) {
  if (value === undefined) return '(missing)';
  return JSON.stringify(value);
}

/**
 * Loads a runner result file.
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
 * Loads the corpus — the expectations of the vectors.
 *
 * @param {string} dir - the vectors directory
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

function main() {
  const vectorsDir = option('--vectors', DEFAULT_VECTORS);
  const tsFile = option('--ts', '');
  const rustFile = option('--rust', '');
  const outFile = option('--out', '');

  if (!tsFile) {
    console.error(
      'Missing --ts <file> (the result file of the TypeScript runner).'
    );
    process.exit(2);
  }

  const vectors = loadVectors(vectorsDir);
  const tsResults = loadRunner(tsFile);
  const rustResults =
    rustFile && fs.existsSync(rustFile) ? loadRunner(rustFile) : null;

  const report = [];
  let compared = 0;
  let matching = 0;
  let deviating = 0;
  let documented = 0;
  let missing = 0;
  let notComparable = 0;
  let referenceMismatches = 0;

  for (const [id, vector] of vectors) {
    const tsEntry = tsResults.get(id);
    const rustEntry = rustResults ? rustResults.get(id) : undefined;
    const portable = vector.portable !== false;

    if (!tsEntry) {
      missing += 1;
      report.push({
        id,
        area: vector.area,
        portable,
        status: 'missing',
        detail:
          'the TypeScript runner did not produce a result for this vector',
      });
      continue;
    }

    // A portable vector has to assert the complete observation.
    if (portable) {
      const incomplete = missingExpectationFields(vector.then);
      if (incomplete.length > 0) {
        missing += 1;
        report.push({
          id,
          area: vector.area,
          portable,
          status: 'missing',
          detail: `the expectation does not assert: ${incomplete.join(', ')}`,
        });
        continue;
      }
    }

    // A vector that is not portable documents a known divergence: it is
    // reported, but it does not fail the gate.
    if (!portable) {
      documented += 1;
      report.push({
        id,
        area: vector.area,
        portable,
        status: 'documented-divergence',
        note: vector.portabilityNote ?? '',
        referenceDiff: diffValues(vector.then, tsEntry.observation),
        rustDiff: rustEntry
          ? diffValues(vector.then, rustEntry.observation)
          : null,
      });
      continue;
    }

    compared += 1;

    // 1. the reference against its own expectation
    const referenceDiff = diffValues(vector.then, tsEntry.observation);

    if (!rustResults) {
      // Only the reference side was measured.
      if (referenceDiff.length === 0) {
        matching += 1;
      } else {
        deviating += 1;
        referenceMismatches += 1;
      }
      report.push({
        id,
        area: vector.area,
        portable,
        status: referenceDiff.length === 0 ? 'match' : 'deviation',
        referenceDiff,
        rustDiff: null,
      });
      continue;
    }

    if (!rustEntry) {
      missing += 1;
      report.push({
        id,
        area: vector.area,
        portable,
        status: 'missing',
        detail: 'the Rust runner did not produce a result for this vector',
      });
      continue;
    }

    // 2. the Rust side against the expectation
    const rustError = rustEntry.observation.error;
    const expectedError = vector.then.error;
    if (rustError && !expectedError && isVectorLayerError(rustError.code)) {
      // The Rust side could not execute the vector — that is a gap in the
      // proof, not a behavioural difference.
      notComparable += 1;
      report.push({
        id,
        area: vector.area,
        portable,
        status: 'not-comparable',
        detail: `the Rust runner could not execute the vector: ${rustError.code} — ${rustError.message}`,
        referenceDiff,
        rustDiff: null,
      });
      continue;
    }
    // A typed error of the core is **not** a gap in the proof: it is the
    // refusal of the rules and therefore a behavioural difference like any
    // other. It is compared below with the expectation of the vector.

    const rustDiff = diffValues(vector.then, rustEntry.observation);

    if (referenceDiff.length === 0 && rustDiff.length === 0) {
      matching += 1;
      report.push({
        id,
        area: vector.area,
        portable,
        status: 'match',
        referenceDiff: [],
        rustDiff: [],
      });
    } else {
      deviating += 1;
      report.push({
        id,
        area: vector.area,
        portable,
        status: 'deviation',
        referenceDiff,
        rustDiff,
      });
    }
  }

  const lines = [];
  lines.push('='.repeat(72));
  lines.push('CONFORMANCE COMPARISON — TypeScript reference vs. Rust base');
  lines.push('='.repeat(72));
  lines.push(`vectors in the corpus : ${vectors.size}`);
  lines.push(`compared (portable)    : ${compared}`);
  lines.push(`matching               : ${matching}`);
  lines.push(`deviating              : ${deviating}`);
  lines.push(`documented divergences : ${documented}`);
  lines.push(`not comparable         : ${notComparable}`);
  lines.push(`missing on one side    : ${missing}`);
  if (!rustResults) {
    lines.push('');
    lines.push(
      'NOTE: no Rust result file was given — only the reference side was measured.'
    );
  }

  const deviations = report.filter((entry) => entry.status === 'deviation');
  if (deviations.length > 0) {
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push('DEVIATIONS');
    lines.push('-'.repeat(72));
    for (const entry of deviations) {
      lines.push(`[${entry.id}] (area: ${entry.area})`);
      for (const diff of entry.referenceDiff ?? []) {
        lines.push(
          `  typescript-vs-vector  ${diff.path}: expected ${format(diff.expected)}, ` +
            `actual ${format(diff.actual)}`
        );
      }
      for (const diff of entry.rustDiff ?? []) {
        lines.push(
          `  rust-vs-vector        ${diff.path}: expected ${format(diff.expected)}, ` +
            `actual ${format(diff.actual)}`
        );
      }
    }
  }

  const documentedEntries = report.filter(
    (entry) => entry.status === 'documented-divergence'
  );
  if (documentedEntries.length > 0) {
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push('DOCUMENTED DIVERGENCES (not portable — reported, not failed)');
    lines.push('-'.repeat(72));
    for (const entry of documentedEntries) {
      lines.push(`[${entry.id}] (area: ${entry.area})`);
      lines.push(`  reason: ${entry.note}`);
      for (const diff of entry.referenceDiff ?? []) {
        lines.push(
          `  typescript-vs-vector  ${diff.path}: expected ${format(diff.expected)}, ` +
            `actual ${format(diff.actual)}`
        );
      }
      for (const diff of entry.rustDiff ?? []) {
        lines.push(
          `  rust-vs-vector        ${diff.path}: expected ${format(diff.expected)}, ` +
            `actual ${format(diff.actual)}`
        );
      }
    }
  }

  const notComparableEntries = report.filter(
    (entry) => entry.status === 'not-comparable'
  );
  if (notComparableEntries.length > 0) {
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push('NOT COMPARABLE (the Rust side could not execute the vector)');
    lines.push('-'.repeat(72));
    for (const entry of notComparableEntries) {
      lines.push(`[${entry.id}] (area: ${entry.area}) — ${entry.detail}`);
    }
  }

  const missingEntries = report.filter((entry) => entry.status === 'missing');
  if (missingEntries.length > 0) {
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push('MISSING');
    lines.push('-'.repeat(72));
    for (const entry of missingEntries) {
      lines.push(`[${entry.id}] (area: ${entry.area}) — ${entry.detail}`);
    }
  }

  lines.push('');
  lines.push('-'.repeat(72));
  lines.push('RESULT');
  lines.push('-'.repeat(72));
  const failed = deviating + missing + notComparable;
  if (failed === 0) {
    lines.push(
      `PASS — ${compared} portable vector(s) compared, ${matching} identical, ` +
        `${deviating} deviating.`
    );
  } else {
    lines.push(
      `FAIL — ${failed} vector(s) deviate, are missing or could not be compared ` +
        `(${compared} compared, ${matching} identical, ${deviating} deviating, ` +
        `${notComparable} not comparable, ${missing} missing).`
    );
  }

  const text = `${lines.join('\n')}\n`;
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, text, 'utf8');
    console.log(`Report written to ${outFile}`);
  }
  process.stdout.write(text);

  process.exit(failed === 0 ? 0 : 1);
}

main();
