const fs = require('fs');
const path = require('path');
const https = require('https');

const PACKS_DIR = path.join(__dirname, '../src/data/packs');
const files = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));

let totalSongs = 0;
let brokenSongs = [];

async function checkLink(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        resolve(false);
      } else {
        resolve(true);
      }
    }).on('error', () => resolve(false));
  });
}

async function audit() {
  console.log(`Starting audit of ${files.length} packs...`);
  
  for (const file of files) {
    const filePath = path.join(PACKS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Checking ${file} (${data.songs?.length || 0} songs)...`);
    
    if (!data.songs) continue;
    
    for (const song of data.songs) {
      totalSongs++;
      const videoId = song.links?.youtube;
      if (!videoId || videoId.startsWith('TODO')) {
        brokenSongs.push({ file, id: song.id, title: song.title, artist: song.artist, videoId, reason: 'Missing/TODO' });
        continue;
      }
      
      const isValid = await checkLink(videoId);
      if (!isValid) {
        brokenSongs.push({ file, id: song.id, title: song.title, artist: song.artist, videoId, reason: '404' });
        process.stdout.write('X');
      } else {
        process.stdout.write('.');
      }
      
      // Basic rate limiting/concurrency control
      await new Promise(r => setTimeout(r, 50));
    }
    console.log('\n');
  }
  
  console.log('--- AUDIT COMPLETE ---');
  console.log(`Total Songs: ${totalSongs}`);
  console.log(`Broken/Missing: ${brokenSongs.length}`);
  
  fs.writeFileSync('broken-links-report.json', JSON.stringify(brokenSongs, null, 2));
  console.log('Report saved to broken-links-report.json');
}

audit();
