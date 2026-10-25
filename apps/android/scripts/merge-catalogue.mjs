#!/usr/bin/env node
/**
 * Merges the catalogue artefact of the base with the pack table.
 *
 * WHAT: the artefact of `catalog-tool` carries the songs; the pack table of
 * the repository carries the names of the packs. The bridge reads both from
 * one document, therefore the build merges them into one file that the shell
 * hands over as bytes.
 *
 * WHY the shell does not do this: the shell moves bytes and never parses the
 * catalogue (docs/design/BUILD-CONTRACT.md § 4.1). The merged document is
 * the artefact the shell reads.
 *
 * Usage:
 *   node scripts/merge-catalogue.mjs --catalogue <file> --packs <file> --out <file>
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Reads the arguments of the script.
 *
 * @param {string[]} argv the arguments of the process
 * @returns {{catalogue: string, packs: string, out: string}} the paths
 */
function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) continue;
    values.set(argument.slice(2), argv[index + 1]);
    index += 1;
  }
  const catalogue = values.get('catalogue');
  const packs = values.get('packs');
  const out = values.get('out');
  if (!catalogue || !packs || !out) {
    throw new Error('the arguments --catalogue, --packs and --out are required');
  }
  return { catalogue, packs, out };
}

/**
 * Runs the merge.
 *
 * @param {string[]} argv the arguments of the process
 */
function main(argv) {
  const { catalogue, packs, out } = parseArguments(argv);
  const artefact = JSON.parse(fs.readFileSync(catalogue, 'utf8'));
  const table = JSON.parse(fs.readFileSync(packs, 'utf8'));

  const songs = Array.isArray(artefact.songs) ? artefact.songs : [];
  const merged = {};
  for (const [id, entry] of Object.entries(table)) {
    const name =
      entry && typeof entry === 'object' && typeof entry.pack === 'string'
        ? entry.pack
        : id;
    merged[id] = { ...(entry && typeof entry === 'object' ? entry : {}), pack: name };
  }

  // WHY the report: a song that belongs to a pack that the table does not
  // know would never be drawn, because the lobby selects packs and the draw
  // filters by them. The report makes the gap visible at build time.
  const known = new Set(Object.keys(merged));
  const missing = new Set();
  for (const song of songs) {
    for (const pack of song.packs ?? []) {
      if (!known.has(pack)) missing.add(pack);
    }
  }

  const document = {
    schema_version: artefact.schema_version ?? 1,
    song_count: songs.length,
    songs,
    packs: merged,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(document));

  process.stdout.write(
    `merge-catalogue: ${songs.length} songs, ${Object.keys(merged).length} packs → ${out}\n`,
  );
  if (missing.size > 0) {
    process.stdout.write(
      `merge-catalogue: WARNING — ${missing.size} pack identifiers of the songs are ` +
        `not in the pack table: ${[...missing].slice(0, 5).join(', ')}` +
        `${missing.size > 5 ? ' …' : ''}\n`,
    );
  }
}

main(process.argv.slice(2));
