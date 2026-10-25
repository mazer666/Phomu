/**
 * The report of the conformance comparison
 * -------------------------------------------------------------------------
 * WHAT: the field-by-field comparison of the two runner results and the
 * text of the report.
 *
 * WHY: "the result does not match" is not an evidence. Every difference
 * names the path inside the observation, the expected value and the actual
 * value — and every deviating vector is classified:
 *
 *   - `match` — both sides behave identically and the expectation holds,
 *   - `intentional-deviation` — the difference is named in
 *     `core/phomu-conformance/vectors/intentional-divergences.json` and
 *     touches only the fields that the group names; it is reported and it
 *     does not fail the gate,
 *   - `deviation` — an undocumented difference; it fails the gate,
 *   - `documented-divergence` — the corpus marks the vector as not
 *     portable; it is reported and it does not fail the gate,
 *   - `missing` — a side has no result for the vector; it fails the gate.
 *
 * The comparison uses `tools/conformance/lib/diff.mjs` — the same field
 * comparison the two runners were built against.
 */

import fs from 'node:fs';

import {
  diffValues,
  missingExpectationFields,
} from '../../tools/conformance/lib/diff.mjs';

/**
 * Formats a value for the report.
 *
 * @param {unknown} value - the value
 * @returns {string}
 */
export function format(value) {
  if (value === undefined) return '(missing)';
  return JSON.stringify(value);
}

/**
 * The root field of a difference — the name of the observation field that
 * the difference belongs to.
 *
 * WHY: the classification of a difference needs the *field*, not the path:
 * `phases[1]` belongs to the field `phases`.
 *
 * @param {string} path - the path of the difference
 * @returns {string}
 */
export function rootField(path) {
  const match = /^[^.[\]]+/.exec(path);
  return match ? match[0] : path;
}

/**
 * The fields that a difference touches.
 *
 * @param {{path: string}[]} diffs - the differences
 * @returns {Set<string>}
 */
export function fieldsOf(diffs) {
  const fields = new Set();
  for (const diff of diffs ?? []) {
    fields.add(rootField(diff.path));
  }
  return fields;
}

/**
 * Reads the registry of the crate — the list of the differences that the
 * base does not reproduce.
 *
 * WHY: the classification of the gate (the file
 * `core/phomu-conformance/vectors/intentional-divergences.json`) and the
 * registry of the crate
 * (`core/phomu-conformance/src/lib.rs`, `KNOWN_DIVERGENCES`) have to hold
 * the same vectors: the crate's test compares the diverging set with the
 * registry, the gate compares the two implementations. A list that drifts
 * away from the other one would make one of the two gates blind.
 *
 * @param {string} file - the path of the Rust source
 * @returns {string[]|null} the identifiers, or `null` when the registry
 *   cannot be read
 */
export function readRegistry(file) {
  if (!fs.existsSync(file)) return null;
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('pub const KNOWN_DIVERGENCES');
  if (start === -1) return null;
  const block = source.slice(start, source.indexOf('];', start));
  const ids = [];
  const pattern = /\(\s*"([^"]+)"\s*,/g;
  let match = pattern.exec(block);
  while (match !== null) {
    ids.push(match[1]);
    match = pattern.exec(block);
  }
  return ids;
}

/**
 * Compares the corpus and builds the report.
 *
 * @param {object} input - the input of the comparison
 * @param {Map<string, object>} input.vectors - the corpus
 * @param {Map<string, object>} input.tsResults - the result of the TypeScript runner
 * @param {Map<string, object>} input.rustResults - the result of the Rust runner
 * @param {Map<string, object>} input.intentional - the intentional deviations
 * @param {string[]|null} input.registry - the registry of the crate
 * @param {string} input.corpus - the path of the corpus, for the headline
 * @returns {{text: string, failed: number, compared: number, matching: number,
 *   deviating: number, intentional: number, documented: number, missing: number,
 *   entries: object[]}}
 */
