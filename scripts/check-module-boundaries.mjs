#!/usr/bin/env node
/**
 * Quality gate: module boundaries (ADR-0001, ARCHITECTURE.md §2)
 * -------------------------------------------------------------------------
 * WHAT IT CHECKS
 *   The dependency direction of the TypeScript shell. The rules live in
 *   `scripts/module-boundaries.rules.json` — the boundary is data, not
 *   code — and the known violations live in
 *   `scripts/module-boundaries.exceptions.json`.
 *
 *   The rules of the table:
 *     MB-RAW-CATALOGUE  No component and no page may import the raw song
 *                       catalogue (`src/data/songs`). The raw catalogue
 *                       carries the answers of the round and the whole
 *                       catalogue at once; a component that imports it
 *                       pulls the answer key into the browser bundle
 *                       (QA-SPO-001) and couples the presentation to the
 *                       storage format of the catalogue (QA-ARC-006).
 *     MB-CONFIG-UI      `src/config` must not import from `src/components`.
 *     MB-UTILS-STORE    `src/utils` must not import from `src/stores`.
 *
 *   The narrow interface of the catalogue is `src/data/catalogue.ts`.
 *
 * HOW IT READS THE IMPORTS
 *   The gate parses the import and export statements of every `.ts` and
 *   `.tsx` file under `src/`. The comments are removed before the scan, so
 *   that a documented example in a doc comment is not read as an import.
 *   A specifier is resolved against the alias table of the rule file
 *   (`@/` -> `src/`) or against the directory of the importing file.
 *   Everything else is an external package and is ignored.
 *
 *   A module that **re-exports** a target is a target as well: the gate
 *   computes that closure itself, so a proxy barrel cannot be used to
 *   smuggle the catalogue into a component.
 *
 * THE THREE CHANNELS
 *   1. A violation that is not recorded          ->  error, exit code 1.
 *   2. A recorded violation that grew             ->  error, exit code 1.
 *   3. A recorded violation that shrank or is gone ->  warning, and the
 *      exception table is updated downward automatically.
 *
 * OPTIONS
 *   --root=<path>        check a different tree (the isolated proof)
 *   --rules=<path>       check against a different rule table
 *   --exceptions=<path>  check against a different exception table
 *   --no-update          never write the exception table back
 *   --quiet              print only the findings and the summary
 *
 * EXAMPLE
 *   node scripts/check-module-boundaries.mjs
 *   node scripts/check-module-boundaries.mjs --root=scripts/fixtures/module-boundaries/ok
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_RULES = path.join(SCRIPT_DIR, 'module-boundaries.rules.json');
const DEFAULT_EXCEPTIONS = path.join(SCRIPT_DIR, 'module-boundaries.exceptions.json');

/** The extensions of the files the gate reads. */
const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

/** Directories that are not traversed. */
const IGNORED_DIRS = new Set(['node_modules', '.next', 'coverage', 'out', '.git']);

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

/**
 * Collect the source files of a directory.
 *
 * @param {string} dir the absolute directory
 * @param {string[]} [out] the collected files
 * @returns {string[]} the collected files
 */
function collectSourceFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      collectSourceFiles(full, out);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Remove the comments of a file, keeping the line numbers intact.
 *
 * WHY: the gate must not read a documented example in a doc comment as an
 * import. The strings are kept, so that a specifier inside a string is
 * still found where it belongs.
 *
 * @param {string} content the file content
 * @returns {string} the content without the comments
 */
export function stripComments(content) {
  let out = '';
  let index = 0;
  const length = content.length;
  /** @type {'code'|'line'|'block'|'single'|'double'|'template'} */
  let state = 'code';
  while (index < length) {
    const character = content[index];
    const next = content[index + 1];
    if (state === 'code') {
      if (character === '/' && next === '/') {
        state = 'line';
        out += '  ';
        index += 2;
        continue;
      }
      if (character === '/' && next === '*') {
        state = 'block';
        out += '  ';
        index += 2;
        continue;
      }
      if (character === "'") state = 'single';
      else if (character === '"') state = 'double';
      else if (character === '`') state = 'template';
      out += character;
      index += 1;
      continue;
    }
    if (state === 'line') {
      out += character === '\n' ? '\n' : ' ';
      if (character === '\n') state = 'code';
      index += 1;
      continue;
    }
    if (state === 'block') {
      if (character === '*' && next === '/') {
        state = 'code';
        out += '  ';
        index += 2;
        continue;
      }
      out += character === '\n' ? '\n' : ' ';
      index += 1;
      continue;
    }
    if (state === 'single' || state === 'double') {
      if (character === '\\') {
        out += '  ';
        index += 2;
        continue;
      }
      if ((state === 'single' && character === "'") || (state === 'double' && character === '"')) {
        state = 'code';
      }
      out += character;
      index += 1;
      continue;
    }
    if (character === '\\') {
      out += '  ';
      index += 2;
      continue;
    }
    if (character === '`') state = 'code';
    out += character;
    index += 1;
  }
  return out;
}

