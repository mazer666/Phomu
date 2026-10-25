# CR-0001 — Dokumentations- und Agentenstruktur-Reform

**Status:** proposed
**Datum:** 2026-10-25
**Auslöser:** Der Reform-Vertrag dieser Runde (`/workspace/CONTRACT.md`) verlangt
einen referenzierbaren Dokumentationssatz mit Anforderungs-IDs, maschinenlesbarem
Projektzustand, Abnahmenachweisen mit Evidenz, acht Agentenrollen und einem
vollständigen i18n-Gate. Die Vorgänger-Dokumentation erfüllt das nicht: Verhalten
stand in Fließtext, Statusberichte widersprachen einander, und es gab keine
Stelle, an der ein Test auf eine Anforderung hätte verweisen können.
**Vorgeschlagen von:** ROLE-01 (Product & Requirements Steward)
**Geprüft von:** ROLE-02 (Chief Architect), ROLE-05 (Internationalization
Engineer), ROLE-06 (QA & Test Engineer), ROLE-08 (Documentation Lead)
**Entscheidung:** **offen** — der Owner entscheidet.

> **Hinweis zum Dateinamen (bewusste Abweichung):** Der Auftrag nannte
> `CR-0001-dokumentations- und-agentenstruktur-reform.md` (mit Leerzeichen).
> Die Datei heißt `CR-0001-dokumentations-und-agentenstruktur-reform.md`.
> Grund: der Doku-Linkcheck (`node scripts/check-doc-links.mjs`) löst einen
> Linkpfad bis zum ersten Leerzeichen auf und meldete den Pfad mit Leerzeichen
> als totes Ziel (`docs/acceptance/M0-ACCEPTANCE.md:231`). Ein Leerzeichen im
> Dateinamen wäre zusätzlich in Shell-Kommandos und Skripten fehleranfällig.
> **Beleg:** Linkcheck vor der Umbenennung: „docs/acceptance/M0-ACCEPTANCE.md:231
> -> ../cr/CR-0001-dokumentations- — Ziel existiert nicht"; nach der Umbenennung
> ist der Befund verschwunden.

---

## 1. Problem

Vier Befunde, alle gemessen am 2026-10-25 auf Commit `d5b6422`:

**1.1 — Verhalten ohne Identität.**
Die Vorgänger-Dokumentation (`specifications/`) beschrieb Regeln des Spiels in
Fließtext. Es gab keine IDs, auf die ein Test, ein Codekommentar oder eine
Reviewer-Notiz hätte zeigen können. Beleg: `specifications/archive/project_roadmap_archivstand_2026-10-25.md`
enthält Abnahmekriterien wie „Session-Playtest: subjektive Musikpräsenz > 8/10"
ohne Messverfahren — ohne Instrument, ohne Stichprobe, ohne Protokoll.

**1.2 — Statusberichte widersprachen dem Code.**
`specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:12`
meldet „Lint: ❌ nicht grün (10 Errors, 2 Warnings)". Der aktuelle Lauf meldet
das Gegenteil: `npm run lint` endet mit Exit 0, 0 Fehlern, 1 Warnung
(`playwright.config.ts:1:1`). Ebenso nennt `README.md` „37 Packs / 1.629 Songs",
gemessen sind 135 Pack-Dateien und 1.615 Songs (`npm run validate-catalog`).
Zwei Zahlen, zwei Wahrheiten, kein Ort, der entscheidet.

