#!/usr/bin/env node
/**
 * The catalogue artefact of the web shell.
 * -------------------------------------------------------------------------
 * WHAT IT DOES
 *   1. It reads the pack files of the catalogue (`src/data/songs/*.json`) in
 *      the order of the generated index (`src/data/songs/index.ts`).
 *   2. It writes the songs as one JSON document and compresses it with gzip.
 *   3. It writes the artefact to `public/data/catalogue.json.gz` and a
 *      manifest with the numbers of the catalogue to
 *      `public/data/catalogue.manifest.json`.
 *
 * WHY
 *   The catalogue is the answer key of the game: 1,557 title/artist pairs
 *   and 5,988 lyric lines. As a bundled import it ends up in the JavaScript
 *   chunk of the game page, and every round becomes solvable offline
 *   (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
 *
 *   As a compressed artefact the catalogue travels to the browser as data
 *   and not as bundled logic, and only the Rust base reads it: the shell
 *   inflates nothing and never holds a title, an artist or a lyric line.
 *
 * USAGE
 *   node scripts/build-catalogue.mjs
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SONGS_DIR = path.join(REPO_ROOT, 'src', 'data', 'songs');
const INDEX_FILE = path.join(SONGS_DIR, 'index.ts');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'data');
const OUT_FILE = path.join(OUT_DIR, 'catalogue.json.gz');
const MANIFEST_FILE = path.join(OUT_DIR, 'catalogue.manifest.json');

/**
 * The pack files of the catalogue, in the order of the generated index.
 *
 * WHY the order of the index: the catalogue of the shell and the catalogue
 * of the base must be the same list — the same song has to have the same
 * index in both.
 *
 * @returns {string[]} The file names of the packs.
 */
function packFiles() {
  const index = fs.readFileSync(INDEX_FILE, 'utf8');
  const names = [...index.matchAll(/from '\.\/([^']+)\.json'/g)].map(
    (match) => match[1]
  );
  if (names.length === 0) {
    throw new Error(`no pack files found in ${INDEX_FILE}`);
  }
  return names;
}

/**
 * Reads the songs of the catalogue.
 *
 * @returns {Record<string, unknown>[]} The songs of the catalogue.
 */
function readSongs() {
  const songs = [];
  for (const name of packFiles()) {
    const file = path.join(SONGS_DIR, `${name}.json`);
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entries = Array.isArray(pack.songs) ? pack.songs : [];
    songs.push(...entries);
  }
  return songs;
}

/**
 * Counts the lyric lines of the catalogue.
 *
 * WHY the number matters: the lyric lines are what makes the Lyrics
 * Labyrinth solvable offline. The manifest names them so that the change is
 * measurable (docs/qa/QA-10-EVIDENCE-LOG.md).
 *
 * @param {Record<string, unknown>[]} songs - The songs of the catalogue.
 * @returns {{real: number, fake: number}} The number of the lines.
 */
function countLyrics(songs) {
  let real = 0;
  let fake = 0;
  for (const song of songs) {
    const lyrics = song?.lyrics;
    if (!lyrics) continue;
    if (Array.isArray(lyrics.real)) real += lyrics.real.length;
    if (typeof lyrics.fake === 'string') fake += 1;
    else if (Array.isArray(lyrics.fake)) fake += lyrics.fake.length;
  }
  return { real, fake };
}

function main() {
  const songs = readSongs();
  const document = JSON.stringify({ songs });
  const compressed = gzipSync(Buffer.from(document, 'utf8'), { level: 9 });
  const lyrics = countLyrics(songs);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, compressed);

  const manifest = {
    schemaVersion: 1,
    songs: songs.length,
    realLyricLines: lyrics.real,
    fakeLyricLines: lyrics.fake,
    bytes: compressed.length,
    sha256: createHash('sha256').update(document).digest('hex'),
  };
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log('Catalogue artefact');
  console.log('='.repeat(72));
  console.log(`file:      ${path.relative(REPO_ROOT, OUT_FILE)}`);
  console.log(`songs:     ${manifest.songs}`);
  console.log(`lyrics:    ${manifest.realLyricLines} real, ${manifest.fakeLyricLines} invented`);
  console.log(`size:      ${manifest.bytes} bytes (gzipped)`);
  console.log(`sha256:    ${manifest.sha256}`);
}

main();
