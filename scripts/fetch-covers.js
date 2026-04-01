/**
 * fetch-covers.js
 * 
 * Automatisches Beziehen von 500x500 Cover-Bildern für alle Phomu-Songs.
 * Nutzt iTunes und Deezer APIs für hohe Qualität und Resilienz.
 * 
 * Verwendung: node scripts/fetch-covers.js [--limit=50] [--force]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Konfiguration ---
const PACKS_DIR = path.join(__dirname, '../src/data/packs');
const COVERS_DIR = path.join(__dirname, '../public/covers');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : Infinity;
const FORCE = process.argv.includes('--force'); // Vorhandene Bilder überschreiben

// --- Helfer ---

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

/** iTunes Search API (Sehr zuverlässig, 500x500 möglich) */
async function itunesProvider(artist, title) {
  const query = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${query}&entity=musicTrack&limit=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.resultCount > 0) {
      const track = data.results[0];
      // Wir tauschen 100x100 gegen 500x500 aus
      return track.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg');
    }
  } catch (err) {
    console.warn(`   [iTunes] Fehler für "${artist} - ${title}":`, err.message);
  }
  return null;
}

/** Deezer API (Guter Fallback) */
async function deezerProvider(artist, title) {
  const query = encodeURIComponent(`track:"${title}" artist:"${artist}"`);
  const url = `https://api.deezer.com/search?q=${query}&limit=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].album.cover_big; // big ist 500x500
    }
  } catch (err) {
    console.warn(`   [Deezer] Fehler für "${artist} - ${title}":`, err.message);
  }
  return null;
}

// --- Hauptlogik ---

async function main() {
  if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
  }

  const jsonFiles = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));
  console.log(`\n🚀 Phomu Cover Art Fetcher`);
  console.log(`📁 Durchsuche ${jsonFiles.length} Packs...\n`);

  let processedCount = 0;
  let successCount = 0;
  let alreadyExists = 0;

  for (const file of jsonFiles) {
    if (processedCount >= LIMIT) break;

    const filePath = path.join(PACKS_DIR, file);
    const pack = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let packChanged = false;

    console.log(`📦 Verarbeite Pack: ${pack.name || file}`);

    for (const song of pack.songs) {
      if (processedCount >= LIMIT) break;

      const coverFilename = `${song.id}.jpg`;
      const coverPath = path.join(COVERS_DIR, coverFilename);
      const relativePath = `/covers/${coverFilename}`;

      // Prüfen ob Cover schon da ist
      if (fs.existsSync(coverPath) && !FORCE) {
        alreadyExists++;
        // Falls coverUrl im JSON fehlt, aber Datei da ist -> eintragen
        if (song.coverUrl !== relativePath) {
          song.coverUrl = relativePath;
          packChanged = true;
        }
        continue;
      }

      console.log(`   🔍 Suche Cover für: ${song.artist} - ${song.title}`);
      
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
          console.log(`   ✅ Gespeichert.`);
        } catch (err) {
          console.error(`   ❌ Download-Fehler: ${err.message}`);
        }
      } else {
        console.warn(`   ⚠️ Keinen Treffer gefunden.`);
      }

      processedCount++;
      await randomSleep(500, 1500); // Resilience: Kurze Pause zwischen Tracks
    }

    if (packChanged) {
      fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf-8');
      console.log(`   💾 JSON aktualisiert.\n`);
    }
  }

  console.log(`\n--- Abschlussbericht ---`);
  console.log(`Songs verarbeitet: ${processedCount}`);
  console.log(`Cover neu geladen: ${successCount}`);
  console.log(`Bereits vorhanden: ${alreadyExists}`);
  console.log(`-------------------------\n`);
}

main().catch(err => {
  console.error('Kritischer Fehler:', err);
});
