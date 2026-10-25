# Phomu Roadmap

**Roadmap-Version:** 0.1
**Stand der Messungen:** 2026-10-25, Branch `feature/vocument-style-docs-and-i18n`, Commit `d5b6422`
**Aktueller Meilenstein:** M3 — Doku-, Anforderungs- und i18n-Reform (**IN PROGRESS**)
**Maschinenlesbare Wahrheit:** [`project/project.yaml`](project/project.yaml)

> **Grundsatz dieser Roadmap**
>
> Ein Meilenstein ist **erst fertig, wenn alle Gates erfüllt sind** — nicht, wenn
> „die Oberfläche funktioniert". Jeder Status in diesem Dokument ist an eine
> Evidenz gebunden: einem Testnamen, einer Kommando-Ausgabe oder einer
> Datei:Zeile-Angabe. Was nicht gemessen wurde, steht als **NOT RUN** in der
> Abnahme und **nicht** als „bestanden".
>
> Kein Meilenstein wird auf Basis von Stubs, Mock-Simulationen oder
> Dummy-Rückgaben abgeschlossen (Vocument CR-0002 / QA-003). Kein Code- oder
> Agenten-Schritt verschiebt eine offene Position still in ein späteres
> Meilenstein, damit ein Meilenstein grün aussieht.

---

## Meilensteinmodell

Jedes Meilenstein hat dieselben Felder. Sie sind nicht optional.

| Feld | Inhalt |
|---|---|
| **Zweck** | Das eine Produktproblem, das dieses Meilenstein löst. |
| **Scope** | Was in diesem Meilenstein gebaut wird — Arbeitspakete mit Kennung. |
| **Explizite Nicht-Ziele** | Was hier **nicht** gebaut wird. Ein Nicht-Ziel ohne Eintrag ist ein versteckter Scope. |
| **Abnahmekriterien** | Funktional / Technisch / Performance / Usability / Security-Privacy / Interoperabilität. Jedes Kriterium ist so formuliert, dass man es prüfen kann. |
| **QA-Evidenz** | Was gemessen wurde, mit Kommando oder Testname. |
| **Release-Entscheidung** | `freigegeben`, `freigegeben mit dokumentierter Einschränkung`, `nicht freigegeben`, `offen`. |

### Statuswerte

| Status | Bedeutung | Bedingung |
|---|---|---|
| `COMPLETE` | Alle Gates des Meilsteins sind erfüllt. | Es existiert eine Evidenz pro Gate. |
| `IN PROGRESS` | Teile sind geliefert und belegt, andere Gates sind offen. | Die fertigen Teile werden einzeln benannt. |
| `PLANNED` | Nicht begonnen oder nur vorbereitet. | Kein Gate erfüllt. |

Ein Meilenstein, dessen einzige Evidenz ein existierendes Gerüst ist, ist
`IN PROGRESS` — nicht `COMPLETE`.

---

# M0 — Stabilisierung & Qualitätsbaseline

**Status: `COMPLETE`** (Evidenz: `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run build`, `npm audit` am 2026-10-25, siehe
[`docs/acceptance/M0-ACCEPTANCE.md`](docs/acceptance/M0-ACCEPTANCE.md))

## Zweck

Der Prototyp muss erst **vertrauenswürdig reproduzierbar** sein, bevor
Feature-Breite darauf aufsetzt. M0 stellt die Prüfbarkeit her: dieselbe
Kommandozeile muss immer dasselbe Ergebnis liefern.

## Scope

- **M0.1** Typecheck als harte Schranke (TypeScript strict).
- **M0.2** Lint-Härtung: Flat-Config, keine Fehler in den Kernpfaden
  (`src/app/**`, `src/components/game/**`, `src/admin-api/**`).
- **M0.3** Unit-Test-Harness (Vitest) mit Alias-Auflösung `@/*`.
- **M0.4** E2E-Harness (Playwright, Chromium) mit `webServer`-Konfiguration.
- **M0.5** Produktions-Build als statischer Export (`output: 'export'`).
- **M0.6** Abhängigkeits-Audit als Prüfschritt.
- **M0.7** Ein lokales CI-Skript, das alle Gates in einer Reihenfolge fährt.

## Explizite Nicht-Ziele

- Kein Ausbau der Spielmodi.
- Keine Katalogsanierung (das ist M1).
- Keine Internationalisierung (das ist M3).
- Keine Security-Header (das ist M6).
- Keine Änderung an der Produktlogik.

## Abnahmekriterien

**Funktional**
- `npm run typecheck` endet mit Exit-Code 0.
- `npm run lint` endet mit Exit-Code 0.
- `npm run test` endet mit Exit-Code 0, alle Testfälle sind grün.
- `npm run build` erzeugt einen statischen Export ohne Fehler.

**Technisch**
- Keine Datei im Produktivpfad enthält `any` ohne Begründung; `any` ist im
  Lint-Setup auf `warn` gesetzt (`eslint.config.mjs`).
- Der Test-Runner löst den Alias `@/*` genauso auf wie der App-Code
  (`vitest.config.ts`).
- Das Build-Artefakt ist eine statische Website ohne Serverlaufzeit.

**Performance**
- Der Produktions-Build kompiliert ohne Fehler; die Compile-Zeit wird nicht
  als Abnahmekriterium geführt, weil sie maschinenabhängig ist und bisher
  nicht als Budget definiert wurde.

**Usability**
- Der Schnellstart ist mit drei Klicks erreichbar (Landing → Pack → Start).

**Security-Privacy**
- `npm audit --omit=dev --audit-level=moderate` meldet 0 Schwachstellen.

**Interoperabilität**
- Die Anwendung ist als statischer Export unter einem Unterpfad
  (`basePath: '/Phomu'`) auslieferbar — der Export funktioniert ohne
  Node-Server.

## QA-Evidenz

Gemessen am 2026-10-25 auf Commit `d5b6422`. Weil in dieser Runde mehrere
Rollen parallel am Arbeitsbaum arbeiten, wurde der Commit-Stand über
`git archive d5b6422` in ein separates Verzeichnis entpackt und **dort**
gemessen; so ist das Ergebnis von der Parallelarbeit unabhängig.

| Gate | Kommando | Ergebnis |
|---|---|---|
| Typecheck | `npm run typecheck` | Exit 0 |
| Lint | `npm run lint` | Exit 0, 0 Fehler, 1 Warnung (`playwright.config.ts:1:1`, `import/no-anonymous-default-export`) |
| Unit-Tests | `npm run test` | Exit 0 — 4 Testdateien, 21 Testfälle grün |
| Build | `npm run build` | Exit 0 — 21 statisch erzeugte Routen |
| Katalog-Gate | `npm run validate-catalog` | Exit 0 — 135 Packs, 1.615 Songs, 0 Schema-Fehler, 126 Warnungen, 0 Dubletten, 0 fehlende Jahre |
| Audit | `npm audit --omit=dev --audit-level=moderate` | Exit 0 — „found 0 vulnerabilities" |
| E2E-Smoke | `npm run test:e2e:smoke` | 1 Testfall grün (nach `npx playwright install chromium`) — mit der Einschränkung aus `GAP-07` |

