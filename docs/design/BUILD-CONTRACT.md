# Phomu — Build Contract

> **Status:** Binding. Every crate in the Phomu workspace is built against this
> document.
> **Owner:** Chief Architect. Changes require an ADR in [`../adr/`](../adr/).
> **Companion:** [`PLATFORM-ARCHITECTURE.md`](PLATFORM-ARCHITECTURE.md) — the
> reasoning behind the rules here. This document is the normative one.

This document defines the **interfaces** between the crates. It deliberately
does **not** define how the game works internally — that is the job of the
crate that implements it. If a worker finds that a rule here prevents a
correct implementation, the rule is wrong and must be changed here first.

> **Status of the workspace:** none of the crates described here exists yet.
> This document specifies the contract that the first Rust workspace in this
> repository must satisfy. It is written so that it can be checked
> mechanically from the first commit of that workspace.
>
> **Measurement basis:** the numbers quoted here were measured on the working
> tree of branch `main` at commit `3d3d011` on 2026-10-25. The repository is
> under concurrent work; a drifted figure is re-measured, not defended.

---

## 1. Crate topology

```text
apps/android          Kotlin + Jetpack Compose shell        (UniFFI client)
apps/tv-android       Kotlin + Compose for TV shell          (UniFFI client)
apps/macos            SwiftUI + AppKit shell                  (UniFFI client)
apps/ios-ipados       SwiftUI shell                           (UniFFI client)
apps/linux            Rust shell (egui/winit)                 (Cargo client)
apps/windows          Rust shell (egui/winit)                 (Cargo client)
apps/web              Next.js 16 + React 19 shell             (wasm-bindgen client)
                                                     — logical name only, the
                                                       physical location is the
                                                       repository root today

platform/phomu-ffi    UniFFI bindings for Kotlin and Swift    (depends on core, formats)
platform/phomu-wasm   wasm-bindgen bindings for the web shell (depends on core, formats)
platform/phomu-capi   C-ABI (cdylib + header)                 (depends on core, formats)

core/phomu-core       The game rules                          (depends on core/*, formats/*)
core/phomu-catalog    Catalogue model and selection           (depends on core/*)
core/phomu-media      Media provider policy                   (depends on core/*)
core/phomu-i18n       Message-key catalogue                   (depends on core/*)
core/phomu-config     Every constant, exactly once            (depends on core/*)
core/phomu-errors     The error taxonomy                      (depends on nothing)
core/phomu-conformance Conformance vectors (never shipped)    (depends on core/*)

formats/phomu-qr      QR intent codec                        (depends on nothing)
formats/phomu-cards   Card layout data                        (depends on nothing)

tools/catalog-tool    Catalogue build and validation          (depends on core/*, formats/*)
tools/media-report    Link audit and reporting                (depends on core/*, formats/*)
tools/conformance-runner Replays the vectors against a shell  (depends on core/*, formats/*)
```

### 1.1 The dependency rule (hard)

Arrows point strictly downwards, with one named exception.

| From | May depend on |
|---|---|
| `apps/*` | `platform/*` |
| `platform/*` | `core/*`, `formats/*` |
| `core/phomu-core` | `core/{phomu-config, phomu-catalog, phomu-i18n, phomu-media, phomu-errors}`, `formats/*` |
| `core/phomu-catalog` | `core/{phomu-config, phomu-errors}` |
| `core/phomu-media` | `core/{phomu-config, phomu-errors}` |
| `core/phomu-i18n` | `core/phomu-errors` |
| `core/phomu-config` | `core/phomu-errors` |
| `core/phomu-errors` | nothing |
| `core/phomu-conformance` | `core/*`, `formats/*` |
| `formats/*` | nothing |
| `tools/*` | `core/*`, `formats/*` |

**The exception: the bridge may depend on the core.** The bridges hold the
**composition root** — the one place that knows which core services exist and
hands them to the shell. Without it the shell receives an empty façade and
every call answers with *"no implementation is registered"*. The cost is that
the bridge links the whole core; the price is paid once, in the binary of the
product, and it buys a shell that actually plays.

