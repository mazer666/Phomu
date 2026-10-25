# Acceptance — P0 (Platform foundation: the Rust base against the web shell)

**Requirement IDs:** CORE-101, CORE-103, CORE-105, CORE-106, CORE-107, CORE-108,
CORE-109, CORE-111, CORE-112, CORE-113, GAME-001, GAME-002, GAME-005, GAME-007,
GAME-008–GAME-013, GAME-015–GAME-024, GAME-033, GAME-037, GAME-038, GAME-040,
GAME-043, GAME-045, CAT-011, CAT-012
**Build / Commit:** working tree, branch `main`, **no commit** (the work order
forbids commit, push and branch change). The Rust side is the _uncommitted_
working tree of the platform worker (`core/phomu-core`, `core/phomu-conformance`,
`platform/*`); the web shell side carries the uncommitted extraction of the mode
rules into `src/utils/mode-rules.ts`.
**Testing roles:** conformance proof (this worker); in parallel: platform worker
(`core/phomu-core`, `core/phomu-conformance`), QA worker (CI, gates).
**Date:** 2026-10-25, measurements between 12:20 and 12:56 UTC.
**Environment:** Node v22.19.0, npm 10.9.3, cargo 1.99.1 / rustc 1.99.1,
Linux container, 2 CPUs, 3 GB RAM.

> **Reading note.** This document is an **honest finding**, not a success
> report. Every statement names its source (command output, test name or
> `file:line`). What was not measured is entered as **not measured** with a
> reason; a "green" without evidence is not a result.
>
> **Moving target.** The Rust base is under active development: the platform
> worker changed `core/phomu-core` and `core/phomu-conformance` _during_ this
> measurement (12:26–12:30 UTC — the phase automaton, the typed errors and the
> session module). Every number below is a **snapshot of the working tree at
> 2026-10-25 12:49:36 UTC**. The crate's own test
> (`the_corpus_of_the_web_shell_differs_only_in_the_documented_places`) is the
> gate that detects a change of the base — it fails when the base changes
> without a documented divergence.

---

## 1. Functional

### 1.1 The leading question

> **Does the Rust base play the same game as the web shell?**

**Answer: yes in the measured behaviour — 36 of the 64 portable vectors are
identical, and the remaining 28 differ exclusively in the phase sequence of the
round (the anti-spoiler lock) and in one timeline effect. Not one point, not
one score, not one winner differs.**

| Measurement                                                |  Value | Source                                                      |
| ---------------------------------------------------------- | -----: | ----------------------------------------------------------- |
| Vectors in the corpus                                      | **70** | `core/phomu-conformance/vectors/web-shell/index.json`       |
| Portable (both sides must behave identically)              | **64** | same file, field `portable`                                 |
| Documented divergences (`portable: false`)                 |  **6** | same file                                                   |
| Compared (portable vectors)                                | **64** | gate report, line `compared (portable) : 64`                |
| **Identical**                                              | **36** | gate report, line `identical : 36`                          |
| **Deviating (undocumented — fails the gate)**              |  **0** | gate report, line `deviating (gate fails) : 0`              |
| Intentional deviations (documented — reported)             | **28** | gate report, line `intentional deviations : 28`             |
| Documented divergences (corpus marks them as not portable) |  **6** | gate report, line `documented divergences : 6`              |
| Missing on one side                                        |  **0** | gate report, line `missing on one side : 0`                 |
| Vectors that could not be compared                         |  **0** | gate report — every vector was executed by both runners     |
| Gate exit code                                             |  **0** | `npm run check:conformance` → `PASS`, exit 0 (12:49:36 UTC) |

The **decisive** statement about the _game_ is narrower than the vector count:
the differences of the 28 intentional deviations touch only these fields of the
observation —

| Field                                                            | Number of differences | Points / scores / winner affected?               |
| ---------------------------------------------------------------- | --------------------: | ------------------------------------------------ |
| `phases`                                                         |                    28 | no                                               |
| `error`                                                          |                     4 | no                                               |
| `currentRound`, `currentSongId`, `roundCount`                    |                1 each | no (cascade of the refused reveal)               |
| `timelineYears`                                                  |                     1 | no (the year of an answer that the core refuses) |
| `playerScores`, `teamScores`, `answers` (the points), `winnerId` |                 **0** | **no**                                           |

_Source:_ the field-by-field diff of the gate report (`tmp/conformance-report.txt`,
the section `rust-vs-typescript`), counted per field.

**In words:** the two implementations award the same points in every mode, keep
the same scores, produce the same winner, filter the catalogue identically and
censor the hints identically. They differ in _when_ the round is released: the
base locks the answers in and refuses the reveal before that, the web shell
does not.

### 1.2 The measurement

| Step                  | Command                                                                                                                            | Result                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1. the reference side | `npx tsx tools/conformance/run-ts-conformance.ts --vectors core/phomu-conformance/vectors/web-shell --out tmp/conformance-ts.json` | `TypeScript conformance runner: 70 vector(s) executed, 70 without an unexpected vector error.`                                        |
| 2. the base side      | `cargo run -p phomu-conformance-runner -- --vectors core/phomu-conformance/vectors/web-shell --out tmp/conformance-rust.json`      | `Rust conformance runner: 70 vector(s) executed, 9 with a vector error.`                                                              |
| 3. the comparison     | `npm run check:conformance` → `scripts/verify-conformance.mjs`                                                                     | `PASS — 64 portable vector(s) compared, 36 identical, 0 deviating, 28 intentional deviation(s), 6 documented divergence(s).` (exit 0) |

