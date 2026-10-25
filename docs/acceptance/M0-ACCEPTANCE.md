# Acceptance — M0 (Ausgangsstand des Repositorys)

**Requirement IDs:** NFR-009 (Dateigrößen-Gate), NFR-011 (Doku-Linkcheck), I18N-007
(jeder sichtbare Text aus der Übersetzung), CORE-003 (keine Abnahme auf Basis von
Stubs), QA-003
**Build/commit:** `d5b6422` ("chore(catalog): Phomu-Katalog fortschreitend bereinigt"),
Branch `feature/vocument-style-docs-and-i18n`; der Arbeitsbaum enthält zum Messzeitpunkt
uncommittete Änderungen mehrerer paralleler Agenten (Doku, i18n, Security, UI).
**Tester/agent roles:** QA & Test Engineer (Messung), parallel: Docs Lead, i18n Engineer,
Security & Privacy Manager
**Date:** 2026-10-25 (Messungen zwischen 08:32 und 09:15 UTC, Node v22.19.0, npm 10.9.3)

> **Lesehinweis:** Dieses Dokument ist ein **ehrlicher Nachweis des Ist-Zustands**, keine
> Erfolgsmeldung. Jede Aussage nennt die Quelle (Kommando-Ausgabe, Testname oder
> `Datei:Zeile`). Was nicht gemessen wurde, ist als **„nicht gemessen"** ausgewiesen, was
> nicht lief, als **„NOT RUN"** mit Grund.

---

## 1. Funktional

| Szenario | Erwartung | Ergebnis | Evidenz |
|---|---|---|---|
| Katalog-Daten sind strukturell gültig | `validate-songs` meldet 0 Fehler | **PASS** | `npm run validate-songs` → Exit 0, „✓ Alle Songs sind gültig!", 12/12 Songs des Packs `A1` (Log `/tmp/qa-validate-songs.log`) |
| Katalog hält die Qualitäts-Baseline | `validate-catalog` ohne Regression | **PASS** | `npm run validate-catalog` → Exit 0, „✅ Katalog-Gate bestanden (keine Regression gegen Baseline)", 135 Packs / 1615 Songs / 0 Schema-Fehler / 126 Warnungen / 0 Dublettengruppen |
| Unit-Tests decken die Admin-API-Härtung ab | Token-, URL-, Cover- und Rate-Limit-Negativtests sind grün | **PASS** | `npm run test` → Exit 0, 10 Testdateien / **97 Tests grün**, u. a. `src/admin-api/admin-token-guard.test.ts` (10), `src/admin-api/cover-fetch-guard.test.ts` (20), `src/admin-api/admin-routes-hardening.test.ts` (13), `src/admin-api/admin-rate-limit.test.ts` (12), `src/admin-api/security-headers.test.ts` (8) |
| Admin-API ohne Token → 401 | Anfrage ohne Token wird abgewiesen | **PASS** | Test `antwortet ohne Token mit 401` (`src/admin-api/admin-routes-hardening.test.ts`), Test `weist einen Request ohne Token ab (401)` (`src/admin-api/admin-token-guard.test.ts`) — beide grün |
| Admin-API „fail closed" ohne Env-Variable | 503 statt offenem Zugriff | **PASS** | Test `fail-closed: ohne konfigurierte Env-Variable antwortet die API mit 503` (`src/admin-api/admin-token-guard.test.ts`) — grün |
| Cover-URL gegen SSRF geschützt | interne URLs, Klartext, Redirect ins interne Netz werden abgewiesen | **PASS** | Tests `lehnt eine interne URL ab, ohne sie abzurufen`, `bricht einen Redirect vom Cover-Host in das interne Netz ab`, `bricht einen Redirect auf eine interne Metadaten-Adresse im Klartext ab` (`src/admin-api/cover-fetch-guard.test.ts`) — grün |
| Cover-Download mit Größenlimit | zu große Datei wird abgewiesen | **PASS** | Tests `lehnt eine zu grosse Datei ab, die ihre Groesse selbst nennt` / `… die keine content-length schickt` (`src/admin-api/cover-fetch-guard.test.ts`) — grün |
| Smoke-Flow über alle Kernseiten | Home → Lobby → Spiel → Game-Over → Browse → Settings | **PASS mit Einschränkung** | `npx @playwright/test test e2e/smoke.spec.ts --timeout=120000` → Exit 0, „1 passed (1.0m)", Test `smoke flow: home -> lobby -> game -> game-over -> browse -> settings` (53,1 s). Mit der Standard-Timeout-Einstellung (30 s, `playwright.config.ts:4`) **FAIL** — siehe Abschnitt 8 |
| Alle sichtbaren UI-Texte stammen aus der Übersetzung | kein Literaltext im JSX | **PASS** | `npm run check:i18n` → Exit 0, „OK — keine Verstöße. Literaltexte in geprüften TSX-Dateien: 0", 48 TSX-Dateien geprüft (Messzeitpunkt 2026-10-25T09:11Z). Verlauf: 935 (08:34Z) → 806 → 755 → 461 → 27 → 5 → **0** |