A `formats/*` crate must not depend on a `core/*` crate. A `core/*` crate must
not depend on `platform/*` or `apps/*`. `core/phomu-errors` must not depend on
anything. **A shell must not depend on a `core/*` crate directly** — it
reaches the core through the generated bindings, so that the same rules serve
every shell.

The single exception to the shell rule: `apps/linux` and `apps/windows` are
Rust and depend on `core/phomu-core` **directly as a Cargo dependency**, but
only on its `facade` module — the same surface the bridges export. This is
not an FFI boundary; it is the same boundary with the compiler checking it
instead of a marshalling layer.

### 1.2 The rules that are not in a dependency graph

1. **No I/O in `core/*`.** The core never opens a file, never opens a socket,
   never reads the clock, never reads the environment and never generates
   randomness on its own. Bytes, timestamps and seeds arrive from the shell.
2. **No platform names in `core/*`.** The strings `android`, `ios`, `macos`,
   `windows`, `tv` and `web` must not appear as a branch condition. Platform
   differences arrive as capability values.
3. **No user-visible text in `core/*`.** The core carries keys (§6).
4. **No `unsafe` in `core/*`** unless an ADR justifies it and the workspace
   lint is overridden locally, never globally.

---

## 2. The contract between `phomu-core` and the bridges

### 2.1 What the bridges export

The bridge exports **one** surface: `core/phomu-core/src/facade.rs`. The
UniFFI crate, the wasm crate and the C-ABI crate are three marshalling
strategies over that one surface. They therefore cannot drift from each
other — a change to the facade changes all three, and the generated bindings
are regenerated in the same build.

### 2.2 The exported types

| Type | Purpose | Notes |
|---|---|---|
| `GameConfigDto` | the game configuration the shell passes in | the internal representation stays inside `phomu-config` |
| `SessionHandle` | an opaque session identifier | a handle, not an object; no Rust reference crosses the boundary |
| `SessionSnapshot` | the whole session state at a point in time | immutable; the shell cannot mutate it |
| `RoundView` | the view model of the current round | **phase-dependent** — see §4 |
| `ScoreSnapshot` | the scores after an answer | |
| `GameOverSnapshot` | the end-of-game state | |
| `Capabilities` | what this shell can do | filled by the shell, read by the base |
| `MediaPlan` | the provider, the offsets, the fallback chain | the policy is decided by the base |
| `CatalogHandle`, `PackInfo`, `SongSummary` | the catalogue access | the shell supplies the bytes |
| `PhomuError` | `{ code, message_key, context }` | `code` is a closed enum; `message_key` is resolved by the shell |
| `ErrorCode` | the closed error taxonomy | from `core/phomu-errors` |
| `JobHandle` | a long-running operation | the shell polls; the core never calls back |

### 2.3 What the bridges do not export

| Not exported | Why |
|---|---|
| the internal `GameState` | the shell may only see the view models |
| `PhomuSong` as a whole | it contains the solution; only derived views cross the boundary (§4) |
| the internal configuration representation | the shell passes a DTO in, not a config object |
| the provider SDKs and the catalogue loader | those are implementations |
| `std::error::Error` trait objects, boxed errors, anyhow-style errors | the taxonomy is closed and typed |
| panics and unwinds | a panic is converted into `ErrorCode::Internal`; it must never cross the boundary |
| raw pointers, references, borrowed data | the boundary is value-based |
| `unsafe` types | §1.2, rule 4 |
| callbacks that capture Rust state | the core never calls the shell |

### 2.4 The bridge rules

| Rule | Detail |
|---|---|
| **B-1** | Every exported function takes and returns **owned** values or opaque handles. |
| **B-2** | Every fallible function returns `Result<T, PhomuError>`; the error carries a `message_key`, never a translated sentence. |
| **B-3** | The core never calls into the shell. Long operations return a `JobHandle`; the shell polls `job_status`. |
| **B-4** | A panic inside the core is caught at the boundary and becomes `ErrorCode::Internal`. |
| **B-5** | The exported surface is **closed**: a new export is a minor version bump (§3). |
| **B-6** | The generated bindings are **generated**. They are never hand-edited, and a hand-edited binding is a build failure. |
| **B-7** | The web shell's bridge is `platform/phomu-wasm`. The web shell has no server ([`../../next.config.ts`](../../next.config.ts) sets `output: 'export'`), so WebAssembly is the only path to the shared rules without a second implementation. |
| **B-8** | The core has no knowledge of the transport. The same facade is reachable through UniFFI, wasm-bindgen and the C-ABI, and the observable behaviour is identical on all three. |

