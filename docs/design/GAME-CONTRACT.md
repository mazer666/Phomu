# Phomu — Game Contract

> **Status:** Binding. Every round, every mode and every music provider in this
> repository is built against this document.
> **Owner:** Chief Architect (`ROLE-02` in [`../AGENTS.md`](../../AGENTS.md)).
> **Changes:** Whoever changes a boundary described here changes this contract
> **in the same commit** and, for boundary shifts, adds an ADR in
> [`../adr/`](../adr/). Format: [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md).
> **Related documents:** [`../REQUIREMENTS.md`](../../REQUIREMENTS.md) (requirement IDs),
> [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) (layers and dependency direction),
> [`../README.md`](../README.md) (index).

This document defines the **interfaces between the building blocks of the game
flow**. It deliberately does *not* define how a round is composed in detail —
that is the job of the component that implements it. Whoever finds that a rule
here prevents a correct implementation is right: the rule is then wrong and must
be changed **here first**.

All statements in this document are read from the code and are backed with
`file:line`. Where the code deviates from this contract, the deviation is
listed in [§ 11](#11-deviations-between-contract-and-code-measured) — not
hidden in the body text.

---

## 1. Scope and canonical sources

### 1.1 What this contract regulates

| Area | Regulated in |
|---|---|
| Round phases and their transitions | [§ 2](#2-the-round-phase-state-machine) |
| Anti-spoiler boundary | [§ 3](#3-the-anti-spoiler-boundary) |
| Contracts of the six game modes | [§ 4](#4-the-six-game-modes) |
| Scoring and time rules | [§ 5](#5-scoring-and-time-rules) |
| Team and round logic | [§ 6](#6-team-and-round-logic) |
| Persistence rules | [§ 7](#7-persistence-rules) |
| Music providers | [§ 8](#8-music-provider-contracts) |
| Module boundaries for `src/components/**` | [§ 9](#9-module-boundaries) |
| Self-test of the contract | [§ 10](#10-how-the-contract-is-checked) |

### 1.2 Canonical sources (do not invent numbers here)

| Question | Canonical source |
|---|---|
| Which numbers does the game obey? | `PHOMU_CONFIG` in [`../../src/config/game-config.ts`](../../src/config/game-config.ts):52-326 |
| Which names are censored? | `SPOILER_CONFIG` in [`../../src/config/spoiler-config.ts`](../../src/config/spoiler-config.ts):8-29 |
| Which behavioural rule applies? | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) (IDs `GAME-*`, `MEDIA-*`, `LOBBY-*`, `CAT-*`) |
| Which file may call what? | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) § 2 |
| Which phase is active when? | `roundPhase` in [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts) |

> **Rule:** Numbers that are not in `PHOMU_CONFIG` are defined locally in the
> code. This list is complete in
> [§ 11.3](#113-locally-defined-numbers-deviation-from-the-single-truth-rule).
> Whoever moves a number moves it in `PHOMU_CONFIG` — not in this document.

---

## 2. The round phase state machine

### 2.1 The five phases

The phases are defined in `RoundPhase`
([`../../src/types/game-state.ts`](../../src/types/game-state.ts):28-33). The
name of the phase is the contract; comments in the type definition are
explanatory and not normative.

| Round phase | Meaning according to the type definition | Who sets it | Transition to |
|---|---|---|---|
| `drawing` | A card is being drawn | `createInitialState` (`game-store.ts`:165), `startGame` (`:267`), `nextRound` (`:367`), `skipBrokenSong` (`:410`, `:415`) | `question` (via `drawSong`) |
| `question` | The question stands, players think | `drawSong` (`:398`), `startQuickGame` (`:504`) | `reveal` (via `advancePhase('reveal')`) |
| `locked-in` | All answers submitted, waiting for the reveal | **nobody** — the value exists but is never set | — |
| `reveal` | The answer is revealed, the music plays | `advancePhase('reveal')` (`game-store.ts`:439-441) | `drawing` (via `nextRound`) or `scoring` (via `endGame`) |
| `scoring` | Points are awarded, the next turn loads | `endGame` (`game-store.ts`:388) | End (redirect to `/game-over`, `src/app/game/page.tsx`:96-100) |

### 2.2 State machine

```text
                          ┌──────────────────────────────────────────┐
                          │                                          │
                          ▼                                          │
                 ┌─────────────┐                                    │
   initSession ─▶│   drawing   │◀── nextRound()      skipBrokenSong()│
   startGame()  │ (drawing card)│    (game-store.ts:365-375)  (:405-416)
                 └──────┬──────┘                                    │
                        │ drawSong(song)                            │
                        │ (game-store.ts:394-402)                   │
                        ▼                                          │
                 ┌─────────────┐                                    │
                 │   question  │──── handleTimeUp() ────┐           │
                 │ (question)  │    (page.tsx:232-236)   │           │
                 └──────┬──────┘                        │           │
                        │ advancePhase('reveal')        │           │
                        │ (page.tsx:164-166)            │           │
                        │ ─────────────────────────────┘           │
                        ▼                                          │
                 ┌─────────────┐                                    │
                 │    reveal   │──── endGame() ──▶ ┌──────────────┐  │
                 │ (the reveal)│   (game-store.ts:  │   scoring    │──┼──▶ /game-over
                 └──────┬──────┘    :379-391)       │ (end of game)│  │
                        │                           └──────────────┘  │
                        └─────────────────────────────────────────────┘

   'locked-in' is typed (game-state.ts:31) but is not entered by ANY
   code path (advancePhase is called exclusively with 'reveal':
   src/app/game/page.tsx:165 and :234).
```

### 2.3 Transition table (who triggers what)

| From | To | Trigger | Code evidence | Requirement |
|---|---|---|---|---|
| `drawing` | `question` | The pilot draws a card (`DrawingPhase` → `onCardDrawn`) | `game-store.ts`:394-402; `src/app/game/page.tsx`:118-123; `src/components/game/DrawingPhase.tsx`:123-146 | GAME-003 |
| `drawing` | `drawing` | Broken song, random source → `autoDrawIntent = true` → automatic draw | `game-store.ts`:415; `DrawingPhase.tsx`:149-157 | GAME-013 |
| `drawing` | `drawing` | Broken song, QR source → phase change only, **no** automatic draw | `game-store.ts`:408-412 | GAME-013 |
| `question` | `reveal` | The `"Alle fertig → Reveal"` (everyone's done → reveal) button (only `survivor`, `vibe-check`, `hint-master`, `timeline`) | `src/components/game/QuestionPhase.tsx`:34-40, :93-100 | GAME-002 |
| `question` | `reveal` | Mode-specific completion (`lyrics`, `cover-confusion`) | `LyricsMode.tsx`:95; `CoverConfusionMode.tsx`:288 | GAME-002 |
| `question` | `reveal` | Expiry of the question round (`timeLimitSeconds`) | `src/app/game/page.tsx`:232-236, :317 | UI-010 |
| `reveal` | `drawing` | `"Nächste Runde"` (next round) | `game-store.ts`:365-375; `src/app/game/page.tsx`:182-193 | GAME-005 |
| `reveal` | `scoring` | `"Zum Gewinner-Screen!"` (to the winner screen) resp. `endGame()` | `game-store.ts`:379-391; `src/app/game/page.tsx`:218-221 | GAME-008 |
| any | — | `"Runde verwerfen & neue Frage"` (discard the round & draw a new question) (Power User) → `nextRound()` | `src/app/game/page.tsx`:213-215; `RevealPhase.tsx`:626-631 | GAME-040 |

### 2.4 Data availability per phase

| Data field (`GameState`) | `drawing` | `question` | `reveal` | `scoring` |
|---|---|---|---|---|
| `currentSong` | `null` — QR-skip exception: stays set, but is not rendered | set | set | **stays set** (only `nextRound` clears it to `null`, `game-store.ts`:369) |
| `currentMode` | set | set | set | set |
| `currentAnswers` | empty | being filled | filled | **stays filled** (only `nextRound` clears it, `:370`) |
| `timelineYears` | visible (years of the already revealed rounds) | visible | visible | visible — cleared **only** by `resetScores` (`:491`) |
| `playedSongIds` | visible | visible | visible | visible |
| `roundHistory` | grows only at the round change (`:331-343`) | unchanged | unchanged | unchanged |
| `winnerId` | `undefined` | `undefined` | `undefined` — the winner display in the reveal computes from the scores (RevealPhase.tsx`:480-483`) | set **only** for the points condition (`:310`); with `rounds`/`time` it stays `undefined` |

Evidence for the rendering rule: `src/app/game/page.tsx`:408-411 renders
`QuestionPhase`/`RevealPhase` only if `currentSong !== null` **and**
the phase is `question | locked-in | reveal`. In `drawing` the song is
therefore not rendered, even if the field is filled.

---

## 3. The anti-spoiler boundary

> **Product promise:** Anti-spoiler is not a comfort feature but a requirement
> (`CORE-005`, `MEDIA-015`). This section is the **verifiable** version of that
> promise.

### 3.1 Principle

The song record (`PhomuSong`, [`../../src/types/song.ts`](../../src/types/song.ts):42-165)
contains the complete solution: `title`, `artist`, `year`, `hints`, `lyrics`,
`mood`, `isOneHitWonder`, `links`. The anti-spoiler rule reads:

> **In the phase `question` the solution must not be *visible*.**
> Visible means: readable by a human in the rendered DOM of the page `/game`
> and of the page `/projector` — not even by bypassing the blur filter.

This wording is deliberately chosen because the code keeps the song record
completely on the client at answer time. A stronger wording ("the solution
must not be present in the DOM") is **not satisfiable today** without
rebuilding the client state; it is recorded as an open decision in
[§ 11.1](#111-measured-deviations).

### 3.2 What may be visible in which phase

| Mode | Visible in `question` | Must stay hidden | Implementation | Status |
|---|---|---|---|---|
| `timeline` | Slots, point score, cheat hint | `title`, `artist`, `year` of the current song | `TimelineMode.tsx`:481-537 renders title/artist/year **only** at `isRevealed`; `MusicPlayer` with `blurred={!isRevealed}` (`:281`) | ✅ satisfied |
| `hint-master` | up to 5 hints (censored), level/point display | `title`, `artist` | `HintMasterMode.tsx`:156 uses `censorHint`; `MusicPlayer` `blurred={!isRevealed}` (`:133`) | ✅ satisfied (with the roughness of the censorship, see § 3.4) |
| `lyrics` | 4 lines, **as well as `artist` and `title`** | `artist`, `title` | `LyricsMode.tsx`:132-133 renders `{song.artist}` and `{song.title}` **unconditionally** | ❌ **violated** — see [§ 11.1](#111-measured-deviations) |
| `vibe-check` | `artist`, `title`, decade, mood options | — (the identity is part of the question) | `VibeCheckMode.tsx`:116-118 renders the identity; `MusicPlayer` `blurred={false}` (`:99`) | ⚠️ **deliberate exception**, see [§ 11.1](#111-measured-deviations) |
| `survivor` | `"???"` as the artist, decade/genre only after the answer | `artist`, `title` | `SurvivorMode.tsx`:97-114 hides the artist; `MusicPlayer` `blurred={!answered && !cheatUsed}` (`:69`) | ✅ satisfied |
| `cover-confusion` | Cover banner, uncensored hints, multiple-choice options | `title`, `artist` (except as an option in the choice phase) | `CoverConfusionMode.tsx`:116-120 renders `"COVER-VERSION AKTIV"`; `:126-140` renders hints **without** `censorHint` | ❌ **violated** — see [§ 11.1](#111-measured-deviations) |

### 3.3 Persisted state

In addition to the DOM the following applies: in `localStorage` under the key
`phomu-game-state` the song record must **not** be present. This is satisfied —
`partialize` ( [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts):621-637)
does **not** contain `currentSong`. Details in [§ 7](#7-persistence-rules).

### 3.4 Censoring rule for hints

`censorHint` ([`../../src/utils/censor-utils.ts`](../../src/utils/censor-utils.ts):11-60)
replaces every token of `artist` and `title` in a hint with `[XXX]`.
Thresholds from `SPOILER_CONFIG`
([`../../src/config/spoiler-config.ts`](../../src/config/spoiler-config.ts)):

| Threshold | Value | Effect |
|---|---|---|
| `MIN_LENGTH` | 4 | Tokens shorter than 4 characters are **not** censored … |
| `EXCEPTIONS` | 45 entries | … unless they are listed here (e.g. `BTS`, `U2`, `2Pac`) |
| `IGNORE_WORDS` | 21 entries | Filler words (`THE`, `AND`, `DER`, `DIE` …) are never censored |

The censorship is **whitelist-based on short names** and therefore has gaps:
an artist name with ≥ 4 characters is censored only if it occurs **word by
word** in the hint (`censor-utils.ts`:26-37). An artist who is written with
special characters in the hint (`The` Artist) is not censored. That is a known
roughness, not a promise.

### 3.5 Overlay rule (player)

`MusicPlayer` ([`../../src/components/game/MusicPlayer.tsx`](../../src/components/game/MusicPlayer.tsx)):28)
knows the prop `blurred`. If `blurred = true`, the following applies:

| Element | Rule | Evidence location |
|---|---|---|
| Wrapper | `blur-[60px] scale-125 opacity-50` + `pointer-events-none` | `:424` |
| Overlay | `bg-[#0a0a0c]/40 backdrop-blur-[60px]`, z-index 20 | `:438` |
| Reveal gesture | Drag to the right > 150 px → `videoRevealed = true` | `:466-476` |
| Hide again | The `"Verbergen"` (hide) button sets `videoRevealed = false` | `:538-545` |

`MusicPlayer` renders **neither `songTitle` nor `songArtist`** in the JSX.
Both values are used exclusively for the report payload (`:198-214`).
That is the technical basis for the music title not additionally
being present in the React tree.

---

## 4. The six game modes

The six modes are typed in `GameMode`
([`../../src/config/game-config.ts`](../../src/config/game-config.ts):12-18)
and enumerated in `ALL_GAME_MODES` (`:300-307`). The mapping
mode → component is in
[`../../src/components/game/QuestionPhase.tsx`](../../src/components/game/QuestionPhase.tsx):61-83.

**Shared signature of all mode widgets:**

```ts
onAnswer: (isCorrect: boolean, pointsAwarded: number, answeredInSeconds?: number) => void
onReveal?: () => void
```

`onAnswer` does **not** award points itself. Scoring happens centrally in
`handleAnswered`
([`../../src/app/game/page.tsx`](../../src/app/game/page.tsx):126-161); there
the time decay applies, and `awardPoints` is called **only** if
`isCorrect && pointsAwarded > 0` (`:147-149`).

### 4.1 `timeline` — Chronological Timeline

Source: [`../../src/components/game/modes/TimelineMode.tsx`](../../src/components/game/modes/TimelineMode.tsx)

| Aspect | Rule | Evidence location |
|---|---|---|
| **Mode** | `timeline` | `game-config.ts`:13 |
| **Input** | Click on a slot; keyboard `1`–`n`, arrow keys, `Enter`/`space` | `:425-552`, `:242-255` |
| **Validation** | valid is the canonical slot (first index with `song.year < years[i]`) **plus** in the case of a duplicate year the slot before and after | `getValidSlots` `:93-115`, `canonicalSlot` `:118-123` |
| **Result** | correct → the year is added; duplicate → removed automatically; from more than 10 years on the player may optionally remove one number | `:186-196`, `:209-212` |
| **Scoring** | `Math.min(timelineYears.length + 1, config.timelineMaxPoints)`; `DEFAULT_TIMELINE_MAX_POINTS = 5` | `:154`; `game-config.ts`:63 |
| **Deductions** | Decade hint −2 (`:219`), joker −1 (`:234`); floor 0 through `awardPoints` | `game-store.ts`:451-476 |
| **Error cases** | without a selection `"AUFLÖSEN"` (reveal) is disabled (`:559`); `handleReveal` aborts without a selection (`:175`); the joker without a wrong slot deducts no points (`:229`); cheats do not run without `currentPlayerId` (`:215`, `:223`) | see left |
| **Requirements** | GAME-016 to GAME-022, GAME-039 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.2 `hint-master` — Hint-Master

Source: [`../../src/components/game/modes/HintMasterMode.tsx`](../../src/components/game/modes/HintMasterMode.tsx)

| Aspect | Rule | Evidence location |
|---|---|---|
| **Mode** | `hint-master` | `game-config.ts`:14 |
| **Input** | `"Nächster Hinweis"` (next hint) (level 1…5), optionally `"Musik-Cheat"` (music cheat) (level 1 only), `"LÖSUNG ZEIGEN"` (show answer), then self-assessment: `"Beides"` (both) / `"Nur Künstler"` (artist only) / `"Nur Titel"` (title only) / `"Nichts"` (nothing) | `:166-190`, `:206-241` |
| **Validation** | `handleFinalDecision` ignores double clicks (`if (done) return`); `handleCheat` only if `!showMusic && !cheatUsed && !isRevealed && currentPlayerId` | `:48`, `:58` |
| **Result** | `isCorrect = knew !== 'none'` | `:49` |
| **Scoring** | Level points `HINT_MASTER_POINTS = [5, 4, 3, 2, 1]`; `"Beides"` (both) → full points; `"Nur Künstler"` (artist only)/`"Nur Titel"` (title only) → `Math.ceil(points / 2)`; `"Nichts"` (nothing) → 0 | `game-config.ts`:310; `:36`, `:50` |
| **Deductions** | Music cheat −2 points | `:62` |
| **Error cases** | `maxHints = song.hints.length` — the type demands 5 hints (`song.ts`:85), the catalogue may deliver fewer; music starts automatically from level 2; hints are censored | `:35`, `:43`, `:156` |
| **Requirements** | GAME-023 to GAME-026, GAME-037, CAT-011, CAT-012 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.3 `lyrics` — Lyrics Labyrinth

Source: [`../../src/components/game/modes/LyricsMode.tsx`](../../src/components/game/modes/LyricsMode.tsx)

| Aspect | Rule | Evidence location |
|---|---|---|
| **Mode** | `lyrics` | `game-config.ts`:15 |
| **Input** | mark one of four lines, then `"Bestätigen & Auflösen"` (confirm & reveal) | `:141-186` |
| **Validation** | `handleConfirm` aborts if nothing is selected or the reveal has already happened | `:90` |
| **Result** | `isCorrect = options[selected]?.isFake` — 3 real lines plus 1 randomly chosen fake line, mixed and stable per song | `:68-83`, `:92` |
| **Scoring** | `LYRICS_POINTS = 4` if correct, otherwise 0 | `:21`, `:94` |
| **Error cases** | `song.lyrics === null` → **bonus round**: `"Ich kenn's!"` (I know it!) → 2 points, `"Kein Schimmer"` (no clue) → 0 points; the catalogue filter does not guarantee lyrics (hard fallback) | `:42-44`, `:236-251`; [`../../src/utils/song-picker.ts`](../../src/utils/song-picker.ts):58-70 |
| **Anti-spoiler** | `artist` and `title` are rendered from the start — rule violated | `:132-133` |
| **Requirements** | GAME-027 to GAME-029, GAME-043 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.4 `vibe-check` — Vibe-Check

Source: [`../../src/components/game/modes/VibeCheckMode.tsx`](../../src/components/game/modes/VibeCheckMode.tsx)

| Aspect | Rule | Evidence location |
|---|---|---|
| **Mode** | `vibe-check` | `game-config.ts`:16 |
| **Input** | choose a mood (6 options, 3 after the cheat) | `:158-210` |
| **Validation** | `handleSelect` ignores clicks after the answer (`if (answered) return`); `isCorrect = song.mood.includes(mood)` | `:53`, `:54` |
| **Result** | 6 displayed options = 5 wrong + `song.mood[0]`; cheat = 2 wrong + `song.mood[0]` | `:62-71` |
| **Scoring** | 2 points if correct, 1 point after the cheat; 0 if wrong | `:57` |
| **Error cases** | The cheat halves the options **and** lowers the win to max. +1 (button hidden with `config.noCheatMode`); `ALL_MOODS` holds 12 candidates, 6 are displayed | `:9`, `:21-34`, `:133` |
| **Anti-spoiler** | `artist`, `title` and the decade are part of the question — the identity is deliberately disclosed, the music **unblurred** | `:116-118`, `:99` |
| **Requirements** | GAME-030, GAME-031, GAME-037 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.5 `survivor` — Survivor

Source: [`../../src/components/game/modes/SurvivorMode.tsx`](../../src/components/game/modes/SurvivorMode.tsx)

| Aspect | Rule | Evidence location |
|---|---|---|
| **Mode** | `survivor` | `game-config.ts`:17 |
| **Input** | `"Ja"` (yes) (one-hit wonder) / `"Nein"` (no) (mainstay); optional cheat `"Artist enthüllen"` (reveal the artist) | `:128-163` |
| **Validation** | `handleChoice` ignores clicks after the answer; `isCorrect = guessedOneHit === song.isOneHitWonder` | `:31`, `:32` |
| **Result** | 3 points if correct, 0 if wrong | `:36` |
| **Deductions** | Cheat −1 point, discloses the artist | `:43`, `:97-114` |
| **Error cases** | Cheat only if `!cheatUsed && !answered && currentPlayerId`; cheat button hidden with `config.noCheatMode` | `:40`, `:153` |
| **Anti-spoiler** | Artist as `"???"` until the answer or the cheat; `MusicPlayer` `blurred={!answered && !cheatUsed}` | `:97-114`, `:69` |
| **Requirements** | GAME-032, GAME-033, GAME-037 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

### 4.6 `cover-confusion` — Cover Confusion

Source: [`../../src/components/game/modes/CoverConfusionMode.tsx`](../../src/components/game/modes/CoverConfusionMode.tsx)

| Aspect | Rule | Evidence location |
|---|---|---|
| **Mode** | `cover-confusion` | `game-config.ts`:18 |
| **Input** | Variant A ("who-is-it", 50 %): `"Ich kenne ihn!"` (I know it!) or hint 1/2, then multiple choice with 3 artists. Variant B ("original-or-cover", 50 %): `"COVER"` / `"ORIGINAL"` | `:39`, `:147-192`, `:232-251` |
| **Validation** | `handleChoice` compares `artist === song.artist`; `handleChoiceVariation` compares `guessCover === !!song.links.coverLink`; own phase machine `listening → self-assess / choice → done` | `:71`, `:79`, `:25` |
| **Result** | Variant A: points per number of hints; Variant B: fixed 3 points | `:63-84` |
| **Scoring** | `POINTS_BY_HINTS = [5, 4, 3, 2]`; Variant B always 3 | `:23`, `:82` |
| **Error cases** | at most 3 hints; the 3 choice artists come from the **entire catalogue** (at least 3 different artists required); playback via `song.links.coverLink || song.links.youtube`; with `coverLink` set the YouTube alternatives are deliberately **not** offered | `:53-61`, `:45-51`, `:42`, `:104-108` |
| **Anti-spoiler** | `"COVER-VERSION AKTIV"` (cover version active) already reveals the answer of variant B in `question`; the hints are **not** censored (unlike `hint-master`) | `:116-120`, `:139` |
| **Requirements** | GAME-034 to GAME-036, CAT-011, CAT-012, CAT-014 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |

---

## 5. Scoring and time rules

### 5.1 Canonical source

**All** configurable game numbers are in `PHOMU_CONFIG`
([`../../src/config/game-config.ts`](../../src/config/game-config.ts):52-326).
Excerpt of the values relevant to the game flow:

| Key | Value | Line | Used in |
|---|---|---|---|
| `DEFAULT_WIN_SCORE` | 10 | `:54` | `game-store.ts`:50 (`config.winCondition`) |
| `MAX_PLAYERS` | 24 | `:55` | `game-store.ts`:210; `src/app/lobby/page.tsx`:122 |
| `MIN_PLAYERS` | 1 | `:56` | `src/app/lobby/page.tsx`:114 |
| `DEFAULT_ROUNDS_TO_PLAY` | 10 | `:60` | `game-store.ts`:53 (`config.roundsToPlay`) |
| `MIN_ROUNDS_TO_PLAY` | 10 | `:61` | **nowhere** (see [§ 11.3](#113-locally-defined-numbers-deviation-from-the-single-truth-rule)) |
| `MAX_ROUNDS_TO_PLAY` | 30 | `:62` | **nowhere** |
| `DEFAULT_TIMELINE_MAX_POINTS` | 5 | `:63` | `game-store.ts`:54; `TimelineMode.tsx`:154 |
| `DEFAULT_TIME_DECAY_ENABLED` | `false` | `:64` | `game-store.ts`:55 |
| `DEFAULT_TIME_DECAY_GRACE_SECONDS` | 5 | `:65` | `game-store.ts`:56 |
| `DEFAULT_TIME_DECAY_STEP_SECONDS` | 5 | `:66` | `game-store.ts`:57 |
| `DEFAULT_TIME_DECAY_STEP_POINTS` | 1 | `:67` | `game-store.ts`:58 |
| `DEFAULT_MIN_POINTS_PER_CORRECT` | 1 | `:68` | `game-store.ts`:59 |
| `DEFAULT_NO_CHEAT_MODE` | `false` | `:72` | `game-store.ts`:64 |
| `COUNTDOWN_SECONDS` | 3 | `:81` | **nowhere** |
| `SPOTIFY_PREVIEW_DURATION` | 30 | `:82` | **nowhere** |
| `HINT_MASTER_POINTS` | `[5, 4, 3, 2, 1]` | `:310` | `HintMasterMode.tsx`:36, `:171` |
| `DEFAULT_UNLOCK_METHOD` | `'swipe'` | `:313` | **nowhere** |
| `FORCE_REMOVE_DUPLICATE_YEARS` | `true` | `:316` | **nowhere** |

### 5.2 Scoring (central)

```text
Mode returns (isCorrect, basePoints, answeredInSeconds?)
        │
        ▼  src/app/game/page.tsx:126-161  (handleAnswered)
Time decay (only if isCorrect && timeDecayEnabled && answeredInSeconds is set):
   overtime     = max(0, answeredInSeconds - timeDecayGraceSeconds)
   decaySteps   = floor(overtime / max(1, timeDecayStepSeconds))
   decayPoints  = decaySteps * timeDecayStepPoints
   pointsAwarded = max(minPointsPerCorrect, basePoints - decayPoints)
        │
        ▼
submitAnswer({ playerId: pilotId, answer: 'correct'|'incorrect',
                isCorrect, pointsAwarded, answeredInSeconds })
        │
        ▼  only if isCorrect && pointsAwarded > 0
awardPoints(pilotId, pointsAwarded)
   → Player score = max(0, score + points)
   → Team score   = max(0, score + points)   (if teamId is set, GAME-007)
```

Evidence: `src/app/game/page.tsx`:131-149; `game-store.ts`:444-476.

### 5.3 Time rules

| Rule | Value / behaviour | Evidence location | Requirement |
|---|---|---|---|
| Question round timeout | `config.timeLimitSeconds` (default `null` = no limit); the timer runs **only** in the phase `question` | `game-state.ts`:66; `src/app/game/page.tsx`:317 | UI-010 |
| On timeout | The phase changes to `reveal` — the round is **not** scored as wrong, there are no points | `src/app/game/page.tsx`:232-236 | GAME-002 |
| Time decay (penalty) | optional, off by default; acts only on a correct answer **and** an existing answer time | `src/app/game/page.tsx`:131-136; `game-config.ts`:64-68 | GAME-038 |
| Answer time measured | **only** in the mode `timeline` (`answeredInSeconds` is only passed there) | `TimelineMode.tsx`:178 | GAME-039 |
| Countdown before the music starts | 3 s — present as a constant, but **not used** | `game-config.ts`:81 | see [§ 11.3](#113-locally-defined-numbers-deviation-from-the-single-truth-rule) |

---

## 6. Team and round logic

### 6.1 Turn order

| Rule | Implementation | Evidence location | Requirement |
|---|---|---|---|
| `turnOrder` contains the player IDs in individual mode, the team IDs in team mode | `startGame` | `game-store.ts`:258-261 | GAME-004 |
| `currentTurnIndex` advances cyclically | `(currentTurnIndex + 1) % turnOrder.length` | `game-store.ts`:345-347 | GAME-004 |
| The active player is **derived from `turnOrder`**, not from `Player.isPilot` | `pilotId = turnOrder[currentTurnIndex]` | `src/app/game/page.tsx`:103-107 | GAME-004 |
| `Player.isPilot` (lobby role, first player) is **not** read in the game flow | only `src/app/lobby/page.tsx`:236 and `src/components/lobby/PlayerCard.tsx`:59 read it | `game-store.ts`:219, :236-239 | see [§ 11.4](#114-further-observations) |

### 6.2 Team modes

`TeamMode` = `'individual' | 'fixed' | 'shifting'`
([`../../src/types/player.ts`](../../src/types/player.ts):9-12;
[`../../src/config/game-config.ts`](../../src/config/game-config.ts):36-39).

| Mode | Rule | Evidence location | Requirement |
|---|---|---|---|
| `individual` | every team for itself; `turnOrder` = player IDs | `game-store.ts`:259-260 | LOBBY-006 |
| `fixed` | fixed teams for the whole game; `turnOrder` = team IDs | `game-store.ts`:261 | LOBBY-006 |
| `shifting` | at every round change the players are redistributed to the teams (sorting via `Math.random()`, round-robin) — **only** if `teams.length >= 2` | `game-store.ts`:349-363 | LOBBY-006 |

> **Rule for `shifting`:** The redistribution changes **only** the `playerIds`
> of the teams. The scores of the teams **and** of the players are **not**
> adjusted (`game-store.ts`:354 sets `playerIds: []` and leaves
> `score` untouched). The relation "team points = sum of the
> member points" (GAME-007) therefore no longer holds from the first shifting
> **onwards**. Before the first shifting they are in sync, because `awardPoints`
> increases both sides at the same time (`game-store.ts`:466-473).

### 6.3 Round log

| Rule | Implementation | Evidence location | Requirement |
|---|---|---|---|
| A round is logged **before** the next one | `roundHistory` | `game-store.ts`:331-343 | GAME-005 |
| A round without a drawn song is **not** logged | `currentSong !== null` as the condition | `game-store.ts`:332 | GAME-005 |
| Log record | `{ roundNumber, mode, song, answers, completedAt }` | `game-state.ts`:130-136; `game-store.ts`:335-341 | GAME-005 |

### 6.4 Win conditions

`GameEndingCondition` = `'points' | 'rounds' | 'time'`
([`../../src/types/game-state.ts`](../../src/types/game-state.ts):35). Exactly one
condition is active (`config.endingCondition`, default `'rounds'` in
`game-store.ts`:46).

The check happens **exclusively at the end of a rotation**
(`isEndOfRotation = currentTurnIndex === turnOrder.length - 1`,
`game-store.ts`:300):

| Condition | Abort | `winnerId` | Evidence location | Requirement |
|---|---|---|---|---|
| `points` | `maxScore >= config.targetPoints` | ID of the leading player resp. team | `game-store.ts`:303-311 | GAME-008, GAME-009 |
| `rounds` | `currentRound >= config.targetRounds × (Individual ? players.length : teams.length)` | **not set** (`undefined`) | `game-store.ts`:312-316 | GAME-008, GAME-010 |
| `time` | `elapsed >= config.targetTimeMinutes` since `gameStartTime` | **not set** | `game-store.ts`:317-322 | GAME-008, GAME-011 |

> **Consequence:** With `rounds` and `time` the `winnerId` stays empty. The
> winner is determined only in the reveal (`RevealPhase.tsx`:486-495, team-based
> if `teams.length > 0`) resp. in the game-over screen
> (`src/app/game-over/page.tsx`:54,
> `players.find(p => p.id === winnerId) ?? sorted[0]`). That is the
> contractually valid path, not an error.

`targetRounds` is **per player** (individual) resp. **per team** (team mode).
The total number of turns is `targetRounds × number of players/teams` — identical
in the progress display (`src/app/game/page.tsx`:269-271).

### 6.5 Elimination

| Field | Meaning according to the type | Actual state in the code |
|---|---|---|
| `Player.isEliminated` | "Whether this player has been eliminated from the game." ([`../../src/types/player.ts`](../../src/types/player.ts):31-36) | Set to `false` on creation (`game-store.ts`:216) and **never** set to `true`. No code path eliminates. |
| `Player.isSpectator` | "A player becomes a spectator when eliminated, or can join as spectator directly." (`player.ts`:38-43) | Set to `false` on creation (`game-store.ts`:217) and **never** set to `true`. No code path sets it. |

> **Contractual situation:** Elimination and spectator status are a **data model
> without a rule**. There is no elimination logic — neither after rounds nor
> after points. Whoever introduces elimination must change this contract (ADR).

---

## 7. Persistence rules

### 7.1 What is stored

`persist` with `name: 'phomu-game-state'`
([`../../src/stores/game-store.ts`](../../src/stores/game-store.ts):619) and
`partialize` (`:621-637`) writes exactly these fields into `localStorage`:

| Field | Persisted | Why |
|---|---|---|
| `players` | ✅ | Lobby and score survive a reload (LOBBY-021) |
| `teams` | ✅ | ditto |
| `config` | ✅ | The lobby configuration is retained (LOBBY-021) |
| `sessionId` | ✅ | Identity of the session |
| `totalXP` | ✅ | Progress across sessions |
| `preferredPlayer`, `preferredMusicProvider` | ✅ | The provider choice is retained (MEDIA-002) |
| `musicEnabled`, `musicVolume`, `sfxEnabled`, `sfxVolume` | ✅ | Audio settings (MEDIA-009) |
| `currentRound` | ✅ | A reload does not lead back into the lobby |
| `isGameOver` | ✅ | The game-over state stays recognisable |
| `timelineYears` | ✅ | The shared timeline survives the reload (GAME-017, GAME-019) |
| `gameStartTime` | ✅ | The time condition keeps counting from the start of the game (GAME-011) |

### 7.2 What is **not** stored

| Field | Persisted | Rationale |
|---|---|---|
| `currentSong` | ❌ | **Anti-spoiler:** The song record contains the solution (title, artist, hints, lyrics). It must not lie on the disk. |
| `currentAnswers` | ❌ | Answers are round ephemera; after the round change they are logged in `roundHistory` (GAME-005). |
| `roundPhase` | ❌ | After a reload the state is `drawing` (`createInitialState`, `game-store.ts`:165) — the pilot draws again. |
| `currentMode` | ❌ | Newly randomised per round (`pickRandomMode`, `:188-191`) |
| `playedSongIds` | ❌ | Rebuilt after the reload; the price: already played songs can be drawn again. |
| `roundHistory` | ❌ | Only volatile; no replay implemented. |
| `turnOrder`, `currentTurnIndex` | ❌ | Rebuilt in `startGame` (`:258-262`). |
| `winnerId` | ❌ | Set at the end of the game and derived from the score in `/game-over`. |
| `currentSongSource`, `autoDrawIntent` | ❌ | Control flags of the running round. |

### 7.3 Why this matters for the anti-spoiler protection

1. **No song on the disk.** `currentSong` is not in `partialize`.
   A look into `localStorage` does not reveal the solution of the running
   round.
2. **No reveal state on the disk.** `roundPhase` is not stored.
   After a reload the app cannot end up in an already revealed state.
3. **The reload is a safety boundary, not a bug.** After a reload
   `currentRound > 0` (persisted), but `currentSong = null` and
   `roundPhase = 'drawing'`. The page `/game` therefore renders the
   `DrawingPhase` — the pilot draws a new card. **Known
   side effect:** The points already awarded are retained (the
   scoring happens immediately in `handleAnswered`), while the
   corresponding answer is not in `currentAnswers` and the round is therefore
   not logged in `roundHistory` (GAME-005 requires the
   logging only with `currentSong !== null`).

---

## 8. Music provider contracts

### 8.1 Provider IDs

`MusicProvider`
([`../../src/config/game-config.ts`](../../src/config/game-config.ts):20-26):
`'youtube' | 'spotify-free' | 'spotify-premium' | 'amazon-music' |
'amazon-music-premium' | 'apple-music'`.
The active provider is in `GameState.preferredMusicProvider` and is
**persisted** (MEDIA-002).

### 8.2 The declared provider contract

[`../../src/types/music-provider.ts`](../../src/types/music-provider.ts):34-93
defines `MusicProviderInterface` with `initialize`, `isAvailable`, `play`,
`pause`, `stop`, `seek`, `getState`, `onStateChange`, `renderEmbed`, `destroy`.

> **Measured finding:** This contract is **implemented nowhere and used
> nowhere**. `grep -rn "MusicProviderInterface" src` finds only the
> definition. `MusicPlayer` instead works directly with the YouTube
> IFrame API, `<audio>` elements and `<iframe>` embeds and holds its
> own local state type `'loading' | 'playing' | 'error' | 'paused'`
> (`MusicPlayer.tsx`:140) instead of `PlayerState` from `music-provider.ts`:18-25.
> `ProviderAvailability` (`music-provider.ts`:99-107) furthermore knows only 5
> providers — `amazon-music-premium` is missing.
> **Consequence:** `src/types/music-provider.ts` is today a **document,
> not an enforced contract**. Binding is § 8.3–§ 8.6.

### 8.3 Playback order

```text
1. Spotify Premium  → only if preferredMusicProvider === 'spotify-premium'
                      AND song.links.spotify yields a track ID
                      → <iframe> open.spotify.com/embed/track/{id}
                      MusicPlayer.tsx:167, :559-571

2. Spotify Free     → only if preferredMusicProvider === 'spotify-free'
                      AND song.links.spotifyFreePreview is set
                      → <audio src={spotifyFreePreview}>
                      MusicPlayer.tsx:168, :573-583

3. Amazon Prime     → only if preferredMusicProvider === 'amazon-music'
                      AND song.links.amazonPrimePreview is set
                      → <audio src={amazonPrimePreview}>
                      MusicPlayer.tsx:169, :585-605

4. Amazon Premium   → only if preferredMusicProvider === 'amazon-music-premium'
                      AND an Amazon ASIN can be extracted
                      → <iframe> music.amazon.com/embed/track/{asin}
                      MusicPlayer.tsx:170, :607-619

5. YouTube          → default and fallback level
                      Fallback chain: [links.youtube, ...links.youtubeAlternatives]
                      MusicPlayer.tsx:149-155, :284-370
```

**Fallback behaviour:** If the selected provider fails because the
corresponding link is missing, **no** error is reported — the next
available path is simply chosen. If the YouTube link is missing as well, the
player shows `"Kein Video verfügbar"` (no video available)
(`MusicPlayer.tsx`:417-419, MEDIA-016).
`'apple-music'` is declared in `MusicProvider`, but in the player it has **no
branch** — the selection effectively leads to the YouTube path there.

**Provider display:** The active provider status is shown as a badge
(`MusicPlayer.tsx`:547-557, MEDIA-018).

### 8.4 Start, end, volume

| Rule | Implementation | Evidence location | Requirement |
|---|---|---|---|
| Start offset | `playerVars.start = startSeconds`; `startSeconds` comes from `song.previewTimestamp?.start ?? 0`. **Not all modes pass it on:** `cover-confusion` (`:113`), `hint-master` (`:131`), `lyrics` (`:120`), `survivor` (`:68`), `vibe-check` (`:98`) do — `timeline` **does not**. | `MusicPlayer.tsx`:299; `grep -n "startSeconds" src/components/game/modes/*.tsx` | MEDIA-007 |
| End offset | `endSeconds` → interval 500 ms, `pauseVideo()` on exceeding it | `MusicPlayer.tsx`:317-327 | MEDIA-008 |
| Volume | `musicVolume` (0..1) → `setVolume(0..100)`; `musicEnabled === false` → `mute()` + `pauseVideo()` | `MusicPlayer.tsx`:307-315, :376-385 | MEDIA-009 |

### 8.5 Broken link

```text
YouTube iframe reports onError
   │
   ├─ Fallback available?  → load the next entry of the chain (videoIndex++),
   │                         reset the state to 'loading'
   │                         MusicPlayer.tsx:257-265
   │
   └─ no fallback left    → playerState = 'error'
                             → startAutoSkipCountdown()  (10 seconds)
                             MusicPlayer.tsx:267-269
```

| Case | Behaviour | Evidence location | Requirement |
|---|---|---|---|
| `onError` of the player | next fallback, otherwise error state | `MusicPlayer.tsx`:329-332, :254-272 | MEDIA-004 |
| Video does not start (`UNSTARTED`) | Timeout after **6 000 ms**, then the error handling | `MusicPlayer.tsx`:334-341 | MEDIA-005 |
| Error state visible | Overlay `"Gesperrt oder Fehler"` (blocked or error), buttons `"JETZT ÜBERSPRINGEN"` (skip now), `"Alternative Player"` (alternative player) (domain switch `www.youtube.com` ↔ `music.youtube.com`), `"Report Missing"` | `MusicPlayer.tsx`:481-535 | MEDIA-006, MEDIA-016 |
| Auto-skip | Countdown **10 s**, then `skipBrokenSong()` | `MusicPlayer.tsx`:239-252 | MEDIA-006 |
| `skipBrokenSong()` with a random source | `roundPhase = 'drawing'`, `currentSong = null`, `autoDrawIntent = true` → `DrawingPhase` draws automatically | `game-store.ts`:414-416; `DrawingPhase.tsx`:149-157 | GAME-013 |
| `skipBrokenSong()` with a QR source | only `roundPhase = 'drawing'`; **no** automatic draw (the pilot scans again) | `game-store.ts`:408-412 | GAME-013 |
| Manual re-roll | Button `"Video kaputt? Neu würfeln"` (video broken? roll again), 2 s dice animation, then `skipBrokenSong()` | `QuestionPhase.tsx`:105-112; `src/app/game/page.tsx`:239-246 | GAME-014 |
| Report a missing link | GitHub issue or clipboard; rate limit **5 reports per hour and device**; duplicate protection per song | `MusicPlayer.tsx`:172-237 | MEDIA-013, MEDIA-014 |

### 8.6 Lifecycle across the reveal transition

`QuestionPhase` stays **mounted** during the reveal (`display: none`),
so that the YouTube iframe does not restart. This is a deliberate intervention
in the render tree and is commented in the code
([`../../src/app/game/page.tsx`](../../src/app/game/page.tsx):404-411, :418-430).

> **Consequence for the anti-spoiler rule:** During `reveal` the
> `QuestionPhase` DOM continues to exist — only with `display: none`. § 3.2 is
> therefore formulated exclusively for the phase `question`.

---

## 9. Module boundaries

### 9.1 What may enter `src/components/**`

Measured on the import graph without test files. Reproducible with:

```bash
find src/components -name '*.ts' -o -name '*.tsx' \
  | grep -v '\.test\.' \
  | xargs grep -hoP "from '\K[^']+" | sort | uniq -c | sort -rn
```

| Allowed dependency | Occurrences |
|---|---|
| `@/types/**` (`song` 11, `player` 2, `game-state` 1) | 14 |
| `@/utils/**` (`feedback-messages` 8, `song-picker` 3, `last-round-messages` 1, `censor-utils` 1) | 13 |
| `@/components/**` and relative components (`../MusicPlayer` 6, `./modes/*` 6, `@/components/game/MusicPlayer` 1, `./NavBar` 1) | 14 |
| `@/config/game-config` | 10 |
| `@/stores/game-store` | 7 |
| `@/contexts/ThemeContext` | 3 |
| `react-i18next` (`useTranslation`) | 19 |
| Third-party packages (`react` 23, `framer-motion` 22, `next/navigation` 4, `next/link` 1, `next/image` 1, `html5-qrcode` 1) | 52 |

| Forbidden dependency | Status |
|---|---|
| `@/app/**` | ✅ no edge |
| `@/admin-api/**` | ✅ no edge |
| `@/data/**` (catalogue internals) | ✅ no edge — the catalogue is reached exclusively via `@/utils/song-picker` (`getAllSongs`, `pickRandomSong`) (`TimelineMode.tsx`:15, `CoverConfusionMode.tsx`:18) |
| `@/i18n/locales/*.json` (raw data) | ✅ no edge — only `useTranslation` |

### 9.2 What `src/components/**` must not contain

| Rule | Rationale | Evidence |
|---|---|---|
| **No page orchestration** | Routes, guards and redirects belong in `src/app/**` | `src/app/game/page.tsx`:89-100 (guard), :96-100 (redirect) |
| **No server access** | `src/components/**` is client code | `@/admin-api` not imported |
| **No direct access to the catalogue** | Only via `@/utils/song-picker` | see 9.1 |
| **No own state holder** | The store is the only writing state holder | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) § 2.2 |
| **No hard-coded game numbers** | The numbers are in `PHOMU_CONFIG` | see [§ 11.3](#113-locally-defined-numbers-deviation-from-the-single-truth-rule) |
| **No feature scope beyond the phase** | A mode component renders its question and its points; it orchestrates no rounds | `QuestionPhase.tsx`:61-83 (routing), `src/app/game/page.tsx`:363-462 (orchestration) |

> **Known deviation:** `ARCHITECTURE.md` § 1 defines for `components`
> "presentation and interaction; **no game logic**". The mode widgets
> nevertheless contain the **points logic** today (e.g. `TimelineMode.tsx`:154,
> `HintMasterMode.tsx`:50, `CoverConfusionMode.tsx`:41). That is an
> **open decision** — see [§ 11.5](#115-open-decisions-for-the-owner).

### 9.3 Coupling between the mode widgets

All six mode widgets import `MusicPlayer` directly
(`../MusicPlayer`, 6 occurrences). The mode widgets know **no** other
mode widgets; the selection happens exclusively via
[`../../src/components/game/QuestionPhase.tsx`](../../src/components/game/QuestionPhase.tsx):61-83.

---

## 10. How the contract is checked

| Check | Command / location |
|---|---|
| Round phase names unchanged | `grep -n "RoundPhase" -A 6 src/types/game-state.ts` |
| `locked-in` is not entered | `grep -rn "advancePhase(" src` — may only yield `'reveal'` |
| Song not persisted | `grep -n "partialize" -A 18 src/stores/game-store.ts` — `currentSong` must not occur |
| No import of `app/` or `admin-api/` from `components/` | `grep -rn "from '@/app\|from '@/admin-api" src/components/` — must be empty |
| Catalogue access only via `song-picker` | `grep -rn "from '@/data" src/components/` — must be empty |
| Mode mapping unchanged | `grep -n "currentMode ===" src/components/game/QuestionPhase.tsx` |
| Provider order unchanged | `grep -n "useSpotifyPremium\|useSpotifyFree\|useAmazonPrime\|useAmazonPremium" src/components/game/MusicPlayer.tsx` |
| Numbers in exactly one place | `grep -rn "HINT_MASTER_POINTS\|DEFAULT_TIMELINE_MAX_POINTS" src/` |
| Requirements cover the contract | `grep -n "^### GAME-\|^### MEDIA-" REQUIREMENTS.md` |
| Doc links resolvable | `npm run check:doc-links` ([`../../scripts/check-doc-links.mjs`](../../scripts/check-doc-links.mjs)) |
| File sizes below the limit | `npm run check:file-size` ([`../../scripts/check-file-size.mjs`](../../scripts/check-file-size.mjs)) |

---

## 11. Deviations between contract and code (measured)

Everything in this section is **measured**, not estimated. The commands are
in the last column.

### 11.1 Measured deviations

| # | Deviation | Evidence location | Measurement |
|---|---|---|---|
| A1 | `lyrics` renders `artist` and `title` already in the phase `question` — violation of § 3.2 | `LyricsMode.tsx`:132-133 | `grep -n "song.artist\|song.title" src/components/game/modes/LyricsMode.tsx` |
| A2 | `cover-confusion` renders `"COVER-VERSION AKTIV"` from the start — it answers the variant "cover or original?" in advance | `CoverConfusionMode.tsx`:116-120 | `grep -n "COVER-VERSION AKTIV" src/components/game/modes/CoverConfusionMode.tsx` |
| A3 | `cover-confusion` does **not** censor its hints (`hint-master` does) | `CoverConfusionMode.tsx`:139 (raw) against `HintMasterMode.tsx`:156 (`censorHint`) | `grep -n "censorHint" src/components/game/modes/*.tsx` |
| A4 | `vibe-check` deliberately reveals the identity (artist, title, decade; music unblurred) — as a mode exception, not as a rule | `VibeCheckMode.tsx`:116-118, `:99` | `grep -n "blurred" src/components/game/modes/VibeCheckMode.tsx` |
| A5 | `ADR-0003` names `vibe-check` as the **only** exception to the anti-spoiler rule; `lyrics` is a second one | [`../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md`](../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md) against `LyricsMode.tsx`:132-133 | both files read |
| A6 | `locked-in` is typed but never entered; there is **no** `answersLocked` flag | `game-state.ts`:31; `page.tsx`:165, `:234` | `grep -rn "answersLocked" src` → 0 hits; `grep -rn "advancePhase(" src` → 2 calls, both `'reveal'` |
| A7 | Elimination is not implemented: `isEliminated` and `isSpectator` never become `true` | `game-store.ts`:216-217 | `grep -rn "isEliminated\|isSpectator" src` → 4 hits, all initialisation |
| A8 | In the mode `shifting` the team and player scores remain unchanged on the switch → GAME-007 (team points = sum of the members) no longer applies afterwards | `game-store.ts`:349-363 | Code read |
| A9 | `MusicProviderInterface`, `PlayerState` (type) and `ProviderAvailability` are neither implemented nor used; `ProviderAvailability` does not know `amazon-music-premium` | `music-provider.ts`:18-107 | `grep -rn "MusicProviderInterface\|ProviderAvailability" src` → only the definition |
| A10 | With `preferredMusicProvider === 'amazon-music-premium'` the Amazon embed is rendered **in addition** to the YouTube player, because the initialisation guard does not mention `useAmazonPremium` | `MusicPlayer.tsx`:285 (guard) against `:607-619` (embed) | both locations read |
| A11 | `config.targetPoints` (default 100, `game-store.ts`:47) and `config.winCondition` (default 10, `game-store.ts`:50) are two target values for the same thing. The lobby keeps them in sync (`src/app/lobby/page.tsx`:337, :388), the store default does not. `RevealPhase` evaluates against `winCondition` (`:481-482`), `nextRound` against `targetPoints` (`game-store.ts`:308) | see left | `grep -rn "targetPoints\|winCondition" src` |
| A12 | `config.roundsToPlay` is only written in the lobby and never read | `src/app/lobby/page.tsx`:347, :389; no read location | `grep -rn "roundsToPlay" src` |
| A13 | The lobby offers the round counts `[5, 10, 15, 20]`, although `MIN_ROUNDS_TO_PLAY = 10` applies and is enforced nowhere | `src/app/lobby/page.tsx`:346-349; `game-config.ts`:61 | both read |
| A14 | `Player.isPilot` is not read in the game flow; the active player comes from `turnOrder` | `src/app/game/page.tsx`:103-107; `grep -rn "isPilot" src` | measured |
| A15 | `RoundPhase` describes `scoring` as "Points being awarded, next turn loading"; implemented, `scoring` is a "game finished" placeholder | `game-state.ts`:33 against `game-store.ts`:388 and `src/app/game/page.tsx`:387-401 | both read |
| A16 | MEDIA-007 requires the playback to start at the defined offset. The mode `timeline` does **not** pass `startSeconds` on to the player — there the playback starts at the beginning of the song instead of at the chorus. | `grep -n "startSeconds" src/components/game/modes/*.tsx` — `TimelineMode.tsx` without a hit | measured |

### 11.2 Prioritisation

| Priority | Deviations | Why |
|---|---|---|
| **P1** | A1, A2, A3, A5 | Anti-spoiler is a product promise (CORE-005). These items give the solution away. |
| **P2** | A6, A7, A8 | Game rules are not implemented or not consistent. |
| **P3** | A9, A10, A11, A12, A13, A14, A15, A16 | Duplicate ownership, dead constants, misleading type comments. |
| **not a defect** | A4 | `vibe-check` deliberately gives the identity away — the mode asks for the mood of the song. No decision is needed here, only a confirmation (§ 11.5, E1). |

### 11.3 Locally defined numbers (deviation from the single-truth rule)

The following numbers are **not** in `PHOMU_CONFIG`, but in the code:

| Number | Location | Canonical location per the rule |
|---|---|---|
| `4` (lyrics points) | `LyricsMode.tsx`:21 (`LYRICS_POINTS`) | `PHOMU_CONFIG` (missing) |
| `2` (bonus round) | `LyricsMode.tsx`:239 | `PHOMU_CONFIG` (missing) |
| `3` (survivor points) | `SurvivorMode.tsx`:36 | `PHOMU_CONFIG` (missing) |
| `2` / `1` (vibe check, with cheat) | `VibeCheckMode.tsx`:57 | `PHOMU_CONFIG` (missing) |
| `[5, 4, 3, 2]` (cover confusion) | `CoverConfusionMode.tsx`:23 | `PHOMU_CONFIG` (missing) |
| `3` (cover confusion variant B) | `CoverConfusionMode.tsx`:82 | `PHOMU_CONFIG` (missing) |
| `-2` / `-1` (cheat deductions) | `HintMasterMode.tsx`:62; `TimelineMode.tsx`:219, :234; `SurvivorMode.tsx`:43 | `PHOMU_CONFIG` (missing) |
| `30` (audio hint length) | `HintMasterMode.tsx`:132 (`startSecs + 30`) | `PHOMU_CONFIG.SPOTIFY_PREVIEW_DURATION` (present, but **unused**) |
| `180` (audio length from level 5 / reveal) | `HintMasterMode.tsx`:132 | `PHOMU_CONFIG` (missing) |
| `120` (vibe check playback end) | `VibeCheckMode.tsx`:266 | `PHOMU_CONFIG` (missing) |
| `10` (auto-skip countdown) | `MusicPlayer.tsx`:240 | `PHOMU_CONFIG` (missing) |
| `6 000 ms` (start timeout) | `MusicPlayer.tsx`:340 | `PHOMU_CONFIG` (missing) |
| `5` (reports per hour) | `MusicPlayer.tsx`:177 | `PHOMU_CONFIG` (missing) |
| `500 ms` (end offset check) | `MusicPlayer.tsx`:326 | `PHOMU_CONFIG` (missing) |
| `10` (year numbers up to removal allowed) | `TimelineMode.tsx`:193 | `PHOMU_CONFIG` (missing) |
| `3` (start year numbers of the timeline) | `TimelineMode.tsx`:141 | `PHOMU_CONFIG` (missing) |
| `0` (score floor) and `1` (minimum points per correct answer) | `game-store.ts`:457, :468; `game-config.ts`:68 | `PHOMU_CONFIG.DEFAULT_MIN_POINTS_PER_CORRECT` (present); the floor `0` is implicit |
| `[50, 100, 200, 500]` / `[5, 10, 15, 20]` / `[30…240]` (lobby presets) | `src/app/lobby/page.tsx`:336, :346, :356 | `PHOMU_CONFIG` (missing) |

### 11.4 Further observations

| Observation | Evidence location |
|---|---|
| `gameStartTime` is persisted (`:636`) and set at the start of the game (`:273`) — after a reload the time condition keeps running, but `currentRound` keeps running as well. Both are consistent. | `game-store.ts`:273, :636 |
| `endGame` awards `totalXP` as the sum of all player scores of the session — in team mode the team score is **not** included. | `game-store.ts`:380-383 |
| `resetScores` clears `roundHistory`, `playedSongIds` and `timelineYears`, but keeps `totalXP` and `config`. | `game-store.ts`:479-493 |
| `startQuickGame` sets `currentSongSource = 'qr'` and `roundPhase = 'question'` — the quick play skips `drawing`. | `game-store.ts`:496-513 |
| The measured status quo in [`../adr/ADR-0004-internationalisierungsgrenze.md`](../adr/ADR-0004-internationalisierungsgrenze.md) ("4 files with `useTranslation`") is outdated: today there are **34** files (19 in `src/components`, 15 in `src/app`). The ADR describes the state of the i18n migration, not today's code. | `grep -rl "useTranslation" src \| wc -l` → 34 |
| `awardPoints` with a team ID updates **only** the team (not its members); with a player ID, player **and** team are updated. | `game-store.ts`:451-476 |

### 11.5 Open decisions for the owner

| # | Decision | Why it is open |
|---|---|---|
| E1 | **How strict is the anti-spoiler rule for `lyrics` and `cover-confusion`?** Options: (a) withdraw the identity — breaks the mode concept; (b) abolish variant B ("cover or original?"), because the cover banner gives it away; (c) document the rule as an exception and correct `ADR-0003`. | A1, A2, A5 |
| E2 | **Is the censorship extended to `cover-confusion`?** CAT-012 requires the censorship of the hints, CAT-011 requires that the hints do not give away the song. | A3 |
| E3 | **Should `locked-in` be implemented or removed from the type?** A real `answersLocked` would enforce the reveal lock, which is currently only steered via buttons. | A6 |
| E4 | **Is elimination introduced?** The data model exists, the rule does not. Without a rule `isEliminated` is dead code. | A7 |
| E5 | **How are points distributed in the `shifting` mode?** Today: the teams keep their points, the players switch the team → GAME-007 no longer applies. | A8 |
| E6 | **Does `src/types/music-provider.ts` become the enforced contract** (rebuild the provider adapters according to the strategy pattern) **or** is it archived as a historical note? | A9 |
| E7 | **Is the `amazon-music-premium` double playback fixed** (extend the guard to include `useAmazonPremium`)? | A10 |
| E8 | **Are `targetPoints`/`winCondition` merged** (into one target value)? The store default 100 vs. 10 is a latent deviation. | A11 |
| E9 | **Where does the game logic live?** `ARCHITECTURE.md` forbids game logic in `components`; the mode widgets contain it today. Either adjust the rule or move the points logic into `src/utils/`. | § 9.2 |
| E10 | **Are the locally defined numbers moved to `PHOMU_CONFIG`?** 20 evidence locations, see [§ 11.3](#113-locally-defined-numbers-deviation-from-the-single-truth-rule). | § 5.1 |

---

## 12. Change rule for this contract

1. **Whoever changes a boundary changes this contract in the same commit.**
   A pull request that violates a rule in § 2–§ 9 without pulling the contract
   along is incomplete.
2. **Boundary shifts need an ADR.** State transitions (§ 2),
   anti-spoiler rules (§ 3), mode contracts (§ 4), persistence (§ 7),
   provider order (§ 8) and module boundaries (§ 9) are not
   negotiable side paths, but decisions.
3. **Numbers are not frozen here.** The numbers are in
   `PHOMU_CONFIG`. This contract quotes them and shows their evidence location.
4. **The code is the truth, the documentation follows it** (CORE-009). If the
   code does not match this contract, either the code is changed
   or this contract — both with a rationale and, for boundary shifts,
   with an ADR.

---

## 13. Related documents

| Document | Reference |
|---|---|
| [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) | Binding requirements with IDs (`GAME-*`, `MEDIA-*`, `LOBBY-*`, `CAT-*`) |
| [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) | Layers, dependency direction, file size rules |
| [`../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`](../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md) | Layers and dependency direction |
| [`../adr/ADR-0002-zustand-store-server-und-url.md`](../adr/ADR-0002-zustand-store-server-und-url.md) | Store vs. server vs. URL |
| [`../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md`](../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md) | Anti-spoiler and reveal orchestration |
| [`../adr/ADR-0004-internationalisierungsgrenze.md`](../adr/ADR-0004-internationalisierungsgrenze.md) | Internationalisation boundary |
| [`../../WHERE_TO_CHANGE.md`](../../WHERE_TO_CHANGE.md) | Topic → file → instructions |
| [`../../GLOSSARY.md`](../../GLOSSARY.md) | Domain terms (pilot, round, reveal, …) |
| [`README.md`](README.md) | Index of the design contracts |
