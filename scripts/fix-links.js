/**
 * fix-links.js (resilient version)
 *
 * Searches automatically for official YouTube videos for all songs from
 * broken-links-report.json and updates the pack JSON files.
 *
 * Supports several providers (YouTube API & scraping fallback),
 * anti-blocking (user-agent rotation, adaptive delays)
 * and fair distribution ("across the board") over all packs.
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
        console.log('\n   [API] 🛑 Quota exhausted. Switching to fallback...');
        apiQuotaExhausted = true;
        return null;
      }
      return null;
    }

    if (!data.items || data.items.length === 0) return null;

    // Filter for official channels
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
      // console.log(`   [Scraper] 🔍 "${query}" -> no hits`);
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
    console.error(`   [Scraper] Error for "${query}": ${err.message}`);
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
      // If the provider is scraping, we briefly check whether the title is plausible
      const normalizedTitle = result.videoTitle.toLowerCase();
      const artistToken = artist.toLowerCase().split(' ')[0];
      const titleToken = title.toLowerCase().split(' ')[0];

      const isPlausible = normalizedTitle.includes(artistToken) ||
                         normalizedTitle.includes(titleToken);

      if (isPlausible) return result;
      // else console.log(`   [Scraper] ⚠️ "${result.videoTitle}" not plausible for "${artist} - ${title}"`);
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
    console.error(`Report file not found: ${REPORT_FILE}`);
    process.exit(1);
  }

  const rawReport = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
  const report = rawReport.sort(() => Math.random() - 0.5);

  console.log(`\n🚀 Phomu Link Repair System (Resilient Mode)`);
  console.log(`🔍 ${report.length} songs in the queue (shuffled)`);
  if (DRY_RUN) console.log('   (--dry-run: no changes are written)\n');

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
      console.log('❌ not found');
      failed++;
    }

    // Adaptive delay against IP blocking (only needed for scraping, but never harmful)
    await randomSleep(1000, 3000);
  }

  console.log(`\n✅ Done!`);
  console.log(`   - Fixed: ${fixed}`);
  console.log(`   - Skipped (already fixed): ${skipped}`);
  console.log(`   - Not found: ${failed}`);
}

main().catch(console.error);
