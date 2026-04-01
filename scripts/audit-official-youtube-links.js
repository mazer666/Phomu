/**
 * Audit für YouTube-Links auf "offizielle" Quellen.
 *
 * Nutzung:
 *   YOUTUBE_API_KEY=... node scripts/audit-official-youtube-links.js
 *
 * Optional:
 *   --limit=200           nur N Songs prüfen
 *   --strict              non-official Treffer als Exit-Code 1
 *
 * Hinweis: API-Key wird ausschließlich aus Environment gelesen und NICHT persistiert.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.YOUTUBE_API_KEY;
const STRICT = process.argv.includes('--strict');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : Number.POSITIVE_INFINITY;
const PACKS_DIR = path.join(__dirname, '../src/data/packs');

if (!API_KEY) {
  console.error('❌ YOUTUBE_API_KEY fehlt (nur per Env setzen, nicht im Repo speichern).');
  process.exit(1);
}

function readSongs() {
  const files = fs.readdirSync(PACKS_DIR).filter((f) => f.endsWith('.json')).sort();
  const songs = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(PACKS_DIR, file), 'utf8');
    const json = JSON.parse(raw);
    for (const song of json.songs ?? []) {
      songs.push({ file, song });
    }
  }

  return songs.slice(0, LIMIT);
}

function getVideoId(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  const watchMatch = value.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = value.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

function httpsGet(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            resolve({ ok: false, statusCode: res.statusCode, body: data });
            return;
          }
          resolve({ ok: true, body: data });
        });
      })
      .on('error', (err) => {
        resolve({ ok: false, statusCode: 0, body: String(err.message) });
      });
  });
}

function classify(video) {
  const channel = (video.snippet?.channelTitle || '').toLowerCase();
  const title = (video.snippet?.title || '').toLowerCase();
  const tags = (video.snippet?.tags || []).join(' ').toLowerCase();

  const officialSignals = ['official', 'vevo', '- topic'];
  const hasOfficialSignal = officialSignals.some((s) => channel.includes(s) || title.includes(s) || tags.includes(s));

  if (hasOfficialSignal) return 'official_like';
  return 'unverified';
}

async function fetchVideoMeta(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${videoId}&key=${API_KEY}`;
  const response = await httpsGet(url);

  if (!response.ok) {
    return { ok: false, reason: `HTTP ${response.statusCode}: ${response.body.slice(0, 120)}` };
  }

  const parsed = JSON.parse(response.body);
  const item = parsed.items?.[0];
  if (!item) {
    return { ok: false, reason: 'Video nicht gefunden (leer oder entfernt)' };
  }

  return { ok: true, video: item };
}

async function run() {
  const rows = readSongs();
  const results = [];

  for (const entry of rows) {
    const videoId = getVideoId(entry.song?.links?.youtube);
    if (!videoId) {
      results.push({
        file: entry.file,
        id: entry.song.id,
        artist: entry.song.artist,
        title: entry.song.title,
        status: 'invalid_id',
        details: 'links.youtube ohne gültige ID',
      });
      continue;
    }

    // kleiner Delay gegen API Burst
    await new Promise((r) => setTimeout(r, 80));

    const meta = await fetchVideoMeta(videoId);
    if (!meta.ok) {
      results.push({
        file: entry.file,
        id: entry.song.id,
        artist: entry.song.artist,
        title: entry.song.title,
        status: 'unreachable',
        details: meta.reason,
      });
      continue;
    }

    const quality = classify(meta.video);
    results.push({
      file: entry.file,
      id: entry.song.id,
      artist: entry.song.artist,
      title: entry.song.title,
      status: quality,
      channel: meta.video.snippet?.channelTitle,
      videoTitle: meta.video.snippet?.title,
      privacyStatus: meta.video.status?.privacyStatus,
    });
  }

  const counts = results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  const reportPath = path.join(process.cwd(), 'youtube-official-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), counts, results }, null, 2));

  console.log('YouTube Official Audit Ergebnis:');
  Object.entries(counts).forEach(([k, v]) => console.log(`- ${k}: ${v}`));
  console.log(`Report: ${reportPath}`);

  const hasBlocking = (counts.invalid_id || 0) > 0 || (counts.unreachable || 0) > 0 || (STRICT && (counts.unverified || 0) > 0);
  process.exit(hasBlocking ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
