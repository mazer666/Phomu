# QA-11 — The Shared Rust Base

**Severity of the findings in this report:** P1, P1, P1, P2, P2, P2, P2, P2, P3, P3, P3
**Area:** The shared Rust base of Phomu — the 13 crates, the rules they own, the three bridges that expose them, and the gates that cover them.

> This report closes the scope gap that [`QA-00-EXECUTIVE-SUMMARY.md`](QA-00-EXECUTIVE-SUMMARY.md) § 0b declared: the Rust base landed **after** the measurement baseline of the assessment and was **never audited**. Item 2.10 of [`QA-09-REMEDIATION-BACKLOG.md`](QA-09-REMEDIATION-BACKLOG.md) asked for exactly this report.
>
> Everything below was measured with a Rust toolchain against a pinned commit. No production code was changed. The only file this assessment added to the repository is this report and the raw gate output in `docs/qa/evidence/gates/`.

---

## 0. Why this report exists, and what it covers

The assessment that produced QA-00 … QA-10 measured the Next.js/TypeScript web shell at `9639c762`. The Cargo workspace arrived afterwards, in commit `be984cdc5`, and QA-00 § 0b says so in plain words:

> The Rust base is **not** audited here. It landed after the measurement baseline was fixed, and the sandbox has no Rust toolchain, so no `cargo build`, `cargo test`, `cargo clippy` or `cargo fmt` was executed against it.

So the headline of the whole assessment — *"the fix for the biggest finding already exists in this repository"* (QA-SPO-001, P0) — was, until now, a statement about **source code that had never been compiled**. A Rust base that does not compile would make the statement worthless. This report compiles it, runs it, and measures what the bridges actually export.

### What was measured, and against what

| | |
|---|---|
| Baseline under test | `0903997a0df38cfb1fe465c47f0958bbb5a63188` — *"chore(docs): remove the duplicated pre-reform specifications"*, branch `main` |
| How it was isolated | `git archive HEAD` into `/tmp/phomu-qa-src` — a pristine tree, so that the work of other agents in the working copy could not influence a measurement |
| Toolchain | `cargo 1.99.1 (5f94df478 2026-08-27)`, `rustc 1.99.1 (58cf8f9c3 2026-10-13)` |
| Commands | `cargo build --workspace`, `cargo test --workspace`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo fmt --check`, `cargo doc --workspace --no-deps`, `cargo build --target wasm32-unknown-unknown -p phomu-wasm --release`, `npm run check:crate-boundaries`, `npm run check:crate-boundaries:test`, `npm run check:conformance` |

**Why a pinned commit and not the working copy.** While this assessment was running, another agent was splitting `core/phomu-conformance/src/runner.rs` into a directory. A first clippy run against the working copy failed with two unused-import errors (`core/phomu-conformance/src/runner.rs:27`, `core/phomu-conformance/src/runner/execute.rs:18`) — an in-flight refactor, not a defect of the audited state. Every number below therefore comes from the pinned commit. This is also the correct baseline for a report that other people have to reproduce.

**What is *not* covered.** No Android app, no iOS app, no desktop shell exists in this repository yet (`apps/android` contains Gradle scaffolding and no Rust crate that the boundary gate can see). The behaviour of the base on a real device, on a real network and with a real catalogue was **not verified** — there is nothing to verify it against. The Kotlin and Swift bindings are checked as *generated text*, not executed: this environment has no JVM and no Swift toolchain, which the test file itself states (`platform/phomu-ffi/tests/generated_bindings.rs:14-17`).

---

## 1. Measured baseline

| Metric | Value | Source |
|---|---|---|
| Crates in the workspace | **13** (7 `core`, 3 `platform`, 3 `tools`) | `Cargo.toml` members; `npm run check:crate-boundaries` |
| Rust source files | **113** `.rs` | `find core platform tools -name '*.rs'` |
| Rust source lines | **21,369** | `wc -l` over the same set |
| Dependency edges between crates | **22** | `npm run check:crate-boundaries` |
| Crates with `#![deny(missing_docs)]` | **12 of 12** libraries | `grep` over every `lib.rs` |
| Crates with `#![forbid(unsafe_code)]` | **11 of 12** (the C-ABI bridge excepted — QA-RST-008) | `grep` over every `lib.rs` |
| `cargo build --workspace` | **exit 0**, cold build **6 m 43 s** | [`evidence/gates/r_build.log`](evidence/gates/r_build.log) |
| `cargo test --workspace` | **exit 0**, **304 tests**, 0 failed, 0 ignored | [`evidence/gates/r_test.log`](evidence/gates/r_test.log) |
| `cargo clippy --workspace --all-targets -- -D warnings` | **exit 0**, **0 warnings**, 0 errors | [`evidence/gates/r_clippy.log`](evidence/gates/r_clippy.log) |
| `cargo fmt --check` | **exit 0**, no output | [`evidence/gates/r_fmt.log`](evidence/gates/r_fmt.log) |
| `cargo doc --workspace --no-deps` | **exit 0**, **0 warnings**, 25.63 s, 15 crates documented | [`evidence/gates/r_doc.log`](evidence/gates/r_doc.log) |
| `cargo build --target wasm32-unknown-unknown -p phomu-wasm --release` | **exit 0**, 1 m 56 s — **not in CI** | [`evidence/gates/r_wasm_build.log`](evidence/gates/r_wasm_build.log) |
| Crate-boundary gate | **exit 0**, 13 crates, 22 edges, 0 violations | [`evidence/gates/r_crate_boundaries.log`](evidence/gates/r_crate_boundaries.log) |
| Negative self-test of that gate | **exit 0**, **12 of 12 assertions** | [`evidence/gates/r_crate_boundaries_selftest.log`](evidence/gates/r_crate_boundaries_selftest.log) |
| Conformance gate | **exit 0**, 70 vectors, 64 compared, 36 identical, 0 deviating, **28 intentional**, 6 documented | [`evidence/gates/r_conformance.log`](evidence/gates/r_conformance.log) |
| `.rs` files over the 550-line hard limit | **2** | `wc -l` |
| `.rs` files the file-size gate sees | **0** | QA-RST-006 |
| `phomu_*` functions the WebAssembly module exports | **3** | [`evidence/gates/r_wasm_exports.log`](evidence/gates/r_wasm_exports.log) |

### 1.1 The test count, in detail

304 tests, split by the kind of test binary cargo reports:

| Kind | Binaries | Tests | Failed | Ignored |
|---|---|---|---|---|
| Unit tests (`unittests src/lib.rs`, `src/main.rs`, `src/bin/*.rs`) | 17 | 187 | 0 | 0 |
| Integration tests (`tests/*.rs`) | 11 | 95 | 0 | 0 |
| Doc tests | 12 | 22 | 0 | 0 |
| **Total** | **40** | **304** | **0** | **0** |

The largest single binary is `phomu_core` with 104 unit tests. The corpus of 70 web-shell vectors is not a test binary of its own — it is replayed by the Rust conformance runner (`core/phomu-conformance/tests/conformance.rs`, 3 tests) and by the gate (§ 12).

**No test is skipped and no test is marked `ignore`.** The count of ignored tests is 0 across all 40 binaries — a fact worth stating explicitly, because an ignored test is a hole that looks like coverage.

---

## 2. The five cargo gates — the raw output

The raw output of every run is in `docs/qa/evidence/gates/`. The decisive lines, quoted verbatim:

**Build** — [`evidence/gates/r_build.log`](evidence/gates/r_build.log)

```
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 6m 43s
=== EXIT CODE: 0 ===
```

**Test** — [`evidence/gates/r_test.log`](evidence/gates/r_test.log)

```
running 104 tests
test result: ok. 104 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
...
all doctests ran in 1.21s; merged doctests compilation took 1.20s
=== EXIT CODE: 0 ===
```

**Clippy** — [`evidence/gates/r_clippy.log`](evidence/gates/r_clippy.log)

```
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.83s
=== EXIT CODE: 0 ===
```

The file contains **no** line starting with `warning` and **no** line starting with `error`. The deny list of the workspace (`Cargo.toml`, `[workspace.lints.clippy]`: `unwrap_used`, `expect_used`, `indexing_slicing`, `panic`, `todo`, `unimplemented`) is therefore not merely declared — it is enforced. The first run of this gate was cold and took 5 m 20 s; the captured file is the second run, which reused the build cache. Both produced the same result.

**Format** — [`evidence/gates/r_fmt.log`](evidence/gates/r_fmt.log)

```
=== COMMAND: cargo fmt --check ===
=== EXIT CODE: 0 ===
```

No file needed reformatting.

**Documentation** — [`evidence/gates/r_doc.log`](evidence/gates/r_doc.log)