The "9 with a vector error" of the Rust runner are the **typed refusals of the
base** (the reveal before the lock, the answer without a player, the unknown
player, the unknown year). They are part of the observation, not a failure of
the runner — the comparison reads them as the field `error`.

The corpus of the base itself — `core/phomu-conformance/vectors/` (10 vectors
that document the contract behaviour of the base) — is proven by the crate's
own test, not by the comparison:

| Command                           | Result                                                                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cargo test -p phomu-conformance` | `3 passed; 0 failed` — `every_vector_of_the_base_passes`, `the_corpus_of_the_web_shell_differs_only_in_the_documented_places`, `every_documented_difference_names_a_reason` |

### 1.3 The compared behaviour areas

The source column names the place in the **TypeScript implementation** that the
vectors of the area exercise (`reference` field of the vectors).

| Area                                                                      | Vectors | Portable | Identical | Intentional deviation | Documented | Source in the TypeScript implementation                                                                      |
| ------------------------------------------------------------------------- | ------: | -------: | --------: | --------------------: | ---------: | ------------------------------------------------------------------------------------------------------------ |
| Round state machine (`drawing → question → locked-in → reveal → scoring`) |       9 |        8 |         5 |                     3 |          1 | `src/stores/game-store.ts`:255-275, 365-375, 379-391, 394-402, 408-416, 439-441                              |
| Round and turn logic, ending conditions                                   |       9 |        9 |         9 |                     0 |          0 | `src/stores/game-store.ts`:300-322, 331-347, 379-391                                                         |
| Points: Timeline                                                          |       7 |        7 |         3 |                     4 |          0 | `src/components/game/modes/TimelineMode.tsx`:117-139, 202, 225-261, 268-274; `src/utils/mode-rules.ts`       |
| Points: Hint-Master                                                       |       4 |        4 |         1 |                     3 |          0 | `src/components/game/modes/HintMasterMode.tsx`:65-82; `src/utils/mode-rules.ts`                              |
| Points: Lyrics Labyrinth                                                  |       3 |        3 |         0 |                     3 |          0 | `src/components/game/modes/LyricsMode.tsx`:114-121, 287-302                                                  |
| Points: Vibe-Check                                                        |       3 |        3 |         0 |                     3 |          0 | `src/components/game/modes/VibeCheckMode.tsx`:121-128                                                        |
| Points: Survivor                                                          |       3 |        3 |         1 |                     2 |          0 | `src/components/game/modes/SurvivorMode.tsx`:46-60; `src/utils/mode-rules.ts`                                |
| Points: Cover Confusion                                                   |       6 |        6 |         0 |                     6 |          0 | `src/components/game/modes/CoverConfusionMode.tsx`:96-110                                                    |
| Time decay                                                                |       3 |        3 |         0 |                     3 |          0 | `src/app/game/page.tsx`:138-156; `src/utils/mode-rules.ts`                                                   |
| Teams (membership, team score)                                            |       4 |        4 |         4 |                     0 |          0 | `src/stores/game-store.ts`:451-476, 561-592                                                                  |
| Error cases                                                               |       5 |        2 |         1 |                     1 |          3 | `src/stores/game-store.ts`:462-463, 606-615; `src/app/game/page.tsx`:136; `tools/conformance/lib/harness.ts` |
| Catalogue selection (the filter chain)                                    |       8 |        8 |         8 |                     0 |          0 | `src/utils/song-picker.ts`:12-70                                                                             |
| Hint censoring                                                            |       4 |        4 |         4 |                     0 |          0 | `src/utils/censor-utils.ts`:11-60; `src/config/spoiler-config.ts`                                            |
| Documented divergences (not portable)                                     |       2 |        0 |         0 |                     0 |          2 | `src/stores/game-store.ts`:188-191, 349-363                                                                  |
| **Sum**                                                                   |  **70** |   **64** |    **36** |                **28** |      **6** |                                                                                                              |

### 1.4 The deviations — every one of them

There are **no undocumented deviations**: the gate fails on an undocumented
difference, and it is green.

| #   | Vector | Expected (web shell) | Actual (Rust base) | Assessment                                                                  |
| --- | ------ | -------------------- | ------------------ | --------------------------------------------------------------------------- |
| —   | —      | —                    | —                  | **No entry.** The list of the gate is empty (`deviating (gate fails) : 0`). |

The 28 differences that exist are **intentional** and are listed in § 1.5.

### 1.5 Intentional deviations from the web shell

These are the deliberate differences of the base. They are reported by the gate
with their concrete difference, they do **not** fail the gate, and they are
maintained as data in
`core/phomu-conformance/vectors/intentional-divergences.json` (and as code in
`core/phomu-conformance/src/lib.rs`, `KNOWN_DIVERGENCES`).

The two lists hold the **same 32 vectors** — the gate checks this and fails
when they drift apart (a vector that is only in the registry, or only in the
classification). **Evidence:** the gate report, the line `registry mismatch`;
the check itself was proven by removing one vector from a copy of the
classification — the gate then failed with `only in the registry: decay/minimum`
and exit code 1. The requirement comes from
[`../adr/ADR-0009-normative-layer-of-the-conformance-corpus.md`](../adr/ADR-0009-normative-layer-of-the-conformance-corpus.md)
§ "Decision" 1: the corpus of the base is **normative**, the corpus of the web
shell is **descriptive** — a difference there is a migration debt of the
reference or a deliberate difference, never a defect of the base.

#### D1 — The base enters the phase `locked-in`, the web shell does not (24 vectors)

- **Reason:** the base enters `locked-in` when the last expected answer
  arrives; the reference implementation _types_ the phase but never enters it.
  The base closes the deviation A6 of the contract — the reveal is released
  only when the answers are locked in.
- **Source:** `docs/design/GAME-CONTRACT.md` § 2.1 and § 11.1 (deviation A6);
  `REQUIREMENTS.md` (GAME-002); `core/phomu-core/src/session/answers.rs`
  (`lock_answers`); `docs/design/PLATFORM-ARCHITECTURE.md` § 10.2 (rule C-3).
- **Concrete difference (identical in all 24 vectors):**
  `phases[0]: typescript "question", rust "locked-in"`.
- **Affected vectors (24):** `timeline/correct-canonical-slot`,
  `timeline/wrong-slot`, `timeline/duplicate-year`, `timeline/points-cap`,
  `hint-master/both-level-1`, `hint-master/artist-level-5`, `hint-master/nothing`,
  `lyrics/fake-line`, `lyrics/real-line`, `lyrics/bonus-claimed`,
  `vibe-check/matching-mood`, `vibe-check/cheated`, `vibe-check/wrong-mood`,
  `survivor/correct`, `survivor/wrong`, `cover/no-hints`, `cover/two-hints`,
  `cover/three-hints`, `cover/wrong-artist`, `cover/variation-correct`,
  `cover/variation-wrong`, `decay/within-grace`, `decay/one-step`,
  `decay/minimum`.
- **What does _not_ differ:** the points, the scores, the timeline years and the
  winner are identical in every one of the 24 vectors — only the phase differs.

#### D2 — The base refuses the reveal until the answers are locked in (3 vectors)

- **Reason:** the base refuses the reveal while the round is open; the
  reference lets the store change the phase without the lock. The refusal is
  the anti-spoiler guarantee of the base.
- **Source:** `docs/design/PLATFORM-ARCHITECTURE.md` § 10.2 (rule C-3);
  `REQUIREMENTS.md` (GAME-002); `core/phomu-core/src/session/answers.rs`
  (`reveal`).
- **Concrete differences:**

  | Vector                     | Expected (web shell)                                                                                                          | Actual (Rust base)                                                                                                                                                                 |
  | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `phase/question-to-reveal` | `phases[1] = "reveal"`, `error = null`                                                                                        | `phases[1] = "question"`, `error = {code: "1102", message: "errors.answersNotLocked"}`                                                                                             |
  | `phase/reveal-to-drawing`  | `phases[1] = "reveal"`, `phases[2] = "drawing"`, `currentRound = 2`, `currentSongId = null`, `roundCount = 1`, `error = null` | `phases[1] = "question"`, `phases[2] = "question"`, `currentRound = 1`, `currentSongId = "s-a"`, `roundCount = 0`, `error = {code: "1101", message: "errors.notAvailableInPhase"}` |
  | `phase/reveal-to-scoring`  | `phases[1] = "reveal"`, `error = null`                                                                                        | `phases[1] = "question"`, `error = {code: "1102", message: "errors.answersNotLocked"}`                                                                                             |

- **Assessment:** the difference in `phase/reveal-to-drawing` (the round number,
  the song, the round history) is the **cascade** of the refused reveal — the
  base never reaches the round that the reference logs.

#### D3 — The base refuses an answer without an active player (1 vector)

- **Reason:** the base refuses the answer when the turn order is empty — there
  is nobody to attribute it to. The reference evaluates the mode and applies
  its effect without recording the answer.
- **Source:** `core/phomu-core/src/session/answers.rs` (`submit_answer`);
  `docs/spec/REQUIREMENTS-PLATFORM.md` (CORE-111).
- **Concrete difference:** `timelineYears.length: typescript 4, rust 3` and
  `error: typescript null, rust {code: "1105", message: "errors.noActivePlayer"}`
  — the year of the song is on the timeline in the web shell, the base refuses
  the whole answer.
- **Affected vector:** `error/answer-without-player`.

### 1.6 The documented divergences (the corpus marks them as not portable)

These are **not** counted as errors — the corpus itself declares that the two
implementations may differ here. They are listed with the reason of the corpus
(`portabilityNote`) and with the measured difference.

| Vector                               | Reason (corpus)                                                                                                                                                                                                          | Measured difference (web shell → Rust base)                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phase/locked-in-declared`           | The phase `locked-in` is declared but entered by no flow (GAME-CONTRACT § 2.1, A6). The store accepts it; the core decides whether an undeclared transition is a typed error (CORE-111). The decision is open (OPEN-08). | `phases[0]: "locked-in" → "question"`, `error: null → {code: "1102", message: "errors.answersNotLocked"}`                                                                        |
| `error/answer-without-current-song`  | The error vocabulary of the vector layer belongs to the runner, not to the game.                                                                                                                                         | none (both sides report the same)                                                                                                                                                |
| `error/award-points-unknown-player`  | The reference ignores the operation silently (`game-store.ts`:462-463); the core answers with a typed error (CORE-111).                                                                                                  | `error: null → {code: "1004", message: "errors.unknownPlayer"}`                                                                                                                  |
| `error/remove-unknown-timeline-year` | The reference ignores the operation silently (`game-store.ts`:606-615); the core answers with a typed error (CORE-111).                                                                                                  | `error: null → {code: "1007", message: "errors.invalidAnswer"}`                                                                                                                  |
| `divergence/mode-rotation-random`    | The mode rotation draws with `Math.random()` (`game-store.ts`:188-191); the core uses a seeded generator (CORE-113) with a different algorithm.                                                                          | `currentMode: "vibe-check" → "timeline"` (the rotation itself is not comparable)                                                                                                 |
| `divergence/shifting-teams-random`   | The shifting team mode re-shuffles the players with `Math.random()` (`game-store.ts`:349-363); the reference keeps the team points (A8).                                                                                 | `teamScores.t1: 5 → 8`, `teamScores.t2: 3 → 0`, `playerTeams.p2: "t2" → "t1"`, `playerTeams.p3: "t1" → "t2"`, `teamMembers.t1[0]: "p3" → "p2"`, `teamMembers.t2[0]: "p2" → "p3"` |

