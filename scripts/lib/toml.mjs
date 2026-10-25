/**
 * A small, dependency-free TOML parser for the crate-boundary gate.
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   The boundary gate has to know which crate depends on which. That
 *   information lives in `Cargo.toml`, and `Cargo.toml` is **TOML** — not YAML,
 *   not JSON. Parsing it with a YAML parser silently produces nonsense: the
 *   table headers `[dependencies]` are not YAML mappings, the inline tables
 *   `{ path = "../x" }` are not YAML flow mappings, and the result is a gate
 *   that never fails because it never sees an edge.
 *
 *   This module implements the subset of TOML 1.0 that Cargo manifests use:
 *
 *     - comments (`#` to end of line, outside strings)
 *     - tables (`[a.b.c]`) and arrays of tables (`[[a.b]]`)
 *     - dotted keys on both sides (`a.b.c = 1`, `[a.b] c = 1`)
 *     - basic strings, literal strings and their multi-line variants
 *     - integers, floats, booleans
 *     - arrays (nested, multi-line) and inline tables (nested, multi-line)
 *     - date/time values, kept verbatim as strings
 *
 *   WHAT IT DOES NOT IMPLEMENT
 *     Local dates and times are preserved as their raw text. The gate never
 *     inspects a timestamp, and inventing a `Date` here would only add a
 *     second, wrong, representation.
 *
 * LINE NUMBERS
 *   The parser can record the source line of every key it sees. The gate
 *   prints `file:line` with every finding, so that a violation points at the
 *   line a human has to change.
 *
 * EXAMPLE
 *   ```js
 *   const { value, locations } = parseToml(text);
 *   value.dependencies['phomu-errors'].path; // -> '../phomu-errors'
 *   locations.get('dependencies.phomu-errors').line; // -> 12
 *   ```
 */

/** Thrown when the input is not valid TOML. */
export class TomlParseError extends Error {
  /**
   * @param {string} message what is wrong
   * @param {number} line the 1-based line the problem was found on
   */
  constructor(message, line) {
    super(`${message} (line ${line})`);
    this.name = 'TomlParseError';
    this.line = line;
  }
}

/** Characters that terminate a bare (unquoted) key. */
const BARE_KEY_STOP = new Set(['=', '.', ',', ']', '}', ' ', '\t', '\r', '\n', '#']);

/**
 * Parse a TOML document.
 *
 * @param {string} text the document
 * @returns {{value: Record<string, unknown>, locations: Map<string, {line: number}>}}
 *   the parsed document and a map from a dotted key path to its source line
 */
export function parseToml(text) {
  return new TomlParser(text).parse();
}

/** The recursive-descent parser behind {@link parseToml}. */
class TomlParser {
  /**
   * @param {string} text the document to parse
   */
  constructor(text) {
    this.text = text;
    this.pos = 0;
    this.line = 1;
    this.root = Object.create(null);
    /** @type {Map<string, {line: number}>} */
    this.locations = new Map();
  }

  /**
   * Parse the whole document.
   *
   * @returns {{value: Record<string, unknown>, locations: Map<string, {line: number}>}}
   */
  parse() {
    // Tables created by a dotted key must not be reopened as a table header.
    /** @type {Set<string>} */
    this.explicitTables = new Set();
    /** @type {string[]} */
    this.currentPath = [];

    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.text.length) break;

