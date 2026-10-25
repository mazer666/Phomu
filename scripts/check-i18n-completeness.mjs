#!/usr/bin/env node
/**
 * i18n completeness gate (CONTRACT §6)
 *
 * Checks:
 *   1. DE/EN parity — every key exists in both languages
 *      (base: src/i18n/locales/{de,en}.json, parts: src/i18n/locales/parts/*.json)
 *   2. No empty values
 *   3. Plural forms (_one/_other/...) identical in both languages
 *   4. No untranslated literal texts left in the TSX files under src/
 *   5. Every translation key used in the code resolves in BOTH languages
 *      (a `t('…')` call with a key that does not exist renders the key
 *      itself — the German fallback of the feedback quips would be shown)
 *   6. Every key literal in a configuration table resolves in BOTH languages
 *      (the key tables of src/config/ carry the texts of the UI)
 *
 * Usage:
 *   node scripts/check-i18n-completeness.mjs              # gate (exit 1 on violation)
 *   node scripts/check-i18n-completeness.mjs --count      # counting only, exit 0
 *   node scripts/check-i18n-completeness.mjs --files=src/components/game/**
 *   node scripts/check-i18n-completeness.mjs --json
 *   node scripts/check-i18n-completeness.mjs --root=<path> # different tree (negative test)
 *
 * ── Allowlist for visible literal texts ─────────────────────────────────
 * A literal text is NOT counted as a violation when:
 *   - it contains no letters (numbers, symbols, one-off signs: "3", "…", "—")
 *   - it matches an entry of BRAND_ALLOWLIST exactly (proper names, which per
 *     CONTRACT §5 stay identical in both languages)
 *   - it is a technical value (slug, domain, URL, CSS variable, hex colour)
 *   - it sits inside `t(...)` / `i18n.t(...)` (a translation key)
 * The allowlist is deliberately narrow: every further German or English
 * sentence in the JSX is a violation.
 *
 * ── Tolerance for concurrent work in the same repository ───────────────
 * The gate runs in a repository where files are modified in parallel.
 * Therefore:
 *   - files that disappear during the run are skipped
 *   - half-written JSON files produce a finding, not a crash
 *   - directory and file read errors are caught
 * The exit code stays 1 as soon as at least one real violation exists.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {any} */
let ts;
try {
  ts = require('typescript');
} catch {
  console.error(
    'ERROR: The package "typescript" is not installed. ' +
      'The i18n gate needs the TypeScript parser (npm ci including devDependencies).'
  );
  process.exit(1);
}

const DEFAULT_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
/**
 * `--root=<path>` checks a different tree (default: the repository).
 * Used for the isolated proof of the gate (negative test) and does not change
 * the behaviour in the normal case.
 */
const rootArg = process.argv.slice(2).find((a) => a.startsWith('--root='));
const ROOT = rootArg
  ? resolve(DEFAULT_ROOT, rootArg.slice('--root='.length))
  : DEFAULT_ROOT;
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');
const PARTS_DIR = join(LOCALES_DIR, 'parts');
const SRC_DIR = join(ROOT, 'src');

/**
 * Read errors during the run (file gone, half-written, …).
 * They are reported as a finding, not as a crash.
 * @type {{where: string, reason: string}[]}
 */
const IO_ERRORS = [];

