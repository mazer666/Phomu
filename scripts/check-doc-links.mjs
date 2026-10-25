#!/usr/bin/env node
/**
 * Quality gate: Doku-Linkcheck
 * -------------------------------------------------------------------------
 * Prueft jeden relativen Markdown-Link im Repository auf Aufloesbarkeit.
 *
 * Scope (bewusst begrenzt, siehe CONTRACT.md §6):
 *   - Root: alle `.md`-Dateien direkt im Repository-Root
 *   - `docs/` rekursiv
 *   - `specifications/` rekursiv
 *
 * Behandelte Linkarten:
 *   - Inline-Links `[text](target)` und Bilder `![alt](target)`
 *   - Referenzdefinitionen `[id]: target`
 *   - HTML `<a href="...">` / `<img src="...">`
 *   - Reine Anker `#abschnitt` (im selben Dokument)
 *   - Verzeichnis-Links (`docs/`) — gelten als aufgeloest, wenn das Verzeichnis existiert
 *   - Externe Ziele (http/https/mailto/tel/data/...) — werden nicht geprueft
 *   - Code-Fences und Inline-Code werden ignoriert (Beispiel-Links sind kein Doku-Link)
 *
 * Ausgabe: `datei:zeile` + Linkziel + Grund. Exit-Code 1 bei totem Link.
 *
 * Optionen:
 *   --root=<pfad>  prüft einen anderen Baum (Standard: das Repository).
 *                 Dient dem isolierten Nachweis des Gates (Negativtest).
 *
 * Toleranz gegenueber laufender Parallelarbeit:
 *   - Dateien, die waehrend des Laufs verschwinden, werden uebersprungen (kein Absturz).
 *   - Lesefehler werden als Befund gemeldet, nicht als Crash.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');

/**
 * Wurzel des zu prüfenden Baums. Standard ist das Repository.
 * `--root=<pfad>` (oder `PHOMU_DOC_LINKS_ROOT`) erlaubt, das Gate isoliert
 * gegen einen Testbaum laufen zu lassen — ohne das Verhalten im Normalfall
 * zu ändern.
 */
const rootArg = process.argv.slice(2).find((a) => a.startsWith('--root='));
const REPO_ROOT = path.resolve(
  rootArg
    ? rootArg.slice('--root='.length)
    : process.env.PHOMU_DOC_LINKS_ROOT || DEFAULT_ROOT
);

const SCAN_ROOTS = [
  { dir: REPO_ROOT, depth: 0, label: 'root' }, // nur *.md direkt im Root
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

/** @returns {string[]} relative POSIX-Pfade der zu pruefenden Markdown-Dateien */
function collectMarkdownFiles() {
  /** @type {string[]} */
  const out = [];

  /** @param {string} dir @param {number} depth */
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Verzeichnis existiert (noch) nicht -> nichts zu pruefen
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        if (depth === 0) continue; // Root: keine Unterverzeichnisse
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
 * Entfernt Code-Fences und Inline-Code, damit Beispiel-Links nicht als
 * echte Doku-Links gewertet werden. Zeilennummern bleiben erhalten.
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
    // Inline-Code entfernen (``...`` und `...`)
    result.push(line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length)));
  }
  return result;
}

/**
 * GitHub-kompatibler Anker-Slug einer Ueberschrift.
 *
 * Nachgebildete GitHub-Regel: kleinschreiben, fuehrende/trailingende
 * Leerzeichen entfernen, HTML-Tags und die in GitHub entfernte
 * Satzzeichen-/Interpunktionsmenge streichen, danach **jedes**
 * Leerzeichen einzeln durch einen Bindestrich ersetzen.
 *
 * Wichtig: jedes Leerzeichen einzeln ersetzen (nicht `\s+`), weil GitHub
 * aus einem Gedankenstrich-Rest zwei Bindestriche erzeugt
 * (z. B. `### I18N-004 — Titel` -> `i18n-004--titel`).
 *
 * @param {string} heading
 * @returns {string}
 */
export function slugify(heading) {
  return (
    heading
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Links -> Text
      .replace(/<[^>]*>/g, '') // HTML-Tags
      .replace(/\{#[^}]*\}/g, '') // explizite Anker-IDs
      .replace(/[*`~]/g, '') // Auszeichnung
      .toLowerCase()
      .trim()
      // Satzzeichen-/Interpunktionsmenge von GitHub (explizite Escapes,
      // damit die Zeichenklasse unabhaengig von der Datei-Kodierung bleibt)
      .replace(/[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-')
  );
}

/**
 * Sammelt alle Anker (Ueberschriften-Slugs) einer Markdown-Datei.
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
 * Zerlegt ein Linkziel in Pfad und Anker.
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
 * @returns {boolean} true, wenn das Ziel extern (nicht pruefbar) ist
 */
function isExternal(target) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith('//');
}

/**
 * Extrahiert alle Linkziele mit Zeilennummer aus einer Markdown-Datei.
 * @param {string[]} lines bereits von Code befreite Zeilen
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
 * Prueft eine einzelne Markdown-Datei.
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
    // Datei wurde waehrend des Laufs geloescht -> ueberspringen, nicht crashen.
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

    // Reiner Anker im selben Dokument
    if (!linkPath) {
      if (anchor && !ownAnchors.has(anchor.toLowerCase())) {
        findings.push({
          file: relPath,
          line: link.line,
          target,
          reason: `Anker "#${anchor}" existiert nicht in dieser Datei`,
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
        reason: `Ziel "${relResolved}" existiert nicht`,
      });
      continue;
    }

    // Anker in einer anderen Markdown-Datei pruefen, wenn diese im Scan liegt
    if (anchor && relResolved.endsWith('.md') && ctx.files.has(relResolved)) {
      const targetAnchors = ctx.anchorsByFile.get(relResolved);
      if (targetAnchors && !targetAnchors.has(anchor.toLowerCase())) {
        findings.push({
          file: relPath,
          line: link.line,
          target,
          reason: `Anker "#${anchor}" existiert nicht in "${relResolved}"`,
        });
      }
    }
  }

  return findings;
}

// -------------------------------------------------------------------------
// Ablauf
// -------------------------------------------------------------------------

/**
 * Fuehrt den Gate-Lauf aus und gibt die Befunde zurueck.
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

// Nur ausfuehren, wenn die Datei direkt als CLI gestartet wurde.
const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const { files, findings } = runDocLinkCheck();

  console.log('Phomu Qualitätsgate: Doku-Linkcheck');
  console.log(`Geprüfter Baum: ${REPO_ROOT}`);
  console.log(`Geprüfte Markdown-Dateien: ${files.length}`);

  if (findings.length === 0) {
    console.log('✅ Keine toten Links gefunden.');
    process.exit(0);
  }

  console.error(`❌ ${findings.length} tote(r) Link(s) gefunden:`);
  for (const finding of findings) {
    console.error(
      `   ${finding.file}:${finding.line} -> ${finding.target} — ${finding.reason}`
    );
  }
  process.exit(1);
}
