#!/usr/bin/env node
/**
 * Generates the string resources of the Android shell from the locale files
 * of the web shell.
 *
 * WHAT: `src/i18n/locales/de.json` and `src/i18n/locales/en.json` become
 * `values/strings.xml` (German, the default of the shell) and
 * `values-en/strings.xml` (English) of the Android resources.
 *
 * WHY: the texts of the product live in one place — the locale files of the
 * repository. A second, hand-maintained translation table in the shell would
 * be a second truth, and requirement SHELL-110 demands the same key set in
 * every shell. The resources are therefore *generated*, never edited by hand
 * (docs/design/BUILD-CONTRACT.md § 6.1, rule L-4).
 *
 * The mapping of a key onto a resource name:
 *
 *   `game.feedback.correct`  →  `game_feedback_correct`
 *   `modes.hint-master.name` →  `modes_hint_master_name`
 *
 * WHY the case is preserved: the key space contains `modes.hintMaster` and
 * `modes.hint-master` at the same time. Lowercasing the name would map both
 * onto `modes_hint_master_…` and the second one would overwrite the first.
 * The script fails when two keys map onto the same resource name.
 *
 * The placeholders of the web shell (`{{count}}`) become the positional
 * format specifiers of Android (`%1$s`), because Android has no named
 * placeholders in string resources.
 *
 * Usage:
 *   node scripts/generate-strings.mjs --german <de.json> --english <en.json> --out <dir>
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** The suffixes that mark the plural forms of a key. */
const PLURAL_SUFFIXES = ['_one', '_other'];

/**
 * Reads the arguments of the script.
 *
 * @param {string[]} argv the arguments of the process
 * @returns {{german: string, english: string, out: string, kotlin: string|null}} the paths
 */
function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) continue;
    const name = argument.slice(2);
    const value = argv[index + 1];
    if (value === undefined) {
      throw new Error(`the argument ${argument} has no value`);
    }
    values.set(name, value);
    index += 1;
  }
  const german = values.get('german');
  const english = values.get('english');
  const out = values.get('out');
  if (!german || !english || !out) {
    throw new Error(
      'the arguments --german, --english and --out are required',
    );
  }
  return { german, english, out, kotlin: values.get('kotlin') ?? null };
}

/**
 * Flattens a locale file into its leaf keys.
 *
 * WHY the leaves only: a key that has children is a group and has no text of
 * its own.
 *
 * @param {Record<string, unknown>} tree the parsed locale file
 * @param {string} prefix the prefix of the current group
 * @param {Map<string, string>} into the accumulator
 */
function flatten(tree, prefix, into) {
  for (const [name, value] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (value !== null && typeof value === 'object') {
      flatten(value, key, into);
    } else if (typeof value === 'string') {
      into.set(key, value);
    } else {
      throw new Error(`the key ${key} is not a string but a ${typeof value}`);
    }
  }
}

/**
 * The resource name of a key.
 *
 * @param {string} key the key of the locale file
 * @returns {string} the name of the Android resource
 */
export function resourceName(key) {
  return key.replace(/[.\-]/g, '_');
}

/**
 * Escapes a text for an Android string resource.
 *
 * WHY the double quotes: a value that starts and ends with a double quote is
 * a quoted string — the apostrophes inside it are literal and the
 * whitespace is preserved. Without the quotes an apostrophe would end the
 * string and the build would fail.
 *
 * @param {string} text the text of the locale file
 * @returns {string} the escaped text
 */
function escapeText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Converts the placeholders of the web shell into the format specifiers of
 * Android.
 *
 * @param {string} text the text of the locale file
 * @returns {string} the text with the format specifiers of Android
 */
function convertPlaceholders(text) {
  const indices = new Map();
  let counter = 0;
  return text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, name) => {
    if (!indices.has(name)) {
      counter += 1;
      indices.set(name, counter);
    }
    return `%${indices.get(name)}$s`;
  });
}

