/**
 * Catalog-Validierung für alle Song-Packs.
 *
 * Prüft:
 * 1) Schema-/Feldvalidierung pro Song (nutzt validatePack)
 * 2) Duplicate-Risiko über normalisierte Artist/Title/Jahr-Keys
 * 3) Coverage: mindestens ein Song pro Jahr von 1950 bis aktuellem Jahr
 *
 * Exit-Code:
 * - 0: keine Fehler
 * - 1: mindestens ein Fehler
 */

import fs from 'node:fs';
import path from 'node:path';
import { validatePack } from '@/utils/validate-song-data';
import type { PhomuSong } from '@/types/song';

interface PackFile {
  file: string;
  songs: PhomuSong[];
}


interface QualityBaseline {
  schemaErrors: number;
  duplicateGroups: number;
  missingYears: number;
}

function loadBaseline(): QualityBaseline | null {
  const baselinePath = path.resolve(process.cwd(), 'specifications/quality-baseline.json');
  if (!fs.existsSync(baselinePath)) return null;
  const raw = fs.readFileSync(baselinePath, 'utf-8');
  return JSON.parse(raw) as QualityBaseline;
}


interface DuplicateAllowlist {
  allowedDuplicateKeys: string[];
}

function loadDuplicateAllowlist(): Set<string> {
  const allowlistPath = path.resolve(process.cwd(), 'specifications/duplicate-allowlist.json');
  if (!fs.existsSync(allowlistPath)) return new Set();
  const raw = fs.readFileSync(allowlistPath, 'utf-8');
  const parsed = JSON.parse(raw) as DuplicateAllowlist;
  return new Set(parsed.allowedDuplicateKeys ?? []);
}

interface DuplicateEntry {
  key: string;
  songs: Array<{ id: string; artist: string; title: string; year: number; packFile: string }>;
}

const SECONDARY_DUPLICATE_PACKS = new Set<string>([
  // Import-Pack enthält häufig alternative Uploads/Remaster derselben Songs.
  // Diese sollen kuratierte Pack-Dubletten nicht künstlich aufblasen.
  'youtube-import.json',
]);

interface CatalogIssuesReport {
  generatedAt: string;
  packs: number;
  songs: number;
  schemaErrors: number;
  schemaWarnings: number;
  duplicateGroups: number;
  allowedDuplicateGroups: number;
  ignoredSecondaryDuplicateGroups: number;
  missingYears: number[];
  topDuplicateGroups: DuplicateEntry[];
}

