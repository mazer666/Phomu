/**
 * fix-youtube-links.js
 * 
 * Scans all song packs for corrupt YouTube IDs (Piano Man placeholder)
 * and replaces them with correct IDs via YouTube search.
 * Includes retry logic and longer delays to avoid rate limiting.
 */
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src/data/packs');
const CORRUPT_ID = 'gxEPV4kolz0';
const DELAY_MS = 3500; // 3.5 seconds between searches to avoid rate limiting
const MAX_RETRIES = 2;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findCorrectYoutubeId(artist, title, attempt = 0) {
  const query = `${artist} - ${title} official audio`;
  try {
    // Dynamic import to handle ESM
    const yt = await import('youtube-search-without-api-key');
    const searchResults = await yt.search(query);
    if (searchResults && searchResults.length > 0) {
      const match = searchResults.find(i => i.id && i.id.videoId && i.id.videoId !== CORRUPT_ID);
      if (match) return match.id.videoId;
    }
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`  -> Retry ${attempt + 1}/${MAX_RETRIES} after ${DELAY_MS * 2}ms...`);
      await delay(DELAY_MS * 2);
      return findCorrectYoutubeId(artist, title, attempt + 1);
    }
    console.error(`  -> ❌ Failed after ${MAX_RETRIES} retries: ${error.message}`);
  }
  return null;
}

async function run() {
  console.log('🔍 Scanning packs for corrupt YouTube IDs...\n');
  const files = await fs.readdir(DATA_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
  
  let totalFixed = 0;
  let totalFailed = 0;
  let totalDuplicates = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(DATA_DIR, file);
    const dataStr = await fs.readFile(filePath, 'utf-8');
    let data;
    try {
      data = JSON.parse(dataStr);
    } catch(e) { continue; }
    
    if (!data.songs || !Array.isArray(data.songs)) continue;

    let modified = false;
    const corruptSongs = data.songs.filter(s => s.links && s.links.youtube === CORRUPT_ID);
    
    if (corruptSongs.length === 0) {
      // Still check for duplicates
    } else {
      console.log(`\n📦 ${file} — ${corruptSongs.length} corrupt IDs found`);
    }

    for (const song of corruptSongs) {
      console.log(`  🔎 ${song.artist} - ${song.title}`);
      
      const newId = await findCorrectYoutubeId(song.artist, song.title);
      
      if (newId) {
        console.log(`  ✅ -> ${newId}`);
        song.links.youtube = newId;
        modified = true;
        totalFixed++;
      } else {
        console.log(`  ⚠️  No replacement found`);
        totalFailed++;
      }
      await delay(DELAY_MS);
    }
    
    // Remove duplicates (same title+artist)
    const seenSongs = new Set();
    const finalSongs = [];
    
    for (const song of data.songs) {
      const songKey = `${song.title.toLowerCase().trim()}|${song.artist.toLowerCase().trim()}`;
      if (!seenSongs.has(songKey)) {
        seenSongs.add(songKey);
        finalSongs.push(song);
      } else {
        console.log(`  🗑️  Duplicate removed: ${song.artist} - ${song.title}`);
        totalDuplicates++;
        modified = true;
      }
    }

    if (modified) {
      data.songs = finalSongs;
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`  💾 Saved ${file} (${finalSongs.length} songs)`);
    }
  }
  
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Fixed: ${totalFixed} | ⚠️ Failed: ${totalFailed} | 🗑️ Duplicates: ${totalDuplicates}`);
  console.log(`${'═'.repeat(50)}`);
}

run().catch(console.error);
