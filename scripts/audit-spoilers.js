const fs = require('fs');
const path = require('path');

// Wir nutzen eine vereinfachte Version der Censor-Logik für das Script (da wir CommonJS brauchen)
const SPOILER_MIN_LENGTH = 4;
const EXCEPTIONS = [
  'BTS', 'TLC', 'U2', 'REM', 'R.E.M.', 'SIA', 'DMX', 'HIM', 'JLS', 'ELO', 'YES', 'AIR', 'ABC', '112', 'JAY', 'ZAY', 'NWA', 'N.W.A.', 'NAS', 'E17',
  '311', 'LFO', 'KRS', 'GZA', 'RZA', 'MIA', 'M.I.A.', 'GNR', 'G\'N\'R', 'NEO', 'BVB', 'STS', 'DÖF', 'DAF', 'Fettes Brot', 'Die Ärzte', '2Pac', '50 Cent'
];
const IGNORE_WORDS = [
  'THE', 'AND', 'WITH', 'FROM', 'FEAT', 'THAT', 'THIS', 'YOUR', 'MINE', 'SOME',
  'DER', 'DIE', 'DAS', 'UND', 'MIT', 'VON', 'FÜR', 'EINE', 'EINER', 'EINES'
];

function checkSpoiler(hint, artist, title) {
  if (!hint) return null;
  const tokens = new Set();
  
  [artist, title].forEach(text => {
    const words = text.split(/[\s\-&,/]+/);
    words.forEach(word => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (IGNORE_WORDS.includes(clean)) return;
      if (clean.length >= SPOILER_MIN_LENGTH || EXCEPTIONS.includes(clean)) {
        tokens.add(clean);
      }
    });
  });

  const found = [];
  const upperHint = hint.toUpperCase();
  for (const token of tokens) {
    if (upperHint.includes(token)) {
      found.push(token);
    }
  }
  return found.length > 0 ? found : null;
}

// Die Pack-Dateien wurden in das einheitliche songs-Verzeichnis migriert
// (src/data/packs enthaelt nur noch den Legacy-Proxy index.ts).
// Ohne diese Anpassung lief das Audit ueber eine leere Menge und meldete
// faelschlich "0 Spoiler".
const songsDir = path.join(__dirname, '../src/data/songs');
const files = fs
  .readdirSync(songsDir)
  .filter(f => f.endsWith('.json') && f !== 'packs.json');

console.log(`🔍 Phomu Spoiler-Audit gestartet...\n`);
let totalSpoilers = 0;
const report = {};

for (const file of files) {
  const packData = JSON.parse(fs.readFileSync(path.join(songsDir, file), 'utf-8'));
  const packSpoilers = [];

  for (const song of packData.songs || []) {
    (song.hints || []).forEach((hint, i) => {
      const spoilers = checkSpoiler(hint, song.artist, song.title);
      if (spoilers) {
        packSpoilers.push({
          id: song.id,
          artist: song.artist,
          title: song.title,
          hintIndex: i + 1,
          hint: hint,
          spoilers: spoilers
        });
        totalSpoilers++;
      }
    });
  }

  if (packSpoilers.length > 0) {
    report[file] = packSpoilers;
    console.log(`📦 ${file}: ${packSpoilers.length} Spoiler gefunden!`);
  }
}

// Der Report ist ein generiertes Audit-Artefakt und darf das Repo-Root NICHT
// veraendern - dort wuerde bei jedem Lauf eine unversionierte Datei auftauchen
// (und spaeter versehentlich mitcommittet). Deshalb landet er in
// node_modules/.cache (git-ignoriert).
const reportDir = path.join(__dirname, '../node_modules/.cache');
const reportPath = path.join(reportDir, 'spoiler-report.json');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n✅ Audit abgeschlossen.`);
console.log(`Gesamtanzahl Spoiler: ${totalSpoilers}`);
console.log(`Detaillierter Report in ${reportPath} gespeichert.`);