// ─── Options ─────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const COUNT_ONLY = argv.includes('--count');
const AS_JSON = argv.includes('--json');
const filesArg = argv.find((a) => a.startsWith('--files='));
const SCOPE = filesArg
  ? filesArg
      .slice('--files='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

// ─── Proper names (stay identical, per CONTRACT §5) ──────────────

const BRAND_ALLOWLIST = new Set([
  'phomu',
  'spotify',
  'spotify free',
  'youtube',
  'jackbox',
  'jackbox party',
  'amazon prime',
  'amazon music',
  'music wall',
]);

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

// ─── File collection ───────────────────────────────────────────────

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    IO_ERRORS.push({
      where: toPosix(dir),
      reason: `Directory not readable: ${error.code ?? error.message}`,
    });
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      // File was removed between readdir and stat -> skip
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function toPosix(p) {
  return relative(ROOT, p).split(sep).join('/');
}

// ─── Load locales ────────────────────────────────────────────────

/** Flattens an object into dot-path keys (recursive). */
function flatten(obj, prefix = '') {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

/** Loads a locale file (flat or nested) into dot paths. */
function loadLocale(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    IO_ERRORS.push({
      where: toPosix(file),
      reason: `File not readable: ${error.code ?? error.message}`,
    });
    return {};
  }
  try {
    return flatten(JSON.parse(raw));
  } catch (error) {
    IO_ERRORS.push({
      where: toPosix(file),
      reason: `JSON not parseable: ${error.message}`,
    });
    return {};
  }
}

function collectLocaleSets() {
  /** @type {Map<string, {de: string[], en: string[]}>} */
  const sets = new Map();

  const baseDe = loadLocale(join(LOCALES_DIR, 'de.json'));
  const baseEn = loadLocale(join(LOCALES_DIR, 'en.json'));
  sets.set('locales/de.json', {
    de: Object.keys(baseDe),
    en: Object.keys(baseEn),
  });

  if (existsSync(PARTS_DIR)) {
    const partFiles = readdirSync(PARTS_DIR).filter((f) => f.endsWith('.json'));
    // Parts come as <namespace>.<lang>.json or <namespace>.<lang>.json pattern
    const byLang = { de: [], en: [] };
    for (const file of partFiles) {
      const m = file.match(/^(.+)\.(de|en)\.json$/);
      if (m) {
        byLang[m[2]].push({ ns: m[1], file });
      } else {
        // Fallback: <namespace>.<lang>.json not present -> file is its own set
        sets.set(`parts/${file}`, {
          de: Object.keys(loadLocale(join(PARTS_DIR, file))),
          en: [],
        });
      }
    }
    for (const lang of ['de', 'en']) {
      for (const { ns, file } of byLang[lang]) {
        const keys = Object.keys(loadLocale(join(PARTS_DIR, file)));
        const otherLang = lang === 'de' ? 'en' : 'de';
        const counterpart = byLang[otherLang].find((p) => p.ns === ns);
        const otherKeys = counterpart
          ? Object.keys(loadLocale(join(PARTS_DIR, counterpart.file)))
          : [];
        sets.set(`parts/${ns}`, {
          de: lang === 'de' ? keys : otherKeys,
          en: lang === 'en' ? keys : otherKeys,
        });
      }
    }
  }

  return sets;
}

// ─── Literal text detection (TypeScript AST) ───────────────────────

const USER_VISIBLE_ATTRS = new Set([
  'aria-label',
  'title',
  'placeholder',
  'alt',
  'label',
]);

function isSlugLike(text) {
  return /^[a-z0-9]+(?:[-_/][a-z0-9]+)*$/.test(text);
}

/**
 * Detects an ISO code (language ISO-639-1 / country ISO-3166 alpha-2/3),
 * e.g. "DE", "EN", "US". Codes are identical in both languages and
 * therefore no text that needs translating.
 * @param {string} text
 */
function isIsoCode(text) {
  return /^[A-Z]{2,3}$/.test(text.trim());
}

/**
 * Detects a list of technical identifiers, e.g. "timeline, hint-master, ...".
 * All tokens are slugs or pure punctuation.
 *
 * Deliberately narrow: a single short word without a separator
 * ("L", "OK") is visible text and is NOT counted as an identifier.
 * @param {string} text
 */
function isIdentifierList(text) {
  const tokens = text
    .trim()
    .split(/\s*,\s*/)
    .filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens.length === 1 && !/[-_/]/.test(tokens[0])) return false;
  return tokens.every(
    (token) =>
      isSlugLike(token) ||
      /^[.\u2026]+$/.test(token) ||
      /^[a-z0-9]+(?:[-_/][a-z0-9]+)*$/i.test(token)
  );
}

/**
 * Loads the pack names from the catalog. Pack names are proper names of the
 * dataset (e.g. "Global Hits 1950-2026") and identical in both languages.
 * @returns {Set<string>}
 */