```
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 25.63s
   Generated /tmp/phomu-qa-target2/doc/catalog_tool/index.html and 14 other files
=== EXIT CODE: 0 ===
```

No rustdoc warning. 15 crates documented.

### 2.1 What the green gates do *not* prove

Three things are worth stating, because "the gates are green" is otherwise easy to over-read:

1. **The clippy gate does not see the WebAssembly target.** `cargo clippy --workspace --all-targets` runs for the host target. The crate that exists for the browser is built for the browser nowhere in CI (QA-RST-007). It compiles today — I built it — but nothing keeps it that way.
2. **`cargo doc` does not fail on rustdoc warnings.** The CI step is `cargo doc --workspace --no-deps` without `RUSTDOCFLAGS="-D warnings"`. Today there are 0 warnings, so the difference is theoretical; it is listed as part of QA-RST-007 because the gate is supposed to be the proof, and a warning that only prints is not a proof.
3. **The build gate is not a release build.** `cargo build --workspace` builds the `dev` profile. `cargo build --workspace --release --lib` (which the CI runs additionally) was not part of the measurement, because the audit asked for the five commands listed above.

### 2.2 The state of the JavaScript gates while this report was written

Two of the gates of `npm run check:all` are red in the working tree — and neither has anything to do with this assessment. The evidence is in [`evidence/gates/r_gates_working_tree.log`](evidence/gates/r_gates_working_tree.log):

| Gate | At the pinned commit `0903997a` | In the working tree |
|---|---|---|
| File size | **exit 0** — 0 errors, 11 warnings | exit 1 — 3 errors |
| i18n completeness | **exit 0** — 0 violations | exit 1 — 1 violation |

The three file-size findings name `src/stores/game-store.ts`, `platform/phomu-wasm/src/lib.rs` and `platform/phomu-wasm/src/session.rs`; the i18n finding names `src/components/ui/Tooltip.test.tsx:47`. All five files are modified or new in the working tree — **by the concurrent work of other agents**, not by this assessment. `git status` at the time of the measurement:

```
 M platform/phomu-wasm/Cargo.toml
 M platform/phomu-wasm/src/catalogue.rs
 M platform/phomu-wasm/src/lib.rs
 M platform/phomu-wasm/src/session.rs
 M platform/phomu-wasm/tests/roundtrip.rs
 M scripts/check-file-size.mjs
 M src/stores/game-store.ts
?? platform/phomu-wasm/src/answer.rs
?? platform/phomu-wasm/src/round.rs
?? scripts/file-size.exceptions.json
?? src/components/ui/Tooltip.test.tsx
```

The gates that **do** cover the files of this assessment — the documentation language check, the documentation link check, the crate boundary gate, the module boundary gate and the licence check — are all green, with the documentation language check reporting 0 findings over 75 Markdown files and the link check reporting no dead link over 92 files.

**A note on the concurrent work.** The working tree shows the WebAssembly bridge being extended (`platform/phomu-wasm/src/answer.rs` and `src/round.rs` are new, `src/lib.rs` and `src/session.rs` have grown by roughly 250 lines). That is the shape of a fix for QA-RST-001. This report measures the **pinned commit**, so it is unaffected — but the owner should re-run QA-11 against the result before closing the finding.

---

## 3. Rule origin — is every rule in the base only?

**No. Every one of the six mode rules exists twice: once in the web shell and once in the base.**

| Rule | Web shell | Rust base |
|---|---|---|
| Point value of the six modes | `src/utils/mode-rules.ts:22-54` | `core/phomu-config/src/scoring.rs:16-116` |
| Hint-Master level values | `src/config/game-config.ts:310` | `core/phomu-config/src/scoring.rs:31` |
| Maximum points of the timeline | `src/config/game-config.ts:63` | `core/phomu-config/src/scoring.rs:16` |
| Cheat penalties | `src/utils/mode-rules.ts:42-51` | `core/phomu-config/src/scoring.rs:158-176` |
| Threshold of the year removal | `src/utils/mode-rules.ts:54` | `core/phomu-config/src/scoring.rs:197` |
| Valid timeline slots | `src/utils/mode-rules.ts:65-88` | `core/phomu-core/src/modes/timeline.rs:26` |
| Points of the timeline | `src/utils/mode-rules.ts:110-112` | `core/phomu-core/src/modes/timeline.rs:63` |
| Hint-Master award | `src/utils/mode-rules.ts:151-161` | `core/phomu-core/src/modes/hint_master.rs:38` |
| Lyrics award | `src/utils/mode-rules.ts:170-175` | `core/phomu-core/src/modes/lyrics.rs:60-81` |
| Vibe-Check award | `src/utils/mode-rules.ts:196-210` | `core/phomu-core/src/modes/vibe_check.rs:44-56` |
| Survivor award | `src/utils/mode-rules.ts:219-225` | `core/phomu-core/src/modes/survivor.rs:21` |
| Cover Confusion award | `src/utils/mode-rules.ts:245-253` | `core/phomu-core/src/modes/cover_confusion.rs:44-56` |
| Time decay | `src/utils/mode-rules.ts:286-316` | `core/phomu-core/src/session/ending.rs:25` |
| The single entry point of the rules | `src/utils/mode-rules.ts:365-416` | `core/phomu-core/src/modes/evaluate.rs:34-100` |

**What I checked, and what I found.** I compared every constant that exists on both sides. All twelve comparable values are **identical**:

| Constant | Web shell | Rust base | Equal |
|---|---|---|---|
| Lyrics points | `4` (`mode-rules.ts:23`) | `4` (`scoring.rs:37`) | yes |
| Lyrics bonus points | `2` (`:26`) | `2` (`:43`) | yes |
| Survivor points | `3` (`:29`) | `3` (`:49`) | yes |
| Vibe-Check points / cheated | `2` / `1` (`:32-33`) | `2` / `1` (`:55,61`) | yes |
| Cover Confusion by hints | `[5,4,3,2]` (`:39`) | `[5,4,3,2]` (`:71`) | yes |
| Cover Confusion variation | `3` (`:36`) | `3` (`:77`) | yes |
| Hint-Master levels | `[5,4,3,2,1]` (`game-config.ts:310`) | `[5,4,3,2,1]` (`scoring.rs:31`) | yes |
| Timeline max points | `5` (`game-config.ts:63`) | `5` (`scoring.rs:16`) | yes |
| Cheat penalties | `-2,-1,-2,-1` (`:42-51`) | `-2,-1,-2,-1` (`:158-176`) | yes |
| Removal threshold | `10` (`:54`) | `10` (`:197`) | yes |

The base's own documentation is honest about the origin: every constant in `core/phomu-config/src/scoring.rs` cites the place in the shell it was copied from — for example `core/phomu-config/src/scoring.rs:35-37`:

```rust
/// The points for a correctly identified fake lyric line
/// (`src/components/game/modes/LyricsMode.tsx:21`).
```

**But that citation is stale** — the rules were extracted from the components into `src/utils/mode-rules.ts` (see the header of that file, `src/utils/mode-rules.ts:2-14`). See QA-RST-010.

**Two constants exist only in the base and have no counterpart in the shell:** `TIMELINE_JOKER_MIN_SLOTS = 4` (`core/phomu-config/src/scoring.rs:185`) and `TIMELINE_INITIAL_YEARS = 3` (`core/phomu-config/src/scoring.rs:191`). Both are used (`core/phomu-core/src/modes/timeline.rs:109`, `core/phomu-core/src/session/rounds.rs:225`). The second one is a rule the shell does not have at all: the shell starts with an empty timeline (`src/stores/game-store.ts:152`), the base insists on exactly three years.

**One difference in strictness, not in values.** The shell's `evaluateModeAnswer` dispatches on the *shape of the answer* alone (`src/utils/mode-rules.ts:371`); the base dispatches on the *pair* of mode and answer (`core/phomu-core/src/modes/evaluate.rs:40`). An answer of the wrong shape for the running mode is therefore a typed error in the base and a silently wrong result in the shell. The base is stricter; the corpus does not exercise this case.

**Conclusion.** The base is not yet the single source of truth for the rules — it is a **second, currently faithful copy**. Nothing but the conformance corpus keeps the two in step, and the corpus covers *behaviour*, not *constants*. This is QA-RST-009.

---

## 4. The anti-spoiler guarantee — state machine, not rendering

This is the property that makes the base worth having, so it was checked at the level of the state machine and not at the level of the view model.

**The type system carries the guarantee.** `QuestionView` (`core/phomu-core/src/spoiler/view.rs:128-140`) has five fields — `round_number`, `mode`, `prompt`, `points_possible`, `answers_locked` — and **no field of any type that could carry the solution**. The solution lives in a different type, `SongSolution` (`core/phomu-core/src/spoiler/view.rs:40-47`), which appears only in `RevealView` (`core/phomu-core/src/spoiler/view.rs:149-160`). `Prompt` is an enumeration with two variants: `Hidden` and `IdentityDisclosed` (`core/phomu-core/src/spoiler/view.rs:56-75`). There is no third possibility.

