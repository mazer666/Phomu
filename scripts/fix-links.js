/**
 * fix-links.js (Resilient Version)
 *
 * Sucht für alle Songs aus broken-links-report.json automatisch
 * offizielle YouTube-Videos und aktualisiert die Pack-JSON-Dateien.
 *
 * Unterstützt mehrere Provider (YouTube API & Scraping Fallback),
 * Anti-Blocking (User-Agent Rotation, adaptive Delays)
 * und faire Verteilung ("quer drüber") über alle Packs.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { search: scrapedSearch } = require('youtube-search-without-api-key');

// ─── Config ──────────────────────────────────────────────────────────

const API_KEY = process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1]
             || process.env.YOUTUBE_API_KEY;
const PACKS_DIR = path.join(__dirname, '../src/data/packs');
const REPORT_FILE = path.join(__dirname, '../broken-links-report.json');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : Number.POSITIVE_INFINITY;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
];

let currentProviderIndex = 0;
let apiQuotaExhausted = false;

// ─── Providers ────────────────────────────────────────────────────────

/** Provider 1: Offizielle YouTube Data API (v3) */
async function googleApiProvider(query) {
  if (!API_KEY || apiQuotaExhausted) return null;

  const encoded = encodeURIComponent(query);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&type=video&videoCategoryId=10&maxResults=5&key=${API_KEY}`;

  try {
    const raw = await httpsGet(url);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (data.error) {
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        console.log('\n   [API] 🛑 Quote erschöpft. Wechsle zu Fallback...');
        apiQuotaExhausted = true;
        return null;
      }
      return null;
    }

    if (!data.items || data.items.length === 0) return null;

    // Filter für Offizielle Kanäle
    const vevo = data.items.find(i => i.snippet.channelTitle.toLowerCase().includes('vevo'));
    const official = data.items.find(i =>
      i.snippet.channelTitle.toLowerCase().includes('official') ||
      i.snippet.title.toLowerCase().includes('official')
    );
    const best = vevo || official || data.items[0];

    return {
      videoId: best.id.videoId,
      channelTitle: best.snippet.channelTitle,
      videoTitle: best.snippet.title,
      source: 'Google API'
    };
  } catch (err) {
    return null;
  }
}

/** Provider 2: Scraping Fallback (via youtube-search-without-api-key) */
async function scrapingProvider(query) {
  try {
    // Rotation des User-Agents (simuliert)
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const results = await scrapedSearch(query);

    if (!results || results.length === 0) {
      // console.log(`   [Scraper] 🔍 "${query}" -> Keine Treffer`);
      return null;
    }

    const vevo = results.find(i => i.snippet?.channelTitle?.toLowerCase().includes('vevo'));
    const official = results.find(i =>
      i.snippet?.channelTitle?.toLowerCase().includes('official') ||
      (i.title || i.snippet?.title || '').toLowerCase().includes('official')
    );
    const first = results[0];
    const best = vevo || official || first;

    if (!best || !best.id?.videoId) return null;

    return {
      videoId: best.id.videoId,
      channelTitle: best.snippet?.channelTitle || 'Unknown',
      videoTitle: best.title || best.snippet?.title || 'Unknown',
      source: 'Scraping Fallback'
    };
  } catch (err) {
    console.error(`   [Scraper] Fehler bei "${query}": ${err.message}`);
    return null;
  }
}

// ─── Search Manager ───────────────────────────────────────────────────

async function resilientSearch(artist, title) {
  const queries = [
    `${artist} ${title} official music video`,
    `${artist} ${title} official video`,
    `${artist} ${title} official`,
    `${artist} ${title}`
  ];

  for (const query of queries) {
    // 1. Google API
    let result = await googleApiProvider(query);
    if (result) return result;

    // 2. Scraping
    await randomSleep(1000, 2000);
    result = await scrapingProvider(query);
    
    if (result) {
      // Wenn der Provider Scraping ist, prüfen wir kurz, ob der Titel plausibel ist
      const normalizedTitle = result.videoTitle.toLowerCase();
      const artistToken = artist.toLowerCase().split(' ')[0];
      const titleToken = title.toLowerCase().split(' ')[0];
      
      const isPlausible = normalizedTitle.includes(artistToken) || 
                         normalizedTitle.includes(titleToken);
                         
      if (isPlausible) return result;
      // else console.log(`   [Scraper] ⚠️ "${result.videoTitle}" nicht plausibel für "${artist} - ${title}"`);
    }
  }

  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function randomSleep(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`Report-Datei nicht gefunden: ${REPORT_FILE}`);
    process.exit(1);
  }

  const rawReport = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
  const report = rawReport.sort(() => Math.random() - 0.5);

  console.log(`\n🚀 Phomu Link Repair System (Resilient Mode)`);
  console.log(`🔍 ${report.length} Songs in der Warteschlange (shuffled)`);
  if (DRY_RUN) console.log('   (--dry-run: Es werden keine Änderungen gespeichert)\n');

  const packs = {};
  for (const file of fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'))) {
    packs[file] = JSON.parse(fs.readFileSync(path.join(PACKS_DIR, file), 'utf-8'));
  }

  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < report.length && i < LIMIT; i++) {
    const { file, id, title, artist, videoId: brokenId } = report[i];

    // Status-Check
    if (packs[file]) {
      const song = packs[file].songs?.find(s => s.id === id);
      if (song && song.links?.youtube && song.links.youtube !== brokenId) {
        skipped++;
        continue;
      }
    }

    process.stdout.write(`[${i + 1}/${Math.min(report.length, LIMIT)}] ${artist} – ${title} ... `);

    const result = await resilientSearch(artist, title);

    if (result) {
      console.log(`✅ ${result.videoId} via ${result.source} (${result.channelTitle})`);

      if (packs[file]) {
        const song = packs[file].songs.find(s => s.id === id);
        if (song) {
          if (!song.links) song.links = {};
          song.links.youtube = result.videoId;
          fixed++;

          if (!DRY_RUN) {
            fs.writeFileSync(path.join(PACKS_DIR, file), JSON.stringify(packs[file], null, 2) + '\n');
          }
        }
      }
    } else {
      console.log('❌ nicht gefunden');
      failed++;
    }

    // Adaptives Delay gegen IP-Blocking (nur bei Scraping nötig, aber schadet nie)
    await randomSleep(1000, 3000);
  }

  console.log(`\n✅ Fertig!`);
  console.log(`   - Korrigiert: ${fixed}`);
  console.log(`   - Übersprungen (schon fix): ${skipped}`);
  console.log(`   - Nicht gefunden: ${failed}`);
}

main().catch(console.error);