function loadPackNames() {
  const names = new Set();
  const file = join(ROOT, 'src/data/songs/packs.json');
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    for (const [key, value] of Object.entries(raw)) {
      names.add(key);
      if (
        value &&
        typeof value === 'object' &&
        typeof value.pack === 'string'
      ) {
        names.add(value.pack);
      }
    }
  } catch {
    // Catalog file not readable -> no exception, the gate reports the error separately
  }
  return names;
}

const PACK_NAMES = loadPackNames();

/**
 * CSS utility prefixes (Tailwind). A list in which *all* tokens are technical
 * and *at least* one of these prefixes occurs is a class list and no visible
 * text.
 */
const CSS_UTILITY_PREFIXES = [
  'absolute',
  'relative',
  'fixed',
  'sticky',
  'static',
  'block',
  'inline',
  'flex',
  'grid',
  'hidden',
  'truncate',
  'sr-only',
  'container',
  'prose',
  'table',
  'columns',
  'text-',
  'font-',
  'leading-',
  'tracking-',
  'whitespace-',
  'break-',
  'uppercase',
  'lowercase',
  'capitalize',
  'italic',
  'underline',
  'line-through',
  'no-underline',
  'bg-',
  'opacity-',
  'from-',
  'via-',
  'to-',
  'rounded',
  'border',
  'shadow',
  'ring',
  'outline',
  'p-',
  'px-',
  'py-',
  'pt-',
  'pr-',
  'pb-',
  'pl-',
  'ps-',
  'pe-',
  'm-',
  'mx-',
  'my-',
  'mt-',
  'mr-',
  'mb-',
  'ml-',
  'ms-',
  'me-',
  'space-',
  'gap-',
  'w-',
  'h-',
  'min-',
  'max-',
  'size-',
  'top-',
  'right-',
  'bottom-',
  'left-',
  'inset-',
  'z-',
  'translate-',
  'rotate-',
  'scale-',
  'skew-',
  'origin-',
  'items-',
  'justify-',
  'content-',
  'self-',
  'place-',
  'grid-cols',
  'grid-rows',
  'col-',
  'row-',
  'order-',
  'basis-',
  'grow',
  'shrink',
  'overflow-',
  'object-',
  'aspect-',
  'cursor-',
  'select-',
  'pointer-events-',
  'resize',
  'appearance-',
  'transition',
  'duration-',
  'delay-',
  'ease-',
  'animate-',
  'transform',
  'backdrop-',
  'divide-',
  'placeholder-',
  'file-',
  'marker-',
  'accent-',
];

/**
 * Detects a CSS class list (e.g. "-translate-x-1/2 mb-2 bottom-full").
 * @param {string} text
 * @returns {boolean}
 */
function isCssClassList(text) {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length === 0) return false;
  const technical = tokens.every((token) =>
    /^-?[a-z0-9][a-z0-9:./%_-]*$/.test(token)
  );
  if (!technical) return false;
  return tokens.some((token) =>
    CSS_UTILITY_PREFIXES.some((prefix) =>
      prefix.endsWith('-') ? token.startsWith(prefix) : token === prefix
    )
  );
}

/**
 * Detects a path or route (e.g. "/game", "/favicon.png").
 * @param {string} text
 * @returns {boolean}
 */
function isPathLike(text) {
  return /^\/[A-Za-z0-9._\-/]*$/.test(text.trim());
}

/**
 * Character ranges that contain only symbols, pictograms or emoji
 * (Letterlike Symbols, Misc Symbols, Arrows, Emoji).
 */
const SYMBOL_RANGES = /[ -⯿‌️\u{1F000}-\u{1FAFF}]/gu;

/**
 * Checks whether the text consists only of symbols/pictograms.
 * Such characters are identical in both languages per CONTRACT §5 and
 * therefore no text that needs translating.
 * @param {string} text
 * @returns {boolean}
 */
function isSymbolOnly(text) {
  return text.replace(SYMBOL_RANGES, '').replace(/\s+/g, '').length === 0;
}

/**
 * File extensions. A value with one of these extensions is a file name and
 * therefore potentially visible text (e.g. "PRIVACY.md" as link text) — it
 * must not disappear through the domain exception.
 */
