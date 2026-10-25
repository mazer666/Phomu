#!/usr/bin/env node
/**
 * i18n-Vollständigkeits-Gate (CONTRACT §6)
 *
 * Prüft:
 *   1. DE/EN-Parität — jeder Schlüssel existiert in beiden Sprachen
 *      (Basis: src/i18n/locales/{de,en}.json, Teile: src/i18n/locales/parts/*.json)
 *   2. Keine leeren Werte
 *   3. Pluralformen (_one/_other/...) in beiden Sprachen identisch
 *   4. Keine unübersetzten Literaltexte mehr in den TSX-Dateien unter src/
 *
 * Aufruf:
 *   node scripts/check-i18n-completeness.mjs              # Gate (Exit 1 bei Verstoß)
 *   node scripts/check-i18n-completeness.mjs --count      # nur Zählung, Exit 0
 *   node scripts/check-i18n-completeness.mjs --files=src/components/game/**
 *   node scripts/check-i18n-completeness.mjs --json
 *   node scripts/check-i18n-completeness.mjs --root=<pfad> # anderer Baum (Negativtest)
 *
 * ── Ausnahmeliste für sichtbare Literaltexte ─────────────────────────────
 * Ein Literaltext wird NICHT als Verstoß gewertet, wenn:
 *   - er keine Buchstaben enthält (Zahlen, Symbole, Einmalezeichen: "3", "…", "—")
 *   - er exakt einem Eintrag der BRAND_ALLOWLIST entspricht (Eigennamen,
 *     die laut CONTRACT §5 in beiden Sprachen identisch bleiben)
 *   - er ein technischer Wert ist (Slug, Domain, URL, CSS-Variable, Hex-Farbe)
 *   - er innerhalb von `t(...)` / `i18n.t(...)` steht (Übersetzungsschlüssel)
 * Die Ausnahmeliste ist absichtlich eng gefasst: jeder weitere deutsche oder
 * englische Satz im JSX ist ein Verstoß.
 *
 * ── Toleranz gegenüber laufender Parallelarbeit ─────────────────────────
 * Das Gate läuft in einem Repository, in dem parallel Dateien geändert werden.
 * Deshalb:
 *   - Dateien, die während des Laufs verschwinden, werden übersprungen
 *   - halb geschriebene JSON-Dateien erzeugen einen Befund, keinen Absturz
 *   - Verzeichnis- und Dateilesefehler werden abgefangen
 * Der Exit-Code bleibt 1, sobald mindestens ein echter Verstoß vorliegt.
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
    'FEHLER: Das Paket "typescript" ist nicht installiert. ' +
      'Das i18n-Gate benötigt den TypeScript-Parser (npm ci mit devDependencies).'
  );
  process.exit(1);
}

const DEFAULT_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
/**
 * `--root=<pfad>` prueft einen anderen Baum (Standard: das Repository).
 * Dient dem isolierten Nachweis des Gates (Negativtest) und aendert das
 * Verhalten im Normalfall nicht.
 */
const rootArg = process.argv.slice(2).find((a) => a.startsWith('--root='));
const ROOT = rootArg
  ? resolve(DEFAULT_ROOT, rootArg.slice('--root='.length))
  : DEFAULT_ROOT;
const LOCALES_DIR = join(ROOT, 'src/i18n/locales');
const PARTS_DIR = join(LOCALES_DIR, 'parts');
const SRC_DIR = join(ROOT, 'src');

/**
 * Lesefehler während des Laufs (Datei verschwunden, halb geschrieben, …).
 * Sie werden als Befund gemeldet, nicht als Absturz.
 * @type {{where: string, reason: string}[]}
 */
const IO_ERRORS = [];

// ─── Optionen ─────────────────────────────────────────────────────

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

// ─── Eigennamen (bleiben identisch, laut CONTRACT §5) ─────────────

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

