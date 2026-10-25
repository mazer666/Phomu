/**
 * Crate discovery and dependency extraction for the boundary gate.
 * -------------------------------------------------------------------------
 * WHAT THIS DOES
 *   Finds every crate of the Phomu workspace, derives the *area* a crate
 *   lives in from its path (`core/`, `platform/`, `formats/`, `apps/`,
 *   `tools/`) and extracts the **path dependencies** between those crates.
 *
 * WHY THE MANIFEST IS READ DIRECTLY
 *   `cargo metadata` would also work, but it needs a resolvable workspace,
 *   a `Cargo.lock` and a working toolchain. The gate has to run against an
 *   isolated fixture tree (BUILD-CONTRACT §7.2) and against a repository
 *   whose workspace is still being built. Reading the manifests with the
 *   TOML parser in `./toml.mjs` keeps the gate free of toolchain
 *   dependencies and makes it deterministic.
 *
 *   `cargo metadata` is still used — as a **cross-check** in
 *   `./boundary-rules.mjs` — so that a mistake in the parser cannot make the
 *   gate blind.
 *
 * DEPENDENCY KINDS
 *   A normal, a development and a build dependency are all edges. A crate
 *   that pulls the bridge into its *tests* still links the bridge into the
 *   product's build graph, and the direction rule is about the graph, not
 *   about the artefact that is finally shipped.
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseToml } from './toml.mjs';

/** The areas of the workspace, in the order the architecture lists them. */
export const AREAS = ['core', 'platform', 'formats', 'apps', 'tools'];

/** Directories that never contain a crate of this workspace. */
const IGNORED_DIRECTORIES = new Set([
  'target',
  'node_modules',
  '.git',
  '.next',
  'out',
  'coverage',
  'test-results',
]);

/** The manifest sections that declare dependencies. */
const DEPENDENCY_SECTIONS = [
  'dependencies',
  'dev-dependencies',
  'build-dependencies',
];

/**
 * A crate of the workspace.
 *
 * @typedef {object} Crate
 * @property {string} area the area the crate lives in (`core`, `platform`, …)
 * @property {string} id the area-relative identifier, e.g. `core/phomu-core`
 * @property {string} name the Cargo package name
 * @property {string} dir the absolute directory of the crate
 * @property {string} manifestPath the absolute path of `Cargo.toml`
 * @property {string} manifestRel the manifest path relative to the root
 * @property {Record<string, unknown>} manifest the parsed manifest
 * @property {Map<string, {line: number}>} locations the source line of every key
 */

/**
 * A dependency edge between two crates of the workspace.
 *
 * @typedef {object} Edge
 * @property {string} from the id of the depending crate
 * @property {string} to the id of the depended-upon crate
 * @property {'normal' | 'dev' | 'build'} kind the kind of the dependency
 * @property {string} manifestRel the manifest the edge was declared in
 * @property {number} line the line the dependency was declared on
 * @property {string} declaredAs the key the dependency was declared under
 */

/**
 * Read and parse a `Cargo.toml`.
 *
 * @param {string} manifestPath the absolute path of the manifest
 * @returns {{manifest: Record<string, unknown>, locations: Map<string, {line: number}>}}
 * @throws {Error} when the manifest cannot be read or parsed
 */
export function readManifest(manifestPath) {
  const text = fs.readFileSync(manifestPath, 'utf8');
  const { value, locations } = parseToml(text);
  return { manifest: value, locations };
}

/**
 * Find every crate below the given areas.
 *
 * @param {string} root the repository root
 * @returns {Crate[]} the crates, sorted by their id
 */
export function discoverCrates(root) {
  /** @type {Crate[]} */
  const crates = [];
  for (const area of AREAS) {
    const areaDir = path.join(root, area);
    if (!isDirectory(areaDir)) continue;
    collectCratesIn(areaDir, area, root, crates);
  }
  crates.sort((left, right) => left.id.localeCompare(right.id));
  return crates;
}

/**
 * Recursively collect the crates below one directory.
 *
 * @param {string} dir the directory to scan
 * @param {string} area the area the directory belongs to
 * @param {string} root the repository root
 * @param {Crate[]} crates the accumulator
 */
function collectCratesIn(dir, area, root, crates) {
  const manifestPath = path.join(dir, 'Cargo.toml');
  if (fs.existsSync(manifestPath)) {
    const { manifest, locations } = readManifest(manifestPath);
    const packageTable = manifest.package ?? {};
    const id = path.relative(root, dir).split(path.sep).join('/');
    crates.push({
      area,
      id,
      name:
      typeof packageTable.name === 'string'
        ? packageTable.name
        : path.basename(dir),
      dir: realPath(dir),
      manifestPath: realPath(manifestPath),
      manifestRel: path.relative(root, manifestPath).split(path.sep).join('/'),
      manifest,
      locations,
    });
    // A crate directory does not contain another crate.
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
    collectCratesIn(path.join(dir, entry.name), area, root, crates);
  }
}

