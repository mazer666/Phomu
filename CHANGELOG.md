# Changelog

Alle nennenswerten Änderungen an Phomu werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).

Die Versionsangaben der Vorreform sind nicht rekonstruierbar — die Historie des
Repositories bestand bis zur Reform aus einem einzigen, zusammengefassten Commit.
Der Stand vor der Reform ist in `specifications/archive/` als Dokumentstand
erhalten, nicht als Versionshistorie.

---

## [Unreleased]

### Added — Dokumentation und Spezifikation

Der Dokumentensatz wurde auf das Hausformat von **Vocument** und **PhairPlayRust**
umgestellt: aus einer Sammlung lose Snapshots wurde ein Satz mit Rollen, IDs,
Gates und Nachweisen.

- **`REQUIREMENTS.md`** — 169 Anforderungen in neun Domänen (`CORE`, `GAME`,
  `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`), je mit Anforderung,
  Begründung, Akzeptanz und Verifikation sowie Preset/Optional/Later-Kennzeichnung.
- **`ARCHITECTURE.md`** — Schichten und Abhängigkeitsrichtung, gemessener
  Import-Graph, Datenfluss des Spielablaufs, Grenzen von Admin-API, i18n, Daten
  und Audio, Dateigrößen-Messung mit allen Verstößen.
- **`ROADMAP.md`** — Meilensteine mit Zweck, Nicht-Zielen, Abnahmekriterien über
  alle acht Dimensionen, Evidenz und Release-Entscheidung; dazu ein
  Risikoregister und die offenen Lücken.
- **`AGENTS.md`** — die Arbeitsregeln für Agenten: 20 universelle Regeln,
  Namensstandard, acht Rollen (`ROLE-01` bis `ROLE-08`) mit Besitz-, Prüf- und
  Blockier-Scope, Arbeitsablauf und Übergabeformat.
- **`QUALITY.md`** — das Abnahmemodell über acht Dimensionen, mit der harten
  Regel, dass keine Abnahme auf Basis von Stubs oder Mock-Simulationen gilt.
- **`WHERE_TO_CHANGE.md`**, **`GLOSSARY.md`**, **`PROJECT_MANAGEMENT.md`**,
  **`PRIVACY.md`**, **`SECURITY.md`** — neu im Hausstil.
- **`docs/`** — Index (`docs/README.md`), `DOCUMENTATION_POLICY.md`,
  `GETTING-STARTED.md`, `BEST_IN_CLASS.md`, vier ADRs plus Vorlage, eine
  Change Request, die Abnahmevorlage und ein Abnahmenachweis.
- **`docs/design/`** — `GAME-CONTRACT.md` (Rundenzustandsautomat,
  Anti-Spoiler-Grenze, Verträge der sechs Modi, Persistenzregeln) und ein Index.
- **`docs/user-guide/`** — die Anleitung für Spielerinnen und Spieler, **einmal
  auf Deutsch und einmal auf Englisch**, mit identischer Gliederung.
- **`docs/guides/`** — Druckanleitung und Fehlerbehebung.
- **`project/project.yaml`** — der maschinenlesbare Projektzustand als einzige
  Wahrheit für Werte, die mehrere Dokumente betreffen.
- **`CHANGELOG.md`**, **`CONTRIBUTING.md`**, **`README.md`**, **`LLM.md`** —
  neu geschrieben bzw. umgestellt.

### Added — Internationalisierung

Die Oberfläche war bis auf vier Dateien vollständig hartcodiertes Deutsch bei
25 Übersetzungsschlüsseln. Jetzt:

- **1231 Schlüssel** in `src/i18n/locales/de.json` und `en.json`, **vollständig
  parallel** — geprüft vom Gate `npm run check:i18n` und
  `npm run verify:i18n-keys` (677 benutzte Schlüssel, 0 fehlend).
- **40 Komponenten** beziehen ihre Texte aus der Übersetzung statt aus
  JSX-Literalen.
- **Echte englische Texte** — keine deutschen Kopien. Eigennamen (Spotify,
  YouTube, Jackbox, Modusnamen) bleiben bewusst identisch.
- **Pluralformen** als `_one`/`_other` in beiden Sprachen.
- **Typisierte Schlüssel** über `src/i18n/types.ts` — ein Tippfehler in einem
  Schlüsselnamen ist jetzt ein Compile-Fehler. Die Liste der variierten Texte
  (Reveal-Formulierungen, Feedback, Teamnamen) wird aus `de.json` **erzeugt**
  (`npm run generate:variant-keys`), damit Schlüssel und Liste nicht
  auseinanderlaufen können.
- **Die Sprachdaten sind aus dem Build-Cache rekonstruiert.** Ein Migrationsschritt
  hatte den Blatt-Schlüssel `modes.timeline` über das verschachtelte Objekt
  `modes.timeline.*` gelegt und damit 173 Modus-Schlüssel in beiden Sprachen
  zerstört. `scripts/recover-locales-from-build.mjs` holt die Daten aus
  `.next/` zurück; der Auslöser — ein Blatt-Schlüssel, der zugleich ein
  Namensraum-Präfix ist — ist in `scripts/seed-shared-keys.mjs` dokumentiert und
  für die Zukunft ausgeschlossen.
- **`src/i18n/config.ts`** — `supportedLngs`, `load: 'languageOnly'` und
  `nonExplicitSupportedLngs`, damit eine regionale Variante wie `de-DE` auf die
  ausgelieferte Sprache zeigt statt ins Leere.
- **`src/components/LanguageHtmlAttribute.tsx`** — das `lang`-Attribut des
  Dokuments folgt jetzt der aktiven Sprache. Vorher blieb es statisch auf
  Deutsch stehen, auch wenn Englisch gewählt war.

