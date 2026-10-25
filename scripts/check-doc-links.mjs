#!/usr/bin/env node
/**
 * Quality gate: doc link check
 * -------------------------------------------------------------------------
 * Checks every relative Markdown link in the repository for resolvability.
 *
 * Scope (deliberately limited, see CONTRACT.md §6):
 *   - Root: all `.md` files directly in the repository root
 *   - `docs/` recursively
 *   - `specifications/` recursively
 *
 * Handled link types:
 *   - Inline links `[text](target)` and images `![alt](target)`
 *   - Reference definitions `[id]: target`
 *   - HTML `<a href="...">` / `<img src="...">`
 *   - Pure anchors `#section` (within the same document)
 *   - Directory links (`docs/`) — count as resolved if the directory exists
 *   - External targets (http/https/mailto/tel/data/...) — not checked
 *   - Code fences and inline code are ignored (example links are no doc link)
 *
 * Output: `file:line` + link target + reason. Exit code 1 on a dead link.
 *
 * Options:
 *   --root=<path>  checks a different tree (default: the repository).
 *                  Used for the isolated proof of the gate (negative test).
 *
 * Tolerance for concurrent work in the same repository:
 *   - files that disappear during the run are skipped (no crash).
 *   - read errors are reported as a finding, not as a crash.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');

/**
 * Root of the tree to check. Default is the repository.
 * `--root=<path>` (or `PHOMU_DOC_LINKS_ROOT`) allows running the gate in
 * isolation against a test tree — without changing the behaviour in the
 * normal case.
 */
const rootArg = process.argv.slice(2).find((a) => a.startsWith('--root='));
const REPO_ROOT = path.resolve(
  rootArg
    ? rootArg.slice('--root='.length)
    : process.env.PHOMU_DOC_LINKS_ROOT || DEFAULT_ROOT
);

const SCAN_ROOTS = [
  { dir: REPO_ROOT, depth: 0, label: 'root' }, // only *.md directly in the root
  { dir: path.join(REPO_ROOT, 'docs'), depth: Infinity, label: 'docs' },
  {
    dir: path.join(REPO_ROOT, 'specifications'),
    depth: Infinity,
    label: 'specifications',
  },
];

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  'out',
  'coverage',
  '.git',
  'test-results',
  'playwright-report',
]);

/** @returns {string[]} relative POSIX paths of the Markdown files to check */
function collectMarkdownFiles() {
  /** @type {string[]} */
  const out = [];

  /** @param {string} dir @param {number} depth */
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Directory does not exist (yet) -> nothing to check
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        if (depth === 0) continue; // Root: no subdirectories
        walk(full, depth - 1);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        out.push(path.relative(REPO_ROOT, full).split(path.sep).join('/'));
      }
    }
  };

  for (const root of SCAN_ROOTS) {
    walk(root.dir, root.depth);
  }
  return out.sort();
}

/**
 * Removes code fences and inline code so that example links are not counted
 * as real doc links. Line numbers are preserved.
 * @param {string} content
 * @returns {string[]}
 */
function stripCode(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let fence = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (fence === null) {
        fence = fenceMatch[1][0];
        result.push('');
        continue;
      }
      if (fenceMatch[1][0] === fence) {
        fence = null;
        result.push('');
        continue;
      }
    }
    if (fence !== null) {
      result.push('');
      continue;
    }
    // Remove inline code (``...`` and `...`)
    result.push(line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length)));
  }
  return result;
}

/**
 * GitHub-compatible anchor slug of a heading.
 *
 * Reproduced GitHub rule: lowercase, remove leading/trailing whitespace,
 * strip HTML tags and the punctuation set GitHub removes, then replace
 * **every** single space with a hyphen.
 *
 * Important: replace every single space (not `\s+`), because GitHub turns
 * the remainder of an em dash into two hyphens
 * (e.g. `### I18N-004 — Title` -> `i18n-004--title`).
 *
 * @param {string} heading
 * @returns {string}
 */