---

## 2. Technik

- **Architekturgrenzen eingehalten:** ja — keine Verletzung im Messzeitraum belegt;
  Schichten-/Abhängigkeitsrichtung ist in `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`
  beschrieben, die Doku folgt dieser Beschreibung.
- **Zentrale Konfiguration respektiert:** ja — `src/config/game-config.ts` (326 Zeilen,
  gemessen mit `wc -l`) enthält die Pack- und Modulkonfiguration; das Dateigrößen-Gate
  weist sie als „Datenkatalog-Frage" aus (`ARCHITECTURE.md`, Abschnitt nach §6.2).
- **TypeScript strict:** ja — `npm run typecheck` → Exit 0, keine Ausgabe (18,5 s).
- **ESLint:** ja — `npm run lint` → Exit 0, **0 Fehler, 1 Warnung**
  (`playwright.config.ts:1:1 warning import/no-anonymous-default-export`, 52,6 s).
- **Tests grün:** ja — `npm run test` → Exit 0, 10 Testdateien / 97 Tests (69,7 s).
  Coverage (`v8`, nur `src/utils/**`): `All files 32.33 % Stmts / 34.6 % Branch /
  29.41 % Funcs / 33.77 % Lines`. **Die Coverage ist nicht repräsentativ**, weil die
  Vitest-Konfiguration nur `src/utils/**/*.ts` einschließt (`vitest.config.ts:11`) —
  `src/components/**` und `src/admin-api/**` tauchen darin nicht auf.
- **Migration/Versionierung:** nicht anwendbar — keine Datenbankmigration im Repository.
- **Neue Qualitätsgates vorhanden und verdrahtet:** ja —
  `npm run check:i18n`, `npm run check:doc-links`, `npm run check:file-size`, `npm run check:all`
  (`package.json`), zusätzlich als letzter Block in `scripts/local-ci.sh` (Block 10).
- **CI vorhanden:** ja — `.github/workflows/ci.yml` mit 6 Jobs
  (Typecheck, Lint, Unit Tests, Catalog Validation, Quality Gates, Build),
  Node 22 gepinnt, `npm ci` mit `cache: npm`, Trigger `push` auf `main` und `pull_request`.
