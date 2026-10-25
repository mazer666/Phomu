/**
 * The rule engine of the crate-boundary gate.
 * -------------------------------------------------------------------------
 * The rules themselves live in `scripts/crate-boundaries.rules.json`, so that
 * the rule table can be read, reviewed and changed without touching code.
 * This module evaluates the rules and produces the findings.
 *
 * A finding always names the concrete edge:
 *
 *     crate core/phomu-core depends on crate platform/phomu-ffi, which is not allowed
 *
 * because a gate whose message says only "boundary violated" sends the reader
 * hunting for the edge instead of showing it.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * A violation of the boundary rules.
 *
 * @typedef {object} Finding
 * @property {string} rule the id of the rule that was violated
 * @property {string} from the depending crate
 * @property {string} to the depended-upon crate
 * @property {string} message the one-line description of the violation
 * @property {string} reason why the edge is forbidden
 * @property {string} file the file the finding is anchored in
 * @property {number} line the line the finding is anchored on
 */

/**
 * Evaluate the boundary rules against the edges of the workspace.
 *
 * @param {import('./crate-graph.mjs').Edge[]} edges the dependency edges
 * @param {import('./crate-graph.mjs').Crate[]} crates the crates of the workspace
 * @param {Record<string, unknown>} rules the parsed rule table
 * @returns {Finding[]} the violations
 */
export function evaluateEdges(edges, crates, rules) {
  /** @type {Finding[]} */
  const findings = [];
  for (const edge of edges) {
    const verdict = checkEdge(edge, crates, rules);
    if (verdict.allowed) continue;
    findings.push({
      rule: verdict.rule,
      from: edge.from,
      to: edge.to,
      message: `crate ${edge.from} depends on crate ${edge.to}, which is not allowed`,
      reason: verdict.reason,
      file: edge.manifestRel,
      line: edge.line,
    });
  }
  return findings;
}

/**
 * Decide whether one edge is allowed.
 *
 * @param {import('./crate-graph.mjs').Edge} edge the edge to judge
 * @param {import('./crate-graph.mjs').Crate[]} crates the crates of the workspace
 * @param {Record<string, unknown>} rules the parsed rule table
 * @returns {{allowed: boolean, rule: string, reason: string}} the verdict
 */
function checkEdge(edge, crates, rules) {
  const crateAllow = /** @type {Record<string, string[]>} */ (rules.crateAllow ?? {});
  const areaAllow = /** @type {Record<string, string[]>} */ (rules.areaAllow ?? {});
  const exceptions = /** @type {Record<string, {allow: string[], reason: string}>} */ (
    rules.exceptions ?? {}
  );

  const from = crates.find((candidate) => candidate.id === edge.from);
  const to = crates.find((candidate) => candidate.id === edge.to);
  if (!from || !to) {
    return { allowed: true, rule: 'R-UNKNOWN-CRATE', reason: 'unknown crate' };
  }

  // A named exception always wins; it is the documented way to bend a rule.
  const exception = exceptions[edge.from];
  if (exception && matchesAny(edge.to, exception.allow)) {
    return { allowed: true, rule: 'R-EXCEPTION', reason: exception.reason };
  }

  const allowed = crateAllow[edge.from] ?? areaAllow[from.area] ?? [];
  if (matchesAny(edge.to, allowed)) {
    return { allowed: true, rule: 'R-ALLOWED', reason: 'the rule table allows this edge' };
  }

  return {
    allowed: false,
    rule: ruleIdFor(from.area, to.area),
    reason: reasonFor(from.area, to.area, edge),
  };
}

/**
 * Whether a target matches one of the patterns of an allow list.
 *
 * @param {string} target the id of the depended-upon crate
 * @param {string[]} patterns the allow list
 * @returns {boolean} true when the target is allowed
 */
function matchesAny(target, patterns) {
  return patterns.some((pattern) => matches(target, pattern));
}

/**
 * Whether a target matches one pattern.
 *
 * @param {string} target the id of the depended-upon crate
 * @param {string} pattern the pattern: an exact id, `<area>/*` or `*`
 * @returns {boolean} true when the target matches
 */
function matches(target, pattern) {
  if (pattern === '*') return true;
  if (pattern.endsWith('/*')) {
    const area = pattern.slice(0, -2);
    return target.startsWith(`${area}/`);
  }
  return target === pattern;
}

