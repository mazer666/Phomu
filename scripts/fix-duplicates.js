const fs = require('fs');
const path = require('path');

const PACKS_DIR = path.join(__dirname, '../src/data/packs');
const files = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(PACKS_DIR, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const songs = content.songs || [];
  
  const seenIds = new Set();
  const uniqueSongs = [];
  let removedCount = 0;

  songs.forEach(song => {
    if (!seenIds.has(song.id)) {
      seenIds.add(song.id);
      uniqueSongs.push(song);
    } else {
      removedCount++;
    }
  });

  if (removedCount > 0) {
    content.songs = uniqueSongs;
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`✅ ${file}: Removed ${removedCount} duplicates.`);
  }
});