**The automaton carries it.** The transition table is `RoundPhase::can_transition_to` (`core/phomu-core/src/rules/phase.rs:78-90`). The normal path is `question → locked-in → reveal`; the short path `question → reveal` exists only for the timeout. The lock is enforced in the state machine:

- `Session::lock_answers` (`core/phomu-core/src/session/answers.rs:210-228`) refuses with `AnswersNotLocked` while fewer than the expected number of answers is in, and only then sets `answers_locked` and enters the phase `locked-in`.
- `Session::reveal` (`core/phomu-core/src/session/answers.rs:243-253`) refuses with `AnswersNotLocked` while `answers_locked` is false.
- `Session::submit_answer` (`core/phomu-core/src/session/answers.rs:92-96`) refuses an answer in a locked round, and `RoundPhase::accepts_answers` (`core/phomu-core/src/rules/phase.rs:99-101`) accepts answers only in the phase `question`.

**Is the check a pure function without dependencies?** The censoring is: `censor_hint` (`core/phomu-core/src/spoiler/censor.rs`) takes a hint, an artist and a title and returns a censored hint. It is applied where the prompt is built (`core/phomu-core/src/session/prompt.rs:128`), inside the base, so every platform censors identically.

**Does the test actually exercise it?** Yes — `core/phomu-core/tests/anti_spoiler.rs` has 8 tests, and they are not vacuous:

| Test | What it proves |
|---|---|
| `the_question_payload_never_contains_the_title_or_the_year` (`:43`) | For every mode that does not declare that it discloses the identity, the question payload contains neither the title nor the year |
| `the_question_payload_hides_the_artist_in_every_mode_but_the_declared_ones` (`:63`) | The artist is hidden in every mode except the two that declare it |
| `the_vibe_check_declares_that_it_discloses_the_identity` (`:78`) | The exception belongs to the mode, not to the rendering |
| `the_question_view_has_no_field_for_the_solution` (`:85`) | The question view carries no identity at all |
| `the_reveal_payload_carries_the_solution` (`:115`) | The reveal is the first phase that carries the solution |
| `the_hints_of_the_question_are_censored` (`:135`) | The censoring really happens |
| `the_persistable_set_contains_no_field_of_the_song` (`:158`) | No field of the song may be persisted |
| `the_persistable_set_holds_the_expected_fields` (`:169`) | The persistable set is the expected one, and `currentSong` and `roundHistory` are **not** in it |

The test walks `GameMode::ALL` and drives a real session through `start_game` → `draw_song`, so it exercises the state machine and not a hand-built view model.

**Verdict on this question: the guarantee is real and it is in the right place.** The one place where it does not hold is the *bridge*, and that is a separate finding — QA-RST-002.

---

## 5. The error hierarchy

**There is one hierarchy, and it is well made.**

`core/phomu-errors/src/lib.rs` defines a closed enumeration `ErrorCode` (`:55-126`) with **30 codes** in five numbered ranges (`:21-27`):

| Range | Meaning | Codes |
|---|---|---|
| `1000..=1099` | the input or the configuration is wrong | 10 |
| `1100..=1199` | the state or the phase does not allow the operation | 9 |
| `1200..=1299` | the catalogue is empty, incomplete or inconsistent | 5 |
| `1300..=1399` | the media could not be played | 5 |
| `1400..=1499` | an internal invariant was violated | 1 |

`PhomuError` (`:252-255`) carries the code and an ordered list of context pairs; `Result<T>` (`:228`) is the only fallible return type of the base. Every `Result` in `core/phomu-core/` returns `phomu_errors::Result` — I found no second error type in the workspace.

Three properties are worth crediting:

1. **The message key is derived from the code** (`core/phomu-errors/src/lib.rs:184-217`), so a code and its key cannot drift apart. The base never assembles a sentence; it names a key and the shell resolves the text.
2. **The numbers are the ABI.** A retired code keeps its number, a new code gets a new number at the end of its range (`:9-17`). The bridges hand the number to the shell.
3. **The taxonomy is tested against itself.** `core/phomu-errors/src/lib.rs:353-375` asserts that every code has a distinct number, that every code is listed in `ALL`, and that every code has a distinct message key.

**One weakness.** The numbering is stable, but the *ordering* is not enforced: nothing checks that a new code is appended at the end of its range rather than inserted in the middle. The rule is written in the documentation (`:9-17`) and not in a gate. That is a P3 observation and is folded into QA-RST-010 rather than given a separate number.

---

## 6. `unwrap`, `expect`, `panic!`, `todo!`, `unimplemented!`

The command from the assignment:

```
grep -rn "unwrap()\|expect(\|panic!\|todo!\|unimplemented!" core/ platform/ tools/
```

**Result: every hit is inside a `#[cfg(test)]` module or a doc comment. Not one is on a reachable production path.**

I verified this two ways. First by reading every hit:

| File:line | What it is |
|---|---|
| `core/phomu-conformance/src/vector.rs:790` | inside `mod tests` (`:780`) |
| `core/phomu-media/src/plan.rs:291` | inside `mod tests` (`:245`) |
| `tools/conformance-runner/src/corpus.rs:79-80` | inside `mod tests` (`:71`) |
| `tools/conformance-runner/src/loader.rs:60,66,69,78,93,95,109,111` | inside `mod tests` (`:51`) |
| `core/phomu-core/src/facade.rs:45`, `core/phomu-core/src/lib.rs:31`, `core/phomu-conformance/src/lib.rs:22-24` | inside doc comments (the examples) |

Second, and decisively: the workspace denies `unwrap_used`, `expect_used`, `indexing_slicing`, `panic`, `todo` and `unimplemented` (`Cargo.toml`, `[workspace.lints.clippy]`), and `cargo clippy --workspace --all-targets -- -D warnings` reports **0 warnings** ([`evidence/gates/r_clippy.log`](evidence/gates/r_clippy.log)). The deny list is not decoration — it is enforced across every target, including the tests.

The `#[expect(...)]` attributes that the raw grep also matches (`core/phomu-catalog/src/model.rs:57,115,170`, `core/phomu-core/src/modes/mod.rs:92`, `core/phomu-core/src/rules/teams.rs:59`, `core/phomu-core/src/rules/winner.rs:62`) are lint attributes with a written reason, not `expect()` calls.

**Verdict: clean.** This is the strongest part of the base.

---

## 7. `unsafe`

The command from the assignment:

```
grep -rn "unsafe" core/ platform/ tools/
```

**Result: 11 of the 12 libraries carry `#![forbid(unsafe_code)]`.** The exception is the C-ABI bridge, and it is discussed in QA-RST-008.

Inside `platform/phomu-capi/` the `unsafe` is confined to two files and is the unavoidable kind: `extern "C"` signatures that carry raw pointers (`platform/phomu-capi/src/lib.rs:116,140,158,179,196,210`; `platform/phomu-capi/src/session.rs:21,65,82,101,124,152,169,188`). Every one of them carries a `# Safety` comment that names the guarantee the caller has to give, and every `unsafe` block inside them repeats the reasoning. The implementation of the pointer handling is in `platform/phomu-capi/src/buffer.rs:56-98` and is null-checked before use (`text_of` returns an empty string for a null pointer, `:57-59`).

The base itself — `core/phomu-core`, `core/phomu-catalog`, `core/phomu-config`, `core/phomu-errors`, `core/phomu-i18n`, `core/phomu-media`, `core/phomu-conformance` — has **no `unsafe` at all**, and cannot grow any: `forbid` cannot be overridden from within the crate.

---

## 8. The bridges and the facade

The facade is the single public surface of the core (`core/phomu-core/src/lib.rs:31-38`): every module except `facade` is private, so Rust's own module privacy — not a convention — enforces that "the bridges export the facade and nothing else". `core/phomu-core/src/facade.rs:49-85` re-exports **83 items** in 21 `pub use` statements; that list is the surface.

### 8.1 What each bridge exports

| Bridge | Exported symbols | Surface list | Fingerprint | Test |
|---|---|---|---|---|
| `phomu-ffi` (UniFFI) | 17 functions, 18 types | `platform/phomu-ffi/src/surface.rs:26-66` | yes (`:76`) | the generated Kotlin and Swift are checked against the list (`platform/phomu-ffi/tests/generated_bindings.rs`) |
| `phomu-capi` (C ABI) | 19 symbols in `platform/phomu-capi/include/phomu.h` | generated by `platform/phomu-capi/src/bin/generate-header.rs` | no | 5 round-trip tests in `platform/phomu-capi/tests/capi.rs` |
| `phomu-wasm` | **3 functions** | **none** | **no** | a Rust-only round trip (`platform/phomu-wasm/tests/roundtrip.rs`) |