/**
 * The static import and export statements of a file.
 *
 * @param {string} content the file content without the comments
 * @returns {{specifier: string, line: number, kind: 'import'|'reexport'}[]} the statements
 */
export function readImports(content) {
  const statements = [];
  const pattern =
    /(?:^|[\n;])[ \t]*(import|export)\s+(?:type\s+)?(?:[^'";]*?\bfrom\s*)?(['"])([^'"]+)\2/g;
  let match = pattern.exec(content);
  while (match !== null) {
    const specifier = match[3];
    const kind = match[1] === 'export' ? 'reexport' : 'import';
    // The position of the opening quote of the specifier — the match itself
    // may start at the semicolon or at the newline in front of the statement.
    const quoteIndex = match.index + match[0].length - specifier.length - 1;
    const line = content.slice(0, quoteIndex).split('\n').length;
    statements.push({ specifier, line, kind });
    match = pattern.exec(content);
  }
  return statements;
}

/**
 * Resolve a specifier to a module path of the repository.
 *
 * @param {string} specifier the specifier of the import
 * @param {string} fromFile the file that holds the import, relative to the root
 * @param {Record<string, string>} alias the alias table of the rule file
 * @returns {string|null} the module path, or null for an external package
 */
export function resolveSpecifier(specifier, fromFile, alias) {
  for (const [prefix, target] of Object.entries(alias)) {
    if (specifier.startsWith(prefix)) {
      return normalizePath(`${target}${specifier.slice(prefix.length)}`);
    }
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const directory = path.posix.dirname(fromFile);
    return normalizePath(path.posix.join(directory, specifier));
  }
  return null;
}

/**
 * Normalise a path: no leading `./`, no `..`.
 *
 * @param {string} value the path
 * @returns {string} the normalised path
 */
function normalizePath(value) {
  const segments = [];
  for (const segment of value.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

/**
 * The file of a module, if the module exists.
 *
 * @param {string} root the root of the repository
 * @param {string} modulePath the module path
 * @returns {string|null} the relative path of the file
 */
function moduleFile(root, modulePath) {
  const candidates = [
    `${modulePath}.ts`,
    `${modulePath}.tsx`,
    `${modulePath}/index.ts`,
    `${modulePath}/index.tsx`,
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(root, candidate))) return candidate;
  }
  return null;
}

/**
 * Whether a module path is inside a target.
 *
 * @param {string} modulePath the module path
 * @param {string} target the target of the rule
 * @returns {boolean} true when the module is the target or below it
 */
function isInside(modulePath, target) {
  return modulePath === target || modulePath.startsWith(`${target}/`);
}

/**
 * Match a path against a glob.
 *
 * @param {string} value the path
 * @param {string} pattern the glob
 * @returns {boolean} true when the path matches
 */
