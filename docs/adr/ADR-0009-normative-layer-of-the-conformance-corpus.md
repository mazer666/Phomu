# ADR-0009 — The normative layer of the conformance corpus and the error namespace of the observation

**Status:** accepted
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** CORE-103, CORE-104, CORE-105, CORE-111, BRIDGE-101, GAME-002, UI-010

> **Language note.** This ADR is written in English, like ADR-0005 to ADR-0008.
> ADR-0001 to ADR-0004 are German. The language of a document is part of its
> identity and is recorded in
> [`../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
> § 15, open decision **O-10**.

---

## Context

### The measured starting point

The facts below were measured on branch `main` on 2026-10-25, working tree,
after the platform milestone P0.

| Fact | Value | Measurement |
|---|---|---|
| Vectors in the corpus of the web shell | 70 (64 portable, 6 marked as not portable) | `tmp/conformance-report.txt` |
| Vectors the TypeScript reference reproduces exactly | 64 of 64 portable | `node tools/conformance/compare-conformance.mjs --ts tmp/conformance-ts.json` |
| Vectors the Rust base reproduces exactly | 36 of 64 portable | `tmp/conformance-report.txt` |
| Vectors in which the base deviates from the reference | 28 | `tmp/conformance-report.txt` |
| Deviations with **no** explanation in the registry | 0 | `core/phomu-conformance/src/lib.rs` (`KNOWN_DIVERGENCES`) |
| The red Rust gate | `the_corpus_of_the_web_shell_differs_only_in_the_documented_places` | `cargo test -p phomu-conformance` |
| Error codes of the base | 29 | `core/phomu-errors/src/lib.rs` (`ErrorCode::ALL`) |
| Uses of `advance_phase` in the whole workspace | 1 — the conformance runner | `grep -rn "advance_phase" --include="*.rs"` |
| Bridges that export a timeout command | 0 of 2 | `platform/phomu-ffi/src/session.rs`, `platform/phomu-wasm/src/session.rs` |

### The force

The corpus of the web shell was **derived from the TypeScript reference**:
`core/phomu-conformance/vectors/web-shell/generate_corpus.py` states this in
its own header, and the measurement confirms it — the reference reproduces
all 64 portable vectors exactly.

The base implements the rules of the contract and therefore differs from the
reference wherever the reference does not implement them. The 28 deviations
are not noise: they fall into exactly three groups, each with one cause.

| Group | Vectors | Cause | Evidence |
|---|---|---|---|
| The phase `locked-in` | 24 | the base enters the phase when the last expected answer arrives; the reference types it and never enters it | `core/phomu-core/src/session/answers.rs:191-209`; deviation A6 in [`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md) § 11.1 |
| The reveal lock | 3 | the base refuses the reveal until the answers are locked in; the reference sets the phase without a lock | `core/phomu-core/src/session/answers.rs:219-229`; `src/stores/game-store.ts:439-441` |
| The answer without a player | 1 | the base refuses the whole answer; the reference evaluates the mode and applies its effect without recording the answer | `core/phomu-core/src/session/answers.rs:83-86`; `src/components/game/modes/TimelineMode.tsx:225-241` |

Two of the three groups are **not** a disagreement about the game: they are
the base closing a gap that the reference leaves open. The third is a real
difference in the atomicity of an answer.

### The two problems that this ADR settles

**Problem 1 — the corpus had no norm.** The corpus of the web shell describes
the reference. The corpus of the base (`core/phomu-conformance/vectors/core-*.json`)
describes the base. The two were compared with the same word — "deviation" —
although only one of them can fail. A failure in the corpus of the base is a
defect of the base; a difference in the corpus of the web shell is either a
deliberate difference or a migration debt of the reference.

**Problem 2 — the error vocabulary was invisible.** The observation carried
an `error` field, but the runner **discarded every typed error of the core**
(`fn ignore<E>(_error: E)` in `core/phomu-conformance/src/runner.rs`).
The field therefore only ever carried a failure of the *vector layer* — an
input that could not be executed at all. Two consequences:

1. The promise of § 1.4 of the platform architecture — *"the same named error
   situations and the same recovery behaviour"* — was **not checkable by any
   vector**, because the runner could not see an error situation.
2. The registry was **wrong**. `KNOWN_DIVERGENCES` registered
   `error/award-points-unknown-player` and `error/remove-unknown-timeline-year`
   with the reason *"the core answers with a typed error"* — but those two
   vectors could never diverge, because the error they were about was thrown
   away. The gate caught it: the diverging set had 30 entries, the registry
   32, and the equality assertion was red.

---

## Decision

### 1. The corpus has two layers, and each layer has its own norm

