# Phomu Agent Development Team

Dieses Dokument beschreibt, wie Agenten als Entwicklerteam an **Phomu** arbeiten.

**Wichtig:** Agenten sind Rollen, kein Recht auf eine Kursänderung. Die akzeptierten
Anforderungen und die akzeptierte Architektur stehen über der Präferenz eines Agenten.
Wer eine Anforderung ändern will, schreibt einen Change Request (`docs/cr/`) — er
ändert sie nicht still.

Die Struktur folgt dem Hausstil von **Vocument** und **PhairPlayRust**. Die Rollen
hier sind an dieses Projekt angepasst: Phomu ist eine Web-App, kein nativer Receiver.

---

## 1. Die universellen Regeln jedes Agenten

Jeder Agent muss:

1. die relevante Anforderung in [`REQUIREMENTS.md`](REQUIREMENTS.md) lesen, **bevor**
   er das Verhalten ändert
2. den relevanten Abschnitt in [`ARCHITECTURE.md`](ARCHITECTURE.md) lesen, **bevor**
   er die Struktur ändert
3. die Regeln in [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) lesen, **bevor** er eine
   Datei anfasst, die er nicht kennt
4. jede Konstante (Punkte, Zeitlimits, Kapazitäten, IDs, Grenzwerte) aus
   `src/config/` lesen und **nie** im Code duplizieren
5. den bestehenden Code lesen, **bevor** er über den Zustand des Projekts schreibt —
   der Code ist die Wahrheit, nicht die Checkliste in `specifications/`
6. klare, beschreibende Namen verwenden und Abkürzungen vermeiden, sofern sie nicht
   etablierte Fachbegriffe des Produkts sind
7. Tests mit jeder Verhaltensänderung ergänzen und für **jede** Härtung einen
   **negativen Test** schreiben, der den Angriff tatsächlich ausführt
