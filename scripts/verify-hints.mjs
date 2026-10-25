#!/usr/bin/env node
/**
 * Hint verification for the Phomu catalogue.
 * -------------------------------------------------------------------------
 * WHAT
 *   Checks the hints of `src/data/songs/**` against the sources that the
 *   catalogue itself names for them (`hintEvidence`). Every hint is split
 *   into its checkable claims — the years, the numbers and the proper names
 *   it states — and every claim is looked up in the text of the sources.
 *
 *   A hint whose claims are all found in the sources is `supported`.
 *   A hint with a claim that the sources do not contain is `unsupported`:
 *   it is not necessarily wrong (a source can be incomplete), but the
 *   catalogue cannot prove it, so it has to be reviewed by a human.
 *
 * WHY
 *   The spoiler censorship of the QA was measured, but the correctness of
 *   the hints was not: nobody checked whether "1985 kam der Song in die
 *   Charts" is true. A wrong hint teaches the player something wrong, and
 *   a hint without a source cannot be defended in the acceptance.
 *
 * OPTIONS
 *   --sample=<n>      number of songs to check (default 200)
 *   --seed=<n>        seed of the sample (default 20260101)
 *   --per-pack=<n>    songs per pack in the sample (overrides --sample)
 *   --out=<path>      write the JSON report there
 *   --jobs=<n>        parallel Wikipedia requests (default 2)
 *   --quiet           only print the summary
 *
 * EXAMPLE
 *   node scripts/verify-hints.mjs --sample=200 --out=report.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractClaims, verifyHint } from './lib/hint-check.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SONGS_DIR = path.join(REPO_ROOT, 'src/data/songs');
const WIKI_USER_AGENT =
  'PhomuCatalogueQA/1.0 (https://github.com/Phomu; catalogue link and hint verification) node-fetch';
/** Minimum pause between two Wikipedia requests (Wikimedia rate limit). */
const WIKI_DELAY_MS = 350;

/**
 * Read an option of the form `--name=value`.
 *
 * @param {string} name the option name
 * @param {string} fallback the value used when the option is absent
 * @returns {string} the value of the option
 */
function option(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

/**
 * Load every song of the catalogue.
 *
 * @returns {Array<object>} the songs
 */
function loadSongs() {
  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
  const songs = [];
  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));
    for (const song of parsed.songs ?? []) songs.push({ file, song });
  }
  return songs;
}

/**
 * Build the list of words that are common nouns, not proper names.
 *
 * The list is derived from the catalogue itself: a capitalised word that
 * occurs in many hints is a German common noun ("Single", "Album", "Band")
 * and never a name. The list is data driven, so it cannot miss a language
 * that the catalogue uses.
 *
 * @param {Array<object>} songs the songs
 * @returns {Set<string>} the common words
 */
function buildCommonWords(songs) {
  const counter = new Map();
  const pattern = /(?<![.!?…:;,"“”«»()\[\]])\b([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]{2,})\b/g;
  for (const { song } of songs) {
    for (const hint of song.hints ?? []) {
      for (const match of String(hint).matchAll(pattern)) {
        const word = match[1].toLowerCase();
        counter.set(word, (counter.get(word) ?? 0) + 1);
      }
    }
  }
  const threshold = Math.max(3, Math.round(songs.length / 40));
  const common = new Set();
  for (const [word, count] of counter) {
    if (count >= threshold) common.add(word);
  }
  return common;
}

/**
 * Deterministic pseudo random generator (mulberry32).
 *
 * @param {number} seed the seed
 * @returns {() => number} the generator
 */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the sample: `perPack` songs of every pack, drawn with a fixed seed.
 *
 * @param {Array<object>} songs the songs
 * @param {number} perPack the number of songs per pack
 * @param {number} seed the seed
 * @returns {Array<object>} the sample
 */
function buildSample(songs, perPack, seed) {
  const random = seededRandom(seed);
  const byPack = new Map();
  for (const entry of songs) {
    for (const pack of entry.song.packs ?? ['(without pack)']) {
      if (!byPack.has(pack)) byPack.set(pack, []);
      byPack.get(pack).push(entry);
    }
  }
  const chosen = new Map();
  for (const [pack, members] of [...byPack.entries()].sort()) {
    const pool = [...members];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const entry of pool.slice(0, perPack)) chosen.set(entry.song.id, entry);
  }
  return [...chosen.values()];
}

/**
 * Extract the Wikipedia titles of the evidence URLs of a song.
 *
 * @param {object} song the catalogue entry
 * @returns {{titles: string[], language: string, other: string[]}} the titles
 */
function evidenceTitles(song) {
  const titles = [];
  const other = [];
  let language = 'en';
  for (const url of song.hintEvidence ?? []) {
    if (!url) continue;
    let parsed = null;
    try {
      parsed = new URL(url);
    } catch {
      other.push(url);
      continue;
    }
    if (!/(^|\.)wikipedia\.org$/.test(parsed.hostname)) {
      other.push(url);
      continue;
    }
    language = parsed.hostname.split('.')[0] ?? 'en';
    const title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ''));
    if (title && !titles.includes(title)) titles.push(title);
  }
  return { titles, language, other };
}

/** The last request time, used to keep the pause between two requests. */
let lastRequest = 0;

/**
 * Wait until the next Wikipedia request is allowed.
 *
 * @returns {Promise<void>} resolves when the request may be sent
 */
async function respectRateLimit() {
  const wait = lastRequest + WIKI_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequest = Date.now();
}

