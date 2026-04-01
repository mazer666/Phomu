# Phomu Statusbericht (Stand: 31. März 2026)

## 1) Kurzfazit
Phomu ist ein spielbarer Frontend-Prototyp mit funktionsfähigem Kern-Loop und 6 Modi (inkl. Cover-Confusion im Konfig-Modell). Der produktive Reifegrad ist noch **Pre-Launch**: Lint-Baseline ist aktuell nicht stabil, Songdaten sind lokal valide, Link-Qualität zu offiziellen Videos ist nicht robust abgesichert, und mehrere Produkt-/Datenmodell-Themen sind noch offen.

## 2) Verifizierter Ist-Stand

### Plattform
- Next.js 16.2.1 + React 19 + TypeScript 5.
- Zentraler Zustand via Zustand (`src/stores/game-store.ts`).
- Modus-Liste enthält bereits `cover-confusion` (`src/config/game-config.ts`).

### Content
- Aktuell sind **979 Songs in 26 Packs** im Repo vorhanden (Datei-Summen aus `src/data/packs/*.json`).
- Validierungsscript läuft für das aktuell angebundene Validierungs-Pack erfolgreich.

### Admin/Operations
- Admin-Songeditor ist vorhanden, aber ohne dedizierten Duplikat-Guard, ohne ingest-seitige "Official Video"-Verifikation und ohne abgesicherte Provider-Integration (`src/components/admin/SongEditor.tsx`).

## 3) Testergebnisse vom 31.03.2026

### Build
- `npm run build` ✅ erfolgreich.

### Lint
- `npm run lint` ❌ fehlgeschlagen: `@typescript-eslint` Plugin fehlt in der ESLint-Konfiguration/Installation.

### Song Validation
- `npm run validate-songs` ✅ erfolgreich für `src/data/packs/global-hits.json`.
- Ergebnis: 57/57 gültig und vollständig.

### Link-Audit
- `node scripts/repair-links.js` lief technisch durch, meldet aber 979/979 „broken“.
- Ursache in dieser Umgebung: `ENETUNREACH` gegen YouTube (Netzwerk-/Routing-Limit), daher **kein belastbarer Qualitätsindikator** für echte Link-Gültigkeit.

## 4) Abgleich mit neuen Produktanforderungen

### A) Spielregeln & Scoring
1. Mindeststandard soll 10 Runden sein (noch nicht als explizite Lobby-Regel abgesichert).
2. Timeline darf maximal 5 Punkte bringen (Regel fehlt als zentrale Konstante).
3. Optionaler Zeitstrafen-Modus („später antworten = weniger Punkte“) fehlt im Daten-/Config-Modell.
4. Punktemodell soll über alle Modi ausgewogen sein (aktuell keine dokumentierte Balance-Matrix).

### B) Datenmodell & Inhalte
1. Cover-Modus braucht explizite Datenstruktur (Original vs Cover inklusive Quelle/Qualität).
2. Keine belastbare automatische Duplikaterkennung bei Song-Ingest.
3. Ziel „mindestens ein Song pro Jahr ab 1950“ ist nicht als harter Qualitäts-Check implementiert.
4. Zielausbau von ~1.000 auf 5.000 Songs braucht kuratiertes Pipeline- und QA-Modell.

### C) QR-/Card-Flow
1. QR-Codes sollen nicht direkt auf einzelne Songs zeigen → aktuell ist der Song-ID-Flow vorgesehen (`/play?id=SONG_ID`).
2. Erforderlich wäre ein "Session-Intent"-Flow (z. B. Pack/Challenge/Seed statt fixer Song-ID).

### D) UX/UI/Go-to-Market
1. Pack-Auswahl ist funktional, aber noch nicht „occasion-driven“ (Partygröße, Dauer, Energielevel, Sprachmix).
2. Visual Language ist uneinheitlich zwischen Bereichen; kein dokumentiertes Figma→Code Design-System.
3. Performance-/A11y-Budgets sind nicht formal definiert.

## 5) Priorisierte nächste Schritte (empfohlen)

### Phase 1 (1–2 Wochen): Stabilität + Qualitätstore
1. ESLint/TypeScript-Baseline reparieren (`@typescript-eslint` sauber integrieren).
2. Daten-Quality-Gates in CI:
   - Schema-Validation für alle Packs,
   - Duplicate-Checks (normalisierte Keys, ISRC optional),
   - Year-Coverage-Check (1950–heute).
3. Link-Verification von „official videos“ über robusten Provider-Workflow (YouTube Data API + Kanal/Topic-Heuristik + manueller Review-Status).

### Phase 2 (2–4 Wochen): Regelwerk + Datenmodell
1. GameConfig erweitern:
   - `roundCountDefault >= 10`,
   - `timelineMaxPoints = 5`,
   - optional `timeDecayEnabled` + `timeDecayCurve`.
2. Cover-Confusion Datenmodell ergänzen:
   - `originalSongId`, `coverArtist`, `coverYear`, `coverType`, `rightsConfidence`, `sourceQuality`.
3. QR-Routing umbauen auf Session-/Pack-basierte Deep Links statt Song-Hardlink.

### Phase 3 (4–8 Wochen): Scale auf 5.000 Songs + Growth
1. Katalogstrategie: 10 Kernmärkte + Jahrzehnt-/Genre-Quoten + "mind. 1 Song/Jahr ab 1950".
2. Assisted Curation Tooling (Admin):
   - OpenRouter-gestützte Vorschläge,
   - lokale Key-Nutzung (kein Server-Persist),
   - verpflichtende Duplicate-Prüfung vor Save.
3. Party-Growth Features:
   - 15-Minuten-Modus,
   - TV-Host-Ansicht im "You Don’t Know Jack"-Stil,
   - virale Join-Flows (QR zur Session, nicht zum Song).

## 6) PM-Definition „Best-in-Class“ (Outcome-orientiert)
- **North Star:** „Songs gespielt pro Party-Abend“ + „Wiederkehr innerhalb 14 Tage“.
- **Taktische KPI:** Time-to-fun < 60s, Abbruchquote Setup < 15%, mediane Sessiondauer 25–45 min.
- **Release-Prinzip:** Qualitätstore vor Content-Skalierung, sonst vervielfachen sich Datenfehler.