### 1.7 The negative test of the comparison — the gate really detects a deviation

**Claim:** the comparison detects a wrong expectation; it is not a rubber stamp.

**Procedure:** the corpus was **copied** to `tmp/conformance-negative/vectors/`
(a scratch directory, gitignored). In the copy, the expectation of the vector
`hint-master/both-level-1` was changed: `then.playerScores.p1` from `5` to `6`
and `then.answers[0].pointsAwarded` from `5` to `6`. The gate was run against
the copy, then the change was reverted and the gate was run again. **The
repository was never modified** — the copy lives in `tmp/` (`.gitignore`:
`/tmp/**`), and `git status` shows no change of any tracked file.

**The red run (verbatim):**

```
$ node scripts/verify-conformance.mjs --vectors tmp/conformance-negative/vectors/web-shell \
    --out tmp/conformance-negative/report-red.txt
TypeScript runner: TypeScript conformance runner: 70 vector(s) executed, 70 without an unexpected vector error.
Rust runner: Rust conformance runner: 70 vector(s) executed, 9 with a vector error.
========================================================================
CONFORMANCE GATE — the Rust base against the web shell
========================================================================
corpus                  : tmp/conformance-negative/vectors/web-shell
vectors in the corpus   : 70
compared (portable)      : 64
identical               : 36
deviating (gate fails)  : 1
intentional deviations  : 27
documented divergences  : 6
missing on one side     : 0

------------------------------------------------------------------------
DEVIATIONS — the gate fails
------------------------------------------------------------------------
[hint-master/both-level-1] (area: scoring.hint-master)
  reason: the vector is listed as an intentional deviation (a6-locked-in-phase), but the difference touches the field(s) playerScores, answers
  typescript-vs-vector  playerScores.p1: expected 6, actual 5
  typescript-vs-vector  answers[0].pointsAwarded: expected 6, actual 5
  rust-vs-vector        phases[0]: expected "question", actual "locked-in"
  rust-vs-vector        playerScores.p1: expected 6, actual 5
  rust-vs-vector        answers[0].pointsAwarded: expected 6, actual 5
  rust-vs-typescript    phases[0]: typescript "question", rust "locked-in"

...
------------------------------------------------------------------------
RESULT
------------------------------------------------------------------------
FAIL — 1 vector(s) deviate or are missing (64 compared, 36 identical, 1 deviating, 27 intentional deviation(s), 6 documented divergence(s), 0 missing).

EXIT_CODE=1
```

