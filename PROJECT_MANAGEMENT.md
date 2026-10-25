# Phomu Projektmanagement

Wie Phomu geführt wird: Meilensteine, Risiken, Entscheidungen und Dokumentation.

Die verbindlichen Produktinhalte stehen in [`REQUIREMENTS.md`](REQUIREMENTS.md) und
[`ARCHITECTURE.md`](ARCHITECTURE.md). Dieses Dokument beschreibt den **Prozess**
darum herum.

---

## 1. Das Grundmodell

Phomu arbeitet in **Meilensteinen**. Ein Meilenstein ist ein abgeschlossener,
nachweislicher Zustand — nicht ein Arbeitspaket.

Jeder Meilenstein hat:

- einen Zweck (in einem Satz)
- explizite **Nicht-Ziele**
- Abnahmekriterien über alle acht Dimensionen aus [`QUALITY.md`](QUALITY.md)
- QA-Evidenz (Testname, Kommando-Ausgabe oder Datei:Zeile)
- eine Release-Entscheidung

Ein Meilenstein gilt als erreicht, **wenn** die Evidenz existiert. Ein Häkchen in
einer Checkliste ist keine Evidenz. Was nicht belegt ist, ist „in Arbeit" — auch
wenn der Code schon fertig aussieht.

Der aktuelle Stand steht in [`ROADMAP.md`](ROADMAP.md). Die maschinenlesbare
Fassung liegt in [`project/project.yaml`](project/project.yaml) und ist die einzige
Wahrheit für maschinelle Auswertung; die Markdown-Dateien verweisen darauf.

---

## 2. Status-Disziplin

Ein Status wird nie geschätzt. Für jede Behauptung gilt:

| Behauptung | Zulässiger Beleg |
|---|---|
| „implementiert" | existierender Code **und** ein Test, der das Verhalten ausführt |
| „grün" | echte Kommando-Ausgabe mit Testanzahl, Fehlerzahl und Dauer |
| „fertig" | Abnahmenachweis unter [`docs/acceptance/`](docs/acceptance/) |
| „schnell" | eine Messung mit dem Kommando, das sie erzeugt hat |
| „sicher" | ein negativer Test, der den Angriff ausführt |

Was nicht gemessen wurde, wird als **„nicht gemessen"** ausgewiesen. Was nicht
lief, wird als **„NOT RUN"** mit dem exakten Grund ausgewiesen. Beides ist ein
gültiges Ergebnis. Eine erfundene Zahl ist es nicht.

---

## 3. Change Requests

Materielle Änderungen an Verhalten, Scope oder Anforderungen laufen über einen
Change Request unter [`docs/cr/`](docs/cr/):

```text
CR-0001-dokumentations- und-agentenstruktur-reform.md
```

Ein CR beantwortet: Was löst ihn aus, welche Anforderungen sind betroffen, was
ändert sich, warum, und wie nimmt man es zurück. Ohne CR gilt: **das Verhalten
ändert sich nicht**.

---

## 4. Das Risikoregister

Das Register ist Teil des Meilensteinabschlusses und wird bei jedem Meilenstein
fortgeschrieben. Form:

| Risiko | Eintritt | Auswirkung | Gegenmaßnahme | Owner | Status |
|---|---|---|---|---|---|

Die drei Risikoklassen, die Phomu immer wieder treffen:

1. **Katalogqualität.** Der Katalog wächst; ein Song kann Schema- und
   Dublettenregeln verletzen. Gegenmaßnahme: das Gate
   `npm run validate-catalog`, das gegen eine Baseline prüft und bei einer
   Regression rot wird.
2. **Spoiler-Leak.** Der Anti-Spoiler-Schutz ist ein Produktversprechen. Jede neue
   Oberfläche muss prüfen, ob Titel, Interpret oder Cover vor dem Sperren in den
   DOM gelangen.
3. **Provider-Ausfall.** YouTube, Spotify, Amazon und Apple liefern keine
   garantierte Verfügbarkeit. Gegenmaßnahme: der Rückfall auf die nächste Quelle
   muss je Modus dokumentiert und getestet sein.

---

## 5. Entscheidungen

Architekturentscheidungen stehen als **ADR** unter [`docs/adr/`](docs/adr/):
Status, Datum, Kontext, Entscheidung, Konsequenzen, verworfene Alternativen.

