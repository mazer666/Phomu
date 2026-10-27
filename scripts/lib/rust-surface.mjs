/**
 * The Rust sources of the bridge-surface gate.
 * -------------------------------------------------------------------------
 * WHAT THIS MODULE DOES
 *   It reads the Rust of the repository without a Rust toolchain:
 *
 *   1. the **session** — the `pub fn` of `impl Session` in
 *      `core/phomu-core/src/**`;
 *   2. the **bridges** — the `pub fn phomu_*` in `platform/<bridge>/src/**`.
 *
 * WHY THE RUST IS PARSED AND NOT COMPILED
 *   The gate has to run in the JavaScript toolchain of the repository, in
 *   milliseconds, without a Rust toolchain and without a build. A parser
 *   that understands comments, string literals, raw strings and lifetimes is
 *   enough to find `impl Session` blocks and `pub fn` signatures — and it
 *   cannot be fooled by a `pub fn` in a doc comment or in a string.
 */

import fs from 'node:fs';

/* ------------------------------------------------------------------ *
 * The Rust source
 * ------------------------------------------------------------------ */

/**
 * Replace the comments and the string literals of a Rust source with spaces.
 *
 * WHY: the gate counts the braces of an `impl` block, and a format string
 * such as `format!("session-{seed:016x}")` carries braces of its own. The
 * spaces have the same length as the text they replace, so the line numbers
 * of the original file stay valid.
 *
 * @param {string} text the Rust source
 * @param {{keepStrings?: boolean}} [options] whether the string literals stay
 * @returns {string} the source without comments and (by default) without strings
 */
export function stripRust(text, options = {}) {
  const keepStrings = options.keepStrings === true;
  const out = text.split('');
  let index = 0;
  const blank = (from, to) => {
    for (let position = from; position < to; position += 1) {
      if (out[position] !== '\n') out[position] = ' ';
    }
  };

  while (index < text.length) {
    const rest = text.slice(index);

    // A line comment.
    if (rest.startsWith('//')) {
      const end = text.indexOf('\n', index);
      const stop = end === -1 ? text.length : end;
      blank(index, stop);
      index = stop;
      continue;
    }

    // A block comment — Rust nests them.
    if (rest.startsWith('/*')) {
      let depth = 0;
      let position = index;
      while (position < text.length) {
        if (text.startsWith('/*', position)) {
          depth += 1;
          position += 2;
          continue;
        }
        if (text.startsWith('*/', position)) {
          depth -= 1;
          position += 2;
          if (depth === 0) break;
          continue;
        }
        position += 1;
      }
      blank(index, position);
      index = position;
      continue;
    }

    // A raw string: r"…", r#"…"#, r##"…"##.
    const raw = /^r(#*)"/.exec(rest);
    if (raw) {
      const hashes = raw[1];
      const closing = `"${hashes}`;
      const end = text.indexOf(closing, index + raw[0].length);
      const stop = end === -1 ? text.length : end + closing.length;
      if (keepStrings) {
        for (let position = index; position < stop; position += 1) {
          if (out[position] !== '\n' && text[position] !== '"') out[position] = ' ';
        }
      } else {
        blank(index, stop);
      }
      index = stop;
      continue;
    }

    // A string literal.
    if (text[index] === '"') {
      let position = index + 1;
      while (position < text.length) {
        if (text[position] === '\\') {
          position += 2;
          continue;
        }
        if (text[position] === '"') {
          position += 1;
          break;
        }
        position += 1;
      }
      if (keepStrings) {
        for (let mark = index; mark < position; mark += 1) {
          if (out[mark] !== '\n' && text[mark] !== '"') out[mark] = ' ';
        }
      } else {
        blank(index, position);
      }
      index = position;
      continue;
    }

    // A character literal or a lifetime.
    if (text[index] === "'") {
      const literal = /^'(\\.|[^\\'])'/.exec(rest);
      const stop = literal ? index + literal[0].length : index + 1;
      if (!keepStrings) blank(index, stop);
      index = stop;
      continue;
    }

    index += 1;
  }

  return out.join('');
}

/**
 * The line of an offset in a text.
 *
 * @param {string} text the text
 * @param {number} offset the offset
 * @returns {number} the one-based line number
 */
function lineOf(text, offset) {
  let line = 1;
  for (let position = 0; position < offset && position < text.length; position += 1) {
    if (text[position] === '\n') line += 1;
  }
  return line;
}

/* ------------------------------------------------------------------ *
 * The session
 * ------------------------------------------------------------------ */