**The named deviation:** the vector `hint-master/both-level-1` expects the
player `p1` to have **6** points and the answer to be worth **6** points; both
implementations produce **5** (`playerScores.p1: expected 6, actual 5`,
`answers[0].pointsAwarded: expected 6, actual 5`). The gate fails with exit
code **1**.

**The green run after the revert (verbatim):**

```
$ cp core/phomu-conformance/vectors/web-shell/hint-master-both-level-1.json \
    tmp/conformance-negative/vectors/web-shell/hint-master-both-level-1.json
$ node scripts/verify-conformance.mjs --vectors tmp/conformance-negative/vectors/web-shell \
    --out tmp/conformance-negative/report-green.txt
TypeScript runner: TypeScript conformance runner: 70 vector(s) executed, 70 without an unexpected vector error.
Rust runner: Rust conformance runner: 70 vector(s) executed, 9 with a vector error.
========================================================================
CONFORMANCE GATE — the Rust base against the web shell
========================================================================
corpus                  : tmp/conformance-negative/vectors/web-shell
vectors in the corpus   : 70
compared (portable)      : 64
identical               : 36
deviating (gate fails)  : 0
intentional deviations  : 28
documented divergences  : 6
missing on one side     : 0

...
------------------------------------------------------------------------
RESULT
------------------------------------------------------------------------
PASS — 64 portable vector(s) compared, 36 identical, 0 deviating, 28 intentional deviation(s), 6 documented divergence(s).

EXIT_CODE=0
```

The classification is **field-based**: a vector that is listed as an intentional
deviation only passes the gate if the difference touches **only** the fields
that its group names. The tampered vector fails exactly because the difference
touches `playerScores` and `answers` — fields that the group `a6-locked-in-phase`
does not name.

### 1.8 What could not be compared — and why

