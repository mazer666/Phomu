#!/usr/bin/env node
/**
 * Link verification for the Phomu catalogue.
 * -------------------------------------------------------------------------
 * WHAT
 *   Fetches the links that are set in `src/data/songs/**` and checks whether
 *   they point at the song of the catalogue entry:
 *
 *     - Spotify      `open.spotify.com/embed/track/<id>` → title, artists,
 *                    release date, runtime
 *     - Amazon Music `music.amazon.com` track detail → title, artist, album,
 *                    runtime, release date
 *     - YouTube      `youtube.com/oembed` → video exists, video title
 *
 *   The provider data is compared against an independent reference (the
 *   iTunes Search API) with the match gate of
 *   `specifications/link_welle_status.md`:
 *
 *     - core title  >= 0.95
 *     - artist      >= 0.90 (>= 0.85 for an ensemble credit)
 *     - runtime     within 3 s of the reference, or a unique hit
 *
 *   A link that does not pass the gate is reported as `mismatch`. It is
 *   **never** repaired here — a repaired link must come from a documented
 *   research run, not from a gate.
 *
 * WHY
 *   The second session set 1,591 Spotify and 1,575 Amazon links, but nobody
 *   ever fetched them. A link that is set is not a link that works. This
 *   script is the reproducible proof: it runs inside the repository, it can
 *   be repeated by anybody, and it says honestly how many links it checked
 *   and how many it did not check.
 *
 * OPTIONS
 *   --limit=<n>       check at most n songs (0 = all)
 *   --sample=<n>      check n randomly chosen songs (seeded, reproducible)
 *   --seed=<n>        seed of the sample (default 20260101)
 *   --providers=<l>   comma separated: spotify,amazon,youtube (default: all)
 *   --songs=<l>       comma separated song ids to check
 *   --out=<path>      write the JSON report there
 *   --refresh         ignore the cache
 *   --no-cache        do not read or write the cache
 *   --jobs=<n>        parallel requests (default 3)
 *   --quiet           only print the summary
 *
 * EXAMPLE
 *   node scripts/verify-links.mjs --limit=50
 *   node scripts/verify-links.mjs --sample=200 --seed=42 --out=report.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  matchGate,
  matchTitle,
  matchArtist,
  normalizeText,
  parseIsoDuration,
  parseTitle,
  parseTitleVariants,
  contentWords,
  versionQualifiers,
} from './lib/link-match.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SONGS_DIR = path.join(REPO_ROOT, 'src/data/songs');
const CACHE_FILE = path.join(REPO_ROOT, 'tmp/link-verify-cache.json');

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const RETRIES = 3;
const TIMEOUT_MS = 25000;
const SPOTIFY_HOST = 'https://open.spotify.com';
const AMAZON_SKILL = 'https://na.mesk.skill.music.a2z.com';
const ITUNES_HOST = 'https://itunes.apple.com';

/**
 * Read an option of the form `--name=value`.
 *
 * @param {string} name the option name
 * @param {string} fallback the value used when the option is absent
 * @returns {string} the value of the option
 */
function option(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

/**
 * Read the flag `--name`.
 *
 * @param {string} name the flag name
 * @returns {boolean} whether the flag is present
 */
function flag(name) {
  return process.argv.includes(`--${name}`);
}

/**
 * Load every song of the catalogue.
 *
 * @returns {Array<{file: string, id: string, song: object}>} the songs
 */
function loadSongs() {
  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
  const songs = [];
  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));
    for (const song of parsed.songs ?? []) {
      songs.push({ file, id: song.id, song });
    }
  }
  return songs;
}

/**
 * A tiny persistent cache so that a second run does not fetch everything again.
 */
class Cache {
  constructor(enabled, refresh) {
    this.enabled = enabled;
    this.refresh = refresh;
    this.data = new Map();
    this.hits = 0;
    this.misses = 0;
    if (enabled && !refresh && fs.existsSync(CACHE_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        for (const [key, value] of Object.entries(raw)) this.data.set(key, value);
      } catch {
        /* a broken cache is no reason to abort the run */
      }
    }
  }