Der ausführliche Nachweis mit Testnamen steht in
[`docs/acceptance/M0-ACCEPTANCE.md`](docs/acceptance/M0-ACCEPTANCE.md).

**Offen in M0 (nicht blockierend, aber dokumentiert):**
`npm run format:check` (Prettier) ist **rot**: 287 Dateien mit
Stilabweichungen. Der Check ist in `scripts/local-ci.sh` ausdrücklich
**nicht blockierend** markiert. Er wird als Lücke `GAP-01` geführt.

## Release-Entscheidung

**freigegeben mit dokumentierter Einschränkung** — die Qualitätsbaseline ist
grün; die Formatabweichung (`GAP-01`) bleibt offen. Die Gates aus dem
Arbeitsvertrag (`GAP-02`, `GAP-03`) sind inzwischen als Skripte vorhanden und
in `npm run local-ci` verdrahtet; sie gehören zu M3.

---

# M1 — Katalog- und Datenqualität

**Status: `IN PROGRESS`**

## Zweck

Der Song-Katalog ist das Kernasset des Produkts. Ein Spiel, das an einem
kaputten Datensatz hängenbleibt, ist wertlos. M1 macht den Katalog
**prüfbar** und reduziert die Fehlerlast auf null harte Fehler.

## Scope

- **M1.1** Schema- und Feldvalidierung je Song (`src/utils/validate-song-data.ts`).
- **M1.2** Katalog-Gate über alle Packs (`src/utils/validate-song-catalog.ts`).
- **M1.3** Duplicate-Policy mit kuratiertem Allowlist (`specifications/duplicate-allowlist.json`).
- **M1.4** Jahres-Coverage 1950 bis laufendes Jahr; Sonderfall klassische
  Werke vor 1900 (`src/config/song-year-range.ts`, `MIN_SONG_YEAR = 1500`).
- **M1.5** Baseline-Mechanik: das Gate schlägt nur fehl, wenn es gegenüber
  `specifications/quality-baseline.json` **schlechter** wird (Regressionsschutz).
- **M1.6** Machine-readable Katalog-Report (`specifications/catalog_issues_report.json`).

## Explizite Nicht-Ziele

- Keine Neuerzeugung von Hinweisen oder Fake-Lyrics durch KI.
- Kein Cover-Download über das Admin-Portal hinaus (M6).
- Keine Migration des Katalogs auf ein anderes Format.

## Abnahmekriterien

**Funktional**
- `npm run validate-catalog` endet mit Exit-Code 0.
- `npm run validate-songs` endet mit Exit-Code 0.
- 0 Duplicate-Gruppen außerhalb der Allowlist.
- 0 fehlende Jahre im Coverage-Fenster.

**Technisch**
- Der Validator liest **alle** Pack-Dateien in `src/data/songs/`, nicht nur eine.
- Das Gate erzeugt einen JSON-Report mit Zeitstempel (`--write-report`).
- Die Baseline ist eine Datei im Repo und keine Zahl in einem Dokument.

**Performance**
- Der Katalog-Durchlauf endet in unter einer Minute auf einer
  Entwickler-Maschine (kein messbares Budget definiert; Status: **NOT RUN**
  als Budget, Laufzeit des Laufs am 2026-10-25 unter einer Minute).

**Usability**
- Der Fehlerbericht nennt Datei, Feld und Song-ID, nicht nur eine Zählzahl.

**Security-Privacy**
- Der Katalog enthält keine personenbezogenen Daten; der Validator prüft
  keine Geheimnisse — dies ist eine **Designentscheidung**, keine geprüfte
  Eigenschaft.

**Interoperabilität**
- Der Katalog ist JSON und maschinenlesbar; `scripts/export-song-database.js`
  exportiert ihn weiter.

## QA-Evidenz

Gemessen am 2026-10-25:

| Gate | Kommando | Ergebnis |
|---|---|---|
| Katalog-Gate | `npm run validate-catalog` | Exit 0 — Packs 135, Songs 1615, Schema-Fehler 0, Schema-Warnungen 126, Duplicate-Gruppen 0, erlaubte Dubletten 4, fehlende Jahre 0 |
| Song-Validierung | `npm run validate-songs` | Exit 0 — **liest nur `A1.json`**: 12 Songs, 12 gültig, 12 vollständig |
| Testabdeckung des Validators | `src/utils/validate-song-data.test.ts` | 8 Testfälle grün (Jahresvalidierung) |

**Fertige Teile (belegt):**
- 0 harte Schema-Fehler über alle 135 Pack-Dateien.
- 0 Duplicate-Gruppen außerhalb der Allowlist.
- 0 fehlende Jahre 1950–2026.
- Jahreslogik inklusive klassischer Werke und angekündigter Releases getestet.

