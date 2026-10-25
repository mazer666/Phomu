# Konformitätsvektoren — Format und Korpus

> **Status:** Bindend für den Abgleich der TypeScript-Web-Shell mit der
> Rust-Basis. Das Format ist in [`schema.json`](schema.json) als JSON-Schema
> (Draft 2020-12) beschrieben und in
> [`core/phomu-conformance/CORE-API.md`](CORE-API.md) (sofern vorhanden) an
> die Kern-API gebunden.
>
> **Eigner:** Konformitätsnachweis (dieser Worker) für das Format und den
> Korpus; der Rust-Core gehört dem Plattform-Worker.

## 1. Was ein Vektor ist

Ein Vektor ist **eine Situation, eine Folge von Eingaben und eine
Erwartung**:

| Teil    | Bedeutung                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------- |
| `given` | Der Zustand, in dem die Runde beginnt (Spieler, Teams, Konfiguration, Phase, Timeline, Kandidaten-Songs) |
| `when`  | Die Eingaben, die in dieser Reihenfolge ausgeführt werden (Antworten, Sperren, Aktionen)                 |
| `then`  | Die erwartete Beobachtung: Phasenfolge, Punktestände je Spieler und Team, Gewinner, Fehlerfälle          |

Die Erwartung ist **vollständig** bei einem portablen Vektor: sie nennt
alle Felder der Beobachtung. Ein Vektor mit `portable: false` darf nur
einen Teil behaupten — er dokumentiert eine bekannte Abweichung.

## 2. Dateien

```text
core/phomu-conformance/vectors/web-shell/
├─ index.json        — die geordnete Liste aller Vektoren (die Reihenfolge des Laufs)
├─ schema.json       — das JSON-Schema des Formats
├─ README.md         — dieses Dokument
└─ <bereich>-<fall>.json — ein Vektor pro Datei
```

> **Warum das Unterverzeichnis `web-shell/`?** Das Crate
> `core/phomu-conformance` wird parallel von einem zweiten Worker gebaut.
> Deren Buildskript liest `core/phomu-conformance/vectors/index.json` und
> bettet **jede dort gelistete Datei** ein — der Index ist der
> Eintrittspunkt ihres Korpus. Zwei Korpora können sich einen Index nicht
> teilen. Das Unterverzeichnis hält beide Korpora getrennt: der
> Crate-Eigner behält `vectors/index.json`, dieser Korpus liegt in
> `vectors/web-shell/` und wird über **seinen** Index
> (`vectors/web-shell/index.json`) gelesen.

Der Dateiname ist die `id` des Vektors mit `/` → `-`. `index.json` ist die
Eintrittspunkt für beide Runner: sie läuft die Fälle in der dort
festgelegten Reihenfolge durch.

## 3. Regeln, die ein Vektor erfüllen muss

1. **Keine Zufallsabhängigkeit.** Ein Vektor darf kein `Math.random()` und
   keinen Uhrzeit-Zufall voraussetzen. Die Modusrotation (`game-store.ts`:190)
   und das Mischen der Teams im Modus `shifting` (`game-store.ts`:353) sind
   zufällig — portablen Vektoren liegt daher genau **ein** Modus in
   `selectedModes`.
2. **Eigene Kennungen.** Die Spieler- und Teambezeichnungen kommen aus dem
   Vektor, nicht aus `crypto.randomUUID()`.
3. **Die Situation wird über Aktionen gebildet.** `given` beschreibt das
   Zielbild; die Runner bauen es mit den Mitteln ihrer Implementierung:
   die Web-Shell mit `startGame` / `drawSong` / `advancePhase`, der
   Rust-Core mit `start_game` / `draw_song` / `force_reveal`.
4. **Der Vergleich ist feldweise.** Zwei Beobachtungen gelten als gleich,
   wenn jedes erwartete Feld gleich ist. Fehlt ein Feld in der Erwartung,
   wird es nicht behauptet.

## 4. Die Beobachtung

