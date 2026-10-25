# Dokumentationsregeln

Dokumentation ist Teil des Produkts. Diese Datei sagt, **wie** geschrieben wird,
wann eine Änderung sie verpflichtet, und was ausdrücklich nicht dokumentiert wird.

Die Regeln sind nicht verhandelbar, aber sie sind auch nicht kompliziert: **Jede
Aussage in der Doku muss im Code nachprüfbar sein, und jede Änderung im Code muss
die Doku mitziehen.**

---

## 1. Die Same-Change-Regel

Eine Code- oder Konfigurationsänderung ist **unvollständig**, wenn sie irgendeine
Dokumentation veraltet lässt. Die Aktualisierung passiert im **selben Commit** —
nicht als Folge-Commit, nicht als Ticket.

| Du änderst | Dann aktualisierst du |
|---|---|
| Verhalten des Spiels | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) (bei materieller Änderung zusätzlich `docs/cr/`) und beide Nutzer-Guides |
| Struktur, Grenzen, Abhängigkeitsrichtung | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (bei materieller Änderung zusätzlich `docs/adr/`) und [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) |
| Konstanten, Defaults, Grenzwerte | `src/config/` **und** die Fundstellen, die diese Zahl nennen |
| einen Spielmodus | `REQUIREMENTS.md` (Domäne `GAME`), `docs/user-guide/USER-GUIDE.de.md` **und** `.en.md`, `docs/BEST_IN_CLASS.md` |
| Texte der Oberfläche | `src/i18n/locales/de.json` **und** `en.json` |
| den Katalog | den Katalog-Report (`npm run validate-catalog:report`), nicht die Zahlen im README |
| die Architektur | [`../ARCHITECTURE.md`](../ARCHITECTURE.md), bei Grenzverschiebung ein ADR |
| einen Meilenstein oder dessen Status | [`../ROADMAP.md`](../ROADMAP.md) und `project/project.yaml` |
| eine Prüfung oder ein Gate | [`../QUALITY.md`](../QUALITY.md), [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) und `docs/acceptance/` |

**Die Probe:** Wenn jemand nur den Diff liest, muss er erkennen können, dass die
Doku mitgeändert wurde. Ein Diff, der nur `src/` anfasst, ist fast immer
unvollständig.

---

## 2. Single Source of Truth

Jede Zahl, jeder Name, jede Regel hat **genau eine** Quelle. Alle anderen Dokumente
verweisen darauf, statt sie zu wiederholen.

| Was | Die eine Quelle | Alle anderen schreiben |
|---|---|---|
| Punkte, Zeitlimits, Kapazitäten, Grenzwerte | `src/config/game-config.ts` | „gemäß `PHOMU_CONFIG`" — nicht die Zahl |
| Spielmodi und ihre Mechanik | `src/components/game/modes/<Modus>Mode.tsx` und `REQUIREMENTS.md` | Verweis auf die Anforderungs-ID |
| Phasen des Ablaufs | `src/types/game-state.ts` (`RoundPhase`) | Verweis auf `GAME-001` |
| Bedeutungen der Fachbegriffe | [`../GLOSSARY.md`](../GLOSSARY.md) | Verweis auf den Begriff |
| Anforderungen und ihre IDs | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) | Verweis auf die ID |
| Maschinenlesbarer Projektzustand | `project/project.yaml` | Verweis auf das Feld |
| Gemessene Qualitätswerte | [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) | Verweis auf das Ziel |
| Historische Schnappschüsse | `specifications/archive/` | „siehe Archivstand vom …" |