export function matchesGlob(value, pattern) {
  const expression = pattern
    .split('/')
    .map((segment) => {
      if (segment === '**') return '.*';
      if (segment === '*') return '[^/]*';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${expression}$`).test(value);
}

/**
 * The exception table of a run.
 *
 * WHY: the exception table belongs to the repository: it records the
 * violations of the tree of the repository. A tree that is checked in
 * isolation has its own violations and therefore its own table — the table
 * of the repository would report every violation of the repository as one
 * that is gone.
 *
 * @param {string} root the tree that is checked
 * @param {string|undefined} exceptionsOption the table the caller named
 * @returns {{hasTable: boolean, exceptionsPath: string|undefined}} the table of the run
 */
function resolveTable(root, exceptionsOption) {
  const isRepository = path.resolve(root) === REPO_ROOT;
  const hasTable = exceptionsOption !== undefined || isRepository;
  return {
    hasTable,
    exceptionsPath: hasTable
      ? path.resolve(exceptionsOption ?? DEFAULT_EXCEPTIONS)
      : undefined,
  };
}

/**
 * Run the gate.
 *
 * @param {{
 *   root?: string,
 *   rulesPath?: string,
 *   exceptionsPath?: string,
 *   update?: boolean,
 * }} [options] the options of the run
 * @returns {{
 *   files: number,
 *   imports: number,
 *   findings: {rule: string, file: string, line: number, message: string, reason: string}[],
 *   warnings: {rule: string, file: string, line: number, message: string}[],
 *   errors: {rule: string, file: string, line: number, message: string}[],
 *   notes: string[],
 * }} the result of the gate
 */
export function runModuleBoundaryCheck(options = {}) {
  const root = path.resolve(options.root ?? REPO_ROOT);
  const rulesPath = path.resolve(options.rulesPath ?? DEFAULT_RULES);
  const update = options.update !== false;

  const { hasTable, exceptionsPath } = resolveTable(root, options.exceptionsPath);

  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  const alias = rules.alias ?? { '@/': 'src/' };

  /** @type {Record<string, {rule: string, imports: number, reason: string}>} */
  const exceptions = {};
  if (hasTable && exceptionsPath && fs.existsSync(exceptionsPath)) {
    for (const [key, value] of Object.entries(
      JSON.parse(fs.readFileSync(exceptionsPath, 'utf8')).exceptions ?? {}
    )) {
      exceptions[key] = value;
    }
  }

  const files = collectSourceFiles(path.join(root, 'src')).sort();
  const findings = [];
  const warnings = [];
  const errors = [];
  const notes = [];

  let importCount = 0;

  /**
   * The statements of every file, with the resolved module path.
   *
   * @type {Map<string, {specifier: string, line: number, kind: string, module: string|null}[]>}
   */
  const statementsByFile = new Map();

  for (const absolute of files) {
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const content = fs.readFileSync(absolute, 'utf8');
    const statements = readImports(stripComments(content)).map((statement) => ({
      ...statement,
      module: resolveSpecifier(statement.specifier, relative, alias),
    }));
    statementsByFile.set(relative, statements);
    importCount += statements.length;
  }

  // The closure of the re-exports: a module that re-exports a target is a
  // target as well.
  for (const rule of rules.rules) {
    const targets = new Set(rule.targets);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [file, statements] of statementsByFile) {
        const modulePath = file.replace(/\/index\.(ts|tsx)$/, '').replace(/\.(ts|tsx)$/, '');
        if (targets.has(modulePath)) continue;
        for (const statement of statements) {
          if (statement.kind !== 'reexport') continue;
          if (statement.module && targets.has(statement.module)) {
            targets.add(modulePath);
            changed = true;
            break;
          }
        }
      }
    }
    rule.resolvedTargets = targets;
  }

  // The violations of the current tree.
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const rule of rules.rules) {
    for (const [file, statements] of statementsByFile) {
      const applies = rule.sources.some((pattern) => matchesGlob(file, pattern));
      if (!applies) continue;
      for (const statement of statements) {
        if (!statement.module) continue;
        const hits = [...rule.resolvedTargets].some((target) =>
          isInside(statement.module, target)
        );
        if (!hits) continue;
        const key = `${file}#${rule.id}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        findings.push({
          rule: rule.id,
          file,
          line: statement.line,
          message: `${file} imports ${statement.specifier}, which is not allowed`,
          reason: `${rule.description} ${rule.reason}`,
          module: statement.module,
          specifier: statement.specifier,
        });
      }
    }
  }

  // The comparison with the recorded violations.
  for (const finding of findings) {
    const key = `${finding.file}#${finding.rule}`;
    const record = exceptions[key];
    if (!record) {
      errors.push({
        rule: finding.rule,
        file: finding.file,
        line: finding.line,
        message: finding.message,
      });
      continue;
    }
    if (counts.get(key) > record.imports) {
      errors.push({
        rule: finding.rule,
        file: finding.file,
        line: finding.line,
        message:
          `${finding.message} — the recorded state is ${record.imports} import(s), ` +
          `the file has ${counts.get(key)}`,
      });
      continue;
    }
    warnings.push({
      rule: finding.rule,
      file: finding.file,
      line: finding.line,
      message:
        `${finding.message} — recorded violation (${record.imports} import(s)): ${record.reason}`,
    });
  }

  // The recorded violations that are gone: the table is updated downward.
  let changed = false;
  for (const [key, record] of Object.entries(exceptions)) {
    const count = counts.get(key) ?? 0;
    if (count === 0) {
      delete exceptions[key];
      changed = true;
      notes.push(
        `${key.split('#')[0]}: the recorded violation is gone — the exception was removed.`
      );
      continue;
    }
    if (count < record.imports) {
      record.imports = count;
      changed = true;
      notes.push(
        `${key.split('#')[0]}: the recorded state was updated downward to ${count} import(s).`
      );
    }
  }

  if (changed && update && hasTable && exceptionsPath) {
    writeExceptions(exceptionsPath, exceptions);
  }

  return { files: files.length, imports: importCount, findings, warnings, errors, notes };
}

