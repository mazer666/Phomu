#!/usr/bin/env node
/**
 * Rename the cover images to opaque, content-addressed names (QA-SPO-002)
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   `public/covers/` held 1,649 files whose names spelled out the answer:
 *
 *       2000s-britney-toxic.jpg
 *       fatboy-slim-the-rockafeller-skank-single.jpg
 *
 *   The deployed artifact is public. A directory listing, the browser history,
 *   the access log of the host, a referrer header or a search engine index
 *   turns every one of those names into a published answer key. The name is
 *   therefore replaced by an opaque id that is derived from the **song id**:
 *
 *       2000s-britney-toxic  ->  8f3a1c9e2b.jpg
 *
 * THE RULE
 *       sha256(songId)  ->  hex  ->  first 12 characters  ->  '<hash>.jpg'
 *
 *   The rule lives in `scripts/lib/cover-name.mjs` so that the fetcher
 *   (`scripts/fetch-covers.js`) produces the same name. The mapping is
 *   deterministic, which is what makes this script repeatable: running it
 *   again finds the files it expects and changes nothing.
 *
 * THE MAP
 *   The result is written to `scripts/cover-name-map.json`:
 *
 *       {
 *         "format":  "songId -> cover file name",
 *         "rule":    "sha256(songId) hex, first 12 characters, plus \".jpg\"",
 *         "songs":   { "<songId>": "<hash>.jpg", ... },
 *         "legacyFileNames": { "<songId>": "<old descriptive name>.jpg", ... },
 *         "orphans": { "<old file name>": "<hash>.jpg", ... }
 *       }
 *
 *   `legacyFileNames` is the audit trail of the migration: it maps a song to
 *   the name its cover had before. It is a development artefact — `scripts/`
 *   is not part of the deployed artifact.
 *
 *   `orphans` lists the cover files that no song referenced. They are not
 *   deleted (that would destroy data); they are renamed with the same rule so
 *   that no descriptive name survives in `public/covers/`.
 *
 * USAGE
 *       node scripts/rename-covers.mjs             # perform the rename
 *       node scripts/rename-covers.mjs --dry-run   # show the plan, change nothing
 *       node scripts/rename-covers.mjs --check      # verify the state, exit 1 on a violation
 *
 *   `--check` is the gate: it fails when a cover file is not opaque, when a
 *   `coverUrl` does not match the hash of its song id, when a referenced file
 *   is missing or when the map file is out of date.
 */

import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COVER_NAME_RULE, coverFileName, coverHash } from './lib/cover-name.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SONGS_DIR = path.join(REPO_ROOT, 'src/data/songs');
const COVERS_DIR = path.join(REPO_ROOT, 'public/covers');
const MAP_FILE = path.join(SCRIPT_DIR, 'cover-name-map.json');

/** A file name that carries no information: 12 hex characters plus ".jpg". */
const OPAQUE_NAME = /^[0-9a-f]{12}\.jpg$/;

const DRY_RUN = process.argv.includes('--dry-run');
const CHECK_ONLY = process.argv.includes('--check');

/**
 * Reads every song of every pack.
 *
 * @returns {{ file: string, songs: { id: string, coverUrl?: string }[] }[]}
 */
function loadCatalogue() {
  const files = readdirSync(SONGS_DIR)
    .filter((file) => file.endsWith('.json') && file !== 'packs.json')
    .sort();

  return files.map((file) => {
    const raw = readFileSync(path.join(SONGS_DIR, file), 'utf-8');
    const data = JSON.parse(raw);
    const songs = Array.isArray(data) ? data : (data.songs ?? []);
    return { file, raw, songs };
  });
}

/**
 * Reads the map of a previous run, so that the legacy names survive a second
 * run of the script.
 *
 * @returns {{ songs: Record<string, string>, legacyFileNames: Record<string, string>, orphans: Record<string, string> }}
 */
function loadExistingMap() {
  const empty = { songs: {}, legacyFileNames: {}, orphans: {} };
  if (!existsSync(MAP_FILE)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(MAP_FILE, 'utf-8'));
    return {
      songs: parsed.songs ?? {},
      legacyFileNames: parsed.legacyFileNames ?? {},
      orphans: parsed.orphans ?? {},
    };
  } catch (error) {
    console.warn(`⚠️  ${path.relative(REPO_ROOT, MAP_FILE)} is unreadable: ${error.message}`);
    return empty;
  }
}