/**
 * Every `.rs` file of a directory tree.
 *
 * @param {string} directory the directory
 * @returns {string[]} the absolute paths of the files
 */
function rustFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const path = `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (entry.isFile() && path.endsWith('.rs')) found.push(path);
    }
  };
  walk(directory);
  return found.sort();
}

/**
 * The public operations of the session.
 *
 * WHY THE SCOPE: every `impl Session` block of `core/phomu-core/src/**` is
 * read, not only the ones of `core/phomu-core/src/session/**`. An operation
 * that is added outside that directory is an operation of the session too,
 * and the gate has to see it.
 *
 * @param {string} root the root of the repository
 * @returns {Map<string, {file: string, line: number}>} the operations by name
 */
export function collectSessionOperations(root) {
  const operations = new Map();
  const directory = `${root}/core/phomu-core/src`;
  for (const path of rustFiles(directory)) {
    const text = fs.readFileSync(path, 'utf8');
    const stripped = stripRust(text);
    const header = /\bimpl\s+Session\s*\{/g;
    let match = header.exec(stripped);
    while (match !== null) {
      const open = stripped.indexOf('{', match.index);
      let depth = 0;
      let position = open;
      for (; position < stripped.length; position += 1) {
        if (stripped[position] === '{') depth += 1;
        else if (stripped[position] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const block = stripped.slice(open, position);
      const signature = /\bpub\s+(?:const\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)/g;
      let item = signature.exec(block);
      while (item !== null) {
        const name = `Session::${item[1]}`;
        if (!operations.has(name)) {
          const offset = open + item.index;
          operations.set(name, {
            file: path.slice(root.length + 1),
            line: lineOf(text, offset),
          });
        }
        item = signature.exec(block);
      }
      match = header.exec(stripped);
    }
  }
  return operations;
}

/* ------------------------------------------------------------------ *
 * The bridges
 * ------------------------------------------------------------------ */

/**
 * The exported symbols of the bridges.
 *
 * WHY THE SCOPE: every `.rs` file of `platform/<bridge>/src/**` is read, so that a
 * symbol that is exported from a new module of a bridge is seen without a
 * change of the gate.
 *
 * @param {string} root the root of the repository
 * @returns {Map<string, Array<{bridge: string, file: string, line: number}>>} the symbols
 */
export function collectBridgeSymbols(root) {
  const symbols = new Map();
  const platforms = `${root}/platform`;
  if (!fs.existsSync(platforms)) return symbols;
  for (const bridge of fs.readdirSync(platforms, { withFileTypes: true })) {
    if (!bridge.isDirectory()) continue;
    const name = bridge.name;
    for (const path of rustFiles(`${platforms}/${name}/src`)) {
      const text = fs.readFileSync(path, 'utf8');
      const stripped = stripRust(text, { keepStrings: true });
      const signature = /\bpub\s+(?:unsafe\s+)?(?:extern\s+"[^"]*"\s+)?fn\s+(phomu_[A-Za-z0-9_]+)/g;
      let match = signature.exec(stripped);
      while (match !== null) {
        const symbol = match[1];
        const entries = symbols.get(symbol) ?? [];
        entries.push({
          bridge: name,
          file: path.slice(root.length + 1),
          line: lineOf(text, match.index),
        });
        symbols.set(symbol, entries);
        match = signature.exec(stripped);
      }
    }
  }
  return symbols;
}

/**
 * The operations a bridge calls.
 *
 * WHY THE LOOSE PATTERN: the call may be written `entry.session.submit_answer(…)`
 * or `Session::new(…)`, and the gate is a warning, not a proof. A loose
 * pattern costs a few false negatives, never a false accusation.
 *
 * @param {string} root the root of the repository
 * @returns {Map<string, Set<string>>} the called operations by bridge
 */
export function collectCalledOperations(root) {
  const called = new Map();
  const platforms = `${root}/platform`;
  if (!fs.existsSync(platforms)) return called;
  for (const bridge of fs.readdirSync(platforms, { withFileTypes: true })) {
    if (!bridge.isDirectory()) continue;
    const names = new Set();
    for (const path of rustFiles(`${platforms}/${bridge.name}/src`)) {
      const stripped = stripRust(fs.readFileSync(path, 'utf8'));
      const call = /(?:\.|::)([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
      let match = call.exec(stripped);
      while (match !== null) {
        names.add(`Session::${match[1]}`);
        match = call.exec(stripped);
      }
    }
    called.set(bridge.name, names);
  }
  return called;
}