/**
 * The id of the rule that governs an area pair.
 *
 * @param {string} fromArea the area of the depending crate
 * @param {string} toArea the area of the depended-upon crate
 * @returns {string} the rule id
 */
function ruleIdFor(fromArea, toArea) {
  if (fromArea === toArea) return `R-${fromArea.toUpperCase()}-INTERNAL`;
  return `R-${fromArea.toUpperCase()}-TO-${toArea.toUpperCase()}`;
}

/**
 * The human-readable reason why an edge is forbidden.
 *
 * @param {string} fromArea the area of the depending crate
 * @param {string} toArea the area of the depended-upon crate
 * @param {import('./crate-graph.mjs').Edge} edge the edge
 * @returns {string} the reason
 */
function reasonFor(fromArea, toArea, edge) {
  if (fromArea === 'core' && toArea === 'core') {
    return (
      `the rule table lists no edge from ${edge.from} to ${edge.to}; ` +
      'a core crate may only depend on the core crates named in ' +
      'scripts/crate-boundaries.rules.json'
    );
  }
  if (fromArea === 'core') {
    return `a crate in core/ must not depend on a crate in ${toArea}/ (BUILD-CONTRACT §1.1)`;
  }
  if (fromArea === 'formats') {
    return `a crate in formats/ must not depend on a crate outside formats/ (BUILD-CONTRACT §1.1)`;
  }
  if (fromArea === 'tools' && toArea !== 'core' && toArea !== 'formats') {
    return `a tool is build-time code and must not depend on a crate in ${toArea}/ (BUILD-CONTRACT §1.1)`;
  }
  if (fromArea === 'apps' && toArea === 'core') {
    return 'a shell reaches the core through the bridge and not through a direct dependency (BUILD-CONTRACT §1.1)';
  }
  if (fromArea === 'apps' && toArea === 'formats') {
    return 'a shell must not depend on formats/ directly (BUILD-CONTRACT §1.1)';
  }
  if (fromArea === 'apps') {
    return `a shell must not depend on a crate in ${toArea}/ (BUILD-CONTRACT §1.1)`;
  }
  return `the rule table lists no edge from ${edge.from} to ${edge.to}`;
}

/**
 * Find `include!` calls that reach outside the crate directory.
 *
 * The rule exists because `include!("../../other-crate/src/secret.rs")` is a
 * path into another crate that Cargo never sees. The dependency graph stays
 * clean while the code does not.
 *
 * @param {import('./crate-graph.mjs').Crate[]} crates the crates of the workspace
 * @param {string} root the repository root, used for the file anchor
 * @returns {Finding[]} the violations
 */
export function checkIncludes(crates, root) {
  /** @type {Finding[]} */
  const findings = [];
  for (const crate of crates) {
    for (const file of rustFilesOf(crate.dir)) {
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        const match = /include!\s*\(\s*"([^"]+)"\s*\)/.exec(line);
        if (!match) return;
        const target = path.resolve(path.dirname(file), match[1]);
        const relative = path.relative(crate.dir, target);
        if (!relative.startsWith('..') && !path.isAbsolute(relative)) return;
        findings.push({
          rule: 'R-INCLUDE-OUTSIDE-CRATE',
          from: crate.id,
          to: path.relative(path.dirname(crate.dir), target).split(path.sep).join('/'),
          message: `crate ${crate.id} includes a file outside its own directory, which is not allowed`,
          reason: `include!("${match[1]}") bypasses the Cargo dependency graph`,
          file: path.relative(root, file).split(path.sep).join('/'),
          line: index + 1,
        });
      });
    }
  }
  return findings;
}

/**
 * List the Rust source files of a crate directory.
 *
 * @param {string} dir the crate directory
 * @returns {string[]} the absolute paths of the source files
 */
function rustFilesOf(dir) {
  /** @type {string[]} */
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'target' || entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.rs')) {
        files.push(full);
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return files;
}

/**
 * Read the ABI version a Rust source declares.
 *
 * The declaration has one shape in every bridge crate:
 *
 *     pub const ABI_VERSION: AbiVersion = AbiVersion::new(1, 0, 0);
 *
 * @param {string} file the Rust source file
 * @returns {{major: number, minor: number, patch: number} | null} the version
 */