---

## 3. Incompatible changes: the ABI version and the migration path

### 3.1 The version

The ABI version is `MAJOR.MINOR.PATCH`, all `u16`. It lives in three places
that must agree:

| Place | Form |
|---|---|
| `core/phomu-core/src/abi.rs` | the source of truth |
| the generated UniFFI / wasm bindings | `abi_version() -> String` |
| the generated C header | `PHOMU_ABI_VERSION_MAJOR`, `PHOMU_ABI_VERSION_MINOR`, `PHOMU_ABI_VERSION_PATCH` |

A unit test asserts that the three agree. A stale header is a **build**
failure, not a runtime surprise.

### 3.2 The bracket

Every shell declares the bracket of base versions it accepts:

```text
shell expects:  abi_min = 1.0   abi_max = 1.99
core reports:   1.3.0
check:          1.0 <= 1.3 <= 1.99   → accepted
```

At start-up the shell performs the check. If the base's version is outside the
bracket, **the shell refuses to start** and names both versions. The same
check runs in CI as a build condition.

### 3.3 What is a breaking change

| Change | Version impact |
|---|---|
| An export is removed or renamed | **major** |
| The semantics of a field or an error code change | **major** |
| A field of a DTO becomes required | **major** |
| An export is added | **minor** |
| An optional DTO field is added | **minor** |
| An internal change | **patch** |

### 3.4 The migration path

A major bump takes one of two paths. A silent break is not a path.

1. **Coordinated release.** The core and all shells are released together with
   the new major.
2. **Deprecation window.** The core exports *both* majors for one full minor
   series. `abi_versions()` returns both, so a shell can discover what it may
   use. Removing the old major is itself a major bump.

A major is removed only when `abi_versions()` no longer lists it **and** no
supported shell declares a bracket that contains it.

### 3.5 The rule for the repository

The repository's `version` in `package.json` is the **web shell's** version.
The ABI version is the **base's** version. They are independent and are
versioned independently. A shell release pins the base version through its
bracket; the shell's own release notes state the bracket it was built
against.

---

## 4. The anti-spoiler contract as an interface rule

The contract in [`PLATFORM-ARCHITECTURE.md`](PLATFORM-ARCHITECTURE.md) §10 is
an **interface** rule, not a convention:

> **C-1 — View-model redaction.** In the phase `question` the base hands the
> shell a `RoundView` that contains no field capable of revealing the
> solution. The title, the artist, the year and the raw hints are **absent
> from the type** — not present and blank.
>
> **C-2 — Censoring in the base.** Hint censoring is performed by the base.
>
> **C-3 — No answer on the wire.** No bridge call made during the phase
> `question` returns the answer.
>
> **C-4 — No answer on the disk.** The set of persistable fields is defined by
> the base. The song is not in it.
>
> **C-5 — The projector.** The projector view contains no artist, no title and
> no cover art.
>
> **C-6 — Mode exceptions are explicit.** A mode's exception is declared in
> the base and is therefore identical on every platform.

### 4.1 How the rules are implemented

| Rule | Implementation |
|---|---|
| C-1 | `RoundView` is **phase-dependent**: the question-phase variant is a different type with no answer field. The reveal-phase variant adds a `SongSolution { title, artist, year }`. The two are separate types; the question-phase type has no member that could carry a title. |
| C-2 | `phomu-core/src/spoiler/` owns the censoring. No shell implements a censoring rule. |
| C-3 | The bridge surface has no function that returns the answer while the phase is `question`. A call that would need it returns `ErrorCode::NotAvailableInPhase`. |
| C-4 | `phomu-core` exports `persistable_fields() -> Vec<FieldId>`. The shell persists exactly those fields. |
| C-5 | The projector renders the projector view model, which has no answer field. |
| C-6 | The mode declares `reveals_identity: bool` in `phomu-core/src/modes/`. The shell does not decide. |

