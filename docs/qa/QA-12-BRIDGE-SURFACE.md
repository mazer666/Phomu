# QA-12 — The Bridge Surface

**Severity of the findings in this report:** P2 (one open gap, OPEN-BS-01)
**Area:** The declared surface of the shared Rust base — the public operations of the session, the three bridges that expose them, and the gate that keeps the two in step.

> This report delivers the **gate** that the Rust base audit demanded as the acceptance criterion of **QA-RST-003** ([`QA-11-RUST-BASE.md`](QA-11-RUST-BASE.md) § 13). The audit measured that 20 of the 32 public operations of the session were unreachable from every shell and wrote the rule down:
>
> > **Accept when:** every state-changing operation of the session has a bridge symbol or a written exemption; the gate turns red when a new operation is added without one.
>
> The rule is now a machine check. This report measures what the rule covers today, quotes the gate turning red and green, and names the one operation that is still not exported.

---

## 0. What this report covers

| | |
|---|---|
| Baseline under test | branch `main`, working tree, 2026-10-27 |
| What was measured | the `pub fn` of `impl Session` in `core/phomu-core/src/**`, the `pub fn phomu_*` in `platform/*/src/**`, and the declaration `platform/bridge-surface.json` |
| Commands | `node scripts/check-bridge-surface.mjs`, `node scripts/check-bridge-surface.mjs --self-test`, `npm run check:all` |
| What was changed | the declaration, the gate, the fixtures of the gate, this report, the status of QA-11 and of the remediation status |

**What is *not* covered.** The report does not measure the behaviour of the bridges — that is the job of the round-trip tests of the three crates and of the conformance gate. It does not decide whether a shell *needs* an operation; it decides whether the question is **asked and answered**. The gate does not know what a shell wants; it knows that the question has an answer.

---

## 1. The measurement

### 1.1 The operations of the session

The gate reads every `impl Session` block of `core/phomu-core/src/**` — not only the ones of `core/phomu-core/src/session/**`, so that an operation added outside that directory is seen as well.

**34 public operations.** The parser ignores `pub(crate)` helpers and the `pub fn` in a doc comment; both were checked against the source by hand.

| Source | Operations |
|---|---|
| `session/answers.rs` | `submit_answer`, `lock_answers`, `reveal`, `force_reveal` |
| `session/commands.rs` | `from_state`, `advance_phase`, `submit_answer_raw`, `award_points`, `add_timeline_year`, `remove_team`, `reset_scores`, `set_config` |
| `session/prompt.rs` | `playback_window`, `disclose_identity` |
| `session/rounds.rs` | `next_round`, `use_cheat`, `decade_hint`, `vibe_options_with_cheat`, `remove_timeline_year`, `init_timeline` |
| `session/state.rs` | `new`, `state`, `phase`, `current_mode`, `active_turn_id`, `rng_state`, `restore_rng_state`, `snapshot`, `assign_player_to_team`, `start_game`, `draw_song`, `round_view`, `end_game`, `skip_broken_song` |

The number is **34**. The audit of QA-11 § 8.2 (c) measured **32** at the pinned commit `0903997a`; the same parser applied to the tree of that commit finds **31** — a difference of one in the counting, not in the code. Three operations have been added since then and are part of the 34: `Session::disclose_identity`, `Session::decade_hint` and `Session::vibe_options_with_cheat`.

### 1.2 The symbols of the bridges

**45 distinct `phomu_*` symbols** in the sources of the three bridges:

| Bridge | Symbols | Operations of the session they reach |
|---|---|---|
| `platform/phomu-wasm/` | 37 | **27** |
| `platform/phomu-capi/` | 19 | **8** |
| `platform/phomu-ffi/` | 17 | **8** |

The three bridges are not of equal size: the WebAssembly bridge is the one the web shell is meant to consume, and it is the only one that carries the whole game loop (`platform/phomu-wasm/src/exports_session.rs`).

### 1.3 The result