| What                                                            | Why                                                                                                                                                                                                                      | Evidence                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| The mode rotation (`nextRound` picks the next mode)             | The reference draws with `Math.random()` (`game-store.ts`:188-191), the base with a seeded generator of a different algorithm (CORE-113). Without a shared algorithm and a shared seed the sequences are not comparable. | `divergence/mode-rotation-random` — the corpus marks it as not portable                   |
| The membership of the teams after the team shuffle              | The reference re-shuffles with `Math.random()` (`game-store.ts`:349-363).                                                                                                                                                | `divergence/shifting-teams-random` — the corpus marks it as not portable                  |
| The **payload of the bridge** (C-1, C-3: no answer on the wire) | The vectors check the rules, not the marshalling of a bridge. **Not measured** — the UniFFI/C-ABI/WASM bridges are not part of this work order.                                                                          | `docs/design/PLATFORM-ARCHITECTURE.md` § 10.3 names the bridge test that is still missing |
| The **persistence round trip** (CORE-103)                       | The vectors build the situation in memory; they do not write a state and read it back. **Not measured.**                                                                                                                 | `docs/spec/REQUIREMENTS-PLATFORM.md` (CORE-103)                                           |
| The **performance of the base**                                 | The gate measures the wall clock of the whole comparison, not the base in isolation, and no budget is defined.                                                                                                           | § 3                                                                                       |

---

## 2. Technical

- **Architecture boundaries respected:** yes — **Evidence:** the crate gate
  `npm run check:crate-boundaries` (the rule table
  `scripts/crate-boundaries.rules.json`) allows a crate of `tools/` to depend on
  `core/*`; the Rust runner of the tools therefore depends on
  `core/phomu-conformance` (the runner) and reaches the rules only through
  `core/phomu-core`. The crate of the base itself does no file system access —
  it reads the vectors at compile time (`core/phomu-conformance/build.rs`) and
  the tool reads them at run time (`tools/conformance-runner/src/corpus.rs`).
  The **web shell was not changed** by this work: no file under `src/` was
  touched (see the change list in § 2.2).
- **Central configuration respected:** yes — **Evidence:** the numbers of the
  modes are read from `PHOMU_CONFIG` / the named constants of
  `src/utils/mode-rules.ts`; the corpus asserts the values (e.g. 5 points for
  the Hint-Master, 4 for the Lyrics, 2 for the Vibe-Check, 3 for the Survivor,
  `[5,4,3,2]` for the Cover Confusion) and the comparison shows **no**
  difference in any point value.
- **Tests green:** yes — **Evidence:**
  | Command | Result |
  |---|---|
  | `npm run test` | `Test Files 11 passed (11)`, `Tests 121 passed (121)`, 25.71 s, exit 0 |
  | `cargo test --workspace` | 40 test binaries, **304 tests passed, 0 failed**, 14.3 s, exit 0 |
  | `cargo test -p phomu-conformance` | `3 passed; 0 failed` (plus 1 doctest) |
  | `npm run check:conformance` | `PASS — 64 portable vector(s) compared, 36 identical, 0 deviating, …`, exit 0 |
- **Migration / versioning checked:** partly — **Evidence:** the result format of
  the runners carries `schemaVersion: 1` and both runners write the same
  structure (`core/phomu-conformance/src/runner.rs`, the doc comment of
  `Observation`; `tools/conformance/lib/types.ts`, the interface
  `Observation`). The **corpus** of the base asserts the version of the state
  (`core/phomu-core/src/session/state.rs`, `SCHEMA_VERSION`) — the vector
  `core/anti-spoiler-reveal-lock` proves that a state of a foreign version is
  rejected. **Not measured:** a migration of a persisted state between two
  versions (no such migration exists yet).
- **Type check:** yes — **Evidence:** `npm run typecheck` → exit 0, 58.6 s
  (`tsc --noEmit`, no output).
- **Lint:** yes — **Evidence:** `npm run lint` → exit 0, **1 warning** (0
  errors): `playwright.config.ts:1:1 warning Assign object to a variable before
exporting as module default import/no-anonymous-default-export` — pre-existing,
  not in a file of this work.
- **File size gate:** yes — **Evidence:** `npm run check:file-size` → exit 0,
  `✅ Gate passed — 0 errors, 11 warning(s), 8 known legacy file(s)`. The gate
  checks `src/`; the largest file of this work is `src/utils/mode-rules.ts`
  (416 lines — a warning, below the hard limit of 550). The new files of this
  work are below the soft target of 400 lines:
  `scripts/verify-conformance.mjs` (310), `scripts/lib/conformance-report.mjs`
  (437), `tools/conformance-runner/src/main.rs` (110),
  `tools/conformance-runner/src/corpus.rs` (104).
- **New gates present and runnable:** yes — **Evidence:**
  | Gate | Command | Exit |
  |---|---|---:|
  | Conformance (the Rust base against the web shell) | `npm run check:conformance` | 0 |
  | Documentation language | `npm run check:doc-language` | 0 (this document replaced the German draft: the findings went from 245 to 0) |
  | Crate boundaries | `npm run check:crate-boundaries` | 0 |

  The conformance gate has **three** checks of its own: the field-by-field
  comparison of the two observations, the classification of every difference
  (an undocumented difference fails, an intentional one is reported) and the
  equality of the two lists of the differences (the classification and the
  registry of the crate).

### 2.1 The format of the result — the common denominator