/**
 * Renames the cover files and rewrites the `coverUrl` of every song.
 *
 * @param {object} options
 * @param {boolean} options.dryRun - Report the plan without touching a file.
 * @returns {{ renames: string[], rewrites: string[], orphans: string[], errors: string[] }}
 */
function migrate({ dryRun }) {
  const catalogue = loadCatalogue();
  const existingMap = loadExistingMap();

  /** @type {Map<string, { id: string, currentFile: string, targetFile: string }>} */
  const plan = new Map();
  const errors = [];

  for (const { file, songs } of catalogue) {
    for (const song of songs) {
      if (!song.coverUrl) continue;
      const currentFile = path.basename(song.coverUrl);
      const targetFile = coverFileName(song.id);

      const owner = plan.get(currentFile);
      if (owner && owner.id !== song.id) {
        errors.push(
          `${file}: the cover "${currentFile}" is used by two songs ("${owner.id}" and "${song.id}") — the rename would be ambiguous.`
        );
        continue;
      }
      plan.set(currentFile, { id: song.id, currentFile, targetFile });
    }
  }

  // The opaque names must be unique as well — a hash collision would make two
  // songs share one file.
  const targets = new Map();
  for (const entry of plan.values()) {
    const owner = targets.get(entry.targetFile);
    if (owner && owner !== entry.id) {
      errors.push(
        `Hash collision: "${entry.id}" and "${owner}" both map to "${entry.targetFile}".`
      );
      continue;
    }
    targets.set(entry.targetFile, entry.id);
  }

  const renames = [];
  const rewrites = [];

  // 1. Rename the files.
  for (const entry of plan.values()) {
    if (entry.currentFile === entry.targetFile) continue;
    const source = path.join(COVERS_DIR, entry.currentFile);
    const target = path.join(COVERS_DIR, entry.targetFile);

    if (existsSync(target)) {
      if (existsSync(source)) {
        errors.push(
          `"${entry.currentFile}" and "${entry.targetFile}" both exist — the rename is ambiguous.`
        );
        continue;
      }
      // The file was already renamed by an earlier, interrupted run.
      renames.push(`${entry.currentFile} -> ${entry.targetFile} (already renamed)`);
      continue;
    }
    if (!existsSync(source)) {
      errors.push(`The cover file "${entry.currentFile}" of "${entry.id}" does not exist.`);
      continue;
    }
    renames.push(`${entry.currentFile} -> ${entry.targetFile}`);
    if (!dryRun) renameSync(source, target);
  }

  // 2. Rewrite the `coverUrl` of every song.
  for (const { file, raw, songs } of catalogue) {
    let updated = raw;
    for (const song of songs) {
      if (!song.coverUrl) continue;
      const currentFile = path.basename(song.coverUrl);
      const entry = plan.get(currentFile);
      if (!entry || entry.targetFile === currentFile) continue;

      const needle = `"${song.coverUrl}"`;
      const occurrences = updated.split(needle).length - 1;
      if (occurrences !== 1) {
        errors.push(
          `${file}: the cover url "${song.coverUrl}" occurs ${occurrences} times — the rewrite would be ambiguous.`
        );
        continue;
      }
      updated = updated.split(needle).join(`"/covers/${entry.targetFile}"`);
    }
    if (updated !== raw) {
      rewrites.push(file);
      if (!dryRun) writeFileSync(path.join(SONGS_DIR, file), updated, 'utf-8');
    }
  }

  // 3. The covers that no song references. The list is computed before the
  // renames, because afterwards the old names no longer exist.
  const orphans = [];
  const currentNames = new Set(plan.keys());
  for (const file of readdirSync(COVERS_DIR).sort()) {
    if (currentNames.has(file)) continue;
    if (targets.has(file)) continue;
    if (OPAQUE_NAME.test(file)) continue;
    const targetFile = `${coverHash(file)}.jpg`;
    if (targets.has(targetFile)) {
      errors.push(`The orphan cover "${file}" would collide with "${targetFile}".`);
      continue;
    }
    orphans.push(`${file} -> ${targetFile}`);
    if (!dryRun) renameSync(path.join(COVERS_DIR, file), path.join(COVERS_DIR, targetFile));
  }

  return { renames, rewrites, orphans, errors, plan, targets };
}

/**
 * Writes the map file.
 *
 * @param {Map<string, { id: string, currentFile: string, targetFile: string }>} plan
 * @param {Map<string, string>} targets
 * @param {string[]} orphans
 */
