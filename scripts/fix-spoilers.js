const fs = require('fs');
const path = require('path');

// --- Configuration (Catalog for Short Artists) ---
const SPOILER_MIN_LENGTH = 4;
const EXCEPTIONS = [
  'BTS', 'TLC', 'U2', 'REM', 'R.E.M.', 'SIA', 'DMX', 'HIM', 'JLS', 'ELO', 'YES', 'AIR', 'ABC', '112', 'JAY', 'ZAY', 'NWA', 'N.W.A.', 'NAS', 'E17',
  '311', 'LFO', 'KRS', 'GZA', 'RZA', 'MIA', 'M.I.A.', 'GNR', 'G\'N\'R', 'NEO', 'BVB', 'STS', 'DÖF', 'DAF', 'Fettes Brot', 'Die Ärzte', '2Pac', '50 Cent'
];
const IGNORE_WORDS = [
  'THE', 'AND', 'WITH', 'FROM', 'FEAT', 'THAT', 'THIS', 'YOUR', 'MINE', 'SOME',
  'DER', 'DIE', 'DAS', 'UND', 'MIT', 'VON', 'FÜR', 'EINE', 'EINER', 'EINES'
];

/**
 * Escapes characters for a regular expression.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Censors a single hint using artist and title as keywords.
 */
function censorHint(hint, artist, title) {
  if (!hint) return hint;
  const tokensToCensor = new Set();
  
  [artist, title].forEach(text => {
    // Check for full name exceptions (e.g. "BTS")
    const cleanFull = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (EXCEPTIONS.includes(cleanFull)) {
      tokensToCensor.add(text);
    }

    // Process individual words
    const words = text.split(/[\s\-&,/]+/);
    words.forEach(word => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (IGNORE_WORDS.includes(clean)) return;
      if (clean.length >= SPOILER_MIN_LENGTH || EXCEPTIONS.includes(clean)) {
        tokensToCensor.add(clean);
      }
    });
  });

  let censored = hint;
  const sortedTokens = Array.from(tokensToCensor)
    .filter(t => t.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    const isShort = token.length < 4;
    const regexSource = isShort 
      ? `\\b${escapeRegExp(token)}\\b` 
      : escapeRegExp(token);
    
    censored = censored.replace(new RegExp(regexSource, 'gi'), '[XXX]');
  }
  return censored;
}

const packsDir = path.join(__dirname, '../src/data/packs');
const files = fs.readdirSync(packsDir).filter(f => f.endsWith('.json'));

let totalFixed = 0;
console.log(`🤖 Phomu Auto-Censor gestartet...\n`);

for (const file of files) {
  const filePath = path.join(packsDir, file);
  const packData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let fileModified = false;

  packData.songs.forEach(song => {
    song.hints = song.hints.map(hint => {
      const newHint = censorHint(hint, song.artist, song.title);
      if (newHint !== hint) {
        fileModified = true;
        totalFixed++;
      }
      return newHint;
    });
  });

  if (fileModified) {
    fs.writeFileSync(filePath, JSON.stringify(packData, null, 2));
    console.log(`✅ ${file} wurde bereinigt.`);
  } else {
    console.log(`💡 ${file} war bereits sauber.`);
  }
}

console.log(`\n🎉 Fertig! Insgesamt wurden ${totalFixed} Spoiler mit [XXX] zensiert.`);