### 4.2 How the rules are checked

| Check | Where |
|---|---|
| the question-phase `RoundView` has no answer field | a compile-time check: the type has no such member — plus a test that serialises it and asserts that none of the song's title, artist and year tokens occur |
| the persistable set contains no song field | a test in `phomu-core` |
| the bridge returns nothing that reveals the answer during the question phase | a round-trip test that drives the whole FFI surface through one round and greps every serialised payload for the answer tokens |
| the rendered tree of each shell contains no answer | a per-shell test |
| the catalogue hints contain no spoiler | the existing [`../../scripts/audit-spoilers.js`](../../scripts/audit-spoilers.js) |

**The catalogue is the exception to "the base carries no text".** Song titles,
artists and lyrics are *content*, not UI; they are never translated and never
part of the key space. This mirrors the existing decision in
[`../adr/ADR-0004-internationalisierungsgrenze.md`](../adr/ADR-0004-internationalisierungsgrenze.md).

---

## 5. Configuration: one source, no duplicates

### 5.1 The rule

> **Every game constant exists in exactly one place in the whole workspace:
> `core/phomu-config`.**

| Rule | Detail |
|---|---|
| **K-1** | `core/phomu-config` is the only place where a game constant is defined. |
| **K-2** | No shell defines a game constant. A shell that needs a value takes it from the base's DTO. |
| **K-3** | During the migration, a shell may hold a **generated** projection of the configuration. The generated file is marked as generated, is produced by a tool, and a hand edit is a build failure. |
| **K-4** | The configuration is read-only. Runtime variation is a `GameConfig` value passed into the session, never a change to the constants. |
| **K-5** | Every value that the base reads must be declared in `phomu-config`. A magic number in the base is a defect. |

### 5.2 What moves there

The configuration is the set of values that today live in
[`../../src/config/`](../../src/config), plus the numbers that today live
next to the code that uses them. The second group is the interesting one: the
game contract lists **20 locally defined numbers** that are not in
`PHOMU_CONFIG` ([`GAME-CONTRACT.md`](GAME-CONTRACT.md) §11.3) — the lyrics
points, the survivor points, the vibe-check points, the cover-confusion point
arrays, the cheat deductions, the auto-skip countdown, the start timeout, the
report rate limit, the end-offset interval and the lobby presets. They all
belong in `phomu-config`.

### 5.3 What does **not** belong in the configuration

| Not configuration | Where it goes |
|---|---|
| catalogue content — the pack names, taglines, emojis and gradients of the 27 packs in [`../../src/config/game-config.ts`](../../src/config/game-config.ts):89-279 | the catalogue artefact, built by `tools/catalog-tool`; they are content, not rules |
| the song model — the field list of `PhomuSong` | `core/phomu-catalog` |
| server-side limits — the admin token length, the image size limit | the server side; never in the client and never in the base |
| the shell's own layout constants — a pixel width, a colour | the shell's own design tokens |

### 5.4 The check

| Check | How |
|---|---|
| no magic number in the base | a lint rule plus a review rule; every number in `core/*` is either a literal in `phomu-config` or a type-level constant with a name |
| no duplicate definition across the workspace | the boundary gate and a review rule: a value that exists in `phomu-config` may not exist as a literal in a shell |
| the generated projection matches the source | a build step that regenerates it and fails when the result differs |

---

## 6. i18n: the base supplies keys, the shells supply texts

### 6.1 The rule

> **The base supplies message *keys*. The shells supply the *texts*. The base
> never contains a sentence that a user reads.**

| Rule | Detail |
|---|---|
| **L-1** | The key space lives in `core/phomu-i18n` and is **closed**. A key that does not exist there cannot be emitted. |
| **L-2** | A key is dot-separated and `camelCase`: `game.feedback.correct`, `errors.audioBlocked`. A key never contains a placeholder — the placeholder lives in the **value**. |
| **L-3** | The base maps a *game event* to a key: `message_key(event, args)`. The shell turns the key into text. |
| **L-4** | Every shell has its own locale files: `de.json`/`en.json` for the web shell, `values/strings.xml` for Android, `Localizable.strings` for Apple, and one JSON or FTL resource per locale for the desktop shells. |
| **L-5** | A key that the base can emit must exist in **every** locale of **every** shell. The check is per shell. |
| **L-6** | The catalogue content is not translated and is not part of the key space (§4.1). |
| **L-7** | The error type carries a `message_key`; the shell resolves it. An error message is never assembled in the base. |