  /**
   * @param {string} key the cache key
   * @returns {object|undefined} the cached value
   */
  get(key) {
    if (!this.enabled) return undefined;
    if (!this.data.has(key)) {
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return this.data.get(key);
  }

  /**
   * @param {string} key the cache key
   * @param {object} value the value to store
   */
  set(key, value) {
    if (!this.enabled) return;
    this.data.set(key, value);
  }

  /** Write the cache back to disk. */
  save() {
    if (!this.enabled) return;
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    const plain = {};
    for (const [key, value] of this.data) plain[key] = value;
    fs.writeFileSync(CACHE_FILE, `${JSON.stringify(plain)}\n`);
  }
}

/**
 * HTTP GET with a timeout and retries with exponential backoff.
 *
 * @param {string} url the URL
 * @param {object} [options] the options
 * @returns {Promise<{status: number, body: string, error?: string}>} the response
 */
async function httpGet(url, options = {}) {
  let lastError = 'unknown';
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    if (attempt > 0) {
      const backoff = Math.min(8000, 500 * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*', ...(options.headers ?? {}) },
      });
      const body = await response.text();
      clearTimeout(timer);
      if ((response.status >= 500 || response.status === 429) && attempt < RETRIES - 1) {
        lastError = `HTTP ${response.status}`;
        await new Promise((resolve) => setTimeout(resolve, 1200 * 2 ** attempt));
        continue;
      }
      return { status: response.status, body };
    } catch (error) {
      clearTimeout(timer);
      lastError = error.name === 'AbortError' ? 'timeout' : String(error.message ?? error);
    }
  }
  return { status: 0, body: '', error: lastError };
}

/**
 * HTTP POST with a timeout and retries with exponential backoff.
 *
 * @param {string} url the URL
 * @param {string} payload the request body
 * @param {object} [options] the options
 * @returns {Promise<{status: number, body: string, error?: string}>} the response
 */
async function httpPost(url, payload, options = {}) {
  let lastError = 'unknown';
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    if (attempt > 0) {
      const backoff = Math.min(8000, 500 * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/json',
          Referer: 'https://music.amazon.com/',
          Origin: 'https://music.amazon.com',
          ...(options.headers ?? {}),
        },
        body: payload,
      });
      const body = await response.text();
      clearTimeout(timer);
      if ((response.status >= 500 || response.status === 429) && attempt < RETRIES - 1) {
        lastError = `HTTP ${response.status}`;
        await new Promise((resolve) => setTimeout(resolve, 1200 * 2 ** attempt));
        continue;
      }
      return { status: response.status, body };
    } catch (error) {
      clearTimeout(timer);
      lastError = error.name === 'AbortError' ? 'timeout' : String(error.message ?? error);
    }
  }
  return { status: 0, body: '', error: lastError };
}

/**
 * The header set the Amazon Music skill API expects.
 *
 * The endpoint is public and works without an account; the values are the
 * ones the web player sends for an anonymous session.
 *
 * @param {string} asin the track ASIN
 * @returns {object} the header object
 */