### Added — Qualitätsgates und CI

- **`scripts/check-i18n-completeness.mjs`** — prüft DE/EN-Parität, leere Werte,
  Pluralformen und verbliebene Literaltexte in TSX-Dateien.
- **`scripts/check-doc-links.mjs`** — prüft, dass jeder relative Markdown-Link
  im Repository auflöst.
- **`scripts/check-file-size.mjs`** — Ziel 400 Zeilen, harte Grenze 550.
- **`scripts/merge-i18n-parts.mjs`** — führt die Teildateien der Übersetzung in
  eine Datei je Sprache zusammen.
- **`.github/workflows/ci.yml`** — Jobs für Typecheck, Lint, Unit-Tests,
  Katalogvalidierung, Qualitätsgates und Build. Bisher gab es nur ein
  Deployment-Workflow, **keine Test-CI**.
- **`npm run check:i18n`**, **`npm run check:doc-links`**,
  **`npm run check:file-size`**, **`npm run check:all`** — die Gates auch lokal.

### Added — Sicherheit

- **Rate-Limiting** für die Admin-API (`src/admin-api/_lib/rate-limit.ts`), mit
  eigener Obergrenze für fehlgeschlagene Authentifizierungsversuche.
- **Security-Header** (CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`) in `next.config.ts`. Die erlaubten
  origins sind aus dem Code abgeleitet, damit die Medienwiedergabe nicht bricht.
- **Harte Grenzwerte** für Texteingaben (`src/utils/validate-song-limits.ts`).
- **66 neue Tests** für Token-Guard, Rate-Limit, Cover-Abruf, Routen-Härtung,
  Security-Header und Eingabegrenzen — durchweg **negative Tests**, die den
  Angriff tatsächlich ausführen.

### Changed

- **`specifications/`** — die Vorgänger-Dokumentation ist nach
  `specifications/archive/` gewandert und dort mit Datumsstempel versioniert.
  Sie wurde **nicht** gelöscht. `specifications/README.md` erklärt die
  Zuordnung von Altstand zu Nachfolger.
- **`LLM.md`** — von der 170-zeiligen Master-Spezifikation zur Kurzfassung mit
  Verweis auf die verbindlichen Dokumente. Der Volltext liegt als Archivstand
  unter `specifications/archive/`.

### Fixed

- Das `lang`-Attribut des HTML-Dokuments bleibt nicht länger auf Deutsch
  stehen, wenn Englisch gewählt wurde (siehe Internationalisierung oben).
- **Drei tote Anker** in `REQUIREMENTS.md` (`#offende-lücken` × 2,
  `#game-006--…`) sind behoben; `npm run check:doc-links` meldet 0 tote Links
  in 57 Markdown-Dateien.
- **Doppelte Theme-Werte** in `NavBar.tsx` und `ThemeSwitcher.tsx` liegen jetzt
  einmalig in `src/config/themes.ts` — zusammen mit den typisierten
  Übersetzungsschlüsseln der Theme-Namen.
- Der Tippfehler „Zurueck" in `common.back` ist korrigiert.

### Known limitations

Diese Punkte sind **offen** und in `ROADMAP.md` mit Priorität hinterlegt:

- Die Abdeckung der **Testsuite** liegt bei 32 % der Statements. Die
  Spielmechanik (`src/stores/game-store.ts`, `src/utils/song-picker.ts`,
  `src/components/game/modes/*`) ist noch nicht mit Unit-Tests abgedeckt.
- **Acht Quelldateien** überschreiten die harte Grenze von 550 Zeilen. Die
  Zerlegung ist in `ARCHITECTURE.md` § 6.3 beschrieben und noch nicht
  umgesetzt. Die von dieser Runde angefassten Dateien wurden dabei **auf
  Prettier-Formatierung umgestellt** — das entspricht der `.prettierrc` des
  Projekts, macht die Dateien aber sichtbar länger (allein
  `src/utils/validate-song-data.ts` wächst von 493 auf 817 Zeilen, davon rund
  zwei Drittel reine Formatierung). Das Dateigrößen-Gate meldet das als
  „Rückstand wächst"; die Altlasten sind als dokumentierte Ausnahmen
  hinterlegt. **Die Umstellung ist bewusst nicht zurückgenommen**, weil
  `npm run format:check` sonst für genau diese Dateien dauerhaft rot bliebe.
- **318 weitere Dateien** im Repository halten sich ebenfalls nicht an
  Prettier. Sie wurden in dieser Runde **nicht** angefasst, weil das einen
  diff, der die eigentliche Änderung verdeckt. Die Migration ist als
  eigener Schritt offen.
- **`src/admin-api/` hat laut Import-Graph keine Konsumenten** — die
  Cover-Suche und -Speicherung ist unter der Zielarchitektur nicht erreichbar.
- **Vierzehn Konfigurationsschlüssel** in `src/config/` werden von niemandem
  gelesen. `src/config/` ist damit eine von mehreren Wahrheiten.
- Die **Englisch-Fassung** der Nutzer-Guides ist eine Übersetzung, aber sie ist
  **nicht** von einer englischsprachigen Person gegengelesen.
- **Kein E2E-Test** deckt die sechs Spielmodi ab; der Smoke-Test deckt nur den
  Grundablauf.

---

## Vor der Reform

Bis zum 25. Oktober 2026 bestand die Historie aus einem einzigen Commit. Der
inhaltliche Stand ist in `specifications/archive/` als Dokumentstand erhalten —
siehe dort die Inhaltsübersicht und die Warnung zu den nicht mehr geltenden
Zahlen.