### 6.2 Why the base supplies keys and not texts

A base that carried texts would make the texts part of the binary and of the
crate's public API. Adding a language would then be a change to the base, a
change to every shell's dependency, and a new release of every shell. The key
space keeps the base language-neutral and lets each shell carry its own
resources — which is also what the existing web shell already does
([`../../src/i18n/locales/de.json`](../../src/i18n/locales/de.json) and
`en.json`, 1,258 leaf keys each, measured 2026-10-25).

### 6.3 The checks

| Check | How |
|---|---|
| the key space is closed | a compile-time check: the key type is an enum, so an unknown key does not compile |
| every shell is complete | a per-shell completeness gate, modelled on the existing [`../../scripts/check-i18n-completeness.mjs`](../../scripts/check-i18n-completeness.mjs) |
| no text in the base | a source scan for string literals that are not identifiers, keys or error codes |
| the base's locale-independent output is stable | the conformance vectors compare the **keys**, not the texts |

---

## 7. The gate's self-test

The boundary gate `scripts/check-crate-boundaries.mjs` (§1.1) is only worth
something if it **fails** when it must. A gate that has never been seen red is
not a gate.

### 7.1 The rule

> **The gate has a negative test that actually exercises the violation.** A
> test that cannot fail is not a test. (The same rule as the PhairPlayRust
> build contract §5.)

### 7.2 How the self-test works

| Step | Detail |
|---|---|
| 1 | The gate accepts `--root=<path>` and `--rules=<path>`, so it can be run against an isolated tree. This is the same isolation mechanism that [`../../scripts/check-doc-links.mjs`](../../scripts/check-doc-links.mjs) already uses (the option exists there at lines 45–50). |
| 2 | Two fixture trees exist under `scripts/fixtures/crate-boundaries/`: `ok/` (a minimal workspace with no violation) and `violation/` (the same workspace with one deliberate violation — a `core/phomu-core` that has a path dependency on `platform/phomu-ffi`). |
| 3 | The self-test runs the gate against `ok/` and asserts **exit code 0**. |
| 4 | The self-test runs the gate against `violation/` and asserts **exit code 1** — and asserts that the output names the violating edge (`core/phomu-core` → `platform/phomu-ffi`) and the rule that was violated. |
| 5 | The self-test runs the gate against the repository root and asserts that its result matches the repository's actual state. A gate that reports "no violations" for a tree it cannot parse is a broken gate. |
| 6 | The self-test is part of `npm run check:all` and of the CI job. |

### 7.3 The additional negative cases

Each of these is a separate fixture, because each one catches a different
mistake in the gate itself:

| Fixture | The mistake it catches |
|---|---|
| a shell with a direct path dependency on `core/phomu-core` | the gate does not check rule 1.1's shell rule |
| a `formats/*` crate with a dependency on `core/*` | the gate does not check the format rule |
| `core/phomu-errors` with any dependency | the leaf rule is not enforced |
| an `include!` of a file outside the crate directory | the gate misses a path that bypasses Cargo |
| a C header whose version differs from the Rust source | the ABI consistency check does not run |
| a workspace that does not exist | the gate crashes instead of reporting "SKIPPED" |

### 7.4 The rule for the gate's own code

The gate is a Node ES module in `scripts/`, like the existing gates. It has no
dependencies beyond the Node standard library, it prints one finding per line
in a stable format, and it exits with 0 or 1 — never with anything else.

---

## 8. Who may change this contract, and how