function amazonHeaders(asin) {
  return {
    'x-amzn-authentication': JSON.stringify({
      interface: 'ClientAuthenticationInterface.v1_0.ClientTokenElement',
      accessToken: '',
    }),
    'x-amzn-device-model': 'WEBPLAYER',
    'x-amzn-device-family': 'WebPlayer',
    'x-amzn-device-width': '1920',
    'x-amzn-device-height': '1080',
    'x-amzn-device-id': String(BigInt(Math.floor(Math.random() * 9e17) + 1e17)),
    'x-amzn-session-id': `${Math.floor(Math.random() * 900 + 100)}-${Math.floor(
      Math.random() * 9e6 + 1e6,
    )}-${Math.floor(Math.random() * 9e6 + 1e6)}`,
    'x-amzn-user-agent': USER_AGENT,
    'x-amzn-device-language': 'en_US',
    'x-amzn-currency-of-preference': 'USD',
    'x-amzn-os-version': '1.0',
    'x-amzn-application-version': '1.0.11621.0',
    'x-amzn-device-time-zone': 'UTC',
    'x-amzn-timestamp': String(Date.now()),
    'x-amzn-request-id': crypto.randomUUID(),
    'x-amzn-music-domain': 'music.amazon.com',
    'x-amzn-referer': '',
    'x-amzn-affiliate-tags': '',
    'x-amzn-ref-marker': '',
    'x-amzn-page-url': `https://music.amazon.com/tracks/${asin}`,
    'x-amzn-weblab-id-overrides': '',
    'x-amzn-video-player-token': '',
    'x-amzn-feature-flags': '',
    'x-amzn-has-profile-id': '',
    'x-amzn-age-band': '',
  };
}

/**
 * Fetch the metadata of a Spotify track from the public embed page.
 *
 * @param {string} trackId the Spotify track id
 * @param {Cache} cache the cache
 * @returns {Promise<object>} the track metadata
 */
async function fetchSpotify(trackId, cache) {
  const key = `spotify:${trackId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const response = await httpGet(`${SPOTIFY_HOST}/embed/track/${trackId}`);
  if (response.status !== 200) {
    const value = { ok: false, error: `HTTP ${response.status}` };
    cache.set(key, value);
    return value;
  }
  const match = response.body.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    const value = { ok: false, error: 'no __NEXT_DATA__ in the embed page' };
    cache.set(key, value);
    return value;
  }
  let entity = null;
  try {
    const parsed = JSON.parse(match[1]);
    entity = parsed?.props?.pageProps?.state?.data?.entity ?? null;
  } catch {
    entity = null;
  }
  if (!entity || entity.type !== 'track') {
    const value = { ok: false, error: 'no track entity in the embed page' };
    cache.set(key, value);
    return value;
  }
  const value = {
    ok: true,
    title: entity.title,
    artists: (entity.artists ?? []).map((artist) => artist.name),
    artist: (entity.artists ?? []).map((artist) => artist.name).join(', '),
    releaseDate: entity.releaseDate?.isoString ?? null,
    year: entity.releaseDate?.isoString ? Number(entity.releaseDate.isoString.slice(0, 4)) : null,
    durationSec: entity.duration ? entity.duration / 1000 : null,
    source: `${SPOTIFY_HOST}/embed/track/${trackId}`,
  };
  cache.set(key, value);
  return value;
}

/**
 * Fetch the metadata of an Amazon Music track from the public skill API.
 *
 * @param {string} asin the track ASIN
 * @param {Cache} cache the cache
 * @returns {Promise<object>} the track metadata
 */
async function fetchAmazon(asin, cache) {
  const key = `amazon:${asin}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const payload = JSON.stringify({
    id: asin,
    userHash: JSON.stringify({ level: 'LIBRARY_MEMBER' }),
    headers: JSON.stringify(amazonHeaders(asin)),
  });
  let lastError = 'unknown';
  let answer = null;
  let storefront = null;
  // The catalogue of Amazon Music differs per storefront. A track that is
  // only in the German store is a valid link — so every storefront is tried
  // before the link is called broken.
  for (const region of ['na', 'eu', 'fe']) {
    const response = await httpPost(
      `${AMAZON_SKILL.replace('na.mesk', `${region}.mesk`)}/api/cosmicTrack/displayCatalogTrack`,
      payload,
    );
    if (response.status !== 200) {
      lastError = `HTTP ${response.status}`;
      continue;
    }
    let recording = null;
    try {
      recording = findMusicRecording(JSON.parse(response.body));
    } catch {
      recording = null;
    }
    if (recording) {
      answer = recording;
      storefront = region;
      break;
    }
    // The answer without a recording is the home gallery: the track is not
    // in the catalogue of this storefront.
    lastError = 'the track is not in the catalogue of this storefront';
  }
  if (!answer) {
    const value = { ok: false, error: lastError };
    cache.set(key, value);
    return value;
  }
  const recording = answer;
  const value = {
    ok: true,
    title: recording.name ?? null,
    artist: recording.byArtist?.name ?? null,
    album: recording.inAlbum?.name ?? null,
    durationSec: parseIsoDuration(recording.duration ?? null),
    releaseDate: recording.datePublished ?? null,
    year: recording.datePublished ? Number(String(recording.datePublished).slice(0, 4)) : null,
    isrc: recording.isrcCode ?? null,
    storefront,
    source: `https://music.amazon.com/tracks/${asin}`,
  };
  cache.set(key, value);
  return value;
}