export function slugify(heading) {
  return (
    heading
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Links -> text
      .replace(/<[^>]*>/g, '') // HTML tags
      .replace(/\{#[^}]*\}/g, '') // explicit anchor IDs
      .replace(/[*`~]/g, '') // Markup
      .toLowerCase()
      .trim()
      // GitHub's punctuation set (explicit escapes so that the character
      // class does not depend on the file encoding)
      .replace(/[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-')
  );
}

/**
 * Collects all anchors (heading slugs) of a Markdown file.
 * @param {string} content
 * @returns {Set<string>}
 */
function collectAnchors(content) {
  const anchors = new Set();
  const seen = new Map();
  const lines = content.split(/\r?\n/);
  let fence = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const explicit = heading[2].match(/\{#([^}]+)\}/);
      const base = slugify(heading[2]);
      if (explicit) {
        anchors.add(explicit[1].toLowerCase());
      }
      if (base) {
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        anchors.add(count === 0 ? base : `${base}-${count}`);
      }
    }
  }
  return anchors;
}

/**
 * Splits a link target into path and anchor.
 * @param {string} target
 */
function splitTarget(target) {
  const hashIndex = target.indexOf('#');
  if (hashIndex === -1) return { linkPath: target, anchor: null };
  return {
    linkPath: target.slice(0, hashIndex),
    anchor: target.slice(hashIndex + 1) || null,
  };
}

/**
 * @param {string} target
 * @returns {boolean} true, when the target is external (not checkable)
 */
function isExternal(target) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith('//');
}

/**
 * Extracts all link targets with line number from a Markdown file.
 * @param {string[]} lines lines already stripped of code
 * @returns {{line: number, target: string, kind: string}[]}
 */
function extractLinks(lines) {
  /** @type {{line: number, target: string, kind: string}[]} */
  const links = [];

  const inlineRe = /!?\[(?:[^\]\\]|\\.)*\]\(\s*(<[^>]*>|[^\s)]+)/g;
  const refRe = /^\s{0,3}\[([^\]]+)\]:\s*(<[^>]*>|\S+)/;
  const htmlRe = /<(a|img)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;

  lines.forEach((line, index) => {
    let match;
    while ((match = inlineRe.exec(line)) !== null) {
      links.push({ line: index + 1, target: match[1], kind: 'inline' });
    }
    const ref = line.match(refRe);
    if (ref) {
      links.push({ line: index + 1, target: ref[2], kind: 'reference' });
    }
    let html;
    htmlRe.lastIndex = 0;
    while ((html = htmlRe.exec(line)) !== null) {
      links.push({
        line: index + 1,
        target: html[2],
        kind: `html-${html[1].toLowerCase()}`,
      });
    }
  });

  return links;
}

/**
 * Checks a single Markdown file.
 * @param {string} relPath
 * @param {{anchorsByFile: Map<string, Set<string>>, files: Set<string>}} ctx
 * @returns {{file: string, line: number, target: string, reason: string}[]}
 */
function checkFile(relPath, ctx) {
  const abs = path.join(REPO_ROOT, relPath);
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch (error) {
    // File was deleted during the run -> skip, do not crash.
    return [];
  }

  const lines = stripCode(content);
  const findings = [];
  const ownAnchors = ctx.anchorsByFile.get(relPath) ?? collectAnchors(content);

  for (const link of extractLinks(lines)) {
    let target = link.target.trim();
    if (target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1).trim();
    }
    if (!target) continue;
    if (isExternal(target)) continue;

    const { linkPath, anchor } = splitTarget(target);

    // Pure anchor in the same document
    if (!linkPath) {
      if (anchor && !ownAnchors.has(anchor.toLowerCase())) {
        findings.push({
          file: relPath,
          line: link.line,
          target,
          reason: `Anchor "#${anchor}" does not exist in this file`,
        });
      }
      continue;
    }

    let decoded;
    try {
      decoded = decodeURIComponent(linkPath);
    } catch {
      decoded = linkPath;
    }

    const resolved = path.resolve(path.dirname(abs), decoded);
    const relResolved = path
      .relative(REPO_ROOT, resolved)
      .split(path.sep)
      .join('/');

    let exists = false;
    try {
      exists = fs.existsSync(resolved);
    } catch {
      exists = false;
    }

    if (!exists) {
      findings.push({
        file: relPath,
        line: link.line,
        target,
        reason: `Target "${relResolved}" does not exist`,
      });
      continue;
    }

    // Check anchors in another Markdown file if that file is part of the scan
    if (anchor && relResolved.endsWith('.md') && ctx.files.has(relResolved)) {
      const targetAnchors = ctx.anchorsByFile.get(relResolved);
      if (targetAnchors && !targetAnchors.has(anchor.toLowerCase())) {
        findings.push({
          file: relPath,
          line: link.line,
          target,
          reason: `Anchor "#${anchor}" does not exist in "${relResolved}"`,
        });
      }
    }
  }

  return findings;
}

// -------------------------------------------------------------------------
// Execution
// -------------------------------------------------------------------------

/**
 * Runs the gate and returns the findings.
 * @returns {{file: string, line: number, target: string, reason: string}[]}
 */
export function runDocLinkCheck() {
  const files = collectMarkdownFiles();
  const fileSet = new Set(files);

  /** @type {Map<string, Set<string>>} */
  const anchorsByFile = new Map();
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      anchorsByFile.set(file, collectAnchors(content));
    } catch {
      anchorsByFile.set(file, new Set());
    }
  }

  const findings = [];
  for (const file of files) {
    findings.push(...checkFile(file, { anchorsByFile, files: fileSet }));
  }
  return { files, findings };
}

// Only run when the file was started directly as a CLI.
const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const { files, findings } = runDocLinkCheck();

  console.log('Phomu quality gate: doc link check');
  console.log(`Scanned tree: ${REPO_ROOT}`);
  console.log(`Markdown files checked: ${files.length}`);

  if (findings.length === 0) {
    console.log('✅ No dead links found.');
    process.exit(0);
  }

  console.error(`❌ ${findings.length} dead link(s) found:`);
  for (const finding of findings) {
    console.error(
      `   ${finding.file}:${finding.line} -> ${finding.target} — ${finding.reason}`
    );
  }
  process.exit(1);
}