// ─── Datei-Sammlung ───────────────────────────────────────────────

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    IO_ERRORS.push({
      where: toPosix(dir),
      reason: `Verzeichnis nicht lesbar: ${error.code ?? error.message}`,
    });
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      // Datei wurde zwischen readdir und stat entfernt -> ueberspringen
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

// ─── Lokalen laden ────────────────────────────────────────────────

/** Flacht ein Objekt zu Punktpfad-Schlüsseln (rekursiv). */
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

/** Lädt eine Sprachdatei (flach oder verschachtelt) zu Punktpfaden. */
function loadLocale(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    IO_ERRORS.push({
      where: toPosix(file),
      reason: `Datei nicht lesbar: ${error.code ?? error.message}`,
    });
    return {};
  }
  try {
    return flatten(JSON.parse(raw));
  } catch (error) {
    IO_ERRORS.push({
      where: toPosix(file),
      reason: `JSON nicht parsebar: ${error.message}`,
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
    // Teile kommen als <namespace>.<lang>.json oder <namespace>.<lang>.json-Muster
    const byLang = { de: [], en: [] };
    for (const file of partFiles) {
      const m = file.match(/^(.+)\.(de|en)\.json$/);
      if (m) {
        byLang[m[2]].push({ ns: m[1], file });
      } else {
        // Fallback: <namespace>.<lang>.json nicht vorhanden -> Datei als eigene Menge
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

// ─── Literaltext-Erkennung (TypeScript-AST) ───────────────────────

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
 * Erkennt einen ISO-Code (Sprache ISO-639-1 / Land ISO-3166 alpha-2/3),
 * z. B. "DE", "EN", "US". Codes sind in beiden Sprachen identisch und
 * therefore kein uebersetzungsbeduerftiger Text.
 * @param {string} text
 */
function isIsoCode(text) {
  return /^[A-Z]{2,3}$/.test(text.trim());
}

/**
 * Erkennt eine Liste technischer Bezeichner, z. B. "timeline, hint-master, ...".
 * Alle Tokens sind Slugs oder reine Satzzeichen.
 *
 * Bewusst eng gefasst: ein einzelnes kurzes Wort ohne Trennzeichen
 * ("L", "OK") ist sichtbarer Text und wird NICHT als Bezeichner gewertet.
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
 * Lädt die Packnamen aus dem Katalog. Packnamen sind Eigennamen des
 * Datensatzes (z. B. "Global Hits 1950-2026") und in beiden Sprachen
 * identisch.
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
    // Katalogdatei nicht lesbar -> keine Ausnahme, das Gate meldet den Fehler separat
  }
  return names;
}

const PACK_NAMES = loadPackNames();

/**
 * CSS-Utility-Praefixe (Tailwind). Eine Liste, in der *alle* Tokens
 * technisch sind und *mindestens* eines dieser Praefixe traegt, ist eine
 * Klassenliste und kein sichtbarer Text.
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
 * Erkennt eine CSS-Klassenliste (z. B. "-translate-x-1/2 mb-2 bottom-full").
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
 * Erkennt einen Pfad bzw. eine Route (z. B. "/game", "/favicon.png").
 * @param {string} text
 * @returns {boolean}
 */
function isPathLike(text) {
  return /^\/[A-Za-z0-9._\-/]*$/.test(text.trim());
}

/**
 * Zeichenbereiche, die ausschliesslich Symbole, Piktogramme oder
 * Emoji enthalten (Letterlike Symbols, Misc Symbols, Arrows, Emoji).
 */
const SYMBOL_RANGES = /[ -⯿‌️\u{1F000}-\u{1FAFF}]/gu;

/**
 * Prueft, ob der Text nur aus Symbolen/Piktogrammen besteht.
 * Solche Zeichen sind laut CONTRACT §5 in beiden Sprachen identisch
 * und damit kein uebersetzungsbeduerftiger Text.
 * @param {string} text
 * @returns {boolean}
 */
function isSymbolOnly(text) {
  return text.replace(SYMBOL_RANGES, '').replace(/\s+/g, '').length === 0;
}

/**
 * Dateiendungen. Ein Wert mit einer dieser Endungen ist ein Dateiname und
 * damit potenziell sichtbarer Text (z. B. "PRIVACY.md" als Linktext) — er
 * darf nicht ueber die Domain-Ausnahme verschwinden.
 */
const FILE_EXTENSION =
  /\.(md|markdown|txt|json|ya?ml|toml|ts|tsx|js|jsx|mjs|css|html?|png|jpe?g|gif|svg|webp|ico|pdf|zip|lock|csv)$/i;

function looksLikeUiText(text) {
  if (!text) return false;
  // Nur Zeichen mit Gross-/Kleinschreibung sind Text. Damit fallen reine
  // Symbole (z. B. "ℹ️") und Ziffern weg — genau wie im CONTRACT §5
  // ("Eigennamen, Zahlen, Symbole bleiben identisch").
  if (!/[\p{Lu}\p{Ll}]/u.test(text)) return false;
  if (isSymbolOnly(text)) return false;
  if (isSlugLike(text)) return false;
  if (BRAND_ALLOWLIST.has(text.trim().toLowerCase())) return false;
  if (PACK_NAMES.has(text.trim())) return false;
  // Technische Werte (Domains, URLs, CSS-Variablen) sind keine UI-Texte
  // Achtung: Dateinamen (z. B. "PRIVACY.md" als Linktext) sind sichtbarer
  // Text und werden deshalb NICHT ueber die Domain-Regel ausgenommen.
  if (
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(text.trim()) &&
    !FILE_EXTENSION.test(text.trim())
  ) {
    return false;
  }
  if (text.includes('://')) return false;
  if (/^var\(--/.test(text.trim())) return false;
  // Hex-Farben
  if (/^#[0-9a-f]{3,8}$/i.test(text.trim())) return false;
  // CSS-Klassenlisten und Routen/Pfade sind technische Werte
  if (isCssClassList(text)) return false;
  if (isPathLike(text)) return false;
  // ISO-Sprach-/Laendercodes sind Bezeichner, kein Text
  if (isIsoCode(text)) return false;
  // Listen technischer Bezeichner
  if (isIdentifierList(text)) return false;
  return true;
}

/** Nur aus HTML-Entities bestehender Text (z. B. &middot;) ist kein UI-Text. */
function isEntityOnly(text) {
  const stripped = text.replace(/&[a-z]+;|&#\d+;/gi, '').trim();
  return stripped.length === 0;
}

/** Prüft, ob ein String-Literal als Argument von t()/i18n.t() benutzt wird. */
function isTranslationCallLiteral(node) {
  const parent = node.parent;
  if (!parent || !ts.isCallExpression(parent)) return false;
  const callee = parent.expression;
  if (ts.isIdentifier(callee)) return callee.text === 't';
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text === 't';
  return false;
}

/**
 * Sammelt Literaltexte eines TSX-Files.
 * @returns {{line: number, text: string, kind: string}[]}
 */
function scanLiterals(file) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch (error) {
    // Datei wurde waehrend des Laufs entfernt -> ueberspringen, nicht crashen
    IO_ERRORS.push({
      where: toPosix(file),
      reason: `Datei nicht lesbar: ${error.code ?? error.message}`,
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

  /** String-Literale in einem Ausdruck (mit Ausnahme von t()-Argumenten). */
  const collectFromExpression = (node) => {
    // Attribute (className, style, …) enthalten keine UI-Texte
    if (ts.isJsxAttribute(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isTranslationCallLiteral(node)) report(node, 'expression');
      return;
    }
    ts.forEachChild(node, collectFromExpression);
  };

  /** String-Literale in einer UI-Tabelle (Array-/Objektliteral). */
  const collectFromTable = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isTranslationCallLiteral(node)) report(node, 'table');
      return;
    }
    if (ts.isTemplateExpression(node)) {
      // Template mit Platzhaltern: nur melden, wenn der Text natürlichsprachig wirkt
      const raw = node.getText(sf).replace(/`/g, '');
      const stripped = raw.replace(/\$\{[^}]*\}/g, ' ').trim();
      // Technische ID-Praefixe (z. B. `draft-${id}`) sind kein sichtbarer Text
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
    // Farbdefinitionen ({ name: 'Phomu Blue', value: '#118AB2' }) sind
    // technische Palette-Eintraege. Der Name wird nie gerendert, sondern
    // nur der Hex-Wert als CSS-Farbe gesetzt.
    if (ts.isObjectLiteralExpression(node) && isColorDefinition(node)) {
      return;
    }
    ts.forEachChild(node, collectFromTable);
  };

  /**
   * Prüft, ob ein Objektliteral eine Farbdefinition ist (Hex-Farbe).
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

  /** Prüft, ob ein Knoten eine UI-Tabelle ist (Array-/Objektliteral). */
  const isTableLiteral = (node) =>
    ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node);

  const visit = (node) => {
    // 1. JSX-Textknoten
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

    // 2. Benutzer-sichtbare Attribute
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

    // 3. JSX-Ausdrücke als Kind (String-Literale in Bedingungen usw.)
    //    Nur Kind-Ausdrücke — Attribut-Ausdrücke (className, style) sind kein UI-Text.
    if (ts.isJsxExpression(node) && node.expression) {
      const parent = node.parent;
      const isChildExpression =
        parent && (ts.isJsxElement(parent) || ts.isJsxFragment(parent));
      if (isChildExpression) collectFromExpression(node.expression);
    }

    // 4. UI-Tabellen: const x = [...] | const x = {...} | const x = useMemo(() => [...])
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

/** Alle TSX-Dateien, die in den Scope passen. */
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

// ─── Gate ─────────────────────────────────────────────────────────

const violations = [];
const counts = [];

// Die beiden Basissprachdateien müssen existieren — sonst ist die Paritaet
// nicht pruefbar und das Gate waere aussagelos.
for (const required of ['de.json', 'en.json']) {
  if (!existsSync(join(LOCALES_DIR, required))) {
    violations.push({
      kind: 'locale-missing',
      where: `src/i18n/locales/${required}`,
      detail: 'Sprachdatei fehlt',
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

  // Pluralformen müssen in beiden Sprachen identisch vorhanden sein
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

// Leere Werte (nur für Basis-Dateien und Teile)
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
        detail: `${key} (leeres Array)`,
      });
    }
  }
}

// Literaltexte in TSX
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

// Lesefehler waehrend des Laufs sind ein Befund (Exit 1), kein stiller Skip.
for (const ioError of IO_ERRORS) {
  violations.push({
    kind: 'io-error',
    where: ioError.where,
    detail: ioError.reason,
  });
}

// ─── Ausgabe ──────────────────────────────────────────────────────

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
  console.log(`\nSumme Literaltexte: ${totalLiterals}`);
  console.log(`Dateien geprüft: ${counts.length}`);
  process.exit(0);
}

console.log('=== i18n-Vollständigkeits-Gate ===');
const byKind = new Map();
for (const v of violations) {
  if (!byKind.has(v.kind)) byKind.set(v.kind, []);
  byKind.get(v.kind).push(v);
}
if (violations.length === 0) {
  console.log('OK — keine Verstöße.');
  console.log(`Literaltexte in geprüften TSX-Dateien: ${totalLiterals}`);
  console.log(`Geprüfte TSX-Dateien: ${counts.length}`);
  process.exit(0);
}
for (const [kind, list] of byKind) {
  console.log(`\n[${kind}] ${list.length}×`);
  for (const v of list.slice(0, 40)) console.log(`  ${v.where}  ${v.detail}`);
  if (list.length > 40) console.log(`  … und ${list.length - 40} weitere`);
}
console.log(
  `\nGESAMT: ${violations.length} Verstöße, ${totalLiterals} Literaltexte.`
);
console.log(`Geprüfte TSX-Dateien: ${counts.length}`);
process.exit(1);