| Feld                                                                                  | Bedeutung                                                                                                             |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `phases`                                                                              | Die Rundephase nach **jeder** Eingabe, in Reihenfolge. Eine fehlgeschlagene Eingabe trägt keinen Eintrag.             |
| `currentRound`, `currentMode`, `currentSongId`, `currentSongSource`, `autoDrawIntent` | Der Zustand der laufenden Runde                                                                                       |
| `playerScores`, `teamScores`                                                          | Die Punktestände je Spieler und Team                                                                                  |
| `playerTeams`, `teamMembers`                                                          | Die Teamzuordnung und die Mitglieder                                                                                  |
| `turnOrder`, `currentTurnIndex`                                                       | Die Reihenfolge der Züge                                                                                              |
| `winnerId`, `isGameOver`                                                              | Das Ergebnis                                                                                                          |
| `timelineYears`, `playedSongIds`                                                      | Die Timeline und die bereits gespielten Songs                                                                         |
| `answers`                                                                             | Die eingereichten Antworten (`answer` = das gespeicherte Label, `outcome` = die Ergebnisklasse `correct`/`incorrect`) |
| `roundCount`                                                                          | Die Zahl der protokollierten Runden                                                                                   |
| `totalXP`                                                                             | Die Erfahrungspunkte der Sitzung                                                                                      |
| `censorHint`, `filteredSongIds`                                                       | Das Ergebnis der Sonden (`censorHint`, `filterSongs`)                                                                 |
| `error`                                                                               | Der Fehler der Vektorebene, falls eine Eingabe nicht ausführbar war                                                   |

## 5. Zwei Formate in einem Verzeichnis — known issue

Das Crate `core/phomu-conformance` wird parallel von einem zweiten Worker
gebaut. Deren `src/vector.rs` bringt ein **eigenes** Vektorformat mit
(`name` / `steps` / `expected`, snake_case) und eine eigene Liste
eingebetteter Vektoren (`VECTORS`) mit.

Beide Formate liegen damit in `core/phomu-conformance/vectors/`. Der
Runner dieses Workers (`src/bin/phomu-conformance-runner.rs`) liest **das
hier beschriebene Format** zur Laufzeit aus `index.json`; er benutzt das
Modell des Crates nicht und kollidiert therefore nicht mit ihm.

**Offene Entscheidung für den Owner:** Es muss ein Format werden.
Empfehlung: dieses Format (Schema, `index.json`, eine Datei pro Fall) als
das gemeinsame Format behalten und das Modell des Crates darauf
umstellen — der TypeScript-Runner und das Vergleichsskript lesen es
bereits.

## 6. Beispiel

```json
{
  "schemaVersion": 1,
  "id": "timeline/correct-canonical-slot",
  "area": "scoring.timeline",
  "title": "The canonical slot is correct and awards one point per year on the timeline",
  "reference": "src/components/game/modes/TimelineMode.tsx:117-139, 202",
  "portable": true,
  "given": {
    "config": { "selectedModes": ["timeline"], "timelineMaxPoints": 5 },
    "players": [{ "id": "p1", "name": "Ada" }],
    "turnOrder": ["p1"],
    "currentRound": 1,
    "roundPhase": "question",
    "currentMode": "timeline",
    "timelineYears": [1970, 1980, 1990],
    "currentSong": "s-a",
    "songs": { "s-a": { "id": "s-a", "year": 1985, "artist": "The Example" } }
  },
  "when": [
    {
      "op": "answer",
      "mode": "timeline",
      "answer": { "kind": "timeline", "slot": 2 }
    }
  ],
  "then": {
    "phases": ["question"],
    "currentRound": 1,
    "playerScores": { "p1": 4 },
    "timelineYears": [1970, 1980, 1985, 1990],
    "answers": [
      {
        "playerId": "p1",
        "answer": "correct",
        "outcome": "correct",
        "isCorrect": true,
        "pointsAwarded": 4,
        "answeredInSeconds": null
      }
    ]
  }
}
```

Die Erwartung dieses Vektors ist **nicht erfunden**: sie ist aus der
Referenz abgeleitet (`getValidSlots` akzeptiert den kanonischen Slot 2 für
den Jahreswert 1985 zwischen 1980 und 1990; die Punkte sind
`min(3 + 1, 5) = 4`) und wurde gegen den Lauf des TypeScript-Runners
geprüft.