| | Count |
|---|---|
| Public operations of the session | **34** |
| Declared in `platform/bridge-surface.json` | **34** (all of them) |
| State-changing operations | **24** |
| — reachable through a bridge symbol | **23** |
| — exempted with a written reason | **1** |
| Read-only operations | **10** |
| — reachable through a bridge symbol | **4** |
| — reachable through the snapshot, without a symbol of their own | **6** |

The gap QA-RST-003 measured — 20 unreachable operations — is closed for **23 of the 24** state-changing operations. The remaining one is named in § 4.

---

## 2. The declaration

`platform/bridge-surface.json` is the written answer to the question "which operation of the session reaches which symbol of which bridge". Every entry carries four fields:

```json
{
  "name": "Session::start_game",
  "state_changing": true,
  "bridge": "phomu_session_start",
  "exemption": null
}
```

| Field | Meaning |
|---|---|
| `name` | the operation, `Session::<method>` |
| `state_changing` | `true` when the operation can change the state of the session — including the state of the generator, which is part of the persisted state |
| `bridge` | the name of the exported symbol that reaches the operation, or `null` |
| `exemption` | the written reason why the operation is not exposed, or `null` |

**The rules of the declaration.**

1. **Every** public operation of the session is listed — the read-only ones too, so that the list stays complete and a new operation cannot slip in unnoticed.
2. A state-changing operation names **either** a bridge symbol **or** an exemption. Both empty is an error.
3. A bridge symbol has to exist in **one of the three bridges** — a name that exists nowhere is a typo and is an error.
4. An operation that the session does not have is an error — the declaration follows the code, not the other way round.
5. An entry that names a symbol **and** an exemption is an error: the declaration is a choice, and an entry that offers both does not say which rule is in force.

---

## 3. The gate

`scripts/check-bridge-surface.mjs` reads the declaration, the session and the bridges, and applies the five rules of § 2.

| Rule | Severity | Meaning |
|---|---|---|
| `BS-001` | error | an operation of the session is not declared |
| `BS-002` | error | a declared operation has neither a bridge nor an exemption |
| `BS-003` | error | a declaration names a bridge symbol that exists in no bridge |
| `BS-004` | error | a declaration names an operation the session does not have |
| `BS-005` | error | a declaration names a bridge symbol **and** an exemption |
| `BS-101` | warning | an operation is exempted instead of being exported |
| `BS-102` | warning | the bridge that exports the symbol does not call the operation |

**Exit code 1** when at least one error is found. **Exit code 0** otherwise — the warnings are printed and do not block: an exemption is a legal answer, not a defect.

The rules live in `scripts/lib/bridge-surface.mjs`, the reader of the Rust sources in `scripts/lib/rust-surface.mjs`, the command line and the self-test in `scripts/check-bridge-surface.mjs`.

### 3.1 How the Rust is read

The gate parses the Rust itself instead of calling `cargo`. Two reasons: the gate has to run in the JavaScript toolchain of the repository in milliseconds, and it has to run against a fixture tree that is not a Cargo workspace.

The parser replaces the comments, the string literals, the raw strings and the character literals with spaces before it looks for braces, because a format string such as `format!("session-{seed:016x}")` carries braces of its own. The spaces have the length of the text they replace, so the line numbers in the findings are the line numbers of the original file.

`BS-102` is a heuristic and is marked as one: the call may sit behind a helper of the bridge, so the check asks whether the bridge that exports the symbol calls the operation **somewhere**, not whether the symbol itself calls it.

### 3.2 The commands

```bash
node scripts/check-bridge-surface.mjs        # the gate
node scripts/check-bridge-surface.mjs --self-test   # the negative self-test
npm run check:bridge-surface                 # the same gate
npm run check:bridge-surface:test            # the same self-test
```

The gate is wired into `npm run check:all` as the sixth of the eight gates (`scripts/check-all.mjs`).

---

## 4. The exceptions

There is **one** exemption. It is printed by the gate on every run as the warning `BS-101`.

### `Session::from_state` — the rehydration of a stored state

