#!/usr/bin/env node
/**
 * find-duplicates.js
 * Findet doppelte Songs in src/data/songs/*.json
 *
 * Erkennt:
 *   1. yt-Einträge, die ein Duplikat eines vollständigen Eintrags sind
 *      (gleiche YouTube-ID oder gleicher Titel+Artist)
 *   2. Volle Einträge, die doppelt vorkommen (gleiche YouTube-ID oder Titel+Artist)
 *
 * Usage:
 *   node scripts/find-duplicates.js            # Nur Bericht
 *   node scripts/find-duplicates.js --fix      # Automatisch bereinigen (yt-Dupes)
 */

const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(__dirname, '../src/data/songs');
const FIX_MODE = process.argv.includes('--fix');

// ---------- Helpers ----------

function getYtId(ytLink) {
  if (!ytLink) return null;
  return String(ytLink)
    .replace('https://www.youtube.com/watch?v=', '')
    .split('&')[0]
    .split('?')[0];
}

function normalize(title) {
  return (title || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)/gi, '')   // Klammern entfernen: (Remastered), (feat. X) …
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(artist) {
  return (artist || '')
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Load ----------

const files = fs.readdirSync(SONGS_DIR)
  .filter(f => f.endsWith('.json') && f !== 'packs.json')
  .sort();

const fileData = {};
for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));
  fileData[file] = {
    isArray: Array.isArray(raw),
    songs: Array.isArray(raw) ? raw : (raw.songs || []),
    meta: Array.isArray(raw) ? {} : Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'songs')),
  };
}

const allSongs = [];
for (const [file, data] of Object.entries(fileData)) {
  for (const song of data.songs) allSongs.push({ file, song });
}

// ---------- Duplicate Detection ----------

// Build maps
const ytIdMap = {};
const titleMap = {};

for (const { file, song } of allSongs) {
  const ytId = song.links && getYtId(song.links.youtube);
  if (ytId && ytId.length > 5) {
    if (!ytIdMap[ytId]) ytIdMap[ytId] = [];
    ytIdMap[ytId].push({ file, song });
  }

  const key = normalize(song.title) + '|||' + normalizeArtist(song.artist);
  if (!titleMap[key]) titleMap[key] = [];
  titleMap[key].push({ file, song });
}

// --- Category 1: yt- entries that duplicate a full entry ---
const toDelete = new Set();
const packAdditions = {}; // fullId -> { entry, packs[] }

function registerFix(full, yt) {
  toDelete.add(yt.song.id);
  if (!packAdditions[full.song.id]) packAdditions[full.song.id] = { entry: full, packs: [] };
  packAdditions[full.song.id].packs.push(...(yt.song.packs || []));
}

// By YouTube ID
for (const [ytId, entries] of Object.entries(ytIdMap)) {
  if (entries.length < 2) continue;
  const ytEntries = entries.filter(e => e.song.id.startsWith('yt-'));
  const fullEntries = entries.filter(e => !e.song.id.startsWith('yt-'));
  if (!ytEntries.length || !fullEntries.length) continue;
  const best = fullEntries.sort((a, b) => (b.song.packs || []).length - (a.song.packs || []).length)[0];
  for (const yt of ytEntries) registerFix(best, yt);
}

// By title+artist
for (const [key, entries] of Object.entries(titleMap)) {
  if (entries.length < 2) continue;
  const ytEntries = entries.filter(e => e.song.id.startsWith('yt-') && !toDelete.has(e.song.id));
  const fullEntries = entries.filter(e => !e.song.id.startsWith('yt-'));
  if (!ytEntries.length || !fullEntries.length) continue;
  const best = fullEntries.sort((a, b) => (b.song.packs || []).length - (a.song.packs || []).length)[0];
  for (const yt of ytEntries) registerFix(best, yt);
}

// --- Category 2: Full-entry duplicates (not yt-) ---
const fullDuplicatesByTitle = Object.entries(titleMap).filter(([k, v]) => {
  const fullOnly = v.filter(e => !e.song.id.startsWith('yt-'));
  return fullOnly.length > 1;
});

// Split into true duplicates (same title) vs wrong YT IDs (different titles)
const fullDuplicatesByYtIdAll = Object.entries(ytIdMap).filter(([ytId, entries]) => {
  const fullOnly = entries.filter(e => !e.song.id.startsWith('yt-'));
  if (fullOnly.length < 2) return false;
  // Skip if already caught by title+artist normalization
  const key = normalize(fullOnly[0].song.title) + '|||' + normalizeArtist(fullOnly[0].song.artist);
  return !fullDuplicatesByTitle.some(([k]) => k === key);
});