/**
 * Find the schema.org MusicRecording inside the Amazon answer.
 *
 * @param {object} node the parsed answer
 * @returns {object|null} the recording
 */
function findMusicRecording(node) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findMusicRecording(child);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  if (node['@type'] === 'MusicRecording') return node;
  for (const value of Object.values(node)) {
    // The schema.org block travels as an escaped JSON string inside the
    // SEO head element — it has to be parsed before it can be read.
    if (typeof value === 'string' && value.includes('"@type":"MusicRecording"')) {
      try {
        const found = findMusicRecording(JSON.parse(value));
        if (found) return found;
      } catch {
        /* not a JSON document — keep looking */
      }
    }
    const found = findMusicRecording(value);
    if (found) return found;
  }
  return null;
}

/**
 * Fetch the metadata of a YouTube video from the public oEmbed endpoint.
 *
 * @param {string} videoId the YouTube video id
 * @param {Cache} cache the cache
 * @returns {Promise<object>} the video metadata
 */
async function fetchYouTube(videoId, cache) {
  const key = `youtube:${videoId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;
  const response = await httpGet(url);
  if (response.status !== 200) {
    const value = { ok: false, error: `HTTP ${response.status}` };
    cache.set(key, value);
    return value;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    parsed = null;
  }
  if (!parsed || !parsed.title) {
    const value = { ok: false, error: 'no oEmbed answer' };
    cache.set(key, value);
    return value;
  }
  const value = {
    ok: true,
    title: parsed.title,
    author: parsed.author_name ?? null,
    thumbnail: parsed.thumbnail_url ?? null,
    source: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}`,
  };
  cache.set(key, value);
  return value;
}

/**
 * Fetch the reference of a song from the iTunes Search API.
 *
 * @param {object} song the catalogue entry
 * @param {Cache} cache the cache
 * @returns {Promise<object|null>} the reference
 */