> **Not exported by any bridge.** The rehydration of a stored state (CORE-103) is implemented in the base and is used by the conformance runner to replay a vector, but the persisted state is not part of the wire model of any bridge, so a shell cannot restore a running session after a crash. The operation is listed here so that the gap stays visible instead of being silently unreachable.

**What this means, measured.**

| | |
|---|---|
| The operation | `core/phomu-core/src/session/commands.rs:35` |
| Called by | `core/phomu-conformance/src/runner/session.rs:103` (the conformance runner) |
| Exported by | no bridge |
| Consequence | a shell that reloads a session after a crash cannot restore the scores, the round history, the played songs, the timeline and the state of the generator — `phomu_session_new` starts a new game, it does not continue an old one |

**Why it is an exemption and not a bridge symbol.** Exposing it needs three things that are not decided yet: the persisted state has to become part of the wire model of the bridges, the write access of a shell to that state has to be bounded, and the change of the exported surface has to come with an ABI version bump ([`ADR-0008`](../adr/ADR-0008-abi-version-and-the-exported-surface.md)). That is a decision for the owner — it is **OPEN-BS-01** in § 8.

**What the exemption is and is not.** It is a record, not a resolution. Before this report the operation was unreachable and undocumented; now it is unreachable, named, and printed by a gate on every run. The gate does not claim that the operation is reachable — it claims that the question is answered.

### 4.1 The read-only operations without a symbol of their own

Six read-only operations carry no bridge symbol and need no exemption:

| Operation | How a shell reads it |
|---|---|
| `Session::state` | the shell reads the snapshot, never the internal state — the bridge owns the projection (`core/phomu-core/src/session/dto.rs`) |
| `Session::phase` | `SessionSnapshot.phase` (`phomu_session_snapshot`) |
| `Session::current_mode` | `SessionSnapshot.current_mode` (`phomu_session_snapshot`) |
| `Session::active_turn_id` | `SessionSnapshot.turn_order` and `current_turn_index` (`phomu_session_snapshot`) |
| `Session::rng_state` | the state of the generator is an internal value of the base; a shell restores it with `phomu_session_restore_rng_state`, it does not read it |
| `Session::round_view` | the round view is the answer of `phomu_session_start`, `phomu_session_draw`, `phomu_session_reveal` and `phomu_session_timeout` |

They are listed anyway, so that the list of the operations of the session is complete and a change of one of them is visible.

---

## 5. The self-test

A gate that has never been seen red is not a gate ([`BUILD-CONTRACT.md`](../design/BUILD-CONTRACT.md) § 7.1). The self-test runs the gate against four permanent fixture trees and against the repository, and then creates two temporary violations **inside the repository**, proves that the gate turns red for each of them, undoes them and proves that the gate turns green again. The declaration is byte identical to the original afterwards — the self-test leaves no state in the repository.

### 5.1 The fixtures

| Fixture | What it contains | What the gate has to say |
|---|---|---|
| `scripts/fixtures/bridge-surface/ok/` | a session with three operations, a bridge that reaches them, a declaration that lists them | exit 0 |
| `scripts/fixtures/bridge-surface/missing-operation/` | the declaration does not list `Session::reset_scores` | `BS-001` — *is not declared* |
| `scripts/fixtures/bridge-surface/typo-bridge/` | the declaration names `phomu_session_stat` | `BS-003` — *exists in no bridge* |
| `scripts/fixtures/bridge-surface/uncovered-operation/` | a state-changing operation with neither a symbol nor an exemption | `BS-002` — *neither a bridge symbol nor an exemption* |
| `scripts/fixtures/bridge-surface/unknown-operation/` | the declaration names `Session::start_the_game` | `BS-004` — *which the session does not have* |
| `scripts/fixtures/bridge-surface/bridge-and-exemption/` | an entry names a symbol **and** an exemption | `BS-005` — *names a bridge symbol and an exemption* |

### 5.2 The result