One asymmetry in the two lists of symbols, worth a sentence because it is a small hole: the UniFFI bridge exports `phomu_abi_accepts` (`platform/phomu-ffi/src/surface.rs:29`), the function with which a shell asks *"does the base accept my version bracket?"* (`platform/phomu-ffi/src/version.rs:35-48`). **The C-ABI bridge has no equivalent** — its 19 symbols split the version into four accessors and a JSON list, but none of them answers the question. A C embedder can read the version; it cannot find out whether the library accepts it. The WebAssembly bridge exports `phomu_abi_versions` but not `phomu_abi_accepts` either. This is part of QA-RST-003.

### 8.2 The exported surface deviates from the facade — in four different ways

**(a) The WebAssembly bridge exports three functions.** `platform/phomu-wasm/src/lib.rs` carries `#[wasm_bindgen]` on exactly three functions: `phomu_abi_version` (`:96`), `phomu_abi_versions` (`:102`) and `phomu_message_key` (`:209`). The other five `phomu_*` functions of that file and the whole game loop in `platform/phomu-wasm/src/session.rs` have no such attribute.

I did not take this on trust. I built the module for its real target and parsed the export section of the resulting binary ([`evidence/gates/r_wasm_exports.log`](evidence/gates/r_wasm_exports.log)):

```
The 'phomu_*' functions the module exports to JavaScript:
    phomu_abi_version_b6e0a3915819d4dd
    phomu_abi_versions_b6e0a3915819d4dd
    phomu_message_key_b6e0a3915819d4dd
```

Nothing else. `new_session`, `start_game`, `draw_song`, `submit_answer`, `reveal`, `next_round` and `end_game` are **not exported**. This is QA-RST-001.

**(b) The two bridges disagree on the wire format of the same field.** Both bridges export a function called `phomu_message_key`, and they take different inputs:

- `platform/phomu-ffi/src/media.rs:119-126` looks the event up in a table of stable wire names (`:33-56`), for example `"answer-correct"` → `"game.feedback.correct"`. The C-ABI bridge calls exactly this implementation (`platform/phomu-capi/src/lib.rs:201`).
- `platform/phomu-wasm/src/lib.rs:210-219` matches the **Rust debug name** of the enumeration variant, `format!("{candidate:?}")` — `"AnswerCorrect"`. An event in the wire spelling therefore yields an empty string, silently.

The same divergence exists in the media plan: the UniFFI bridge names the sources `"youtube-primary"` and the kinds `"embed"` (`platform/phomu-ffi/src/media.rs:130-149`), the WebAssembly bridge emits `"YoutubePrimary"` and `"Embed"` (`platform/phomu-wasm/src/json.rs:108-109`). Both bridges document that they use *the same* format (`platform/phomu-wasm/src/session.rs:5-7`, BRIDGE-110). This is QA-RST-004.

**(c) 20 of the 32 public operations of the session are not reachable from any bridge.** I extracted every `pub fn` of `impl Session` and searched the whole `platform/` tree for a call:

| | Count |
|---|---|
| Public operations of `Session` in the facade | **32** |
| Called by at least one bridge | **12** |
| **Not called by any bridge** | **20** |

Of the 20, the read-only accessors are covered indirectly by `snapshot()` (`phase`, `current_mode`, `state`, `rng_state`, `active_turn_id`, `round_view`). The remaining **16 change the state of the game** and no shell can reach them:

`force_reveal`, `init_timeline`, `use_cheat`, `skip_broken_song`, `award_points`, `submit_answer_raw`, `assign_player_to_team`, `remove_team`, `reset_scores`, `set_config`, `from_state`, `advance_phase`, `lock_answers`, `add_timeline_year`, `remove_timeline_year`, `restore_rng_state`.

The rules for the cheats (`core/phomu-core/src/session/rounds.rs:97-135`), the start of the timeline (`core/phomu-core/src/session/rounds.rs:224-240`), the skip of a broken song (GAME-013) and the power-user corrections are all **implemented in the base and unreachable**. This is QA-RST-003.

**(d) The wire model asks for more than the base can answer.** The UniFFI bridge declares fields that the base does not compute — `points_possible`, the mode of the round, the time the answer took, the name of the player — and fills them with `0` or an empty string (`platform/phomu-ffi/src/core_api.rs:289,345,379,384,388-392`). This is QA-RST-005.

---

## 9. The crate-boundary gate and its self-test

**The gate is belastbar, and it has a real negative self-test.** This is the strongest gate in the repository and it deserves to be said plainly.

`scripts/check-crate-boundaries.mjs` reads the manifests with a real TOML parser (`scripts/lib/toml.mjs`), and — this is the good part — **cross-checks its own reading against `cargo metadata --no-deps`** (`:150-216`). A disagreement between the parser and Cargo is itself a finding, so a mistake in the parser cannot make the gate blind. It checks three properties: the dependency direction against the rule table (`scripts/crate-boundaries.rules.json`), that no crate `include!`s a file from outside its own directory, and that the ABI version in the generated C header equals the ABI version in the Rust sources.

The self-test `scripts/check-crate-boundaries.test.mjs` does **not** only check fixtures. Step 5 (`:180-239`) writes a forbidden dependency into a real manifest of this repository, asserts that the gate turns red and names the edge, undoes the change, asserts that the gate turns green again, and asserts that the manifest is **byte identical** to the original afterwards.

Measured: **12 of 12 assertions pass**, exit code 0 ([`evidence/gates/r_crate_boundaries_selftest.log`](evidence/gates/r_crate_boundaries_selftest.log)). The gate itself reports 13 crates, 22 edges, 0 violations.

**Two gaps in the gate, both minor.**

1. The rule table's own exception text says a shell may depend on the core *"but only on its facade module"* (`scripts/crate-boundaries.rules.json:56-58`). The gate does not check that. It does not have to: Rust's module privacy already makes `phomu_core::session` unreachable from outside the crate (`core/phomu-core/src/lib.rs:31-38`). The restriction is enforced by the compiler — better than by a script — but the rule table overstates what the script does.
2. The gate counts **22** edges, one of which is a development dependency (`platform/phomu-wasm -> core/phomu-core (dev)`, `platform/phomu-wasm/Cargo.toml`). The rule table says nothing about development dependencies. Today the distinction costs nothing, because the workspace is a star topology.

---

## 10. Documentation coverage

`cargo doc --workspace --no-deps` produces **0 warnings** and documents 15 crates.

Beyond the compiler, I checked the coverage of the doc comments by hand:

- **12 of 12** library crates carry `#![deny(missing_docs)]`, which turns the workspace-level `warn` into an error. `missing_docs` only fires for items that are publicly reachable, so the check is exact.
- The public surface of the core is documented in the style of the project — every item carries a *what*, a *why* and an *example*. `core/phomu-core/src/spoiler/view.rs` is a good example: the doc comment on `QuestionView` (`:117-127`) states the property that makes the type safe to hand to a shell.
- The doc tests are real: 22 of them, and they run as part of `cargo test --workspace`.

**One systematic weakness: the citations are stale.** The doc comments in the base cite locations in the web shell, and many of those locations have moved. `core/phomu-config/src/scoring.rs:35-37` cites `src/components/game/modes/LyricsMode.tsx:21` for the Lyrics points, but the rule now lives in `src/utils/mode-rules.ts:23`. The same is true for `scoring.rs:39-40` (cites `LyricsMode.tsx:239`), `:43-45` (cites `SurvivorMode.tsx:36`), `:51-53` (cites `VibeCheckMode.tsx:57`), `:57-59` (cites `CoverConfusionMode.tsx:23`), `:67-69` (cites `CoverConfusionMode.tsx:82`). This is QA-RST-010.

---

## 11. The line limits

The gate `scripts/check-file-size.mjs` defines 400 lines as a soft target and 550 lines as a hard limit, and it applies **only** to `*.ts` and `*.tsx` files under `src/` (`:10`, `:128`). The Rust base is therefore invisible to it.

| File | Lines | Over the hard limit | Seen by the gate |
|---|---|---|---|
| `core/phomu-conformance/src/runner.rs` | **1,022** | +472 | **no** |
| `core/phomu-conformance/src/vector.rs` | **794** | +244 | **no** |
| `platform/phomu-ffi/src/dto.rs` | 398 | — | no |
| `platform/phomu-ffi/src/core_api.rs` | 395 | — | no |
| `core/phomu-errors/src/lib.rs` | 395 | — | no |
| `core/phomu-catalog/src/model.rs` | 384 | — | no |
| `core/phomu-core/src/session/state.rs` | 382 | — | no |