| Layer | Files | Norm | A failure means |
|---|---|---|---|
| the **corpus of the base** | `core/phomu-conformance/vectors/core-*.json` | **normative** — it asserts what the base does | a defect of the base |
| the **corpus of the web shell** | `core/phomu-conformance/vectors/web-shell/*.json` | **descriptive** — it records what the reference does at the time of the measurement | a migration debt of the reference, or a deliberate difference |

A vector of the corpus of the base must pass. A vector of the corpus of the
web shell that the base does not reproduce must be listed in
`KNOWN_DIVERGENCES` (`core/phomu-conformance/src/lib.rs`) and in
`core/phomu-conformance/vectors/intentional-divergences.json`, with a reason
that names the contract, the requirement and the owner decision that settles
it. The two lists must hold the same vectors — the test
`the_corpus_of_the_web_shell_differs_only_in_the_documented_places` enforces
the equality in both directions: a new difference that is not documented
fails, and a documented difference that no longer exists fails.

### 2. The direction of the gate is base → reference

The base is the specification; the reference is the implementation that is
migrated. The platform architecture already decides this:

> **The rule that makes S4–S5 safe: there is never a dual implementation.**
> The TypeScript rules are removed in the same change that the Rust rules
> take over. […] the conformance vectors would then only prove that one of
> the two implementations is right.
>
> — [`../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md) § 5.3

The corpus of the web shell is the **input** of that migration, not the
specification the base has to satisfy. A deliberate difference is therefore
not a defect of the base; it is work that the reference still owes. The
decision *whether* the reference or the base is right for a given behaviour is
an owner decision and is recorded as such — today as **OPEN-08** (the status
of the phase `locked-in`) and, newly, as **OPEN-11** (the atomicity of an
answer, § "Rejected alternatives" below).

### 3. The observation carries the error situation, in two namespaces

The field `error` of the observation carries the error situation of the last
refused input. The two namespaces are told apart by the code:

| Namespace | `code` | `message` | Meaning | Produced by |
|---|---|---|---|---|
| the **vector layer** | a name, e.g. `"UNKNOWN_SONG"` | a human-readable text | the input could not be executed at all — the replay ends | the runner |
| the **core** | the stable numeric code, e.g. `"1102"` | the i18n message key, e.g. `"errors.answersNotLocked"` | the input was executed and the rules refused it | the base |

The numeric code and the message key are the two identifiers the core
already owns and the two that the bridges already export
(`platform/phomu-ffi/src/error.rs:104-120`, `platform/phomu-wasm/src/lib.rs:74-81`).
**No third name is invented** for the error codes (CORE-104: every constant
has exactly one home).

A refusal of the rules is a **behaviour**, not a gap in the proof. The
comparison therefore classifies a vector whose observation carries a core
error as a deviation and compares it with the expectation of the vector — it
does not report it as "not comparable". Only a failure of the vector layer
makes a vector incomparable.

### 4. The timeout is a command of its own, not the transition `question → reveal`

The reveal lock and the end of the question round are **two different
events**:

* the **reveal lock** refuses the release of the solution while an answer
  can still arrive. The base implements it in `Session::reveal`
  (`core/phomu-core/src/session/answers.rs:219-229`) and in the transition
  `Session::advance_phase`
  (`core/phomu-core/src/session/commands.rs:75-110`).
* the **timeout** ends the question round *without* an answer. The base
  implements it in `Session::force_reveal`
  (`core/phomu-core/src/session/answers.rs:237-243`), which locks the round
  and then reveals it.

The contract names three triggers for the edge `question → reveal` — the
"everyone is done" button, the completion of a mode and the **expiry of the
question round** ([`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md)
§ 2.3, UI-010). The first two are covered by the reveal lock (the answers
are in, the round is locked, the reveal is permitted). The third is the
timeout and is a command of its own. Routing the timeout through
`advance_phase` would have made the reveal lock meaningless: the transition
would have released the solution without a lock, and the golden vector
`core/anti-spoiler-reveal-lock` — which asserts that the transition is
refused — would have failed.

**The gap that this decision exposes:** the timeout is implemented in the
core but **reachable from no shell**. Neither bridge exports a timeout
command, and the vector vocabulary has no timeout operation. A shell on the
base cannot implement the expiry of the question round. Closing that gap is
an addition to the exported surface and therefore a **minor** version bump of
the ABI (ADR-0008 § 3) — it is owner decision **OPEN-11**.

---

## Consequences

### Positive

- The two corpora have a clear norm. A red test in the corpus of the base is
  a defect of the base; a red test in the corpus of the web shell is a
  migration debt with a name.