const FILE_EXTENSION =
  /\.(md|markdown|txt|json|ya?ml|toml|ts|tsx|js|jsx|mjs|css|html?|png|jpe?g|gif|svg|webp|ico|pdf|zip|lock|csv)$/i;

function looksLikeUiText(text) {
  if (!text) return false;
  // Only characters with upper/lower case are text. This drops pure
  // symbols (e.g. "ℹ️") and digits — exactly as in CONTRACT §5
  // ("proper names, numbers, symbols stay identical").
  if (!/[\p{Lu}\p{Ll}]/u.test(text)) return false;
  if (isSymbolOnly(text)) return false;
  if (isSlugLike(text)) return false;
  if (BRAND_ALLOWLIST.has(text.trim().toLowerCase())) return false;
  if (PACK_NAMES.has(text.trim())) return false;
  // Technical values (domains, URLs, CSS variables) are no UI texts
  // Note: file names (e.g. "PRIVACY.md" as link text) are visible text and
  // are therefore NOT excepted through the domain rule.
  if (
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(text.trim()) &&
    !FILE_EXTENSION.test(text.trim())
  ) {
    return false;
  }
  if (text.includes('://')) return false;
  if (/^var\(--/.test(text.trim())) return false;
  // Hex colours
  if (/^#[0-9a-f]{3,8}$/i.test(text.trim())) return false;
  // CSS class lists and routes/paths are technical values
  if (isCssClassList(text)) return false;
  if (isPathLike(text)) return false;
  // ISO language/country codes are identifiers, not text
  if (isIsoCode(text)) return false;
  // Lists of technical identifiers
  if (isIdentifierList(text)) return false;
  return true;
}

/** Text consisting only of HTML entities (e.g. &middot;) is no UI text. */
function isEntityOnly(text) {
  const stripped = text.replace(/&[a-z]+;|&#\d+;/gi, '').trim();
  return stripped.length === 0;
}

/** Checks whether a string literal is used as an argument of t()/i18n.t(). */
function isTranslationCallLiteral(node) {
  const parent = node.parent;
  if (!parent || !ts.isCallExpression(parent)) return false;
  const callee = parent.expression;
  if (ts.isIdentifier(callee)) return callee.text === 't';
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text === 't';
  return false;
}

/**
 * Collects the literal texts of a TSX file.
 * @returns {{line: number, text: string, kind: string}[]}
 */
function scanLiterals(file) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch (error) {
    // File was removed during the run -> skip, do not crash
    IO_ERRORS.push({
      where: toPosix(file),
      reason: `File not readable: ${error.code ?? error.message}`,
    });
    return [];
  }
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const found = [];
  const reported = new Set();

  const lineOf = (node) =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const report = (node, kind) => {
    if (reported.has(node)) return;
    const text = node.text;
    if (!looksLikeUiText(text)) return;
    reported.add(node);
    found.push({
      line: lineOf(node),
      text: text.trim().replace(/\s+/g, ' '),
      kind,
    });
  };

  /** String literals inside an expression (except t() arguments). */
  const collectFromExpression = (node) => {
    // Attributes (className, style, …) contain no UI texts
    if (ts.isJsxAttribute(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isTranslationCallLiteral(node)) report(node, 'expression');
      return;
    }
    ts.forEachChild(node, collectFromExpression);
  };

  /** String literals in a UI table (array/object literal). */
  const collectFromTable = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isTranslationCallLiteral(node)) report(node, 'table');
      return;
    }
    if (ts.isTemplateExpression(node)) {
      // Template with placeholders: only report when the text reads like
      // natural language
      const raw = node.getText(sf).replace(/`/g, '');
      const stripped = raw.replace(/\$\{[^}]*\}/g, ' ').trim();
      // Technical ID prefixes (e.g. `draft-${id}`) are no visible text
      const isTechnicalPrefix = /^[a-z0-9_-]+$/.test(stripped);
      if (!isTechnicalPrefix && looksLikeUiText(stripped)) {
        found.push({
          line: lineOf(node),
          text: stripped.replace(/\s+/g, ' '),
          kind: 'table',
        });
      }
      return;
    }
    if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      return;
    }
    // Colour definitions ({ name: 'Phomu Blue', value: '#118AB2' }) are
    // technical palette entries. The name is never rendered, only the hex
    // value is set as a CSS colour.
    if (ts.isObjectLiteralExpression(node) && isColorDefinition(node)) {
      return;
    }
    ts.forEachChild(node, collectFromTable);
  };

  /**
   * Checks whether an object literal is a colour definition (hex colour).
   * @param {any} node
   * @returns {boolean}
   */
  function isColorDefinition(node) {
    return node.properties.some(
      (prop) =>
        ts.isPropertyAssignment(prop) &&
        prop.name &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === 'value' &&
        prop.initializer &&
        ts.isStringLiteral(prop.initializer) &&
        /^#[0-9a-f]{3,8}$/i.test(prop.initializer.text)
    );
  }

  /** Checks whether a node is a UI table (array/object literal). */
  const isTableLiteral = (node) =>
    ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node);

  const visit = (node) => {
    // 1. JSX text nodes
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (text.length > 0 && looksLikeUiText(text) && !isEntityOnly(text)) {
        found.push({
          line: lineOf(node),
          text: text.replace(/\s+/g, ' '),
          kind: 'jsx-text',
        });
      }
    }

    // 2. User-visible attributes
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      USER_VISIBLE_ATTRS.has(node.name.text)
    ) {
      const init = node.initializer;
      if (init && ts.isStringLiteral(init)) {
        if (looksLikeUiText(init.text)) {
          found.push({
            line: lineOf(node),
            text: init.text.trim(),
            kind: `attr:${node.name.text}`,
          });
        }
      }
    }

    // 3. JSX expressions as child (string literals inside conditions etc.)
    //    Only child expressions — attribute expressions (className, style) are no UI text.
    if (ts.isJsxExpression(node) && node.expression) {
      const parent = node.parent;
      const isChildExpression =
        parent && (ts.isJsxElement(parent) || ts.isJsxFragment(parent));
      if (isChildExpression) collectFromExpression(node.expression);
    }

    // 4. UI tables: const x = [...] | const x = {...} | const x = useMemo(() => [...])
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const init = node.initializer;
      if (isTableLiteral(init)) {
        collectFromTable(init);
      } else if (ts.isCallExpression(init)) {
        for (const arg of init.arguments) {
          if (ts.isArrowFunction(arg) && arg.body && isTableLiteral(arg.body)) {
            collectFromTable(arg.body);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
}

/** All TSX files that fit the scope. */
function collectTsxFiles() {
  const all = walk(SRC_DIR).filter((f) => f.endsWith('.tsx'));
  if (!SCOPE) return all;
  return all.filter((f) => {
    const rel = toPosix(f);
    return SCOPE.some((pattern) => {
      const rx = new RegExp(
        '^' +
          pattern
            .split('*')
            .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*') +
          '$'
      );
      return rx.test(rel);
    });
  });
}

// ─── Translation keys used in the code ─────────────────────────────

/** All TS/TSX files below src/ that fit the scope. */
function collectSourceFiles() {
  const all = walk(SRC_DIR).filter(
    (f) => f.endsWith('.tsx') || f.endsWith('.ts')
  );
  if (!SCOPE) return all;
  return all.filter((f) => {
    const rel = toPosix(f);
    return SCOPE.some((pattern) => {
      const rx = new RegExp(
        '^' +
          pattern
            .split('*')
            .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*') +
          '$'
      );
      return rx.test(rel);
    });
  });
}

/**
 * Parses a source file and returns its AST.
 * @param {string} file
 * @returns {any | null}
 */
function parseSource(file) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch (error) {
    IO_ERRORS.push({
      where: toPosix(file),
      reason: `File not readable: ${error.code ?? error.message}`,
    });
    return null;
  }
  return ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

/**
 * Whether a key resolves at runtime.
 * i18next finds the key itself or its plural forms (`key_one` + `key_other`).
 * @param {Record<string, unknown>} map
 * @param {string} key
 */
function resolves(map, key) {
  if (key in map) return true;
  return `${key}_one` in map && `${key}_other` in map;
}

/**
 * Collects the translation keys of all `t('…')` calls.
 * @param {string} file
 * @returns {{line: number, key: string}[]}
 */
function collectUsedKeys(file) {
  const sf = parseSource(file);
  if (!sf) return [];
  const found = [];
  const lineOf = (node) =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const callee = node.expression;
      const isTranslationCall =
        (ts.isIdentifier(callee) && callee.text === 't') ||
        (ts.isPropertyAccessExpression(callee) && callee.name.text === 't');
      if (isTranslationCall) {
        found.push({ line: lineOf(node), key: node.arguments[0].text });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
}

/**
 * Collects key literals of configuration tables (src/config/).
 * A string is a key candidate when its first segment is a namespace of the
 * locale files — that separates a key from a route, a CSS class or a slug.
 * @param {string} file
 * @param {Set<string>} namespaces
 * @returns {{line: number, key: string}[]}
 */
function collectConfigKeys(file, namespaces) {
  const sf = parseSource(file);
  if (!sf) return [];
  const found = [];
  const lineOf = (node) =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text;
      const [head] = text.split('.');
      if (
        text.includes('.') &&
        namespaces.has(head) &&
        /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(text)
      ) {
        found.push({ line: lineOf(node), key: text });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return found;
}

// ─── Gate ─────────────────────────────────────────────────────────

const violations = [];
const counts = [];

// The two base locale files must exist — otherwise parity cannot be checked
// and the gate would be meaningless.
for (const required of ['de.json', 'en.json']) {
  if (!existsSync(join(LOCALES_DIR, required))) {
    violations.push({
      kind: 'locale-missing',
      where: `src/i18n/locales/${required}`,
      detail: 'Locale file missing',
    });
  }
}

const localeSets = collectLocaleSets();
for (const [name, set] of localeSets) {
  const deKeys = new Set(set.de);
  const enKeys = new Set(set.en);
  const onlyDe = [...deKeys].filter((k) => !enKeys.has(k));
  const onlyEn = [...enKeys].filter((k) => !deKeys.has(k));

  for (const key of onlyDe)
    violations.push({ kind: 'key-only-de', where: name, detail: key });
  for (const key of onlyEn)
    violations.push({ kind: 'key-only-en', where: name, detail: key });

  // Plural forms must be present identically in both languages
  const pluralSuffixesOf = (keys) =>
    new Set(
      keys
        .filter((k) => PLURAL_SUFFIXES.some((s) => k.endsWith(s)))
        .map((k) => k.replace(/_[a-z]+$/, ''))
    );
  const dePluralBases = pluralSuffixesOf(set.de);
  const enPluralBases = pluralSuffixesOf(set.en);
  for (const base of dePluralBases) {
    if (!enPluralBases.has(base)) {
      violations.push({ kind: 'plural-missing-en', where: name, detail: base });
    }
  }
  for (const base of enPluralBases) {
    if (!dePluralBases.has(base)) {
      violations.push({ kind: 'plural-missing-de', where: name, detail: base });
    }
  }
}

// Empty values (only for base files and parts)
for (const file of [
  ...(existsSync(LOCALES_DIR)
    ? readdirSync(LOCALES_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => join(LOCALES_DIR, f))
    : []),
  ...(existsSync(PARTS_DIR)
    ? readdirSync(PARTS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => join(PARTS_DIR, f))
    : []),
]) {
  const flat = loadLocale(file);
  for (const [key, value] of Object.entries(flat)) {
    if (typeof value === 'string' && value.trim() === '') {
      violations.push({
        kind: 'empty-value',
        where: toPosix(file),
        detail: key,
      });
    } else if (value === null || value === undefined) {
      violations.push({
        kind: 'empty-value',
        where: toPosix(file),
        detail: `${key} (null)`,
      });
    } else if (Array.isArray(value) && value.length === 0) {
      violations.push({
        kind: 'empty-value',
        where: toPosix(file),
        detail: `${key} (empty array)`,
      });
    }
  }
}

// Literal texts in TSX
for (const file of collectTsxFiles()) {
  const literals = scanLiterals(file);
  counts.push({ file: toPosix(file), count: literals.length, literals });
  for (const lit of literals) {
    violations.push({
      kind: 'literal-text',
      where: `${toPosix(file)}:${lit.line}`,
      detail: `${lit.kind}: ${lit.text}`,
    });
  }
}

// 5. Translation keys used in the code must resolve in BOTH languages.
//    A key that exists nowhere renders the key itself — and where a German
//    `defaultValue` is given, the German text leaks into the English UI.
const flatDe = loadLocale(join(LOCALES_DIR, 'de.json'));
const flatEn = loadLocale(join(LOCALES_DIR, 'en.json'));

for (const file of collectSourceFiles()) {
  for (const { line, key } of collectUsedKeys(file)) {
    if (!resolves(flatDe, key)) {
      violations.push({
        kind: 'used-key-missing-de',
        where: `${toPosix(file)}:${line}`,
        detail: key,
      });
    }
    if (!resolves(flatEn, key)) {
      violations.push({
        kind: 'used-key-missing-en',
        where: `${toPosix(file)}:${line}`,
        detail: key,
      });
    }
  }
}

// 6. Key literals of the configuration tables must resolve in BOTH languages.
//    The namespaces are the first segments of the locale keys (the locale
//    files are flattened, so the top level is not visible in the key set).
const namespaces = new Set(
  [...Object.keys(flatDe), ...Object.keys(flatEn)].map(
    (key) => key.split('.')[0]
  )
);
const configDir = join(SRC_DIR, 'config');
if (existsSync(configDir)) {
  for (const file of walk(configDir).filter((f) => f.endsWith('.ts'))) {
    for (const { line, key } of collectConfigKeys(file, namespaces)) {
      if (!resolves(flatDe, key)) {
        violations.push({
          kind: 'config-key-missing-de',
          where: `${toPosix(file)}:${line}`,
          detail: key,
        });
      }
      if (!resolves(flatEn, key)) {
        violations.push({
          kind: 'config-key-missing-en',
          where: `${toPosix(file)}:${line}`,
          detail: key,
        });
      }
    }
  }
}

// Read errors during the run are a finding (exit 1), not a silent skip.
for (const ioError of IO_ERRORS) {
  violations.push({
    kind: 'io-error',
    where: ioError.where,
    detail: ioError.reason,
  });
}

// ─── Output ──────────────────────────────────────────────────────

const totalLiterals = counts.reduce((sum, c) => sum + c.count, 0);

if (AS_JSON) {
  console.log(JSON.stringify({ violations, counts, totalLiterals }, null, 2));
  process.exit(violations.length > 0 ? 1 : 0);
}

if (COUNT_ONLY) {
  for (const c of counts.sort(
    (a, b) => b.count - a.count || a.file.localeCompare(b.file)
  )) {
    console.log(`${String(c.count).padStart(4)}  ${c.file}`);
    for (const lit of c.literals) {
      console.log(
        `        ${String(lit.line).padStart(4)}  [${lit.kind}] ${lit.text}`
      );
    }
  }
  console.log(`\nTotal literal texts: ${totalLiterals}`);
  console.log(`Files checked: ${counts.length}`);
  process.exit(0);
}

console.log('=== i18n completeness gate ===');
const byKind = new Map();
for (const v of violations) {
  if (!byKind.has(v.kind)) byKind.set(v.kind, []);
  byKind.get(v.kind).push(v);
}
if (violations.length === 0) {
  console.log('OK — no violations.');
  console.log(`Literal texts in checked TSX files: ${totalLiterals}`);
  console.log(`TSX files checked: ${counts.length}`);
  process.exit(0);
}
for (const [kind, list] of byKind) {
  console.log(`\n[${kind}] ${list.length}×`);
  for (const v of list.slice(0, 40)) console.log(`  ${v.where}  ${v.detail}`);
  if (list.length > 40) console.log(`  … and ${list.length - 40} more`);
}
console.log(
  `\nTOTAL: ${violations.length} violations, ${totalLiterals} literal texts.`
);
console.log(`TSX files checked: ${counts.length}`);
process.exit(1);
