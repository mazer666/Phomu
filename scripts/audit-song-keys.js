const fs = require('fs');
const path = require('path');

const PACKS_DIR = path.join(__dirname, '../src/data/packs');
const files = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));

const idCounts = {};
const duplicates = [];

files.forEach(file => {
  const content = JSON.parse(fs.readFileSync(path.join(PACKS_DIR, file), 'utf-8'));
  const songs = content.songs || [];

  songs.forEach(song => {
    const id = song.id;
    if (!id) return;
    
    idCounts[id] = (idCounts[id] || 0) + 1;
    if (idCounts[id] === 2) {
      duplicates.push(id);
    }
  });
});

if (duplicates.length > 0) {
  console.log('❌ Found duplicates:');
  duplicates.forEach(id => {
    console.log(`- ${id} (${idCounts[id]} times)`);
  });
} else {
  console.log('✅ No duplicate IDs found across all packs.');
}