```
Self-test of the bridge-surface gate
========================================================================
  [PASS] the fixture "ok" is green
  [PASS] the fixture "missing-operation" is red and names the violation
  [PASS] the fixture "typo-bridge" is red and names the violation
  [PASS] the fixture "uncovered-operation" is red and names the violation
  [PASS] the fixture "unknown-operation" is red and names the violation
  [PASS] the fixture "bridge-and-exemption" is red and names the violation
  [PASS] the repository matches the state the gate reports
```

**11 of 11 assertions passed.**

### 5.3 The red output — an operation removed from the declaration

The violation: the entry of `Session::award_points` is removed from `platform/bridge-surface.json`. The output of the gate, verbatim:

```
--- the gate, with the violation (must be red) -------------
Bridge surface gate
========================================================================
root:        /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu
declaration: /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu/platform/bridge-surface.json
session operations: 34
bridge symbols:      45
declared operations: 33
  state-changing:    23
  read-only:         10
  with a bridge:     26
  with an exemption: 1

1 warning(s):
  [BS-101] the operation Session::from_state is exempted instead of being exported
      /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu/platform/bridge-surface.json
      Not exported by any bridge. The rehydration of a stored state (CORE-103) is implemented in the base and is used by the conformance runner to replay a vector, but the persisted state is not part of the wire model of any bridge, so a shell cannot restore a running session after a crash. The operation is listed here so that the gap stays visible instead of being silently unreachable; it is recorded as OPEN-BS-01 in docs/qa/QA-12-BRIDGE-SURFACE.md.

1 bridge surface violation(s) found:
  [BS-001] the operation Session::award_points of the session is not declared
      core/phomu-core/src/session/commands.rs:161
      every public operation of the session has to be declared, with a bridge symbol or with an exemption
--- exit code: 1 -------------------------------
```

### 5.4 The red output — a bridge symbol renamed (the typo)

The violation: the symbol of `Session::award_points` is renamed from `phomu_session_award_points` to `phomu_session_award_point`. The output of the gate, verbatim:

```
--- the gate, with the violation (must be red) -------------
Bridge surface gate
========================================================================
root:        /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu
declaration: /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu/platform/bridge-surface.json
session operations: 34
bridge symbols:      45
declared operations: 34
  state-changing:    24
  read-only:         10
  with a bridge:     27
  with an exemption: 1

1 warning(s):
  [BS-101] the operation Session::from_state is exempted instead of being exported
      /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu/platform/bridge-surface.json
      Not exported by any bridge. The rehydration of a stored state (CORE-103) is implemented in the base and is used by the conformance runner to replay a vector, but the persisted state is not part of the wire model of any bridge, so a shell cannot restore a running session after a crash. The operation is listed here so that the gap stays visible instead of being silently unreachable; it is recorded as OPEN-BS-01 in docs/qa/QA-12-BRIDGE-SURFACE.md.

1 bridge surface violation(s) found:
  [BS-003] the operation Session::award_points names the bridge symbol phomu_session_award_point, which exists in no bridge
      /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu/platform/bridge-surface.json
      the symbol has to be exported by one of the bridges of platform/
--- exit code: 1 -------------------------------
```

### 5.5 The green output — the violations undone

```
--- the gate, with the violations undone (must be green) -----
Bridge surface gate
========================================================================
root:        /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu
declaration: /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu/platform/bridge-surface.json
session operations: 34
bridge symbols:      45
declared operations: 34
  state-changing:    24
  read-only:         10
  with a bridge:     27
  with an exemption: 1

1 warning(s):
  [BS-101] the operation Session::from_state is exempted instead of being exported
      /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/github/Phomu/platform/bridge-surface.json
      Not exported by any bridge. The rehydration of a stored state (CORE-103) is implemented in the base and is used by the conformance runner to replay a vector, but the persisted state is not part of the wire model of any bridge, so a shell cannot restore a running session after a crash. The operation is listed here so that the gap stays visible instead of being silently unreachable; it is recorded as OPEN-BS-01 in docs/qa/QA-12-BRIDGE-SURFACE.md.

No bridge surface violation found.
--- exit code: 0 -------------------------------

  [PASS] the undone violations turn the gate green again
  [PASS] the declaration is byte identical to the original

========================================================================
✅ All 11 assertions passed.
```