- The error vocabulary of the base is part of the observation and therefore
  part of the proof. The promise of § 1.4 of the platform architecture —
  the same named error situations on every platform — became checkable.
- The registry is truthful: the two vectors that were registered but could
  never diverge now diverge, and the gate that compares the two sets is
  green.
- The difference between the reveal lock and the timeout is named in the
  code, in the contract and in the golden vector — three places that used to
  contradict each other.

### Negative / Trade-offs

- The observation format grew a second namespace. Every producer of the
  format (the Rust runner, the TypeScript runner) and every consumer (the
  comparison) has to know which namespace a code belongs to. The comparison
  knows it through the list of the codes of the vector layer
  (`tools/conformance/compare-conformance.mjs`).
- The reference has no typed errors of its own. It ignores an unknown player
  (`src/stores/game-store.ts:463`) and an unknown year
  (`src/stores/game-store.ts:611`). Every such vector therefore carries a
  difference between the two sides, and the difference is a *deliberate*
  one: the base is stricter. The reference has to migrate (step S4/S5).
- The corpus of the base is normative and therefore has to grow with the
  base. Every new rule of the base needs a vector in
  `core/phomu-conformance/vectors/core-*.json`; a rule without a vector is a
  rule without a proof.

### What the decision makes impossible

- A vector of the corpus of the base may no longer be weakened to make a
  test pass. The expectation of a normative vector is a statement about the
  contract, not a snapshot of the current behaviour.
- A typed error of the core may no longer disappear from the observation. A
  runner that discards it makes the promise of the named error situations
  unfalsifiable.
- The timeout may no longer be expressed as the transition
  `question → reveal` of the automaton. The transition is the release of a
  locked round; the timeout is the end of the question round.

---

## Rejected alternatives

### The runner keeps discarding the typed errors, and the two registered
### vectors are removed from the registry

Rejected because it makes the promise of the named error situations
unfalsifiable and because it contradicts three artefacts that already say the
opposite: the corpus (`portabilityNote` of
`error/award-points-unknown-player`: *"The Rust core is required to return a
typed error (CORE-111)"*), the registry (the same reason) and the
requirement CORE-111 itself. The gate was red precisely because the code did
not match the three.

### The timeout is routed through `advance_phase(RoundPhase::Reveal)`

Rejected because it dissolves the reveal lock. The transition would have
released the solution without a lock, the golden vector
`core/anti-spoiler-reveal-lock` would have failed, and the anti-spoiler
guarantee of GAME-002 would have depended on the honesty of the shell
instead of on the state machine. The timeout is a different event and has its
own command.

### The core carries a third identifier for its error codes — a name such as
### `UNKNOWN_PLAYER`

Rejected because it would be a third representation of the identity of an
error next to the numeric code and the message key. CORE-104 requires one
home per constant, and the bridges already export two identifiers. A name
would have to be maintained in three places at once.

### The corpus of the web shell is deleted and replaced by the corpus of the
### base

Rejected because the corpus of the web shell is the **migration input**: it
is the only written record of what the shipped product does, and the
difference between it and the base is the work list of the migration. A
single corpus would have hidden the size of that work list.

### The whole difference is resolved by changing the base to match the
### reference

Rejected because the reference is the implementation that is being
replaced, not the specification. The contract
([`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md)) and the
requirements (GAME-002, CORE-105 to CORE-111) are the specification; where
the reference deviates from them, the deviation is recorded as a deviation
(A6, A8) and the reference is migrated. The direction of the gate is the
consequence, and it is the direction the platform architecture already
decided (§ 5.3).

---

## Verification

| Check | Command / Location |
|---|---|
| The corpus of the base passes completely | `cargo test -p phomu-conformance --test conformance every_vector_of_the_base_passes` |
| The registry names exactly the vectors that deviate — in both directions | `cargo test -p phomu-conformance --test conformance the_corpus_of_the_web_shell_differs_only_in_the_documented_places` |
| Every documented difference carries a reason | `cargo test -p phomu-conformance --test conformance every_documented_difference_names_a_reason` |
| The two runners are compared field by field; a core error is a deviation, not a gap | `node tools/conformance/compare-conformance.mjs --ts tmp/conformance-ts.json --rust tmp/conformance-rust.json` |
| The reveal lock refuses the transition | `cargo test -p phomu-core --test round_automaton the_reveal_lock_refuses_the_transition_of_the_question_phase` |
| The timeout is a command of its own | `cargo test -p phomu-core --test round_automaton the_timeout_is_a_command_of_its_own` |
| The exported surface is unchanged by this ADR | `cargo test -p phomu-ffi` (the fingerprint test `the_surface_fingerprint_is_stable`) |
