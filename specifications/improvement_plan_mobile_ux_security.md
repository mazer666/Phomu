# Verbesserungsplan: Mobile UX, Security, Strukturierung in Phasen

## Zielbild
Phomu soll von einem funktionsfähigen Prototyp zu einer robusten, mobilen, sicheren und release-fähigen Party-Plattform ausgebaut werden.

---

## Phase A — Tooling Stabilisierung & Quality Gate
**Ziel:** Verlässliche technische Basis für alle Folgephasen.

### Maßnahmen
- ESLint v9 Flat Config einführen (`eslint.config.mjs`) und `npm run lint` reparieren.
- Optional: Prettier-Check als CI-Schritt ergänzen.
- Song-Validierung als verpflichtenden CI-Gate aktivieren.

### Abnahmekriterien
- `npm run lint` läuft erfolgreich in CI.
- `npm run build` läuft erfolgreich in CI.
- `npm run validate-songs` liefert 0 Fehler.

---

## Phase B — Data Quality & Content Integrity
**Ziel:** Hohe Zuverlässigkeit für Spielinhalte.

### Maßnahmen
- Alle ISO-Country-Codes auf valides Format bringen.
- YouTube-Link/ID-Validierung härten (11-stellige IDs oder URL-Normalisierung).
- Konsistenzregeln für `lyrics`, `hints`, `difficulty`, `genre` dokumentieren.

### Abnahmekriterien
- 0 Fehler und 0 Warnungen im Song-Validator.
- Mindestens 1 automatisierter Datensatz-Regressionstest für kritische Felder.

---

## Phase C — Mobile UX Excellence
**Ziel:** Deutlich bessere Bedienbarkeit auf Smartphones (insbesondere 360–430px).

### Maßnahmen
- Touch-Optimierung aller interaktiven Controls (mind. 44x44px).
- Sticky-Footer-/Bottom-Sheet-Pattern für Kernaktionen in Lobby und Game.
- Safe-Area-Unterstützung (`env(safe-area-inset-*)`) für iOS-Geräte.
- Reduktion visueller Komplexität pro Schritt (Wizard: maximal 1 Primärentscheidung pro Screen).
- Zustands-Feedback standardisieren: Loading, Success, Error, Disabled.
- Performance-Optimierung: Bundle-Analyse, Code-Splitting für schwere UI-Blöcke.

### Abnahmekriterien
- Lighthouse Mobile: Performance ≥ 85, Accessibility ≥ 90 (wichtige Seiten: `/`, `/lobby`, `/game`, `/browse`).
- Kein horizontaler Overflow auf 360px.
- Alle Primäraktionen mit Daumen erreichbar im unteren Viewportbereich.
- Manuelle Usability-Tests mit mindestens 5 Aufgaben und dokumentierter Erfolgsrate ≥ 90%.

---

## Phase D — Security Baseline & Hardening
**Ziel:** Nachvollziehbare Sicherheitsgrundlage vor Online-Features.

### Maßnahmen
- Sicherheitsheader in Next.js konfigurieren (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Input-Validierung systematisieren (Schema-Validation für User-Input und spätere API-Payloads).
- Security-Checks in CI: `npm audit` + SAST-Tool (z. B. Semgrep/CodeQL).
- Secrets-Scanning in CI.
- Threat Model (STRIDE) und Incident-Response-Miniplan dokumentieren.

### Abnahmekriterien
- Security-Header werden auf allen App-Routen ausgeliefert.
- CI bricht bei High/Critical Dependency Findings ab.
- Threat Model und Security-Runbook liegen versioniert im Repo.

---

## Phase E — Online-Funktionen (Supabase) mit Guardrails
**Ziel:** Realtime-Mehrspieler ohne Sicherheits-/Stabilitätsverlust.

### Maßnahmen
- Optional Auth, Session-Codes, Realtime-Sync und Rollenmodell (Host/Pilot/Player).
- RLS-Policies und Least-Privilege in Supabase.
- Abuse-Schutz: Rate Limits, Session-Expiry, Join-Fehlversuche begrenzen.
- Observability: Fehler- und Performance-Metriken.

### Abnahmekriterien
- Zwei Geräte können stabil dieselbe Session spielen (inkl. reconnect).
- Keine unberechtigten Datenzugriffe in Security-Tests.
- P95 Event-Latenz in Realtime unter definiertem Zielwert (z. B. < 500 ms lokal/regionnah).

---

## Phase F — Release Readiness
**Ziel:** Produktionsreifer Zustand mit messbarer Qualität.

### Maßnahmen
- E2E-Testset für kritische User Journeys.
- Cross-Browser-/Cross-Device-Matrix (iOS Safari, Android Chrome, Desktop Chrome/Firefox/Safari).
- Barrierefreiheits-Review (Kontrast, Fokusführung, Screenreader-Basics).
- Release-Checklist + Rollback-Plan.

### Abnahmekriterien
- Kritische Journeys E2E grün.
- Definierte Browser-/Device-Matrix ohne Blocker.
- Go-Live-Freigabe anhand Checkliste dokumentiert.

---

## Priorisierte UX-Quick-Wins (kurzfristig)
1. Lobby-Footer als dauerhaft sichtbare Primäraktion mit klarer CTA-Hierarchie.
2. Größere Tappable Areas für Plus/Scan-Buttons.
3. Höhere Textkontraste bei sekundären Labels und Hilfetexten.
4. Einheitliche Haptik-Feedback-/Loading-Zustände bei Spiel-Transitions.
5. Klare Rücksprunglogik bei Fehlern (z. B. Scanner, leere Packs, ungültige Spielkonfiguration).