**Was das im Alltag heißt:** Wenn du `DEFAULT_TIMELINE_MAX_POINTS` änderst, änderst
du **eine** Zahl in **einer** Datei. Der Nutzer-Guide beschreibt dann das Prinzip
(„die Punkte sind gedeckelt"), aber nicht den Wert 5. Zwei Dokumente, die
dieselbe Zahl nennen, sind zwei Wahrheiten — und genau an der Bruchstelle entstehen
die Fehler.

**Ausnahme:** Zwei Nutzer-Guides (DE und EN) führen dieselben Zahlen. Das ist
gewollt und keine Doppelung: sie sind **dieselbe** Quelle in zwei Sprachen und
müssen synchron bleiben.

---

## 3. Die Sprachregel

| Ebene | Sprache |
|---|---|
| Projektdokumentation (Root und `docs/`) | **Deutsch** |
| Nutzer-Guides (`docs/user-guide/`) | **Deutsch und Englisch**, zwei Dateien |
| Code, Bezeichner, Kommentare, Commit-Messages | **Englisch** |
| Oberfläche (`src/i18n/locales/`) | **Deutsch primär, Englisch vollständig** |
| ADR und CR | **Deutsch** |

**Kein Dokument mischt die Sprachen auf Satzebene.** Ein deutscher Satz, ein
englischer Satz, ein deutscher Satz — das ist ein Fehler, kein Stil.

Bezeichner bleiben englisch, auch in deutschen Dokumenten: `PHOMU_CONFIG`,
`useGameStore`, `RoundPhase`, `answersLocked`. Deutsche Wörter in Bezeichnern nur,
wenn sie etablierte Fachbegriffe sind (`useGameStore` heißt so, weil `GameStore` so
heißt).

**Englische Fassungen sind echte Übersetzungen.** `en.json` bekommt keine Kopie der
deutschen Werte, und die englische Fassung des Nutzer-Guides ist keine deutsche
Fassung mit englischen Überschriften. Eigennamen — Spotify, YouTube, Jackbox,
Phomu, die Modusnamen — bleiben in beiden Sprachen identisch.

---

## 4. Anforderungs-IDs

Das Schema ist `<DOMÄNE>-<NNN>`: drei Ziffern, fortlaufend je Domäne, **nie
wiederverwenden**.

| Domäne | Inhalt |
|---|---|
| `CORE` | Produktprinzipien, Grundsätze |
| `GAME` | Spielmodi, Rundenlogik, Punkte, Regeln |
| `LOBBY` | Lobby, Spieler, Teams, Sitzung, QR/Karten |
| `MEDIA` | Musikprovider, Anti-Spoiler, Wiedergabe |
| `UI` | Oberfläche, Themes, Projektor, Barrierefreiheit |
| `I18N` | Internationalisierung |
| `CAT` | Songkatalog, Packs, Datenqualität |
| `SEC` | Sicherheit, Datenschutz, Admin-API |
| `NFR` | Nicht-funktionale Anforderungen |

Jede Anforderung hat **exakt** diese Form:

```markdown
### GAME-014 — Der Reveal gibt die Lösung erst nach dem Sperren frei

**Anforderung:** Nach dem Sperren aller Antworten wechselt die Rundenphase auf `reveal`.

**Begründung:** Der Anti-Spoiler-Schutz ist ein Produktversprechen, kein Komfortmerkmal.

**Akzeptanz:** `src/components/game/QuestionPhase.tsx` → Phase `reveal` erst bei
`answersLocked === true`; Unit-Test `src/components/game/QuestionPhase.test.tsx`.

**Verifikation:** `npm run test -- QuestionPhase`
```

Pflichtfelder sind **Anforderung**, **Begründung**, **Akzeptanz** und
**Verifikation**. Fehlt eines, ist die Anforderung unvollständig und zählt nicht.

Zusätzlich gilt:

- Legende **Preset** (Standard) / **Optional** (vorhanden, nicht aktiviert) /
  **Later** (bewusst verschoben).
- Jede ID wird **im Code, in Tests und in der Doku** referenziert — als Kommentar
  `// GAME-014` an der Implementierung, als Name im Test, als Verweis im Dokument.
- Eine ID wird **nie** neu vergeben. Wird eine Anforderung gestrichen, bleibt die ID
  verwaist und wird nicht nachvergeben.

**Wortwahl in den Anforderungen:** keine Wörter wie „angemessen", „intuitiv",
„performant" ohne Zahl oder Pfad. Jede Aussage nennt die Datei, den Test oder den
Wert, an dem sie hängt.

---

## 5. Benennung der Dossiers

| Art | Muster | Beispiel |
|---|---|---|
| Architekturentscheidung | `ADR-<NNNN>-<kebab-case-thema>.md` | `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md` |
| Change Request | `CR-<NNNN>-<kebab-case-thema>.md` | `docs/cr/CR-0001-source-file-size-limits.md` |
| Abnahme | `M<n>-ACCEPTANCE.md` | `docs/acceptance/M1-ACCEPTANCE.md` |
| Leitfaden | `<THEMA-GROSSBUCHSTABEN>.md` | `docs/guides/PRINTING-GUIDE.md` |
| Nutzer-Guide | `USER-GUIDE.<sprache>.md` | `docs/user-guide/USER-GUIDE.de.md` |

Regeln:

- Nummerierung ab `ADR-0001` bzw. `CR-0001`, **fortlaufend**, nie überschrieben.
  Eine Nummer, die einmal vergeben war, gehört für immer diesem Dokument.
- Dateinamen in **kebab-case** (`kebab-case-thema`), Sprachunterlagen in
  **SCREAMING-CASE** (`PRINTING-GUIDE.md`).
- Ein Dossier trägt **einen** Gegenstand. Wer zwei Themen in eine Datei legt, kann
  keine der beiden mehr versionieren.
- Die Nummer steht im Dateinamen **und** in der Überschrift der Datei.
- Historische Stände werden **nicht** überschrieben, sondern nach
  `specifications/archive/` verschoben und dort mit Datum im Dateinamen markiert.

---

## 6. Was nicht dokumentiert wird — und warum

| Nicht dokumentiert | Warum |
|---|---|
| **Der Quellcode selbst** | Der Code ist die Wahrheit. Eine zweite Beschreibung des Codes wird veralten. `ARCHITECTURE.md` beschreibt Grenzen, nicht Zeilen. |
| **Jeden einzelnen Song** | 1.615 Datensätze sind kein Dokument. Der Katalog liegt in `src/data/songs/` und wird von `npm run validate-catalog` geprüft. |
| **Jede Cover-Datei** | 1.649 Bilder liegen in `public/covers/`. Ihre Herkunft ist Sache der Metadaten, nicht des Fließtexts. |
| **Die Abhängigkeiten von Bibliotheken** | `package.json` und `package-lock.json` sind maschinenlesbar und aktuell. Eine prosaische Liste wäre eine zweite, schlechtere Wahrheit. |
| **Historische Schnappschüsse im Fließtext** | Sie stehen in `specifications/archive/`. Eine Archivdatei, die mitwächst, ist kein Archiv. |
| **Aufgabenlisten, Roadmaps ohne Abnahmekriterien** | Eine Aufgabe ohne Abnahmekriterium ist eine Absichtserklärung. Der Fortschritt steht in `ROADMAP.md` mit Akzeptanz. |
| **Erklärungen zu jedem einzelnen Commit** | `CHANGELOG.md` fasst Änderungen zusammen. Das vollständige Protokoll liegt in der Versionsverwaltung. |
| **Werte, die gemessen, aber nirgends behauptet werden** | Was nicht gemessen wurde, ist „nicht gemessed" — siehe [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md). |
| **Personenbezogene Daten von Spielern** | Namen, Avatare und Punktestände bleiben im Browser des Geräts. Sie gehören in keine Datei und in kein Log. |
| **Fremde Inhalte** | Musikstücke, Coverbilder und Videolinks gehören Dritten. Das Projekt stellt Software unter GPL-3.0 bereit, nicht die Inhalte. |

---

## 7. Wie eine gute Doku-Seite aussieht

1. **Eine Aussage pro Absatz.** Kein Absatz, der fünf Dinge behauptet.
2. **Jede Zahl hat einen Pfad.** Entweder steht sie in `src/config/`, oder sie hat
   ein Kommando, das sie erzeugt.
3. **Jeder Befehl ist kopierbar.** Kein `npm run …` ohne den Rest, kein `…` im
   Kommando, das man nicht ausführen kann.
4. **Keine Platzhalter.** „TODO", „wird ergänzt", „coming soon" sind in einer
   fertigen Seite verboten. Entweder ist eine Seite inhaltlich fertig, oder sie
   existiert nicht.
5. **Links prüfen.** Jeder relative Markdown-Link muss auflösbar. Ein toter Link
   ist ein Fehler, keine Kleinigkeit.
6. **Der Ton ist ruhig.** Kein Marketing, kein „revolutionär", kein „nahezu
   unübertroffen". Eine Qualitätsseite nennt Messmethode und Zielwert.
7. **Deutsch, wenn es Projektdoku ist.** Kein Denglisch.

---

## 8. Prüfungen, die die Doku absichern

| Prüfung | Kommando | Prüft |
|---|---|---|
| Doku-Linkcheck | `npm run check:doc-links` | jeder relative Markdown-Link im Repo löst auf |
| i18n-Vollständigkeit | `npm run check:i18n` | `de.json` und `en.json` parallel, keine leeren Werte, kein Literaltext mehr im JSX |
| Dateigröße | `npm run check:file-size` | keine Quelldatei über 550 Zeilen (weich: 400) |
| Katalog-Gate | `npm run validate-catalog` | Katalog ohne Regression gegen die Baseline |
| Pipeline | `npm run local-ci` | alles in der Reihenfolge, in der die CI es ausführt |

Die Gates sind in `package.json` eingetragen und laufen lokal über `npm run check:all`
sowie einzeln über `npm run check:i18n`, `npm run check:doc-links` und
`npm run check:file-size`. Sie gehören in die CI und in `npm run local-ci`.

---

## 9. Verbindlichkeit

Diese Regeln gelten für **jede** Änderung an Dokumentation im Repo — für
Mitarbeitende ebenso wie für Agenten. Verstöße gegen die Same-Change-Regel und die
Single-Source-of-Truth-Regel sind der häufigste Grund, warum eine Änderung trotz
grüner Tests nicht abgenommen wird.