/**
 * Call the Wikipedia API with a retry on the rate limit.
 *
 * @param {string} language the language code
 * @param {string} parameters the query parameters
 * @returns {Promise<object|null>} the parsed answer
 */
async function callWikipedia(language, parameters) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await respectRateLimit();
    try {
      const response = await fetch(
        `https://${language}.wikipedia.org/w/api.php?${parameters}`,
        {
          headers: { 'User-Agent': WIKI_USER_AGENT, Accept: 'application/json' },
          signal: AbortSignal.timeout(30000),
        },
      );
      if (response.status === 429 || response.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt));
        continue;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** attempt));
    }
  }
  return null;
}

/**
 * Fetch the plain text of a Wikipedia article.
 *
 * @param {string} language the language code
 * @param {string[]} titles the article titles
 * @returns {Promise<Map<string, string>>} the article texts
 */
async function fetchWikipedia(language, titles) {
  const result = new Map();
  if (!titles.length) return result;
  const parameters = `action=query&prop=extracts&explaintext=1&format=json&redirects=1&formatversion=2&titles=${encodeURIComponent(
    titles.join('|'),
  )}`;
  const parsed = await callWikipedia(language, parameters);
  for (const page of parsed?.query?.pages ?? []) {
    if (page.extract) result.set(page.title, page.extract);
  }
  return result;
}

/**
 * Search Wikipedia for an article about the song — an independent source
 * that the catalogue did not choose itself.
 *
 * @param {string} language the language code
 * @param {string} songTitle the title of the song
 * @param {string} artist the artist of the song
 * @returns {Promise<string[]>} the titles of the found articles
 */
async function searchWikipedia(language, songTitle, artist) {
  const term = `${songTitle} ${artist}`;
  const parameters = `action=query&list=search&srsearch=${encodeURIComponent(
    term,
  )}&srlimit=3&format=json&formatversion=2`;
  const parsed = await callWikipedia(language, parameters);
  return (parsed?.query?.search ?? []).map((hit) => hit.title);
}

/**
 * The main flow.
 */
async function main() {
  const sampleSize = Number(option('sample', '200'));
  const perPack = Number(option('per-pack', '0'));
  const seed = Number(option('seed', '20260101'));
  const outFile = option('out', '');
  const quiet = process.argv.includes('--quiet');

  const all = loadSongs();
  const commonWords = buildCommonWords(all);
  const selection =
    perPack > 0 ? buildSample(all, perPack, seed) : buildSample(all, Math.ceil(sampleSize / 30), seed);

  const results = [];
  let checkedHints = 0;
  let supported = 0;
  let unsupported = 0;
  let withoutSource = 0;

  for (const entry of selection) {
    const { song } = entry;
    const { titles, language, other } = evidenceTitles(song);
    const articles = await fetchWikipedia(language, titles);
    // An independent source: the Wikipedia article that the search finds for
    // the song itself. The catalogue chooses its own evidence — the search
    // does not, so the check is not circular.
    const found = await searchWikipedia(language, song.title, song.artist);
    const independent = await fetchWikipedia(language, found);
    const sourceText = [...articles.values(), ...independent.values()].join('\n');
    const hintResults = [];
    for (const [index, hint] of (song.hints ?? []).entries()) {
      checkedHints += 1;
      if (!sourceText) {
        withoutSource += 1;
        hintResults.push({
          index,
          hint,
          verdict: 'no-source',
          missing: [],
          present: [],
          claims: extractClaims(hint, commonWords),
        });
        continue;
      }
      const check = verifyHint(hint, sourceText, commonWords);
      if (check.verdict === 'supported') supported += 1;
      else unsupported += 1;
      hintResults.push({ index, hint, ...check });
    }
    results.push({
      id: song.id,
      file: entry.file,
      title: song.title,
      artist: song.artist,
      year: song.year,
      packs: song.packs,
      sourceArticles: [...articles.keys()],
      independentArticles: [...independent.keys()],
      sourceCount: articles.size,
      otherEvidence: other,
      hints: hintResults,
    });
    if (!quiet && results.length % 10 === 0) {
      process.stderr.write(`  ... ${results.length}/${selection.length}\n`);
    }
  }

  const report = {
    summary: {
      catalogueSongs: all.length,
      catalogueHints: all.reduce((sum, entry) => sum + (entry.song.hints?.length ?? 0), 0),
      sampledSongs: selection.length,
      sampledPacks: new Set(selection.flatMap((entry) => entry.song.packs ?? [])).size,
      seed,
      perPack: perPack > 0 ? perPack : Math.ceil(sampleSize / 30),
      checkedHints,
      supported,
      unsupported,
      withoutSource,
      commonWords: commonWords.size,
    },
    results,
  };
  if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(path.resolve(outFile), `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log('── Phomu hint verification ──');
  console.log(`catalogue songs        : ${report.summary.catalogueSongs}`);
  console.log(`catalogue hints        : ${report.summary.catalogueHints}`);
  console.log(`sampled songs          : ${report.summary.sampledSongs} (seed ${seed})`);
  console.log(`sampled packs          : ${report.summary.sampledPacks}`);
  console.log(`hints checked          : ${checkedHints}`);
  console.log(`supported              : ${supported}`);
  console.log(`unsupported            : ${unsupported}`);
  console.log(`without a wikipedia src: ${withoutSource}`);
  if (outFile) console.log(`report                 : ${outFile}`);
}

await main();