**2 files over 550, 2 over 400, 0 of them checked.** This was already reported as QA-ARC-007 in QA-04 and as item 2.9 in QA-09; it is repeated here because the base has now been measured and the number is exact. A parallel change in the working copy (not committed) extends the gate to `.rs` — that is the right fix and it is in flight. This is QA-RST-006.

---

## 12. The conformance measurement — and the 28 intentional deviations

### 12.1 The measurement

`npm run check:conformance` runs the corpus through the TypeScript reference and through the Rust base and compares the two observations field by field. The raw output is in [`evidence/gates/r_conformance.log`](evidence/gates/r_conformance.log):

```
vectors in the corpus   : 70
compared (portable)      : 64
identical               : 36
deviating (gate fails)  : 0
intentional deviations  : 28
documented divergences  : 6
missing on one side     : 0

PASS — 64 portable vector(s) compared, 36 identical, 0 deviating, 28 intentional deviation(s), 6 documented divergence(s).
=== EXIT CODE: 0 ===
```

The two runners: the TypeScript runner executed 70 vectors with 70 without an unexpected error; the Rust runner executed 70 vectors, 9 with a vector-level error (the 9 are the error vectors of the corpus, where an error is the expected result).

The corpus holds 70 vectors; 6 are marked not portable; 64 are compared. The 28 intentional deviations come from **32** vector identifiers listed in `core/phomu-conformance/vectors/intentional-divergences.json` — 4 of the 32 are not portable and are therefore classified as documented divergences by the gate, which never consults the intentional list for a vector the corpus marks as not portable (`scripts/lib/conformance-report.mjs:174-186`).

The gate also cross-checks the classification file against the registry inside the crate (`core/phomu-conformance/src/lib.rs:84-147`, `KNOWN_DIVERGENCES`) and fails when the two lists disagree. They agree.

### 12.2 The 28, group by group — which are really intentional

This is the most valuable part of the assignment, so each group was read against the specification rather than accepted at its word.

#### Group `a6-locked-in-phase` — 24 of the 28 — **genuinely intentional, correctly implemented**

*The difference:* the base enters the phase `locked-in` when the last expected answer arrives; the shell does not. The only field that differs is `phases` — for example `timeline/correct-canonical-slot`:

```
rust-vs-typescript    phases[0]: typescript "question", rust "locked-in"
```

*Is it right?* Yes. `docs/design/GAME-CONTRACT.md` § 2.1 declares the phase `locked-in` and § 11.1 names the omission as deviation **A6**; `REQUIREMENTS.md` GAME-002 requires the reveal to be released only after the answers are locked in. The base closes the deviation: `core/phomu-core/src/session/answers.rs:225-226` sets `answers_locked` and the phase `locked-in` in one step, and only when `answers.len() >= expected` (`:218-224`).

*Is the difference only the phase?* Yes — and this is **machine-checked**: the gate compares the fields that actually differ against the fields the group declares, and a difference in an undeclared field turns the gate red (`scripts/lib/conformance-report.mjs:205-236`). All 24 vectors differ in `phases` and nothing else. The group declares `fields: ["phases"]`.

*Verdict: **intentional and correct.** All 24.

#### Group `c3-reveal-lock` — 3 of the 28 — **intentional in principle, but incomplete in practice**

*The difference:* the base refuses the reveal until the answers are locked in; the shell sets the phase.

```
[phase/question-to-reveal]
  rust-vs-typescript    phases[1]: typescript "reveal", rust "question"
  rust-vs-typescript    error: typescript null, rust {"code":"1102","message":"errors.answersNotLocked"}
```

*Is the refusal right?* Yes — it is the anti-spoiler guarantee, `docs/design/PLATFORM-ARCHITECTURE.md` § 10.2 rule C-3, and `REQUIREMENTS.md` GAME-002. The shell's behaviour is the defect that QA-SPO-001 reports as a P0.

*Is the base complete?* **No.** The refusal is right, but the base offers exactly one way out — `Session::force_reveal` (`core/phomu-core/src/session/answers.rs:268-274`), the timeout — and **no bridge exports it** (§ 8.2c). The second vector of the group shows what happens to a shell that tries the other way:

```
[phase/reveal-to-drawing]
  rust-vs-typescript    phases[1]: typescript "reveal", rust "question"
  rust-vs-typescript    phases[2]: typescript "drawing", rust "question"
  rust-vs-typescript    currentRound: typescript 2, rust 1
  rust-vs-typescript    error: typescript null, rust {"code":"1101","message":"errors.notAvailableInPhase"}
```

The shell is stuck in the phase `question`. The transition table has no edge `question → drawing` (`core/phomu-core/src/rules/phase.rs:78-90`), and `next_round` accepts only the phases `reveal` and `drawing` (`core/phomu-core/src/session/rounds.rs:36-41`).

I proved the dead end with a probe that was run **outside the repository**, in the pinned checkout only ([`evidence/gates/r_probe_reveal_deadlock.log`](evidence/gates/r_probe_reveal_deadlock.log)):

```
PROBE phase after one answer: question
PROBE reveal() -> Some("errors.answersNotLocked (1102) phase=question")
PROBE next_round() -> Some("errors.notAvailableInPhase (1101) phase=question")
PROBE advance_phase(reveal) -> Some("errors.answersNotLocked (1102) answers=1 expected=3")
PROBE force_reveal() -> None
PROBE phase after force_reveal: reveal
```

Three players, one answer — the state a game reaches when the round times out, when a player walks away, or when a card is mis-scanned. Every command a shell can call refuses. Only `force_reveal` succeeds, and no bridge exports it.

*And the corpus does not see it.* There is **no vector for the timeout path** in the corpus. The group documents the refusal — correctly — and is silent about the way out. A corpus that proves the refusal but not the escape proves half of the contract.

*Verdict: **the deviation is intentional; the implementation behind it is incomplete.*** This is QA-RST-002, and it is the one place where "intentional" and "correct" are not the same thing.

#### Group `answer-without-player` — 1 of the 28 — **genuinely intentional, correctly implemented**

```
[error/answer-without-player]
  rust-vs-typescript    timelineYears.length: typescript 4, rust 3
  rust-vs-typescript    error: typescript null, rust {"code":"1105","message":"errors.noActivePlayer"}
```

The shell evaluates the mode and applies its effect (the year lands on the timeline) even though nobody answered; the base refuses, because an answer without an active turn cannot be attributed to anybody (`core/phomu-core/src/session/answers.rs:97-100`, `docs/spec/REQUIREMENTS-PLATFORM.md` CORE-111). The base is right.

*Verdict: **intentional and correct.** 1.

### 12.3 The four deviations that are classified as "documented", not "intentional"

The corpus marks 6 vectors as not portable; 4 of them also appear in the intentional list, 2 do not. These are **not** part of the 28 and are **not** examined here as intentional deviations — but two of them deserve a remark.

| Vector | Why it is not portable | Assessment |
|---|---|---|
| `phase/locked-in-declared` | The shell can set the phase `locked-in` from the store; the base refuses the transition | The vector's own note says the divergence *"must be decided by the owner (OPEN-08)"* — correctly left open |
| `error/award-points-unknown-player` | The shell ignores the unknown player silently (`src/stores/game-store.ts:463`), the base answers `UnknownPlayer` | The base is stricter and right |
| `error/remove-unknown-timeline-year` | The shell ignores the unknown year silently (`src/stores/game-store.ts:611`), the base answers `InvalidAnswer` | The base is stricter and right |
| `error/answer-without-current-song` | The vector layer's own error vocabulary | Only the shell can reach the situation; the base cannot enter the question phase without a song |
| `divergence/mode-rotation-random` | The shell rotates with `Math.random()`, the base with a seeded generator | **Open:** the two produce different mode sequences, so a session is not reproducible across platforms. The corpus honestly marks it as not comparable *"until the owner defines a shared algorithm and seed"* |
| `divergence/shifting-teams-random` | The shell re-shuffles with `Math.random()` | The base recomputes the team scores after the shuffle (GAME-007), the shell does not (deviation A8). The base is right; the membership is not comparable |

**The summary of § 12.2 and § 12.3: of the 28 intentional deviations, 27 are genuinely intentional and correctly implemented, and one — the reveal-lock group — is intentional but leaves a dead end that no bridge can escape.** Two further differences (the mode rotation and the team shuffle) are honestly marked as not comparable and are waiting for a decision by the owner.

---

## 13. Findings

### QA-RST-001 — P1 — The WebAssembly bridge exports three functions; a shell cannot play a game through it