/**
 * Write the exception table back.
 *
 * @param {string} exceptionsPath the path of the table
 * @param {Record<string, {rule: string, imports: number, reason: string}>} exceptions the recorded violations
 * @returns {boolean} true when the table was written
 */
function writeExceptions(exceptionsPath, exceptions) {
  /** @type {Record<string, {rule: string, imports: number, reason: string}>} */
  const sorted = {};
  for (const key of Object.keys(exceptions).sort()) {
    sorted[key] = exceptions[key];
  }
  const document = {
    $comment: [
      'The recorded violations of the module-boundary gate.',
      'Source of truth: docs/adr/ADR-0001 (layers and dependency direction) and',
      'docs/qa/QA-09-REMEDIATION-BACKLOG.md item 2.4.',
      'The gate scripts/check-module-boundaries.mjs reads this table and rewrites',
      'it when a violation is gone. A violation that is not recorded here is an',
      'error.',
      'Remove an entry only together with the change that removes the violation.',
    ],
    schemaVersion: 1,
    exceptions: sorted,
  };
  try {
    fs.writeFileSync(exceptionsPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

// Only run when the file was started directly as a CLI.
const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const root = path.resolve(option('root', REPO_ROOT));
  const rulesPath = path.resolve(option('rules', DEFAULT_RULES));
  const exceptionsOption = option('exceptions', undefined);
  const quiet = process.argv.includes('--quiet');
  const update = !process.argv.includes('--no-update');

  /**
   * Print a line unless the gate runs in the quiet mode.
   *
   * @param {string} text the line to print
   */
  const say = (text) => {
    if (!quiet) console.log(text);
  };

  const result = runModuleBoundaryCheck({ root, rulesPath, exceptionsPath: exceptionsOption, update });
  const table = resolveTable(root, exceptionsOption);

  say('Module boundary gate');
  say('='.repeat(72));
  say(`root:       ${root}`);
  say(`rules:      ${rulesPath}`);
  say(
    `exceptions: ${table.exceptionsPath ?? 'none — the tree is checked in isolation'}`
  );
  say(`files:      ${result.files}`);
  say(`imports:    ${result.imports}`);
  say('');

  if (result.notes.length > 0) {
    say(`Recorded state updates: ${result.notes.length}`);
    for (const note of result.notes) {
      say(`  ${note}`);
    }
    say('');
  }

  if (result.warnings.length > 0) {
    say(`⚠️  ${result.warnings.length} recorded violation(s):`);
    for (const warning of result.warnings) {
      say(`  [${warning.rule}] ${warning.message}`);
      say(`      ${warning.file}:${warning.line}`);
    }
    say('');
  }

  if (result.errors.length > 0) {
    console.log(`${result.errors.length} boundary violation(s) found:`);
    for (const error of result.errors) {
      console.log(`  [${error.rule}] ${error.message}`);
      console.log(`      ${error.file}:${error.line}`);
      const finding = result.findings.find(
        (candidate) => candidate.file === error.file && candidate.rule === error.rule
      );
      if (finding) console.log(`      ${finding.reason}`);
    }
    process.exit(1);
  }

  console.log('No boundary violations found.');
  process.exit(0);
}
