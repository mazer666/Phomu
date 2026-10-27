# QA-13 — The Conformance Deviations

**Severity of the findings in this report:** none open (the gate is green); one gap is carried forward (§ 6).
**Area:** the conformance gate between the shared Rust base and the web shell — the corpus, the two runners and the comparison.

> This report resolves the 40 deviations that the conformance gate reported on `main` and answers, for every one of them, the question **who was right**: the vector, the web shell or the Rust base. The raw output of the measurements is in [`evidence/gates/c_conformance_deviations.log`](evidence/gates/c_conformance_deviations.log).

---

## 0. What this report covers

| | |
|---|---|
| Baseline under test | branch `main`, working tree, 2026-10-27 |
| What was measured | `npm run check:conformance` — the replay of the 64 portable vectors of `core/phomu-conformance/vectors/web-shell/` against the web shell and against the Rust base |
| Commands | `npm run check:conformance`, `node scripts/analyse-conformance-deviations.mjs`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run check:all`, `cargo test --workspace` |
| What was changed | the harness of the TypeScript runner, the round log of the web shell, two regression tests, this report, the evidence log |

**What is *not* covered.** The report does not change the rules of the game and does not change the corpus. The one rule that was wrong — the condition of the round log — was changed in the shell, because the contract and the base agree and the shell was the outlier.

---

## 1. The measurement

### 1.1 Before

```
FAIL — 40 vector(s) deviate, are missing or the registry does not agree
       (64 compared, 7 identical, 40 deviating, 17 intentional deviation(s),
        6 documented divergence(s), 0 missing).
```

### 1.2 After

```
PASS — 64 portable vector(s) compared, 36 identical, 0 deviating,
       28 intentional deviation(s), 6 documented divergence(s).