Both runners write the same file. The format is fixed in the doc comment of
`core/phomu-conformance/src/runner.rs` (the struct `Observation` with the table
of the fields and their types) and in `tools/conformance/lib/types.ts` (the
interface `Observation`). The gate repeats it in its header
(`scripts/verify-conformance.mjs`).

| Field               | Type                             | Field              | Type                                                                       |
| ------------------- | -------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `phases`            | `string[]`                       | `timelineYears`    | `number[]`                                                                 |
| `currentRound`      | `number`                         | `playedSongIds`    | `string[]`                                                                 |
| `currentMode`       | `string`                         | `answers[]`        | `{playerId, answer, outcome, isCorrect, pointsAwarded, answeredInSeconds}` |
| `currentSongId`     | `string \| null`                 | `roundCount`       | `number`                                                                   |
| `currentSongSource` | `"random" \| "qr" \| null`       | `totalXP`          | `number`                                                                   |
| `autoDrawIntent`    | `boolean`                        | `censorHint`       | `string \| null`                                                           |
| `playerScores`      | `{[id: string]: number}`         | `filteredSongIds`  | `string[] \| null`                                                         |
| `teamScores`        | `{[id: string]: number}`         | `error`            | `{code: string, message: string} \| null`                                  |
| `playerTeams`       | `{[id: string]: string \| null}` | `turnOrder`        | `string[]`                                                                 |
| `teamMembers`       | `{[id: string]: string[]}`       | `currentTurnIndex` | `number`                                                                   |
| `winnerId`          | `string \| null`                 | `isGameOver`       | `boolean`                                                                  |

### 2.2 The changes of this work — every one of them

| #   | File                                                                | Change                                                                                                                                                                                                                                                                                                                                               | Why                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `core/phomu-conformance/src/runner.rs`                              | The observation is serialisable (camelCase), the error of the base is a structure `{code, message}`, the answer carries the `outcome`, the phase is recorded after **every** input (also after an input the base refused), the replay ends on an error of the vector layer, `run_corpus` produces the result file, the doc comment fixes the format. | The result of the runner has to be _identical_ to the result of the TypeScript runner — it is the common denominator of the comparison.                                                                                                                                                                          |
| 2   | `core/phomu-conformance/src/vector.rs`                              | The four parameters of the time decay (`timeDecayGraceSeconds`, `timeDecayStepSeconds`, `timeDecayStepPoints`, `minPointsPerCorrect`) are read from the vector and applied to the configuration.                                                                                                                                                     | The corpus asserts them; without them the runner would use the defaults of the base.                                                                                                                                                                                                                             |
| 3   | `core/phomu-conformance/src/lib.rs`                                 | The exports of the new types; `KNOWN_DIVERGENCES` names the **32** differences of the corpus of the web shell with a reason each.                                                                                                                                                                                                                    | The list is the tripwire: a change of the base that adds a difference fails `cargo test -p phomu-conformance`.                                                                                                                                                                                                   |
| 4   | `core/phomu-conformance/vectors/core-*.json` (9 files)              | The expectation of the phase after an answer changed from `question` to `locked-in`; the expectation of `core/anti-spoiler-reveal-lock` now asserts the typed error `{code: "1102", message: "errors.answersNotLocked"}`.                                                                                                                            | The base now locks the answers in (GAME-002, A6) and reports the refusal with a typed error. The corpus of the base documents the **contract** behaviour — the contract mandates the lock.                                                                                                                       |
| 5   | `core/phomu-conformance/vectors/intentional-divergences.json` (new) | The three groups of the intentional deviations with the reason, the source and the fields that may differ.                                                                                                                                                                                                                                           | The gate must know which difference is intended — otherwise it would either fail on a deliberate difference or hide a new one.                                                                                                                                                                                   |
| 6   | `tools/conformance-runner/`                                         | The tool is now the **CLI** over the crate: it reads the corpus, calls `phomu_conformance::run_corpus` and writes the result file. Its own copy of the vector model, of the engine and of the observation (≈ 1 100 lines) was removed.                                                                                                               | One Rust behaviour, not two: the duplicated engine realised the situation only through the commands of the core and therefore refused 25 of the 70 vectors ("not comparable"). The crate realises the situation through the public rehydration path (`Session::from_state`, CORE-103) and executes every vector. |
| 7   | `Cargo.toml`                                                        | The workspace dependency `phomu-conformance`.                                                                                                                                                                                                                                                                                                        | The tool depends on the crate that owns the runner.                                                                                                                                                                                                                                                              |
| 8   | `scripts/verify-conformance.mjs` (new, 310 lines)                   | The gate: it runs both runners, compares the results vector by vector, writes the report, exits 1 on a deviation.                                                                                                                                                                                                                                    | The proof needs one command.                                                                                                                                                                                                                                                                                     |
| 9   | `scripts/lib/conformance-report.mjs` (new, 437 lines)               | The field-by-field comparison and the report.                                                                                                                                                                                                                                                                                                        | The two scripts stay below the hard limit of 550 lines; the gate itself is below the soft target of 400 lines.                                                                                                                                                                                                   |
| 10  | `package.json`                                                      | The script `check:conformance`.                                                                                                                                                                                                                                                                                                                      | The gate is callable by name and by CI.                                                                                                                                                                                                                                                                          |