**Location:** `platform/phomu-wasm/src/lib.rs:96,102,209` (the only three `#[wasm_bindgen]` attributes in the crate); `platform/phomu-wasm/src/lib.rs:111,138,156,164,172` (five `phomu_*` functions without the attribute); `platform/phomu-wasm/src/session.rs:39-306` (the whole game loop, without the attribute).

**What I measured:** the export section of the compiled module, parsed out of the binary ([`evidence/gates/r_wasm_exports.log`](evidence/gates/r_wasm_exports.log)):

```
The 'phomu_*' functions the module exports to JavaScript:
    phomu_abi_version_b6e0a3915819d4dd
    phomu_abi_versions_b6e0a3915819d4dd
    phomu_message_key_b6e0a3915819d4dd
```

`new_session`, `start_game`, `draw_song`, `submit_answer`, `reveal`, `next_round` and `end_game` are **not** in the export section.

**Description.** The WebAssembly bridge is the bridge the web shell is supposed to use — it exists for exactly that purpose (`platform/phomu-wasm/src/lib.rs:6-9`, `docs/design/BUILD-CONTRACT.md` § 2.4 rule B-7). As it stands, a shell that loads the module can ask for the ABI version and for a message key. It cannot open a catalogue, cannot start a game, cannot draw a song, cannot take an answer and cannot reveal.

**Why the test does not catch it.** `platform/phomu-wasm/tests/roundtrip.rs` plays a whole round through the bridge — but in Rust, calling the Rust functions directly (`use phomu_wasm::session::{draw_song, new_session, …}`, `:21`). The `#[wasm_bindgen]` attribute is what makes a function reachable from JavaScript, and the test never goes through it. The test is green and the JavaScript surface is empty.

**Impact.** The central claim of QA-00 § 0b — *"the fix for the biggest finding already exists in this repository; the web shell simply does not consume it yet"* — holds for the **core** but not for the **bridge the shell would consume**. A migration of the web shell onto the base, as planned (`docs/design/PLATFORM-ARCHITECTURE.md` § 5.3), would find that the module it loads offers no game.

**Proposal.**
1. Put `#[wasm_bindgen]` on the five missing `phomu_*` functions and on the session commands. `ModeAnswer` (`platform/phomu-wasm/src/session.rs:198-202`) has to become a JSON-shaped type first; the other commands take plain values.
2. Give the crate the same surface discipline the UniFFI bridge has: a list of exported symbols, a fingerprint, and a test that reads the export section of the built `.wasm` and compares it against the list — the same pattern as `platform/phomu-ffi/src/surface.rs` and `platform/phomu-ffi/tests/generated_bindings.rs`.
3. Add `cargo build --target wasm32-unknown-unknown -p phomu-wasm` to CI (see QA-RST-007).

**Accept when:** the export section of the built module lists every command of the game loop; a test that compares the export section against the declared surface fails when a symbol is removed.

**Effort:** ~2 days.

---

### QA-RST-002 — P1 — An unanswered round cannot be closed through the exported surface

**Location:** `core/phomu-core/src/session/answers.rs:243-253` (`reveal` refuses), `core/phomu-core/src/session/answers.rs:268-274` (`force_reveal` — the only escape, not exported), `core/phomu-core/src/rules/phase.rs:78-90` (no edge `question → drawing`), `core/phomu-core/src/session/rounds.rs:36-41` (`next_round` accepts only `reveal` and `drawing`), `platform/phomu-ffi/src/session.rs:290-306` (the bridge calls the strict `reveal`), `platform/phomu-wasm/src/session.rs:220-232` (the same).

**What I measured:** the probe in [`evidence/gates/r_probe_reveal_deadlock.log`](evidence/gates/r_probe_reveal_deadlock.log) — three players, one answer:

```
PROBE reveal() -> Some("errors.answersNotLocked (1102) phase=question")
PROBE next_round() -> Some("errors.notAvailableInPhase (1101) phase=question")
PROBE advance_phase(reveal) -> Some("errors.answersNotLocked (1102) answers=1 expected=3")
PROBE force_reveal() -> None
```

**Description.** The reveal lock is correct and deliberate (C-3, GAME-002). What is missing is the escape: the timeout of a question round. `Session::force_reveal` implements it, but **no bridge exports it** — the grep for `force_reveal` across `platform/` returns nothing. A shell that reaches the timeout therefore has no command that works: the reveal is refused, the round cannot be closed, and the phase cannot be moved.

**Impact.** A MultiDevice game with 3 players in which only 2 answer — a timeout, a player who leaves, a mis-scanned card — cannot be continued through the bridges. The party stops. The reference implementation does not have this problem, because it lets the store jump straight from `question` to `reveal`; that jump is the very thing the base closes, and the base closes it without opening the alternative door.

**The corpus does not cover it.** The conformance group `c3-reveal-lock` documents the refusal on 3 vectors and contains **no vector for the timeout**. The gate is green; the dead end is invisible to it.

**Proposal.**
1. Export a timeout command in all three bridges — `phomu_session_timeout` — that calls `force_reveal`, and document it in the surface list of the UniFFI bridge.
2. Add a conformance vector for the timeout path, so that the corpus proves the way out and not only the refusal.
3. Add a test over the transition table that proves every phase of a running round has at least one outgoing edge that leads to a state from which the round can be closed. That test would have caught this.

**Accept when:** a bridge call can close a round that nobody answered; a conformance vector covers the timeout; a transition-table test fails when a phase becomes a dead end.

**Effort:** ~1 day.

---

### QA-RST-003 — P1 — 20 of the 32 public operations of the session are unreachable from every shell

**Location:** the facade at `core/phomu-core/src/facade.rs:49-85` against the three bridges: `platform/phomu-ffi/src/session.rs`, `platform/phomu-capi/src/session.rs`, `platform/phomu-wasm/src/session.rs`.

**What I measured:** 32 public operations of `impl Session`; 12 are called by at least one bridge; **20 are not**. Of the 20, 16 change the state of the game:

`force_reveal`, `init_timeline`, `use_cheat`, `skip_broken_song`, `award_points`, `submit_answer_raw`, `assign_player_to_team`, `remove_team`, `reset_scores`, `set_config`, `from_state`, `advance_phase`, `lock_answers`, `add_timeline_year`, `remove_timeline_year`, `restore_rng_state`.

**Description.** The rules are in the base; the doors to them are not in the bridges. The cheats are a documented game feature (GAME-023, GAME-025, GAME-032) with a full implementation in the base (`core/phomu-core/src/session/rounds.rs:97-135`) and no way to trigger them. The start of the timeline (GAME-017) is implemented (`core/phomu-core/src/session/rounds.rs:224-240`) and unreachable, so the Timeline mode can only ever be played on an empty timeline. The skip of a broken song (GAME-013) is implemented (`core/phomu-core/src/session/state.rs:363-381`) and unreachable. The rehydration of a stored state (CORE-103) is implemented (`core/phomu-core/src/session/commands.rs:35-53`) and unreachable, so a shell cannot restore a session after a crash even though the schema version exists for exactly that.

**Impact.** Every shell would have to re-implement these rules — which is precisely the duplication the base was built to remove. The base cannot become the single source of truth while three quarters of it is behind a closed door.

**Proposal.**
1. Write down the intended mapping: a table "operation of the facade → symbol of the bridge", with the operations that are deliberately not exposed and the reason.
2. Export the ones a shell genuinely needs: `use_cheat`, `init_timeline`, `skip_broken_song`, `award_points`, `submit_answer_raw`, `assign_player_to_team`, `remove_team`, `reset_scores`, `set_config`, `from_state` — and the timeout of QA-RST-002. Export `phomu_abi_accepts` in the C-ABI bridge as well, so that every embedder can ask the version question (§ 8.1).
3. Add a gate that reads the public operations of `Session` and fails when one of them has no bridge symbol and no written exemption. The crate-boundary gate (`scripts/check-crate-boundaries.mjs`) is the right place for it, or a sibling script with the same self-test discipline.

**Accept when:** every state-changing operation of the session has a bridge symbol or a documented exemption; the gate turns red when a new operation is added without one.

**Effort:** ~3 days.

---

### QA-RST-004 — P2 — The two bridges disagree on the wire format of the same field

**Location:** `platform/phomu-wasm/src/lib.rs:210-219` against `platform/phomu-ffi/src/media.rs:33-56,119-126`; `platform/phomu-wasm/src/json.rs:108-109` against `platform/phomu-ffi/src/media.rs:130-149`. The C-ABI bridge uses the UniFFI spelling (`platform/phomu-capi/src/lib.rs:201`).

**What I measured:**