function writeIssuesReport(report: CatalogIssuesReport, reportPath: string): void {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📝 Report geschrieben: ${path.relative(process.cwd(), reportPath)}`);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(feat\.?|ft\.?|featuring|remaster(ed)?|version|edit|radio mix|live)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function duplicateKey(song: PhomuSong): string {
  const normalizedArtist = normalizeText(song.artist);
  const normalizedTitle = normalizeText(song.title);
  return `${normalizedArtist}::${normalizedTitle}::${song.year}`;
}

function readPackFiles(packsDir: string): PackFile[] {
  const files = fs
    .readdirSync(packsDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  return files.map((file) => {
    const fullPath = path.join(packsDir, file);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(raw) as { songs?: PhomuSong[] };
    return { file, songs: data.songs ?? [] };
  });
}

function checkDuplicates(packs: PackFile[]): DuplicateEntry[] {
  const groups = new Map<string, DuplicateEntry['songs']>();

  for (const pack of packs) {
    for (const song of pack.songs) {
      const key = duplicateKey(song);
      const arr = groups.get(key) ?? [];
      arr.push({
        id: song.id,
        artist: song.artist,
        title: song.title,
        year: song.year,
        packFile: pack.file,
      });
      groups.set(key, arr);
    }
  }

  return Array.from(groups.entries())
    .filter(([, songs]) => songs.length > 1)
    .map(([key, songs]) => ({ key, songs }));
}

function isSecondaryDuplicateOnly(entry: DuplicateEntry): boolean {
  const primaryCount = entry.songs.filter((song) => !SECONDARY_DUPLICATE_PACKS.has(song.packFile)).length;
  return primaryCount <= 1;
}

function checkYearCoverage(packs: PackFile[], startYear: number, endYear: number): number[] {
  const present = new Set<number>();

  for (const pack of packs) {
    for (const song of pack.songs) {
      if (song.year >= startYear && song.year <= endYear) {
        present.add(song.year);
      }
    }
  }

  const missing: number[] = [];
  for (let y = startYear; y <= endYear; y += 1) {
    if (!present.has(y)) {
      missing.push(y);
    }
  }

  return missing;
}

function resolveCoverageEndYear(args: string[], currentYear: number): number {
  const explicitArg = args.find((arg) => arg.startsWith('--coverage-end-year='));
  if (!explicitArg) {
    // Default: laufendes Jahr muss ebenfalls abgedeckt sein.
    return currentYear;
  }

  const parsed = Number(explicitArg.replace('--coverage-end-year=', '').trim());
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > currentYear + 1) {
    throw new Error(`Ungültiger Wert für --coverage-end-year: "${explicitArg}"`);
  }
  return parsed;
}

function main(): void {
  const packsDir = path.resolve(process.cwd(), 'src/data/packs');
  const packs = readPackFiles(packsDir);

  let totalSongs = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const pack of packs) {
    totalSongs += pack.songs.length;
    const result = validatePack({ songs: pack.songs, meta: { pack: pack.file } });
    totalErrors += result.allErrors.length;
    totalWarnings += result.allWarnings.length;
  }

  const allDuplicates = checkDuplicates(packs);
  const duplicateAllowlist = loadDuplicateAllowlist();
  const allowlistFiltered = allDuplicates.filter((entry) => !duplicateAllowlist.has(entry.key));
  const ignoredSecondaryDuplicates = allowlistFiltered.filter(isSecondaryDuplicateOnly).length;
  const duplicates = allowlistFiltered.filter((entry) => !isSecondaryDuplicateOnly(entry));
  const allowedDuplicates = allDuplicates.length - duplicates.length;
  const currentYear = new Date().getFullYear();
  const coverageEndYear = resolveCoverageEndYear(process.argv, currentYear);
  const missingYears = checkYearCoverage(packs, 1950, coverageEndYear);
  const shouldWriteReport = process.argv.includes('--write-report');
  const reportArg = process.argv.find((arg) => arg.startsWith('--report-path='));
  const reportPath = path.resolve(
    process.cwd(),
    reportArg ? reportArg.replace('--report-path=', '') : 'specifications/catalog_issues_report.json',
  );

  console.log('🎛️  Phomu Katalog-Qualitätsgate');
  console.log(`Packs: ${packs.length}`);
  console.log(`Songs: ${totalSongs}`);
  console.log(`Schema-Fehler: ${totalErrors}`);
  console.log(`Schema-Warnungen: ${totalWarnings}`);
  console.log(`Duplicate-Gruppen: ${duplicates.length}`);
  console.log(`Erlaubte Dubletten (Allowlist): ${allowedDuplicates}`);
  console.log(`Ignorierte Secondary-Dubletten: ${ignoredSecondaryDuplicates}`);
  console.log(`Fehlende Jahre (1950-${coverageEndYear}): ${missingYears.length}`);

  if (duplicates.length > 0) {
    console.log('\n❌ Duplicate-Kandidaten (Top 20):');
    duplicates.slice(0, 20).forEach((d, i) => {
      console.log(` ${i + 1}. ${d.key}`);
      d.songs.forEach((s) => {
        console.log(`    - ${s.artist} – ${s.title} (${s.year}) [${s.packFile} :: ${s.id}]`);
      });
    });
  }

  if (missingYears.length > 0) {
    console.log(`\n❌ Fehlende Jahre: ${missingYears.join(', ')}`);
  }

  if (shouldWriteReport) {
    const report: CatalogIssuesReport = {
      generatedAt: new Date().toISOString(),
      packs: packs.length,
      songs: totalSongs,
      schemaErrors: totalErrors,
      schemaWarnings: totalWarnings,
      duplicateGroups: duplicates.length,
      allowedDuplicateGroups: allowedDuplicates,
      ignoredSecondaryDuplicateGroups: ignoredSecondaryDuplicates,
      missingYears,
      topDuplicateGroups: duplicates,
    };
    writeIssuesReport(report, reportPath);
  }

  const strictMode = process.argv.includes('--strict');
  const baseline = loadBaseline();
  const hasHardFailures = totalErrors > 0 || duplicates.length > 0 || missingYears.length > 0;

  if (strictMode || !baseline) {
    if (hasHardFailures) {
      process.exit(1);
    }
    console.log('\n✅ Katalog-Gate bestanden (strict).');
    return;
  }

  const regression =
    totalErrors > baseline.schemaErrors ||
    duplicates.length > baseline.duplicateGroups ||
    missingYears.length > baseline.missingYears;

  if (regression) {
    console.log('\n❌ Regression gegen quality-baseline.json erkannt.');
    process.exit(1);
  }

  console.log('\n✅ Katalog-Gate bestanden (keine Regression gegen Baseline).');
}

main();