**Not changed (deliberately):** the rules of the web shell (no file under `src/`
was touched), the rules of the base (`core/phomu-core/**` — the changes there
come from the platform worker), the corpus of the web shell
(`core/phomu-conformance/vectors/web-shell/**` — not a single expectation was
changed to make the comparison green).

---

## 3. Performance

| Metric                                                                           |      Budget |                        Measured | Result   |
| -------------------------------------------------------------------------------- | ----------: | ------------------------------: | -------- |
| The whole gate (both runners + the comparison, the Rust runner already compiled) | not defined |                      **3.25 s** | measured |
| `cargo test --workspace` (304 tests)                                             | not defined |                      **14.3 s** | measured |
| `npm run test` (121 tests, with coverage)                                        | not defined | **25.71 s** (47.8 s wall clock) | measured |
| `npm run typecheck`                                                              | not defined |                      **58.6 s** | measured |
| `npm run lint`                                                                   | not defined |          **138.4 s** (2 m 18 s) | measured |
| `npm run build`                                                                  | not defined |          **132.4 s** (2 m 12 s) | measured |

**Reference hardware / input:** 2 CPUs, 3 GB RAM, Linux container, the working
tree of the branch `main`.
**Method:** `time` around each command, one run each, without repetition. The
build times are **not** comparable with the numbers of an idle machine — the
Rust workspace was compiled in parallel during the measurement.

> A budget without a measured value is a statement of intent, not a result. No
> budget is defined for any of the metrics above.

---

## 4. Usability

- **Steps for the main task:** **one** — `npm run check:conformance`. It runs
  both runners, compares them and writes the report to `tmp/conformance-report.txt`.
  **Evidence:** § 1.2 and the header of `scripts/verify-conformance.mjs`.
- **Discoverability:** the corpus lies in
  `core/phomu-conformance/vectors/web-shell/` with `index.json` (the order),
  `schema.json` (the JSON schema) and `README.md` (the format); the
  classification of the intentional deviations lies next to it in
  `core/phomu-conformance/vectors/intentional-divergences.json`. **Evidence:**
  `ls core/phomu-conformance/vectors/web-shell/`.
- **Behaviour on mobile / native:** **not measured** (the proof concerns the
  rules of the game, not the surface).
- **Touch targets, focus order, contrast:** **not measured** (no change of the
  surface in this work).
- **Screen readers:** **not measured** (same reason).
- **Visual details / open defects:** no change of the surface. The report of the
  gate is a plain text file — it names the path of every difference, so a
  reader can go to the field without a tool.

---

## 5. Security / Privacy

- **New stored data:** none — the changed files store nothing. The runners
  write their result files into `tmp/` (gitignored: `.gitignore` → `/tmp/**`).
- **Network access (outgoing / incoming):** none — the TypeScript runner reads
  files, the Rust runner reads files and calls the core, and the core itself
  does no I/O (CORE-112). The gate spawns `npx tsx` and `cargo run` — both
  local.
- **Negative tests:** the negative test of the comparison itself — the
  tampered expectation of `hint-master/both-level-1` is detected and the gate
  fails with exit code 1 (§ 1.7). The negative tests of the shell
  (`src/admin-api/admin-token-guard.test.ts` — 10 tests,
  `cover-fetch-guard.test.ts` — 20 tests, `security-headers.test.ts` — 8 tests)
  are covered by `npm run test` (121 tests green).
- **Threat notes:** the vector layer is a development artefact and is never
  embedded in a release build (`docs/design/PLATFORM-ARCHITECTURE.md` § 2.2).
  No vector contains a secret, no personal data and no network address.
- **What was **not** tested:** the anti-spoiler boundary of the _payload_
  (CORE-106 — "the payload contains no field that carries the song identity")
  is **not measured**: the vectors check the rules, not the marshalling of a
  bridge. NOT RUN with the reason above.

---

## 6. Interoperability

- **Reading the data back:** the corpus is read by **both** runners from the
  same source — `index.json` plus one file per case.
  **Evidence:** `tools/conformance/lib/loader.ts` (the TypeScript side),
  `tools/conformance-runner/src/corpus.rs` (the Rust side).
- **Third-party viewers / editors / devices:** not applicable — the corpus is
  JSON with a JSON schema (`core/phomu-conformance/vectors/web-shell/schema.json`).
- **Round trip (write → read → write):** yes, for the result format — both
  runners write `{runner, schemaVersion, results[]}` and the gate reads both
  files. **Evidence:** `tmp/conformance-ts.json` and `tmp/conformance-rust.json`.
- **Integrity of saves and restores:** **not measured** (the persistence of a
  session is not part of this work order).
- **Formats, versions, external systems:** the result format carries
  `schemaVersion: 1`; the vector format carries `schemaVersion: 1` and the
  state of the base carries `SCHEMA_VERSION`. Two vector corpora exist under
  `core/phomu-conformance/vectors/` — the corpus of the base (10 vectors, the
  contract behaviour, proven by `cargo test -p phomu-conformance`) and the
  corpus of the web shell (70 vectors, the reference behaviour, proven by the
  gate). They share the format, not the index.

---

## 7. Known limitations