| Field | UniFFI and C-ABI | WebAssembly |
|---|---|---|
| The game event of `phomu_message_key` | `"answer-correct"` | `"AnswerCorrect"` (the Rust debug name) |
| The source of a media candidate | `"youtube-primary"` | `"YoutubePrimary"` |
| The kind of a media candidate | `"embed"` | `"Embed"` |

**Description.** Both bridges document that they use the same format (`platform/phomu-wasm/src/session.rs:5-7`, BRIDGE-110), and the UniFFI bridge has a stable table of wire names (`platform/phomu-ffi/src/media.rs:33-56`). The WebAssembly bridge does not use that table; it formats the enumeration with `{:?}`, which is the debug name of a Rust variant — not a wire format, and not stable against a rename of the variant.

**Impact.** The failure is silent. A shell that learned `"answer-correct"` from the UniFFI bridge and calls the WebAssembly bridge gets an **empty string** — no error, no diagnostic, just a missing text at the moment the game tells the player that the answer was right. For the media plan, a shell that switches on the source name sees names it does not know.

**Proposal.**
1. Move the naming into the core: a `wire_name()` on every enumeration that crosses a boundary (`MediaSource`, `ProviderKind`, `GameEvent`, `RoundPhase`, `GameMode`), so that there is exactly one spelling.
2. Have all three bridges use it; delete the table in `platform/phomu-ffi/src/media.rs:33-56` in favour of the core function.
3. Add a test that plays the same round through the UniFFI bridge and through the WebAssembly bridge and compares the two JSON documents field by field — the same comparison the conformance gate already performs against the shell.

**Accept when:** a single spelling exists per enumeration, in the core; a bridge-to-bridge comparison test fails when the two disagree.

**Effort:** ~1 day.

---

### QA-RST-005 — P2 — The wire model of the UniFFI bridge carries four fields that the base cannot fill

**Location:** `platform/phomu-ffi/src/core_api.rs:289` (`points_possible: 0`), `:345` (`mode: String::new()` in the scoring view), `:379` (`mode: String::new()` in the score snapshot), `:384` (`answered_in_seconds: None`), `:388-392` (`name: String::new()`, `is_eliminated: false`, `is_spectator: false`).

**What I measured.** The base computes these values; the bridge throws them away. The comparison is structural:

| Field of the wire model | What the bridge writes | What the base has |
|---|---|---|
| `PhomuSessionSnapshot.points_possible` | always `0` (`core_api.rs:289`) | the base computes it for the round (`core/phomu-core/src/session/prompt.rs:153`, `core/phomu-core/src/session/ending.rs:71`) — but `SessionSnapshot` has no such field (`core/phomu-core/src/session/dto.rs:52-82`) |
| `PhomuRoundView::Scoring.mode` | always `""` (`core_api.rs:345`) | `ScoringView.mode` exists (`core/phomu-core/src/spoiler/view.rs:188`) |
| `PhomuScoreSnapshot.mode` | always `""` (`core_api.rs:379`) | `ScoreSnapshot` has no mode (`core/phomu-core/src/session/dto.rs:23-41`) |
| `PhomuPlayerAnswer.answered_in_seconds` | always `None` (`core_api.rs:384`) | the base records it (`core/phomu-core/src/session/answers.rs:145`) |
| `PhomuPlayerScore.name`, `is_eliminated`, `is_spectator` | always empty / `false` (`core_api.rs:388-392`) | the base knows all three (`core/phomu-core/src/session/model.rs`) |

**Description.** The wire model of the bridge declares more than the base offers. `points_possible` is the sharpest case: a shell that reads it to show *"this round is worth N points"* reads **0** — which does not look like "unknown", it looks like "this round is worth nothing". The base does compute the value; the snapshot simply does not carry it (`core/phomu-core/src/session/dto.rs:52-82`), so the bridge cannot forward what it does not have.

**Impact.** Small values, but they are the values a shell shows during a round: the possible points, the mode of the round in the score snapshot, the name of the player who answered, the time the answer took. Every one of them is a `""` or a `0` that a shell cannot distinguish from a real value.

**Proposal.**
1. Extend `SessionSnapshot` with `points_possible`, and `ScoreSnapshot` with `mode` and `answered_in_seconds`, so that the base can answer what the wire model asks.
2. Fill the remaining fields from the values the base already has — the name and the flags of the player are in `SessionSnapshot.players` (`core/phomu-core/src/session/dto.rs:60`).
3. Add a bridge round-trip test that asserts that every field of the wire model carries a value the base can produce — no empty string, no unconditional zero.

**Accept when:** no field of the wire model is written with an unconditional empty string or zero; a test asserts it.

**Effort:** ~1 day.

---

### QA-RST-006 — P2 — The file-size gate does not see the Rust base, and two files already breach the hard limit

**Location:** `scripts/check-file-size.mjs:10,128` (only `*.ts`/`*.tsx` under `src/`); `core/phomu-conformance/src/runner.rs` (1,022 lines); `core/phomu-conformance/src/vector.rs` (794 lines).

**What I measured:** **2** `.rs` files over the 550-line hard limit, **2** over the 400-line soft limit, **0** of them seen by the gate.

**Description.** This repeats QA-ARC-007 (QA-04) and QA-09 item 2.9, and the number is now exact because the base has been measured. The two files are the two that decide whether two shells agree — the runner that replays the vectors and the model of the vectors. They are the files where a subtle divergence between the two implementations of a rule could hide, and they are the files with no size gate.

**Proposal.** Extend the gate to `.rs` with the same 400/550 rule and the same "known legacy file" mechanism, and split the two files. The runner has already been split into a directory in the working copy — the split is in flight; the gate is the part that is missing.

**Accept when:** `npm run check:file-size` reports `.rs` files; a Rust file over 550 lines turns the gate red; both files are under the limit.

**Effort:** ~1 day (the split is under way; the gate is not).

---

### QA-RST-007 — P2 — The CI does not build the WebAssembly target, does not run the negative self-test of the boundary gate, and does not fail on rustdoc warnings

**Location:** `.github/workflows/ci.yml:151-183` (the `rust-core` job), `:185-200` (the `rust-boundaries` job), `scripts/check-all.mjs:28-35` (the gate list).

**What I measured:**

| Check | In CI? | Measured result |
|---|---|---|
| `cargo build --workspace --locked` | yes | exit 0 |
| `cargo build --workspace --release --lib` | yes | — |
| `cargo test --workspace --locked` | yes | exit 0, 304 tests |
| `cargo clippy --workspace --all-targets -- -D warnings` | yes | exit 0, 0 warnings |
| `cargo fmt --check` | yes | exit 0 |
| `cargo doc --workspace --no-deps` | yes | exit 0, 0 warnings — **but without `RUSTDOCFLAGS="-D warnings"`**, so a warning would only print |
| `cargo build --target wasm32-unknown-unknown -p phomu-wasm` | **no** | exit 0, 1 m 56 s — it compiles today, nothing keeps it that way |
| `node scripts/check-crate-boundaries.mjs` | yes | exit 0, 0 violations |
| `node scripts/check-crate-boundaries.test.mjs` | **no** | exit 0, 12 of 12 assertions — the gate's own proof that it can fail is not run |
| `npm run check:conformance` | yes (a separate job) | exit 0 |

`npm run check:all` — the command the project calls its combined gate — runs neither the self-test nor the conformance gate (`scripts/check-all.mjs:28-35`).