**Offene Teile:**
- 126 Schema-Warnungen sind nicht abgebaut (Abnahmekriterium des
  Verbesserungsplans Phase B lautet „0 Fehler und 0 Warnungen").
- `npm run validate-songs` prüft trotz Name **nur eine Datei** (`A1.json`) —
  der Gesamtkatalog wird nicht über diesen Weg validiert (`GAP-04`).
- Kein Datensatz-Regressionstest für kritische Felder (Phase-B-Kriterium
  „mindestens 1 automatisierter Datensatz-Regressionstest") — `GAP-05`.

## Release-Entscheidung

**nicht freigegeben** für eine öffentliche Content-Erweiterung — das Gate ist
grün, das Abnahmekriterium „0 Warnungen" ist es nicht.

---

# M2 — Testabdeckung & QA-Reife

**Status: `IN PROGRESS`**

## Zweck

Phomu hat Regeln, die niemand gebrochen hat: Punkte, Zeitabfall,
Timeline-Platzierung, Anti-Spoiler-Freigabe, Rundenwechsel. M2 macht diese
Regeln automatisch prüfbar.

## Scope

- **M2.1** Unit-Tests für reine Utilities (`src/utils/*.test.ts`).
- **M2.2** Integrationstests für den Zustand-Store (Rundenwechsel,
  Antwort-Übergabe, Spielende).
- **M2.3** Modus-Contract-Tests (Scoring, Lock-in, Reveal-Logik je Modus).
- **M2.4** Katalog-Regressionstest (Schema-Regeln als Test, nicht nur als Skript).
- **M2.5** E2E für die kritische Journey „Lobby → Spielstart → Modusrotation →
  Game Over".
- **M2.6** Geräte- und Browser-Matrix als reproduzierbares Protokoll.

## Explizite Nicht-Ziele

- Kein Performance-Benchmark in M2 (Budgets kommen mit M5).
- Kein Sicherheitstest der Admin-API (M6).
- Keine Mutationstests.

## Abnahmekriterien

**Funktional**
- `npm run test` ist grün.
- Für jede zentrale Utility-/Scoring-Regel existiert mindestens ein Test.
- Die E2E-Journey deckt mindestens Lobby, Spielstart, Modusrotation und
  Game Over ab.

**Technisch**
- Tests sind deterministisch und laufen ohne Netzzugriff.
- Ein Test prüft eine Regel, nicht eine Implementierungsdetails.

**Performance**
- Coverage-Ziel: **noch nicht definiert**. Aktueller Stand: 23,29 % Statements
  / 24,94 % Lines über `src/utils/**` (Coverage-Scope in `vitest.config.ts`).
  Das ist eine **Zahl, kein Ziel** — siehe `GAP-06`.

**Usability**
- Ein Fehlschlag benennt die Regel, die verletzt wurde, im Testnamen.

**Security-Privacy**
- Negative Tests für jede Härtung (Vorgabe aus dem Arbeitsvertrag).

**Interoperabilität**
- Kein Test darf von der Reihenfolge der Testdateien abhängen.

## QA-Evidenz

**Commit-Stand `d5b6422`** (isoliert gemessen, 2026-10-25T08:44:54Z) und
**Arbeitsstand** (2026-10-25T08:41:51Z) — die Testinventur wächst in dieser
Runde, weil weitere Rollen Tests hinzufügen.

| Test | Datei | Testfälle (Commit-Stand) |
|---|---|---|
| Jahresvalidierung | `src/utils/validate-song-data.test.ts` | 8 |
| QR-Intent-Parsing | `src/utils/qr-intent.test.ts` | 4 |
| Amazon-ASIN-Auflösung | `src/components/game/MusicPlayer.test.ts` | 7 |
| KI-Task-Queue | `src/utils/ai-task-queue.test.ts` | 2 |
| **Summe** | | **21 grün** (`npm run test`, Exit 0) |
| Smoke-Navigation | `e2e/smoke.spec.ts` | 1 grün |

Im Arbeitsstand um 08:41:51Z waren es **10 Testdateien mit 97 Testfällen**
(Exit 0), darunter `src/admin-api/admin-token-guard.test.ts` (10),
`src/admin-api/admin-rate-limit.test.ts` (12),
`src/admin-api/cover-fetch-guard.test.ts` (20),
`src/admin-api/admin-routes-hardening.test.ts` (13),
`src/admin-api/security-headers.test.ts` (8) und
`src/utils/validate-song-limits.test.ts` (13). Die Coverage über `src/utils/**`
stieg dabei von 23,29 % auf 32,33 % Statements (33,77 % Lines).

**Fertige Teile (belegt):**
- Vier Utility-Regeln sind getestet (Jahreslogik, QR-Intent, Amazon-Links, Task-Queue).
- Die Task-Queue prüft **auch den Fehlerpfad**: ein Handler, der wirft, endet
  nach `maxAttempts` in `failed` mit `lastError` (`ai-task-queue.test.ts`).
- Die QR-Intent-Regel kennt einen expliziten Zustand für nicht unterstützte
  Song-Links (`unsupported-song-link`) — der Test sichert genau diesen Zweig ab.

**Offene Teile:**
- Kein Test für Scoring, Zeitabfall, Timeline-Platzierung, Modus-Logik oder
  den Zustand-Store (`src/stores/game-store.ts`, 640 Zeilen, 0 % getestet).
- Der E2E-Smoke prüft **nur URLs** (`e2e/smoke.spec.ts:5–20`); er prüft
  weder Inhalt noch Spielverhalten. Wegen `basePath: '/Phomu'`
  (`next.config.ts:5`) antworten die vom Test angefahrenen Pfade `/lobby`,
  `/game` usw. mit der Next.js-404-Seite, nicht mit der Applikation — der
  Test ist grün, prüft aber die falsche URL (`GAP-07`).
- Keine Geräte-/Browser-Matrix (`GAP-08`).

## Release-Entscheidung

**nicht freigegeben** für die nächste Feature-Welle — die Regeln des Spiels
sind weiterhin ungetestet.

---

# M3 — Doku-, Anforderungs- und i18n-Reform

**Status: `IN PROGRESS`** (laufende Runde, Stand 2026-10-25)

## Zweck

Der bisherige Doku-Stand beschrieb Verhalten in Fließtext ohne IDs. Tests
konnten sich nicht auf eine Anforderung beziehen, Statusberichte widersprachen
einander. M3 führt einen **referenzierbaren** Dokumentationssatz ein:
Anforderungen mit IDs, ein maschinenlesbarer Projektzustand, Abnahmenachweise
mit Evidenz und die Internationalisierungs-Grenze in `src/i18n`.

## Scope

- **M3.1** Anforderungssatz mit IDs-Schema `<DOMÄNE>-<NNN>` und neun Domänen
  (`CORE`, `GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`).
- **M3.2** Architektur-Dokument mit Schichten und Abhängigkeitsrichtung.
- **M3.3** Maschinenlesbarer Zustand in `project/project.yaml`.
- **M3.4** Change-Request-Vorlage und dieser Change Request
  (`docs/cr/CR-0001-…`).
- **M3.5** Abnahmevorlage und Abnahmenachweis je Meilenstein
  (`docs/acceptance/`).
- **M3.6** Agentenrollen `ROLE-01` … `ROLE-08` mit Besitz-, Prüf- und
  Blockier-Scope.
- **M3.7** i18n-Grenze: `de.json`/`en.json` vollständig parallel, jeder
  sichtbare Text aus der Übersetzung.
- **M3.8** Neue Gates: i18n-Vollständigkeit, Doku-Linkcheck, Dateigröße.
- **M3.9** Archivierung der Vorgänger-Dokumentation (nicht Löschung).

## Explizite Nicht-Ziele

- Keine Änderung an der Spiellogik in dieser Runde.
- Kein Umbau von `src/`-Komponenten auf Übersetzung — das ist die
  Fortsetzung von M3.7 (Migration läuft, Stand siehe Evidenz).
- Keine neue Funktion, kein neuer Spielmodus.

## Abnahmekriterien

**Funktional**
- `REQUIREMENTS.md` deckt jede im Code erkennbare Verhaltensregel ab, mit ID,
  Akzeptanz und Verifikation.
- `project/project.yaml` existiert und verweist als einzige Wahrheit.
- `docs/cr/` und `docs/acceptance/` enthalten Vorlage und Nachweis.

**Technisch**
- `node scripts/check-i18n-completeness.mjs` ist grün: de/en parallel, keine
  leeren Werte, keine Einseitigkeit, kein Literaltext mehr im JSX.
- `node scripts/check-doc-links.mjs` ist grün: jeder relative Markdown-Link
  löst auf.
- `node scripts/check-file-size.mjs` ist grün: keine Quelldatei über 550
  Zeilen (weich: 400).
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` bleiben grün.

**Performance**
- Kein Budget. M3 ist ein Dokumentations- und Struktur-Meilenstein; ein
  Laufzeitbudget wäre hier eine erfundene Zahl.

**Usability**
- Ein neuer Entwickelnder findet die Aussage „wie funktioniert Modus X" über
  genau einen Link.

**Security-Privacy**
- Die Verschiebung der Alt-Dokumentation ändert keine Berechtigungen, keine
  Laufzeit und keine Datenflüsse — reine Dokumentation.

**Interoperabilität**
- Die alten Dateien bleiben erhalten und lesbar; der Übergang ist über
  `specifications/README.md` und `specifications/archive/README.md` rückverfolgbar.

## QA-Evidenz

Gemessen am 2026-10-25. Die Zahlen tragen einen Zeitstempel, weil in dieser
Runde mehrere Rollen parallel arbeiten; jede Zahl gilt für den genannten
Moment.

| Punkt | Nachweis |
|---|---|
| Anforderungen | `REQUIREMENTS.md` enthält **174** Anforderungsblöcke in neun Domänen (gezählt am 2026-10-25T08:56:58Z über `### <DOMÄNE>-<NNN>`), keine ID doppelt |
| i18n-Schlüsselraum | `src/i18n/locales/de.json` und `en.json`: Schlüssel parallel, keine leeren Werte, 7 identische Werte (ausschließlich Eigennamen wie „Spotify", „Jackbox Party") |
| Literaltext-Messung | `npm run check:i18n`: **6** Literaltexte in 47 Dateien (2026-10-25T08:59Z) — zu Beginn der Runde waren es 935 (08:34:52Z). Die verbleibenden 6: vier Theme-Eigennamen in `src/app/lobby/page.tsx:77–82` („Phomu Blue", „Neon Purple", „Cyber Pink", „Gold Rush"), ein Status-Präfix `` `draft- ` `` in `src/app/admin/songs/page.tsx:444` und ein Emojisymbol in `src/app/settings/game-rules/page.tsx:63`. Das Gate ist damit **fast** grün, aber noch Exit 1 |
| Gate-Skripte vorhanden | `scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs` und `scripts/check-file-size.mjs` existieren; `package.json` führt sie als `check:i18n`, `check:doc-links`, `check:file-size`, `check:all`; `scripts/local-ci.sh:78` ruft `npm run check:all` blockierend |
| Doku-Linkcheck | `node scripts/check-doc-links.mjs`: Exit 1, **4 tote Links** in 56 geprüften Markdown-Dateien (2026-10-25T08:56:58Z) — drei davon in `REQUIREMENTS.md` (Anker `#offende-lücken` und `#game-006-…`), einer in `docs/acceptance/M0-ACCEPTANCE.md` (Dateiname mit Leerzeichen; inzwischen behoben) |
| Dateigrößen | `npm run check:file-size` → Exit 0 mit 8 Warnungen und 7 dokumentierten Altlasten (2026-10-25T08:58:43Z): `src/app/lobby/page.tsx` 801, `src/app/admin/review/page.tsx` 767, `src/components/game/MusicPlayer.tsx` 641, `src/stores/game-store.ts` 640, `src/components/game/modes/TimelineMode.tsx` 617, `src/components/game/RevealPhase.tsx` 596, `src/app/browse/page.tsx` 575; im Band 401–550: `src/utils/validate-song-data.ts` 502, `src/app/game/page.tsx` 468, `src/app/admin/songs/page.tsx` 461 |
| Archivierung | `git status` zeigt die Verschiebung der Vorgänger-Dateien nach `specifications/archive/` mit Datumsstempel; `specifications/README.md` und `specifications/archive/README.md` erklären die Zuordnung |
| Abnahme | `docs/acceptance/M0-ACCEPTANCE.md` — Abnahme des Commit-Stands `d5b6422` mit Evidenz pro Zeile |

**Fertige Teile (belegt):**
- Der Doku-Baum ist angelegt; Root-Dokumente und `docs/` existieren.
- Der maschinenlesbare Projektzustand existiert (`project/project.yaml`).
- Vorlage und erster Abnahmenachweis existieren (`docs/acceptance/`).
- Der Change Request dieser Runde ist geschrieben
  (`docs/cr/CR-0001-dokumentations-und-agentenstruktur-reform.md`).

**Offene Teile:**
- Der i18n-Gate ist **noch nicht grün**: 6 Befunde (2026-10-25T08:59Z) — vier
  Theme-Eigennamen, ein Status-Präfix und ein Emojisymbol. Die Frage ist
  Produktentscheidung: sind Eigennamen wie „Phomu Blue" übersetzungsfreie
  Eigennamen (dann in die Allowlist) oder Lokalisierungen (dann
  übersetzen)? (`GAP-09`)
- Der Doku-Linkcheck ist **noch nicht grün**: 4 tote Links, drei davon in
  `REQUIREMENTS.md` (`GAP-10`).
- Das Dateigrößen-Gate ist grün, aber nur mit **dokumentierten Ausnahmen**:
  7 Dateien liegen über 550 Zeilen, bei 5 davon ist der Ausnahme-Stand
  bereits überschritten („Rückstand wächst", `GAP-11`).
- Die i18n-Teildateien `src/i18n/locales/parts/` existieren; der Endzustand
  verlangt **eine** Datei je Sprache (`GAP-12`).
- Die Gates sind jetzt über `npm run check:*` erreichbar und laufen in
  `npm run local-ci` blockierend mit (`GAP-02`, `GAP-03` geschlossen).

## Release-Entscheidung

**offen** — die Runde ist nicht beendet, solange die Gates nicht grün sind.

---

# M4 — Musikzentrierte UX & Spielgefühl

**Status: `PLANNED`**

## Zweck

Phomu verspricht Musik als Dauerpräsenz, nicht als Quiz-Aufgabe. Der Pilot
soll die Musik hören, nicht die Punkte zählen. M4 macht den Audiofluss zum
Produktkern: keine tote Phase, jeder Modus hat seinen eigenen musikalischen
Moment.

## Scope

- **M4.1** Pre-Round-Beds und Transition-Stings (kein Stillstand > 3 s im
  Standard-Flow).
- **M4.2** Modus-Audio: Hint-Level-Stinger, Era-Stinger beim Platzieren,
  Signature-Hook beim Survivor-Reveal, Loop-Lautstärke in der Vibe-Check-Frage.
- **M4.3** Session-Dramaturgie (Warmup / Core / Party Peak, Finale mit
  beschleunigter Reveal-Cadenz).
- **M4.4** Audio-Cue-Pipeline (`src/utils/game-audio-cues.ts`,
  `src/hooks/useGameAudioCues.ts`) mit echten Assets.

## Explizite Nicht-Ziele

- Kein Streaming-Eigenkanal, kein Upload von Nutzermusik.
- Kein Drum-Machine-Editor.
- Keine Änderung der Punkteformeln (das wäre eine eigene Änderungsanfrage).

## Abnahmekriterien

**Funktional**
- Keine stille Phase > 3 Sekunden im Standard-Flow.
- Jeder der sechs Modi besitzt mindestens **einen** eindeutigen musikalischen
  Moment in der Frage-Phase.

**Technisch**
- Die Cue-Dateien liegen real als Audiodateien vor, nicht als Beschreibung.
- Fehlende Assets erzeugen keinen sichtbaren Fehler (diese Regel ist im
  Code bereits umgesetzt: `src/utils/game-audio-cues.ts`, Kommentar „Missing
  files are handled silently").

**Performance**
- Audio-Cues dürfen den Musikfluss nicht unterbrechen (Kurz-Cues, keine
  langen Overlays).

**Usability**
- Moduserkennung > 90 % ohne Texthilfe — **Messverfahren ist noch zu
  definieren** (Instrument, Stichprobe, Fragebogen).

**Security-Privacy**
- Keine Telemetrie. Keine Audioaufnahme. Die Cue-Dateien sind statische
  Assets im Repository.

**Interoperabilität**
- Die Cues funktionieren auf Chromium und Safari (Media-Autoplay-Policy:
  der Nutzer muss die Wiedergabe einmal starten — `COUNTDOWN_SECONDS: 3`).

## QA-Evidenz

Gemessen am 2026-10-25:

- `src/utils/game-audio-cues.ts` und `src/hooks/useGameAudioCues.ts` existieren
  und benennen die erwarteten Asset-Pfade (Datei:Zeile).
- **Die Assets fehlen.** `public/audio/sfx/` enthält ausschließlich
  `correct.prompt.md`, `incorrect.prompt.md`, `lose.prompt.md`, `reveal.prompt.md`,
  `win.prompt.md`; `public/audio/mode-cues/` enthält ausschließlich sechs
  `.prompt.md`-Dateien. **Keine `.mp3`-Datei ist vorhanden.** Die Pipeline
  ist implementiert, die Wirkung nicht — das ist der Grund für `PLANNED`
  statt `IN PROGRESS`.
- Der Session-Playtest (subjektive Musikpräsenz > 8/10) ist **NOT RUN**.

## Release-Entscheidung

**nicht freigegeben** — das Meilenstein ist nicht begonnen; die
Voraussetzung (reale Audio-Assets) fehlt.

---

# M5 — Mobile UX Excellence

**Status: `PLANNED`**

## Zweck

Phomu wird am Handy in der Hand gespielt, im Stehen, in einer lauten Runde.
M5 macht die Oberfläche auf 360 px bis 430 px bedienbar und schnell.

## Scope

- **M5.1** Touch-Ziele ≥ 44 × 44 px für alle Primärinteraktionen.
- **M5.2** Sticky-Footer/Bottom-Sheet für Lobby und Spiel.
- **M5.3** Safe-Area-Unterstützung (`env(safe-area-inset-*)`).
- **M5.4** Reduktion der Entscheidungen pro Screen (maximal ein Primär-CTA).
- **M5.5** Standardisiertes Zustandsfeedback (Loading / Success / Error / Disabled).
- **M5.6** Bundle-Analyse und Code-Splitting für schwere UI-Blöcke.
- **M5.7** Lighthouse-Messung auf den Hauptseiten.

## Explizite Nicht-Ziele

- Keine native App.
- Kein Offline-Caching über den Static Export hinaus.

## Abnahmekriterien

**Funktional**
- Kein horizontaler Overflow bei 360 px Breite.
- Alle Primärinteraktionen sind mit dem Daumen im unteren Viewport-Bereich
  erreichbar.

**Technisch**
- Kein horizontales Scrollen in den geprüften Ansichten.
- Safe-Area-Variablen werden im Stylesheet verwendet.

**Performance**
- Lighthouse Mobile: Performance ≥ 85, Accessibility ≥ 90 auf `/`, `/lobby`,
  `/game`, `/browse`.

**Usability**
- Manueller Usability-Test mit mindestens 5 Aufgaben und dokumentierter
  Erfolgsrate ≥ 90 %.

**Security-Privacy**
- Nicht betroffen.

**Interoperabilität**
- Querformat und Dynamic-Island-Insets werden nicht abgeschnitten.

## QA-Evidenz

Gemessen am 2026-10-25:

- Safe-Area-Unterstützung **existiert** als CSS-Variablen `--sat`, `--sar`,
  `--sab`, `--sal` und als Utility-Klassen `.pt-safe`, `.pb-safe`,
  `.pl-safe`, `.pr-safe` (`src/app/globals.css:109–139`); `viewportFit: 'cover'`
  ist gesetzt (`src/app/layout.tsx`, `viewport`).
- Einzelne Komponenten setzen bereits `min-h-[44px]` (Beispiel:
  `src/components/game/QuestionPhase.tsx:108`).
- **Lighthouse ist NOT RUN** in dieser Umgebung — es liegt kein Messwert vor.
- **360-px-Overflow ist NOT RUN** — es liegt kein Messwert vor.

## Release-Entscheidung

**nicht freigegeben** — kein Gate dieses Meilensteins ist erfüllt.

---

# M6 — Security-Hardening

**Status: `IN PROGRESS`**

## Zweck

Phomu hat eine Admin-API, die Cover-Bilder aus dem Netz lädt und den Katalog
verändert. Das ist der einzige Ort im Produkt, an dem Daten von außen
hineinkommen. M6 macht ihn abgesichert und dokumentiert das Bedrohungsmodell.

## Scope

- **M6.1** Authentifizierung der Admin-Routen (Token, timing-sicherer Vergleich).
- **M6.2** Eingabevalidierung (Längen, Formate, URL-Allowlist).
- **M6.3** SSRF- und Größenbegrenzung für externe Cover-Downloads.
- **M6.4** Security-Header auf allen produktiven Routen (CSP, HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **M6.5** Bedrohungsmodell und Incident-Runbook als versionierte Dokumente.
- **M6.6** Secret-Scanning und Dependency-Audit in der CI.
- **M6.7** Rate-Limiting und Missbrauchsschutz.

## Explizite Nicht-Ziele

- Kein Benutzerkonto-System (Phomu bleibt anonym, Login ist optional).
- Kein Mandanten- oder Rollenmodell vor M7.

## Abnahmekriterien

**Funktional**
- Unautorisierte Anfragen erhalten 401; fehlende oder zu kurze Konfiguration
  ergibt 503.
- Ungültige Eingaben ergeben 400, nicht 500.

**Technisch**
- Der Token-Vergleich ist timing-sicher.
- Externe Cover-URLs müssen HTTPS sein und auf einer Allowlist stehen.
- Der Download ist zeitlich und in der Größe begrenzt.
- Nebenläufige Cover-Saves werden über eine Lock-Datei serialisiert.

**Performance**
- Kein Performance-Budget für Sicherheitspfade; stattdessen: der Admin-Pfad
  darf den Spielablauf nicht blockieren (der Spielablauf ruft die Admin-API
  nicht auf).

**Usability**
- Fehlermeldungen der Admin-API sind eindeutig, ohne Geheimnisse preiszugeben.

**Security-Privacy**
- Der Token steht nie im Bundle und nie im Repository.
- Cover-Downloads landen ausschließlich unter `public/covers/<songId>.jpg`.

**Interoperabilität**
- Der Katalog bleibt nach einem Cover-Save gültig (`npm run validate-catalog`
  bleibt grün).

## QA-Evidenz

Zwei Messzeitpunkte, weil in dieser Runde mehrere Worker parallel am
Admin-Bereich arbeiten. **Commit-Stand** = `d5b6422` (isolierter Auszug über
`git archive`, alle Kommandos dort ausgeführt). **Arbeitsstand** = laufender
Branch am 2026-10-25, 08:55Z.

| Kontrolle | Fundstelle | Zustand (Arbeitsstand 08:55Z) |
|---|---|---|
| Token-Prüfung, zeitkonstant | `src/admin-api/_lib/security.ts:44–51` | vorhanden |
| Token-Mindestlänge 32, sonst 503 | `src/admin-api/_lib/security.ts:7`, `:66–68` | vorhanden |
| Fehlende Konfiguration → 503 | `src/admin-api/_lib/security.ts:65` | vorhanden |
| `songId`-Formatprüfung | `src/admin-api/_lib/security.ts:125–134` | vorhanden |
| HTTPS-Pflicht + Host-Allowlist | `src/admin-api/_lib/security.ts:136–163` | vorhanden |
| Redirect-Kette begrenzt (max. 3) | `src/admin-api/_lib/security.ts:10`, `:269` (`fetchGuardedBinary`) | vorhanden |
| Größenlimits: 5 MB Bild, 512 KB JSON | `src/admin-api/_lib/security.ts:13`, `:16` | vorhanden |
| Fetch-Timeout | `src/admin-api/_lib/security.ts:173` (`fetchWithTimeout`) | vorhanden |
| Rate-Limiting je Client **und** global, 429 + `Retry-After` | `src/admin-api/_lib/rate-limit.ts:84`, `:137`; `src/admin-api/_lib/security.ts:104` | vorhanden (neu in dieser Runde) |
| Getrennte Buckets je Route | `src/admin-api/admin-rate-limit.test.ts` („trennt die Buckets je Route") | vorhanden |
| Lock-Datei gegen konkurrierende Saves | `src/admin-api/admin/covers/save/route.ts` | vorhanden |
| Security-Header (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, `Referrer-Policy`, `nosniff`, COOP) | `next.config.ts` (`securityHeaders`, `headers()`) | **konfiguriert, aber nicht ausgeliefert** — `headers()` wirkt nicht mit `output: 'export'`; der Code kommentiert das ausdrücklich (`GAP-13`) |
| **Threat-Model / Incident-Runbook** | — | **fehlen** (`GAP-14`) |
| **Secret-Scan in der CI** | `.github/workflows/deploy.yml` | **fehlt** — die Workflow baut und deployt, prüft aber kein Gate (`GAP-18`) |
| **Audit-Log der Admin-Zugriffe** | — | **fehlt** (`GAP-16`) |
| Negative Tests für die Admin-API | `src/admin-api/admin-token-guard.test.ts` (10), `admin-rate-limit.test.ts` (12), `cover-fetch-guard.test.ts` (20), `admin-routes-hardening.test.ts` (13), `security-headers.test.ts` (8) | vorhanden — 63 Testfälle, grün (`npm run test`, 2026-10-25T08:41:51Z) |
| **Erreichbarkeit der Admin-Routen** | `.next/app-path-routes-manifest.json` | **nicht im Route-Baum** — die Handler liegen unter `src/admin-api/`, die Next-App registriert nur `src/app/`; zusätzlich ist `output: 'export'` ein statischer Export, der keine Laufzeit-Routen bedienen kann (`GAP-22`) |

**Fertige Teile (belegt):**
- Die Guard-Logik ist im Quelltext vorhanden und **negativ getestet**:
  `admin-token-guard.test.ts` prüft „antwortet ohne Token mit 401" und
  „antwortet mit einem falschen Token mit 401"; `cover-fetch-guard.test.ts`
  prüft die Allowlist und die Größenlimits; `admin-routes-hardening.test.ts`
  prüft die Fehlercodes der Routen.
- Fremde Hosts, Nicht-HTTPS, überlange Felder, zu große Antworten und
  lange Redirect-Ketten werden abgewiesen.
- Rate-Limiting wirkt je Client und zusätzlich global, damit ein
  gefälschter `x-forwarded-for` die Sperre nicht umgeht
  (`admin-rate-limit.test.ts`: „begrenzt Brute-Force-Versuche auch dann, wenn
  x-forwarded-for gefaelscht wird").
- Externe Downloads sind in Zeit und Größe begrenzt; parallele Saves werden
  serialisiert.

**Offene Teile:**
- **Die Admin-Routen sind derzeit nicht erreichbar.** Sie liegen außerhalb
  von `src/app/` und erscheinen deshalb nicht im Route-Manifest des Builds;
  der Static Export kann Route-Handler ohnehin nicht ausführen. Die
  Härtung ist damit **Quelltext-Härtung, keine Wirksamkeitsaussage** über
  HTTP (`GAP-22`).
- Die konfigurierten Security-Header werden beim Static Export **nicht**
  ausgeliefert — der GitHub-Pages-Host setzt sie nicht (`GAP-13`).
- Kein Threat-Model, kein Incident-Runbook (`GAP-14`).
- Kein Audit-Log der Admin-Zugriffe (`GAP-16`).

## Release-Entscheidung

**nicht freigegeben** — der Admin-Code ist gehärtet, aber weder erreichbar
noch über HTTP nachgewiesen; der ausgelieferte Produkt-Header-Schutz fehlt
ebenfalls.

---

# M7 — Realtime & Multi-Gerät

**Status: `PLANNED`**

## Zweck

Ein Gerät weitergeben ist der Standard. Mehrere Geräte sind der Wunsch nach
Rechten, Anwesenheit und Fernerkenntnis. M7 führt den Mehrgeräte-Modus ein —
bewusst **spät**, weil er Authentifizierung, Rechte und Datenhaltung erzwingt.

## Scope

- **M7.1** Session-Code (6 Ziffern) und Route zum Beitreten.
- **M7.2** Realtime-Synchronisation der Kernaktionen (Runde, Antwort, Punktestand).
- **M7.3** Rollenmodell: Host, Co-Host, Pilot, Spieler, Zuschauer.
- **M7.4** Reconnect-Verhalten und Konfliktauflösung.
- **M7.5** Missbrauchsschutz: Beitrittsversuche begrenzen, Session-Ablauf.

## Explizite Nicht-Ziele

- Kein Cloud-Konto, kein erzwungener Login.
- Keine Server-Datenhaltung, solange M7 nicht freigegeben ist.
- Kein Chat, kein Freundekreis.

## Abnahmekriterien

**Funktional**
- 2 bis 6 Geräte spielen dieselbe Session ohne Drift in den Kernaktionen.
- Reconnect innerhalb eines definierten Zeitfensters (Zielwert noch festzulegen).

**Technisch**
- Der Sync läuft über eine definierte Realtime-Grenze, nicht über
  `localStorage`.
- Der lokale Ein-Gerät-Modus bleibt unverändert funktionsfähig.

**Performance**
- P95-Event-Latenz < 500 ms lokal/regionnah (Ziel aus der
  Verbesserungsplan-Phase E).

**Usability**
- Der Beitritt ist in drei Schritten erledigt.

**Security-Privacy**
- Keine unberechtigten Datenzugriffe; das verlangt ein Rechtemodell, das
  es erst in M7.3 gibt.
- Datenminimierung: der Server speichert nur den Sitzungszustand.

**Interoperabilität**
- Ein Gast kann dem Raum beitreten, ohne die App zu installieren.

## QA-Evidenz

Gemessen am 2026-10-25:

- `src/types/game-state.ts:23–26` deklariert `DeviceMode` mit
  `'pass-the-phone' | 'multi-device'`.
- `src/types/session.ts:31–56` deklariert `MultiDeviceSession` mit
  6-stelligem Code und `channelName` für Supabase Realtime.
- `src/stores/game-store.ts:45` setzt `deviceMode: 'pass-the-phone'` als
  Vorgabe.
- **Keine Implementierung:** In `package.json` gibt es keine Supabase- oder
  Realtime-Abhängigkeit; im Repository existiert keine Route `/join`; der
  Build erzeugt 21 Routen, davon keine Join-Route.
- Die Typen beschreiben also eine **Zusage**, keinen Zustand. Deshalb
  `PLANNED` und nicht `IN PROGRESS`.

## Release-Entscheidung

**nicht freigegeben** — der Modus existiert als Typ, nicht als Funktion.

---

# M8 — Launch Readiness & Live Ops

**Status: `PLANNED`**

## Zweck

Ein Partyspiel lebt von Wiederholung: dieselbe Gruppe, nächste Woche, andere
Packs. M8 sichert den Betrieb — Testmatrix, Release-Checkliste, Rückweg.

## Scope

- **M8.1** E2E-Testset für die kritischen Journeys.
- **M8.2** Browser-/Geräte-Matrix (iOS Safari, Android Chrome, Desktop
  Chrome/Firefox/Safari) als reproduzierbares Protokoll.
- **M8.3** Barrierefreiheits-Review (Kontrast, Fokusführung, Screenreader).
- **M8.4** Release-Checkliste und Rollback-Plan.
- **M8.5** Optionale Live-Ops-Mechanik (wöchentliche Challenges, Event-Packs).
- **M8.6** KPI-Auswertung **ohne** Telemetrie-Ausgang an Dritte.

## Explizite Nicht-Ziele

- Keine Telemetrie an externe Dienste.
- Kein Konto- oder Abo-Modell.
- Keine Mobile-App.

## Abnahmekriterien

**Funktional**
- Die kritischen Journeys sind E2E grün.
- Die definierte Browser-/Geräte-Matrix hat keine Blocker.

**Technisch**
- Die Release-Checkliste ist eine Datei im Repository und nennt jedes Gate.

**Performance**
- Die in M5 gemessenen Lighthouse-Ziele gelten auch hier.

**Usability**
- Die Erfolgsrate des manuellen Usability-Tests bleibt ≥ 90 %.

**Security-Privacy**
- Es fließen keine Spielerdaten an Dritte. KPI-Auswertung erfolgt lokal oder
  über freiwillige, aggregierte Exporte.

**Interoperabilität**
- Der Karten-Druckweg (59 × 91 mm + 3 mm Beschnitt) bleibt dokumentiert und
  geprüft (`PRINTING_GUIDE.md`, `PHOMU_CONFIG.CARD_*`).

## QA-Evidenz

Gemessen am 2026-10-25:

- Es existiert **ein** E2E-Test (`e2e/smoke.spec.ts`, 1 Testfall, grün).
- Es existiert **keine** Gerätematrix, **keine** Release-Checkliste,
  **kein** Rollback-Plan, **keine** KPI-Auswertung.
- Der einzige vorhandene Workflow (`.github/workflows/deploy.yml`) baut und
  veröffentlicht nach `main`; er führt kein einziges der Gates aus
  (kein typecheck, kein lint, kein test, kein build-Gate, keine Coverage).

## Release-Entscheidung

**nicht freigegeben.**

---

# Bekannte Lücken

Priorisiert nach Wirkung auf die Abnahmefähigkeit. Jede Lücke nennt den
Meilenstein, in dem sie geschlossen wird, den Beleg, der sie aufweist, und
ihren Stand. **Stand 2026-10-25, 08:55Z** — mehrere Lücken wurden in dieser
Runde bereits geschlossen; sie bleiben mit ihrem Beleg im Protokoll, damit die
Schließung nachprüfbar bleibt.

| ID | Lücke | Wirkung | Meilenstein | Beleg | Stand |
|---|---|---|---|---|---|
| GAP-01 | Prettier-Formatcheck rot (287 Dateien) | Style-Drift; blockiert kein Gate, verhindert aber ein grünes `format:check` | M3 | `npm run format:check` → Exit 1 | offen |
| GAP-02 | `scripts/check-file-size.mjs` fehlt | Das Dateigrößen-Gate aus dem Arbeitsvertrag ist nicht ausführbar | M3 | Datei existiert nicht | **geschlossen in dieser Runde** (Skript vorhanden, `npm run check:file-size` → Exit 0) |
| GAP-03 | Keine `npm run check:*`-Skripte in `package.json` | Die Gates sind manuell aufzurufen, CI ruft sie nicht | M3 | `package.json` scripts: kein `check:i18n`, `check:doc-links`, `check:file-size` | **geschlossen in dieser Runde** (`check:i18n`, `check:doc-links`, `check:file-size`, `check:all` vorhanden; `scripts/local-ci.sh:78` ruft `npm run check:all` blockierend) |
| GAP-04 | `npm run validate-songs` prüft nur `A1.json` | Der Gesamtkatalog wird über diesen Weg nicht validiert | M1 | Kommando-Ausgabe: „Lese Datei: …/A1.json" | offen |
| GAP-05 | Kein Datensatz-Regressionstest für die Katalogregeln | Eine Katalogänderung kann eine Regel brechen, ohne dass ein Test rot wird | M1 | Kein Test in `src/utils/` für die Katalogregeln (ein Grenzwert-Test für den Validator ist in dieser Runde hinzugekommen) | teilweise geschlossen |
| GAP-06 | Kein Coverage-Ziel definiert | 23,29 % Statements (Commit-Stand) sind eine Zahl, kein Maßstab | M2 | `npm run test` Coverage-Ausgabe | offen |
| GAP-07 | E2E-Smoke prüft nur URLs und trifft wegen `basePath` die 404-Seite | Der grüne Test belegt nicht, dass die Seiten funktionieren | M2 | `e2e/smoke.spec.ts:5–20`, `next.config.ts:5` | offen |
| GAP-08 | Keine Browser-/Geräte-Matrix | Eine Regression auf Safari bleibt unbemerkt | M8 | Kein Matrix-Protokoll im Repository | offen |
| GAP-09 | 6 Literaltexte in 47 Dateien noch nicht übersetzt (zu Beginn der Runde: 935) | Das i18n-Gate ist rot; die Oberfläche ist fast vollständig zweisprachig | M3 | `npm run check:i18n`, 2026-10-25T08:59Z: 4 Theme-Eigennamen (`src/app/lobby/page.tsx:77–82`), 1 Status-Präfix (`src/app/admin/songs/page.tsx:444`), 1 Emojisymbol (`src/app/settings/game-rules/page.tsx:63`) | offen (Entscheidung Eigennamen vs. Übersetzung nötig) |
| GAP-10 | Tote Markdown-Links (zu Beginn der Runde: 66, jetzt 4) | Der Doku-Linkcheck ist rot, der Doku-Baum ist unvollständig | M3 | `node scripts/check-doc-links.mjs` → Exit 1, 4 Befunde, 3 davon in `REQUIREMENTS.md` | teilweise geschlossen (dieser Beitrag löst `ROADMAP.md`, `project/project.yaml`, `docs/cr/`, `docs/acceptance/` auf) |
| GAP-11 | 7 Dateien über 550 Zeilen (dokumentierte Altlasten), 3 weitere über 400 | Verstoß gegen die Dateigrößen-Regel; große Diff-Risiken | M3 | `npm run check:file-size` → Exit 0, 8 Warnungen, 7 Altlasten mit hinterlegtem Ausnahme-Stand (2026-10-25T08:58:43Z) | offen (Ausnahmen dokumentiert, Rückstand wächst bei 5 Dateien) |
| GAP-12 | `src/i18n/locales/parts/` existiert parallel zu `de.json`/`en.json` | Zwei Wahrheiten für denselben Schlüsselraum | M3 | Verzeichnislisting | offen |
| GAP-13 | Security-Header sind konfiguriert, werden unter `output: 'export'` aber nicht ausgeliefert | Kein CSP und kein HSTS auf dem ausgelieferten Host; der Code benennt die Einschränkung selbst | M6 | `next.config.ts` (`securityHeaders`, Kommentar zur Export-Einschränkung) | offen (Konfiguration steht, Auslieferung fehlt) |
| GAP-14 | Kein Threat-Model, kein Incident-Runbook | Bei einem Vorfall fehlt die dokumentierte Reaktion | M6 | Keine Datei im Repository | offen |
| GAP-15 | Keine negativen Tests für die Admin-API | Die Härtung wäre ungeschützt gegen Rückbau | M6 | `src/admin-api/*.test.ts` — 5 Dateien, 63 Testfälle, grün (`npm run test`, 2026-10-25T08:41:51Z) | **geschlossen in dieser Runde** |
| GAP-16 | Kein Rate-Limiting, kein Audit-Log | Missbrauch der Admin-API bleibt möglich | M6 | Rate-Limiting: `src/admin-api/_lib/rate-limit.ts` (vorhanden, getestet). Audit-Log: kein Fund | teilweise geschlossen |
| GAP-17 | Keine `.mp3`-Assets; nur Prompt-Dateien | Der Audio-Flow existiert nicht, nur seine Beschreibung | M4 | Listing `public/audio/sfx/`, `public/audio/mode-cues/` | offen |
| GAP-18 | Keine CI-Gates: Workflow baut und deployt ohne typecheck, lint, test | Ein roter Push wird veröffentlicht | M8 | `.github/workflows/deploy.yml` | offen |
| GAP-19 | Widersprüchliche Katalogzahlen in der Doku | README nennt 37 Packs / 1.629 Songs; gemessen sind 135 Pack-Dateien / 1.615 Songs | M1 | `README.md` gegen `npm run validate-catalog` | offen |
| GAP-20 | Kein Test für Scoring, Zeitabfall, Timeline, Moduslogik, Store | Die Regeln des Spiels sind ungetestet | M2 | Coverage-Ausgabe: `src/stores/game-store.ts` 0 % | offen |
| GAP-21 | Lighthouse, 360-px-Overflow, Usability-Studie nicht gemessen | Die Abnahmekriterien von M5 sind unbelegt | M5 | Kein Messwert im Repository | offen |
| GAP-22 | Admin-API-Routen liegen außerhalb von `src/app/` und sind im Build nicht registriert; `output: 'export'` kann keine Route-Handler ausführen | Die Admin-Härtung ist im Quelltext vorhanden, aber über HTTP nicht wirksam und nicht nachweisbar | M6 | `.next/app-path-routes-manifest.json` (23 Einträge, kein `/admin-api/*`), `next.config.ts` (`output: 'export'`) | offen |

---

# Roadmap-Änderungsregel

Ein Meilenstein-Scope darf nur über einen dokumentierten Change Request
geändert werden, wenn er akzeptierte Anforderungen oder Release-Gates berührt.
Ein Schritt, der eine offene Position still in ein späteres Meilenstein
verschiebt, damit ein Meilenstein grün aussieht, ist verboten.

Kein Meilenstein und kein Feature gilt als fertig, wenn es auf Stubs,
Dummy-Rückgaben oder Mock-Brücken beruht. Abnahme verlangt eine
authentische, vollständig integrierte Implementierung mit echter
Laufzeitverifikation.

Die Detailkriterien je Meilenstein stehen in
[`docs/acceptance/`](docs/acceptance/), das Abnahmemodell in
[`QUALITY.md`](QUALITY.md), die maschinenlesbare Zusammenfassung in
[`project/project.yaml`](project/project.yaml).

## Historie

Die Meilensteine M0 bis M8 sind aus den Vorgänger-Dokumenten übernommen und
geschärft:

| Quelle | Übernommen als |
|---|---|
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, Phase 1 (AP 1.1–1.3) | M0, M1, M2 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, Phase 2 (AP 2.1–2.3) | M4, M5 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, Phase 3 (AP 3.1–3.3) | M6 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, Phase 4 (AP 4.1–4.2) | M7 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, Phase 5 (AP 5.1–5.2) | M8 |
| `specifications/archive/improvement_plan_mobile_ux_security_archivstand_2026-10-25.md`, Phasen A–F | M0, M1, M5, M6, M7, M8 |
| `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md` | Abschnitt „Bekannte Lücken" |
| Reformdokumentation dieser Runde | M3 |
