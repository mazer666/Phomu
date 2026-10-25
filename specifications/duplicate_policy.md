# Duplicate Policy (Katalog)

## Ziel
Dubletten sollen standardmäßig verhindert werden. Erlaubt sind nur bewusst kuratierte Ausnahmen.

## Regel
- Standard: gleiche `artist + title + year` (normalisiert) = **nicht erlaubt**.
- Ausnahme: nur wenn der Key in `specifications/duplicate-allowlist.json` eingetragen ist.
- Zusätzlich werden reine **Secondary-Import-Dubletten** (aktuell `youtube-import.json`) nicht als kuratierter Duplicate-Fehler gezählt, solange höchstens ein Primary-Pack betroffen ist.

## Prozess
1. Duplicate mit `npm run validate-catalog` identifizieren.
2. Inhaltlich prüfen (wirklich gleiche Aufnahme/Release?).
3. Wenn bewusst gewünscht: Key inkl. Begründung im PR ergänzen.
4. Bei nicht gewollter Dublette: Songdaten korrigieren.

## Technische Referenz
- Validator: `src/utils/validate-song-catalog.ts`
- Allowlist: `specifications/duplicate-allowlist.json`
- Secondary-Pack-Filter: `SECONDARY_DUPLICATE_PACKS` in `src/utils/validate-song-catalog.ts`
