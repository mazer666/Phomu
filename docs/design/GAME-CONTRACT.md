# Phomu — Game Contract

> **Status:** Binding. Jede Runde, jeder Modus und jeder Musikprovider in diesem
> Repository wird gegen dieses Dokument gebaut.
> **Owner:** Chief Architect (`ROLE-02` in [`../AGENTS.md`](../../AGENTS.md)).
> **Änderungen:** Wer eine hier beschriebene Grenze verändert, ändert diesen Vertrag
> **im selben Commit** und legt bei Grenzverschiebungen ein ADR in
> [`../adr/`](../adr/) an. Format: [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md).
> **Verwandte Dokumente:** [`../REQUIREMENTS.md`](../../REQUIREMENTS.md) (Anforderungs-IDs),
> [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) (Schichten und Abhängigkeitsrichtung),
> [`../README.md`](../README.md) (Index).

Dieses Dokument definiert die **Schnittstellen zwischen den Bausteinen des
Spielablaufs**. Es definiert bewusst *nicht*, wie eine Runde im Detail
komponiert ist — das ist die Aufgabe der Komponente, die sie umsetzt. Wer
feststellt, dass eine Regel hier eine korrekte Umsetzung verhindert, hat
recht: Die Regel ist dann falsch und muss **hier zuerst** geändert werden.