export function buildReport({
  vectors,
  tsResults,
  rustResults,
  intentional,
  registry,
  corpus,
}) {
  const entries = [];
  let compared = 0;
  let matching = 0;
  let deviating = 0;
  let intentionalCount = 0;
  let documented = 0;
  let missing = 0;

  for (const [id, vector] of vectors) {
    const tsEntry = tsResults.get(id);
    const rustEntry = rustResults.get(id);
    const portable = vector.portable !== false;

    if (!tsEntry || !rustEntry) {
      missing += 1;
      entries.push({
        id,
        area: vector.area,
        status: 'missing',
        detail: !tsEntry
          ? 'the TypeScript runner did not produce a result for this vector'
          : 'the Rust runner did not produce a result for this vector',
      });
      continue;
    }

    // A portable vector asserts the complete observation — otherwise a
    // field could be forgotten without anybody noticing.
    if (portable) {
      const incomplete = missingExpectationFields(vector.then);
      if (incomplete.length > 0) {
        missing += 1;
        entries.push({
          id,
          area: vector.area,
          status: 'missing',
          detail: `the expectation does not assert: ${incomplete.join(', ')}`,
        });
        continue;
      }
    }

    // The three comparisons: the reference against its expectation, the
    // base against its expectation, and the two against each other.
    const tsDiff = diffValues(vector.then, tsEntry.observation);
    const rustDiff = diffValues(vector.then, rustEntry.observation);
    const sideDiff = diffValues(tsEntry.observation, rustEntry.observation);

    if (!portable) {
      documented += 1;
      entries.push({
        id,
        area: vector.area,
        status: 'documented-divergence',
        note: vector.portabilityNote ?? '',
        tsDiff,
        rustDiff,
        sideDiff,
      });
      continue;
    }

    compared += 1;

    if (tsDiff.length === 0 && rustDiff.length === 0 && sideDiff.length === 0) {
      matching += 1;
      entries.push({
        id,
        area: vector.area,
        status: 'match',
        tsDiff,
        rustDiff,
        sideDiff,
      });
      continue;
    }

    const divergence = intentional.get(id);
    if (divergence) {
      // The deviation is intentional only in the fields that the group
      // names — a difference in another field is a new, undocumented
      // difference and fails the gate.
      const touched = fieldsOf([...tsDiff, ...rustDiff, ...sideDiff]);
      const allowed = new Set(divergence.fields ?? []);
      const unexpected = [...touched].filter((field) => !allowed.has(field));
      if (unexpected.length === 0) {
        intentionalCount += 1;
        entries.push({
          id,
          area: vector.area,
          status: 'intentional-deviation',
          divergence,
          tsDiff,
          rustDiff,
          sideDiff,
        });
        continue;
      }
      deviating += 1;
      entries.push({
        id,
        area: vector.area,
        status: 'deviation',
        detail:
          `the vector is listed as an intentional deviation (${divergence.id}), ` +
          `but the difference touches the field(s) ${unexpected.join(', ')}`,
        tsDiff,
        rustDiff,
        sideDiff,
      });
      continue;
    }

    deviating += 1;
    entries.push({
      id,
      area: vector.area,
      status: 'deviation',
      tsDiff,
      rustDiff,
      sideDiff,
    });
  }

  const lines = [];
  lines.push('='.repeat(72));
  lines.push('CONFORMANCE GATE — the Rust base against the web shell');
  lines.push('='.repeat(72));
  lines.push(`corpus                  : ${corpus}`);
  lines.push(`vectors in the corpus   : ${vectors.size}`);
  lines.push(`compared (portable)      : ${compared}`);
  lines.push(`identical               : ${matching}`);
  lines.push(`deviating (gate fails)  : ${deviating}`);
  lines.push(`intentional deviations  : ${intentionalCount}`);
  lines.push(`documented divergences  : ${documented}`);
  lines.push(`missing on one side     : ${missing}`);

  // The two lists of the differences — the classification of the gate and the
  // registry of the crate — have to hold the same vectors.
  let registryMismatch = 0;
  if (registry) {
    const classified = [...intentional.keys()].sort();
    const registered = [...registry].sort();
    const onlyClassified = classified.filter((id) => !registered.includes(id));
    const onlyRegistered = registered.filter((id) => !classified.includes(id));
    if (onlyClassified.length > 0 || onlyRegistered.length > 0) {
      registryMismatch = 1;
      lines.push(
        `registry mismatch       : ${onlyClassified.length + onlyRegistered.length}`
      );
    }
  } else {
    registryMismatch = 1;
    lines.push(
      'registry mismatch       : the registry of the crate could not be read'
    );
  }

  const section = (title, list, render) => {
    if (list.length === 0) return;
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push(title);
    lines.push('-'.repeat(72));
    for (const entry of list) render(entry, lines);
  };

  const writeDiffs = (entry, out) => {
    for (const diff of entry.tsDiff ?? []) {
      out.push(
        `  typescript-vs-vector  ${diff.path}: expected ${format(diff.expected)}, ` +
          `actual ${format(diff.actual)}`
      );
    }
    for (const diff of entry.rustDiff ?? []) {
      out.push(
        `  rust-vs-vector        ${diff.path}: expected ${format(diff.expected)}, ` +
          `actual ${format(diff.actual)}`
      );
    }
    for (const diff of entry.sideDiff ?? []) {
      out.push(
        `  rust-vs-typescript    ${diff.path}: typescript ${format(diff.expected)}, ` +
          `rust ${format(diff.actual)}`
      );
    }
  };

  section(
    'DEVIATIONS — the gate fails',
    entries.filter((entry) => entry.status === 'deviation'),
    (entry, out) => {
      out.push(`[${entry.id}] (area: ${entry.area})`);
      if (entry.detail) out.push(`  reason: ${entry.detail}`);
      writeDiffs(entry, out);
    }
  );

  section(
    'INTENTIONAL DEVIATIONS — reported, they do not fail the gate',
    entries.filter((entry) => entry.status === 'intentional-deviation'),
    (entry, out) => {
      out.push(
        `[${entry.id}] (area: ${entry.area}) — ${entry.divergence.title}`
      );
      out.push(`  group: ${entry.divergence.id}`);
      for (const diff of entry.sideDiff ?? []) {
        out.push(
          `  rust-vs-typescript    ${diff.path}: typescript ${format(diff.expected)}, ` +
            `rust ${format(diff.actual)}`
        );
      }
    }
  );

  // The reason and the source of every group — once per group.
  const groups = new Map();
  for (const entry of entries.filter(
    (e) => e.status === 'intentional-deviation'
  )) {
    if (!groups.has(entry.divergence.id))
      groups.set(entry.divergence.id, entry.divergence);
  }
  if (groups.size > 0) {
    lines.push('');
    lines.push('The reasons of the intentional deviations:');
    for (const divergence of groups.values()) {
      lines.push(`  ${divergence.id}: ${divergence.reason}`);
      lines.push(`    source: ${divergence.source}`);
      lines.push(`    fields: ${(divergence.fields ?? []).join(', ')}`);
    }
  }

  section(
    'DOCUMENTED DIVERGENCES — the corpus marks them as not portable',
    entries.filter((entry) => entry.status === 'documented-divergence'),
    (entry, out) => {
      out.push(`[${entry.id}] (area: ${entry.area})`);
      out.push(`  reason: ${entry.note}`);
      for (const diff of entry.sideDiff ?? []) {
        out.push(
          `  rust-vs-typescript    ${diff.path}: typescript ${format(diff.expected)}, ` +
            `rust ${format(diff.actual)}`
        );
      }
    }
  );

  section(
    'MISSING — the gate fails',
    entries.filter((entry) => entry.status === 'missing'),
    (entry, out) => {
      out.push(`[${entry.id}] (area: ${entry.area}) — ${entry.detail}`);
    }
  );

  if (registryMismatch > 0) {
    const classified = [...intentional.keys()].sort();
    const registered = registry ? [...registry].sort() : [];
    lines.push('');
    lines.push('-'.repeat(72));
    lines.push('REGISTRY MISMATCH — the gate fails');
    lines.push('-'.repeat(72));
    lines.push(
      'The classification of the gate (intentional-divergences.json) and the registry of the ' +
        'crate (KNOWN_DIVERGENCES) have to hold the same vectors.'
    );
    const onlyClassified = classified.filter((id) => !registered.includes(id));
    const onlyRegistered = registered.filter((id) => !classified.includes(id));
    if (onlyClassified.length > 0) {
      lines.push(`  only in the classification: ${onlyClassified.join(', ')}`);
    }
    if (onlyRegistered.length > 0) {
      lines.push(`  only in the registry: ${onlyRegistered.join(', ')}`);
    }
    if (onlyClassified.length === 0 && onlyRegistered.length === 0) {
      lines.push('  the registry of the crate could not be read');
    }
  }

  lines.push('');
  lines.push('-'.repeat(72));
  lines.push('RESULT');
  lines.push('-'.repeat(72));
  const failed = deviating + missing + registryMismatch;
  if (failed === 0) {
    lines.push(
      `PASS — ${compared} portable vector(s) compared, ${matching} identical, ` +
        `${deviating} deviating, ${intentionalCount} intentional deviation(s), ` +
        `${documented} documented divergence(s).`
    );
  } else {
    lines.push(
      `FAIL — ${failed} vector(s) deviate, are missing or the registry does not agree ` +
        `(${compared} compared, ${matching} identical, ${deviating} deviating, ` +
        `${intentionalCount} intentional deviation(s), ${documented} documented ` +
        `divergence(s), ${missing} missing).`
    );
  }

  return {
    text: `${lines.join('\n')}\n`,
    failed,
    compared,
    matching,
    deviating,
    intentional: intentionalCount,
    documented,
    missing,
    entries,
  };
}