| ID   | Limitation                                                                                                                                                                                                  | Effect                                                                                                                                                                                                                               | Tracked in                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| L-01 | The expectations of the corpus were **derived from the reference implementation** and checked against the contract afterwards — they are not an independent oracle written from the specification.          | A mistake that is in the reference _and_ in the expectation is not detected. The spot checks against the contract cover the point values (5/4/3/2/1, 4, 2, 3, 2/1, [5,4,3,2], 3), the phase sequence and the ending conditions.      | Owner (review of the corpus)                                    |
| L-02 | The Rust base is under **active development** — the platform worker changed `core/phomu-core` and `core/phomu-conformance` during this measurement (12:26–12:30 UTC).                                       | The numbers of this document are a snapshot. The corpus of the base and `KNOWN_DIVERGENCES` must be re-synced after every change of the base — the crate's test is the tripwire.                                                     | Platform worker                                                 |
| L-03 | The base now locks the answers in and enters `locked-in` (GAME-002, deviation A6). The **web shell** does not — the open decision E3 of the contract (`docs/design/GAME-CONTRACT.md` § 11.5) is still open. | The two implementations differ in 28 of the 64 portable vectors — in the phase sequence only. The owner has to decide whether the web shell implements the lock (then the 28 vectors become identical) or whether the base drops it. | Owner (E3)                                                      |
| L-04 | The mode rotation and the team shuffle use different random algorithms; no shared algorithm and no shared seed are defined.                                                                                 | The two vectors of the area `divergence` are not comparable. The corpus uses exactly one mode per portable vector to keep the rest comparable.                                                                                       | Owner (a shared PRNG and seed, CORE-113)                        |
| L-05 | The reference ignores misuse **silently** (`game-store.ts`:462-463, 606-615); the base answers with a typed error (CORE-111).                                                                               | Three error vectors are marked as not portable and are therefore not compared.                                                                                                                                                       | Owner (the deliberate strictness of the base)                   |
| L-06 | The TypeScript runner needs `tsx`; it is **not** a declared devDependency — `npx tsx` resolves it from the npm cache or downloads it.                                                                       | The gate fails with exit code 2 on a machine without the package and without network.                                                                                                                                                | Owner (declare `tsx` in `devDependencies`)                      |
| L-07 | The corpus of the base was **changed** in this work (9 phase expectations + one typed error).                                                                                                               | The change encodes the behaviour that the platform worker implemented. If the owner decides differently (E3), the corpus has to be changed back.                                                                                     | Owner (confirmation of the contract behaviour)                  |
| L-08 | The bridge payload (C-1, C-3) and the persistence round trip (CORE-103) are **not** measured.                                                                                                               | The anti-spoiler guarantee is proven for the _rules_, not for the _wire_.                                                                                                                                                            | Platform worker (`docs/design/PLATFORM-ARCHITECTURE.md` § 10.3) |
| L-09 | The timeout of the question round is implemented in the base (`Session::force_reveal`) but **reachable from no shell**, and the vector vocabulary has **no timeout operation**.                             | A shell on the base cannot implement the expiry of the question round; the vectors cannot cover it. The closure needs an addition to the exported surface (a minor version bump of the ABI).                                         | Owner (OPEN-11, ADR-0009 § "Decision" 4)                        |

---

## 8. Decision

**accepted with documented limitations**

**Rationale:**

1. **The leading question is answered with a number:** of the **64** portable
   vectors of the corpus, **36** are identical on both sides and the remaining
   **28** differ **only** in the phase sequence of the round (and in one
   timeline effect). **No point value, no score and no winner differs** — the
   game is played the same way. The gate is green (exit 0), the deviation list
   of the gate is empty.
2. **The 28 differences are documented, not hidden:** they are named with their
   reason and their source in
   `core/phomu-conformance/vectors/intentional-divergences.json` and in
   `KNOWN_DIVERGENCES`, and the gate prints them with the concrete difference.
   They are the deliberate consequence of GAME-002 — the base refuses to
   release the solution before the answers are locked in.
3. **The proof is a gate, not a document:** `npm run check:conformance` runs
   both runners, compares 70 vectors field by field and fails on an
   undocumented difference. The negative test proves that it fails when it
   should (§ 1.7: red with exit code 1, green with exit code 0 after the
   revert).
4. **The Rust side has its own proof:** `cargo test --workspace` — 304 tests,
   0 failures; the corpus of the base passes completely and the list of the
   known differences fails the test when the base changes.
5. **No rule was bent to make the comparison green:** the rules of the web
   shell were not touched at all, the rules of the base were not touched by
   this work, and not a single expectation of the corpus of the web shell was
   changed.

**Conditions (open points with owner and date):**

| #   | Condition                                                                                                                                        | Owner                   | Date                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------- |
| 1   | Decide E3: does the web shell implement the reveal lock (GAME-002) or does the base drop the phase `locked-in`? 28 vectors depend on the answer. | Owner (Chief Architect) | next architecture session         |
| 2   | Declare `tsx` in `devDependencies` so that the gate runs on a fresh machine (L-06).                                                              | Owner                   | before the CI gate is switched on |
| 3   | Re-sync the corpus of the base and `KNOWN_DIVERGENCES` after every change of the base; `cargo test -p phomu-conformance` is the tripwire (L-02). | Platform worker         | continuously                      |
| 4   | Add the bridge payload test (C-1, C-3) and the persistence round trip (CORE-103) — the two gaps of the proof (L-08).                             | Platform worker         | P1                                |

**After the decision:** the acceptance path for every further change of the
base is `npm run check:conformance` (the two runners and the comparison) plus
`cargo test -p phomu-conformance` (the corpus of the base and the list of the
known differences). The corpus is a **development artefact** and is never
embedded in a release build.
