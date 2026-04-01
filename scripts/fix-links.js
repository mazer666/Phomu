/**
 * fix-links.js
 *
 * Sucht für alle Songs aus broken-links-report.json automatisch
 * offizielle YouTube-Videos und aktualisiert die Pack-JSON-Dateien.
 *
 * Verwendung:
 *   node scripts/fix-links.js --api-key=DEIN_YOUTUBE_API_KEY
 *
 * YouTube Data API Key erstellen:
 *   https://console.cloud.google.com/ → APIs & Services → YouTube Data API v3
 *   (kostenlos, 10.000 Requests/Tag)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ──────────────────────────────────────────────────────────

const API_KEY     = process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1]
                 || process.env.YOUTUBE_API_KEY;
const PACKS_DIR   = path.join(__dirname, '../src/data/packs');
const REPORT_FILE = path.join(__dirname, '../broken-links-report.json');
const DRY_RUN     = process.argv.includes('--dry-run');
const DELAY_MS    = 150; // Rate-limit: ~6 req/s
const LIMIT_ARG   = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT       = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : Number.POSITIVE_INFINITY;

if (!API_KEY) {
  console.error('Kein API Key angegeben!');
  console.error('Verwendung: node scripts/fix-links.js --api-key=AIza...');
  console.error('Oder: YOUTUBE_API_KEY=AIza... node scripts/fix-links.js');
  process.exit(1);
}

// ─── YouTube Search ───────────────────────────────────────────────────

/** Sucht auf YouTube nach einem offiziellen Music Video und gibt die Video-ID zurück. */
async function findOfficialVideo(artist, title) {
  // Prefer VEVO/official uploads; try two queries
  const queries = [
    `${artist} ${title} official music video`,
    `${artist} ${title} official video`,
  ];

  for (const q of queries) {
    const encoded = encodeURIComponent(q);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&type=video&videoCategoryId=10&maxResults=5&key=${API_KEY}`;

    const items = await httpsGet(url);
    if (!items) continue;

    const data = JSON.parse(items);
    if (data.error) {
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        throw new Error('QUOTA_EXCEEDED');
      }
      console.error(`  YouTube API Error: ${data.error.message}`);
      continue;
    }

    if (!data.items || data.items.length === 0) continue;

    // Prefer VEVO, then official artist channel, then first result
    const vevo     = data.items.find(i => i.snippet.channelTitle.toLowerCase().includes('vevo'));
    const official = data.items.find(i =>
      i.snippet.channelTitle.toLowerCase().includes('official') ||
      i.snippet.title.toLowerCase().includes('official')
    );
    const best = vevo || official || data.items[0];

    if (best?.id?.videoId) {
      return { videoId: best.id.videoId, channelTitle: best.snippet.channelTitle, videoTitle: best.snippet.title };
    }
  }

  return null;
}

function httpsGet(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Return data regardless of status so caller can check for error JSON
        resolve(data);
      });
    }).on('error', (e) => {
      console.error(`  Request error: ${e.message}`);
      resolve(null);
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const rawReport = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
  // Shuffle report to ensure fair distribution across packets/years
  const report = rawReport.sort(() => Math.random() - 0.5);

  console.log(`🔍 ${report.length} broken links found. Searching official videos (shuffled)...`);
  if (DRY_RUN) console.log('   (--dry-run: No changes will be saved)\n');
  if (LIMIT < Number.POSITIVE_INFINITY) console.log(`   (Processing limit: ${LIMIT} songs)\n`);

  // Lade alle Packs in den Speicher
  const packs = {};
  for (const file of fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'))) {
    packs[file] = JSON.parse(fs.readFileSync(path.join(PACKS_DIR, file), 'utf-8'));
  }

  let fixed = 0;
  let failed = 0;

  try {
    for (let i = 0; i < report.length && i < LIMIT; i++) {
      const entry = report[i];
      const { file, id, title, artist, videoId: brokenVideoId } = entry;

      // Skip if already fixed (different ID than in report)
      if (packs[file]) {
        const song = packs[file].songs?.find((s) => s.id === id);
        if (song && song.links?.youtube && song.links.youtube !== brokenVideoId) {
          process.stdout.write(`[${i + 1}/${Math.min(report.length, LIMIT)}] ${artist} – ${title} ... (Already fixed) ✅\n`);
          continue;
        }
      }

      process.stdout.write(`[${i + 1}/${Math.min(report.length, LIMIT)}] ${artist} – ${title} ... `);

      const result = await findOfficialVideo(artist, title);

      if (!result) {
        console.log('❌ nicht gefunden');
        failed++;
      } else {
        console.log(`✅ ${result.videoId} (${result.channelTitle})`);

        // Update in memory
        if (packs[file]) {
          const song = packs[file].songs?.find((s) => s.id === id);
          if (song) {
            if (!song.links) song.links = {};
            song.links.youtube = result.videoId;
            fixed++;

            // Save immediately to avoid data loss on quota error
            if (!DRY_RUN) {
              fs.writeFileSync(path.join(PACKS_DIR, file), JSON.stringify(packs[file], null, 2) + '\n');
            }
          }
        } else {
          fixed++;
        }
      }

      await sleep(DELAY_MS);
    }
  } catch (err) {
    if (err.message === 'QUOTA_EXCEEDED') {
      console.log('\n\n🛑 YouTube API Quota exhausted for today.');
    } else {
      console.error('\n\n❌ Unexpected Error:', err);
    }
  }

  if (!DRY_RUN) {
    console.log(`\n✅ Done. ${fixed} songs updated, ${failed} not found.`);
  } else {
    console.log(`\nDry-run: ${fixed} would be updated, ${failed} not found.`);
  }
}

main().catch(console.error);
