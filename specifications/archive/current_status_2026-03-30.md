# Phomu Statusbericht (Stand: 30. März 2026)

## 1) Kurzfazit
Phomu ist aktuell ein funktionsfähiger Frontend-Prototyp mit spielbarem Kern-Loop (Lobby → Spiel → Ergebnis), mehreren Modi, lokalem Datenmodell und Theming. Online-Features (Supabase/Realtime/Auth), dedizierte Security-Hardening-Maßnahmen und umfassende mobile UX-Optimierung sind noch nicht vollständig umgesetzt.

## 2) Implementierter Stand (Ist)

### Plattform & Architektur
- Next.js 16.2.1 mit App Router, React 19, TypeScript 5.
- Zentrale Spielkonfiguration über `src/config/game-config.ts`.
- Zustand-Store als zentrale Zustandslogik (`src/stores/game-store.ts`).
- Mehrsprachigkeit (DE/EN) über i18next (`src/i18n/*`).

### Produkt-Funktionen
- Landing, Lobby-Wizard (4 Schritte), Game-Loop und Game-Over-Flow.
- Song-Browser mit Filter- und Sortierlogik.
- Mehrere Spielmodi als Komponenten unter `src/components/game/modes/*`.
- Theme-System mit mehreren visuellen Skins (`src/styles/themes/*`).

### Daten & Inhalte
- Songpacks als lokale JSON-Daten (`src/data/packs/*`).
- Validierungstool für Songdaten vorhanden (`src/utils/validate-song-data.ts`).

## 3) Testergebnisse (Stand der Prüfung)

### Build & Laufzeit
- `npm run build`: erfolgreich.

### Lint/Static Quality
- `npm run lint`: erfolgreich (Flat-Config-Migration abgeschlossen).
- Aktuell verbleiben Warnungen (u. a. `no-unused-vars`, `react-hooks/exhaustive-deps`) als nachgelagerte Code-Qualitätsaufgaben.

### Datenvalidierung
- `npm run validate-songs`: erfolgreich.
- Alle 58/58 Songs sind gültig und vollständig.
- Der Country-Fehler und die YouTube-ID-Warnungen wurden bereinigt.

## 4) Security-Check (Stand der Prüfung)

### Dependency Security
- `npm audit --audit-level=moderate`: 0 bekannte Vulnerabilities.
- `npm audit --omit=dev --audit-level=moderate`: 0 bekannte Vulnerabilities.

### Code-Smell-Schnellscan
- Pattern-Scan auf `dangerouslySetInnerHTML`, `eval(`, `new Function(` in `src/`: keine Treffer.

### Security-Gaps (noch offen)
- Kein dokumentiertes Security-Header-Konzept (CSP, HSTS, X-Frame-Options, Referrer-Policy).
- Kein formales Threat Model (z. B. STRIDE) dokumentiert.
- Kein automatisierter SAST/Dependency-Policy-Gate in CI dokumentiert.
- Kein dediziertes Rate-Limit-/Abuse-Konzept für spätere Realtime-Endpunkte dokumentiert.

## 5) Risiko- und Qualitätsbewertung

### Kritisch
1. Keine blocker durch Build/Lint/Song-Validation im aktuellen Stand.

### Mittel
1. Verbleibende Lint-Warnungen (Code Hygiene) sollten schrittweise abgebaut werden.
2. Mobile UX hat bereits Wizard-Ansatz, aber kein systematisches Performance-/Accessibility-Budget.
3. Security-Maßnahmen sind punktuell, aber nicht als End-to-End-Konzept hinterlegt.

## 6) Sofortmaßnahmen (empfohlen)
1. Verbleibende Lint-Warnungen priorisieren und reduzieren.
2. Mindest-Security-Baseline definieren (Headers, Input-Validation-Policy, Logging).
3. Mobile UX Audit (Touch-Ziele, Kontrast, Safe-Area, Keyboard-Flows, Ladezeiten) als festen Workstream einplanen.