/**
 * Escapes the percent signs that are not the beginning of a format
 * specifier.
 *
 * WHY only when the text has a placeholder: Android applies the format of
 * the string only when it is read with arguments. A text without a
 * placeholder is read without arguments, and a doubled percent sign would
 * then be visible in the interface.
 *
 * @param {string} text the text with the format specifiers of Android
 * @returns {string} the text with the escaped percent signs
 */
function escapePercent(text) {
  if (!/%\d+\$s/.test(text)) {
    return text;
  }
  return text.replace(/%(?!\d+\$s)/g, '%%');
}

/**
 * Renders one string resource.
 *
 * @param {string} name the name of the resource
 * @param {string} value the text of the locale file
 * @returns {string} the XML element
 */
function renderString(name, value) {
  const converted = convertPlaceholders(value);
  return `    <string name="${name}">"${escapeText(escapePercent(converted))}"</string>`;
}

/**
 * Splits the leaf keys into the singular keys and the plural groups.
 *
 * @param {Map<string, string>} leaves the leaf keys of a locale file
 * @returns {{singular: Map<string, string>, plurals: Map<string, Map<string, string>>}}
 */
export function splitPlurals(leaves) {
  const singular = new Map();
  const plurals = new Map();
  for (const [key, value] of leaves) {
    const suffix = PLURAL_SUFFIXES.find((candidate) => key.endsWith(candidate));
    if (!suffix) {
      singular.set(key, value);
      continue;
    }
    const base = key.slice(0, key.length - suffix.length);
    const group = plurals.get(base) ?? new Map();
    group.set(suffix.slice(1), value);
    plurals.set(base, group);
  }
  for (const [base, group] of plurals) {
    for (const suffix of PLURAL_SUFFIXES) {
      if (!group.has(suffix.slice(1))) {
        throw new Error(
          `the plural key ${base} has the form ${suffix.slice(1)} but not the other form`,
        );
      }
    }
  }
  return { singular, plurals };
}

/**
 * Checks that no two keys map onto the same resource name.
 *
 * @param {Map<string, string>} leaves the leaf keys of a locale file
 */
export function assertNoCollisions(leaves) {
  const owners = new Map();
  for (const key of leaves.keys()) {
    const name = resourceName(key);
    const owner = owners.get(name);
    if (owner !== undefined) {
      throw new Error(
        `the keys ${owner} and ${key} map onto the resource name ${name}`,
      );
    }
    owners.set(name, key);
  }
}

/**
 * Writes the resources of one locale.
 *
 * @param {string} directory the directory the `values` folder is written into
 * @param {string} qualifier the qualifier of the resource folder, for example
 *   `-en` for English
 * @param {Map<string, string>} leaves the leaf keys of the locale file
 */
function writeLocale(directory, qualifier, leaves) {
  const folder = path.join(directory, `values${qualifier}`);
  fs.mkdirSync(folder, { recursive: true });
  const { singular, plurals } = splitPlurals(leaves);
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!--',
    '  GENERATED FILE — DO NOT EDIT.',
    '',
    '  The file is written by apps/android/scripts/generate-strings.mjs out of',
    '  the locale files of the web shell. The texts live there; a hand edit',
    '  here is overwritten by the next build.',
    '-->',
    '<resources>',
  ];
  for (const key of [...singular.keys()].sort()) {
    lines.push(renderString(resourceName(key), singular.get(key)));
  }
  for (const base of [...plurals.keys()].sort()) {
    const group = plurals.get(base);
    lines.push(`    <plurals name="${resourceName(base)}">`);
    for (const suffix of PLURAL_SUFFIXES) {
      const form = suffix.slice(1);
      const text = group.get(form);
      const converted = convertPlaceholders(text);
      lines.push(
        `        <item quantity="${form}">"${escapeText(escapePercent(converted))}"</item>`,
      );
    }
    lines.push('    </plurals>');
  }
  lines.push('</resources>');
  lines.push('');
  fs.writeFileSync(path.join(folder, 'strings.xml'), lines.join('\n'));
  return { singular: singular.size, plurals: plurals.size };
}