async function fetchReference(song, cache) {
  const term = `${song.title} ${song.artist}`;
  const key = `v3:itunes:${normalizeText(term)}:${song.country ?? ''}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    if (!cached.ok) return null;
    return {
      ...cached.value,
      competitors: cached.candidates ?? [],
      alternateDurations: (cached.sameSong ?? []).map((entry) => entry.durationSec),
    };
  }
  const url = `${ITUNES_HOST}/search?term=${encodeURIComponent(term)}&entity=song&limit=8`;
  const response = await httpGet(url);
  if (response.status !== 200) {
    cache.set(key, { ok: false });
    return null;
  }
  let results = [];
  try {
    results = JSON.parse(response.body).results ?? [];
  } catch {
    results = [];
  }
  const candidates = [];
  for (const result of results) {
    const title = matchTitle(song.title, result.trackName ?? '');
    const artist = matchArtist(song.artist, result.artistName ?? '');
    candidates.push({
      title: result.trackName ?? null,
      artist: result.artistName ?? null,
      album: result.collectionName ?? null,
      durationSec: result.trackTimeMillis ? result.trackTimeMillis / 1000 : null,
      year: result.releaseDate ? Number(String(result.releaseDate).slice(0, 4)) : null,
      trackId: result.trackId ?? null,
      country: result.country ?? null,
      titleScore: title.coreScore,
      fullScore: title.fullScore,
      artistScore: artist.score,
      artistOk: artist.ok,
      titleOk: title.ok,
      plain: !title.qualifierMismatch,
    });
  }
  const passing = candidates.filter((entry) => entry.titleOk && entry.artistOk);
  // Every candidate with the same title and the same artist is evidence for
  // a runtime of *this* song — the reference set, not one arbitrary row.
  // Every candidate that is the *same recording*: the same title and the
  // same artist. A remix or a live take is a different recording and is
  // therefore not part of the reference set.
  const sameSong = candidates.filter(
    (entry) =>
      entry.durationSec != null &&
      entry.titleOk &&
      entry.artistOk &&
      !matchTitle(song.title, entry.title ?? '').versionMismatch,
  );
  // The reference is the candidate that looks most like the catalogue entry:
  // the full title has to match (so a remix is not preferred over the
  // original), and the release year should be close to the catalogue year.
  passing.sort((left, right) => {
    if (Math.abs(right.fullScore - left.fullScore) > 0.0001) {
      return right.fullScore - left.fullScore;
    }
    const leftYear = left.year == null ? 999 : Math.abs(left.year - (song.year ?? 0));
    const rightYear = right.year == null ? 999 : Math.abs(right.year - (song.year ?? 0));
    if (leftYear !== rightYear) return leftYear - rightYear;
    return right.titleScore - left.titleScore;
  });
  // The runtime that most of the candidates share is the runtime of the
  // recording. The album cut and the single cut of a song differ; the
  // plurality is the one that the catalogue entry describes.
  const counts = new Map();
  for (const entry of sameSong) {
    const key = Math.round(entry.durationSec);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let pluralDuration = null;
  let pluralCount = 0;
  for (const [duration, count] of counts) {
    if (count > pluralCount) {
      pluralCount = count;
      pluralDuration = duration;
    }
  }
  const plural =
    pluralCount > 1 ? sameSong.find((entry) => Math.round(entry.durationSec) === pluralDuration) : null;

  const chosen = plural ?? passing[0] ?? null;
  const value = { ok: Boolean(chosen), value: chosen, candidates, sameSong };
  cache.set(key, value);
  if (!chosen) return null;
  return {
    ...chosen,
    competitors: candidates,
    alternateDurations: sameSong.map((entry) => entry.durationSec),
  };
}

/**
 * Extract the YouTube video id of a link.
 *
 * @param {string} link the link
 * @returns {string|null} the video id
 */
function youtubeId(link) {
  if (!link) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(link)) return link;
  const watch = link.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return watch[1];
  const short = link.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  const embed = link.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

/**
 * Extract the Spotify track id of a link.
 *
 * @param {string} link the link
 * @returns {string|null} the track id
 */
function spotifyId(link) {
  if (!link) return null;
  const match = link.match(/open\.spotify\.com\/(?:embed\/)?track\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  const uri = link.match(/spotify:track:([A-Za-z0-9]+)/);
  return uri ? uri[1] : null;
}

/**
 * Extract the Amazon ASIN of a link.
 *
 * @param {string} link the link
 * @returns {string|null} the ASIN
 */
function amazonAsin(link) {
  if (!link) return null;
  const track = link.match(/music\.amazon\.com\/tracks\/([A-Z0-9]{10})/i);
  if (track) return track[1];
  const album = link.match(/music\.amazon\.com\/albums\/([A-Z0-9]{10})/i);
  if (album) return album[1];
  return null;
}

/**
 * Run the tasks with a limited parallelism.
 *
 * @param {Array<() => Promise<void>>} tasks the tasks
 * @param {number} jobs the number of parallel jobs
 */
async function runPool(tasks, jobs) {
  let index = 0;
  const workers = Array.from({ length: Math.max(1, jobs) }, async () => {
    while (index < tasks.length) {
      const current = index;
      index += 1;
      await tasks[current]();
    }
  });
  await Promise.all(workers);
}

/**
 * Deterministic pseudo random generator (mulberry32).
 *
 * @param {number} seed the seed
 * @returns {() => number} the generator
 */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Check one song against every provider.
 *
 * @param {object} entry the catalogue entry
 * @param {Cache} cache the cache
 * @param {Set<string>} providers the providers to check
 * @returns {Promise<object>} the result
 */
async function checkSong(entry, cache, providers) {
  const { song } = entry;
  const checks = {};

  if (providers.has('spotify') && song.links?.spotify) {
    const id = spotifyId(song.links.spotify);
    if (!id) {
      checks.spotify = { verdict: 'unreachable', error: 'unparsable Spotify link' };
    } else {
      const track = await fetchSpotify(id, cache);
      checks.spotify = track.ok
        ? { verdict: 'fetched', link: song.links.spotify, track }
        : { verdict: 'unreachable', link: song.links.spotify, error: track.error };
    }
  }

  if (providers.has('amazon') && song.links?.amazonMusic) {
    const asin = amazonAsin(song.links.amazonMusic);
    if (!asin) {
      checks.amazon = { verdict: 'unreachable', error: 'unparsable Amazon link' };
    } else {
      const track = await fetchAmazon(asin, cache);
      checks.amazon = track.ok
        ? { verdict: 'fetched', link: song.links.amazonMusic, track }
        : { verdict: 'unreachable', link: song.links.amazonMusic, error: track.error };
    }
  }

  if (providers.has('youtube') && song.links?.youtube) {
    const id = youtubeId(song.links.youtube);
    if (!id) {
      checks.youtube = { verdict: 'unreachable', error: 'unparsable YouTube link' };
    } else {
      const video = await fetchYouTube(id, cache);
      checks.youtube = video.ok
        ? { verdict: 'fetched', link: song.links.youtube, video }
        : { verdict: 'unreachable', link: song.links.youtube, error: video.error };
    }
  }

  return checks;
}

/**
 * Compare the fetched provider data with the catalogue entry.
 *
 * @param {object} entry the catalogue entry
 * @param {object} checks the fetched provider data
 * @param {object|null} reference the reference
 * @returns {object} the verdicts per provider
 */
function evaluate(entry, checks, reference) {
  const { song } = entry;
  const verdicts = {};

  for (const provider of ['spotify', 'amazon']) {
    const check = checks[provider];
    if (!check) continue;
    if (check.verdict !== 'fetched') {
      verdicts[provider] = { verdict: check.verdict, error: check.error };
      continue;
    }
    const track = check.track;
    // The gate compares the provider with the *catalogue entry*. The iTunes
    // reference contributes the runtime and the release year — its own
    // wording of the title is not the yardstick.
    const refTitle = song.title;
    const refArtist = song.artist;
    const refDuration = reference?.durationSec ?? null;
    const title = matchTitle(refTitle, track.title ?? '');
    const artist = matchArtist(refArtist, track.artist ?? '');
    // A rival is another *plain* recording of the same title and the same
    // artist whose runtime differs by more than 12 %. A remix or an acoustic
    // version is not a rival — it is a different track with a different
    // title, and it never makes the assignment ambiguous.
    const rivals = (reference?.competitors ?? []).filter(
      (entry_) =>
        entry_.plain &&
        entry_.durationSec != null &&
        track.durationSec != null &&
        Math.abs(entry_.durationSec - track.durationSec) >
          0.12 * (reference?.durationSec ?? entry_.durationSec),
    );
    const unique = rivals.length === 0;
    const gate = matchGate(
      {
        title: refTitle,
        artist: refArtist,
        durationSec: refDuration,
      },
      { title: track.title ?? '', artist: track.artist ?? '', durationSec: track.durationSec },
      {
        unique,
        duration: refDuration != null,
        alternateDurations: reference?.alternateDurations ?? [],
      },
    );
    const yearDelta =
      track.year != null && reference?.year != null ? track.year - reference.year : null;
    verdicts[provider] = {
      verdict: gate.verdict,
      reasons: gate.reasons,
      link: check.link,
      providerTitle: track.title,
      providerArtist: track.artist,
      providerAlbum: track.album ?? null,
      providerDurationSec: track.durationSec,
      providerYear: track.year,
      referenceTitle: refTitle,
      referenceArtist: refArtist,
      referenceDurationSec: refDuration,
      referenceYear: reference?.year ?? null,
      yearDelta,
      titleScore: title.coreScore,
      artistScore: artist.score,
      artistMode: artist.mode,
      durationDeltaSec: gate.duration.delta,
      durationMode: gate.duration.mode,
      source: track.source,
    };
  }

  const youtube = checks.youtube;
  if (youtube) {
    if (youtube.verdict !== 'fetched') {
      verdicts.youtube = { verdict: youtube.verdict, error: youtube.error };
    } else {
      const video = youtube.video;
      const reasons = [];
      let hard = false;

      // 1. The video title has to name the song of the catalogue entry.
      //    Every reading of the video title is tried — "Artist - Song" and
      //    "Song - Version" look the same before the catalogue is known.
      const songCore = parseTitle(song.title).base;
      const songWords = contentWords(songCore);
      const longest = [...songWords].sort((a, b) => b.length - a.length)[0] ?? '';
      let contains = false;
      let distinctive = false;
      let videoCore = '';
      for (const variant of parseTitleVariants(video.title ?? '')) {
        const candidateContains =
          variant.base.includes(songCore) || songCore.includes(variant.base);
        const candidateDistinctive =
          longest.length >= 5 && variant.base.includes(longest);
        if (candidateContains || candidateDistinctive) {
          contains = contains || candidateContains;
          distinctive = distinctive || candidateDistinctive;
          videoCore = variant.base;
          break;
        }
      }
      if (!contains && !distinctive) {
        hard = true;
        reasons.push(`video title "${video.title}" does not name "${song.title}"`);
      }

      // 2. The catalogue names a version ("Nutshell (Unplugged)") — the video
      //    has to name the same version.
      const wanted = versionQualifiers(song.title);
      const videoText = normalizeText(video.title ?? '');
      for (const qualifier of wanted) {
        if (!videoText.includes(qualifier)) {
          hard = true;
          reasons.push(`video title "${video.title}" does not name the version "${qualifier}"`);
        }
      }

      // 3. The channel is reported, but it does not condemn the link: a
      //    topic channel is as legitimate as the official channel.
      const author = normalizeText(video.author ?? '');
      const artistWords = contentWords(normalizeText(song.artist));
      const authorMatches =
        artistWords.length > 0 && artistWords.every((word) => author.includes(word));

      verdicts.youtube = {
        verdict: hard ? 'mismatch' : reasons.length > 0 ? 'warn' : 'ok',
        reasons,
        link: youtube.link,
        providerTitle: video.title,
        providerAuthor: video.author,
        authorMatchesArtist: authorMatches,
        titleScore: contains ? 1 : distinctive ? 0.9 : 0,
        durationSec: null,
        durationNote:
          'the runtime of a YouTube video is not retrievable without an API key (no key in this environment)',
        source: video.source,
      };
    }
  }

  return verdicts;
}

/**
 * The main flow.
 */
async function main() {
  const limit = Number(option('limit', '0'));
  const sampleSize = Number(option('sample', '0'));
  const seed = Number(option('seed', '20260101'));
  const providers = new Set(
    option('providers', 'spotify,amazon,youtube')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const onlyIds = option('songs', '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const outFile = option('out', '');
  const jobs = Number(option('jobs', '3'));
  const quiet = flag('quiet');
  const useCache = !flag('no-cache');
  const refresh = flag('refresh');

  const all = loadSongs();
  let selection = all;
  if (onlyIds.length) {
    const wanted = new Set(onlyIds);
    selection = all.filter((entry) => wanted.has(entry.id));
  } else if (sampleSize > 0) {
    const random = seededRandom(seed);
    const pool = [...all];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    selection = pool.slice(0, Math.min(sampleSize, pool.length));
  } else if (limit > 0) {
    selection = all.slice(0, limit);
  }

  const cache = new Cache(useCache, refresh);
  const started = Date.now();
  const results = [];
  let processed = 0;

  const tasks = selection.map((entry) => async () => {
    const checks = await checkSong(entry, cache, providers);
    const reference = await fetchReference(entry.song, cache);
    const verdicts = evaluate(entry, checks, reference);
    results.push({
      id: entry.id,
      file: entry.file,
      title: entry.song.title,
      artist: entry.song.artist,
      year: entry.song.year,
      verdicts,
      reference: reference
        ? {
            title: reference.title,
            artist: reference.artist,
            album: reference.album,
            durationSec: reference.durationSec,
            year: reference.year,
            trackId: reference.trackId,
          }
        : null,
    });
    processed += 1;
    if (!quiet && processed % 25 === 0) {
      process.stderr.write(`  ... ${processed}/${selection.length}\n`);
    }
    if (processed % 50 === 0) {
      // The cache is written while the run is going. A run that is
      // interrupted then does not throw away the work it has already done —
      // the fetch is the expensive part, the evaluation is cheap.
      cache.save();
    }
  });

  await runPool(tasks, jobs);
  cache.save();

  const summary = {
    songs: selection.length,
    catalogueSongs: all.length,
    providers: [...providers],
    seed: sampleSize > 0 ? seed : null,
    durationSec: Math.round((Date.now() - started) / 1000),
    cacheHits: cache.hits,
    cacheMisses: cache.misses,
    counters: {},
    byProvider: {},
  };
  for (const provider of providers) {
    const counter = { checked: 0, ok: 0, mismatch: 0, unreachable: 0, warn: 0, notSet: 0, notChecked: 0 };
    for (const result of results) {
      const verdict = result.verdicts[provider];
      if (!verdict) {
        counter.notChecked += 1;
        continue;
      }
      counter.checked += 1;
      if (verdict.verdict === 'ok') counter.ok += 1;
      else if (verdict.verdict === 'mismatch') counter.mismatch += 1;
      else if (verdict.verdict === 'warn') counter.warn += 1;
      else counter.unreachable += 1;
    }
    summary.byProvider[provider] = counter;
  }

  const report = { summary, results };
  if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(path.resolve(outFile), `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log('── Phomu link verification ──');
  console.log(`catalogue songs        : ${summary.catalogueSongs}`);
  console.log(`songs in this run      : ${summary.songs}`);
  console.log(`duration               : ${summary.durationSec}s`);
  console.log(`cache hits / misses    : ${summary.cacheHits} / ${summary.cacheMisses}`);
  for (const [provider, counter] of Object.entries(summary.byProvider)) {
    console.log(
      `${provider.padEnd(8)}: checked ${counter.checked}, ok ${counter.ok}, warn ${counter.warn}, mismatch ${counter.mismatch}, unreachable ${counter.unreachable}, not checked ${counter.notChecked}`,
    );
  }
  const mismatches = results.filter((result) =>
    Object.values(result.verdicts).some((verdict) => verdict.verdict === 'mismatch'),
  );
  console.log(`songs with a mismatch  : ${mismatches.length}`);
  for (const result of mismatches.slice(0, 40)) {
    for (const [provider, verdict] of Object.entries(result.verdicts)) {
      if (verdict.verdict !== 'mismatch') continue;
      console.log(
        `  - ${result.id} [${provider}] "${result.title}" / ${result.artist}: ${verdict.reasons.join('; ')}`,
      );
    }
  }
  if (outFile) console.log(`report                 : ${outFile}`);
}

await main();
