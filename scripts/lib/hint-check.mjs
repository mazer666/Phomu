/**
 * Claim extraction and claim checking for the hints of the Phomu catalogue.
 * -------------------------------------------------------------------------
 * WHAT
 *   Pure functions that split a hint into its checkable claims (years,
 *   numbers, proper names) and compare those claims with the text of the
 *   source that the catalogue itself names for the hint.
 *
 * WHY
 *   The spoiler censorship was measured — 3 of 7,785 hints still name the
 *   artist. The other half was never checked: are the hints *true*? A hint
 *   like "1985 kam der Song in die Charts" has to be right, otherwise the
 *   game teaches the player something wrong.
 *
 *   A full semantic check of every hint is not possible without a language
 *   model. What *is* possible — and what this module does — is to check the
 *   factual claims that a hint states: the years it names, the numbers it
 *   names and the proper names it names. A claim that does not appear in the
 *   source is not necessarily false (the source can be incomplete), but it
 *   is a claim that the catalogue cannot prove, and it has to be reviewed.
 *
 * EXAMPLE
 *   import { extractClaims, verifyHint } from './lib/hint-check.mjs';
 *
 *   extractClaims('1985 kam der Song in die Charts', commonWords);
 *   // => { years: ['1985'], numbers: [], names: [] }
 *
 *   verifyHint(hint, 'Der Song erreichte 1985 die Charts', commonWords);
 *   // => { verdict: 'supported', missing: [] }
 */

/** Words that never carry a claim of their own. */
const SENTENCE_END = /[.!?…:;,"“”«»()\[\]]/;

/**
 * Split a hint into its checkable claims.
 *
 * @param {string} hint the hint text
 * @param {Set<string>} commonWords words that are common nouns, not names
 * @returns {{years: string[], numbers: string[], names: string[]}} the claims
 */
export function extractClaims(hint, commonWords) {
  const text = String(hint ?? '');
  const years = [...new Set(text.match(/\b(?:1[6-9]\d{2}|20[0-2]\d)\b/g) ?? [])];

  const numbers = [];
  for (const raw of text.match(/\b\d[\d.]*\b/g) ?? []) {
    if (years.includes(raw)) continue;
    const normalized = raw.replace(/\.(?=\d{3}\b)/g, '').replace(/[.,]$/, '');
    if (!/^\d+$/.test(normalized)) continue;
    if (normalized.length < 2) continue;
    numbers.push(normalized);
  }

  const names = [];
  const withoutSentences = text.split(SENTENCE_END);
  for (const part of withoutSentences) {
    const words = part.split(/\s+/);
    for (const [index, word] of words.entries()) {
      const cleaned = word.replace(/[^\p{L}\p{N}'-]/gu, '');
      if (cleaned.length < 4) continue;
      if (!/^\p{Lu}/u.test(cleaned)) continue;
      // The first word of a sentence is capitalised in German as well —
      // it carries no information about a name.
      if (index === 0) continue;
      if (commonWords.has(cleaned.toLowerCase())) continue;
      if (names.includes(cleaned)) continue;
      names.push(cleaned);
    }
  }

  return { years: [...new Set(years)], numbers: [...new Set(numbers)], names };
}

/**
 * Normalise a text for the search of a name.
 *
 * @param {string} value the text
 * @returns {string} the normalised text
 */
function normalizeForSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Check the claims of a hint against the text of its sources.
 *
 * @param {string} hint the hint text
 * @param {string} sourceText the concatenated text of the sources
 * @param {Set<string>} commonWords words that are common nouns, not names
 * @returns {{verdict: string, claims: object, missing: string[], present: string[]}} the result
 */
export function verifyHint(hint, sourceText, commonWords) {
  const claims = extractClaims(hint, commonWords);
  const haystack = normalizeForSearch(sourceText);
  const haystackNumbers = new Set(
    [...String(sourceText ?? '').matchAll(/\b\d[\d.]*\b/g)].map((match) =>
      match[0].replace(/\.(?=\d{3}\b)/g, '').replace(/[.,]$/, ''),
    ),
  );

  const missing = [];
  const present = [];
  for (const year of claims.years) {
    if (haystack.includes(year)) present.push(`year ${year}`);
    else missing.push(`year ${year}`);
  }
  for (const number of claims.numbers) {
    if (haystackNumbers.has(number)) present.push(`number ${number}`);
    else missing.push(`number ${number}`);
  }
  for (const name of claims.names) {
    const needle = normalizeForSearch(name);
    if (needle && haystack.includes(needle)) present.push(`name ${name}`);
    else missing.push(`name ${name}`);
  }

  const verdict = missing.length === 0 ? 'supported' : 'unsupported';
  return { verdict, claims, missing, present };
}