/**
 * Writes the Kotlin projection of the key space.
 *
 * WHY the projection exists: the shell resolves the keys of the base — the
 * message key of a failure, the tagline key of a pack, the key of a game
 * event — at run time, and the resource of a key cannot be named in the
 * source. The projection maps every key onto its resource, and it keeps the
 * resources alive for the resource shrinker of the release build.
 *
 * @param {string} file the path of the Kotlin file
 * @param {Map<string, string>} leaves the leaf keys of the locale file
 */
function writeKotlinProjection(file, leaves) {
  const { singular, plurals } = splitPlurals(leaves);
  const lines = [
    'package de.phomu.config',
    '',
    'import de.phomu.R',
    '',
    '/**',
    ' * GENERATED FILE — DO NOT EDIT.',
    ' *',
    ' * The file is written by apps/android/scripts/generate-strings.mjs out of',
    ' * the locale files of the web shell. The texts live there; a hand edit',
    ' * here is overwritten by the next build.',
    ' */',
    'object GeneratedStrings {',
    '',
    '    /**',
    '     * The resource of every key of the key space.',
    '     *',
    '     * @param id the identifier of the Android resource',
    '     * @param isPlural whether the resource is a plural',
    '     * @param placeholderCount the number of the placeholders of the text',
    '     */',
    '    data class Entry(',
    '        val id: Int,',
    '        val isPlural: Boolean,',
    '        val placeholderCount: Int,',
    '    )',
    '',
    '    /** The resource of every key of the key space. */',
    '    val resources: Map<String, Entry> = mapOf(',
  ];
  for (const key of [...singular.keys()].sort()) {
    const count = (singular.get(key).match(/\{\{\s*[A-Za-z0-9_]+\s*\}\}/g) ?? []).length;
    lines.push(
      `        "${key}" to Entry(R.string.${resourceName(key)}, false, ${count}),`,
    );
  }
  for (const base of [...plurals.keys()].sort()) {
    const group = plurals.get(base);
    const sample = group.get('one') ?? '';
    const count = (sample.match(/\{\{\s*[A-Za-z0-9_]+\s*\}\}/g) ?? []).length;
    lines.push(
      `        "${base}" to Entry(R.plurals.${resourceName(base)}, true, ${count}),`,
    );
  }
  lines.push('    )');
  lines.push('}');
  lines.push('');

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n'));
}

/**
 * Runs the generator.
 *
 * @param {string[]} argv the arguments of the process
 */
function main(argv) {
  const { german, english, out, kotlin } = parseArguments(argv);
  const germanLeaves = new Map();
  const englishLeaves = new Map();
  flatten(JSON.parse(fs.readFileSync(german, 'utf8')), '', germanLeaves);
  flatten(JSON.parse(fs.readFileSync(english, 'utf8')), '', englishLeaves);

  assertNoCollisions(germanLeaves);
  assertNoCollisions(englishLeaves);

  const germanKeys = [...germanLeaves.keys()].sort();
  const englishKeys = [...englishLeaves.keys()].sort();
  const missingInEnglish = germanKeys.filter((key) => !englishLeaves.has(key));
  const missingInGerman = englishKeys.filter((key) => !germanLeaves.has(key));
  if (missingInEnglish.length > 0 || missingInGerman.length > 0) {
    throw new Error(
      'the locale files do not have the same key set; ' +
        `missing in English: ${missingInEnglish.join(', ')}; ` +
        `missing in German: ${missingInGerman.join(', ')}`,
    );
  }

  fs.mkdirSync(out, { recursive: true });
  const germanCounts = writeLocale(out, '', germanLeaves);
  const englishCounts = writeLocale(out, '-en', englishLeaves);
  if (kotlin) {
    writeKotlinProjection(kotlin, germanLeaves);
  }

  process.stdout.write(
    `generate-strings: ${germanCounts.singular} strings, ` +
      `${germanCounts.plurals} plurals (de); ` +
      `${englishCounts.singular} strings, ${englishCounts.plurals} plurals (en)\n`,
  );
}

main(process.argv.slice(2));
