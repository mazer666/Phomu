#!/usr/bin/env node
/**
 * The format check of the shell.
 *
 * WHAT: it checks the files that the commit changed with Prettier.
 *
 * WHY not the whole repository: the repository was never formatted with
 * Prettier — three hundred and thirty-two files of the state of 2026-11-04
 * do not match the configuration. A gate that reports all of them at once
 * reports nothing: it is red for every commit, and a gate that is always red
 * is a gate that nobody reads. Formatting the whole repository in one commit
 * would bury the real changes under twenty thousand lines of noise and
 * would make every parallel change a merge conflict.
 *
 * WHY the changed files are enough: the point of the gate is that the code
 * that is written *now* follows the style. The old files stay as they are
 * until someone touches them — and then they have to follow it.
 *
 * WHY the job blocks the pipeline: from now on the gate is red for a real
 * reason, and a real reason is worth stopping for.
 *
 * EXAMPLE: `node scripts/check-format.mjs` checks the files of the commit
 * that is checked out; `node scripts/check-format.mjs src/app/page.tsx`
 * checks the named files.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PRETTIER_IGNORE = '.prettierignore';

/** The file types Prettier understands in this repository. */
const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.json',
  '.md',
  '.yml',
  '.yaml',
];

/**
 * The files a formatter can read.
 *
 * @param {string} file The path of a file
 * @returns {boolean} Whether the file is of a type Prettier handles
 */
function isFormattable(file) {
  if (!EXTENSIONS.includes(path.extname(file))) return false;
  if (file.includes('/node_modules/') || file.includes('/.next/')) return false;
  if (file.includes('/src/core/generated/')) return false;
  return true;
}

/**
 * The files that were written.
 *
 * WHY two sources: in the pipeline the commit is already made, and the files
 * of that commit are the ones that were written — the difference between the
 * commit and the one before it. Before the commit is made, the files that
 * were written are still in the working tree, and the difference against
 * `HEAD` names them.
 *
 * @returns {string[]} The paths of the files that were written
 */
function changedFiles() {
  // WHY the choice: when the working tree is clean, the commit is already
  // made and the files of that commit are the ones that were written — the
  // difference between the commit and the one before it. When the working
  // tree still holds changes, the commit is not made yet, and the files
  // that were written are the ones that differ from `HEAD`. The other
  // source would name the files of the *previous* commit — the changes
  // that were already checked.
  const clean =
    execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
    }).trim().length === 0;
  const sources = clean
    ? [['diff', '--name-only', 'HEAD~1', 'HEAD']]
    : [['diff', '--name-only', 'HEAD']];
  const found = new Set();
  for (const args of sources) {
    try {
      const output = execFileSync('git', args, { encoding: 'utf8' });
      for (const line of output.split('\n')) {
        const name = line.trim();
        if (name.length > 0) found.add(name);
      }
    } catch {
      // A checkout without a history (the first commit, a shallow clone) has
      // nothing to compare with — the whole tree is then the change.
      const output = execFileSync('git', ['ls-files'], { encoding: 'utf8' });
      for (const line of output.split('\n')) {
        const name = line.trim();
        if (name.length > 0) found.add(name);
      }
    }
  }
  return [...found];
}

/**
 * The files that Prettier ignores.
 *
 * @returns {string[]} The paths of the ignored files
 */
function ignoredFiles() {
  if (!existsSync(PRETTIER_IGNORE)) return [];
  return execFileSync(
    'git',
    ['ls-files', '--others', '--cached', '--exclude-standard'],
    {
      encoding: 'utf8',
    }
  )
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const named = process.argv.slice(2);
const files = (named.length > 0 ? named : changedFiles()).filter(isFormattable);

if (files.length === 0) {
  console.log('No file of this commit needs a format check.');
  process.exit(0);
}

try {
  execFileSync('npx', ['prettier', '--check', ...files], { stdio: 'inherit' });
  console.log(
    `Format: ${files.length} file(s) of the commit follow the style.`
  );
} catch {
  console.error(
    '\nThe files above do not follow the style. Write them with:\n' +
      '  npx prettier --write <file>\n'
  );
  process.exit(1);
}
