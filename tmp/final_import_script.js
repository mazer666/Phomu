const fs = require('fs');
const path = require('path');

// --- Paths ---
const SCRATCHPAD_PREV = '/Users/volker/.gemini/antigravity/brain/7f94e3a8-3027-4eee-a6f1-49855065dcf2/browser/scratchpad_xzpvf1ks.md';
const SCRATCHPAD_PL8 = '/Users/volker/.gemini/antigravity/brain/297ad91c-4a8d-47e7-9391-4056fc75c298/browser/scratchpad_76z4sscj.md';
const SCRATCHPAD_PL10 = '/Users/volker/.gemini/antigravity/brain/297ad91c-4a8d-47e7-9391-4056fc75c298/browser/scratchpad_kbfp2ddr.md';
const OUTPUT_PATH = '/Users/volker/Phomu/Phomu/src/data/packs/youtube-import.json';
const CHECKPOINT_PATH = '/Users/volker/Phomu/Phomu/tmp/import_checkpoint.json';

// --- Metadata Configuration ---
const METADATA_MAP = {
    1: { year: 2022, genre: 'Pop', tag: 'Modern Hits' },
    2: { year: 1985, genre: 'Pop', tag: '80s Flashback' },
    3: { year: 1968, genre: 'Classic Pop', tag: '60s/70s Legends' },
    4: { year: 1982, genre: 'NDW', tag: 'German New Wave' },
    5: { year: 2024, genre: 'Pop', tag: 'Current Hits' },
    6: { year: 2021, genre: 'Pop', tag: 'Modern Anthems' },
    7: { year: 2024, genre: 'Electronic', tag: 'Dance Floor' },
    8: { year: 2016, genre: 'Latin Pop', tag: 'Latin Heat' },
    9: { year: 2017, genre: 'Latin Pop', tag: 'Latin Essentials' },
    10: { year: 1990, genre: 'All-Time', tag: 'Legends & Classics' } // Generic for mixed PL10
};

// --- Utilities ---
function clean(str) {
    if (!str) return 'Unknown';
    return str
        .replace(/\(Official Video\)/gi, '')
        .replace(/\(Official Music Video\)/gi, '')
        .replace(/\[Official Video\]/gi, '')
        .replace(/\(Video Oficial\)/gi, '')
        .replace(/\[Video Oficial\]/gi, '')
        .replace(/\(Lyric Video\)/gi, '')
        .replace(/\(Official Audio\)/gi, '')
        .replace(/\d+p/g, '') // Remove 1080p etc
        .trim();
}

function saveCheckpoint(data) {
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(data, null, 2));
}

// --- Extraction ---
const allSongs = [];
const seenIds = new Set();

function addSong(playlistIdx, rawSong) {
    if (!rawSong.videoId || seenIds.has(rawSong.videoId)) return;
    seenIds.add(rawSong.videoId);

    let artist = 'Various Artists';
    let title = rawSong.title;

    if (rawSong.title.includes(' - ')) {
        const parts = rawSong.title.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
    }

    const meta = METADATA_MAP[playlistIdx] || { year: 2020, genre: 'Pop', tag: 'General Import' };

    allSongs.push({
        id: `yt-${rawSong.videoId}`,
        title: clean(title),
        artist: clean(artist),
        year: meta.year,
        country: 'INT',
        genre: meta.genre,
        difficulty: 'medium',
        mood: ['Popular', meta.tag],
        pack: 'YouTube Collection',
        hints: [
            `Ein Song von ${artist}.`,
            `Gefunden im Genre ${meta.genre}.`,
            `Der Titel lautet: ${clean(title)}`,
            `Playlist-Tag: ${meta.tag}`
        ],
        lyrics: null,
        isOneHitWonder: false,
        links: { youtube: `https://www.youtube.com/watch?v=${rawSong.videoId}` },
        supportedModes: ['timeline'],
        isQRCompatible: false
    });
}

// --- Main Process ---
async function run() {
    console.log("Starting data merge with resilience and checkpoints...");

    // 1. Process Playlists 1-7, 9 from previous scratchpad
    try {
        const dataStr = fs.readFileSync(SCRATCHPAD_PREV, 'utf8');
        const lines = dataStr.split('\n');
        lines.forEach(line => {
            const match = line.match(/- Playlist (\d+): (\[.*\])/);
            if (match) {
                const idx = parseInt(match[1]);
                try {
                    const songs = JSON.parse(match[2]);
                    console.log(`Processing Playlist ${idx} (${songs.length} songs)...`);
                    songs.forEach(s => addSong(idx, s));
                } catch (e) {
                    console.error(`Failed to parse PL${idx} JSON.`);
                }
            }
        });
    } catch (e) {
        console.warn("Could not read previous scratchpad. Skipping PL1-7, 9.");
    }

    saveCheckpoint(allSongs);

    // 2. Process Playlist 8 (Modern scrap)
    try {
        const dataStr = fs.readFileSync(SCRATCHPAD_PL8, 'utf8');
        const songs = JSON.parse(dataStr);
        console.log(`Processing Playlist 8 (${songs.length} songs)...`);
        songs.forEach(s => addSong(8, s));
    } catch (e) {
        console.warn("Could not read Playlist 8 scratchpad.");
    }

    saveCheckpoint(allSongs);

    // 3. Process Playlist 10 (Modern scrap)
    try {
        const dataStr = fs.readFileSync(SCRATCHPAD_PL10, 'utf8');
        // Extract JSON from markdown block
        const jsonMatch = dataStr.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            const songs = JSON.parse(jsonMatch[1]);
            console.log(`Processing Playlist 10 (${songs.length} songs)...`);
            songs.forEach(s => addSong(10, s));
        }
    } catch (e) {
        console.warn("Could not read Playlist 10 scratchpad.");
    }

    // --- Final Output ---
    const finalData = {
        name: 'YouTube Collection',
        description: 'Dynamically imported songs from various YouTube playlists.',
        songs: allSongs
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
    console.log(`\nDONE! Total unique songs imported: ${allSongs.length}`);
    console.log(`Final file: ${OUTPUT_PATH}`);
}

run().catch(err => {
    console.error("CRITICAL ERROR DURING IMPORT:");
    console.error(err);
    process.exit(1);
});
