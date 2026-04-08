# Phomu – Musik-Partyspiel (Hybrid aus App + Karten)

Phomu ist ein Open-Source Partyspiel, das Musikquiz, Social-Gaming und physische QR-Karten kombiniert.
Der aktuelle Stand ist ein lauffähiger Prototyp mit vollständigem Core-Loop (Lobby → Spiel → Game Over), 6 spielbaren Modi, mehreren Themes und einem großen Song-Katalog.

## Produktstatus (Stand: 8. April 2026)
- **Framework:** Next.js 16 + React 19 + TypeScript.
- **State:** Zustand-Store mit Session-/Runden-/Scoring-Logik.
- **Modi:** 6 aktiv im Game-Flow.
- **Packs:** 37 Packs / 1.629 Songs im Katalog (laut aktuellem Catalog-Report).
- **Build / Typecheck / Tests:** Build + Typecheck + Unit-Tests + E2E-Smoke grün; Lint aktuell mit Errors.
- **Admin-API-Security:** Bearer-Token-Guard (`x-admin-token` via `ADMIN_API_TOKEN`) + Input-/URL-Validierung für Cover-Endpoints.
- **Bekannte Quality-Gaps:** Lint-Errors, Song-Validierungsfehler in A1, hohe Schema-Warnungslast im Katalog.

---

## Spielmodi (aktuell implementiert)

1. **Chronologische Timeline (`timeline`)**  
   Songs in die richtige zeitliche Reihenfolge einordnen; Timeline wächst dynamisch, Punkte sind konfigurierbar gedeckelt.

2. **Hint-Master (`hint-master`)**  
   Song über bis zu 5 Hinweise erraten; frühe Treffer geben mehr Punkte.

3. **Lyrics Labyrinth (`lyrics`)**  
   Fake-Lyric zwischen echten Zeilen identifizieren.

4. **Vibe-Check (`vibe-check`)**  
   Song einer Stimmung zuordnen, Fokus auf Team-/Gruppengefühl.

5. **Survivor (`survivor`)**  
   Einschätzen: One-Hit-Wonder oder nachhaltiger Chart-Act.

6. **Cover Confusion (`cover-confusion`)**  
   Cover-Version hören und Original-Interpret erkennen.

---

## Kernfunktionen

- **Lobby & Session Setup:** Spielerverwaltung, Modusauswahl, Teamkonfiguration, Endbedingungen.
- **Rundenlogik:** Drawing-, Question-, Reveal- und Scoring-Phasen.
- **Scoring:** klassische Punkte + optionaler Time-Decay.
- **Anti-Spoiler-Fokus:** Musik- und Reveal-Flows sollen erst im richtigen Moment auflösen.
- **Themes:** Jackbox, Spotify, YouTube, Musicwall.
- **Bilinguale Oberfläche:** Deutsch/Englisch.

---

## Qualität, Security und Tests

### Bereits aktiv
- `npm run typecheck`
- `npm run lint` (aktuell nicht grün: Errors + Warnings vorhanden)
- `npm run test`
- `npm run test:e2e:install` (installiert Playwright Chromium)
- `npm run test:e2e:install:linux` (installiert notwendige Linux-Systemlibs für Playwright)
- `npm run test:e2e:smoke` (smoke flow via Playwright)
- `npm run validate-songs`
- `npm run validate-catalog`
- `npm run build`

### Größte offene Risiken
- Lint-Warnungen (React-Hooks/Purity und `any`-Typen).
- Katalogqualität (Duplikate + Jahrgangslücken + hohe Warnungsmenge).
- Security-Hardening: wichtige Admin-API-Guardrails umgesetzt; nächste Schritte: CSP/Headers auf finalem Host und Rate-Limiting an Edge/Proxy.

---

## Dokumentations-Index (aktualisiert)

- **Komplettes Multi-Rollen-Audit:** `specifications/full_audit_2026-04-02.md`
- **Projektstatus (Snapshot):** `specifications/current_status_2026-04-08.md`
- **Roadmap + Arbeitspakete + Abnahmekriterien:** `specifications/project_roadmap.md`
- **Teststrategie (QA-Update):** `specifications/test_strategy.md`
- **Security-Policy (überarbeitet):** `SECURITY.md`
- **UX/Security Verbesserungsplan:** `specifications/improvement_plan_mobile_ux_security.md`
- **Archiv (historische Dokumentstände):** `specifications/archive/` (inkl. archivierter Strategie- und Snapshot-Dokumente mit Datumsstempel im Dateinamen)

---

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Wichtige Checks:

Zusätzlich für Admin-Endpoints:

```bash
cp .env.example .env.local
# ADMIN_API_TOKEN setzen
```


```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e:install
# nur auf Linux nötig, falls Browser-Libs fehlen:
# npm run test:e2e:install:linux
npm run test:e2e:smoke
npm run validate-songs
npm run validate-catalog
npm run build
```

---

## Lizenz

GPL-3.0
