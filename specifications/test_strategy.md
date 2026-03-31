# Phomu Test Strategy (aktualisiert: 30. März 2026)

## 1. Build- und Qualitäts-Gates (Pflicht)
- `npm run build` muss erfolgreich sein.
- `npm run lint` muss erfolgreich sein (nach ESLint-Flat-Config-Migration).
- `npm run validate-songs` muss ohne Fehler laufen.

## 2. Funktionale Kern-Tests
- **Lobby-Flow:** Spieler hinzufügen/entfernen, Modi/Packs wählen, Start möglich.
- **Game-Loop:** Drawing → Question → Reveal → nächste Runde / Game Over.
- **Browse:** Suche, Filter, Sortierung und Quick-Start aus Songkarte.

## 3. Responsive & Mobile UX Audit
- Pflicht-Breakpoints: 360px (iPhone SE), 390px/430px (moderne iPhones), 768px (Tablet), 1920px (Desktop).
- Touch-Targets mindestens 44x44px.
- Kein horizontaler Overflow.
- Safe-Area-Verhalten auf iOS prüfen.

## 4. Datenqualität
- Songfelder auf Schema prüfen (ID, Titel, Artist, Jahr, Country, Links, Difficulty, Hints).
- YouTube-IDs/URLs auf valides Format normalisieren.
- Keine Inkonsistenzen zwischen Packs und zentralen Typdefinitionen.

## 5. Security-Tests

### 5.1 Dependency Security
- `npm audit --audit-level=moderate`
- `npm audit --omit=dev --audit-level=moderate`

### 5.2 Static Security Checks (Code)
- Scan auf gefährliche Browser-Patterns:
  - `dangerouslySetInnerHTML`
  - `eval(`
  - `new Function(`

### 5.3 Konfigurations-Security (nachziehen)
- Security-Header-Checks (CSP/HSTS/Referrer-Policy/Permissions-Policy).
- Keine sensiblen Daten im Client-Bundle.
- Secrets-Scanning in CI.

## 6. Empfohlene CI-Pipeline-Reihenfolge
1. Install (`npm ci`)
2. Lint
3. Type/Build
4. Song Validation
5. Security Audits
6. (später) E2E Smoke
