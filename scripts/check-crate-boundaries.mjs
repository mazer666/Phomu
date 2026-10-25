#!/usr/bin/env node
/**
 * Quality gate: crate boundaries (BUILD-CONTRACT §1.1, §7; PLATFORM-ARCHITECTURE §3.6)
 * -------------------------------------------------------------------------
 * WHAT IT CHECKS
 *   1. G1  The dependency direction of the Cargo workspace. A crate may only
 *          depend on crates that live below it; the rule table lives in
 *          `scripts/crate-boundaries.rules.json`.
 *   2. G3  No crate may `include!` a file from outside its own directory.
 *   3. G5  The ABI version in the generated C header equals the ABI version
 *          in the Rust sources of the bridges.
 *
 * HOW IT READS THE MANIFESTS
 *   `Cargo.toml` is TOML. The gate parses it with the TOML parser in
 *   `scripts/lib/toml.mjs` — never with a YAML parser, which would read the
 *   table headers as something else and would never see an edge.
 *   When `cargo` is available, `cargo metadata --no-deps` is used as a
 *   **cross-check**: a disagreement between the parser and Cargo is itself a
 *   finding, so a mistake in the parser cannot make the gate blind.
 *
 * BEHAVIOUR
 *   - Exit code 0 when no rule is violated.
 *   - Exit code 1 when at least one rule is violated. Every finding names the
 *     concrete edge: "crate A depends on crate B, which is not allowed".
 *   - Exit code 0 and the message `SKIPPED — no Cargo workspace` when the
 *     repository has no Cargo workspace yet. The gate must not block the
 *     repository before the base exists.
 *
 * OPTIONS
 *   --root=<path>    check a different tree (the isolated proof of the gate)
 *   --rules=<path>   check against a different rule table
 *   --quiet          print only the findings and the summary
 *
 * EXAMPLE
 *   node scripts/check-crate-boundaries.mjs
 *   node scripts/check-crate-boundaries.mjs --root=scripts/fixtures/crate-boundaries/ok
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkAbiVersions,
  checkIncludes,
  evaluateEdges,
} from './lib/boundary-rules.mjs';
import { collectEdges, discoverCrates, readManifest, realPath } from './lib/crate-graph.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_RULES = path.join(SCRIPT_DIR, 'crate-boundaries.rules.json');

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

const root = realPath(path.resolve(option('root', DEFAULT_ROOT)));
const rulesPath = path.resolve(option('rules', DEFAULT_RULES));
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
 * Run the gate and return the exit code.
 *
 * @returns {number} the exit code
 */
function main() {
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  const workspaceManifestPath = path.join(root, 'Cargo.toml');

  if (!fs.existsSync(workspaceManifestPath)) {
    console.log('SKIPPED — no Cargo workspace');
    return 0;
  }
  const { manifest: workspaceManifest } = readManifest(workspaceManifestPath);
  if (!workspaceManifest.workspace) {
    console.log('SKIPPED — no Cargo workspace');
    return 0;
  }

  const crates = discoverCrates(root);
  const edges = collectEdges(crates, root, workspaceManifest);

  /** @type {import('./lib/boundary-rules.mjs').Finding[]} */
  const findings = [];
  findings.push(...evaluateEdges(edges, crates, rules));
  if (rules.checks?.includeOutsideCrate !== false) {
    findings.push(...checkIncludes(crates, root));
  }
  if (rules.checks?.abiVersionAgreement !== false) {
    findings.push(...checkAbiVersions(crates, root));
  }
  findings.push(...crossCheckWithCargo(root, edges));

  say('Crate boundary gate');
  say('='.repeat(72));
  say(`root:    ${root}`);
  say(`rules:   ${rulesPath}`);
  say(`crates:  ${crates.length}`);
  say(`edges:   ${edges.length}`);
  say('');

  if (findings.length === 0) {
    console.log('No boundary violations found.');
    for (const edge of edges) {
      console.log(`  ok  ${edge.from} -> ${edge.to} (${edge.kind})`);
    }
    return 0;
  }

  console.log(`${findings.length} boundary violation(s) found:`);
  for (const finding of findings) {
    const anchor = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
    console.log(`  [${finding.rule}] ${finding.message}`);
    console.log(`      ${anchor}`);
    console.log(`      ${finding.reason}`);
  }
  return 1;
}

/**
 * Compare the edges the parser found with the edges Cargo reports.
 *
 * A disagreement means the parser misreads a manifest. The gate then does not
 * know the real dependency direction, so the disagreement is a finding.
 *
 * @param {string} root the repository root
 * @param {import('./lib/crate-graph.mjs').Edge[]} edges the edges the parser found
 * @returns {import('./lib/boundary-rules.mjs').Finding[]} the findings
 */
function crossCheckWithCargo(root, edges) {
  /** @type {import('./lib/boundary-rules.mjs').Finding[]} */
  const findings = [];
  const result = spawnSync(
    'cargo',
    ['metadata', '--no-deps', '--format-version', '1', '--offline'],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.error) {
    say('note: cargo metadata is not available, the cross-check was skipped');
    return findings;
  }
  if (result.status !== 0) {
    say('note: cargo metadata failed, the cross-check was skipped');
    return findings;
  }

  /** @type {any} */
  let metadata;
  try {
    metadata = JSON.parse(result.stdout);
  } catch {
    say('note: cargo metadata produced no readable JSON, the cross-check was skipped');
    return findings;
  }

  const packages = metadata.packages ?? [];
  const cargoEdges = new Set();
  for (const pkg of packages) {
    const from = path
      .relative(root, realPath(path.dirname(pkg.manifest_path)))
      .split(path.sep)
      .join('/');
    for (const dependency of pkg.dependencies ?? []) {
      if (!dependency.path) continue;
      const to = path.relative(root, realPath(dependency.path)).split(path.sep).join('/');
      cargoEdges.add(`${from} -> ${to}`);
    }
  }
  const parserEdges = new Set(edges.map((edge) => `${edge.from} -> ${edge.to}`));

  for (const edge of parserEdges) {
    if (cargoEdges.has(edge)) continue;
    findings.push({
      rule: 'R-CARGO-CROSS-CHECK',
      from: edge.split(' -> ')[0],
      to: edge.split(' -> ')[1],
      message: `the gate and cargo disagree about the edge ${edge}, which is not allowed`,
      reason: 'cargo metadata does not report this path dependency',
      file: 'Cargo.toml',
      line: 0,
    });
  }
  for (const edge of cargoEdges) {
    if (parserEdges.has(edge)) continue;
    findings.push({
      rule: 'R-CARGO-CROSS-CHECK',
      from: edge.split(' -> ')[0],
      to: edge.split(' -> ')[1],
      message: `the gate and cargo disagree about the edge ${edge}, which is not allowed`,
      reason: 'the gate did not find this path dependency in the manifest',
      file: 'Cargo.toml',
      line: 0,
    });
  }
  return findings;
}

process.exit(main());
