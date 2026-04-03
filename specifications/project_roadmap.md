# Phomu Roadmap 2026 (aktualisiert am 2. April 2026)

Diese Roadmap ersetzt die ältere Fassung als operative Planungsgrundlage.

---

## Phase 1 — Stabilisierung & Content-Qualität (2–4 Wochen)

## Arbeitspaket 1.1: Lint-Härtung
- Alle bestehenden Lint-Warnungen priorisiert abbauen (Hooks/Purity/`any`).
- Ziel: Warnungen in Kernpfaden gegen 0.

### Abnahmekriterien
- `npm run lint` ohne Warnungen in `src/app/**`, `src/components/game/**`, `src/admin-api/**`.
- Keine neuen `any`-Typen in produktiven Pfaden.

## Arbeitspaket 1.2: Katalogsanierung
- Duplicate-Policy finalisieren (global strict oder bewusst kuratiert erlaubt).
- Fehlende Jahre 1952/2025/2026 abdecken.
- Schema-Warnungen systematisch abbauen.

### Abnahmekriterien
- `npm run validate-catalog` ohne neue Regressionen.
- Fehlende Jahre = 0.
- Dokumentierte Duplicate-Regel im Repo.

## Arbeitspaket 1.3: Test-Breite erhöhen
- Mindestens je ein Test pro zentraler Utility-/Scoring-Regel.

### Abnahmekriterien
- `npm run test` grün.
- Coverage in kritischen Regeln (Song-Picker, Mode-Scoring, Intent-Parsing) nachvollziehbar erhöht.

---

## Phase 2 — Musikzentrierte UX & Spielgefühl (3–5 Wochen)

## Arbeitspaket 2.1: Always-on-Music Flow
- Pre-Round-Loops, Transition-Stings, Reveal-Boosts implementieren.

### Abnahmekriterien
- Keine stille Phase > 3 Sekunden im Standard-Flow.
- Session-Playtest: subjektive Musikpräsenz > 8/10.

## Arbeitspaket 2.2: Modus-Feinschliff
- Spezifische Audiomechaniken für Hint-Master, Timeline, Survivor, Cover Confusion.

### Abnahmekriterien
- Jeder Modus hat mindestens 1 eindeutigen musikalischen Moment in Question-Phase.
- Usability-Test: Moduserkennung > 90% ohne Text-Hilfe.

## Arbeitspaket 2.3: Mobile UX Excellence
- Sticky CTA, Safe-Area, Touch-Targets, reduzierte visuelle Dichte.

### Abnahmekriterien
- Kein horizontaler Overflow auf 360px.
- Alle Primärinteraktionen erreichen 44x44px.
- Lighthouse Mobile (Hauptseiten): Performance ≥ 85, Accessibility ≥ 90.

---

## Phase 3 — Security Hardening (2–3 Wochen)

## Arbeitspaket 3.1: Header & Plattformschutz
- Security Header in Next.js konfigurieren.

### Abnahmekriterien
- Header auf allen produktiven Routen verifiziert.
- CSP/Referrer/Permissions dokumentiert.

## Arbeitspaket 3.2: API-Härtung Admin-Endpunkte
- AuthN/AuthZ einziehen.
- Request-Schema-Validation und Fehlercodes standardisieren.
- URL-Allowlist + Größenlimits für externe Cover-Downloads.

### Abnahmekriterien
- Unautorisierte Requests erhalten 401/403.
- Security-Tests decken Missbrauchsszenarien ab (invalid URLs, large files, malformed payloads).

## Arbeitspaket 3.3: Security-Operations
- Threat Model (STRIDE-lite), Incident-Runbook, Secret-Scanning, Audit-Gate.

### Abnahmekriterien
- Security-Dokumente versioniert.
- CI bricht bei High/Critical Findings ab.

---

## Phase 4 — Realtime & Online-Funktionen (3–6 Wochen)

## Arbeitspaket 4.1: Session Sync
- Multi-Device stabil, reconnect-fähig, konsistente Turn-Reihenfolge.

### Abnahmekriterien
- 2–6 Geräte synchron ohne Drift in Kernaktionen.
- Reconnect innerhalb definierter Zeit (z. B. < 5s).

## Arbeitspaket 4.2: Rollen- und Rechtekonzept
- Host, Co-Host, Player, Spectator Rollenmodell.

### Abnahmekriterien
- Jede kritische Aktion ist rollenbasiert abgesichert.
- Rechte-Matrix als Dokument vorhanden.

---

## Phase 5 — Launch Readiness & Live Ops (3–4 Wochen)

## Arbeitspaket 5.1: E2E- und Device-Matrix
- Kritische Journeys über Zielbrowser und Zielgeräte testen.

### Abnahmekriterien
- Definierte Journey-Tests alle grün.
- Keine Blocker in iOS Safari / Android Chrome / Desktop-Browsern.

## Arbeitspaket 5.2: Produktbetrieb
- Weekly Challenges, Event Packs, Telemetrie-KPIs (privacy-preserving).

### Abnahmekriterien
- KPI-Dashboard für Session-Länge, Abbruchpunkte, Modusnutzung.
- Operatives Ritual: wöchentlicher Quality + Product Review.

---

## Governance
- **Definition of Ready:** Ticket hat UX-, QA- und Security-Auswirkung beschrieben.
- **Definition of Done:** Code + Test + Doku + Abnahmekriterium erfüllt.
- **Release Gate:** Typecheck, Lint, Tests, Content-Validation, Build, Security-Audit.