- **Build:** ja — `npm run build` → Exit 0, „✓ Generating static pages using 1 worker
  (21/21)", 21 statische Routen, 108,2 s. Im Gesamtlauf `npm run local-ci` ebenfalls grün
  („[SUCCESS] Next.js Production Build passed").

### Gate-Ergebnisse (Messzeitpunkt 2026-10-25T09:11Z)

| Gate | Kommando | Exit | Befunde |
|---|---|---:|---|
| i18n-Vollständigkeit | `npm run check:i18n` | **0** | 0 Verstöße, 0 Literaltexte in 48 TSX-Dateien |
| Doku-Linkcheck | `npm run check:doc-links` | **1** | 3 tote Anker in `REQUIREMENTS.md` (Zeilen 857, 865, 1478) — siehe Abschnitt 8 |
| Dateigröße | `npm run check:file-size` | **0** | 0 Fehler, 7 Warnungen, 7 dokumentierte Altlasten über 550 Zeilen |

Sammelaufruf `npm run check:all` (`scripts/check-all.mjs`) führt alle drei Gates aus und
summarisiert: `[PASS] i18n-Vollständigkeit`, `[FAIL] Doku-Linkcheck`, `[PASS] Dateigröße`
→ Exit 1.

#### Gegenprobe mit einem unabhängigen Scanner

Der i18n-Worker hat mit `scripts/count-ui-literals.mjs` einen zweiten, regex-basierten
Zähler geliefert. Der Vergleich beider Werkzeuge (Stand 2026-10-25 ≈ 09:10 UTC) zeigt,
dass kein Befund des einen Werkzeugs im anderen unbemerkt bleibt:

| Fund (`count-ui-literals.mjs`, 16 Funde) | vom Gate `check:i18n` gemeldet? | Begründung der Abweichung |
|---|---|---|
| `PRIVACY.md`, `SECURITY.md` in `terms/page.tsx` und `privacy/page.tsx` (4) | **ja** | sichtbarer Linktext → muss übersetzt werden |
| `Sunset`, `Phomu Blue`, `Neon Purple`, `Gold Rush`, `Emerald`, `Cyber Pink` (6) | nein | Farbdefinitionen `{ name, value: '#hex' }` — gerendert wird nur `value` (`src/app/lobby/page.tsx:649-658`) |
| `YouTube`, `Spotify`, `Spotify Free`, `Amazon Music` (4) | nein | Eigennamen laut CONTRACT §5 („Eigennamen bleiben in beiden Sprachen identisch") |
| `US` (1) | nein | ISO-3166-Code (Bezeichner) |
| `timeline, hint-master, ...` (1) | nein | Bezeichnerliste (Formatbeispiel) |
| — | **ja**: `L` (`src/app/admin/review/page.tsx:229`) | vom Regex-Zähler nicht erfasst, weil dessen JSX-Textregel keine geschweiften Klammern zulässt (`scripts/count-ui-literals.mjs:98`) |

Die Ausnahmeliste des Gates ist damit eng gefasst: jeder deutsche oder englische Satz,
jede sichtbare Dateiname und jedes Label bleiben Verstoß.

**Stand 09:11Z:** Die zum Vergleichszeitpunkt offenen 5 Fundstellen (1× `L`,
4× `PRIVACY.md`/`SECURITY.md`) wurden parallel migriert; `npm run check:i18n` meldet
seit 09:11Z **0 Verstöße** (Exit 0). Die Tabelle oben bleibt als Nachweis der
Wirkungsweise des Gates und seiner Abgrenzung gegen den unabhängigen Zähler stehen.

### Dateigrößen-Inventar (gemessen, `wc -l`)

7 Dateien über dem harten Maximum 550 (dokumentierte Ausnahmen in
`scripts/check-file-size.mjs`, Inventar in `ARCHITECTURE.md` §6.1, Rückstand in
`REQUIREMENTS.md` GAP-007):

| Datei | Zeilen | über 550 um |
|---|---:|---:|
| `src/app/lobby/page.tsx` | 801 | +251 |
| `src/app/admin/review/page.tsx` | 769 | +219 |
| `src/stores/game-store.ts` | 640 | +90 |
| `src/components/game/MusicPlayer.tsx` | 641 | +91 |
| `src/components/game/RevealPhase.tsx` | 596 | +46 |
| `src/components/game/modes/TimelineMode.tsx` | 573 | +23 |
| `src/app/browse/page.tsx` | 575 | +25 |

Drei weitere Dateien zwischen 401 und 550 Zeilen (`src/utils/validate-song-data.ts` 502,
`src/app/game/page.tsx` 468, `src/app/admin/songs/page.tsx` 461) — vom Gate als Warnung
gemeldet. `src/data/songs/index.ts` (297 Zeilen) wird als generierte Datei erkannt und
übersprungen (Kopfkommentar „Auto-generated … Do not edit it manually").

---

## 3. Performance

| Metrik | Budget | Gemessen | Ergebnis |
|---|---:|---:|---|
| `npm run typecheck` | — | 18,5 s | Baseline |
| `npm run lint` | — | 52,6 s | Baseline |
| `npm run test` (10 Dateien / 97 Tests) | — | 69,7 s | Baseline |
| `npm run build` (Next.js 16, statischer Export) | — | 108,2 s | Baseline |
| `npm run local-ci` (Gesamtlauf) | — | 181,9 s | Baseline (1 Blöck rot, siehe unten) |
| `npm run validate-catalog` | — | 1,7 s | Baseline |
| Ladezeit der App im Browser | — | **nicht gemessen** | Kein Lighthouse, kein Bundle-Analyse-Lauf, kein Geräte-Vergleich |
| Bundle-Größe (JS/CSS) | — | **nicht gemessen** | `next build` gibt keine Bundle-Größen aus (Turbopack) |
| Zeit bis zur Interaktion | — | **nicht gemessen** | — |
| Reaktionszeit der Admin-API | — | **nicht gemessen** | — |

Referenzumgebung: Container auf Netzwerk-Dateisystem (`/run/csi/mount-root/nas/...`).
Playwright meldet dafür „⚠ Slow filesystem detected. The benchmark took 2629ms"
(`/tmp/qa-e2e-2.log`). **Alle Zeiten sind therefore nur für diesen Container gültig** und
keine Referenz für Endgeräte.

---

## 4. Usability

- **Schrittzahl für den Common Path:** nicht gemessen — kein usability-Tests durchgeführt.
- **Discoverability:** nicht gemessen.
- **Mobil/Native-Verhalten:** nicht gemessen — der E2E-Smoke-Test lief in der
  Standard-Desktop-Viewport-Größe (Playwright-Default 1280×720), keine Touch-Emulation,
  keine Geräteprüfung (375 px / 768 px / 1920 px).
- **Visuelle Politur:** nicht gemessen — keine Screenshot-Auswertung in dieser Runde
  (`npm run screenshot:settings` wurde nicht ausgeführt).
- **Sprachumschaltung DE/EN:** **teilweise belegt** — der Sprachumschalter ist im Code
  vorhanden (`src/components/ui/LanguageSwitcher.tsx`), die Beschriftung `DE`/`EN` wird
  vom i18n-Gate als Bezeichner (ISO-Code) akzeptiert; ein Klick-Test existiert nicht.

### Accessibility

- **Tastatur:** nicht gemessen — kein Tastatur-Navigationstest.
- **Screenreader (VoiceOver/TalkBack):** nicht gemessen.
- **Skalierung / Kontrast:** nicht gemessen — keine Kontrastberechnung.
- **Positiv belegt:** die Security-Header prüfen die Kamera-Berechtigung und die
  CSP-Direktiven (`src/admin-api/security-headers.test.ts`, Tests
  `erlaubt der Kamera nur den eigenen Origin (QR-Scanner)`, `setzt eine CSP mit allen
  erwarteten Direktiven`, `enthält keine Wildcard und kein unsicheres object-src` — grün).
  Das ist ein Hinweis auf A11y-Härtung, **aber kein A11y-Nachweis**.

---

## 5. Security-Privacy

- **Neue gespeicherte Nutzerdaten:** keine — die geprüften Änderungen speichern keine
  personenbezogenen Daten. Der Katalog (`src/data/songs/*.json`) enthält Song-Metadaten,
  keine Nutzerdaten.
- **Netzwerkzugriff:** Die Admin-Cover-Route ruft externe Cover-Hosts ab; die
  Host-Allowlist, das Verbot von Klartext-HTTP, die Abbruchlogik bei Redirects ins
  interne Netz sowie die Dateigrößengrenze sind durch Tests belegt
  (`src/admin-api/cover-fetch-guard.test.ts`, 20 Tests grün).
- **Negative Tests (geforderte Härtungen):**
  - Admin-Token: `src/admin-api/admin-token-guard.test.ts` — 10 Tests, u. a.
    `weist einen Request mit falschem Token ab (401)`,
    `weist einen Token ab, der nur ein Zeichen korrekt hat (401)`,
    `fail-closed: ein zu kurzer Token antwortet mit 503`,
    `begrenzt Brute-Force-Versuche pro Client (429 nach 10 Fehlversuchen)`,
    `haelt den Tokenwert aus Antwort und Log heraus`,
    `vergleicht den Token ohne timingSafeEqual nicht mit ===`.
  - URL-Validierung: `src/admin-api/cover-fetch-guard.test.ts` — 20 Tests (Host-Allowlist,
    Subdomains, `localhost`, interne Adressen, `file:`/`data:`/`javascript:`, SSRF-Redirects).
  - Cover-Upload/-Download: `lehnt eine zu grosse Datei ab, die ihre Groesse selbst nennt`,
    `lehnt eine zu grosse Datei ab, die keine content-length schickt`,
    `lehnt eine Antwort ab, die kein Bild ist`, `bricht bei einem HTTP-Fehler mit 502 ab`.
  - Katalogvalidierung: `src/utils/validate-song-data.test.ts` (8 Tests) und
    `src/utils/validate-song-limits.test.ts` (13 Tests, u. a. `meldet einen unbekannten
    Spielmodus`, `laesst den aktuellen Katalog gueltig`).
  - Rate-Limit: `src/admin-api/admin-rate-limit.test.ts` — 12 Tests, u. a.
    `begrenzt die Zahl der gespeicherten Keys (kein unbechgrenztes Wachstum)`,
    `nutzt die erste Adresse aus x-forwarded-for`, `zaehlt auch die abgelehnten Requests mit`.
- **Bedrohungsmodell:** `SECURITY.md` (im Repository vorhanden, im Rahmen dieser Messung
  nicht erneut geprüft).
- **Datenschutz:** `PRIVACY.md` — **NOT RUN**: die Datei existiert zum Messzeitpunkt nicht,
  obwohl 6 Links darauf zeigen (`README.md:132`, `README.md:163`, `CONTRIBUTING.md:137`,
  `QUALITY.md:116`, `LLM.md:117`, `docs/README.md:78`).

---

## 6. Interoperabilität / Datenintegrität

- **Externe Medienquellen (YouTube, Spotify, Amazon) mit defekten Links:** **NOT RUN** —
  kein Test vorhanden, der einen Ausfall der Provider mit Rückfall auf die nächste Quelle
  prüft. Die Provider-Extraktion ist nur für Amazon-ASINs getestet
  (`src/components/game/MusicPlayer.test.ts`, 7 Tests, u. a.
  `bevorzugt trackAsin vor dem Album-Pfad`).
- **QR-Karte außerhalb der App:** **teilweise belegt** — die QR-Zielauflösung ist getestet
  (`src/utils/qr-intent.test.ts`, 4 Tests: `parst player-tag`, `parst pack-intent`,
  `parst session-intent`, `markiert legacy song-links als unsupported`); ein Test mit einem
  gedruckten/externen Medium existiert nicht.
- **Drucklayout / Referenzdrucker:** **NOT RUN** — kein Drucktest durchgeführt.
- **Ohne Cookies/Konto/Cloud:** **nicht gemessen** — der Static Export ist grün gebaut,
  ein Offline-Betrieb wurde aber nicht geprüft.
- **Rückgewinnung/Speicherintegrität:** **nicht gemessen**.

---

## 7. Dokumentation

- **Anforderungen mit ID, Begründung, Akzeptanz und Verifikation:** `REQUIREMENTS.md`
  vorhanden (Soll-Stand laut Datei; im Rahmen dieser Messung nicht vollständig
  gegengeprüft).
- **Jeder relative Link löst auf:** **PASS** (Stand 2026-10-25, nach Behebung) —
  `npm run check:doc-links` → Exit 0, 0 tote Links in 57 Markdown-Dateien.
  Zuvor FAIL mit 3 toten Ankern in `REQUIREMENTS.md`:
  - `REQUIREMENTS.md:857` → `#offende-lücken` (die Überschrift heißt „# Offene Lücken“,
    Anker-Slug wäre `offene-lücken`) — **behoben**
  - `REQUIREMENTS.md:865` → `#offende-lücken` (identisch) — **behoben**
  - `REQUIREMENTS.md:1478` → `#game-006--ein-kern-sechs-klar-getrennte-spielmodi`
    (im Dokument existiert `### GAME-006 — Punkte werden nie negativ`, `REQUIREMENTS.md:176`) —
    **behoben**, der Verweis zeigt jetzt auf `CORE-006` (`REQUIREMENTS.md:74`)
- **Doku im selben Änderungsschritt aktualisiert:** nicht anwendbar — in dieser Runde
  wurde kein Commit erzeugt (Arbeitsregel: kein Commit/Push).

---

## 8. Known limitations

| # | Lücke | Beleg | Wirkung |
|---|---|---|---|
| L1 | ~~Fünf sichtbare Literaltexte sind nicht migriert~~ **— geschlossen am 2026-10-25T09:11Z**: `npm run check:i18n` → Exit 0, 0 Literaltexte in 48 TSX-Dateien. Verlauf der Messung: 935 → 806 → 755 → 461 → 27 → 5 → 0 | `npm run check:i18n` (Log `/tmp/qa-final-i18n.log`) | i18n-Gate grün |
| L2 | ~~Zwei tote Anker `#offende-lücken` in `REQUIREMENTS.md`~~ **— geschlossen am 2026-10-25**: die Anker lauten jetzt `offene-lücken` (Überschrift `# Offene Lücken`, `REQUIREMENTS.md:1516`) | `npm run check:doc-links` → Exit 0, 0 tote Links in 57 Markdown-Dateien | geschlossen |
| L3 | ~~Ein toter Anker `#game-006--ein-kern-sechs-klar-getrennte-spielmodi` in `REQUIREMENTS.md`~~ **— geschlossen am 2026-10-25**: der Verweis zeigt jetzt auf `CORE-006` (`REQUIREMENTS.md:74`), die tatsächliche Anforderung | `npm run check:doc-links` → Exit 0 | geschlossen |
| L4 | 7 Quelldateien über dem Maximum von 550 Zeilen | `npm run check:file-size` → 7 „bekannte Altlasten"; Inventar `ARCHITECTURE.md` §6.1 | Gate meldet, blockiert nicht (dokumentierte Ausnahme, GAP-007) |
| L5 | Der E2E-Smoke-Test schlägt mit dem Standard-Timeout (30 s) fehl | `npm run test:e2e:smoke` → Exit 1, „Test timeout of 30000ms exceeded" bei `page.goto('/')` (`e2e/smoke.spec.ts:4`); mit `--timeout=120000` PASS (53,1 s) | `playwright.config.ts:4` ist auf langsamen Dateisystemen zu knapp |
| L6 | Die Coverage misst nur `src/utils/**` | `vitest.config.ts:11` (`include: ['src/utils/**/*.ts']`) | 32,33 % Gesamt-Coverage sind nicht repräsentativ für die App |
| L7 | ~~`PRIVACY.md` existiert nicht, 6 Links zeigen darauf~~ **— geschlossen am 2026-10-25**: `PRIVACY.md` ist vorhanden, alle 6 Verweise lösen auf | `npm run check:doc-links` → Exit 0 | geschlossen |
| L8 | Prettier-Formatierung ist nicht eingehalten (38 Dateien) | `npm run format:check` → `[warn]`-Liste in `/tmp/qa-local-ci.log`; im `local-ci` nicht blockierend | Formatierungsdrift |
| L9 | Keine Performance-, Usability- oder Accessibility-Messung | Abschnitte 3 und 4 | Dimensionen 3 und 4 der Abnahme sind unbelegt |
| L10 | Der E2E-Test ist nicht in der CI enthalten | `.github/workflows/ci.yml` enthält 6 Jobs, keiner führt Playwright aus | Browser-Regressionen werden erst nach dem Merge sichtbar |
| L11 | `npm audit --omit=dev --audit-level=moderate` ist nur lokal Teil von `local-ci`, nicht in der CI | `scripts/local-ci.sh` (Block 8) vs. `.github/workflows/ci.yml` | Abhängigkeitslücken werden nicht bei jedem PR geprüft |

---

## 9. Decision

**NOT ACCEPTED** — gemäß `QUALITY.md` §9 („mindestens ein Gate nicht erfüllt — mit
Begründung und offener Lücke").

**Begründung (belegt):**

1. Das Doku-Linkcheck-Gate ist rot: `npm run check:doc-links` → Exit 1 mit 3 toten
   Ankern in `REQUIREMENTS.md` (L2, L3). Ein Gate, das rot ist, ist per
   `QUALITY.md` §10.6 kein Nachweis.
2. `npm run test:e2e:smoke` ist mit der Standard-Konfiguration rot (L5). Der Smoke-Test
   läuft nur mit erhöhtem Timeout grün — das ist keine grüne Abnahme, sondern eine
   Korrektur der Testkonfiguration, die dem Owner obliegt.
3. Die Dimensionen Performance, Usability und Accessibility sind **nicht gemessen**
   (L9). `QUALITY.md` §10.5: „Ein unvollständiger Bericht ist ein Fehler, nicht ein
   Teilerfolg."

**Was gemessen grün ist und ausdrücklich nicht in Frage steht:**

- `npm run typecheck` → Exit 0
- `npm run lint` → Exit 0 (1 Warnung, 0 Fehler)
- `npm run test` → Exit 0, 97/97 Tests grün (10 Testdateien)
- `npm run build` → Exit 0, 21/21 statische Seiten
- `npm run validate-songs` / `npm run validate-catalog` → Exit 0
- `npm run check:i18n` → Exit 0 (0 Literaltexte in 48 TSX-Dateien)
- `npm run check:file-size` → Exit 0 (0 Fehler)
- `npm audit --omit=dev --audit-level=moderate` → Exit 0 (im `local-ci`-Lauf)
- Alle drei Gates sind **negativ getestet** (Verstoß → rot → Rückbau → grün);
  die Nachweise stehen im Übergabedokument `/workspace/workers/qa-deliverable.md`.

**Weg von „NOT ACCEPTED" zu „ACCEPTED" (Aufwand für den Owner):**

1. `REQUIREMENTS.md:857`, `:865` → Anker auf `#offene-lücken` korrigieren.
2. `REQUIREMENTS.md:1478` → Anker auf den realen GAME-006-Anker korrigieren.
3. `playwright.config.ts:4` → Timeout auf ≥ 60 s anheben **oder** den WebServer auf
   `next build && next start` umstellen; danach `npm run test:e2e:smoke` erneut belegen.
4. `vitest.config.ts:11` → Coverage auf `src/**` erweitern, damit die Coverage-Zahl
   repräsentativ ist.
5. Optional: E2E-Job und `npm audit` in `.github/workflows/ci.yml` ergänzen.

Sind 1–2 erledigt, ist die technische Abnahme dieses Standes **ACCEPTED WITH LIMITS**
(offen bleiben L4–L11).
