# Phomu Statusbericht (Stand: 1. April 2026)

## Umgesetzte Phase-1-Bausteine
- ESLint-Baseline repariert: `@typescript-eslint` Plugin ist installiert und in Flat-Config registriert.
- Neues Katalog-Quality-Gate implementiert (`validate-song-catalog.ts`):
  - validiert alle Packs,
  - prüft Duplicate-Kandidaten,
  - prüft Jahres-Coverage ab 1950.
- YouTube-Official-Link-Audit als separates Script hinzugefügt (`audit-official-youtube-links.js`) mit API-Key ausschließlich via ENV.
- CI-Workflow `Quality Gates` hinzugefügt (Lint, Catalog-Validation, Build, optionaler YouTube-Audit über GitHub Secret).

## Aktueller Ergebnisstand der Gates
- Build: erfolgreich.
- Lint: aktuell weiterhin Fehler im bestehenden Codebestand (React Hooks Regeln etc.).
- Catalog Gate: schlägt aktuell erwartbar fehl (Duplicate-Gruppen + fehlende Jahre 1952, 2025, 2026 + bestehende Schema-Fehler).
- YouTube Audit: in dieser Umgebung aktuell `unreachable` wegen Netzwerklimit Richtung YouTube API.

## Nächste direkte Tickets (aus Phase 1)
1. Lint-Fehler priorisiert abarbeiten (beginnen mit `react-hooks/set-state-in-effect` und `MusicPlayer` Fehlern).
2. Duplicate-Richtlinie festlegen (Cross-Pack Wiederholungen erlaubt oder verbieten) und Gate entsprechend schärfen.
3. Fehlende Jahre 1952/2025/2026 ergänzen.
4. Schema-Fehler der bestehenden Songdaten bereinigen, bis Catalog Gate grün ist.


## Phase 2 Umsetzung (ergänzt)
- GameConfig/State um Scoring- und Runden-Parameter erweitert (`roundsToPlay`, `timelineMaxPoints`, optionaler `timeDecay`-Block).
- Timeline-Scoring auf konfigurierbares Maximum gecappt (Standard: 5 Punkte).
- Optionaler Zeitabzug im Lobby-Setup aktivierbar und im Game-Scoring berücksichtigt (wenn Modus die Antwortzeit liefert).
- Cover-Mode-Datenmodell als `coverMode`-Metadaten in `PhomuSong` eingeführt und in der Song-Validierung abgesichert.
- QR-Flow auf Intent-Parsing vorbereitet (`player`, `session`, `pack`) und Legacy-Song-Links bewusst abgefangen.
