/**
 * Prueft, ob jede `coverUrl` im Katalog auf eine existierende Datei zeigt.
 * Aufruf: npx tsx src/utils/check-covers.ts
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SONGS_DIR = join(process.cwd(), 'src/data/songs');
const PUBLIC_DIR = join(process.cwd(), 'public');

interface SongLike {
  id: string;
  coverUrl?: string;
}

function main(): void {
  // Alle Song-Dateien dynamisch erfassen (A.json, A1.json, A10.json, ... NUMBERS.json, Ñ.json)
  const files = existsSync(SONGS_DIR)
    ? readdirSync(SONGS_DIR)
        .filter((f) => f.endsWith('.json'))
        .sort((a, b) => a.localeCompare(b, 'en'))
    : [];
  let checked = 0;
  let broken = 0;
  for (const f of files) {
    const path = join(SONGS_DIR, f);
    if (!existsSync(path)) continue;
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { songs?: SongLike[] };
    for (const s of data.songs ?? []) {
      if (!s.coverUrl) continue;
      checked++;
      if (!existsSync(join(PUBLIC_DIR, s.coverUrl))) {
        broken++;
        console.log(`FEHLER ${f} | ${s.id} | ${s.coverUrl} (Datei existiert nicht)`);
      }
    }
  }
  console.log(`\ncoverUrl geprueft: ${checked} | ohne Datei: ${broken}`);
  if (broken > 0) process.exit(1);
}

main();