const fullDuplicatesSameTitle = fullDuplicatesByYtIdAll.filter(([ytId, entries]) => {
  const fullOnly = entries.filter(e => !e.song.id.startsWith('yt-'));
  const titles = [...new Set(fullOnly.map(e => normalize(e.song.title)))];
  return titles.length === 1;
});

const wrongYtIds = fullDuplicatesByYtIdAll.filter(([ytId, entries]) => {
  const fullOnly = entries.filter(e => !e.song.id.startsWith('yt-'));
  const titles = [...new Set(fullOnly.map(e => normalize(e.song.title)))];
  return titles.length > 1;
});

// ---------- Report ----------

console.log('='.repeat(60));
console.log('DUPLIKAT-REPORT — src/data/songs/');
console.log('='.repeat(60));
console.log('Songs gesamt:', allSongs.length);
console.log();

console.log('--- yt-Einträge als Duplikate erkannt:', toDelete.size, '---');
for (const [id, { entry, packs }] of Object.entries(packAdditions)) {
  const newPacks = [...new Set(packs)].filter(p => !(entry.song.packs || []).includes(p));
  console.log(`  ${id} ← übernimmt Packs: [${newPacks.join(', ')}]`);
}

console.log();
console.log('--- Volle Duplikate via Titel+Artist (norm.):', fullDuplicatesByTitle.length, '---');
for (const [key, entries] of fullDuplicatesByTitle) {
  const fullOnly = entries.filter(e => !e.song.id.startsWith('yt-'));
  const [title, artist] = key.split('|||');
  console.log(`  "${title}" by "${artist}"`);
  for (const e of fullOnly) {
    console.log(`    [${e.file}] ${e.song.id} | packs: ${(e.song.packs || []).join(', ')}`);
  }
}

console.log();
console.log('--- Volle Duplikate via gleicher YouTube-ID:', fullDuplicatesSameTitle.length, '---');
for (const [ytId, entries] of fullDuplicatesSameTitle) {
  const fullOnly = entries.filter(e => !e.song.id.startsWith('yt-'));
  console.log(`  youtube: ${ytId}`);
  for (const e of fullOnly) {
    console.log(`    [${e.file}] ${e.song.id} — "${e.song.title}" by ${e.song.artist}`);
    console.log(`           packs: ${(e.song.packs || []).join(', ')}`);
  }
}

console.log();
console.log('--- Falsche YouTube-IDs (verschiedene Songs, gleiche ID):', wrongYtIds.length, '---');
for (const [ytId, entries] of wrongYtIds) {
  const fullOnly = entries.filter(e => !e.song.id.startsWith('yt-'));
  console.log(`  youtube: ${ytId}`);
  for (const e of fullOnly) {
    console.log(`    [${e.file}] ${e.song.id} — "${e.song.title}" by ${e.song.artist}`);
  }
}

// ---------- Fix Mode ----------

if (FIX_MODE) {
  if (toDelete.size === 0 && Object.keys(packAdditions).length === 0) {
    console.log('\nKeine yt-Duplikate zum Bereinigen.');
  } else {
    console.log('\n=== Bereinigung gestartet ===');

    // Apply pack additions
    for (const [id, { entry, packs }] of Object.entries(packAdditions)) {
      const newPacks = [...new Set(packs)].filter(p => !(entry.song.packs || []).includes(p));
      if (newPacks.length > 0) {
        entry.song.packs = [...(entry.song.packs || []), ...newPacks];
        console.log(`  Packs ergänzt: ${id} + [${newPacks.join(', ')}]`);
      }
    }

    // Remove yt- entries
    for (const [file, data] of Object.entries(fileData)) {
      const before = data.songs.length;
      data.songs = data.songs.filter(s => !toDelete.has(s.id));
      if (data.songs.length !== before) {
        console.log(`  ${file}: ${before - data.songs.length} yt-Einträge entfernt`);
      }
    }

    // Save
    for (const [file, data] of Object.entries(fileData)) {
      const filePath = path.join(SONGS_DIR, file);
      const content = data.isArray
        ? data.songs
        : { ...data.meta, songs: data.songs };
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    }
    console.log(`\nFertig: ${toDelete.size} yt-Einträge gelöscht, ${Object.keys(packAdditions).length} Songs aktualisiert.`);
  }
} else if (toDelete.size > 0) {
  console.log('\nTipp: Mit --fix werden yt-Duplikate automatisch bereinigt.');
}
