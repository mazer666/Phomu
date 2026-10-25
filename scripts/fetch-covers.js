/**
 * fetch-covers.js
 *
 * Automatically downloads 500x500 cover images for all Phomu songs.
 * Uses the iTunes and Deezer APIs for high quality and resilience.
 *
 * Usage: node scripts/fetch-covers.js [--limit=50] [--force]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PACKS_DIR = path.join(__dirname, '../src/data/packs');
const COVERS_DIR = path.join(__dirname, '../public/covers');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : Infinity;
const FORCE = process.argv.includes('--force'); // Overwrite existing images

// --- Helpers ---

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Status: ${res.statusCode}`));
        return;
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
    }).on('error', reject);
  });
}

function randomSleep(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

// --- Provider ---

/** iTunes Search API (very reliable, 500x500 possible) */
async function itunesProvider(artist, title) {
  const query = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${query}&entity=musicTrack&limit=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.resultCount > 0) {
      const track = data.results[0];
      // We swap 100x100 for 500x500
      return track.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg');
    }
  } catch (err) {
    console.warn(`   [iTunes] Error for "${artist} - ${title}":`, err.message);
  }
  return null;
}

/** Deezer API (good fallback) */
async function deezerProvider(artist, title) {
  const query = encodeURIComponent(`track:"${title}" artist:"${artist}"`);
  const url = `https://api.deezer.com/search?q=${query}&limit=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].album.cover_big; // big is 500x500
    }
  } catch (err) {
    console.warn(`   [Deezer] Error for "${artist} - ${title}":`, err.message);
  }
  return null;
}

// --- Main logic ---

async function main() {
  if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
  }

  const jsonFiles = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));
  console.log(`\n🚀 Phomu Cover Art Fetcher`);
  console.log(`📁 Scanning ${jsonFiles.length} packs...\n`);

  let processedCount = 0;
  let successCount = 0;
  let alreadyExists = 0;

  for (const file of jsonFiles) {
    if (processedCount >= LIMIT) break;

    const filePath = path.join(PACKS_DIR, file);
    const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let packChanged = false;

    console.log(`📦 Processing pack: ${pack.name || file}`);

    for (const song of pack.songs) {
      if (processedCount >= LIMIT) break;

      const coverFilename = `${song.id}.jpg`;
      const coverPath = path.join(COVERS_DIR, coverFilename);
      const relativePath = `/covers/${coverFilename}`;

      // Check whether the cover is already there
      if (fs.existsSync(coverPath) && !FORCE) {
        alreadyExists++;
        // If coverUrl is missing in the JSON but the file exists -> add it
        if (song.coverUrl !== relativePath) {
          song.coverUrl = relativePath;
          packChanged = true;
        }
        continue;
      }

      console.log(`   🔍 Searching cover for: ${song.artist} - ${song.title}`);
      
      let coverUrl = await itunesProvider(song.artist, song.title);
      if (!coverUrl) {
        await randomSleep(300, 700);
        coverUrl = await deezerProvider(song.artist, song.title);
      }

      if (coverUrl) {
        try {
          await downloadImage(coverUrl, coverPath);
          song.coverUrl = relativePath;
          packChanged = true;
          successCount++;
          console.log(`   ✅ Saved.`);
        } catch (err) {
          console.error(`   ❌ Download error: ${err.message}`);
        }
      } else {
        console.warn(`   ⚠️ No match found.`);
      }

      processedCount++;
      await randomSleep(500, 1500); // Resilience: short pause between tracks
    }

    if (packChanged) {
      fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf-8');
      console.log(`   💾 JSON updated.\n`);
    }
  }

  console.log(`\n--- Final report ---`);
  console.log(`Songs processed: ${processedCount}`);
  console.log(`Covers downloaded: ${successCount}`);
  console.log(`Already present: ${alreadyExists}`);
  console.log(`-------------------------\n`);
}

main().catch(err => {
  console.error('Critical error:', err);
});