Produktentscheidungen stehen als **CR** unter [`docs/cr/`](docs/cr/).

Beide Nummernkreise sind fortlaufend. Eine bestehende Datei wird **nie**
überschrieben — eine neue Entscheidung ersetzt eine alte durch eine neue Datei, die
die alte referenziert.

---

## 6. Die Agentenstruktur

Phomu arbeitet mit acht Rollen, die in [`AGENTS.md`](AGENTS.md) beschrieben sind:

| Rolle | Verantwortung |
|---|---|
| ROLE-01 Product & Requirements Steward | Produktintention, Anforderungs-IDs, Scope |
| ROLE-02 Chief Architect | Modulgrenzen, Abhängigkeitsrichtung, ADRs |
| ROLE-03 Game Engine Engineer | Spielmodi, Rundenlogik, Scoring, Zustand |
| ROLE-04 UI/UX Engineer | Oberfläche, Themes, Projektor, Barrierefreiheit |
| ROLE-05 Internationalization Engineer | DE/EN-Vollständigkeit, Plural- und Formatregeln |
| ROLE-06 QA & Test Engineer | Testabdeckung, CI-Gate, Abnahmeevidenz |
| ROLE-07 Security & Privacy Manager | Bedrohungsmodell, Admin-API, Datenschutz |
| ROLE-08 Documentation Lead | Doku, Glossar, Nutzer-Guides DE/EN |

Agenten sind Rollen, keine Kursänderung. Eine Rolle kann eine Änderung blockieren
— der Grund steht in der Rollenbeschreibung. Die Entscheidung über eine
blockierte Änderung trifft der Owner.

---

## 7. Die Dokumentationsverwaltung

### Die Same-Change-Regel

Eine Code- oder Konfigurationsänderung ist **unvollständig**, wenn sie
Dokumentation veraltet lässt. Deshalb gehört die Aktualisierung in **denselben**
Commit:

| Änderung | Dokument, das mitzieht |
|---|---|
| Verhalten | `REQUIREMENTS.md` (ggf. über CR), `docs/user-guide/` |
| Struktur oder Grenze | `ARCHITECTURE.md` (ggf. ADR), `WHERE_TO_CHANGE.md` |
| Standard oder Grenzwert | `src/config/`, `REQUIREMENTS.md` |
| Meilenstein oder Status | `ROADMAP.md`, `project/project.yaml` |
| Qualitäts- oder Testgate | `QUALITY.md`, `docs/acceptance/` |
| Übersetzung | `src/i18n/locales/de.json` **und** `en.json` |

### Eine Wahrheit je Zahl

Jede Konstante, jede Kennzahl und jeder Grenzwert steht an genau einer Stelle.
Die anderen Dokumente verweisen darauf. Ausnahmen sind dokumentiert: der
Katalogumfang wird **gemessen** und im README genannt, die Regeln des Produkts
stehen in `src/config/game-config.ts`.

### Die Sprachregel

| Ebene | Sprache |
|---|---|
| Projektdokumentation | Deutsch |
| Code, Bezeichner, Kommentare, Commit-Messages | Englisch |
| Nutzer-Guides | Deutsch **und** Englisch, zwei Dateien |
| Nutzeroberfläche | Deutsch primär, Englisch vollständig |

### Alte Stände

Historische Dokumente werden **nicht** gelöscht, sondern nach
`specifications/archive/` verschoben und dort mit Datumsstempel im Dateinamen
versioniert. `specifications/` selbst enthält die Vorgänger der aktuellen
Dokumentation; jeder Altstand hat eine Entsprechung im neuen Satz, und die
Zuordnung steht in `specifications/archive/README.md`.

---

## 8. Der Übergabebericht

Jede Arbeitsrunde endet mit einem Bericht an den Owner:

1. **Was** geändert wurde (Datei, Zeile)
2. **Welche Anforderung** (ID)
3. **Der Beleg** (Kommando + Ausgabe, Testname oder Datei:Zeile)
4. **Was nicht geklappt hat** (offene Punkte, bewusst nicht umgesetzt)
5. **Was der Owner entscheiden muss** (eine Frage, mit Optionen und Empfehlung)

Ohne Beleg ist es eine Behauptung. Ohne Behauptung ist es nichts.