**Impact.** A gate that has never been seen red is not a gate (the project's own words, `scripts/check-crate-boundaries.test.mjs:6`). The boundary gate's negative self-test exists, is fast, and is not wired in. A wasm-only compile error — the kind that only appears on `wasm32-unknown-unknown` — reaches `main` unnoticed.

**Proposal.**
1. Add the wasm build to the `rust-core` job.
2. Add `RUSTDOCFLAGS="-D warnings"` to the documentation step.
3. Add the boundary self-test to the `rust-boundaries` job and to `check:all`.

**Accept when:** CI builds the wasm target, fails on a rustdoc warning, and runs the self-test of the boundary gate.

**Effort:** ~0.5 day.

---

### QA-RST-008 — P2 — The `unsafe` ban of the workspace is switched off for the whole C-ABI crate, without a machine check

**Location:** `platform/phomu-capi/src/lib.rs:35-41` (`#![allow(unsafe_code)]`) against `Cargo.toml` (`[workspace.lints.rust] unsafe_code = "deny"`); the `unsafe` blocks in `platform/phomu-capi/src/buffer.rs:56,61,72,92` and `platform/phomu-capi/src/session.rs:21,33,52,65,81,101,109,124,133,152,169,188,196`.

**Description.** Eleven of the twelve libraries carry `#![forbid(unsafe_code)]`, which cannot be overridden. The twelfth carries `#![allow(unsafe_code)]`, which overrides the workspace deny for the whole crate. The override is **documented and justified** — an `extern "C"` signature with raw pointers forces the `unsafe`, and `docs/design/BUILD-CONTRACT.md` § 1.2 rule 4 cannot be satisfied by a C ABI — and every `unsafe` block carries a `# Safety` comment that names the guarantee the caller has to give. The finding is not a misuse; it is that **the machine check is gone**: clippy no longer complains about a new `unsafe` in that crate, so the count can grow without anybody noticing.

**Impact.** The crate with the most `unsafe` is the one crate where the ban does not apply. The mitigation is a convention — "every `unsafe` block carries a `SAFETY` comment" — and no script reads the comments.

**Proposal.** Keep the crate-level override (it is correct) and add a gate that counts the `unsafe` blocks and the `extern "C"` symbols in `platform/phomu-capi/` and fails when the count grows beyond the recorded value — the same mechanism the file-size gate uses for its known legacy files. A second, cheaper variant: a script that fails when an `unsafe` block in that crate has no `# Safety` comment above it.

**Accept when:** a new `unsafe` block in `platform/phomu-capi/` without a `# Safety` comment, or a growth of the recorded count, turns a gate red.

**Effort:** ~0.5 day.

---

### QA-RST-009 — P3 — The rules exist twice, and nothing but the conformance corpus keeps the two copies in step

**Location:** `src/utils/mode-rules.ts:22-54,65-130,151-269,286-316,365-416` and `src/config/game-config.ts:63,310` against `core/phomu-config/src/scoring.rs:16-197`, `core/phomu-core/src/modes/timeline.rs:26,63`, `core/phomu-core/src/modes/hint_master.rs:38`, `core/phomu-core/src/modes/lyrics.rs:60-81`, `core/phomu-core/src/modes/vibe_check.rs:44-56`, `core/phomu-core/src/modes/survivor.rs:21`, `core/phomu-core/src/modes/cover_confusion.rs:44-56`, `core/phomu-core/src/session/ending.rs:25`, `core/phomu-core/src/modes/evaluate.rs:34-100`.

**What I measured:** all 12 comparable constants are **identical** today (§ 3). Two constants exist only in the base (`TIMELINE_JOKER_MIN_SLOTS`, `TIMELINE_INITIAL_YEARS`). One behavioural difference in strictness (the base rejects an answer of the wrong shape for the running mode; the shell does not).

**Description.** The duplication is not a defect of the base — it is the unfinished migration. But the base's own documentation says the rule *"lives in the base and nowhere else"* (`core/phomu-config/src/scoring.rs:8-10`), and that is not yet true. The only link between the two copies is the conformance corpus, and the corpus compares *behaviour* on 64 vectors, not the constants. A constant that no vector touches can drift silently.

**Proposal.** The real fix is the migration itself: move the shell onto the base (QA-09, the platform wave). Until then, add a test that reads the constants of both sides and compares them — a small, mechanical test that turns a silent drift into a red build.

**Accept when:** a test compares the rule constants of the shell and the base, or the shell no longer has its own copy.

**Effort:** ~1 day for the test; the migration is the larger, separate piece of work.

---

### QA-RST-010 — P3 — The documentation of the base cites source locations that have moved, and the error codes are not checked for order

**Location:** `core/phomu-config/src/scoring.rs:35-37,39-40,43-45,51-53,57-59,67-69` (citations of `src/components/game/modes/*.tsx` where the rules now live in `src/utils/mode-rules.ts`); `core/phomu-errors/src/lib.rs:9-17` (the rule that a new code is appended at the end of its range).

**What I measured:** the rules were extracted from the components into `src/utils/mode-rules.ts` — the header of that file names the extraction (`src/utils/mode-rules.ts:2-14`). Six citations in `core/phomu-config/src/scoring.rs` still point at the components.

**Description.** Two small documentation problems with the same shape: a statement that is true but no longer verifiable, or a rule that is written down but not checked.

- The citations send a reader to a file where the rule no longer is. A reader who follows `core/phomu-config/src/scoring.rs:37` to `LyricsMode.tsx:21` finds a component, not the constant.
- The error-code rule — *"a new failure gets a new number at the end of its range"* (`core/phomu-errors/src/lib.rs:14-15`) — is enforced by convention only. Nothing checks that a new code was appended rather than inserted.

**Proposal.**
1. Update the citations to the current locations; better, write the rule once and cite the rule.
2. Add a test in `core/phomu-errors` that asserts the codes in `ALL` are in ascending numeric order and that every code lies inside the range its section declares — the range table at `core/phomu-errors/src/lib.rs:21-27` is data that is never read.
3. Longer term, the gate of QA-09 item 3.2 (`scripts/check-doc-refs.mjs`, a `path:line` that does not exist) would catch this class of drift everywhere.

**Accept when:** every `path:line` in a doc comment of the base resolves; a test asserts the ascending order of the error codes.

**Effort:** ~1 day.

---

### QA-RST-011 — P3 — `Session::new` takes a clock reading it never uses

**Location:** `core/phomu-core/src/session/state.rs:57-98`, specifically `:97` (`let _ = now_ms;`).

**Description.** The signature takes `now_ms` and discards it. The session records its start time in `start_game` (`core/phomu-core/src/session/state.rs:253`), which is the right place. The parameter is a leftover that invites the reader to believe the session knows its start time before the game starts.

**Impact.** Small. A shell that believes it has recorded a start time at construction has not.

**Proposal.** Remove the parameter, or document why it is there. Both are one-line changes; removing it touches every caller (the three bridges and the test fixtures).

**Accept when:** the parameter is gone or carries a reason.

**Effort:** ~0.5 day.

---

## 14. Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-RST-001 The WebAssembly bridge must export the game | **P1** | The export section of the built `.wasm` lists every command of the game loop; a test compares it against a declared surface and fails when a symbol is missing |
| QA-RST-002 An unanswered round must be closable | **P1** | A bridge call closes a round that nobody answered; a conformance vector covers the timeout; a transition-table test fails when a phase becomes a dead end |
| QA-RST-003 The facade must be reachable | **P1** | Every state-changing operation of the session has a bridge symbol or a written exemption; a gate fails when a new operation has neither |
| QA-RST-004 One spelling per enumeration on the wire | P2 | The naming lives in the core; a bridge-to-bridge comparison test fails when the two bridges disagree |
| QA-RST-005 The wire model must ask only for what the base can answer | P2 | No field of the wire model is written with an unconditional empty string or zero; a test asserts it |
| QA-RST-006 The file-size gate must see the Rust base | P2 | `npm run check:file-size` reports `.rs` files and fails for a Rust file over 550 lines; both oversized files are split |
| QA-RST-007 The Rust CI must cover what it claims | P2 | CI builds the wasm target, fails on a rustdoc warning, and runs the self-test of the boundary gate |
| QA-RST-008 The `unsafe` of the C-ABI bridge must be checked | P2 | A gate fails when an `unsafe` block in `platform/phomu-capi/` appears without a `# Safety` comment or grows the recorded count |
| QA-RST-009 The rules must have one home | P3 | A test compares the rule constants of the shell and the base, or the shell no longer has its own copy |
| QA-RST-010 The documentation of the base must be verifiable | P3 | Every `path:line` in a doc comment of the base resolves; a test asserts the ascending order of the error codes |
| QA-RST-011 A parameter that is not used should go | P3 | `now_ms` is removed from `Session::new` or carries a reason |

---

## 15. What this report does not claim

Stated explicitly, because the previous report set was corrected three times before publication (QA-00 § 0a) and the same discipline is due here.

- **The base compiles, its 304 tests pass, clippy is clean, the format is clean and the documentation builds without a warning.** That is what was measured. It is not a claim about the behaviour of the base on a device, in a browser, or with a real catalogue.
- **The conformance gate is green**: 64 portable vectors compared, 36 identical, 0 deviating, 28 intentional deviations, 6 documented divergences. This is a comparison of the base against the **TypeScript reference**, not against the specification. The 28 deviations are the places where the two differ; § 12.2 argues for each of them that the base is right — an argument from the documents, not a proof.
- **The anti-spoiler guarantee is in the state machine** and is tested by 8 tests that walk every mode (§ 4). What was **not** verified: that a shell *uses* the guarantee correctly — no shell consumes the base yet.
- **The behaviour on a real device was not verified.** There is no Rust shell in this repository. The Kotlin and Swift bindings were checked as generated text, never executed — this environment has no JVM and no Swift toolchain.
- **The performance of the base was not measured.** No benchmark exists; the timings in § 1 are build times, not runtimes of the game.
- **The mode rotation and the team shuffle are not comparable** between the two implementations (§ 12.3). The corpus says so honestly; this report repeats it rather than resolving it. It needs a decision by the owner.