```

The gate went from **40 failing vectors** to **0**. The number of the *intentional* deviations rose from 17 to 28 — **not** because new differences were accepted, but because the gate now classifies the differences that were already documented correctly. § 5.2 explains the difference.

---

## 2. The patterns and who was right

The deviations fall into three patterns. The analysis script
(`scripts/analyse-conformance-deviations.mjs`) groups every deviating vector by the fields that differ and prints the vector, its expectation, the value of the shell and the value of the base.

| Pattern | Fields that differ | Vectors (before) | Who was right |
|---|---|---|---|
| **A** | `currentSongId` | 28 | **The vector and the base.** The harness measured itself. |
| **B** | `phases` (`locked-in`) | 11 | **The base.** The difference is deliberate and documented. |
| **C** | `roundCount` | 1 | **The vector and the base.** The shell logged the wrong rounds. |

The 40 vectors were grouped as follows (a vector can carry more than one pattern):

| Group | Fields | Vectors |
|---|---|---|
| A only | `currentSongId` | 28 |
| A + B + D | `answers`, `currentSongId`, `phases`, `playerScores` | 5 |
| A + B + D | `answers`, `currentSongId`, `phases`, `playerScores`, `timelineYears` | 4 |
| A + B | `currentSongId`, `phases` | 2 |
| A + C | `currentSongId`, `roundCount` | 1 |

### 2.1 Pattern A — the song of the round (28 + 9 vectors)

**Symptom.** The shell reported `currentSongId: "s-a"` for **every** vector, the base reported `null` or the song of the vector, and the vector expected `null` or the song of the vector.

**Measurement.** Over all 70 vectors the TypeScript runner reported exactly one distinct value:

```
distinct currentSongId over all 70 vectors: ["s-a"]
the first vector: phase/drawing-to-question -> s-a
```

`s-a` is the song of the **first** vector of the corpus. Every vector observed the song of the vector before it.

**Root cause.** The harness kept the song of the round in a module variable that was never reset:

- `tools/conformance/lib/harness.ts` — `let drawnSong: PhomuSong | null = null;` was assigned in the `drawSong` operation only, and `buildSituation(vector)` — which draws the song of the situation — had its return value **discarded**.
- The commit that introduced the variable is `7943e1c` (`fix(qa): work through the QA remediation backlog`): `git show 7943e1c -- tools/conformance/lib/harness.ts` shows the change from `state.currentSong?.id` to the module variable.

**Why the shell and the base were both right.**

- The web shell holds no song: the store keeps the **question** of the round (`src/stores/game-store-rounds.ts:191-201`, `setQuestion`), and it clears it in `skipBrokenSong` (`:219-224`) and in `nextRound` (`:159-172`). The shell therefore never shows the song of the previous round in the next round — the anti-spoiler suspicion of the investigation is **not** confirmed.
- The Rust base builds a fresh session for every vector (`core/phomu-conformance/src/runner/session.rs:20-107`) and clears the song of the round at the round boundary (`core/phomu-core/src/session/rounds.rs:66`).

**Decision.** The harness was wrong, not the shell and not the base. The harness now reads the song of the round from the question of the store (`tools/conformance/lib/song.ts`), so that the runner measures the shell and not its own bookkeeping.

### 2.2 Pattern B — the phase `locked-in` (11 vectors)

**Symptom.** The base reported `phases[0]: "locked-in"`, the shell reported `"question"`.

**Decision.** The base is right, and the difference to the shell is **deliberate**. It is documented in
`core/phomu-conformance/vectors/intentional-divergences.json` under the group `a6-locked-in-phase` (24 vectors) and `c3-reveal-lock` (3 vectors). § 3 states the decision in full.

### 2.3 Pattern C — the round log (1 vector)

**Vector.** `round/next-round-logs-history` — "a round with a drawn song is written into the history".

```
typescript-vs-vector  roundCount: expected 1, actual 0
rust-vs-typescript    roundCount: typescript 0, rust 1
```

**Who was right.** The vector and the base.

- The contract requires the condition `currentSong !== null`: "a round without a drawn song is **not** logged" (`docs/design/GAME-CONTRACT.md` § 6.3; `REQUIREMENTS.md`, GAME-005).
- The base implements exactly that: the round is logged when the round has a song (`core/phomu-core/src/session/rounds.rs:43-57`), and the Rust test `a_round_without_a_song_is_not_logged` proves the counterpart (`core/phomu-core/tests/round_automaton.rs:235`).
- The shell logged a round only when a **reveal** existed (`currentReveal !== null` in `src/stores/game-store-rounds.ts`). A round with a drawn song and without a reveal was therefore not logged — a deviation from the contract.

**Decision.** The shell was wrong and was corrected: the condition is now the drawn song (`currentQuestion !== null`), and the identity of the log entry is `null` when the reveal has not been released. The type of the log entry allows it (`src/types/game-state.ts:140`).

---

## 3. The phase `locked-in` — the deliberate difference

**The decision.** The base enters the phase `locked-in`; the web shell does not. The difference is deliberate and stays.

**Why.**

1. The contract names the phase and names the gap: "`locked-in` | all answers submitted, waiting for the reveal | **nobody** — the value exists but is never set" (`docs/design/GAME-CONTRACT.md` § 2.1) and the deviation **A6**: "`locked-in` is typed but never entered; there is **no** `answersLocked` flag" (`docs/design/GAME-CONTRACT.md` § 11.1). The open question of the contract — "E3: should `locked-in` be implemented or removed from the type?" (§ 11.4) — is answered by the base: it is **implemented**.
2. The base implements the lock structurally: the last expected answer locks the round in (`core/phomu-core/src/session/answers.rs:157-160`) and the reveal is refused until the lock is set (`core/phomu-core/src/session/answers.rs:243-249`). The Rust tests `the_reveal_is_refused_before_the_answers_are_locked_in` and `the_answer_locks_the_round_in` prove it (`core/phomu-core/tests/round_automaton.rs:88` and `:151`).
3. The anti-spoiler guarantee is the reason: the question of the core carries no field for the solution (`core/phomu-core/tests/anti_spoiler.rs:85`), so the solution must not be released while an answer could still arrive.
4. The base is not a dead end: the timeout is a command of its own (`Session::force_reveal`), so a round that nobody answered can be closed (`core/phomu-core/src/session/answers.rs:255-299`; `core/phomu-core/tests/phase_escape.rs:272`).

**What the vectors say about it.** The corpus documents the behaviour of the **reference implementation**, and the two differences are named in `core/phomu-conformance/vectors/intentional-divergences.json`:

| Group | Vectors | The difference | The side that deviates on purpose |
|---|---|---|---|
| `a6-locked-in-phase` | 24 | the base enters `locked-in`, the shell does not | **The base** — it closes the deviation A6 of the contract |
| `c3-reveal-lock` | 3 | the base refuses the reveal until the answers are locked in, the shell sets the phase | **The base** — the refusal is the anti-spoiler guarantee (C-3, GAME-002) |
| `phase-locked-in-declared` | 1 (not portable) | the shell can set `locked-in`, the base refuses the transition | **The shell** — the vector is marked as not portable |

The only vector that **expects** the phase `locked-in` is
`core/phomu-conformance/vectors/web-shell/phase-locked-in-declared.json`; it is marked `portable: false` and is listed in the group `phase-locked-in-declared`. The vectors of the groups `a6-locked-in-phase` and `c3-reveal-lock` expect the behaviour of the shell and are named in the divergence list — the gate reports them with their concrete difference and does not fail.

---

## 4. Are the vectors stale?

**Question.** Some vectors were written against the behaviour of the base **before** the correction of the deadlock (`docs/qa/QA-11-RUST-BASE.md`, QA-RST-002). A vector that describes a behaviour the base changed on purpose is stale and has to be corrected.

**Measurement.** The correction of the deadlock is the commit `0a28153` (`fix(core): close the deadlock of an unanswered round and export the timeout`). Its diff on the base touches two files:

- `core/phomu-core/src/rules/phase.rs` — **adds** `RoundPhase::from_str`, a total lookup of the identifier of a phase. No behaviour of the automaton changed.
- `core/phomu-core/src/session/answers.rs` — **rewrites** `force_reveal`: it now refuses outside the question round and returns the round view when the round is already in the phase `reveal`. The command itself is the **escape** that the correction added.

The correction **added** a command; it did not change the behaviour that the corpus observes. The three vectors of the group `c3-reveal-lock` still describe the refusal of the reveal, and the refusal is still there.

**Result.** **No vector of the corpus is stale.** The expectation of every one of the 64 portable vectors is now confirmed by at least one implementation — the report of the gate contains no `rust-vs-vector` difference at all (`grep -c "rust-vs-vector" tmp/conformance-report.txt` → `0`). The expectation of no vector was changed, so no vector needed a change note.

---

## 5. What was changed

### 5.1 The corrections

| # | Where | What | Why |
|---|---|---|---|
| 1 | `tools/conformance/lib/harness.ts` | the song of the round is no longer kept in a module variable; the return value of `buildSituation` is used | the runner measured itself instead of the shell (28 + 9 vectors) |
| 2 | `tools/conformance/lib/situation.ts` | `buildSituation` returns the songs of the vector instead of the song of the round | the harness needs the songs of the vector to evaluate the rules of a mode |
| 3 | `tools/conformance/lib/song.ts` (new) | the song of the round is resolved from the question of the store | the song belongs to the store; a mirror in the harness would survive the actions that clear the song |
| 4 | `src/stores/game-store-rounds.ts` | the round is logged when a **song** is drawn, not when a **reveal** exists; the identity of the entry is `null` without a reveal | the contract (GAME-005) and the base agree; the shell was the outlier (1 vector) |
| 5 | `src/stores/game-store-rounds.test.ts` (new) | 5 tests: the round log, the identity, the cleared question | the regression of correction 4 |
| 6 | `tools/conformance/lib/harness.test.ts` (new) | 4 tests: every vector observes its own song | the regression of corrections 1–3 |
| 7 | `vitest.config.ts` | the tests of `tools/**` are part of the run | the harness is measured like the rest of the code |

**Corrections in the Rust base: 0. Corrections in the corpus: 0.**

### 5.2 The number of the intentional deviations rose from 17 to 28

The file `core/phomu-conformance/vectors/intentional-divergences.json` was **not** changed: it already named every deliberate difference with the side that deviates and the reason. The **number of the vectors** that the gate classifies as intentional rose, because the classification depends on the fields that differ:

- Before, 11 vectors of the groups `a6-locked-in-phase` and `c3-reveal-lock` differed **in addition** in the field `currentSongId` — a field that their group does not name. The gate therefore classified them as undocumented deviations (`the vector is listed as an intentional deviation (a6-locked-in-phase), but the difference touches the field(s) currentSongId, …`) and the gate failed.
- After the correction of the harness, these 11 vectors differ **only** in the fields that their group names. They are classified as intentional deviations and the gate passes.

The 11 vectors are: `cover/no-hints`, `cover/two-hints`, `cover/three-hints`, `cover/wrong-artist`, `cover/variation-correct`, `cover/variation-wrong`, `decay/within-grace`, `decay/one-step`, `decay/minimum`, `lyrics/bonus-claimed`, `timeline/points-cap`.

**No difference was defined away.** Every one of the 28 intentional deviations is named in the divergence file with the side that deviates and the reason, and the registry of the crate (`core/phomu-conformance/src/lib.rs`, `KNOWN_DIVERGENCES`) holds the same list — the gate compares the two lists and fails when they drift apart.

---

## 6. What is still open

| # | Item | Evidence | Why it is open |
|---|---|---|---|
| 1 | **The corpus has no vector for the timeout.** | QA-RST-002 asks for it ("a conformance vector covers the timeout"); the commit `0a28153` claims it in its message, but `core/phomu-conformance/vectors/web-shell/` holds no vector with a timeout operation and the vector format has no such operation (`tools/conformance/lib/types.ts:103-143`). The timeout is proven by the Rust tests only (`core/phomu-core/tests/round_automaton.rs:118`, `core/phomu-core/tests/phase_escape.rs:272`). | The vector format has no `timeout` operation; both runners would have to learn it. The gate cannot see the escape of the base. |
| 2 | **The web shell still has no `locked-in`.** | `src/stores/game-store-rounds.ts` — the shell types the phase (`src/types/game-state.ts`) but no flow enters it. | The shell consumes the base over wasm; the phase enters the shell with the state of the base. Until the shell reads the phase of the base, the difference stays — and it stays documented. |
| 3 | **The gate is not part of `npm run check:all`.** | `scripts/check-all.mjs` lists eight gates; the conformance gate is not one of them. It runs in the CI job `conformance` (`.github/workflows/ci.yml:262`). | The gate needs `cargo`, therefore it does not fit into the gate group that runs without a Rust toolchain. |
| 4 | **The lint of the tree is red — in a parallel area.** | `src/components/game/GameBody.test.ts:96` (`react/no-children-prop`) — a file of the stream that owns `src/components/**`; it is not part of this change. | The file belongs to another stream. |

---

## 7. The reproduction

```bash
# the gate
npm run check:conformance

# the analysis of the deviations, grouped by pattern
node scripts/analyse-conformance-deviations.mjs

# the tests of the corrections
npx vitest run src/stores/game-store-rounds.test.ts tools/conformance/lib/harness.test.ts

# the base
export PATH="$HOME/.cargo/bin:$PATH"
cargo test --workspace
```

The raw output of the measurements is in
[`evidence/gates/c_conformance_deviations.log`](evidence/gates/c_conformance_deviations.log).