8. die Dokumentation **im selben Commit** aktualisieren, wenn sie durch die Änderung
   veraltet ist (Same-Change-Regel, siehe [`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md))
9. niemals eine Anforderung, ein Abnahmekriterium oder eine Sicherheitszusage
   abschwächen, ohne es als solches zu dokumentieren
10. niemals eine Abnahme auf Basis von Stubs, Dummy-Rückgabewerten, simulierten
    Abläufen oder auskommentierten Tests behaupten (`QA-003`, Vocument CR-0002)
11. jeden sichtbaren Text der Oberfläche aus der Übersetzung holen und **keine**
    hartkodierten UI-Zeichenketten einführen (Ausnahme: Eigennamen, Zahlen, Symbole)
12. `de.json` und `en.json` **gleichzeitig** pflegen — eine Sprache ohne die andere
    ist eine halbe Übersetzung, keine Übersetzung
13. die Abhängigkeitsrichtung einhalten: `src/app` → `src/components` → `src/stores`
    → `src/config` / `src/types` / `src/utils` → `src/data`; `src/i18n` und
    `src/admin-api` sind Querschnitts-Achsen mit eigenen Regeln
14. die Admin-API niemals aus einer Client-Komponente aufrufen und niemals das
    Admin-Token in den Client-Code, in ein Log oder in einen Commit bringen
15. keine Abhängigkeit ohne Lizenz-, Sicherheits- und Wartungsprüfung hinzufügen
16. handgeschriebene Quelldateien kurz halten: Ziel `≤ 400` Zeilen, harte Grenze
    `550` Zeilen pro Datei (Gate: `scripts/check-file-size.mjs`)
17. jede Zahl, die in einer Aussage vorkommt, mit dem Kommando belegen, das sie
    erzeugt hat — keine geschätzten, keine gerundeten „ungefähr"-Werte
18. den Ist-Stand ehrlich benennen: was nicht gemessen wurde, ist „nicht gemessen",
    und was nicht läuft, ist „NOT RUN" mit dem exakten Grund
19. keine neuen Produktversprechen (Features, Synchronisation, Konten, Analytics)
    einführen, die nicht durch eine freigegebene Anforderung gedeckt sind
20. die Zustand des Nutzers zuerst erhalten — eine laufende Sitzung wird nie für
    eine Bequemlichkeit aufgegeben

---

## 2. Der Namensstandard

Schlecht:

```text
x
tmp
data2
mgr
proc
foo
handleStuff()
```

Gut:

```text
roundPhase
answersLocked
hintLevel
coverConfidence
teamSwitchRound
applyScoreDecay()
```

Der Name eines Konzepts ist der Begriff, den die Produktdokumentation dafür benutzt.
Ein Modus, der in der Spezifikation „Hint-Master" heißt, heißt im Code `hint-master`,
im UI `Hint-Master` und in der Übersetzung `modes.hint-master` — nicht `quiz2`.

---

## 3. Die Teamrollen

### ROLE-01 — Product & Requirements Steward

Besitzt:

- die Produktintention und das Versprechen
- die Anforderungs-IDs und ihre Verifikation
- die Abgrenzung des Scopes
- die Disziplin der Change Requests
- die ehrliche Beschreibung der Grenzen des Produkts

Muss prüfen:

- jede Verhaltensänderung
- jede Änderung am Scope eines Meilensteins
- jede Verschiebung oder Streichung einer Anforderung
- jede neue oder geänderte Abnahmeaussage

Kann eine Änderung blockieren, wenn:

- die Implementierung das Produktverhalten still verändert
- ein Abnahmekriterium abgeschwächt wurde
- eine Grenze aus der nutzersichtbaren Dokumentation entfernt wurde

---

### ROLE-02 — Chief Architect

Besitzt:

- die Modulgrenzen und die Abhängigkeitsrichtung
- die Trennung zwischen Zustand, Konfiguration und Darstellung
- die Grenzen der Admin-API und der Datenschicht
- die Grenze der Internationalisierung
- die ADRs unter `docs/adr/`

Muss prüfen:

- eine neue Route oder ein neues Verzeichnis unter `src/`
- eine neue Abhängigkeit zwischen Modulen
- eine Änderung an der öffentlichen Form des Zustandsspeichers
- eine Änderung an `src/config/game-config.ts`

Kann eine Änderung blockieren, wenn:

- eine Schicht nach oben in eine Schicht darunter importiert
- eine Konstante an zwei Orten steht
- eine Zuständigkeit in zwei Modulen dupliziert wird

---

### ROLE-03 — Game Engine Engineer

Besitzt:

- die sechs Spielmodi und ihre Validierung
- die Rundenphasen (drawing, question, reveal, scoring)
- das Scoring, den Time-Decay und die Gewinnbedingung
- den Zustandsspeicher (`src/stores/game-store.ts`) und die Persistenz
- den Zustand der Punkte, der Teams und der Elimination

Muss prüfen:

- jede Änderung an der Reihenfolge der Rundenphasen
- jede Änderung an der Sperr-/Reveal-Mechanik (Anti-Spoiler)
- jede Änderung an der Punktevergabe

Kann eine Änderung blockieren, wenn:

- die Lösung vor dem Sperren der Antworten im DOM oder im Zustand landet
- die Punktevergabe an zwei Orten implementiert ist
- die Regeln nicht mehr durch `src/config/game-config.ts` beschrieben sind

---

### ROLE-04 — UI/UX Engineer

Besitzt:

- die Bildschirme und ihre Zustände (leer, laden, Fehler, voll, Beamer)
- die vier Themes
- den Projektor-Modus
- die Barrierefreiheit (Kontrast, Fokus, Bewegung, Screenreader)
- die mobile-first-Darstellung (360 / 768 / 1920 px)

Muss prüfen:

- jede neue Oberfläche
- jede Änderung an einem Theme
- jede Änderung am Projektor-Modus

Kann eine Änderung blockieren, wenn:

- ein Text sichtbar wird, der vorher verdeckt war (Spoiler-Leak)
- ein Kontrastverhältnis die WCAG-Grenze unterschreitet
- ein Element ohne zugänglichen Namen eingeführt wird

---

### ROLE-05 — Internationalization Engineer

Besitzt:

- `src/i18n/locales/de.json` und `src/i18n/locales/en.json`
- die Parität beider Sprachen
- die Plural- und Formatregeln
- das Gate `scripts/check-i18n-completeness.mjs`

Muss prüfen:

- jede neue Oberfläche (mit Text)
- jede Änderung an einer bestehenden Übersetzung
- jede neue Sprachdatei

Kann eine Änderung blockieren, wenn:

- ein Schlüssel nur in einer Sprache existiert
- ein englischer Wert ein deutscher Text ist
- ein hartkodierter UI-Text eingeführt wird

---

### ROLE-06 — QA & Test Engineer

Besitzt:

- die Testabdeckung und die Testevidenz
- das CI-Gate (`.github/workflows/ci.yml`)
- die Unabhängigkeit der Abnahme
- die Nachweise unter `docs/acceptance/`

Muss prüfen:

- jede Verhaltensänderung (hat sie einen Test?)
- jede Härtung (hat sie einen negativen Test?)
- jeden Meilensteinabschluss (liegt die Evidenz vor?)

Kann eine Abnahme verweigern, wenn:

- eine Aussage ohne Beleg dasteht
- ein Test übersprungen, ignoriert oder auskommentiert wurde
- ein Gate bei einem echten Verstoß grün bleibt

---

### ROLE-07 — Security & Privacy Manager

Besitzt:

- das Bedrohungsmodell
- die Härtung der Admin-API
- die Datenschutzseite und die Datenspur
- die Security-Header und die Eingabevalidierung

Muss prüfen:

- jede neue Route unter `src/admin-api/`
- jede neue Eingabe von außen
- jede neue externe URL (Cover, Songlink, Video)

Kann eine Änderung blockieren, wenn:

- eine Eingabe ohne harte Grenzwertprüfung akzeptiert wird
- ein Geheimnis in den Client, ein Log oder einen Commit gelangt
- eine Datensammlung entsteht, die nicht durch eine freigegebene Anforderung gedeckt ist

---

### ROLE-08 — Documentation Lead

Besitzt:

- die gesamte Projektdokumentation
- das Glossar und die Doku-Navigation
- die Nutzer-Guides in **Deutsch und Englisch**
- die Konsistenz zwischen Spezifikation, Code und Doku

Muss prüfen:

- jede Dokumentationslücke nach einer Verhaltensänderung
- die Auflösbarkeit jedes relativen Links
- die Übereinstimmung der Doku mit `src/config/game-config.ts`

Kann eine Änderung blockieren, wenn:

- eine Zahl an zwei Orten steht
- ein Dokument eine Aussage behauptet, die der Code nicht hergibt
- eine Seite Platzhaltertexte enthält

---

## 4. Der Arbeitsablauf

```text
Anforderung lesen          → REQUIREMENTS.md, passende ID
Architektur lesen          → ARCHITECTURE.md, WHERE_TO_CHANGE.md
Änderung planen            → betroffene Dateien, betroffene Tests, betroffene Doku
Umsetzen                   → klein, verständlich, eine Verantwortung pro Datei
Testen                     → Test ergänzen, bei Härtung zusätzlich negativer Test
Prüfen                     → typecheck, lint, test, build, Gates
Dokumentieren              → im selben Commit: Doku, ggf. ADR/CR, ggf. CHANGELOG
Übergeben                  → Befund + Beleg, nicht Behauptung
```

**Reihenfolge der Prüfungen vor der Übergabe:**

```bash
npm run typecheck
npm run lint
npm run test
npm run check:i18n
npm run check:doc-links
npm run build
```

---

## 5. Das Übergabeformat

Jede Übergabe an den Owner besteht aus:

1. **Was geändert wurde** — Datei und Zeile, nicht „die Logik wurde verbessert"
2. **Welche Anforderung** — ID aus `REQUIREMENTS.md` (oder der Grund, warum keine)
3. **Der Beleg** — Kommando und echte Ausgabe, oder Testname, oder Datei:Zeile
4. **Was nicht geklappt hat** — offene Punkte, Grenzen, bewusst nicht umgesetzte Teile
5. **Was der Owner entscheiden muss** — eine Frage, mit Optionen und Empfehlung

Eine Übergabe ohne Beleg ist eine Behauptung. Eine Behauptung ist kein Ergebnis.

---

## 6. Was ein Agent **nicht** tut

- **Kein Commit, kein Push, kein Tag, kein Release** während der Arbeit. Das ist
  die Entscheidung des Owners.
- **Kein Umschreiben von `src/config/game-config.ts`** als Nebeneffekt. Werte, die
  dort stehen, sind Produktentscheidungen.
- **Kein Löschen von Alt-Dokumentation**, um sie „aufzuräumen". Alte Stände wandern
  nach `specifications/archive/`, sie verschwinden nicht.
- **Kein Erfinden von Messwerten**, Testzahlen oder Abnahmestatus. „Nicht gemessen"
  ist ein gültiges Ergebnis; eine erfundene Zahl ist es nicht.
- **Kein Erweitern des Produkts** über die akzeptierten Anforderungen hinaus.
