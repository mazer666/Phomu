# Zu Phomu beitragen

Danke, dass du mitbaust. 🎵

Phomu ist ein Open-Source-Partyspiel unter **GPL-3.0-or-later**. Beiträge sind
willkommen — unter der Bedingung, dass sie zum Qualitätsstandard des Projekts
passen.

**Vor dem ersten Commit lies bitte:**

1. [`REQUIREMENTS.md`](REQUIREMENTS.md) — was das Produkt tun muss
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — wie es gebaut ist
3. [`AGENTS.md`](AGENTS.md) — die Arbeitsregeln (gelten auch für KI-Assistenten)
4. [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) — wo deine Änderung hingehört

---

## 1. Der Qualitätsstandard

Vor dem Merge müssen diese Prüfungen grün sein:

```bash
npm run typecheck          # TypeScript strict, ohne Emit
npm run lint               # ESLint
npm run test               # Vitest mit Coverage
npm run check:i18n         # DE/EN vollständig und parallel
npm run check:doc-links    # jeder relative Link löst auf
npm run build              # Produktions-Build
```

Zusätzlich, wenn deine Änderung den Katalog betrifft:

```bash
npm run validate-songs     # Schema und Pflichtfelder jedes Songs
npm run validate-catalog   # Katalog-Gate: Packs, Songs, Dubletten, fehlende Jahre
```

`npm run local-ci` führt alles in der Reihenfolge aus, in der die CI es tut. Ein
grüner lokaler Lauf ist die Voraussetzung für eine Aussage wie „ist fertig".

---

## 2. Die Testphilosophie

Qualität wird auf mehreren Ebenen gesichert:

| Ebene | Wofür | Werkzeug |
|---|---|---|
| **Unit** | Utilities, Parser, Queue-Logik, Store-Logik, Komponenten | Vitest |
| **Statisch** | Typen, Lint-Regeln, Formatierung | `tsc`, ESLint, Prettier |
| **Daten** | Schema und Vollständigkeit des Katalogs | `validate-song-*.ts` |
| **Struktur** | Modulgrenzen, Dateigrößen, Doku-Links, Übersetzungsparität | `scripts/check-*.mjs` |
| **E2E** | der komplette Ablauf im echten Browser | Playwright |
| **Build** | der Produktions-Build muss durchlaufen | `next build` |

### Was ein Test beweisen muss

- **Jede Verhaltensänderung braucht einen Test.** Der Test führt das Verhalten
  aus, er ahmt es nicht nach.
- **Jede Härtung braucht einen negativen Test.** Der Test führt den Angriff
  tatsächlich aus: fehlender Token, manipulierte URL, zu große Datei, verweigerte
  Berechtigung. Ein positives Testpaket allein beweist nichts.
- **Keine ausgelassenen Tests.** Kein `skip`, kein `@Ignore`, kein
  auskommentierter Test, damit die CI grün wird. Das ist kein
  Verhandlungsgegenstand.

---

## 3. Die Grenzen des Beitrags

### Kein Merge ohne Anforderung

Verhalten wird nicht „einfach so" geändert. Wenn dein PR das Produktverhalten
verändert, braucht er:

- eine Anforderungs-ID in `REQUIREMENTS.md` (neu anlegen oder ergänzen), und
- bei materiellen Änderungen einen Change Request unter `docs/cr/`

### Kein Merge ohne Doku