| Rule | Detail |
|---|---|
| **X-1** | The Chief Architect owns this document. |
| **X-2** | A change to §1 (the dependency rules) requires an ADR. |
| **X-3** | A change to §2 (the exported surface) requires an ADR **and** an ABI major bump. |
| **X-4** | A change to §4 (the anti-spoiler contract) requires an ADR. |
| **X-5** | A change to §5 or §6 requires an ADR only when it moves a boundary; a clarification is a direct edit in the same commit. |
| **X-6** | A change to §7 requires an ADR, because it changes what "checked" means. |
| **X-7** | The ADR format is [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md). An ADR without the rejected alternative is a note, not a decision. |
| **X-8** | **The rule is wrong, not the implementation.** Whoever finds that a rule here prevents a correct implementation changes the rule here first, in the same change, with the ADR. |

### 8.1 The change matrix

| Change | ADR? | ABI bump? |
|---|---|---|
| a new crate in `core/` | yes | no, if it exports nothing new |
| a new export on the facade | no | minor |
| a removed or renamed export | yes | major |
| a new dependency direction | yes | no |
| a new provider kind | yes | minor |
| a new i18n key | no | no |
| a new game constant | no | no |
| a relaxation of an anti-spoiler rule | yes | major |
| a change to the gate's rules | yes | no |

---

## 9. Code style

| Rule | Value |
|---|---|
| Rust edition | 2024 |
| Minimum toolchain | pinned in `rust-toolchain.toml` — the file does not exist yet |
| `unsafe_code` | denied workspace-wide |
| `unwrap()` / `expect()` | denied workspace-wide |
| `missing_docs` | warn — every public item is documented |
| File length | target ≤ 400 lines, hard maximum 550 lines — the same limits as the JavaScript side ([`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) §6) |
| Formatting | `cargo fmt` |
| Lints | `cargo clippy -- -D warnings` |
| Generated code | generated, never hand-edited |

Every module starts with a doc comment that states **what** it is, **why** it
exists and, where it helps, a short example.

---

## 10. The testing contract

1. **Every public function of the base has a unit test.** Not "most" — every
   one.
2. **Every hardening measure has a negative test** that actually exercises the
   attack or the defect.
3. **A test that cannot fail is not a test.** No `assert!(true)`, no test that
   only checks the absence of a panic.
4. **No test is skipped, ignored or commented out** to make a build green.
5. **No stub returns a fake success.** `Ok(())` in place of real work is a lie
   that the acceptance process will catch.
6. **No invented numbers.** A measured value is quoted with the command that
   produced it.
7. **The rules are tested without an emulator.** A rule that can only be
   verified on a device has been put in the wrong place.
8. **The conformance vectors are the acceptance evidence** that the shells
   behave identically ([`PLATFORM-ARCHITECTURE.md`](PLATFORM-ARCHITECTURE.md)
   §1.3).

---

## 11. Licensing

- The whole workspace inherits the repository's licence. The repository is
  licensed **AGPL-3.0-or-later** ([`../../package.json`](../../package.json):4). Every
  `Cargo.toml` inherits it — never a literal.
- Every source file that carries a licence header carries the same header.
- Third-party code keeps its own licence and is listed in the third-party
  inventory.
- The dependency policy is enforced by a `deny.toml` and a `cargo-deny` gate
  in CI. **The pinned `cargo-deny` version is part of the configuration**: a
  different version reads the same `deny.toml` differently. Use the pinned
  version or the gate is not a gate.
- The licence compatibility of the base with the app-store distribution
  channels is **not** settled by this document. It is open decision **O-3** in
  [`PLATFORM-ARCHITECTURE.md`](PLATFORM-ARCHITECTURE.md) §15 and it gates the
  iOS/iPadOS track.

---

## 12. Related documents

| Document | Relation |
|---|---|
| [`PLATFORM-ARCHITECTURE.md`](PLATFORM-ARCHITECTURE.md) | the reasoning behind the rules in this document |
| [`GAME-CONTRACT.md`](GAME-CONTRACT.md) | the game behaviour that the base must implement |
| [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) | the layers and the dependency direction of the web shell |
| [`../adr/ADR-0005-shared-rust-core-with-platform-frontends.md`](../adr/ADR-0005-shared-rust-core-with-platform-frontends.md) | the decision for the shared base |
| [`../adr/ADR-0006-binding-platform-track-order.md`](../adr/ADR-0006-binding-platform-track-order.md) | the decision for the platform order |
| [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md) | the ADR format that §8 requires |
