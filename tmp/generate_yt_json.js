const fs = require('fs');
const path = require('path');

const scratchpadPath = '/Users/volker/.gemini/antigravity/brain/7f94e3a8-3027-4eee-a6f1-49855065dcf2/browser/scratchpad_xzpvf1ks.md';
const outputPath = '/Users/volker/Phomu/Phomu/src/data/packs/youtube-import.json';

const CONTENT = fs.readFileSync(scratchpadPath, 'utf8');
const lines = CONTENT.split('\n');

const METADATA = {
    1: { year: 2022, genre: 'Pop', tag: 'Modern Hits' },
    2: { year: 1985, genre: 'Pop', tag: '80s Flashback' },
    3: { year: 1968, genre: 'Classic Pop', tag: '60s/70s Legends' },
    4: { year: 1982, genre: 'NDW', tag: 'German New Wave' },
    5: { year: 2024, genre: 'Pop', tag: 'Current Hits' },
    6: { year: 2021, genre: 'Pop', tag: 'Modern Anthems' },
    7: { year: 2024, genre: 'Electronic', tag: 'Dance Floor' },
    8: { year: 2016, genre: 'Latin Pop', tag: 'Latin Heat' },
    9: { year: 2017, genre: 'Latin Pop', tag: 'Latin Essentials' },
};

function clean(str) {
    return str
        .replace(/\(Official Video\)/gi, '')
        .replace(/\(Official Music Video\)/gi, '')
        .replace(/\[Official Video\]/gi, '')
        .replace(/\d+p/g, '')
        .trim();
}

const allSongs = [];
const seen = new Set();

lines.forEach(line => {
    if (line.includes('- Playlist ')) {
        const match = line.match(/- Playlist (\d+): (\[.*\])/);
        if (!match) return;
        const idx = parseInt(match[1]);
        const dataStr = match[2];
        
        try {
            const raw = JSON.parse(dataStr);
            raw.forEach(s => {
                let artist = 'Various Artists';
                let title = s.title;
                if (s.title.includes(' - ')) {
                    const parts = s.title.split(' - ');
                    artist = parts[0].trim();
                    title = parts.slice(1).join(' - ').trim();
                }
                
                const key = `${artist.toLowerCase()}|${title.toLowerCase()}`;
                if (seen.has(key)) return;
                seen.add(key);

                const meta = METADATA[idx] || { year: 2020, genre: 'Pop', tag: 'Import' };
                
                allSongs.push({
                    id: `yt-${s.videoId}`,
                    title: clean(title),
                    artist: clean(artist),
                    year: meta.year,
                    country: 'INT',
                    genre: meta.genre,
                    difficulty: 'medium',
                    mood: ['Popular'],
                    pack: 'YouTube Collection',
                    hints: [
                        `Ein Song von ${artist}.`,
                        `Veröffentlicht um ${meta.year}.`,
                        `Der Titel beginnt mit ${title.substring(0, 1)}.`,
                        'YouTube Fundstück',
                        meta.tag
                    ],
                    lyrics: null,
                    isOneHitWonder: false,
                    links: { youtube: `https://www.youtube.com/watch?v=${s.videoId}` },
                    supportedModes: ['timeline'],
                    isQRCompatible: false
                });
            });
        } catch (e) {
            // Silently skip if parse fails
        }
    }
});

fs.writeFileSync(outputPath, JSON.stringify({
    name: 'YouTube Collection',
    description: 'Automatischer Import aus deinen YouTube Playlists.',
    songs: allSongs
}, null, 2));

console.log(`Successfully generated ${allSongs.length} songs.`);