export function readAbiVersionFromSource(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const structured =
    /ABI_VERSION\s*:\s*AbiVersion\s*=\s*AbiVersion::new\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(
      text,
    );
  if (structured) {
    return {
      major: Number(structured[1]),
      minor: Number(structured[2]),
      patch: Number(structured[3]),
    };
  }
  const tuple =
    /ABI_VERSION\s*:\s*\(\s*u16\s*,\s*u16\s*,\s*u16\s*\)\s*=\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(
      text,
    );
  if (tuple) {
    return { major: Number(tuple[1]), minor: Number(tuple[2]), patch: Number(tuple[3]) };
  }
  // The shape of the base: three constants, one per part of the version.
  const parts = ['MAJOR', 'MINOR', 'PATCH'].map((part) => {
    const match = new RegExp(`ABI_VERSION_${part}\\s*:\\s*u16\\s*=\\s*(\\d+)`).exec(text);
    return match ? Number(match[1]) : null;
  });
  if (parts.every((part) => part !== null)) {
    return { major: parts[0], minor: parts[1], patch: parts[2] };
  }
  return null;
}

/**
 * Read the ABI version the generated C header declares.
 *
 * @param {string} file the header file
 * @returns {{major: number, minor: number, patch: number} | null} the version
 */
export function readAbiVersionFromHeader(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const read = (name) => {
    const match = new RegExp(`#define\\s+${name}\\s+(\\d+)`).exec(text);
    return match ? Number(match[1]) : null;
  };
  const major = read('PHOMU_ABI_VERSION_MAJOR');
  const minor = read('PHOMU_ABI_VERSION_MINOR');
  const patch = read('PHOMU_ABI_VERSION_PATCH');
  if (major === null || minor === null || patch === null) return null;
  return { major, minor, patch };
}

/**
 * Check that every place that carries the ABI version carries the same one.
 *
 * The places are the Rust sources of the bridges and the generated C header.
 * A stale header is a build failure, not a runtime surprise
 * (BUILD-CONTRACT §3.1).
 *
 * @param {import('./crate-graph.mjs').Crate[]} crates the crates of the workspace
 * @param {string} root the repository root
 * @returns {Finding[]} the violations
 */
export function checkAbiVersions(crates, root) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {{where: string, file: string, version: {major: number, minor: number, patch: number}}[]} */
  const declarations = [];

  for (const crate of crates) {
    const candidates = [
      path.join(crate.dir, 'src', 'abi.rs'),
      path.join(crate.dir, 'src', 'lib.rs'),
    ];
    for (const candidate of candidates) {
      const version = readAbiVersionFromSource(candidate);
      if (!version) continue;
      declarations.push({
        where: crate.id,
        file: path.relative(root, candidate).split(path.sep).join('/'),
        version,
      });
      break;
    }
  }

  const headerPath = path.join(root, 'platform', 'phomu-capi', 'include', 'phomu.h');
  const headerVersion = readAbiVersionFromHeader(headerPath);
  if (headerVersion) {
    declarations.push({
      where: 'platform/phomu-capi/include/phomu.h',
      file: path.relative(root, headerPath).split(path.sep).join('/'),
      version: headerVersion,
    });
  }

  if (declarations.length === 0) return findings;

  const canonical = declarations[0];
  for (const declaration of declarations.slice(1)) {
    if (sameVersion(canonical.version, declaration.version)) continue;
    findings.push({
      rule: 'R-ABI-VERSION-MISMATCH',
      from: canonical.where,
      to: declaration.where,
      message: `the ABI version of ${declaration.where} does not match the ABI version of ${canonical.where}, which is not allowed`,
      reason: `${formatVersion(canonical.version)} against ${formatVersion(declaration.version)}`,
      file: declaration.file,
      line: 0,
    });
  }
  return findings;
}

/**
 * Whether two ABI versions are equal.
 *
 * @param {{major: number, minor: number, patch: number}} left the first version
 * @param {{major: number, minor: number, patch: number}} right the second version
 * @returns {boolean} true when the versions are equal
 */
function sameVersion(left, right) {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
}

/**
 * Format an ABI version.
 *
 * @param {{major: number, minor: number, patch: number}} version the version
 * @returns {string} the formatted version
 */
function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}
