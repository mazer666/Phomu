const fs = require('fs');
const path = require('path');

const packsDir = path.join(__dirname, '../src/data/packs');
const outputFile = path.join(__dirname, '../song_database_export.csv');

const files = fs
  .readdirSync(packsDir)
  .filter((file) => file.endsWith('.json') && file !== 'youtube-import.json');

const escapeCsv = (value) => String(value ?? '').replace(/"/g, '""');
const youtubeUrlFromSong = (song) => {
  if (song.youtubeUrl) {
    return song.youtubeUrl;
  }

  const youtubeId = song.links?.youtube;
  if (youtubeId) {
    return `https://www.youtube.com/watch?v=${youtubeId}`;
  }

  return '';
};

let csvContent = 'Pack;Artist;Track;Year;YouTube Link;Hints;Genre;Vibe\n';

files.forEach((file) => {
  const filePath = path.join(packsDir, file);
  const fallbackPackName = file.replace('.json', '');
  const rawData = fs.readFileSync(filePath, 'utf8');

  try {
    const parsed = JSON.parse(rawData);
    const songs = Array.isArray(parsed) ? parsed : parsed.songs;

    if (!Array.isArray(songs)) {
      console.error(`Fehler beim Lesen von ${file}: songs ist kein Array`);
      return;
    }

    const packName = parsed?.meta?.pack || fallbackPackName;

    songs.forEach((song) => {
      const hints = Array.isArray(song.hints) ? song.hints.join(' | ') : '';
      const vibe = Array.isArray(song.mood)
        ? song.mood.join(' | ')
        : (song.vibe || '');

      csvContent += `"${escapeCsv(packName)}";"${escapeCsv(song.artist)}";"${escapeCsv(song.title)}";"${escapeCsv(song.year)}";"${escapeCsv(youtubeUrlFromSong(song))}";"${escapeCsv(hints)}";"${escapeCsv(song.genre)}";"${escapeCsv(vibe)}"\n`;
    });
  } catch (error) {
    console.error(`Fehler beim Lesen von ${file}:`, error.message);
  }
});

fs.writeFileSync(outputFile, csvContent, 'utf8');
console.log(`Erfolg! ${outputFile} wurde erstellt.`);