Dokumentation, die durch deine Änderung veraltet, wird **im selben Commit**
mitgezogen. Die Zuordnung steht in
[`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md). Konkret:

| Du änderst | Dann aktualisierst du |
|---|---|
| Verhalten | `REQUIREMENTS.md`, `docs/user-guide/USER-GUIDE.de.md` **und** `.en.md` |
| Struktur oder eine Grenze | `ARCHITECTURE.md`, ggf. ein ADR in `docs/adr/` |
| Konstanten, Defaults, Grenzwerte | `src/config/`, `REQUIREMENTS.md` |
| einen Meilenstein oder dessen Status | `ROADMAP.md`, `project/project.yaml` |
| Texte der Oberfläche | `src/i18n/locales/de.json` **und** `en.json` |

### Eine Wahrheit je Zahl

Punkte, Zeitlimits, Kapazitäten und Grenzwerte stehen in `src/config/`.
Wer sie im Code dupliziert, erzeugt zwei Wahrheiten — und einen Fehler, der
irgendwann auftaucht und niemandem gehört.

---

## 4. Der Stil

**Sprache.** Code, Bezeichner und Commit-Messages sind englisch. Die
Projektdokumentation ist deutsch, die Nutzer-Guides gibt es zweimal.

**Namen.** Beschreibend, keine Abkürzungen:

```text
schlecht:  x, tmp, data2, mgr, handleStuff()
gut:       roundPhase, answersLocked, hintLevel, applyScoreDecay()
```

**Kommentare.** Sie erklären das **Warum**, nicht das Was. Der Code ist für
jemanden geschrieben, der das Projekt nicht kennt.

**Umfang.** Ziel `≤ 400` Zeilen pro handgeschriebener Datei, harte Grenze `550`.
Jede Datei hat genau eine Verantwortung.

**Typen.** TypeScript strict. Kein `any`, kein `@ts-ignore`, kein
`as unknown as` als Weg um ein Modell.

**Formatierung.** `npm run format:check` muss grün sein; Prettier entscheidet,
nicht die Gewohnheit.

---

## 5. Datenschutz und Sicherheit

Nicht verhandelbar:

- **Datenminimierung zuerst.** Speichere nur, was für die Spielbarkeit nötig ist.
- **Keine Geheimnisse im Repo.** Keine API-Keys, kein Admin-Token, keine
  `.env.local`. Der Admin-Token gehört in die Umgebung:
  `npm run security:rotate-admin-token` schreibt ihn nach `.env.local`.
- **Keine Tracking- oder Profiling-Daten** ohne dokumentierten Zweck und
  Opt-in. Phomu ist ein Zero-Telemetrie-Projekt; siehe
  [`PRIVACY.md`](PRIVACY.md).
- **Bei KI-gestützten Inhalten**: kleine Requests, Retry/Queue statt Burst,
  nachvollziehbare Evidenz für Hinweise, **keine Spoiler in den Hinweisen**.

Bricht dein PR in eine der Angriffsflächen ein, die in
[`SECURITY.md`](SECURITY.md) beschrieben sind, sag es bitte vorher — und schick
**keine** Exploit-Details an offene Kanäle. Der Meldeweg steht dort.

---

## 6. Die Inhaltsregeln für den Katalog

- **Keine Dubletten** (global strict) bei neuen oder aktualisierten Songs.
- **Hints müssen überprüfbar sein** (`hintEvidence`) und dürfen weder Artist- noch
  Titel-Spoiler enthalten.
- **Im Zweifel**: `manual-review` statt blindem Auto-Publish.
- Das Katalog-Gate `npm run validate-catalog` prüft gegen eine Baseline und
  wird **rot** bei einer Regression. Das ist Absicht.

---

## 7. Commit und Pull Request

**Commit-Nachrichten** sind englisch, im Conventional-Commit-Format:

```text
feat(game): add survivor mode scoring decay
fix(i18n): correct English plural form for player count
docs(requirements): add MEDIA-012 for provider fallback order
chore(catalog): clean up duplicate year coverage
```

**Ein PR** erledigt **eine** Sache. Er kann mehrere Dateien ändern, aber nur
einen Zweck.

**Die Beschreibung** enthält:

- **Was** geändert wurde (Datei und Zeile, nicht „die Logik wurde verbessert")
- **Warum** (die Anforderungs-ID oder der konkrete Anlass)
- **Der Beleg** (Kommando und echte Ausgabe, Testname oder Datei:Zeile)
- **Was nicht geklappt hat** (offene Punkte, bewusst nicht umgesetzt)
- **Was der Owner entscheiden muss** (eine Frage, mit Optionen und Empfehlung)

---

## 8. Die PR-Checkliste

- [ ] `npm run local-ci` läuft lokal grün durch
- [ ] Die neuen Gates laufen grün (`check:i18n`, `check:doc-links`, `check:file-size`)
- [ ] Jede Verhaltensänderung hat einen Test, jede Härtung einen negativen
- [ ] `de.json` **und** `en.json` sind gepflegt, wenn Texte betroffen sind
- [ ] Keine Secrets eingecheckt
- [ ] Die Doku ist im selben Commit aktualisiert
- [ ] Keine erfundenen Zahlen — jede Zahl hat ihr Kommando
- [ ] Das Spiel bleibt party-tauglich: kein unnötiger Dialog, kein unnötiger
      Frust, kein Blockieren des Flows

---

## 9. Fragen

- **Verhaltensfrage:** zuerst `REQUIREMENTS.md`, dann ein Issue.
- **Fehler:** Issue mit Reproduktionsschritten, erwartetem und tatsächlichem
  Verhalten, und der Umgebung (Node-Version, Browser).
- **Sicherheitslücke:** nicht als offenes Issue. Der Meldeweg steht in
  [`SECURITY.md`](SECURITY.md).
