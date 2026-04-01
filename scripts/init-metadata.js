const fs = require('fs');
const path = require('path');

const PACKS_DIR = path.join(__dirname, '../src/data/packs');

function processPacks() {
  const files = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));

  files.forEach(file => {
    const filePath = path.join(PACKS_DIR, file);
    const pack = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (pack.songs) {
      pack.songs = pack.songs.map(song => {
        // 1. Supported Modes
        const modes = ['timeline', 'hint-master', 'vibe-check', 'cover-confusion', 'survivor'];
        if (song.lyrics && song.lyrics.real && song.lyrics.real.some(l => !l.includes('Instrumental'))) {
          modes.push('lyrics-labyrinth');
        }
        
        // 2. QR Compatibility (User mentioned Mozart/old years are hard)
        const isQRCompatible = song.year >= 1920;

        return {
          ...song,
          supportedModes: song.supportedModes || modes,
          isQRCompatible: song.isQRCompatible !== undefined ? song.isQRCompatible : isQRCompatible
        };
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf8');
    console.log(`✅ Processed ${file}`);
  });
}

processPacks();
