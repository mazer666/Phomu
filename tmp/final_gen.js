const fs = require('fs');

const scratchpadPath = '/Users/volker/.gemini/antigravity/brain/7f94e3a8-3027-4eee-a6f1-49855065dcf2/browser/scratchpad_xzpvf1ks.md';
const outputPath = '/Users/volker/Phomu/Phomu/src/data/packs/youtube-import.json';

try {
    const data = fs.readFileSync(scratchpadPath, 'utf8');
    const lines = data.split('\n');
    const songs = [];
    const seen = new Set();
    
    // Manual mapping based on playlist IDs
    const metaMap = {
        1: { year: 2022, genre: 'Pop', tag: 'Modern Hits' },
        2: { year: 1985, genre: 'Pop', tag: '80s' },
        3: { year: 1968, genre: 'Classic', tag: 'Legends' },
        4: { year: 1982, genre: 'NDW', tag: 'German' },
        5: { year: 2024, genre: 'Pop', tag: 'Current' },
        6: { year: 2021, genre: 'Pop', tag: 'Anthems' },
        7: { year: 2024, genre: 'Electronic', tag: 'Dance' },
        8: { year: 2016, genre: 'Latin', tag: 'Heat' },
        9: { year: 2017, genre: 'Latin', tag: 'Essentials' }
    };

    lines.forEach(line => {
        if (line.includes('Playlist ')) {
            const parts = line.split(': ');
            if (parts.length < 2) return;
            const plistNum = parts[0].match(/\d+/)[0];
            const jsonText = parts.slice(1).join(': ');
            
            try {
                if (jsonText.trim().startsWith('[') && jsonText.trim().endsWith(']')) {
                    const rawSongs = JSON.parse(jsonText);
                    rawSongs.forEach(s => {
                        let artist = 'Unknown';
                        let title = s.title;
                        if (s.title.includes(' - ')) {
                            const sParts = s.title.split(' - ');
                            artist = sParts[0].trim();
                            title = sParts.slice(1).join(' - ').trim();
                        }
                        
                        const key = `${artist.toLowerCase()}|${title.toLowerCase()}`;
                        if (seen.has(key)) return;
                        seen.add(key);
                        
                        const m = metaMap[plistNum] || { year: 2020, genre: 'Pop', tag: 'Import' };
                        songs.push({
                            id: 'yt-' + s.videoId,
                            title: title.replace(/\(Official Video\)/gi, '').trim(),
                            artist: artist.trim(),
                            year: m.year,
                            country: 'INT',
                            genre: m.genre,
                            difficulty: 'medium',
                            mood: ['Popular'],
                            pack: 'YouTube Collection',
                            hints: [
                                `Ein Song von ${artist}.`,
                                `Veröffentlicht ${m.year}.`,
                                `Titel: ${title}`,
                                'Gefunden auf YouTube',
                                m.tag
                            ],
                            lyrics: null,
                            isOneHitWonder: false,
                            links: { youtube: 'https://www.youtube.com/watch?v=' + s.videoId },
                            supportedModes: ['timeline'],
                            isQRCompatible: false
                        });
                    });
                } else {
                    console.log(`Skipping malformed playlist data for Playlist ${plistNum}`);
                }
            } catch (e) {
                console.log(`Error parsing Playlist ${plistNum}: ${e.message}`);
            }

        }
    });

    fs.writeFileSync(outputPath, JSON.stringify({
        name: 'YouTube Collection',
        description: 'Automatischer Import.',
        songs: songs
    }, null, 2));
    
    console.log(`Generated ${songs.length} songs.`);
} catch (err) {
    console.error(err);
}