Alle Aussagen in diesem Dokument sind aus dem Code abgelesen und mit
`Datei:Zeile` belegt. Wo der Code von diesem Vertrag abweicht, steht die
Abweichung in [§ 11](#11-abweichungen-zwischen-vertrag-und-code-gemessen) —
nicht versteckt im Fließtext.

---

## 1. Geltungsbereich und kanonische Quellen

### 1.1 Was dieser Vertrag regelt

| Bereich | Geregelt in |
|---|---|
| Rundenphasen und ihre Übergänge | [§ 2](#2-der-rundenphasen-automat) |
| Anti-Spoiler-Grenze | [§ 3](#3-die-anti-spoiler-grenze) |
| Verträge der sechs Spielmodi | [§ 4](#4-die-sechs-spielmodi) |
| Punkte- und Zeitregeln | [§ 5](#5-punkte--und-zeitregeln) |
| Team- und Rundenlogik | [§ 6](#6-team--und-rundenlogik) |
| Persistenzregeln | [§ 7](#7-persistenzregeln) |
| Musikprovider | [§ 8](#8-musikprovider-verträge) |
| Modulgrenzen für `src/components/**` | [§ 9](#9-modulgrenzen) |
| Selbsttest des Vertrags | [§ 10](#10-wie-der-vertrag-geprüft-wird) |

### 1.2 Kanonische Quellen (keine Zahlen hier erfinden)

| Frage | Kanonische Quelle |
|---|---|
| Welche Zahlen gilt das Spiel? | `PHOMU_CONFIG` in [`../../src/config/game-config.ts`](../../src/config/game-config.ts):52-326 |
| Welche Namen werden zensiert? | `SPOILER_CONFIG` in [`../../src/config/spoiler-config.ts`](../../src/config/spoiler-config.ts):8-29 |
| Welche Verhaltensregel gilt? | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) (IDs `GAME-*`, `MEDIA-*`, `LOBBY-*`, `CAT-*`) |
| Welche Datei darf was aufrufen? | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) § 2 |
| Welche Phase ist wann aktiv? | `roundPhase` in [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts) |

> **Regel:** Zahlen, die nicht in `PHOMU_CONFIG` stehen, sind im Code lokal
> definiert. Diese Liste ist in [§ 11.3](#113-lokal-definierte-zahlen-abweichung-von-der-ein-wahrheit-regel) vollständig aufgeführt.
> Wer eine Zahl verschiebt, verschiebt sie in `PHOMU_CONFIG` — nicht in
> dieses Dokument.

---

## 2. Der Rundenphasen-Automat

### 2.1 Die fünf Phasen

Die Phasen sind in `RoundPhase` definiert
([`../../src/types/game-state.ts`](../../src/types/game-state.ts):28-33). Der Name
der Phase ist der Vertrag; Kommentare in der Typdefinition sind erläuternd
und nicht normativ.

| Phase | Bedeutung laut Typdefinition | Wer setzt sie | Übergang zu |
|---|---|---|---|
| `drawing` | Karte wird gezogen | `createInitialState` (`game-store.ts`:165), `startGame` (`:267`), `nextRound` (`:367`), `skipBrokenSong` (`:410`, `:415`) | `question` (über `drawSong`) |
| `question` | Frage steht, Spieler denken | `drawSong` (`:398`), `startQuickGame` (`:504`) | `reveal` (über `advancePhase('reveal')`) |
| `locked-in` | Alle Antworten abgegeben, warte auf Reveal | **niemand** — der Wert existiert, wird aber nie gesetzt | — |
| `reveal` | Antwort aufgedeckt, Musik läuft | `advancePhase('reveal')` (`game-store.ts`:439-441) | `drawing` (über `nextRound`) oder `scoring` (über `endGame`) |
| `scoring` | Punkte werden vergeben, nächster Zug lädt | `endGame` (`game-store.ts`:388) | Ende (Redirect `/game-over`, `src/app/game/page.tsx`:96-100) |

### 2.2 Zustandsautomat

```text
                          ┌──────────────────────────────────────────┐
                          │                                          │
                          ▼                                          │
                 ┌─────────────┐                                    │
   initSession ─▶│   drawing   │◀── nextRound()      skipBrokenSong()│
   startGame()  │ (Karte ziehen)│    (game-store.ts:365-375)  (:405-416)
                 └──────┬──────┘                                    │
                        │ drawSong(song)                            │
                        │ (game-store.ts:394-402)                   │
                        ▼                                          │
                 ┌─────────────┐                                    │
                 │   question  │──── handleTimeUp() ────┐           │
                 │ (Fragerunde)│    (page.tsx:232-236)   │           │
                 └──────┬──────┘                        │           │
                        │ advancePhase('reveal')        │           │
                        │ (page.tsx:164-166)            │           │
                        │ ─────────────────────────────┘           │
                        ▼                                          │
                 ┌─────────────┐                                    │
                 │    reveal   │──── endGame() ──▶ ┌──────────────┐  │
                 │ (Auflösung) │   (game-store.ts:  │   scoring    │──┼──▶ /game-over
                 └──────┬──────┘    :379-391)       │ (Spielende)  │  │
                        │                           └──────────────┘  │
                        └─────────────────────────────────────────────┘

   'locked-in' ist typisiert (game-state.ts:31), wird aber von KEINEM
   Codepfad betreten (advancePhase wird ausschließlich mit 'reveal'
   aufgerufen: src/app/game/page.tsx:165 und :234).
```

### 2.3 Übergangstabelle (wer löst was aus)

| Von | Nach | Auslöser | Code-Fundstelle | Anforderung |
|---|---|---|---|---|
| `drawing` | `question` | Pilot zieht eine Karte (`DrawingPhase` → `onCardDrawn`) | `game-store.ts`:394-402; `src/app/game/page.tsx`:118-123; `src/components/game/DrawingPhase.tsx`:123-146 | GAME-003 |
| `drawing` | `drawing` | defekter Song, Zufallsquelle → `autoDrawIntent = true` → automatischer Zug | `game-store.ts`:415; `DrawingPhase.tsx`:149-157 | GAME-013 |
| `drawing` | `drawing` | defekter Song, QR-Quelle → nur Phasenwechsel, **kein** Auto-Zug | `game-store.ts`:408-412 | GAME-013 |
| `question` | `reveal` | Button „Alle fertig → Reveal" (nur `survivor`, `vibe-check`, `hint-master`, `timeline`) | `src/components/game/QuestionPhase.tsx`:34-40, :93-100 | GAME-002 |
| `question` | `reveal` | moduseigener Abschluss (`lyrics`, `cover-confusion`) | `LyricsMode.tsx`:95; `CoverConfusionMode.tsx`:288 | GAME-002 |
| `question` | `reveal` | Ablauf der Fragerunde (`timeLimitSeconds`) | `src/app/game/page.tsx`:232-236, :317 | UI-010 |
| `reveal` | `drawing` | „Nächste Runde" | `game-store.ts`:365-375; `src/app/game/page.tsx`:182-193 | GAME-005 |
| `reveal` | `scoring` | „Zum Gewinner-Screen!" bzw. `endGame()` | `game-store.ts`:379-391; `src/app/game/page.tsx`:218-221 | GAME-008 |
| beliebig | — | „Runde verwerfen & neue Frage" (Power User) → `nextRound()` | `src/app/game/page.tsx`:213-215; `RevealPhase.tsx`:626-631 | GAME-040 |

### 2.4 Datenverfügbarkeit je Phase

| Datenfeld (`GameState`) | `drawing` | `question` | `reveal` | `scoring` |
|---|---|---|---|---|
| `currentSong` | `null` — Ausnahme QR-Skip: bleibt gesetzt, wird aber nicht gerendert | gesetzt | gesetzt | **bleibt gesetzt** (erst `nextRound` leert auf `null`, `game-store.ts`:369) |
| `currentMode` | gesetzt | gesetzt | gesetzt | gesetzt |
| `currentAnswers` | leer | wird gefüllt | gefüllt | **bleibt gefüllt** ( erst `nextRound` leert, `:370`) |
| `timelineYears` | sichtbar (Jahre der bereits aufgelösten Runden) | sichtbar | sichtbar | sichtbar — wird **nur** von `resetScores` geleert (`:491`) |
| `playedSongIds` | sichtbar | sichtbar | sichtbar | sichtbar |
| `roundHistory` | wächst erst beim Rundenwechsel (`:331-343`) | unverändert | unverändert | unverändert |
| `winnerId` | `undefined` | `undefined` | `undefined` — die Gewinneranzeige im Reveal rechnet über Punktestände (RevealPhase.tsx`:480-483`) | gesetzt **nur** bei der Punktebedingung (`:310`); bei `rounds`/`time` bleibt es `undefined` |

Beleg für die Rendering-Regel: `src/app/game/page.tsx`:408-411 rendert
`QuestionPhase`/`RevealPhase` nur bei `currentSong !== null` **und**
Phase in `question | locked-in | reveal`. In `drawing` wird der Song daher
nicht gerendert, auch wenn das Feld gefüllt ist.

---

## 3. Die Anti-Spoiler-Grenze

> **Produktversprechen:** Anti-Spoiler ist kein Komfortmerkmal, sondern eine
> Anforderung (`CORE-005`, `MEDIA-015`). Dieser Abschnitt ist die **prüfbare**
> Fassung dieses Versprechens.

### 3.1 Grundsatz

Der Song-Datensatz (`PhomuSong`, [`../../src/types/song.ts`](../../src/types/song.ts):42-165)
enthält die vollständige Lösung: `title`, `artist`, `year`, `hints`, `lyrics`,
`mood`, `isOneHitWonder`, `links`. Die Anti-Spoiler-Regel lautet:

> **In der Phase `question` darf die Lösung nicht *sichtbar* sein.**
> Sichtbar heißt: im gerenderten DOM der Seite `/game` und der Seite
> `/projector` für einen Menschen lesbar — auch nicht durch Umgehung des
> Blur-Filters.

Diese Fassung ist bewusst so gewählt, weil der Code den Song-Datensatz zur
Antwortzeit vollständig im Client hält. Eine stärkere Fassung („die Lösung
darf im DOM nicht stehen") ist **heute nicht erfüllbar**, ohne den
Client-Zustand umzubauen; sie ist in [§ 11.1](#111-gemessene-abweichungen) als
offene Entscheidung festgehalten.

### 3.2 Was in welcher Phase sichtbar sein darf

| Modus | In `question` sichtbar | Muss verborgen bleiben | Umsetzung | Status |
|---|---|---|---|---|
| `timeline` | Slots, Punktzahl, Cheat-Hinweis | `title`, `artist`, `year` des aktuellen Songs | `TimelineMode.tsx`:481-537 rendert Titel/Künstler/Jahr **erst** bei `isRevealed`; `MusicPlayer` mit `blurred={!isRevealed}` (`:281`) | ✅ erfüllt |
| `hint-master` | bis zu 5 Hinweise (zensiert), Ebenen-/Punktanzeige | `title`, `artist` | `HintMasterMode.tsx`:156 nutzt `censorHint`; `MusicPlayer` `blurred={!isRevealed}` (`:133`) | ✅ erfüllt (mit Rauheit der Zensur, s. § 3.4) |
| `lyrics` | 4 Zeilen, **sowie `artist` und `title`** | `artist`, `title` | `LyricsMode.tsx`:132-133 rendert `{song.artist}` und `{song.title}` **unbedingt** | ❌ **verletzt** — s. [§ 11.1](#111-gemessene-abweichungen) |
| `vibe-check` | `artist`, `title`, Dekade, Stimmungsoptionen | — (die Identität ist Teil der Frage) | `VibeCheckMode.tsx`:116-118 rendert Identität; `MusicPlayer` `blurred={false}` (`:99`) | ⚠️ **bewusste Ausnahme**, s. [§ 11.1](#111-gemessene-abweichungen) |
| `survivor` | „???" als Künstler, Dekade/Genre erst nach Antwort | `artist`, `title` | `SurvivorMode.tsx`:97-114 blendet den Künstler aus; `MusicPlayer` `blurred={!answered && !cheatUsed}` (`:69`) | ✅ erfüllt |
| `cover-confusion` | Cover-Banner, unzensierte Hinweise, Multiple-Choice-Optionen | `title`, `artist` (außer als Option in der Wahlphase) | `CoverConfusionMode.tsx`:116-120 rendert „COVER-VERSION AKTIV"; `:126-140` rendert Hinweise **ohne** `censorHint` | ❌ **verletzt** — s. [§ 11.1](#111-gemessene-abweichungen) |

### 3.3 Persistierter Zustand

Zusätzlich zum DOM gilt: In `localStorage` unter dem Schlüssel
`phomu-game-state` darf der Song-Datensatz **nicht** liegen. Das ist erfüllt —
`partialize` ( [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts):621-637)
enthält `currentSong` **nicht**. Details in [§ 7](#7-persistenzregeln).

### 3.4 Zensurregel für Hinweise

`censorHint` ([`../../src/utils/censor-utils.ts`](../../src/utils/censor-utils.ts):11-60)
ersetzt jedes Token von `artist` und `title` in einem Hinweis durch `[XXX]`.
Schwellen aus `SPOILER_CONFIG`
([`../../src/config/spoiler-config.ts`](../../src/config/spoiler-config.ts)):

| Schwellwert | Wert | Wirkung |
|---|---|---|
| `MIN_LENGTH` | 4 | Tokens kürzer als 4 Zeichen werden **nicht** zensiert … |
| `EXCEPTIONS` | 45 Einträge | … außer sie stehen hier (z. B. `BTS`, `U2`, `2Pac`) |
| `IGNORE_WORDS` | 21 Einträge | Füllwörter (`THE`, `AND`, `DER`, `DIE` …) werden nie zensiert |

Die Zensur ist **whitelist-basiert auf kurze Namen** und damit lückenhaft:
ein Künstlername mit ≥ 4 Zeichen wird nur zensiert, wenn er **wortweise** im
Hinweis vorkommt (`censor-utils.ts`:26-37). Ein Artist, der im Hinweis mit
Sonderzeichen geschrieben wird (`The` Artist), wird nicht zensiert. Das ist
eine bekannte Rauheit, keine Zusage.

### 3.5 Overlay-Regel (Player)

`MusicPlayer` ([`../../src/components/game/MusicPlayer.tsx`](../../src/components/game/MusicPlayer.tsx)):28)
kennt die Prop `blurred`. Ist `blurred = true`, gilt:

| Element | Regel | Fundstelle |
|---|---|---|
| Wrapper | `blur-[60px] scale-125 opacity-50` + `pointer-events-none` | `:424` |
| Overlay | `bg-[#0a0a0c]/40 backdrop-blur-[60px]`, z-index 20 | `:438` |
| Aufdeck-Geste | Drag nach rechts > 150 px → `videoRevealed = true` | `:466-476` |
| Erneut verbergen | Button „Verbergen" setzt `videoRevealed = false` | `:538-545` |

`MusicPlayer` rendert **weder `songTitle` noch `songArtist`** im JSX. Beide
Werte werden ausschließlich für den Report-Payload verwendet (`:198-214`).
Das ist die technische Grundlage dafür, dass der Musiktitel nicht zusätzlich
im React-Baum steht.

---

## 4. Die sechs Spielmodi

Die sechs Modi sind in `GameMode`
([`../../src/config/game-config.ts`](../../src/config/game-config.ts):12-18)
typisiert und in `ALL_GAME_MODES` (`:300-307`) aufgezählt. Die Zuordnung
Modus → Komponente steht in
[`../../src/components/game/QuestionPhase.tsx`](../../src/components/game/QuestionPhase.tsx):61-83.

**Gemeinsame Signatur aller Modus-Widgets:**

```ts
onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void
onReveal?: () => void
```

`onAnswer` wird **nicht** selbst Punkte gutschreiben. Die Punktevergabe
geschieht zentral in `handleAnswered`
([`../../src/app/game/page.tsx`](../../src/app/game/page.tsx):126-161); dort
greift der Zeitabzug, und `awardPoints` wird **nur** bei
`isCorrect && pointsAwarded > 0` aufgerufen (`:147-149`).

### 4.1 `timeline` — Chronologische Timeline

Quelle: [`../../src/components/game/modes/TimelineMode.tsx`](../../src/components/game/modes/TimelineMode.tsx)

| Aspekt | Regel | Fundstelle |
|---|---|---|
| **Modus** | `timeline` | `game-config.ts`:13 |
| **Eingabe** | Klick auf einen Slot; Tastatur `1`–`n`, Pfeiltasten, `Enter`/`Leertaste` | `:425-552`, `:242-255` |
| **Validierung** | gültig ist der kanonische Slot (erster Index mit `song.year < years[i]`) **plus** bei Duplikatjahr der Slot davor und danach | `getValidSlots` `:93-115`, `canonicalSlot` `:118-123` |
| **Ergebnis** | korrekt → Jahr wird aufgenommen; Duplikat → automatisch entfernt; ab > 10 Jahren darf der Spieler optional eine Zahl entfernen | `:186-196`, `:209-212` |
| **Punktevergabe** | `Math.min(timelineYears.length + 1, config.timelineMaxPoints)`; `DEFAULT_TIMELINE_MAX_POINTS = 5` | `:154`; `game-config.ts`:63 |
| **Abzüge** | Dekaden-Hint −2 (`:219`), Joker −1 (`:234`); Boden 0 durch `awardPoints` | `game-store.ts`:451-476 |
| **Fehlerfälle** | ohne Auswahl ist „AUFLÖSEN" disabled (`:559`); `handleReveal` bricht ohne Auswahl ab (`:175`); Joker ohne falschen Slot zieht keine Punkte ab (`:229`); Cheats laufen nicht ohne `currentPlayerId` (`:215`, `:223`) | siehe links |
| **Anforderungen** | GAME-016 bis GAME-022, GAME-039 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.2 `hint-master` — Hint-Master

Quelle: [`../../src/components/game/modes/HintMasterMode.tsx`](../../src/components/game/modes/HintMasterMode.tsx)

| Aspekt | Regel | Fundstelle |
|---|---|---|
| **Modus** | `hint-master` | `game-config.ts`:14 |
| **Eingabe** | „Nächster Hinweis" (Stufe 1…5), optional „Musik-Cheat" (nur Stufe 1), „LÖSUNG ZEIGEN", danach Selbst-Einschätzung: Beides / Nur Künstler / Nur Titel / Nichts | `:166-190`, `:206-241` |
| **Validierung** | `handleFinalDecision` ignoriert Doppelklicks (`if (done) return`); `handleCheat` nur bei `!showMusic && !cheatUsed && !isRevealed && currentPlayerId` | `:48`, `:58` |
| **Ergebnis** | `isCorrect = knew !== 'none'` | `:49` |
| **Punktevergabe** | Stufenpunkte `HINT_MASTER_POINTS = [5, 4, 3, 2, 1]`; „Beides" → volle Punkte; „Nur Künstler"/„Nur Titel" → `Math.ceil(points / 2)`; „Nichts" → 0 | `game-config.ts`:310; `:36`, `:50` |
| **Abzüge** | Musik-Cheat −2 Punkte | `:62` |
| **Fehlerfälle** | `maxHints = song.hints.length` — der Typ fordert 5 Hinweise (`song.ts`:85), der Katalog kann weniger liefern; Musik startet automatisch ab Stufe 2; Hinweise werden zensiert | `:35`, `:43`, `:156` |
| **Anforderungen** | GAME-023 bis GAME-026, GAME-037, CAT-011, CAT-012 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.3 `lyrics` — Lyrics Labyrinth

Quelle: [`../../src/components/game/modes/LyricsMode.tsx`](../../src/components/game/modes/LyricsMode.tsx)

| Aspekt | Regel | Fundstelle |
|---|---|---|
| **Modus** | `lyrics` | `game-config.ts`:15 |
| **Eingabe** | eine von vier Zeilen markieren, dann „Bestätigen & Auflösen" | `:141-186` |
| **Validierung** | `handleConfirm` bricht ab, wenn nichts gewählt ist oder bereits aufgelöst wird | `:90` |
| **Ergebnis** | `isCorrect = options[selected]?.isFake` — 3 echte Zeilen plus 1 zufällig gewählte Fake-Zeile, gemischt und pro Song stabil | `:68-83`, `:92` |
| **Punktevergabe** | `LYRICS_POINTS = 4` bei korrekt, sonst 0 | `:21`, `:94` |
| **Fehlerfälle** | `song.lyrics === null` → **Bonusrunde**: „Ich kenn's!" → 2 Punkte, „Kein Schimmer" → 0 Punkte; der Katalog-Filter garantiert Lyrics nicht (Hard-Fallback) | `:42-44`, `:236-251`; [`../../src/utils/song-picker.ts`](../../src/utils/song-picker.ts):58-70 |
| **Anti-Spoiler** | `artist` und `title` werden ab Beginn gerendert — Regel verletzt | `:132-133` |
| **Anforderungen** | GAME-027 bis GAME-029, GAME-043 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.4 `vibe-check` — Vibe-Check

Quelle: [`../../src/components/game/modes/VibeCheckMode.tsx`](../../src/components/game/modes/VibeCheckMode.tsx)

| Aspekt | Regel | Fundstelle |
|---|---|---|
| **Modus** | `vibe-check` | `game-config.ts`:16 |
| **Eingabe** | eine Stimmung wählen (6 Optionen, nach Cheat 3) | `:158-210` |
| **Validierung** | `handleSelect` ignoriert Klicks nach der Antwort (`if (answered) return`); `isCorrect = song.mood.includes(mood)` | `:53`, `:54` |
| **Ergebnis** | 6 angezeigte Optionen = 5 falsche + `song.mood[0]`; Cheat = 2 falsche + `song.mood[0]` | `:62-71` |
| **Punktevergabe** | 2 Punkte bei korrekt, nach Cheat 1 Punkt; 0 bei falsch | `:57` |
| **Fehlerfälle** | Cheat halbiert die Optionen **und** senkt den Gewinn auf max. +1 (Schaltfläche ausgeblendet bei `config.noCheatMode`); `ALL_MOODS` führt 12 Kandidaten, angezeigt werden 6 | `:9`, `:21-34`, `:133` |
| **Anti-Spoiler** | `artist`, `title` und Dekade sind Teil der Frage — Identität wird bewusst preisgegeben, Musik **unverdeckt** | `:116-118`, `:99` |
| **Anforderungen** | GAME-030, GAME-031, GAME-037 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.5 `survivor` — Survivor

Quelle: [`../../src/components/game/modes/SurvivorMode.tsx`](../../src/components/game/modes/SurvivorMode.tsx)

| Aspekt | Regel | Fundstelle |
|---|---|---|
| **Modus** | `survivor` | `game-config.ts`:17 |
| **Eingabe** | „Ja" (One-Hit-Wonder) / „Nein" (Dauerstar); optional Cheat „Artist enthüllen" | `:128-163` |
| **Validierung** | `handleChoice` ignoriert Klicks nach der Antwort; `isCorrect = guessedOneHit === song.isOneHitWonder` | `:31`, `:32` |
| **Ergebnis** | 3 Punkte bei korrekt, 0 bei falsch | `:36` |
| **Abzüge** | Cheat −1 Punkt, deckt den Künstler auf | `:43`, `:97-114` |
| **Fehlerfälle** | Cheat nur bei `!cheatUsed && !answered && currentPlayerId`; Cheat-Button ausgeblendet bei `config.noCheatMode` | `:40`, `:153` |
| **Anti-Spoiler** | Künstler als „???" bis Antwort oder Cheat; `MusicPlayer` `blurred={!answered && !cheatUsed}` | `:97-114`, `:69` |
| **Anforderungen** | GAME-032, GAME-033, GAME-037 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.6 `cover-confusion` — Cover Confusion

Quelle: [`../../src/components/game/modes/CoverConfusionMode.tsx`](../../src/components/game/modes/CoverConfusionMode.tsx)

| Aspekt | Regel | Fundstelle |
|---|---|---|
| **Modus** | `cover-confusion` | `game-config.ts`:18 |
| **Eingabe** | Variante A („who-is-it", 50 %): „Ich kenne ihn!" oder Hinweis 1/2, dann Multiple-Choice mit 3 Künstlern. Variante B („original-or-cover", 50 %): „COVER" / „ORIGINAL" | `:39`, `:147-192`, `:232-251` |
| **Validierung** | `handleChoice` vergleicht `artist === song.artist`; `handleChoiceVariation` vergleicht `guessCover === !!song.links.coverLink`; eigene Phasenmaschine `listening → self-assess / choice → done` | `:71`, `:79`, `:25` |
| **Ergebnis** | Variante A: Punkte je Hinweiszahl; Variante B: fest 3 Punkte | `:63-84` |
| **Punktevergabe** | `POINTS_BY_HINTS = [5, 4, 3, 2]`; Variante B immer 3 | `:23`, `:82` |
| **Fehlerfälle** | höchstens 3 Hinweise; die 3 Auswahlkünstler kommen aus dem **gesamten Katalog** (benötigt ≥ 3 verschiedene Künstler); Wiedergabe über `song.links.coverLink || song.links.youtube`; bei gesetztem `coverLink` werden die YouTube-Alternativen bewusst **nicht** angeboten | `:53-61`, `:45-51`, `:42`, `:104-108` |
| **Anti-Spoiler** | „COVER-VERSION AKTIV" verrät die Antwort der Variante B bereits in `question`; die Hinweise werden **nicht** zensiert (anders als `hint-master`) | `:116-120`, `:139` |
| **Anforderungen** | GAME-034 bis GAME-036, CAT-011, CAT-012, CAT-014 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

---

## 5. Punkte- und Zeitregeln

### 5.1 Kanonische Quelle

**Alle** einstellbaren Spielzahlen stehen in `PHOMU_CONFIG`
([`../../src/config/game-config.ts`](../../src/config/game-config.ts):52-326).
Auszug der für den Spielablauf relevanten Werte:

| Schlüssel | Wert | Zeile | Verwendet in |
|---|---|---|---|
| `DEFAULT_WIN_SCORE` | 10 | `:54` | `game-store.ts`:50 (`config.winCondition`) |
| `MAX_PLAYERS` | 24 | `:55` | `game-store.ts`:210; `src/app/lobby/page.tsx`:122 |
| `MIN_PLAYERS` | 1 | `:56` | `src/app/lobby/page.tsx`:114 |
| `DEFAULT_ROUNDS_TO_PLAY` | 10 | `:60` | `game-store.ts`:53 (`config.roundsToPlay`) |
| `MIN_ROUNDS_TO_PLAY` | 10 | `:61` | **nirgends** (s. [§ 11.3](#113-lokal-definierte-zahlen-abweichung-von-der-ein-wahrheit-regel)) |
| `MAX_ROUNDS_TO_PLAY` | 30 | `:62` | **nirgends** |
| `DEFAULT_TIMELINE_MAX_POINTS` | 5 | `:63` | `game-store.ts`:54; `TimelineMode.tsx`:154 |
| `DEFAULT_TIME_DECAY_ENABLED` | `false` | `:64` | `game-store.ts`:55 |
| `DEFAULT_TIME_DECAY_GRACE_SECONDS` | 5 | `:65` | `game-store.ts`:56 |
| `DEFAULT_TIME_DECAY_STEP_SECONDS` | 5 | `:66` | `game-store.ts`:57 |
| `DEFAULT_TIME_DECAY_STEP_POINTS` | 1 | `:67` | `game-store.ts`:58 |
| `DEFAULT_MIN_POINTS_PER_CORRECT` | 1 | `:68` | `game-store.ts`:59 |
| `DEFAULT_NO_CHEAT_MODE` | `false` | `:72` | `game-store.ts`:64 |
| `COUNTDOWN_SECONDS` | 3 | `:81` | **nirgends** |
| `SPOTIFY_PREVIEW_DURATION` | 30 | `:82` | **nirgends** |
| `HINT_MASTER_POINTS` | `[5, 4, 3, 2, 1]` | `:310` | `HintMasterMode.tsx`:36, `:171` |
| `DEFAULT_UNLOCK_METHOD` | `'swipe'` | `:313` | **nirgends** |
| `FORCE_REMOVE_DUPLICATE_YEARS` | `true` | `:316` | **nirgends** |

### 5.2 Punktevergabe (zentral)

```text
Modus liefert (isCorrect, basePoints, answeredInSeconds?)
        │
        ▼  src/app/game/page.tsx:126-161  (handleAnswered)
Zeitabzug (nur wenn isCorrect && timeDecayEnabled && answeredInSeconds gesetzt):
   overtime     = max(0, answeredInSeconds - timeDecayGraceSeconds)
   decaySteps   = floor(overtime / max(1, timeDecayStepSeconds))
   decayPoints  = decaySteps * timeDecayStepPoints
   pointsAwarded = max(minPointsPerCorrect, basePoints - decayPoints)
        │
        ▼
submitAnswer({ playerId: pilotId, answer: 'correct'|'incorrect',
                isCorrect, pointsAwarded, answeredInSeconds })
        │
        ▼  nur wenn isCorrect && pointsAwarded > 0
awardPoints(pilotId, pointsAwarded)
   → Spielerscore = max(0, score + points)
   → Teamscore   = max(0, score + points)   (wenn teamId gesetzt, GAME-007)
```

Beleg: `src/app/game/page.tsx`:131-149; `game-store.ts`:444-476.

### 5.3 Zeitregeln

| Regel | Wert / Verhalten | Fundstelle | Anforderung |
|---|---|---|---|
| Fragerunden-Timeout | `config.timeLimitSeconds` (Standard `null` = kein Limit); der Timer läuft **nur** in Phase `question` | `game-state.ts`:66; `src/app/game/page.tsx`:317 | UI-010 |
| Bei Timeout | Phase wechselt zu `reveal` — die Runde wird **nicht** als falsch gewertet, es gibt keine Punkte | `src/app/game/page.tsx`:232-236 | GAME-002 |
| Zeitabzug (Strafe) | optional, Standard aus; wirkt nur bei richtiger Antwort **und** vorhandener Antwortzeit | `src/app/game/page.tsx`:131-136; `game-config.ts`:64-68 | GAME-038 |
| Antwortzeit gemessen | **nur** im Modus `timeline` (`answeredInSeconds` wird nur dort übergeben) | `TimelineMode.tsx`:178 | GAME-039 |
| Countdown vor Musikstart | 3 s — als Konstante vorhanden, aber **nicht verwendet** | `game-config.ts`:81 | s. [§ 11.3](#113-lokal-definierte-zahlen-abweichung-von-der-ein-wahrheit-regel) |

---

## 6. Team- und Rundenlogik

### 6.1 Zugreihenfolge

| Regel | Implementierung | Fundstelle | Anforderung |
|---|---|---|---|
| `turnOrder` enthält im Individual-Modus Spieler-IDs, im Team-Modus Team-IDs | `startGame` | `game-store.ts`:258-261 | GAME-004 |
| `currentTurnIndex` springt zyklisch weiter | `(currentTurnIndex + 1) % turnOrder.length` | `game-store.ts`:345-347 | GAME-004 |
| Der aktive Spieler wird **aus `turnOrder` abgeleitet**, nicht aus `Player.isPilot` | `pilotId = turnOrder[currentTurnIndex]` | `src/app/game/page.tsx`:103-107 | GAME-004 |
| `Player.isPilot` (Lobby-Rolle, erster Spieler) wird im Spielablauf **nicht** gelesen | nur `src/app/lobby/page.tsx`:236 und `src/components/lobby/PlayerCard.tsx`:59 lesen es | `game-store.ts`:219, :236-239 | s. [§ 11.4](#114-weitere-beobachtungen) |

### 6.2 Teammodi

`TeamMode` = `'individual' | 'fixed' | 'shifting'`
([`../../src/types/player.ts`](../../src/types/player.ts):9-12;
[`../../src/config/game-config.ts`](../../src/config/game-config.ts):36-39).

| Modus | Regel | Fundstelle | Anforderung |
|---|---|---|---|
| `individual` | jedes Team für sich; `turnOrder` = Spieler-IDs | `game-store.ts`:259-260 | LOBBY-006 |
| `fixed` | feste Teams über das ganze Spiel; `turnOrder` = Team-IDs | `game-store.ts`:261 | LOBBY-006 |
| `shifting` | bei jedem Rundenwechsel werden die Spieler auf die Teams neu verteilt (Sortierung per `Math.random()`, Round-Robin) — **nur** wenn `teams.length >= 2` | `game-store.ts`:349-363 | LOBBY-006 |

> **Regel für `shifting`:** Die Neuverteilung ändert **nur** die
> `playerIds` der Teams. Die Punktestände der Teams **und** der Spieler werden
> **nicht** angepasst (`game-store.ts`:354` setzt `playerIds: []` und lässt
> `score` unberührt). Damit gilt die Beziehung „Teampunkte = Summe der
> Mitgliederpunkte" (GAME-007) ab dem ersten Shifting **nicht** mehr.
> Vor dem ersten Shifting sind sie synchron, weil `awardPoints` beide
> Seiten gleichzeitig erhöht (`game-store.ts`:466-473).

### 6.3 Rundenprotokoll

| Regel | Implementierung | Fundstelle | Anforderung |
|---|---|---|---|
| Eine Runde wird **vor** der nächsten protokolliert | `roundHistory` | `game-store.ts`:331-343 | GAME-005 |
| Eine Runde ohne gezogenen Song wird **nicht** protokolliert | `currentSong !== null` als Bedingung | `game-store.ts`:332 | GAME-005 |
| Protokolldatensatz | `{ roundNumber, mode, song, answers, completedAt }` | `game-state.ts`:130-136; `game-store.ts`:335-341 | GAME-005 |

### 6.4 Gewinnbedingungen

`GameEndingCondition` = `'points' | 'rounds' | 'time'`
([`../../src/types/game-state.ts`](../../src/types/game-state.ts):35). Genau eine
Bedingung ist aktiv (`config.endingCondition`, Standard `'rounds'` in
`game-store.ts`:46).

Die Prüfung erfolgt **ausschließlich am Ende einer Rotation**
(`isEndOfRotation = currentTurnIndex === turnOrder.length - 1`,
`game-store.ts`:300):

| Bedingung | Abbruch | `winnerId` | Fundstelle | Anforderung |
|---|---|---|---|---|
| `points` | `maxScore >= config.targetPoints` | ID des führenden Spielers bzw. Teams | `game-store.ts`:303-311 | GAME-008, GAME-009 |
| `rounds` | `currentRound >= config.targetRounds × (Individual ? players.length : teams.length)` | **nicht gesetzt** (`undefined`) | `game-store.ts`:312-316 | GAME-008, GAME-010 |
| `time` | `elapsed >= config.targetTimeMinutes` ab `gameStartTime` | **nicht gesetzt** | `game-store.ts`:317-322 | GAME-008, GAME-011 |

> **Folge:** Bei `rounds` und `time` bleibt `winnerId` leer. Der Gewinner wird
> erst im Reveal (`RevealPhase.tsx`:486-495, teambasiert, wenn `teams.length > 0`)
> bzw. im Game-Over-Screen (`src/app/game-over/page.tsx`:54`,
> `players.find(p => p.id === winnerId) ?? sorted[0]`) bestimmt. Das ist der
> vertraglich geltende Pfad, kein Fehler.

`targetRounds` ist **pro Spieler** (Individual) bzw. **pro Team** (Team-Modus).
Die Gesamtanzahl der Züge ist `targetRounds × Anzahl Spieler/Teams` — identisch
in der Fortschrittsanzeige (`src/app/game/page.tsx`:269-271`).

### 6.5 Eliminierung

| Feld | Bedeutung laut Typ | Tatsächlicher Zustand im Code |
|---|---|---|
| `Player.isEliminated` | „Whether this player has been eliminated from the game." ([`../../src/types/player.ts`](../../src/types/player.ts):31-36) | Wird beim Anlegen auf `false` gesetzt (`game-store.ts`:216) und **nie** auf `true`. Kein Code-Pfad eliminiert. |
| `Player.isSpectator` | „A player becomes a spectator when eliminated, or can join as spectator directly." (`player.ts`:38-43) | Wird beim Anlegen auf `false` gesetzt (`game-store.ts`:217`) und **nie** auf `true`. Kein Code-Pfad setzt es. |

> **Vertragslage:** Elimination und Zuschauerstatus sind ein **Datenmodell ohne
> Regel**. Es gibt keine Eliminierungslogik — weder nach Runden noch nach
> Punkten. Wer Elimination einführt, muss diesen Vertrag ändern (ADR).

---

## 7. Persistenzregeln

### 7.1 Was gespeichert wird

`persist` mit `name: 'phomu-game-state'`
([`../../src/stores/game-store.ts`](../../src/stores/game-store.ts):619) und
`partialize` (`:621-637`) schreibt genau diese Felder in `localStorage`:

| Feld | Persistiert | Warum |
|---|---|---|
| `players` | ✅ | Lobby und Punktestand überleben einen Reload (LOBBY-021) |
| `teams` | ✅ | dito |
| `config` | ✅ | Lobby-Konfiguration bleibt erhalten (LOBBY-021) |
| `sessionId` | ✅ | Identität der Sitzung |
| `totalXP` | ✅ | Fortschritt über Sessions hinweg |
| `preferredPlayer`, `preferredMusicProvider` | ✅ | Providerwahl bleibt erhalten (MEDIA-002) |
| `musicEnabled`, `musicVolume`, `sfxEnabled`, `sfxVolume` | ✅ | Audio-Einstellungen (MEDIA-009) |
| `currentRound` | ✅ | Reload führt nicht zurück in die Lobby |
| `isGameOver` | ✅ | Game-Over-Zustand bleibt erkennbar |
| `timelineYears` | ✅ | Die gemeinsame Timeline überlebt den Reload (GAME-017, GAME-019) |
| `gameStartTime` | ✅ | Zeitbedingung misst weiter ab Spielstart (GAME-011) |

### 7.2 Was **nicht** gespeichert wird

| Feld | Persistiert | Begründung |
|---|---|---|
| `currentSong` | ❌ | **Anti-Spoiler:** Der Song-Datensatz enthält die Lösung (Titel, Künstler, Hinweise, Lyrics). Er darf nicht auf der Festplatte liegen. |
| `currentAnswers` | ❌ | Antworten sind Rundenephemera; sie werden nach dem Rundenwechsel in `roundHistory` protokolliert (GAME-005). |
| `roundPhase` | ❌ | Nach einem Reload ist der Zustand `drawing` (`createInitialState`, `game-store.ts`:165) — der Pilot zieht neu. |
| `currentMode` | ❌ | Wird pro Runde neu gewürfelt (`pickRandomMode`, `:188-191`) |
| `playedSongIds` | ❌ | Wird nach dem Reload neu aufgebaut; Preis: bereits gespielte Songs können erneut gezogen werden. |
| `roundHistory` | ❌ | Nur flüchtig; kein Replay implementiert. |
| `turnOrder`, `currentTurnIndex` | ❌ | Werden in `startGame` neu aufgebaut (`:258-262`). |
| `winnerId` | ❌ | Wird beim Spielende gesetzt und in `/game-over` aus dem Punktestand abgeleitet. |
| `currentSongSource`, `autoDrawIntent` | ❌ | Steuerflags der laufenden Runde. |

### 7.3 Warum das für den Anti-Spoiler-Schutz zählt

1. **Kein Song auf der Festplatte.** `currentSong` steht nicht in `partialize`.
   Ein Blick in `localStorage` verrät die Lösung der laufenden Runde nicht.
2. **Kein Reveal-Zustand auf der Festplatte.** `roundPhase` wird nicht
   gespeichert. Nach einem Reload kann die App nicht in einem bereits
   aufgelösten Zustand landen.
3. **Der Reload ist eine Sicherheitsgrenze, kein Bug.** Nach einem Reload
   steht `currentRound > 0` (persistiert), aber `currentSong = null` und
   `roundPhase = 'drawing'`. Die Seite `/game` rendert deshalb die
   `DrawingPhase` — der Pilot zieht eine neue Karte. **Bekannte
   Nebenwirkung:** Die bereits vergebenen Punkte bleiben erhalten (die
   Punktevergabe passiert sofort bei `handleAnswered`), während die
   zugehörige Antwort nicht in `currentAnswers` steht und die Runde deshalb
   nicht in `roundHistory` protokolliert wird (GAME-005 verlangt die
   Protokollierung nur bei `currentSong !== null`).

---

## 8. Musikprovider-Verträge

### 8.1 Provider-IDs

`MusicProvider`
([`../../src/config/game-config.ts`](../../src/config/game-config.ts):20-26):
`'youtube' | 'spotify-free' | 'spotify-premium' | 'amazon-music' |
'amazon-music-premium' | 'apple-music'`.
Der aktive Provider steht in `GameState.preferredMusicProvider` und ist
**persistiert** (MEDIA-002).

### 8.2 Der deklarierte Provider-Vertrag

[`../../src/types/music-provider.ts`](../../src/types/music-provider.ts):34-93
definiert `MusicProviderInterface` mit `initialize`, `isAvailable`, `play`,
`pause`, `stop`, `seek`, `getState`, `onStateChange`, `renderEmbed`, `destroy`.

> **Gemessener Befund:** Dieser Vertrag wird **nirgends implementiert und
> nirgends verwendet**. `grep -rn "MusicProviderInterface" src` findet nur die
> Definition. `MusicPlayer` arbeitet stattdessen direkt mit der YouTube
> IFrame API, `<audio>`-Elementen und `<iframe>`-Embeds und hält seinen
> eigenen lokalen Zustandstyp `'loading' | 'playing' | 'error' | 'paused'`
> (`MusicPlayer.tsx`:140) statt `PlayerState` aus `music-provider.ts`:18-25.
> `ProviderAvailability` (`music-provider.ts`:99-107) kennt zudem nur 5
> Provider — `amazon-music-premium` fehlt.
> **Konsequenz:** `src/types/music-provider.ts` ist heute eine **Dokumentation,
> kein durchgesetzter Vertrag**. Verbindlich ist § 8.3–§ 8.6.

### 8.3 Reihenfolge der Wiedergabe

```text
1. Spotify Premium  → nur wenn preferredMusicProvider === 'spotify-premium'
                      UND song.links.spotify eine Track-ID ergibt
                      → <iframe> open.spotify.com/embed/track/{id}
                      MusicPlayer.tsx:167, :559-571

2. Spotify Free     → nur wenn preferredMusicProvider === 'spotify-free'
                      UND song.links.spotifyFreePreview gesetzt ist
                      → <audio src={spotifyFreePreview}>
                      MusicPlayer.tsx:168, :573-583

3. Amazon Prime     → nur wenn preferredMusicProvider === 'amazon-music'
                      UND song.links.amazonPrimePreview gesetzt ist
                      → <audio src={amazonPrimePreview}>
                      MusicPlayer.tsx:169, :585-605

4. Amazon Premium   → nur wenn preferredMusicProvider === 'amazon-music-premium'
                      UND eine Amazon-ASIN extrahierbar ist
                      → <iframe> music.amazon.com/embed/track/{asin}
                      MusicPlayer.tsx:170, :607-619

5. YouTube          → Standard und Rückfallebene
                      Fallback-Kette: [links.youtube, ...links.youtubeAlternatives]
                      MusicPlayer.tsx:149-155, :284-370
```

**Rückfallverhalten:** Fällt der gewählte Provider aus, weil der
zugehörige Link fehlt, wird **kein** Fehler gemeldet — es wird einfach der
nächste verfügbare Weg gewählt. Fehlt auch der YouTube-Link, zeigt der
Player „Kein Video verfügbar" (`MusicPlayer.tsx`:417-419`, MEDIA-016).
`'apple-music'` ist in `MusicProvider` deklariert, im Player aber **ohne
Zweig** — die Auswahl führt dort faktisch zum YouTube-Pfad.

**Provider-Anzeige:** Der aktive Providerstatus wird als Badge eingeblendet
(`MusicPlayer.tsx`:547-557`, MEDIA-018).

### 8.4 Start, Ende, Lautstärke

| Regel | Implementierung | Fundstelle | Anforderung |
|---|---|---|---|
| Start-Offset | `playerVars.start = startSeconds`; `startSeconds` kommt aus `song.previewTimestamp?.start ?? 0`. **Nicht alle Modi reichen ihn weiter:** `cover-confusion` (`:113`), `hint-master` (`:131`), `lyrics` (`:120`), `survivor` (`:68`), `vibe-check` (`:98`) tun es — `timeline` **nicht**. | `MusicPlayer.tsx`:299; `grep -n "startSeconds" src/components/game/modes/*.tsx` | MEDIA-007 |
| End-Offset | `endSeconds` → Intervall 500 ms, `pauseVideo()` bei Überschreiten | `MusicPlayer.tsx`:317-327 | MEDIA-008 |
| Lautstärke | `musicVolume` (0..1) → `setVolume(0..100)`; `musicEnabled === false` → `mute()` + `pauseVideo()` | `MusicPlayer.tsx`:307-315, :376-385 | MEDIA-009 |

### 8.5 Defekter Link

```text
YouTube-IFrame meldet onError
   │
   ├─ Fallback vorhanden?  → nächsten Eintrag der Kette laden (videoIndex++),
   │                         Zustand zurück auf 'loading'
   │                         MusicPlayer.tsx:257-265
   │
   └─ kein Fallback mehr  → playerState = 'error'
                             → startAutoSkipCountdown()  (10 Sekunden)
                             MusicPlayer.tsx:267-269
```

| Fall | Verhalten | Fundstelle | Anforderung |
|---|---|---|---|
| `onError` des Players | nächster Fallback, sonst Fehlerzustand | `MusicPlayer.tsx`:329-332, :254-272 | MEDIA-004 |
| Video startet nicht (`UNSTARTED`) | Timeout nach **6 000 ms**, dann Fehlerbehandlung | `MusicPlayer.tsx`:334-341 | MEDIA-005 |
| Fehlerzustand sichtbar | Overlay „Gesperrt oder Fehler", Buttons „JETZT ÜBERSPRINGEN", „Alternative Player" (Domain-Wechsel `www.youtube.com` ↔ `music.youtube.com`), „Report Missing" | `MusicPlayer.tsx`:481-535 | MEDIA-006, MEDIA-016 |
| Auto-Skip | Countdown **10 s**, danach `skipBrokenSong()` | `MusicPlayer.tsx`:239-252 | MEDIA-006 |
| `skipBrokenSong()` bei Zufallsquelle | `roundPhase = 'drawing'`, `currentSong = null`, `autoDrawIntent = true` → `DrawingPhase` zieht automatisch | `game-store.ts`:414-416; `DrawingPhase.tsx`:149-157 | GAME-013 |
| `skipBrokenSong()` bei QR-Quelle | nur `roundPhase = 'drawing'`; **kein** automatischer Zug (der Pilot scannt neu) | `game-store.ts`:408-412 | GAME-013 |
| Manuelles Neuwürfeln | Button „Video kaputt? Neu würfeln", 2 s Würfel-Animation, dann `skipBrokenSong()` | `QuestionPhase.tsx`:105-112; `src/app/game/page.tsx`:239-246 | GAME-014 |
| Fehlenden Link melden | GitHub-Issue oder Zwischenablage; Rate-Limit **5 Meldungen pro Stunde und Gerät**; Duplikatschutz pro Song | `MusicPlayer.tsx`:172-237 | MEDIA-013, MEDIA-014 |

### 8.6 Lebenszyklus über den Reveal-Übergang

`QuestionPhase` bleibt während des Reveals **gemountet** (`display: none`),
damit der YouTube-Iframe nicht neu startet. Das ist ein bewusster Eingriff in
den Renderbaum und im Code kommentiert
([`../../src/app/game/page.tsx`](../../src/app/game/page.tsx):404-411, :418-430).

> **Konsequenz für die Anti-Spoiler-Regel:** Während `reveal` existiert der
> `QuestionPhase`-DOM weiter — nur mit `display: none`. § 3.2 ist deshalb
> ausschließlich für die Phase `question` formuliert.

---

## 9. Modulgrenzen

### 9.1 Was in `src/components/**` rein darf

Gemessen am Import-Graph ohne Testdateien. Reproduzierbar mit:

```bash
find src/components -name '*.ts' -o -name '*.tsx' \
  | grep -v '\.test\.' \
  | xargs grep -hoP "from '\K[^']+" | sort | uniq -c | sort -rn
```

| Erlaubte Abhängigkeit | Vorkommen |
|---|---|
| `@/types/**` (`song` 11, `player` 2, `game-state` 1) | 14 |
| `@/utils/**` (`feedback-messages` 8, `song-picker` 3, `last-round-messages` 1, `censor-utils` 1) | 13 |
| `@/components/**` und relative Komponenten (`../MusicPlayer` 6, `./modes/*` 6, `@/components/game/MusicPlayer` 1, `./NavBar` 1) | 14 |
| `@/config/game-config` | 10 |
| `@/stores/game-store` | 7 |
| `@/contexts/ThemeContext` | 3 |
| `react-i18next` (`useTranslation`) | 19 |
| Fremdpakete (`react` 23, `framer-motion` 22, `next/navigation` 4, `next/link` 1, `next/image` 1, `html5-qrcode` 1) | 52 |

| Verbotene Abhängigkeit | Status |
|---|---|
| `@/app/**` | ✅ keine Kante |
| `@/admin-api/**` | ✅ keine Kante |
| `@/data/**` (Katalog-Interna) | ✅ keine Kante — der Katalog wird ausschließlich über `@/utils/song-picker` (`getAllSongs`, `pickRandomSong`) erreicht (`TimelineMode.tsx`:15, `CoverConfusionMode.tsx`:18`) |
| `@/i18n/locales/*.json` (Rohdaten) | ✅ keine Kante — nur `useTranslation` |

### 9.2 Was `src/components/**` nicht enthalten darf

| Regel | Begründung | Beleg |
|---|---|---|
| **Keine Seiten-Orchestrierung** | Routen, Guards und Redirects gehören in `src/app/**` | `src/app/game/page.tsx`:89-100 (Guard), :96-100 (Redirect) |
| **Keine Server-Zugriffe** | `src/components/**` ist Client-Code | `@/admin-api` nicht importiert |
| **Kein Zugriff auf den Katalog direkt** | Nur über `@/utils/song-picker` | siehe 9.1 |
| **Kein eigener Zustandshalter** | Der Store ist der einzige schreibende Zustandshalter | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) § 2.2 |
| **Keine hartkodierten Zahlen des Spiels** | Zahlen stehen in `PHOMU_CONFIG` | s. [§ 11.3](#113-lokal-definierte-zahlen-abweichung-von-der-ein-wahrheit-regel) |
| **Kein Feature-Scope jenseits der Phase** | Eine Modus-Komponente rendert ihre Frage und ihre Punkte; sie orchestriert keine Runden | `QuestionPhase.tsx`:61-83 (Routing), `src/app/game/page.tsx`:363-462 (Orchestrierung) |

> **Bekannte Abweichung:** `ARCHITECTURE.md` § 1 definiert für `components`
> „Darstellung und Interaktion; **keine Spiellogik**". Die Modus-Widgets
> enthalten heute aber die **Punktelogik** (z. B. `TimelineMode.tsx`:154,
> `HintMasterMode.tsx`:50, `CoverConfusionMode.tsx`:41). Das ist eine
> **offene Entscheidung** — siehe [§ 11.5](#115-offene-entscheidungen-für-den-owner).

### 9.3 Kopplung zwischen den Modus-Widgets

Alle sechs Modus-Widgets importieren `MusicPlayer` direkt
(`../MusicPlayer`, 6 Vorkommen). Die Modus-Widgets kennen **keine** anderen
Modus-Widgets; die Auswahl erfolgt ausschließlich über
[`../../src/components/game/QuestionPhase.tsx`](../../src/components/game/QuestionPhase.tsx):61-83.

---

## 10. Wie der Vertrag geprüft wird

| Prüfung | Kommando / Ort |
|---|---|
| Phasennamen unverändert | `grep -n "RoundPhase" -A 6 src/types/game-state.ts` |
| `locked-in` wird nicht betreten | `grep -rn "advancePhase(" src` — darf nur `'reveal'` ergeben |
| Song nicht persistiert | `grep -n "partialize" -A 18 src/stores/game-store.ts` — `currentSong` darf nicht vorkommen |
| Kein Import von `app/` oder `admin-api/` aus `components/` | `grep -rn "from '@/app\|from '@/admin-api" src/components/` — muss leer sein |
| Katalogzugriff nur über `song-picker` | `grep -rn "from '@/data" src/components/` — muss leer sein |
| Modus-Zuordnung unverändert | `grep -n "currentMode ===" src/components/game/QuestionPhase.tsx` |
| Provider-Reihenfolge unverändert | `grep -n "useSpotifyPremium\|useSpotifyFree\|useAmazonPrime\|useAmazonPremium" src/components/game/MusicPlayer.tsx` |
| Zahlen nur an einer Stelle | `grep -rn "HINT_MASTER_POINTS\|DEFAULT_TIMELINE_MAX_POINTS" src/` |
| Anforderungen decken den Vertrag ab | `grep -n "^### GAME-\|^### MEDIA-" REQUIREMENTS.md` |
| Doku-Links auflösbar | `npm run check:doc-links` ([`../../scripts/check-doc-links.mjs`](../../scripts/check-doc-links.mjs)) |
| Dateigrößen unter der Grenze | `npm run check:file-size` ([`../../scripts/check-file-size.mjs`](../../scripts/check-file-size.mjs)) |

---

## 11. Abweichungen zwischen Vertrag und Code (gemessen)

Alles in diesem Abschnitt ist **gemessen**, nicht geschätzt. Die Kommandos stehen
in der letzten Spalte.

### 11.1 Gemessene Abweichungen

| # | Abweichung | Fundstelle | Messung |
|---|---|---|---|
| A1 | `lyrics` rendert `artist` und `title` bereits in Phase `question` — Verstoß gegen § 3.2 | `LyricsMode.tsx`:132-133 | `grep -n "song.artist\|song.title" src/components/game/modes/LyricsMode.tsx` |
| A2 | `cover-confusion` rendert „COVER-VERSION AKTIV" ab Beginn — beantwortet die Variante „Cover oder Original?" vorab | `CoverConfusionMode.tsx`:116-120 | `grep -n "COVER-VERSION AKTIV" src/components/game/modes/CoverConfusionMode.tsx` |
| A3 | `cover-confusion` zensiert seine Hinweise **nicht** (`hint-master` tut es) | `CoverConfusionMode.tsx`:139` (roh) gegen `HintMasterMode.tsx`:156` (`censorHint`) | `grep -n "censorHint" src/components/game/modes/*.tsx` |
| A4 | `vibe-check` deckt die Identität bewusst auf (Artist, Titel, Dekade; Musik unverdeckt) — als Modus-Ausnahme, nicht als Regel | `VibeCheckMode.tsx`:116-118, `:99` | `grep -n "blurred" src/components/game/modes/VibeCheckMode.tsx` |
| A5 | `ADR-0003` nennt `vibe-check` als **einzige** Ausnahme von der Anti-Spoiler-Regel; `lyrics` ist eine zweite | [`../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md`](../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md) gegen `LyricsMode.tsx`:132-133 | beide Dateien gelesen |
| A6 | `locked-in` ist typisiert, wird aber nie betreten; es existiert **kein** `answersLocked`-Flag | `game-state.ts`:31; `page.tsx`:165, `:234` | `grep -rn "answersLocked" src` → 0 Treffer; `grep -rn "advancePhase(" src` → 2 Aufrufe, beide `'reveal'` |
| A7 | Elimination ist nicht implementiert: `isEliminated` und `isSpectator` werden nie `true` | `game-store.ts`:216-217 | `grep -rn "isEliminated\|isSpectator" src` → 4 Treffer, alle Initialisierung |
| A8 | Im Modus `shifting` bleiben Team- und Spielerscores beim Wechsel unverändert → GAME-007 (Teampunkte = Summe der Mitglieder) gilt danach nicht mehr | `game-store.ts`:349-363 | Code gelesen |
| A9 | `MusicProviderInterface`, `PlayerState` (Typ) und `ProviderAvailability` werden nicht implementiert und nicht verwendet; `ProviderAvailability` kennt `amazon-music-premium` nicht | `music-provider.ts`:18-107 | `grep -rn "MusicProviderInterface\|ProviderAvailability" src` → nur die Definition |
| A10 | Bei `preferredMusicProvider === 'amazon-music-premium'` wird der Amazon-Embed **zusätzlich** zum YouTube-Player gerendert, weil die Initialisierungssperre `useAmazonPremium` nicht nennt | `MusicPlayer.tsx`:285` (Sperre) gegen `:607-619` (Embed) | beide Stellen gelesen |
| A11 | `config.targetPoints` (Standard 100, `game-store.ts`:47) und `config.winCondition` (Standard 10, `game-store.ts`:50) sind zwei Zielgrößen für dieselbe Sache. Die Lobby hält sie synchron (`src/app/lobby/page.tsx`:337, :388`), der Store-Default nicht. `RevealPhase` wertet gegen `winCondition` (`:481-482`), `nextRound` gegen `targetPoints` (`game-store.ts`:308`) | siehe links | `grep -rn "targetPoints\|winCondition" src` |
| A12 | `config.roundsToPlay` wird nur in der Lobby mitgeschrieben und nie gelesen | `src/app/lobby/page.tsx`:347, :389`; keine Lesestelle | `grep -rn "roundsToPlay" src` |
| A13 | Die Lobby bietet als Rundenzahlen `[5, 10, 15, 20]` an, obwohl `MIN_ROUNDS_TO_PLAY = 10` gilt und nirgends erzwungen wird | `src/app/lobby/page.tsx`:346-349`; `game-config.ts`:61 | beide gelesen |
| A14 | `Player.isPilot` wird im Spielablauf nicht gelesen; der aktive Spieler kommt aus `turnOrder` | `src/app/game/page.tsx`:103-107`; `grep -rn "isPilot" src` | gemessen |
| A15 | `RoundPhase` beschreibt `scoring` als „Points being awarded, next turn loading"; implementiert ist `scoring` als „Spiel beendet"-Platzhalter | `game-state.ts`:33` gegen `game-store.ts`:388` und `src/app/game/page.tsx`:387-401` | beide gelesen |
| A16 | MEDIA-007 verlangt den Wiedergabestart am definierten Offset. Der Modus `timeline` reicht `startSeconds` **nicht** an den Player weiter — dort beginnt die Wiedergabe am Songanfang statt am Refrain. | `grep -n "startSeconds" src/components/game/modes/*.tsx` — `TimelineMode.tsx` ohne Treffer | gemessen |

### 11.2 Priorisierung

| Priorität | Abweichungen | Warum |
|---|---|---|
| **P1** | A1, A2, A3, A5 | Anti-Spoiler ist ein Produktversprechen (CORE-005). Diese Punkte geben die Lösung preis. |
| **P2** | A6, A7, A8 | Spielregeln sind nicht implementiert oder nicht konsistent. |
| **P3** | A9, A10, A11, A12, A13, A14, A15, A16 | Doppelpflege, tote Konstanten, irreführende Typ-Kommentare. |
| **kein Defekt** | A4 | `vibe-check` gibt die Identität **bewusst** preis — der Modus fragt nach der Stimmung des Songs. Hier ist keine Entscheidung nötig, nur eine Bestätigung (§ 11.5, E1). |

### 11.3 Lokal definierte Zahlen (Abweichung von der Ein-Wahrheit-Regel)

Die folgenden Zahlen stehen **nicht** in `PHOMU_CONFIG`, sondern im Code:

| Zahl | Ort | Kanonischer Ort laut Regel |
|---|---|---|
| `4` (Lyrics-Punkte) | `LyricsMode.tsx`:21 (`LYRICS_POINTS`) | `PHOMU_CONFIG` (fehlt) |
| `2` (Bonusrunde) | `LyricsMode.tsx`:239 | `PHOMU_CONFIG` (fehlt) |
| `3` (Survivor-Punkte) | `SurvivorMode.tsx`:36 | `PHOMU_CONFIG` (fehlt) |
| `2` / `1` (Vibe-Check, mit Cheat) | `VibeCheckMode.tsx`:57 | `PHOMU_CONFIG` (fehlt) |
| `[5, 4, 3, 2]` (Cover-Confusion) | `CoverConfusionMode.tsx`:23 | `PHOMU_CONFIG` (fehlt) |
| `3` (Cover-Confusion-Variante B) | `CoverConfusionMode.tsx`:82 | `PHOMU_CONFIG` (fehlt) |
| `-2` / `-1` (Cheat-Abzüge) | `HintMasterMode.tsx`:62; `TimelineMode.tsx`:219, :234; `SurvivorMode.tsx`:43 | `PHOMU_CONFIG` (fehlt) |
| `30` (Audio-Hinweis-Länge) | `HintMasterMode.tsx`:132` (`startSecs + 30`) | `PHOMU_CONFIG.SPOTIFY_PREVIEW_DURATION` (vorhanden, aber **ungenutzt**) |
| `180` (Audio-Länge ab Stufe 5 / Reveal) | `HintMasterMode.tsx`:132 | `PHOMU_CONFIG` (fehlt) |
| `120` (Vibe-Check-Playback-Ende) | `VibeCheckMode.tsx`:266` | `PHOMU_CONFIG` (fehlt) |
| `10` (Auto-Skip-Countdown) | `MusicPlayer.tsx`:240` | `PHOMU_CONFIG` (fehlt) |
| `6 000 ms` (Start-Timeout) | `MusicPlayer.tsx`:340` | `PHOMU_CONFIG` (fehlt) |
| `5` (Meldungen pro Stunde) | `MusicPlayer.tsx`:177` | `PHOMU_CONFIG` (fehlt) |
| `500 ms` (End-Offset-Prüfung) | `MusicPlayer.tsx`:326` | `PHOMU_CONFIG` (fehlt) |
| `10` (Jahreszahlen bis Entfernen erlaubt) | `TimelineMode.tsx`:193` | `PHOMU_CONFIG` (fehlt) |
| `3` (Start-Jahreszahlen der Timeline) | `TimelineMode.tsx`:141` | `PHOMU_CONFIG` (fehlt) |
| `0` (Punktestand-Untergrenze) und `1` (Mindestpunkte je richtiger Antwort) | `game-store.ts`:457, :468; `game-config.ts`:68 | `PHOMU_CONFIG.DEFAULT_MIN_POINTS_PER_CORRECT` (vorhanden); die Untergrenze `0` ist implizit |
| `[50, 100, 200, 500]` / `[5, 10, 15, 20]` / `[30…240]` (Lobby-Presets) | `src/app/lobby/page.tsx`:336, :346, :356 | `PHOMU_CONFIG` (fehlt) |

### 11.4 Weitere Beobachtungen

| Beobachtung | Fundstelle |
|---|---|
| `gameStartTime` wird persistiert (`:636`) und beim Spielstart gesetzt (`:273`) — nach einem Reload läuft die Zeitbedingung weiter, aber `currentRound` läuft ebenfalls weiter. Beides ist konsistent. | `game-store.ts`:273, :636 |
| `endGame` vergibt `totalXP` als Summe aller Spielerspunkte der Sitzung — bei Team-Modus zählt der Teamscore **nicht** dazu. | `game-store.ts`:380-383 |
| `resetScores` leert `roundHistory`, `playedSongIds` und `timelineYears`, behält aber `totalXP` und `config`. | `game-store.ts`:479-493 |
| `startQuickGame` setzt `currentSongSource = 'qr'` und `roundPhase = 'question'` — der Quick-Play überspringt `drawing`. | `game-store.ts`:496-513 |
| Der gemessene Ist-Stand in [`../adr/ADR-0004-internationalisierungsgrenze.md`](../adr/ADR-0004-internationalisierungsgrenze.md) („4 Dateien mit `useTranslation`") ist überholt: heute sind es **34** Dateien (19 in `src/components`, 15 in `src/app`). Das ADR beschreibt den Stand der i18n-Migration, nicht den heutigen Code. | `grep -rl "useTranslation" src \| wc -l` → 34 |
| `awardPoints` mit einer Team-ID aktualisiert **nur** das Team (nicht dessen Mitglieder); mit einer Spieler-ID werden Spieler **und** Team aktualisiert. | `game-store.ts`:451-476` |

### 11.5 Offene Entscheidungen für den Owner

| # | Entscheidung | Warum sie offen ist |
|---|---|---|
| E1 | **Wie streng wird die Anti-Spoiler-Regel für `lyrics` und `cover-confusion`?** Optionen: (a) Identität zurückziehen — bricht das Modulkonzept; (b) Variante B („Cover oder Original?") abschaffen, weil das Cover-Banner sie vorwegnimmt; (c) Regel als Ausnahme dokumentieren und `ADR-0003` korrigieren. | A1, A2, A5 |
| E2 | **Wird die Zensur auf `cover-confusion` ausgeweitet?** CAT-012 fordert Zensur der Hinweise, CAT-011 fordert, dass Hinweise den Song nicht verraten. | A3 |
| E3 | **Soll `locked-in` implementiert oder aus dem Typ entfernt werden?** Ein echtes `answersLocked` würde die Reveal-Sperre erzwingen, die derzeit nur über Buttons gesteuert wird. | A6 |
| E4 | **Wird Elimination eingeführt?** Das Datenmodell existiert, die Regel nicht. Ohne Regel ist `isEliminated` toter Code. | A7 |
| E5 | **Wie werden Punkte im `shifting`-Modus verteilt?** heute: Teams behalten ihre Punkte, Spieler wechseln das Team → GAME-007 gilt nicht mehr. | A8 |
| E6 | **Wird `src/types/music-provider.ts` zum durchgesetzten Vertrag** (Provider-Adapter nach dem Strategy-Muster umbauen) **oder** als historische Notiz archiviert? | A9 |
| E7 | **Wird das `amazon-music-premium`-Doppel-Playback behoben** (Sperre um `useAmazonPremium` erweitern)? | A10 |
| E8 | **Wird `targetPoints`/`winCondition` zusammengeführt** (auf einen Zielwert)? Der Store-Default 100 vs. 10 ist eine latente Abweichung. | A11 |
| E9 | **Wo liegt die Spiellogik?** `ARCHITECTURE.md` verbietet Spiellogik in `components`; die Modus-Widgets enthalten sie heute. Entweder die Regel anpassen oder die Punktelogik in `src/utils/` verschieben. | § 9.2 |
| E10 | **Werden die lokal definierten Zahlen nach `PHOMU_CONFIG` verschoben?** 20 Fundstellen, s. [§ 11.3](#113-lokal-definierte-zahlen-abweichung-von-der-ein-wahrheit-regel). | § 5.1 |

---

## 12. Änderungsregel für diesen Vertrag

1. **Wer eine Grenze verändert, ändert diesen Vertrag im selben Commit.**
   Ein Pull Request, der eine Regel in § 2–§ 9 verletzt, ohne den Vertrag
   mitzuziehen, ist unvollständig.
2. **Grenzverschiebungen brauchen ein ADR.** Zustandsübergänge (§ 2),
   Anti-Spoiler-Regeln (§ 3), Modusverträge (§ 4), Persistenz (§ 7),
   Provider-Reihenfolge (§ 8) und Modulgrenzen (§ 9) sind nicht
   verhandelbare Nebenwege, sondern Entscheidungen.
3. **Zahlen werden nicht hier eingefroren.** Zahlen stehen in
   `PHOMU_CONFIG`. Dieser Vertrag zitiert sie und zeigt ihre Fundstelle.
4. **Der Code ist die Wahrheit, die Doku folgt ihm** (CORE-009). Stimmt der
   Code nicht mit diesem Vertrag überein, wird entweder der Code geändert
   oder dieser Vertrag — beides mit Begründung und, bei Grenzverschiebungen,
   mit ADR.

---

## 13. Verwandte Dokumente

| Dokument | Bezug |
|---|---|
| [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) | Verbindliche Anforderungen mit IDs (`GAME-*`, `MEDIA-*`, `LOBBY-*`, `CAT-*`) |
| [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) | Schichten, Abhängigkeitsrichtung, Dateigrößenregeln |
| [`../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`](../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md) | Schichten und Abhängigkeitsrichtung |
| [`../adr/ADR-0002-zustand-store-server-und-url.md`](../adr/ADR-0002-zustand-store-server-und-url.md) | Store vs. Server vs. URL |
| [`../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md`](../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md) | Anti-Spoiler und Reveal-Orchestrierung |
| [`../adr/ADR-0004-internationalisierungsgrenze.md`](../adr/ADR-0004-internationalisierungsgrenze.md) | Internationalisierungsgrenze |
| [`../../WHERE_TO_CHANGE.md`](../../WHERE_TO_CHANGE.md) | Thema → Datei → Anleitung |
| [`../../GLOSSARY.md`](../../GLOSSARY.md) | Fachbegriffe (Pilot, Runde, Reveal, …) |
| [`README.md`](README.md) | Index der Entwurfsverträge |