**1.3 — Keine Abnahme mit Evidenz.**
Es existierte kein Abnahmedokument. Der Begriff „abnahmefähig" stand in
`specifications/archive/current_status_2026-04-02_archivstand_2026-10-25.md:30`
(„Gesamt Phase 1: 100 % (abnahmefähig)") ohne einen einzigen Testnamen oder
eine Kommando-Ausgabe.

**1.4 — Der sichtbare Text der Oberfläche ist nicht zweisprachig.**
`src/i18n/locales/de.json` und `en.json` enthalten je 25 Schlüssel. Gemessen am
2026-10-25T08:34:52Z stehen dem **935 Literaltexte in 47 Dateien** gegenüber
(`node scripts/check-i18n-completeness.mjs --count`). Die Oberfläche ist damit
 faktisch deutsch; Englisch existiert nur in den sechs Namespace-Blöcken.

**1.5 — Die Gates existieren, sind aber nicht ausführbar.**
`CONTRIBUTING.md:20–25` nennt `npm run check:i18n`, `npm run check:doc-links`
und `npm run check:file-size`. In `package.json` existiert kein einziges
`check:`-Skript; `scripts/check-file-size.mjs` existiert nicht.

## 2. Beantragte Änderung

**2.1 — Neuer Root-Dokumentensatz.**
`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `ROADMAP.md`,
`QUALITY.md`, `WHERE_TO_CHANGE.md`, `GLOSSARY.md`, `PROJECT_MANAGEMENT.md`,
`LLM.md` (neu, Kurzfassung statt Master-Spezifikation).

**2.2 — Neuer `docs/`-Baum.**
`docs/README.md` (Index), `docs/adr/` (ADR-0001 ff., Vorlage
`ADR_TEMPLATE.md`), `docs/cr/` (Vorlage `CR_TEMPLATE.md`, dieser CR-0001),
`docs/acceptance/` (Vorlage `ACCEPTANCE_TEMPLATE.md`, Abnahmenachweis
`M0-ACCEPTANCE.md`).

**2.3 — `project/project.yaml` als einzige maschinenlesbare Wahrheit.**
Projektname, Baseline, Produktstatus, aktueller Meilenstein, abgeschlossene
Meilensteine, Lizenz, Plattformen, Modulgrenzen mit Abhängigkeitsrichtung,
Anforderungszahlen je Domäne, Qualitätsschwellen, Meilensteinstatus, i18n-Angaben.

**2.4 — Anforderungs-IDs-Schema `<DOMÄNE>-<NNN>`** mit neun Domänen
(`CORE`, `GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`), Pflichtfeldern
(Anforderung, Begründung, Akzeptanz, Verifikation) und den Legenden
Preset/Optional/Later.

**2.5 — Agentenrollen `ROLE-01` … `ROLE-08`** mit Besitz-, Prüf- und
Blockier-Scope, plus ein Mavis-Roster mit denselben acht Rollen
(Product Manager, Chief Architect, Game Engineer, UI Engineer, QA Engineer,
Security & Privacy Manager, Docs Lead, i18n Engineer).

**2.6 — Drei neue Gates** (Arbeitsvertrag §6):
`scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs`,
`scripts/check-file-size.mjs`, jeweils lokal über `npm run check:*` und in der CI
ausführbar.

**2.7 — i18n-Grenze.** `src/i18n/locales/de.json` und `en.json` sind vollständig
parallel; jeder sichtbare Text kommt aus der Übersetzung; `src/i18n/locales/parts/`
existiert nur als Zwischenstand der Migration und wird zum Endzustand
zusammengeführt.

**2.8 — Meilensteinmodell in `ROADMAP.md`** mit Zweck, Scope, expliziten
Nicht-Zielen, Abnahmekriterien in sechs Dimensionen, QA-Evidenz und
Release-Entscheidung je Meilenstein; Status nur mit Evidenz.

**2.9 — Archivierung statt Löschung.** Die Vorgänger-Dateien aus
`specifications/` werden nach `specifications/archive/` verschoben und tragen
einen Datumsstempel im Dateinamen. Sie werden **nicht gelöscht**.

## 3. Begründung

- `CORE-001` („Anforderungen sind die Wahrheit für das Verhalten") verlangt eine
  referenzierbare Norm; Fließtext erfüllt das nicht.
- `CORE-009` („Der Code ist die Wahrheit, die Doku folgt ihm") verlangt, dass
  Statusaussagen am Code gemessen werden. Das ist genau der Widerspruch aus
  Befund 1.2.
- `CORE-010` („Keine Attrappen als abgenommene Funktionalität") und `NFR-008`
  („Keine Abnahme auf Basis von Stubs") verlangen Nachweis statt Behauptung.
- `I18N-004` und `I18N-007` verlangen Parallelität und vollständige
  Übersetzung; `NFR-010` verlangt das dafür nötige Gate.
- `NFR-009` („Quellcode-Dateien bleiben unterhalb der Größengrenze") und
  `NFR-011` („Ein Doku-Linkcheck verhindert tote Verweise") begründen die
  Gates 2.6.
- `CORE-012` („Bezeichner bleiben englisch, Projektdoku bleibt deutsch") legt
  die Sprachregel fest, die 2.1–2.9 durchgängig einhält.

## 4. Betroffene Anforderungen

IDs laut `REQUIREMENTS.md`, Stand 2026-10-25.

| ID | Auswirkung |
|---|---|
| `CORE-001` | unverändert — die Reform macht sie erstmals praktisch nutzbar |
| `CORE-009` | unverändert — Statusaussagen werden messbar |
| `CORE-010` | unverändert — Abnahme verlangt Belege |
| `CORE-012` | unverändert — Sprachregel der neuen Dokumente |
| `I18N-001` … `I18N-007` | unverändert — die Migration zu 100 % Vollständigkeit ist die Umsetzung von `I18N-004` und `I18N-007` |
| `NFR-003`, `NFR-004` | unverändert — Testabdeckung bleibt Ziel, nicht Behauptung |
| `NFR-005` | erweitert um die Gates `check:i18n`, `check:doc-links`, `check:file-size` |
| `NFR-009` | erweitert um das Gate-Skript `scripts/check-file-size.mjs` |
| `NFR-010` | unverändert — Gate `scripts/check-i18n-completeness.mjs` existiert bereits |
| `NFR-011` | unverändert — Gate `scripts/check-doc-links.mjs` existiert bereits |
| `NFR-012` | verschärft — der E2E-Smoke prüft bisher nur URLs und trifft wegen `basePath: '/Phomu'` die 404-Seite (`ROADMAP.md`, GAP-07) |
| `NFR-013` | unverändert — die Kernjourney ist weiterhin nicht E2E abgesichert |
| `GAME`, `LOBBY`, `MEDIA`, `UI`, `CAT`, `SEC` | inhaltlich unverändert — die Reform beschreibt sie nur |

Es wird **keine** Anforderung abgeschwächt, gestrichen oder neu nummeriert.
Neue Anforderungen entstehen ausschließlich, wenn die Umsetzung eine bisher
ungedeckte Regel sichtbar macht; das ist eine Folgeentscheidung des Owners.

## 5. Betroffene Architektur

- Kein Modul in `src/` ändert seine Grenze.
- Neu bzw. geändert: `src/i18n/locales/` (Migration `parts/` → eine Datei je
  Sprache), `src/i18n/config.ts` (unverändert, bleibt der einzige
  i18next-Einstiegspunkt), `scripts/` (drei Gate-Skripte).
- Die Grenze „Übersetzung passiert in `src/i18n`, nicht in Komponenten" ist
  bereits durch `ADR-0004` beschrieben; dieser CR führt sie nicht neu ein.

## 6. Betroffene Plattformen

- **Web:** unverändert (Next.js 16, statischer Export, `basePath: '/Phomu'`).
- **Mobil:** die Oberfläche wird zweisprachig; das Layout bleibt mobilfirst.
- **CI:** die Gates kommen hinzu — als `npm run check:*` und in der Pipeline.
  Der heutige Deploy-Workflow (`.github/workflows/deploy.yml`) führt noch kein
  Gate aus (`ROADMAP.md`, GAP-18).
- **Deployment:** unverändert GitHub Pages.

## 7. Auswirkung auf die Meilensteine

- **Neuer Meilenstein M3 — Doku-, Anforderungs- und i18n-Reform.** Er nimmt die
  Arbeit dieser Runde auf und ist `IN PROGRESS`, bis alle Gates grün sind.
- **M0 bleibt `COMPLETE`** (Evidenz in `docs/acceptance/M0-ACCEPTANCE.md`).
- **M1, M2, M6 bleiben `IN PROGRESS`** mit unverändertem Begründungsstand.
- **M4, M5, M7, M8 bleiben `PLANNED`.**
- **Kein Meilenstein wird verschoben, um einen grünen Status zu erzeugen.**

## 8. Auswirkung auf Abnahme und Tests

- Neue Abnahmevorlage mit acht Abschnitten und der Evidenzregel
  („Testname, Kommando-Ausgabe oder Datei:Zeile"; `NOT RUN` ist ein zulässiges
  Ergebnis, ein Erfolgsversprechen ohne Beleg nicht).
- Erster Abnahmenachweis `docs/acceptance/M0-ACCEPTANCE.md` für den Ist-Zustand.
- Neue Gates: i18n-Vollständigkeit, Doku-Linkcheck, Dateigröße. Jedes Gate wird
  **negativ getestet** (Verstoß → rot → zurück → grün), bevor es als erfüllt
  gilt.
- Bestehende Tests bleiben unverändert gültig; die vier vorhandenen Testdateien
  (21 Testfälle) sind der Bezugspunkt für M2.

## 9. Risiken

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Gegenmaßnahme | Owner |
|---|---|---|---|---|
| Die Reform ersetzt Produktarbeit durch Dokumentation | mittel | Der Katalog und die Spielregeln bleiben unverbessert | Die Roadmap führt M1/M2/M4/M5/M7/M8 weiter; die Reform ist M3, nicht der Ersatz für alles | Owner |
| Die Anforderungszahlen in `project/project.yaml` veralten sofort | hoch | Werkzeuge melden falsche Zahlen | `count_measured_at` und `count_source` sind in der Datei mitgeführt und müssen bei jeder Änderung an `REQUIREMENTS.md` nachgezogen werden | ROLE-01 |
| Die i18n-Migration bricht die Oberfläche | mittel | Ein Text fehlt oder erscheint doppelt | Das Gate `check-i18n-completeness.mjs` verhindert unübersetzte Texte; die Migration erfolgt Datei für Datei | ROLE-05 |
| Neue Gates ohne CI-Anbindung verfallen | mittel | Der Zustand kippt lautlos zurück | `check:*`-Skripte in `package.json` und Aufnahme in die Pipeline (GAP-03, GAP-18) | ROLE-06 |
| Der Doku-Linkcheck bleibt rot und blockiert alles | hoch | Der Fortschritt der Runde wirkt wie ein Stillstand | Der Linkcheck unterscheidet nach Priorität; die verbleibenden toten Links gehören zu Dateien anderer Arbeitsbereiche und sind namentlich geführt | ROLE-08 |

## 10. Rücknahme

Die Rücknahme ist **verlustfrei**, weil nichts gelöscht wird:

1. `git checkout -- .` (oder `git restore .`) auf dem Branch
   `feature/vocument-style-docs-and-i18n` stellt den Stand vor der Reform her;
   es entsteht kein Konflikt mit den archivierten Dateien.
2. Die verschobenen Dateien werden zurückverschoben:
   `git mv specifications/archive/<name>_archivstand_2026-10-25.md specifications/<name>`
   für alle in `specifications/archive/README.md` gelisteten Dateien.
3. `LLM.md` wird durch `git checkout -- specifications/archive/LLM_archivstand_2026-10-25.md`
   und Umbenennung zurückgeholt.
4. Die neuen Root-Dateien (`REQUIREMENTS.md`, `ARCHITECTURE.md`, `AGENTS.md`,
   `QUALITY.md`, `WHERE_TO_CHANGE.md`, `GLOSSARY.md`, `PROJECT_MANAGEMENT.md`,
   `ROADMAP.md`, `project/project.yaml`, `docs/`) werden **nicht** gelöscht,
   sondern nach `specifications/archive/reform_2026-10-25/` verschoben.
5. `scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs` und
   `scripts/count-ui-literals.mjs` bleiben liegen — sie verändern kein Laufzeitverhalten.
6. `src/i18n/locales/parts/` wird nicht gelöscht; die Migration ist über
   `scripts/merge-i18n-parts.mjs` umkehrbar.

**Nicht** zurückgenommen werden kann: die Verschiebung der Dateien im
Git-Verlauf, sobald sie committet ist. Deshalb wird sie mit einem
archivierenden Commit und einem beschreibenden Dateinamenstempel vorgenommen.

## 11. Entscheidung

**offen.** Erforderlich ist die Entscheidung des Owners zu:

1. **Meilenstein-Nummerierung** — bleiben M0–M8 aus den alten Phasen 1–5, oder
   wird M3 zum neuen M0? (Empfehlung: M0–M8 behalten, weil die Historie in
   `ROADMAP.md` sonst nicht auffindbar ist.)
2. **`product_status`** — Fließtext oder reines Token-Schema?
   (Empfehlung: Token-Schema, Fließtext in `product_status_summary`.)
3. **Umgang mit der unerreichbaren Admin-API** — entfernen, auf einen
   Node-Server umstellen oder als Build-Schritt in den Export verlagern?
   (Empfehlung: als Build-Schritt, weil die Oberfläche sie bereits nutzt.)
4. **Coverage-Ziel** — 60 % Lines für den Scope `src/utils/**` beibehalten oder
   zuerst den Scope erweitern? (Empfehlung: Scope zuerst erweitern, dann Ziel
   setzen; ein Ziel auf einem zu kleinen Scope erzeugt grüne Zahlen ohne
   Aussagekraft.)

Nach der Entscheidung wird dieser CR auf `approved` oder `rejected` gesetzt und
die Entscheidung mit Datum und Auflagen in diesem Abschnitt ergänzt.