/**
 * Extract the path dependencies between the crates of the workspace.
 *
 * @param {Crate[]} crates the crates of the workspace
 * @param {string} root the repository root
 * @param {Record<string, unknown>} workspaceManifest the parsed root manifest
 * @returns {Edge[]} the edges between the workspace crates
 */
export function collectEdges(crates, root, workspaceManifest) {
  const byDirectory = new Map(crates.map((crate) => [realPath(crate.dir), crate]));
  const workspaceDependencies = workspaceManifest?.workspace?.dependencies ?? {};
  /** @type {Edge[]} */
  const edges = [];

  for (const crate of crates) {
    for (const { section, kind, entries } of dependencySections(crate.manifest)) {
      for (const [name, spec] of Object.entries(entries ?? {})) {
        const resolved = resolveDependency(spec, name, crate, root, workspaceDependencies);
        if (!resolved) continue;
        const target = byDirectory.get(realPath(resolved.path));
        if (!target) continue;
        edges.push({
          from: crate.id,
          to: target.id,
          kind,
          manifestRel: crate.manifestRel,
          line: crate.locations.get(`${section}.${name}`)?.line ?? 0,
          declaredAs: name,
        });
      }
    }
  }
  edges.sort(
    (left, right) =>
      left.from.localeCompare(right.from) ||
      left.to.localeCompare(right.to) ||
      left.kind.localeCompare(right.kind),
  );
  return edges;
}

/**
 * List every dependency section of a manifest, including the target-specific
 * ones (`[target.'cfg(unix)'.dependencies]`).
 *
 * @param {Record<string, unknown>} manifest the parsed manifest
 * @returns {{section: string, kind: 'normal' | 'dev' | 'build', entries: Record<string, unknown>}[]}
 */
function dependencySections(manifest) {
  /** @type {{section: string, kind: 'normal' | 'dev' | 'build', entries: Record<string, unknown>}[]} */
  const sections = [];
  for (const section of DEPENDENCY_SECTIONS) {
    sections.push({
      section,
      kind: kindOfSection(section),
      entries: manifest[section] ?? {},
    });
  }
  const targets = manifest.target ?? {};
  for (const [targetName, targetTable] of Object.entries(targets)) {
    for (const section of DEPENDENCY_SECTIONS) {
      const entries = targetTable?.[section];
      if (!entries) continue;
      sections.push({
        section: `target.${targetName}.${section}`,
        kind: kindOfSection(section),
        entries,
      });
    }
  }
  return sections;
}

/**
 * The kind of a dependency, derived from the section it was declared in.
 *
 * @param {string} section the manifest section
 * @returns {'normal' | 'dev' | 'build'} the kind
 */
function kindOfSection(section) {
  if (section === 'dev-dependencies') return 'dev';
  if (section === 'build-dependencies') return 'build';
  return 'normal';
}

/**
 * Resolve a dependency specification to the path of the crate it points at.
 *
 * @param {unknown} spec the dependency specification
 * @param {string} name the key the dependency was declared under
 * @param {Crate} crate the declaring crate
 * @param {string} root the repository root
 * @param {Record<string, unknown>} workspaceDependencies the workspace table
 * @returns {{path: string} | null} the path, or null for a registry dependency
 */
function resolveDependency(spec, name, crate, root, workspaceDependencies) {
  if (typeof spec === 'string') {
    // A registry dependency: it cannot point at a crate of this workspace.
    return null;
  }
  if (typeof spec !== 'object' || spec === null) return null;

  const record = /** @type {Record<string, unknown>} */ (spec);
  if (record.workspace === true) {
    const inherited = workspaceDependencies?.[name];
    if (typeof inherited !== 'object' || inherited === null) return null;
    const inheritedPath = /** @type {Record<string, unknown>} */ (inherited).path;
    if (typeof inheritedPath !== 'string') return null;
    // A workspace dependency path is relative to the workspace root.
    return { path: path.resolve(root, inheritedPath) };
  }
  if (typeof record.path === 'string') {
    return { path: path.resolve(crate.dir, record.path) };
  }
  return null;
}

/**
 * The canonical path of a file or directory.
 *
 * WHY: the repository is reachable under more than one path (a bind mount and
 * a symlink). Cargo reports the canonical path, so the gate has to compare
 * canonical paths as well — otherwise every edge looks like a disagreement.
 *
 * @param {string} target the path to canonicalise
 * @returns {string} the canonical path
 */
export function realPath(target) {
  try {
    return fs.realpathSync(target);
  } catch {
    return path.resolve(target);
  }
}

/**
 * Whether a path exists and is a directory.
 *
 * @param {string} target the path to test
 * @returns {boolean} true when the path is a directory
 */
function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}
