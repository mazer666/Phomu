# Phomu – Musik-Partyspiel (Hybrid aus App + Karten)

Phomu ist ein Open-Source Partyspiel, das Musikquiz, Social-Gaming und physische QR-Karten kombiniert.
Der aktuelle Stand ist ein lauffähiger Prototyp mit vollständigem Core-Loop (Lobby → Spiel → Game Over), 6 spielbaren Modi, mehreren Themes und einem großen Song-Katalog.

## Produktstatus (Stand: 2. April 2026)
- **Framework:** Next.js 16 + React 19 + TypeScript.
- **State:** Zustand-Store mit Session-/Runden-/Scoring-Logik.
- **Modi:** 6 aktiv im Game-Flow.
- **Packs:** 27 Packs / 1.915 Songs im Katalog.
- **Build / Typecheck / Tests:** grün.
- **Bekannte Quality-Gaps:** viele Lint-Warnungen, Katalog-Duplikate, fehlende Jahresabdeckung 1952/2025/2026.

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
- `npm run lint` (derzeit nur Warnungen, keine Errors)
- `npm run test`
- `npm run validate-songs`
- `npm run validate-catalog`
- `npm run build`

### Größte offene Risiken
- Lint-Warnungen (React-Hooks/Purity und `any`-Typen).
- Katalogqualität (Duplikate + Jahrgangslücken + hohe Warnungsmenge).
- Security-Hardening (Headers, API-Guardrails, Admin-Endpunkte härten).

---

## Dokumentations-Index (aktualisiert)

- **Komplettes Multi-Rollen-Audit:** `specifications/full_audit_2026-04-02.md`
- **Projektstatus (Snapshot):** `specifications/current_status_2026-04-02.md`
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

```bash
npm run typecheck
npm run lint
npm run test
npm run validate-songs
npm run validate-catalog
npm run build
```

---

## Lizenz

GPL-3.0