function writeMap(plan, targets, orphans) {
  const existingMap = loadExistingMap();

  const songs = {};
  const legacyFileNames = { ...existingMap.legacyFileNames };
  for (const entry of plan.values()) {
    songs[entry.id] = entry.targetFile;
    if (!legacyFileNames[entry.id] && entry.currentFile !== entry.targetFile) {
      legacyFileNames[entry.id] = entry.currentFile;
    }
  }

  const orphanMap = { ...existingMap.orphans };
  for (const line of orphans) {
    const [from, to] = line.split(' -> ');
    orphanMap[from] = to;
  }

  const map = {
    format: 'songId -> cover file name',
    rule: COVER_NAME_RULE,
    generatedBy: 'scripts/rename-covers.mjs',
    songs,
    legacyFileNames,
    orphans: orphanMap,
  };

  writeFileSync(MAP_FILE, `${JSON.stringify(map, null, 2)}\n`, 'utf-8');
  return map;
}

/**
 * Verifies that every cover file is opaque and that every `coverUrl` matches
 * the hash of its song id.
 *
 * @returns {string[]} The violations.
 */
function check() {
  const violations = [];
  const catalogue = loadCatalogue();

  for (const { file, songs } of catalogue) {
    for (const song of songs) {
      if (!song.coverUrl) continue;
      const expected = `/covers/${coverFileName(song.id)}`;
      if (song.coverUrl !== expected) {
        violations.push(
          `${file}: the song "${song.id}" points to "${song.coverUrl}" — expected "${expected}".`
        );
      }
      if (!existsSync(path.join(REPO_ROOT, 'public', song.coverUrl))) {
        violations.push(`${file}: the cover file of "${song.id}" is missing (${song.coverUrl}).`);
      }
    }
  }

  const referenced = new Set();
  for (const { songs } of catalogue) {
    for (const song of songs) {
      if (song.coverUrl) referenced.add(path.basename(song.coverUrl));
    }
  }

  // The covers that no song references were renamed by the migration as well;
  // they are listed in the map and are therefore expected.
  const knownOrphans = new Set();
  if (existsSync(MAP_FILE)) {
    const map = JSON.parse(readFileSync(MAP_FILE, 'utf-8'));
    for (const target of Object.values(map.orphans ?? {})) knownOrphans.add(target);
  }

  for (const file of readdirSync(COVERS_DIR).sort()) {
    if (!OPAQUE_NAME.test(file)) {
      violations.push(`public/covers/${file}: the file name is not opaque.`);
    }
    if (!referenced.has(file) && !knownOrphans.has(file)) {
      violations.push(`public/covers/${file}: no song references this cover.`);
    }
  }

  if (!existsSync(MAP_FILE)) {
    violations.push('scripts/cover-name-map.json is missing.');
  } else {
    const map = JSON.parse(readFileSync(MAP_FILE, 'utf-8'));
    for (const { songs } of catalogue) {
      for (const song of songs) {
        const expected = coverFileName(song.id);
        if (map.songs?.[song.id] !== expected) {
          violations.push(
            `scripts/cover-name-map.json: "${song.id}" is mapped to "${map.songs?.[song.id]}" — expected "${expected}".`
          );
        }
      }
    }
  }

  return violations;
}

function main() {
  if (CHECK_ONLY) {
    const violations = check();
    if (violations.length > 0) {
      console.error(`❌ ${violations.length} cover violations:\n`);
      for (const violation of violations.slice(0, 50)) console.error(`   ${violation}`);
      if (violations.length > 50) console.error(`   … and ${violations.length - 50} more.`);
      process.exit(1);
    }
    console.log('✅ Every cover file is opaque and every coverUrl matches its song id.');
    return;
  }

  const { renames, rewrites, orphans, errors, plan, targets } = migrate({ dryRun: DRY_RUN });

  for (const error of errors) console.error(`❌ ${error}`);

  console.log(`\nCover files renamed:  ${renames.length}`);
  console.log(`Song files rewritten: ${rewrites.length}`);
  console.log(`Orphan covers renamed:${orphans.length}`);

  if (DRY_RUN) {
    console.log('\n(dry run — nothing was changed)\n');
    for (const line of renames.slice(0, 10)) console.log(`   ${line}`);
    if (renames.length > 10) console.log(`   … and ${renames.length - 10} more.`);
    for (const line of orphans) console.log(`   orphan: ${line}`);
  } else {
    const map = writeMap(plan, targets, orphans);
    console.log(`\nMap written: ${path.relative(REPO_ROOT, MAP_FILE)} (${Object.keys(map.songs).length} songs)`);
  }

  if (errors.length > 0) process.exit(1);
}

main();
