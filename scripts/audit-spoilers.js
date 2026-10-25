const fs = require('fs');
const path = require('path');

// We use a simplified version of the censor logic for this script (we need CommonJS)
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

// The pack files were migrated to the unified songs directory
// (src/data/packs now only holds the legacy proxy index.ts).
// Without this adjustment the audit ran over an empty set and falsely
// reported "0 spoilers".
const songsDir = path.join(__dirname, '../src/data/songs');
const files = fs
  .readdirSync(songsDir)
  .filter(f => f.endsWith('.json') && f !== 'packs.json');

console.log(`🔍 Phomu spoiler audit started...\n`);
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
    console.log(`📦 ${file}: ${packSpoilers.length} spoilers found!`);
  }
}

// The report is a generated audit artifact and must NOT modify the repo root -
// that would produce an unversioned file on every run (and it would
// accidentally get committed later). Therefore it lands in
// node_modules/.cache (git-ignored).
const reportDir = path.join(__dirname, '../node_modules/.cache');
const reportPath = path.join(reportDir, 'spoiler-report.json');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n✅ Audit finished.`);
console.log(`Total spoilers: ${totalSpoilers}`);
console.log(`Detailed report saved to ${reportPath}.`);