---

## 6. What this closes

| Finding | State | Evidence |
|---|---|---|
| **QA-RST-001** — the WebAssembly bridge exported three functions | **closed** | The bridge exports 37 symbols, the game loop among them; the export section of the built module is compared against the declaration by `platform/phomu-wasm/tests/export_surface.rs` and the fingerprint of the surface is asserted (`platform/phomu-wasm/src/surface.rs`). This report adds the operation-level view: 27 of the 34 operations of the session are reachable through the symbols of the bridges. |
| **QA-RST-002** — an unanswered round could not be closed | **closed** | `Session::force_reveal` is exported as `phomu_session_timeout` (`platform/phomu-wasm/src/exports_session.rs:200`); the transition table is tested against the dead ends in `core/phomu-core/tests/phase_escape.rs`. The gate of this report proves that the command stays exported: a rename of the symbol turns `BS-003` red. |
| **QA-RST-003** — 20 of the 32 public operations of the session were unreachable | **closed** | The declaration `platform/bridge-surface.json` names a bridge symbol or a written exemption for every one of the 34 public operations; the gate `scripts/check-bridge-surface.mjs` fails when an operation has neither. The one remaining gap is named in § 4 as **OPEN-BS-01**. |

The status of the three findings in [`QA-11-RUST-BASE.md`](QA-11-RUST-BASE.md) has been updated accordingly.

---

## 7. What this report does not claim

- **It does not claim that the bridges are correct.** The gate compares names, not behaviour. Whether a bridge computes the right answer is proven by the round-trip tests of the three crates and by the conformance gate — not here.
- **It does not claim that a shell should reach every operation.** The gate asks whether the question "is this operation reachable?" has an answer, not whether the answer has to be *yes*. An exemption is a legal answer; the gate makes it visible.
- **It does not read the export section of the built WebAssembly module.** It reads the sources of the bridges — the `pub fn phomu_*` of `platform/*/src/**`, as the acceptance criterion asks. Two symbols of that set are Rust-level helpers without the export attribute of their bridge (`phomu_catalog_open_json` in `platform/phomu-wasm/src/catalogue_exports.rs:52`); the export section of the module is checked by the surface test of the crate.
- **It does not prove that the declaration is complete against the *intent* of a shell.** It proves that it is complete against the *code*: every public operation of the session is listed. Whether a shell wants an operation is a question for the owner.
- **The one exemption is a record, not a resolution.** `Session::from_state` is still unreachable from every shell. The gate makes that visible on every run; it does not close the gap.

---

## 8. The open item for the owner

### OPEN-BS-01 — Should a shell be able to restore a session after a crash?

`Session::from_state` is implemented in the base (`core/phomu-core/src/session/commands.rs:35`), it carries the schema version of the persisted state (CORE-103), and no bridge exports it. The question is not technical but one of contract:

1. **Does the persisted state belong to the wire model?** If yes, the bridges need a symbol that takes a persisted state and returns a session, and the write access of a shell to that state has to be bounded.
2. **If yes, what is the ABI cost?** A new symbol is a change of the exported surface and therefore an ABI version bump with a fingerprint change ([`ADR-0008`](../adr/ADR-0008-abi-version-and-the-exported-surface.md)).
3. **If no, what is the alternative?** A shell that reloads a session has to replay it, and the owner has to say so in the contract — the exemption would then be the final wording of the decision rather than a record of a gap.

Until the owner decides, the operation stays exempted and the gate prints the exemption on every run.

---

## 9. The acceptance summary of this report

| Item | Severity | Accept when |
|---|---|---|
| QA-12-001 The bridge surface of the session has to be declared and checked | **P2** | Every public operation of the session is declared with a bridge symbol or a written exemption; a gate fails when a new operation has neither; the gate has been seen red |
| OPEN-BS-01 The rehydration of a stored state is not exported | P2 (open) | The owner decides whether the persisted state belongs to the wire model of the bridges |