      const char = this.text[this.pos];
      if (char === '[') {
        this.parseTableHeader();
      } else {
        this.parseKeyValue(this.currentTable(), this.currentPath);
      }
      this.skipToLineEnd();
    }

    return { value: this.root, locations: this.locations };
  }

  /** The table that bare keys are currently written into. */
  currentTable() {
    return this.current ?? this.root;
  }

  /** Skip spaces, tabs, newlines and comments. */
  skipWhitespaceAndComments() {
    while (this.pos < this.text.length) {
      const char = this.text[this.pos];
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
      } else if (char === '#') {
        while (this.pos < this.text.length && this.text[this.pos] !== '\n') {
          this.advance();
        }
      } else {
        return;
      }
    }
  }

  /** Skip the rest of the current line, rejecting stray characters. */
  skipToLineEnd() {
    this.skipSpaces();
    if (this.pos >= this.text.length) return;
    const char = this.text[this.pos];
    if (char === '#') {
      while (this.pos < this.text.length && this.text[this.pos] !== '\n') {
        this.advance();
      }
      return;
    }
    if (char === '\n' || char === '\r') {
      this.advance();
      return;
    }
    throw new TomlParseError(
      `unexpected character ${JSON.stringify(char)} after the value`,
      this.line,
    );
  }

  /**
   * Advance the cursor by one character, keeping the line counter in sync.
   *
   * @param {number} count how many characters to consume
   */
  advance(count = 1) {
    for (let index = 0; index < count; index += 1) {
      if (this.text[this.pos] === '\n') this.line += 1;
      this.pos += 1;
    }
  }

  /** Skip spaces and tabs only. */
  skipSpaces() {
    while (this.pos < this.text.length) {
      const char = this.text[this.pos];
      if (char === ' ' || char === '\t') {
        this.advance();
      } else {
        return;
      }
    }
  }

  /**
   * Parse a `[table]` or `[[array of tables]]` header.
   */
  parseTableHeader() {
    const isArray = this.text[this.pos + 1] === '[';
    this.advance(isArray ? 2 : 1);
    this.skipSpaces();

    const path = this.parseKeyPath();
    this.skipSpaces();

    const closing = isArray ? ']]' : ']';
    if (!this.text.startsWith(closing, this.pos)) {
      throw new TomlParseError('unterminated table header', this.line);
    }
    this.advance(closing.length);

    const fullPath = path.join('.');
    if (isArray) {
      const parent = this.resolveParent(path.slice(0, -1));
      const key = path[path.length - 1];
      const existing = parent[key];
      if (existing === undefined) {
        parent[key] = [Object.create(null)];
        this.current = parent[key][0];
      } else if (Array.isArray(existing)) {
        const table = Object.create(null);
        existing.push(table);
        this.current = table;
      } else {
        throw new TomlParseError(
          `cannot redefine ${fullPath} as an array of tables`,
          this.line,
        );
      }
    } else {
      this.current = this.resolveParent(path, true);
    }
    this.currentPath = path;
    this.explicitTables.add(fullPath);
    this.locations.set(`[${fullPath}]`, { line: this.line });
  }

  /**
   * Walk (and create) the nested tables a key path points at.
   *
   * @param {string[]} path the dotted path
   * @param {boolean} [createMissing] create the tables when they are missing
   * @returns {Record<string, unknown>} the table the last path element lives in
   */
  resolveParent(path, createMissing = true) {
    let node = this.root;
    for (const segment of path) {
      let next = node[segment];
      if (next === undefined) {
        if (!createMissing) {
          throw new TomlParseError(`unknown table ${segment}`, this.line);
        }
        next = Object.create(null);
        node[segment] = next;
      }
      if (Array.isArray(next)) {
        next = next[next.length - 1];
      }
      if (typeof next !== 'object' || next === null) {
        throw new TomlParseError(`${segment} is not a table`, this.line);
      }
      node = next;
    }
    return node;
  }

  /**
   * Parse a possibly dotted key.
   *
   * @returns {string[]} the key path
   */
  parseKeyPath() {
    /** @type {string[]} */
    const path = [];
    for (;;) {
      this.skipSpaces();
      const segment = this.parseKeySegment();
      path.push(segment);
      this.skipSpaces();
      if (this.text[this.pos] === '.') {
        this.advance();
        continue;
      }
      return path;
    }
  }

  /**
   * Parse one key segment: a bare key or a quoted key.
   *
   * @returns {string} the key
   */
  parseKeySegment() {
    const char = this.text[this.pos];
    if (char === '"' || char === "'") {
      return this.parseString();
    }
    let key = '';
    while (this.pos < this.text.length) {
      const current = this.text[this.pos];
      if (BARE_KEY_STOP.has(current)) break;
      key += current;
      this.advance();
    }
    if (key === '') {
      throw new TomlParseError('empty key', this.line);
    }
    return key;
  }

  /**
   * Parse a `key = value` pair and store it in the given table.
   *
   * @param {Record<string, unknown>} table the table to write into
   * @param {string[]} prefix the key path prefix inherited from the caller
   */
  parseKeyValue(table, prefix) {
    const line = this.line;
    const path = this.parseKeyPath();
    this.skipSpaces();
    if (this.text[this.pos] !== '=') {
      throw new TomlParseError('expected "=" after the key', this.line);
    }
    this.advance();
    this.skipSpaces();

    const fullPath = [...prefix, ...path];
    // The inline-table keys of the value belong below the key itself.
    const previousPrefix = this.valuePrefix;
    this.valuePrefix = fullPath;
    const value = this.parseValue();
    this.valuePrefix = previousPrefix;

    // The table already stands for the prefix, so only the key path itself
    // is walked: `[dependencies]` + `a.b = 1` writes `dependencies.a.b`.
    const leaf = path[path.length - 1];
    let node = table;
    for (const segment of path.slice(0, -1)) {
      let next = node[segment];
      if (next === undefined) {
        next = Object.create(null);
        node[segment] = next;
      }
      node = next;
    }
    node[leaf] = value;
    this.locations.set(fullPath.join('.'), { line });
  }

  /**
   * Parse a value of any supported type.
   *
   * @returns {unknown} the parsed value
   */
  parseValue() {
    const char = this.text[this.pos];
    if (char === undefined) {
      throw new TomlParseError('missing value', this.line);
    }
    if (char === '"' || char === "'") {
      return this.parseString();
    }
    if (char === '[') {
      return this.parseArray();
    }
    if (char === '{') {
      return this.parseInlineTable();
    }
    return this.parseScalar();
  }

  /**
   * Parse a string: basic, literal, or one of their multi-line variants.
   *
   * @returns {string} the string value
   */
  parseString() {
    const quote = this.text[this.pos];
    const triple = this.text.startsWith(quote.repeat(3), this.pos);

    if (triple) {
      this.advance(3);
      // A newline immediately after the opening delimiter is trimmed.
      if (this.text[this.pos] === '\r') this.advance();
      if (this.text[this.pos] === '\n') this.advance();
      let out = '';
      const closing = quote.repeat(3);
      for (;;) {
        if (this.pos >= this.text.length) {
          throw new TomlParseError('unterminated multi-line string', this.line);
        }
        if (this.text.startsWith(closing, this.pos)) {
          this.advance(3);
          return out;
        }
        if (quote === '"' && this.text[this.pos] === '\\') {
          // A backslash at the end of a line trims the following whitespace.
          const rest = this.text.slice(this.pos);
          const lineBreak = /^(\r?\n)[ \t]*/.exec(rest);
          if (lineBreak) {
            this.advance(lineBreak[0].length);
            continue;
          }
          out += this.parseEscape();
          continue;
        }
        out += this.text[this.pos];
        this.advance();
      }
    }

    this.advance();
    let out = '';
    for (;;) {
      if (this.pos >= this.text.length) {
        throw new TomlParseError('unterminated string', this.line);
      }
      const current = this.text[this.pos];
      if (current === '\n') {
        throw new TomlParseError('unterminated string', this.line);
      }
      if (current === quote) {
        this.advance();
        return out;
      }
      if (quote === '"' && current === '\\') {
        out += this.parseEscape();
        continue;
      }
      out += current;
      this.advance();
    }
  }

  /**
   * Parse one escape sequence inside a basic string.
   *
   * @returns {string} the unescaped character
   */
  parseEscape() {
    this.advance(); // the backslash
    const char = this.text[this.pos];
    this.advance();
    switch (char) {
      case 'b':
        return '\b';
      case 't':
        return '\t';
      case 'n':
        return '\n';
      case 'f':
        return '\f';
      case 'r':
        return '\r';
      case '"':
        return '"';
      case '\\':
        return '\\';
      case 'u':
      case 'U': {
        const width = char === 'u' ? 4 : 8;
        const hex = this.text.slice(this.pos, this.pos + width);
        if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== width) {
          throw new TomlParseError('invalid unicode escape', this.line);
        }
        this.advance(width);
        return String.fromCodePoint(Number.parseInt(hex, 16));
      }
      default:
        throw new TomlParseError(`invalid escape \\${char ?? ''}`, this.line);
    }
  }

  /**
   * Parse an array, possibly spanning several lines.
   *
   * @returns {unknown[]} the array items
   */
  parseArray() {
    this.advance(); // '['
    /** @type {unknown[]} */
    const items = [];
    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.text.length) {
        throw new TomlParseError('unterminated array', this.line);
      }
      if (this.text[this.pos] === ']') {
        this.advance();
        return items;
      }
      items.push(this.parseValue());
      this.skipWhitespaceAndComments();
      if (this.text[this.pos] === ',') {
        this.advance();
        continue;
      }
      if (this.text[this.pos] === ']') {
        this.advance();
        return items;
      }
      throw new TomlParseError('expected "," or "]" in the array', this.line);
    }
  }

  /**
   * Parse an inline table, possibly spanning several lines.
   *
   * @returns {Record<string, unknown>} the table entries
   */
  parseInlineTable() {
    this.advance(); // '{'
    const prefix = this.valuePrefix;
    /** @type {Record<string, unknown>} */
    const table = Object.create(null);
    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.text.length) {
        throw new TomlParseError('unterminated inline table', this.line);
      }
      if (this.text[this.pos] === '}') {
        this.advance();
        return table;
      }
      this.parseKeyValue(table, prefix);
      this.skipWhitespaceAndComments();
      if (this.text[this.pos] === ',') {
        this.advance();
        continue;
      }
      if (this.text[this.pos] === '}') {
        this.advance();
        return table;
      }
      throw new TomlParseError('expected "," or "}" in the inline table', this.line);
    }
  }

  /**
   * Parse a scalar: a boolean, a number, or a date/time kept as text.
   *
   * @returns {string | number | boolean} the value
   */
  parseScalar() {
    let raw = '';
    while (this.pos < this.text.length) {
      const char = this.text[this.pos];
      if (char === ',' || char === ']' || char === '}' || char === '\n' || char === '\r') {
        break;
      }
      if (char === '#') break;
      raw += char;
      this.advance();
    }
    const trimmed = raw.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (/^[+-]?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
    if (/^[+-]?(\d[\d_]*)(\.\d[\d_]*)?([eE][+-]?\d[\d_]*)?$/.test(trimmed)) {
      return Number.parseFloat(trimmed.replace(/_/g, ''));
    }
    if (trimmed === '') {
      throw new TomlParseError('missing value', this.line);
    }
    // A date, a time or a datetime: kept verbatim.
    return trimmed;
  }
}
