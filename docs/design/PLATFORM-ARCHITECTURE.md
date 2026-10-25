# Phomu — Platform Architecture

**Document version:** 1.0
**Status:** Proposed — binding once the Owner accepts it
**Measurement basis:** 2026-10-25, branch `main`, commit `3d3d011`
**Change rule:** A material change requires an ADR in [`../adr/`](../adr/) and a
matching update of [`BUILD-CONTRACT.md`](BUILD-CONTRACT.md).
**Language:** English. Code identifiers, type names and file names stay English.

> **Reading rule.** Every number in this document is either a *measured* value
> with the command that produced it, or a *target* with the method that will
> measure it. A value that has not been measured is written as `not measured`.
> There are no estimates and no projections presented as facts.

> **Measurement basis and drift.** The values were measured on the
> **working tree** of branch `main` at commit `3d3d011` on 2026-10-25,
> including the uncommitted work that was present in the repository at that
> moment. The repository is under concurrent work, so a figure quoted here
> drifts as other changes land. **A drifted figure is re-measured, not
> defended** — the command next to every number is the authority, not this
> sentence.

---

## 0. Summary

Phomu becomes a **family of apps with one shared Rust base**. The web client
stays and becomes an equal shell; the native shells are added in a binding
order (Android → TV → macOS/Linux → iOS/iPadOS → Windows).

| # | Decision | Binding? | Where |
|---|---|---|---|
| D1 | One Rust base owns the game truth; the shells draw | yes | §1, §4 |
| D2 | The web shell reaches the base through WebAssembly, not through its own TypeScript rules | yes | §5.2, §6.2 |
| D3 | The dependency direction is enforced by a gate that exits 1 on a violation | yes | §3 |
| D4 | Platform differences are capabilities, never branches inside the rules | yes | §7 |
| D5 | The anti-spoiler guarantee is structural: the question-phase view model has no answer field | yes | §10 |
| D6 | The catalogue is a versioned data artifact, not JavaScript and not app code | yes | §9 |
| D7 | The base supplies i18n *keys*, the shells supply the *texts* | yes | §4, [`BUILD-CONTRACT.md`](BUILD-CONTRACT.md) §6 |
| D8 | The platform tracks are ordered and binding | yes | [`ADR-0006`](../adr/ADR-0006-binding-platform-track-order.md) |

**What exists today.** Phomu is a single Next.js 16 static export. The
repository contains **no Rust code** (`ls Cargo.toml` → *No such file or
directory*) and **80** hand-written `*.ts`/`*.tsx` source files under `src/`
(measured: `find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.ts" ! -name "*.test.tsx" | wc -l`).

**What does not exist yet.** Everything described in §2, §3, §6, §9, §12 and
§13 of this document is a *specification*. No crate, no bridge and no gate
exists at the time of writing. Each section says explicitly what is a decision
and what still has to be built.

---

## 1. Vision and invariant

### 1.1 One product, many shells, one truth

Phomu is one product with several surfaces. A party starts in the lobby, the
music plays, the phones pass around, the projector shows the state. Which
device draws that is an implementation detail; **what happens is not**.

The invariant is therefore:

> **The base decides, the shell draws.**
> Every rule of the game — the round automaton, the phases, the points, the
> mode logic, the provider fallback, the spoiler redaction — is decided once,
> in the shared base. A shell contributes rendering, input and platform
> integration, and nothing else.

### 1.2 What the invariant means concretely

For an identical input — the same catalogue entry, the same game configuration,
the same mode, the same sequence of player actions — the base produces the
**same** observable result on every platform:

| Observable | Same on every platform? | Why |
|---|---|---|
| The phase after an action | yes | the round automaton is in the base |
| The points awarded | yes | the scoring is in the base |
| The set of options shown in a mode | yes | the mode logic is in the base |
| The censoring of a hint | yes | the spoiler rules are in the base |
| Which fields the shell may see in the question phase | yes | the view model is in the base |
| The provider fallback order | yes | the provider policy is in the base |
| The error taxonomy | yes | the error hierarchy is in the base |
| The pixels, the animation, the navigation | **no** | that is the shell |

### 1.3 The machine-checkable form: the conformance vector

An invariant that cannot be checked is a slogan. The invariant is therefore
backed by **conformance vectors**: a versioned set of inputs and the expected
outputs that the base produces for them.

```text
conformance/
├─ vectors/                     ← input → expected output, one file per case
│  ├─ round-timeline-basic.json
│  ├─ round-hint-master-cheat.json
│  └─ …
└─ runner/                      ← replays the vectors against a shell
```

A vector contains a catalogue fixture, a game configuration, a scripted
sequence of actions and the expected sequence of view models and scores. Every
shell replays the same vectors through its bridge and compares the result with
the expected output. The web shell, the Android shell and the desktop shell
must produce **byte-identical** view models for the same vector.

The vectors live in `core/phomu-conformance` and are development artefacts —
they are never shipped in a release build.

### 1.4 The promise and its limits

**What every platform promises:**

1. The same game, with the same rules, in the same order.
2. The same points for the same answers.
3. The same spoiler guarantee: in the question phase the solution is not
   reachable — not visible, not readable from storage, not present in the data
   the bridge hands to the shell (§10).
4. The same catalogue semantics — the same song is drawn under the same
   conditions.
5. The same named error situations and the same recovery behaviour.
6. The same i18n key space, so a translation is written once per language.

**What no platform promises:**

1. Pixel-identical interfaces.
2. Identical animation timings.
3. Identical input methods — a TV remote, a mouse and a finger are different
   input devices and the shells will use them differently.
4. Identical media availability — see §8; the *provider set* differs per
   platform, the *fallback behaviour* does not.
5. Identical screen layouts — the shells have different form factors.

---

## 2. The crate topology

The topology follows the Vocument pattern (`core/`, `platform/`, `apps/`,
`formats/`) and the PhairPlayRust build contract.

```text
phomu/
├─ core/                              ── the shared base: no I/O, no UI, no platform
│  ├─ phomu-core/                     ── the game rules (round automaton, modes, scoring)
│  │  ├─ src/rules/                   ── phases, transitions, turn order, teams
│  │  ├─ src/modes/                   ── the six modes as pure state machines
│  │  ├─ src/session/                 ── the session façade the bridges export
│  │  ├─ src/spoiler/                 ── censoring and the redacted view model
│  │  └─ src/facade.rs                ── the ONE surface all bridges export
│  ├─ phomu-catalog/                  ── catalogue model, pack selection, filters
│  │  └─ src/                         ── Song, Pack, selection rules, catalogue source
│  ├─ phomu-config/                   ── the single source of constants and defaults
│  │  └─ src/                         ── the values that today live in src/config/**
│  ├─ phomu-i18n/                     ── the message-key catalogue (keys, never texts)
│  │  └─ src/                         ── the closed key space + event → key mapping
│  ├─ phomu-media/                    ── media provider abstraction and fallback policy
│  │  └─ src/                         ── provider kinds, order, offsets, error mapping
│  ├─ phomu-errors/                   ── the error hierarchy
│  │  └─ src/                         ── ErrorCode, context, message-key mapping
│  └─ phomu-conformance/              ── conformance vectors and golden files (dev only)
│
├─ platform/                          ── the bridges: marshalling only, no rules
│  ├─ phomu-ffi/                      ── UniFFI bindings for Kotlin and Swift
│  ├─ phomu-capi/                     ── C-ABI (cdylib + header) for external embedders
│  └─ phomu-wasm/                     ── wasm-bindgen bindings for the web shell
│
├─ formats/                           ── pure byte transformations, no I/O at all
│  ├─ phomu-qr/                       ── QR intent codec (encode/decode)
│  └─ phomu-cards/                    ── physical card layout data (print geometry)
│
├─ apps/                              ── the shells
│  ├─ android/                        ── Kotlin + Jetpack Compose (phone and tablet)
│  ├─ tv-android/                     ── Kotlin + Compose for TV (Google TV / Fire TV)
│  ├─ macos/                          ── SwiftUI + AppKit
│  ├─ ios-ipados/                     ── SwiftUI
│  ├─ linux/                          ── Rust (egui/winit)
│  ├─ windows/                        ── Rust (egui/winit)
│  └─ web/                            ── Next.js 16 + React 19 — LOGICAL NAME ONLY,
│                                       the physical location is the repository root (§5.4)
│
├─ tools/                             ── build-time and validation, never shipped
│  ├─ catalog-tool/                   ── catalogue build, validation, artefact generation
│  ├─ media-report/                   ── link audit, report generation
│  └─ conformance-runner/             ── replays the conformance vectors per shell
│
├─ scripts/
│  └─ check-crate-boundaries.mjs      ── the boundary gate (§3.6) — DOES NOT EXIST YET
│
├─ src/                               ── the existing Next.js application (see §5)
├─ public/  e2e/  docs/  specifications/
├─ Cargo.toml                         ── the Cargo workspace root — DOES NOT EXIST YET
└─ package.json                       ── the existing Node toolchain (the web shell)
```

### 2.1 Why `core/` and not `crates/`

`core/` matches both reference projects — Vocument uses `core/vocument-core`,
PhairPlayRust uses `core/phairplay-core`. The term *crate* is already the
Rust unit of compilation; using `crates/` as a directory name would be
needlessly ambiguous in a document that also talks about Rust crates.

### 2.2 Why six crates inside `core/` and not one

Each of the six has exactly one reason to change and one owner:

| Crate | Owns | Changes when |
|---|---|---|
| `phomu-errors` | the error taxonomy | the taxonomy changes |
| `phomu-config` | every game constant | a rule value changes |
| `phomu-i18n` | the key space | a user-visible message is added |
| `phomu-catalog` | the catalogue model and the selection rules | the catalogue or the selection changes |
| `phomu-media` | the provider policy | a provider or a fallback rule changes |
| `phomu-core` | the rules themselves | the game changes |

A single crate would make every one of those changes a change to the same
binary and would make the "no duplicates" rule impossible to enforce
mechanically: `phomu-config` can be depended upon by everything, but nothing
can depend on `phomu-config` *except* to read a value.

### 2.3 The `tools/` area

`tools/` holds everything that runs at build, validation or reporting time and
is never part of a shipped binary. Today the equivalent code lives in
[`../../src/utils/validate-song-data.ts`](../../src/utils/validate-song-data.ts)
(817 lines), [`../../src/utils/validate-song-catalog.ts`](../../src/utils/validate-song-catalog.ts)
(271 lines) and [`../../src/utils/validate-song-limits.ts`](../../src/utils/validate-song-limits.ts)
(260 lines) — 1,348 lines that are **not** in the client bundle today
(the import graph contains exactly one `utils → data` edge, from
[`../../src/utils/song-picker.ts`](../../src/utils/song-picker.ts):4) and belong
in `tools/`, not in a crate.

---

## 3. Dependency direction

### 3.1 The rule

> **Arrows point strictly downwards. A crate may only depend on crates that
> live below it. The only named exception is the bridge, which may depend on
> the core — because the bridge is the composition root.**

### 3.2 The diagram

```text
        apps/*        android    tv-android    macos    ios-ipados
                       linux      windows       web
          │
          │  UniFFI (Kotlin, Swift) · wasm-bindgen (web) · C-ABI (embedders)
          │  Cargo dependency (Rust shells — no FFI at all)
          ▼
     platform/*       phomu-ffi    phomu-capi    phomu-wasm
          │
          ▼
       core/*          phomu-core   phomu-catalog   phomu-config
                       phomu-i18n   phomu-media     phomu-errors
                       phomu-conformance
          │
          ▼
     formats/*         phomu-qr     phomu-cards


       tools/*         catalog-tool   media-report   conformance-runner
              └──────────────► core/*, formats/*   (outside the runtime chain)
```

### 3.3 The area table

| Area | Responsibility | May depend on | Must **not** depend on |
|---|---|---|---|
| `apps/*` | rendering, navigation, input, platform dialogs, permissions, camera, file dialogs, persistence, accessibility | `platform/*` | `core/*` directly, `formats/*` directly, `tools/*`, another shell's `apps/*` |
| `platform/*` | marshalling only — no rules, no data access, no policy | `core/*`, `formats/*` | `apps/*`, `tools/*` |
| `core/phomu-core` | the round automaton, the modes, the scoring, the session, the spoiler redaction | `core/{phomu-config, phomu-catalog, phomu-i18n, phomu-media, phomu-errors}`, `formats/*` | `platform/*`, `apps/*`, `tools/*`, I/O |
| `core/phomu-catalog` | the catalogue model, the pack selection, the filters | `core/{phomu-config, phomu-errors}` | `core/phomu-core`, `core/phomu-media`, `core/phomu-i18n`, `platform/*`, `apps/*` |
| `core/phomu-media` | provider kinds, the fallback order, the offsets, the error mapping | `core/{phomu-config, phomu-errors}` | `core/phomu-core`, `core/phomu-catalog`, `platform/*`, `apps/*` |
| `core/phomu-i18n` | the closed key space, the event → key mapping | `core/phomu-errors` | everything else in `core/*`, `platform/*`, `apps/*` |
| `core/phomu-config` | every game constant, exactly once | `core/phomu-errors` | everything else in `core/*`, `platform/*`, `apps/*` |
| `core/phomu-errors` | the error taxonomy | nothing | everything |
| `core/phomu-conformance` | the conformance vectors, the golden files | `core/*`, `formats/*` | `platform/*`, `apps/*` — it is never linked into a release build |
| `formats/*` | byte transformations | nothing | everything |
| `tools/*` | build-time work: catalogue build, validation, audit, conformance replay | `core/*`, `formats/*` | `platform/*`, `apps/*` |

### 3.4 The rules that are not visible in a dependency graph

Three additional rules hold everywhere in `core/*` and are enforced by review
and by the test suite, not by the dependency graph:

1. **No I/O.** The core never opens a file, never opens a socket, never reads
   the clock and never reads the environment. The catalogue arrives as bytes
   from the shell; the time arrives as a timestamp the shell passes in; the
   randomness arrives as a seed the shell passes in. This is what makes the
   core testable without an emulator and what makes the conformance vectors
   reproducible.
2. **No platform names.** The core never contains the strings `android`,
   `ios`, `macos`, `windows`, `tv` or `web` as a branch condition. Platform
   differences arrive as capability values (§7).
3. **No text.** The core never contains a user-visible sentence. It contains
   keys (§4, [`BUILD-CONTRACT.md`](BUILD-CONTRACT.md) §6).

### 3.5 The shell rule

A shell may only reach the base through a bridge. Concretely:

- `apps/android`, `apps/tv-android` use the **generated** UniFFI Kotlin
  bindings. They may not depend on a Rust crate directly, and they may not
  read the core's source files.
- `apps/macos`, `apps/ios-ipados` use the **generated** UniFFI Swift bindings.
  Same rule.
- `apps/web` uses the **generated** `wasm-bindgen` glue. Same rule.
- `apps/linux`, `apps/windows` are Rust and depend on `core/phomu-core`
  **directly as a Cargo dependency** — but only on the `facade` module, which
  is the same surface the bridges export. There is no FFI between a Rust
  shell and the core, because there is nothing to marshal (§6.5).

### 3.6 The gate: `scripts/check-crate-boundaries.mjs`

> **Status:** the script does **not** exist. This section is its
> specification and it is a **deliverable**, not a description of something
> that works. Until it exists, the dependency direction is a convention, and a
> convention that is not checked decays.

**What it checks**

| # | Check | How |
|---|---|---|
| G1 | A crate in area A may not depend on a crate in area B | `cargo metadata --no-deps --format-version 1` gives the workspace and every **path dependency**; the area of a package is derived from its path prefix (`core/`, `platform/`, `formats/`, `apps/`, `tools/`) |
| G2 | `apps/*` may not depend on `core/*` or `formats/*` directly | same graph, plus a scan of the shell build files (`build.gradle.kts`, `Package.swift`, `Cargo.toml`) for a path dependency into `core/` or `formats/` |
| G3 | A crate may not `include!` a file outside its own directory | a source scan of every `*.rs` under the workspace for `include!(` with a path outside the crate root |
| G4 | The `phomu-errors` and `formats/*` crates stay leaves | consequence of G1 |
| G5 | The ABI version in the generated C header equals the version in the Rust source | a source comparison; a stale header fails the build, not the runtime |
| G6 | The shell's declared ABI bracket contains the base's version | a unit test in `core/phomu-core` and a start-up check in every shell |

**How it behaves**

- Exit code **0** when no rule is violated.
- Exit code **1** when at least one rule is violated. Every finding is
  printed as `consumer → forbidden target` together with the rule that was
  violated, so that the failure message names the boundary and not just the
  file.
- The script supports `--root=<path>` and `--rules=<path>`, the same
  isolation mechanism that [`../../scripts/check-doc-links.mjs`](../../scripts/check-doc-links.mjs)
  already uses for its negative test (the option exists there at lines 45–50).
- When no Cargo workspace exists yet, the gate reports
  `SKIPPED — no Cargo workspace` and exits **0**. It must not block the
  repository before the base exists. The moment the workspace exists, the
  gate is active.

**How it is wired in**

- `npm run check:crate-boundaries` → the gate.
- `npm run check:all` → the gate becomes the **fourth** entry in the gate
  list of [`../../scripts/check-all.mjs`](../../scripts/check-all.mjs) (today:
  i18n completeness, doc link check, file size).
- CI: a new job in a new workflow `.github/workflows/ci-rust.yml` (§13.6).
- The gate's own negative test runs in the same job (§
  [`BUILD-CONTRACT.md`](BUILD-CONTRACT.md) §7).

---

## 4. What belongs into the base and what does not

### 4.1 In the base

| Concern | Where in the base | Why | Measured evidence from today |
|---|---|---|---|
| **Round automaton** — the five phases and their transitions | `core/phomu-core/src/rules/` | the phase is the game's contract, not a UI concern | the transitions live in [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts) (640 lines) and in [`../../src/app/game/page.tsx`](../../src/app/game/page.tsx):185 and :261 |
| **Anchors** — the QR *intent codec* and the anchor semantics | `formats/phomu-qr` (codec) + `core/phomu-core` (semantics) | the codec is a pure byte transformation; the meaning of an intent is a rule | [`../../src/utils/qr-intent.ts`](../../src/utils/qr-intent.ts) is 44 lines, a pure string → tagged-union function, used in [`../../src/app/lobby/page.tsx`](../../src/app/lobby/page.tsx):21 and :973 |
| **Players and teams** — creation, removal, team scores, the turn order | `core/phomu-core/src/rules/` | the scoreboard must agree across devices | the team actions live in [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts):529-592 |
| **Points** — the base values, the time decay, the floor at zero | `core/phomu-core/src/rules/` | the point values are rules and today live in two places | [`../../src/config/game-config.ts`](../../src/config/game-config.ts):310 (`HINT_MASTER_POINTS`) plus mode-local literals — 20 locally defined numbers are listed in [`GAME-CONTRACT.md`](GAME-CONTRACT.md) §11.3 |
| **Mode logic** — the six modes as pure state machines | `core/phomu-core/src/modes/` | the validity predicate and the points of a mode are rules | the six widgets total 2,342 lines and contain the scoring literals |
| **Anti-spoiler contract** — censoring, the redacted view model, the persistable set | `core/phomu-core/src/spoiler/` | the guarantee must be identical everywhere | [`../../src/utils/censor-utils.ts`](../../src/utils/censor-utils.ts) (65 lines) and [`../../src/config/spoiler-config.ts`](../../src/config/spoiler-config.ts) (29 lines) |
| **Catalogue** — the *model* and the *selection rules* | `core/phomu-catalog/` | the selection is a rule (pack → difficulty → QR → mode → unplayed → fallback) | [`../../src/utils/song-picker.ts`](../../src/utils/song-picker.ts) (90 lines) holds that chain today |
| **Configuration** — every constant, exactly once | `core/phomu-config/` | one truth for the numbers | [`../../src/config/game-config.ts`](../../src/config/game-config.ts) (326 lines) + [`../../src/config/spoiler-config.ts`](../../src/config/spoiler-config.ts) (29) + [`../../src/config/song-year-range.ts`](../../src/config/song-year-range.ts) (32) |
| **Media provider policy** — the provider kinds, the order, the fallback chain, the offsets, the error classification | `core/phomu-media/` | the *policy* is a rule; the *player surface* is not | the order and the fallback live in [`../../src/components/game/MusicPlayer.tsx`](../../src/components/game/MusicPlayer.tsx) (783 lines) |
| **Audio cues** — which cue fires when, and the cue identity | `core/phomu-core/src/media/` | the trigger is a rule; the sound file is not | [`../../src/utils/game-audio-cues.ts`](../../src/utils/game-audio-cues.ts) (22 lines) holds the cue table, [`../../src/hooks/useGameAudioCues.ts`](../../src/hooks/useGameAudioCues.ts) (96 lines) the trigger |
| **i18n messages** — the *keys* and the event → key mapping | `core/phomu-i18n/` | the base must not carry a translated sentence | [`../../src/i18n/locales/de.json`](../../src/i18n/locales/de.json) and `en.json` carry 1,258 leaf keys each (measured 2026-10-25; the key space
grows with the ongoing i18n migration) |
| **Error hierarchy** — one taxonomy for the whole product | `core/phomu-errors/` | the shells must classify failures the same way | today the error handling is per component; the anti-spoiler errors in [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §7 are named per case |

### 4.2 Not in the base

| Concern | Where it lives | Why it must not be in the base |
|---|---|---|
| Rendering | the shell | the base has no idea what a pixel is |
| Navigation and routing | the shell | a route is a platform concept |
| Platform dialogs (file picker, share sheet, print dialog) | the shell | they are OS APIs |
| Permissions (camera, notifications, storage) | the shell | they are OS APIs and need a user-facing rationale |
| Camera and the QR scanner | the shell; **the codec** is in `formats/phomu-qr` | the camera is hardware; the codec is pure |
| File dialogs and the export of the card sheets | the shell | see §7 |
| `localStorage`, Keychain, SharedPreferences, the app sandbox | the shell | the *mechanism* is a platform concern; the *set of fields that may be persisted* is decided by the base (§10, C-4) |
| Window management, orientation, screen sleep, remote-control handling | the shell | see §7 |
| The provider *player surface* — the iframe, the `<audio>` element, the native player | the shell | the policy is in the base, the surface is not |
| The audio *files* and their playback | the shell | assets and hardware |
| Accessibility *implementation* — TalkBack, VoiceOver, D-pad focus | the shell | the base supplies the semantics, the shell supplies the technology |
| The catalogue *data* | the artefact, built by `tools/catalog-tool` | data is not a crate (§9) |

---

## 5. The web client as a shell

### 5.1 What stays in Next.js

The web shell keeps everything that is a surface concern:

| Stays | Measured today |
|---|---|
| The App Router, the routes, the base path `/Phomu` | [`../../next.config.ts`](../../next.config.ts):4 sets `output: 'export'` |
| React 19, Tailwind 4, Framer Motion | [`../../package.json`](../../package.json) |
| All rendering: the lobby wizard, the six mode widgets, the reveal, the scoreboard, the projector | [`../../src/components/game/`](../../src/components/game) |
| i18next + react-i18next, the locale files | [`../../src/i18n/config.ts`](../../src/i18n/config.ts), 1,258 keys per locale |
| The Zustand store — **reduced to a projection** of the base's session snapshot | [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts) |
| The catalogue delivery (as a fetched asset instead of a bundled JSON import) | [`../../src/data/songs/index.ts`](../../src/data/songs/index.ts) (297 lines, generated) |
| The admin API boundary and the localStorage keys | [`../../src/admin-api/_lib/security.ts`](../../src/admin-api/_lib/security.ts) |

### 5.2 What migrates into the base

| # | Today | Lines | Target | Note |
|---|---|---|---|---|
| M1 | [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts) | 640 | `core/phomu-core/src/rules/` + a shell-side projection | The store is today rule engine **and** state container. It splits: the rules go to the base, the state becomes a thin projection of the base's session snapshot. |
| M2 | [`../../src/config/game-config.ts`](../../src/config/game-config.ts) | 326 | `core/phomu-config/` | The 27 `SONG_PACKS` entries carry marketing text — that is catalogue metadata, not game configuration, and belongs in the catalogue artefact, not in the rules. |
| M3 | [`../../src/config/spoiler-config.ts`](../../src/config/spoiler-config.ts) | 29 | `core/phomu-config/` + `core/phomu-core/src/spoiler/` | |
| M4 | [`../../src/config/song-year-range.ts`](../../src/config/song-year-range.ts) | 32 | `core/phomu-catalog/` | |
| M5 | [`../../src/utils/song-picker.ts`](../../src/utils/song-picker.ts) | 90 | `core/phomu-catalog/` | The selection chain (pack → difficulty → QR → mode → unplayed → fallbacks) is a rule. |
| M6 | [`../../src/utils/censor-utils.ts`](../../src/utils/censor-utils.ts) | 65 | `core/phomu-core/src/spoiler/` | |
| M7 | [`../../src/utils/qr-intent.ts`](../../src/utils/qr-intent.ts) | 44 | `formats/phomu-qr/` | A pure byte/string transformation with no I/O. |
| M8 | [`../../src/utils/game-audio-cues.ts`](../../src/utils/game-audio-cues.ts) | 22 | `core/phomu-media/` | The cue identity only. |
| M9 | [`../../src/types/song.ts`](../../src/types/song.ts) | 165 | `core/phomu-catalog/` | |
| M10 | [`../../src/types/game-state.ts`](../../src/types/game-state.ts) | 221 | `core/phomu-core/src/rules/` | |
| M11 | [`../../src/types/player.ts`](../../src/types/player.ts) | 77 | `core/phomu-core/src/rules/` | |
| M12 | [`../../src/types/music-provider.ts`](../../src/types/music-provider.ts) | 105 | `core/phomu-media/` | Today declared but neither implemented nor used (measured in [`GAME-CONTRACT.md`](GAME-CONTRACT.md) §11.1, A9). |
| M13 | [`../../src/components/game/modes/`](../../src/components/game/modes) — the point literals and the validity predicates | 2,342 across 6 files | `core/phomu-core/src/modes/` | The widgets stay; only the rule literals and predicates move. The exact number of extracted sites is **not measured**; the sites are enumerated in [`GAME-CONTRACT.md`](GAME-CONTRACT.md) §11.3. |
| M14 | [`../../src/components/game/MusicPlayer.tsx`](../../src/components/game/MusicPlayer.tsx) — the provider order, the fallback chain, the offsets, the error classification | 783 (whole file) | `core/phomu-media/` | The player surface stays in the shell. |
| M15 | [`../../src/utils/feedback-messages.ts`](../../src/utils/feedback-messages.ts) | 251 | keys → `core/phomu-i18n/`; texts → the shell's locale files | 100+ quips per list, German today. |
| M16 | [`../../src/utils/last-round-messages.ts`](../../src/utils/last-round-messages.ts) | 82 | same | |
| M17 | [`../../src/hooks/useGameAudioCues.ts`](../../src/hooks/useGameAudioCues.ts) | 96 | the trigger rules → `core/phomu-core/`; the playback stays | |
| M18 | [`../../src/utils/validate-song-data.ts`](../../src/utils/validate-song-data.ts) | 817 | `tools/catalog-tool` | Build-time, not runtime. |
| M19 | [`../../src/utils/validate-song-catalog.ts`](../../src/utils/validate-song-catalog.ts) | 271 | `tools/catalog-tool` | Build-time. |
| M20 | [`../../src/utils/validate-song-limits.ts`](../../src/utils/validate-song-limits.ts) | 260 | `tools/catalog-tool` | Build-time. |
| M21 | [`../../src/data/songs/`](../../src/data/songs) — 135 pack JSON files | 3,618,328 bytes | the catalogue artefact | The loader ([`../../src/data/songs/index.ts`](../../src/data/songs/index.ts), 297 lines) is generated; the data becomes a versioned artefact, not an import (§9). |

**Effort, measured.** Three groups:

| Group | Files | Lines | Nature of the work |
|---|---|---|---|
| Rule modules — direct port candidates | 12 | **1,816** | A mechanical port: TypeScript → Rust, plus the tests. |
| Message catalogues | 2 | **333** | Not a port: a key space is created and the texts move into the locale files. |
| Build-time validators | 3 | **1,348** | Not a port: a move into `tools/`. |
| Mode widgets — rule extraction only | 6 | **2,342** (of which only the rule literals move) | The rendering stays; the literals and predicates are extracted. The number of extraction sites is **not measured**. |
| Catalogue data | 135 JSON files | 3,618,328 bytes | Not a port: a build artefact (§9). |

A schedule is not proposed here — the milestone plan belongs to the Owner and
to [`../../ROADMAP.md`](../../ROADMAP.md), which this document does not
touch.

### 5.3 The migration order

The order below is forced by one requirement: **the web shell must keep
working after every step.** A step that breaks the web shell is not allowed.

| Step | What moves | The web shell's state afterwards |
|---|---|---|
| S1 | `phomu-config`, `phomu-errors`, `phomu-i18n` exist as crates; the web shell still owns its own constants | unchanged, no user-visible effect |
| S2 | `phomu-catalog` + `formats/phomu-qr` exist; the web shell loads the catalogue artefact instead of importing JSON | the catalogue leaves the JavaScript bundle (§9) |
| S3 | `core/phomu-core` exists and is covered by the conformance vectors | unchanged |
| S4 | the web shell switches to the core through `wasm-bindgen`; the Zustand store becomes a projection | the rules now live in one place |
| S5 | the mode widgets, the music player and the projector consume the core's view models | the rules are gone from the TypeScript |
| S6 | the native track 1 (Android) consumes the same core through UniFFI | the second shell exists |

**The rule that makes S4–S5 safe: there is never a dual implementation.** The
TypeScript rules are removed in the same change that the Rust rules take over.
A period in which both exist is the single most dangerous state of this
programme, because the conformance vectors would then only prove that one of
the two implementations is right.

### 5.4 Should the Next.js app be moved to `apps/web`?

**The question.** The topology in §2 lists the web shell as `apps/web`. The
physical reality is different: the Next.js application lives at the repository
root (`src/`, `public/`, `e2e/`, `next.config.ts`, `package.json`).

**Option A — keep the web app where it is (recommended for now).**

The boundary table names the shell `apps/web` **logically**; the gate accepts
both the logical name and the physical location. Nothing in the dependency
rule depends on where the directory sits.

| Consequence | Assessment |
|---|---|
| Cost | **zero** path churn |
| Risk | none |
| Benefit | the Rust workspace can be created without touching the JavaScript build |

**Option B — move the whole Next.js application into `apps/web/`.**

The measured cost of the move:

| What has to change | Measured size of the change |
|---|---|
| Build, CI and configuration files that reference `src/` paths | **23 files**, **43** individual path occurrences (measured with a grep over `scripts/`, `.github/`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `postcss.config.mjs` and `package.json`; the hits are in `scripts/` and in the root configuration files) |
| Relative Markdown links into `src/` | **29 links**, all in [`GAME-CONTRACT.md`](GAME-CONTRACT.md) (measured) |
| The TypeScript path alias | [`../../tsconfig.json`](../../tsconfig.json): `@/*` → `./src/*` becomes `../src/*` |
| The GitHub Pages deployment path | [`../../.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml):70 publishes `./out` |
| The Next.js configuration | [`../../next.config.ts`](../../next.config.ts) (`output: 'export'`, `basePath: '/Phomu'`) moves into `apps/web/` |
| The asset and output directories | `public/` → `apps/web/public/`, `out/` → `apps/web/out/` |
| The Node package | either a second `package.json` at the root (a monorepo) or a rewrite of every CI step |

| Consequence | Assessment |
|---|---|
| Cost | 23 build/CI files, 29 documentation links, the deployment path, the CI workflow, and a second Node package layout |
| Risk | the move touches the deployment of the **only shipping product** while the base is being created |
| Benefit | a literally uniform tree; `apps/` contains every shell |

**Recommendation: Option A now, Option B deferred with an explicit trigger.**

The move buys **no architectural property**: the boundary gate works on
directory prefixes, not on physical location, and the rules in §3 do not
mention paths. It costs a wide, mechanical migration of a working product in
exactly the phase where the Rust workspace is being created — the phase with
the most churn. The migration is also *not* lost: it can be done later, when
the JavaScript side is stable, and [`../../scripts/check-doc-links.mjs`](../../scripts/check-doc-links.mjs)
is the safety net that makes the later move verifiable (the 29 broken links
would be reported, not silently accepted).

**The trigger for Option B** — all three must hold:

1. the Rust workspace exists and `apps/` contains at least two Rust shells;
2. the Owner decides that one uniform `apps/` directory is worth the one-time
   migration;
3. the move is done as its own change, with the documentation link update in
   the same commit.

This is an open Owner decision — **O-1** in §15.

---

## 6. The bridge

### 6.1 The three bridges

| Bridge | Target shell | Technology | Why this technology |
|---|---|---|---|
| `platform/phomu-ffi` | `apps/android`, `apps/tv-android` (Kotlin), `apps/macos`, `apps/ios-ipados` (Swift) | UniFFI | One Rust definition generates both the Kotlin and the Swift bindings; the bindings are generated and never hand-edited; a Rust error enum becomes a typed exception hierarchy in both languages |
| `platform/phomu-wasm` | `apps/web` | `wasm-bindgen` | The web shell is a **static export** ([`../../next.config.ts`](../../next.config.ts):4) — there is no server that could host the core. WebAssembly is the only way for the web shell to use the same rules without owning a second implementation |
| `platform/phomu-capi` | external embedders, the JNI path | `extern "C"` + `cdylib` + a C header | A stable binary artefact with a checkable ABI version, for consumers that are not Rust and not Kotlin/Swift |

All three bridges export **the same facade** — `core/phomu-core/src/facade.rs`.
The exported surface therefore cannot drift between the bridges; the bridges
differ only in the marshalling.

### 6.2 The exported surface

The surface is small, closed and versioned. A draft:

```text
phomu_abi_version()                -> String        "1.0.0"
phomu_abi_versions()               -> Vec<String>   every major the core still serves
phomu_capabilities()               -> Capabilities  what this shell may do (§7)

phomu_catalog_open(source)         -> Result<CatalogHandle, PhomuError>
phomu_catalog_packs(handle)        -> Vec<PackInfo>
phomu_catalog_songs(handle, packs) -> Vec<SongSummary>

phomu_session_new(config)          -> Result<SessionHandle, PhomuError>
phomu_session_snapshot(handle)     -> SessionSnapshot
phomu_session_start(handle)        -> Result<RoundView, PhomuError>
phomu_session_draw(handle, source) -> Result<RoundView, PhomuError>
phomu_session_answer(handle, ans)  -> Result<ScoreSnapshot, PhomuError>
phomu_session_reveal(handle)       -> Result<RoundView, PhomuError>
phomu_session_next_round(handle)   -> Result<RoundView, PhomuError>
phomu_session_end(handle)          -> Result<GameOverSnapshot, PhomuError>

phomu_media_plan(handle)           -> MediaPlan     provider, offsets, fallback chain
phomu_message_key(event, args)     -> String        the i18n key for a game event
```

**The rules that make it a contract, not a convenience:**

| Rule | Detail |
|---|---|
| **Handles, not objects** | `SessionHandle` is an opaque identifier into a registry inside the core. No Rust reference, no pointer and no borrowed data crosses the boundary. |
| **Immutable snapshots** | Every return value is a value the shell cannot mutate. The shell re-reads the snapshot after every command. |
| **Typed errors** | `PhomuError { code: ErrorCode, message_key: String, context: Vec<(String, String)> }`. `ErrorCode` is a closed enum from `core/phomu-errors`. The shell **never** matches on a free-form error string. |
| **Keys, not texts** | The error carries a *message key*. The shell resolves the text in its own locale files (§4, [`BUILD-CONTRACT.md`](BUILD-CONTRACT.md) §6). |
| **No callbacks into the core** | The core never calls the shell. Long operations return a job identifier; the shell polls `phomu_job_status(id)`. |
| **No panics across the boundary** | A panic inside the core is caught and converted into `ErrorCode::Internal`. A panic must never take the application down. |
| **No Rust types in the public API** | Only the DTOs listed above. The internal `GameState` is never exported. |

### 6.3 What is exported and what is not

| Exported | Not exported |
|---|---|
| `GameConfig` (as a DTO) | the internal configuration representation |
| `SessionSnapshot`, `RoundView`, `ScoreSnapshot`, `GameOverSnapshot` | the internal `GameState` |
| `Capabilities` | the platform detection code |
| `MediaPlan` | the provider SDKs |
| `CatalogHandle`, `PackInfo`, `SongSummary` | `PhomuSong` as a whole — see below |
| `PhomuError`, `ErrorCode` | `std::error::Error` trait objects, anyhow-style boxed errors |
| the ABI version functions | panics, unwinds, raw pointers, `unsafe` types |

**`PhomuSong` is not exported as a whole, and that is the anti-spoiler
contract in the type system.** The full record contains the solution —
`title`, `artist`, `year`, `hints`, `lyrics` ([`../../src/types/song.ts`](../../src/types/song.ts):42-165).
Only derived views cross the boundary:

- in the question phase: a `RoundView` **without** any answer field (§10);
- in the reveal phase: a `RoundView` **with** a `SongSolution { title, artist,
  year }`.

The type that carries the solution simply does not exist in the question
phase. This is stronger than the current web rule, which is a *rendering*
rule: today the title and the artist are in the client's memory and are merely
not written into the DOM (see [`GAME-CONTRACT.md`](GAME-CONTRACT.md) §3.1).

### 6.4 The version bracket

The ABI version is `MAJOR.MINOR.PATCH`, all `u16`. It lives in three places
that must agree:

| Place | Form |
|---|---|
| `core/phomu-core/src/abi.rs` | the source of truth: `ABI_VERSION: (u16, u16, u16)` |
| the generated UniFFI bindings | `phomu_abi_version() -> String` |
| the generated C header | `PHOMU_ABI_VERSION_MAJOR`, `PHOMU_ABI_VERSION_MINOR`, `PHOMU_ABI_VERSION_PATCH` |

A Rust unit test asserts that the three agree; the header is generated, never
hand-edited.

**The bracket.** Every shell declares the bracket of base versions it accepts:

```text
shell expects:  abi_min = 1.0   abi_max = 1.99      (i.e. "any 1.x")
core reports:   1.3.0
check:          1.0 <= 1.3 <= 1.99   → accepted
```

At start-up the shell performs the check. If the base's version is outside the
bracket, **the shell refuses to start** and names both versions. A silent
mismatch is the failure mode this rule exists to prevent.

| Change | Version impact | Consequence |
|---|---|---|
| An export is removed or renamed | **major** | the shell's bracket must be raised; the shell is updated in the same release |
| The semantics of a field or an error code change | **major** | same as above |
| An export is added, or an optional DTO field is added | **minor** | old shells keep working; the core keeps the previous exports alive for the whole minor series |
| An internal change | **patch** | nothing outside the core is affected |

**The migration path for a major bump** — one of two, never a silent break:

1. **Coordinated release.** The core and all shells are released together with
   the new major.
2. **Deprecation window.** The core exports *both* majors for one full minor
   series. `phomu_abi_versions()` returns both, so a shell can discover what it
   may use. At the end of the window the old major is removed, which is itself
   a major bump.

The rule for the removal: a major is removed only when
`phomu_abi_versions()` no longer lists it **and** no supported shell declares a
bracket that contains it.

### 6.5 Why the Rust shells do **not** use an FFI boundary

`apps/linux` and `apps/windows` are Rust. They can depend on
`core/phomu-core` as a Cargo dependency, with the compiler checking the
types. Putting a C-ABI between them would add a marshalling layer to every
call, a second definition of every DTO in C, and an ABI-version skew risk —
in exchange for nothing.

The C-ABI therefore stays what it is useful for:

1. external embedders and automation harnesses that are not Rust;
2. the JNI path, if the Android NDK build does not use the generated UniFFI
   Kotlin bindings;
3. a stable binary artefact whose version an external process can check.

**If the Owner decides that the Rust shells must go through the C-ABI** — for
example to enforce "a shell may only use the published surface" by the linker
rather than by review — the cost is the marshalling layer, the duplicated DTO
definitions and the start-up version check. The benefit is that the boundary
is enforced mechanically rather than socially. This is open decision **O-2** in
§15; the recommendation is the Cargo dependency.

---

## 7. Platform differences are gaps, not special cases

### 7.1 The principle

> **The core never branches on the platform. The core branches on
> capabilities.**

A shell reports what it can do; the base decides what is possible with that.
A platform difference is therefore **a gap in a capability set**, filled by
the platform mechanism — never an `if (isAndroid)` inside a rule.

```text
Capabilities {
  autoplay_without_gesture : bool,
  background_audio          : bool,
  keep_awake               : bool,
  qr_scanner               : bool,
  camera                   : bool,
  file_export              : bool,
  file_picker              : bool,
  notifications            : bool,
  pointer_input            : PointerInput,   // touch | pointer | dpad
  multi_window             : bool,
  orientation              : Orientation,    // free | locked
  providers                : Vec<ProviderKind>,
}
```

The rule that follows: a shell that cannot scan QR reports `qr_scanner =
false`; the lobby then disables the QR source and offers the random draw. **The
game does not change** — the lobby does.

### 7.2 The gap table

| Problem | Capability | Android (phone/tablet) | Google TV / Fire TV | macOS / Linux | iOS / iPadOS | Windows | Web |
|---|---|---|---|---|---|---|---|
| **Autoplay block** | `autoplay_without_gesture` | the media stack starts only after a user gesture; the shell shows the existing countdown affordance | the same; the first remote press counts as the gesture | the same | the same | the same | the browser blocks autoplay with sound until a gesture; the countdown is the documented workaround ([`../../docs/GETTING-STARTED.md`](../GETTING-STARTED.md), "Der Ton wird von deinem Browser blockiert" (German UI; the English interface says "Audio is blocked by your browser")) |
| **Screen sleep** | `keep_awake` | the window flag keeps the screen on while a round runs | the TV never sleeps during playback, but the shell still requests it | the shell inhibits the idle timer during a round | the same | the same | no equivalent — the browser tab can be backgrounded; **not solvable in the browser** |
| **Remote / keyboard / mouse / touch** | `pointer_input` | touch and a pointer; the tablet layout is the reference | **D-pad only** — focus must be explicit and visible; no hover, no small targets | pointer and keyboard; hover is available | touch and a pointer; the iPad is the reference for a large touch surface | pointer and keyboard | pointer and touch |
| **Camera / QR** | `qr_scanner`, `camera` | the camera API, with the runtime permission dialog | not available — no camera on a TV; the QR source is off | not available on the desktop shells by default; the web shell's scanner uses `html5-qrcode` ([`../../src/components/game/QRScannerModal.tsx`](../../src/components/game/QRScannerModal.tsx):10) | the camera API, with the permission dialog | not available by default | `html5-qrcode` in the browser, with the browser's own permission flow |
| **Notifications** | `notifications` | the notification channels; used for "round finished" only | not useful — the TV is always on | the notification centre | the notification centre | the toast / action centre | the browser notification API, with its own permission |
| **Card file export** (print the card sheets) | `file_export` | the Storage Access Framework / the share sheet | not available — no printing on a TV | the native print dialog / the file chooser | the share sheet and the file exporter | the native print dialog / the file chooser | the browser download / the print dialog |
| **Background playback** | `background_audio` | the foreground service, with the notification requirement | the playback continues while the shell shows the projector | the audio session | the audio session, with the interruption rules | the audio session | **restricted** — the YouTube Developer Policies forbid a player that is not displayed on the user's screen (source below) |
| **Storage / persistence** | — | app-private storage; the persistable field set comes from the base | app-private storage, small | the application support directory | the app container | the app data directory | `localStorage`, key `phomu-game-state` ([`../../src/stores/game-store.ts`](../../src/stores/game-store.ts):619) |
| **Multi-window** | `multi_window` | split screen; the session must survive the process being backgrounded | not applicable | several windows; the projector can be a second window | several scenes; the iPad can drive the projector | several windows | several tabs — today the projector polls the store every 2 s ([`../../src/app/projector/page.tsx`](../../src/app/projector/page.tsx):118) |
| **Screen rotation / orientation** | `orientation` | free; the layout adapts | locked to the screen | free | free on iPad, locked on iPhone for the game | free | free |

### 7.3 The rules that follow from the table

1. **A missing capability disables a feature, never a rule.** A TV has no
   camera: the QR source is off in the lobby; the round automaton is identical.
2. **The shell fills the gap with the platform mechanism.** The core says
   `keep_awake = true`; the Android shell sets the window flag, the macOS
   shell inhibits the idle timer, the browser shell does nothing — and the
   browser shell is *honest about it*, because the capability is `false` there.
3. **Every gap that changes the user-visible behaviour needs a text.** The
   shell explains the gap in its own language; the base supplies the key.
4. **A gap that cannot be filled is documented, not hidden.** The browser
   cannot keep the screen awake. That is stated in the user documentation, not
   papered over.

---

## 8. Media playback

### 8.1 What exists today

The web shell plays through six declared provider identifiers
([`../../src/config/game-config.ts`](../../src/config/game-config.ts):20-26),
but only **five** have a branch in the player
([`../../src/components/game/MusicPlayer.tsx`](../../src/components/game/MusicPlayer.tsx)):

| Provider id | Today | Measured |
|---|---|---|
| `youtube` | the YouTube IFrame Player API, with the fallback chain over `links.youtube` and `links.youtubeAlternatives` | `MusicPlayer.tsx`:164-169 (the queue), :428 (the API script) |
| `spotify-free` | an `<audio>` element over `links.spotifyFreePreview` | `MusicPlayer.tsx`:194-195, :716 |
| `spotify-premium` | an `<iframe>` over `open.spotify.com/embed/track/{id}` | `MusicPlayer.tsx`:192-193, :702-704 |
| `amazon-music` | an `<audio>` element over `links.amazonPrimePreview` | `MusicPlayer.tsx`:196-197, :734 |
| `amazon-music-premium` | an `<iframe>` over `music.amazon.com/embed/track/{asin}` | `MusicPlayer.tsx`:198-199, :762-764 |
| `apple-music` | **no branch at all** — the selection falls through to the YouTube path | measured: no `useAppleMusic` in `MusicPlayer.tsx` |

Two further measured defects are carried over from
[`GAME-CONTRACT.md`](GAME-CONTRACT.md) §11.1: the `amazon-music-premium`
branch renders **in addition to** the YouTube player (A10), and the declared
`MusicProviderInterface` is neither implemented nor used (A9).

### 8.2 The model: three provider *kinds*

This is the decision that makes the native shells possible. The provider is
not a name — it is a **kind**, and the kinds differ in how portable they are.

| Kind | What it is | Portable? | Where it comes from in the catalogue |
|---|---|---|---|
| `embed` | an HTML embed player, driven by an iframe | **web only** — an embed is a browser construct | `links.spotify`, `links.amazonMusic` |
| `preview-audio` | a plain audio URL that any audio stack can play | **yes** | `links.spotifyFreePreview`, `links.amazonPrimePreview` |
| `deeplink` | hand playback to the installed provider application | yes, but not controllable — no start offset, no precise fallback | `links.appleMusic`, `links.youtube` as a fallback |

The catalogue already carries the portable paths: `spotifyFreePreview` and
`amazonPrimePreview` are plain audio URLs
([`../../src/types/song.ts`](../../src/types/song.ts):157-163). **The portable
route is in the data model today** — the missing piece is the policy, not the
data.

### 8.3 The split of responsibility

| In the base (`core/phomu-media`) | In the shell |
|---|---|
| the provider kinds and their portability | the player surface for each kind |
| the provider order and the fallback chain | the actual playback |
| the start and end offsets | the audio focus, the interruption handling |
| the error classification (unavailable / blocked / failed / timed out) | the error presentation |
| the auto-skip policy | the countdown |

### 8.4 Provider availability per platform

| Provider kind | Web | Android | Google TV / Fire TV | macOS / Linux | iOS / iPadOS | Windows |
|---|---|---|---|---|---|---|
| `embed` — YouTube IFrame Player API | native | via a WebView, subject to the YouTube WebView rules (below) | **unverified** — see §8.5 | via a WebView, subject to the same rules | via `WKWebView`, subject to the same rules | via a WebView, subject to the same rules |
| `embed` — Spotify / Amazon | native | **not available** — the embed is a browser construct and the terms of those services govern their use | not available | not available | not available | not available |
| `preview-audio` — Spotify Free / Amazon Prime preview | native | native | native | native | native | native |
| `deeplink` | opens the provider in a new tab | hands over to the installed app | hands over to the installed app | hands over to the installed app | hands over to the installed app | hands over to the installed app |
| Spotify **full playback** (Web Playback SDK) | possible, with Premium | **out of scope** for a native shell — see §8.6 | out of scope | out of scope | out of scope | out of scope |
| Apple Music | not implemented today; the CSP deliberately excludes `music.apple.com` from `frame-src` ([`../../next.config.ts`](../../next.config.ts), comment) | not in scope | not in scope | not in scope | **blocked by the review guidelines** — see §8.7 | not in scope |

### 8.5 The YouTube rules that bind the native shells

The YouTube IFrame Player API is a **browser** API. A native shell that uses
it hosts it in a WebView, and the YouTube "Required Minimum Functionality"
rules then apply. The rules that constrain the design, as published:

- The embedded player must be identified through the `HTTP Referer` header,
  with the application's identifier.
- When integrating the embedded player in a WebView, use one of the
  OS-provided WebView types where available — Android: `WebView` or
  `CustomTabs`; Apple platforms including iOS, iPadOS and macOS:
  `WKWebView` or `SFSafariViewController`.
- The embedded player needs a viewport of at least 200 × 200 pixels; 16:9
  players are recommended to be at least 480 × 270 pixels.
- Autoplay may only begin when the player is visible and more than half
  visible; a screen must not have more than one YouTube player auto-playing
  at the same time.
- The YouTube Developer Policies forbid creating, including or promoting
  features that play content "from a background player, meaning a player that
  is not displayed in the page, tab, or screen that the user is viewing".

Source: <https://developers.google.com/youtube/terms/required-minimum-functionality>
and <https://developers.google.com/youtube/terms/developer-policies>.

**Consequences for the design:**

1. The projector shell must keep the player **visible on the projector
   screen** while the music plays, or it must use a `preview-audio` provider.
   A "hidden player that keeps playing" is not an option.
2. The former Android Player API was deprecated in 2023 and its references
   were removed from the policies on 2025-01-23
   (<https://developers.google.com/youtube/terms/revision-history>). It is
   **not** an alternative for the TV track.
3. On Google TV / Fire TV there is no general-purpose browser. Whether a
   WebView-based embed satisfies the rules there is **unverified**. This is a
   **spike for the TV track**, not an assumption — see §15, O-4.

### 8.6 Spotify

The Spotify Web Playback SDK is a **browser** library, it requires a Spotify
Premium subscription, and the published documentation states that it "must not
be used in commercial projects without Spotify's prior written approval"; the
platform "can not be used to develop commercial streaming integrations" and
"Do not synchronize Spotify content" with other audio or video content.

Source: <https://developer.spotify.com/documentation/web-playback-sdk> and
<https://developer.spotify.com/documentation/web-playback-sdk/reference>.

**Consequence:** full Spotify playback is **out of scope for the native
shells** until a separate written agreement exists. The portable Spotify path
is the `preview-audio` kind, which the catalogue already provides.

### 8.7 Apple Music and the App Review Guidelines

The App Review Guidelines state, in 5.2.3, that an app must not include the
ability to store, convert or download third-party media without express
permission, and that "streaming audio or video content may also violate the
service's terms of use, so check before connecting your app to those services".
Guideline 5.2.5 states that Apple Music or iTunes preview content must not be
used for entertainment purposes, and names game soundtracks as an example.

Source: <https://developer.apple.com/app-store/review/guidelines/>.

**Consequence:** the iOS/iPadOS track must **not** assume an Apple Music path.
The default provider for that track has to be one whose terms permit the use,
and the licence question in §15, O-3, has to be answered before that track
starts.

### 8.8 What happens when the web embed is not available on Android

The answer is a rule, and the rule is identical on every platform:

```text
the base asks the shell:  "play this song, from the start offset, to the end offset"
the shell answers:        one of { played, unavailable, blocked, failed, timed out }
the base decides:         unavailable/blocked → try the next provider of the same kind
                          no provider left    → the song cannot be played
                                             → the auto-skip policy applies
                                             → the phase returns to `drawing`
                                             → the shell shows the named error state
```

The web shell implements this today: the YouTube error handler walks the
fallback chain, and on exhaustion it starts a 10-second auto-skip countdown
([`../../src/components/game/MusicPlayer.tsx`](../../src/components/game/MusicPlayer.tsx):297-332,
:418). The rule is not new; the **portability of the provider set** is
new, and it is a capability, not a rule.

### 8.9 What the base must add to the provider model

| Addition | Why |
|---|---|
| `ProviderKind` on every provider | the embed/preview-audio/deeplink distinction (§8.2) |
| `portability` per provider | a shell must be able to ask "can I play this kind?" before the round starts |
| `provider order per kind` | today one order serves all; with three kinds the order is per kind |
| `MediaPlan` as a bridge call | the shell receives the plan and does not decide the policy |

---

## 9. The catalogue in the client

### 9.1 What exists today

| Fact | Value | Measurement |
|---|---|---|
| JSON files in `src/data/songs/` | **136** — 135 pack files plus `packs.json` | `ls src/data/songs/*.json \| wc -l` → 136 |
| Pack files (excluding `packs.json`) | 135 | the same listing, minus `packs.json` |
| Songs | 1,615 | sum over all pack files |
| Catalogue bytes on disk | 3,618,328 | `du -sb src/data/songs` |
| The loader | [`../../src/data/songs/index.ts`](../../src/data/songs/index.ts), 297 lines, **generated** | file header |
| Cover images | 1,649 files in `public/covers` | `ls public/covers \| wc -l` |
| The catalogue's share of the web export | 2.71 MiB in a single JavaScript chunk | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §3 (measured there on 2026-04, **not re-measured here**) |
| The export's total size | 147 MB, of which 142 MB are the cover images | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §3 (same caveat) |

The loader imports all **136** JSON files statically — `packs.json` plus the
135 pack files — so the catalogue is part of
the **JavaScript bundle**. That is the largest single lever on the web
bundle size, and it is the reason the bundle budget is missed today.

### 9.2 Where the truth lies

> **The truth is the catalogue artefact, identified by its schema version and
> its content hash. Every copy of it — in a bundle, in `localStorage`, in an
> app sandbox, in a cache — is a cache.**

The chain is:

```text
src/data/songs/**.json                    ← the authored source (in the repository)
        │  scripts/validate-*.ts, npm run validate-catalog
        ▼
tools/catalog-tool                        ← builds, validates, versions
        ▼
catalog.artifact.json + catalog.manifest.json
   manifest = { schema_version, content_hash, song_count, packs[], generated_at }
        │
        ├─ web:     a static asset next to the export
        ├─ Android: an asset in the APK/AAB
        ├─ TV:     an asset in the bundle
        ├─ desktop: the user data directory, updatable without a new binary
        └─ iOS:    the app bundle (or an on-demand resource)
```

The **rules**:

1. The artefact is **data, not JavaScript and not Rust**. No shell imports it.
   The base reads it through a `CatalogSource` that the shell provides.
2. The **model** belongs to the base (`core/phomu-catalog`); the **data**
   belongs to the artefact. The shell moves bytes, never semantics.
3. The **selection rules** belong to the base: pack filter → difficulty → QR
   compatibility → mode compatibility → not yet played → the fallback chain
   ([`../../src/utils/song-picker.ts`](../../src/utils/song-picker.ts):36-84).
4. The manifest hash is verified by the shell before the artefact is used. A
   mismatch is a named error, not a silently degraded catalogue.
5. **The covers are a separate problem.** 1,649 images at 142 MB do not
   belong in the initial download of any platform. They are delivered on
   demand, per pack, and cached — with the cache being disposable.

### 9.3 The decision the Owner has to make

Per-pack artefacts or one monolithic artefact? Measured arguments:

| Option | Advantage | Cost |
|---|---|---|
| One monolithic artefact | one fetch, one hash, simplest | the whole catalogue is downloaded even when one pack is selected |
| Per-pack artefacts + a manifest | only the selected packs are transferred | the shell must resolve the pack set and merge the results |

**Recommendation: per-pack artefacts plus a manifest.** The selection is
always a pack selection ([`../../src/app/lobby/page.tsx`](../../src/app/lobby/page.tsx) step 3),
and the web budget is already missed because of the catalogue.

---

## 10. The anti-spoiler contract across all platforms

### 10.1 Today's rule

The rule that exists today is a **rendering** rule: in the phase `question`,
the solution must not be *visible* in the rendered DOM of `/game` and
`/projector`, and the song must not be in `localStorage`
([`../../src/stores/game-store.ts`](../../src/stores/game-store.ts):621-637 —
`currentSong` is not in `partialize`).

This rule is correct but weak, because the client holds the full record in
memory. It is also measured to be **violated in two modes**: `lyrics` renders
the artist and the title in the question phase, and `cover-confusion` renders
its banner and uncensored hints
([`GAME-CONTRACT.md`](GAME-CONTRACT.md) §11.1, A1 and A2).

### 10.2 The cross-platform contract

The contract below holds on **every** platform and is checkable by a test
rather than by a review.

> **C-1 — View-model redaction.** In the phase `question` the base hands the
> shell a `RoundView` that contains no field capable of revealing the
> solution. The title, the artist, the year and the raw hints are **absent
> from the type** — not present and blank.
>
> **C-2 — Censoring in the base.** Hint censoring is performed by the base, so
> every platform censores identically. A shell cannot add, remove or weaken a
> censoring rule.
>
> **C-3 — No answer on the wire.** No bridge call made during the phase
> `question` returns the answer. The bridge surface for that phase has no
> field for it.
>
> **C-4 — No answer on the disk.** The set of persistable fields is defined by
> the base. The song is not in it. A shell may only persist the fields the
> base marks persistable.
>
> **C-5 — The projector.** The projector view contains no artist, no title and
> no cover art.
>
> **C-6 — Mode exceptions are explicit.** `vibe-check` deliberately reveals
> the identity. That exception is a property of the **mode**, declared in the
> base, and therefore identical on every platform. A mode may not gain an
> exception silently.

### 10.3 How the contract is verified

| Layer | Test | What it proves |
|---|---|---|
| Base | for every phase and every mode, serialise the `RoundView` and assert that the question-phase payload contains none of the song's title, artist and year tokens | C-1, C-2, C-6 |
| Base | the persistable set contains no field of the song | C-4 |
| Bridge | drive the whole FFI surface through one round and grep every serialised payload for the answer tokens | C-3 |
| Shell (per platform) | render the question phase and search the rendered tree for the title and the artist | C-1 at the surface |
| Catalogue | the existing [`../../scripts/audit-spoilers.js`](../../scripts/audit-spoilers.js) | the hints do not contain the answer |

### 10.4 The honest gap

Until the base exists, the web shell keeps the weaker, rendering-based rule —
and the two measured violations (A1, A2) stay open. **C-1 makes the rule
structural**, but only once the web shell runs on the base (step S4 in §5.3).
This document does not claim that the violations are already fixed.

---

## 11. Performance budgets per platform

### 11.1 The measurement rules

| Rule | Detail |
|---|---|
| **M-1** | A quoted value is either measured — with the command that produced it — or marked `not measured`. |
| **M-2** | The round transition is measured **around the core call**, not around the render. That is the only way the number is comparable across platforms. |
| **M-3** | The budget inheritance rule: until a platform track has produced its own measurement, the target for a metric is the web target for the same metric. The first platform measurement replaces it with a cited value. |
| **M-4** | A budget that is not met is stated as **not met**, with the measured value next to the target. |

### 11.2 The budgets

| Metric | Web target | Android / TV | macOS / Linux | iOS / iPadOS | Windows | Measurement method |
|---|---|---|---|---|---|---|
| **Start to first usable screen** | FCP ≤ 1.5 s, LCP ≤ 2.5 s | *inherited* | *inherited* | *inherited* | *inherited* | Web: Lighthouse against the static export `out/`, mobile emulation, mean of 5 runs (method from [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §1). Android/TV: Macrobenchmark `StartupTimingMetric` on a pinned device, cold start. macOS: `os_signpost` intervals plus `xcrun xctrace`. Linux: the `tracing` crate, measured from process spawn. iOS: the Xcode "App Launch" template, hang duration. Windows: `QueryPerformanceCounter` around the cold start. |
| **Round transition** | draw → question ≤ 500 ms; reveal → next round ≤ 300 ms | *inherited* | *inherited* | *inherited* | *inherited* | Around the core call, per M-2. Web: `performance.now()` around the call, median over 50 rounds of a 6-player test game. Android/TV: `Trace.beginSection`/`endSection`, read with `atrace`. macOS/iOS: `os_signpost`. Linux/Windows: `tracing` / `QueryPerformanceCounter`. |
| **Memory** | **no target exists** — `not measured` | *no target until measured* | *no target until measured* | *no target until measured* | *no target until measured* | Android/TV: `adb shell dumpsys meminfo <pkg>`, the PSS column. macOS: `footprint -p <pid>` and the Xcode memory gauge. Linux: `/usr/bin/time -v`, maximum resident set size. iOS: the Xcode memory report. Windows: `GetProcessMemoryInfo`, the working set. Web: `performance.measureUserAgentSpecificMemory()` (requires cross-origin isolation). |
| **Bundle / artefact size** | JavaScript ≤ 1.5 MB unpacked and ≤ 600 KB gzip; largest chunk ≤ 800 KB unpacked; static export ≤ 20 MB | the base module must stay within the Play limit of **200 MB** compressed download (Google Play size limits, <https://support.google.com/googleplay/android-developer/answer/9859372>) — the current export is 147 MB, so this is the binding constraint | the shipped artefact; the download is a package | the `.ipa`; the bundle is immutable without an app update | the installer / MSIX package | Web: `npm run build`, then `find .next/static/chunks -name "*.js" -printf "%s\n"` and `du -sh out` (method from [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §3). Android/TV: `bundletool` / `apkanalyzer`. macOS/iOS: the size of the built `.app` / `.ipa`. Linux/Windows: the binary plus the assets. |
| **Catalogue transfer** | *not measured* — part of the bundle budget today | *inherited* | *inherited* | *inherited* | *inherited* | The bytes of the artefact actually fetched for the selected packs. Method: the transfer log of the shell, per pack. |

### 11.3 The measured status of the web budget

Quoted from [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §3, measured there on
2026-04 on branch `feature/vocument-style-docs-and-i18n`. **These values were
not re-measured for this document.**

| Target | Measured | Met? |
|---|---|---|
| JavaScript ≤ 1.5 MB unpacked / ≤ 600 KB gzip | 4,425,934 B unpacked / 1,304,143 B gzip, in 32 chunks | **no** |
| Largest chunk ≤ 800 KB unpacked | 2,845,675 B | **no** |
| Static export ≤ 20 MB | 147 MB (142 MB of it the 1,649 cover images) | **no** |

The cause is named there and confirmed by the code: the catalogue is imported
as JavaScript. §9 removes it from the bundle.

### 11.4 The budget that this architecture adds

Two new artefacts appear with the base and therefore need a budget of their
own:

| Artefact | Budget | Method |
|---|---|---|
| The WebAssembly module for the web shell | the target is set by the first measurement; until then the rule is that the WASM module **replaces** the JavaScript it takes over, and the total budget does not grow | `ls -la target/wasm32-unknown-unknown/release/*.wasm` after `wasm-opt -Oz` |
| The native libraries per ABI | the target is set by the first measurement | `cargo bloat --crates` or the size report of the platform build |

Both are stated as **not measured** until they exist.

---

## 12. Test strategy

### 12.1 The layers

| # | Layer | What it runs on | Cost | What it proves |
|---|---|---|---|---|
| T1 | **Core unit tests** | plain `cargo test`, headless | seconds | the round automaton, the scoring, the mode predicates, the catalogue filters, the censoring, the provider fallback, the error mapping |
| T2 | **Core invariant tests** | `cargo test` | seconds | the anti-spoiler redaction (C-1), the persistable set (C-4), the determinism with a fixed seed |
| T3 | **Conformance vectors** | `cargo test` + one replay per shell | seconds per shell | the cross-platform equality of the observable results (§1.3) |
| T4 | **Bridge round-trip tests** | `cargo test` against the generated bindings | minutes | that the marshalling loses nothing, that the errors arrive typed, that the ABI bracket check works |
| T5 | **Catalogue and golden tests** | `cargo test` + `npm run validate-catalog` | minutes | the artefact hash, the schema version, one golden round per pack |
| T6 | **Shell snapshot tests** | per shell: Compose/Preview, SwiftUI, egui, React | minutes | the surface of each shell: what is drawn in each phase |
| T7 | **Shell E2E** | per shell: one emulator/device/simulator per platform | hours | lobby → a full round → reveal → next round → game over |
| T8 | **Gate self-tests** | `node scripts/check-crate-boundaries.test.mjs` | seconds | that the boundary gate actually fails on a violation ([`BUILD-CONTRACT.md`](BUILD-CONTRACT.md) §7) |

### 12.2 What is shared and what is per shell

| Concern | Shared — tested once in the base | Per shell |
|---|---|---|
| the round automaton, the scoring, the mode rules | ✅ T1 | — |
| the anti-spoiler redaction | ✅ T2 (structurally) | T6 (the rendered tree) |
| the provider fallback order | ✅ T1 | the provider availability per platform (§8.4) |
| the catalogue selection | ✅ T1 | the delivery and the loading |
| the error taxonomy and the recovery | ✅ T1 | the presentation |
| the rendering, the navigation, the input | — | ✅ T6, T7 |
| the platform integration: camera, sleep, remote, file export | — | ✅ T7 |
| the accessibility implementation: TalkBack, VoiceOver, D-pad focus | the semantics only | ✅ T6, T7 |
| the i18n completeness per locale | the key space (T1) | the locale files per shell |

### 12.3 The rules

1. **The rules are tested without an emulator.** That is the point of the
   base. A rule change that requires an emulator to be verified has been put
   in the wrong place.
2. **Every hardening measure has a negative test.** A test that cannot fail
   is not a test.
3. **No test is skipped or commented out to make a build green.**
4. **No stub returns a fake success.** A bridge method that returns `Ok(())`
   in place of real work is a lie that the acceptance process will catch.
5. **The conformance vectors are the acceptance evidence for "the same game
   everywhere"**. A platform track is not accepted until its shell has
   replayed the vectors and produced identical output.

---

## 13. The build chain

### 13.1 The chains

```text
                       core/*  (Rust)
                          │
                          ├──────────────► platform/phomu-capi ──► cdylib + phomu.h
                          │                     │
                          │                     └─► external embedders, JNI path
                          │
                          ├──────────────► platform/phomu-ffi ──► uniffi-bindgen
                          │                                          ├─► Kotlin  ──► apps/android, apps/tv-android
                          │                                          └─► Swift   ──► apps/macos, apps/ios-ipados
                          │
                          └──────────────► platform/phomu-wasm ─► wasm-bindgen ─► apps/web

              core/phomu-core ──► apps/linux, apps/windows   (Cargo dependency, no FFI)
```

### 13.2 The per-platform build

| Shell | Toolchain | How the core is linked | Notes |
|---|---|---|---|
| Android, Google TV / Fire TV | **Gradle** | the Rust static library is built by `cargo-ndk` for `arm64-v8a` (plus `x86_64` for the emulator) and packaged as a JNI library; the Kotlin code uses the generated UniFFI bindings | the TV shell is a separate Gradle module with the Leanback dependency, sharing the core and the Kotlin UI modules with the phone shell |
| macOS | **SwiftPM** | a binary target wrapping the `xcframework`; the Swift target contains the generated UniFFI bindings | |
| iOS / iPadOS | **SwiftPM** | the same `xcframework` approach, built for the device and the simulator | |
| Linux | **Cargo** | `core/phomu-core` as a direct dependency; `egui`/`eframe` on `winit` | |
| Windows | **Cargo** | the same; the MSVC toolchain | |
| Web | **npm** (unchanged) | the WASM module is built by `wasm-pack`/`wasm-bindgen` and imported by the Next.js app | the static export stays a static export |

### 13.3 The build order

```text
1. cargo build --release        → the core
2. uniffi-bindgen / wasm-bindgen → the generated bindings (Kotlin, Swift, JS)
3. the shell build              → Gradle / SwiftPM / Cargo / npm
```

A shell that is built against a core whose ABI version is outside the
shell's bracket **fails the build**. The version check is not a runtime
convenience; it is a build-time condition (§6.4).

### 13.4 The pinned toolchains

| Tool | Version | Pinned in |
|---|---|---|
| Rust | **to be pinned** — a `rust-toolchain.toml` at the repository root with an exact `channel`, plus `components = ["rustfmt", "clippy"]` | `rust-toolchain.toml` — **does not exist yet** |
| Cargo workspace | `edition = "2024"`, a single resolver version | the root `Cargo.toml` — **does not exist yet** |
| UniFFI | an **exact** version (`=0.x.y`), never a range: a UniFFI minor version changes the generated bindings | the root `Cargo.toml` |
| `wasm-bindgen`, `wasm-opt` | exact versions | the root `Cargo.toml` and the web build script |
| Android Gradle Plugin, Kotlin, Compose, `compileSdk`, `minSdk`, `targetSdk` | exact versions | the Gradle version catalogue `apps/android/gradle/libs.versions.toml` |
| The Gradle distribution | the wrapper's SHA-256 | `apps/android/gradle/wrapper/gradle-wrapper.properties` |
| Xcode / Swift | the `swift-tools-version` and the deployment target | `apps/macos/Package.swift`, `apps/ios-ipados/Package.swift` |
| `egui`, `eframe`, `winit` | exact versions | `apps/linux/Cargo.toml`, `apps/windows/Cargo.toml` |
| `cargo-deny` | an exact version — a different version reads the same configuration differently | `.github/workflows/ci-rust.yml` — **does not exist yet** |
| Node | **22** — measured: [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml) uses `node-version: '22'` | `.github/workflows/ci.yml` |
| npm | the lockfile version | `package-lock.json` (lockfile v3) |

> **Measured inconsistency:** [`../../docs/GETTING-STARTED.md`](../GETTING-STARTED.md)
> §1 still states Node **20**, while the CI workflow pins **22**. The
> authoritative value is the CI workflow. This document does not change the
> file — it belongs to the documentation track.

### 13.5 The code style rules that carry over

| Rule | Value | Source |
|---|---|---|
| Rust edition | 2024 | the Vocument/PhairPlayRust house style |
| `unsafe_code` | denied workspace-wide | PhairPlayRust build contract §6 |
| `unwrap()` / `expect()` | denied workspace-wide | same |
| `missing_docs` | warn — every public item is documented | same |
| Formatting | `cargo fmt` | same |
| Lints | `cargo clippy -- -D warnings` | same |
| File length | the same limits as the JavaScript side: target ≤ 400 lines, hard maximum 550 lines | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) §6 |
| Generated code | generated, never hand-edited | Vocument `AGENTS.md`, universal rule 13 |

### 13.6 The CI

The existing [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
stays as the **web shell's** gate: typecheck, lint, unit tests, catalogue
validation, the quality gates, the build.

A new workflow `.github/workflows/ci-rust.yml` is the **base's** gate:

| Job | Command |
|---|---|
| format | `cargo fmt --all -- --check` |
| lint | `cargo clippy --workspace --all-targets -- -D warnings` |
| tests | `cargo test --workspace` |
| dependency policy | `cargo deny check` |
| boundary gate | `node scripts/check-crate-boundaries.mjs` |
| gate self-test | `node scripts/check-crate-boundaries.test.mjs` |
| ABI consistency | part of `cargo test --workspace` |
| conformance vectors | part of `cargo test --workspace` |

---

## 14. What this architecture explicitly does not deliver

An architecture that claims everything delivers nothing.

1. **No shared user interface.** Seven shells mean seven UI implementations.
   The base decides; the shell draws. There is no cross-platform design
   system in this architecture, only shared semantics.
2. **No pixel parity and no identical animation.** Only the observable game
   results are equal (§1.2).
3. **No offline media.** The embeds and the preview URLs both need the
   network. A party without a network has no music — today and afterwards.
4. **No native Spotify or Amazon full-catalogue player.** The Spotify Web
   Playback SDK is browser-based, requires Premium and needs written approval
   for commercial use; the Spotify and Amazon embeds are browser constructs
   (§8.4, §8.6).
5. **No hidden background YouTube player.** The YouTube Developer Policies
   forbid a player that is not displayed on the user's screen (§8.5).
6. **No Apple Music path on iOS without a licence review.** The App Review
   Guidelines name exactly this use case (§8.7).
7. **No single binary for all platforms.** Seven release pipelines, seven
   signing identities, seven update channels.
8. **No independent catalogue update on iOS.** The bundle is immutable
   without an app update, unless on-demand resources are used.
9. **No solved AGPL-3.0-or-later store-distribution question.** The repository is
   licensed AGPL-3.0-or-later ([`../../package.json`](../../package.json):4). The
   compatibility of that licence with the store distribution channels is a
   legal question that this document does not answer (§15, O-3).
10. **No solution to the cover-image problem.** 1,649 images at 142 MB are a
    delivery problem on every platform and are only partially addressed by
    the per-pack delivery (§9.2, rule 5).
11. **No verified TV media path.** The TV track starts with a spike (§8.5).
12. **No removal of the rule duplication in the web shell before the base
    exists.** Until step S4 (§5.3), the web shell keeps its own rules and the
    only thing that keeps them honest is the conformance vector.
13. **No guarantee that the shells will look alike.** The shells are
    independent products that share rules.

---

## 15. Open decisions for the Owner

| # | Decision | Options | Recommendation | Needed before |
|---|---|---|---|---|
| **O-1** | Move the Next.js app to `apps/web`? | A: keep it at the repository root, name it logically `apps/web`; B: move the whole application | **A now.** B buys no architectural property and costs 23 build/CI files, 29 documentation links and the deployment path, in the phase with the most churn. Trigger in §5.4. | the creation of the Cargo workspace |
| **O-2** | Do the Rust shells go through the C-ABI? | A: a direct Cargo dependency on `core/phomu-core`; B: the C-ABI | **A.** The compiler checks the types; the C-ABI adds marshalling, duplicated DTOs and a version skew for no benefit. The C-ABI stays the external embedder surface. | `apps/linux` |
| **O-3** | The licence strategy for the base under AGPL-3.0-or-later in the store channels | A: obtain a legal opinion and keep AGPL-3.0-or-later; B: re-licence the base to a permissive licence; C: add an explicit linking exception | **B or C, decided by legal counsel.** The repository is AGPL-3.0-or-later today ([`../../package.json`](../../package.json):4). This document does not answer the legal question; it only states that it exists and that it gates a track. | the **iOS/iPadOS track** (track 4) |
| **O-4** | Which media providers are in scope for the native shells? | A: preview-audio + deeplink only; B: additionally a WebView-hosted YouTube embed; C: additionally Spotify full playback | **B, with a spike.** A is safe but weak. C is out of scope until a written Spotify agreement exists. The TV feasibility of B is unverified and is the TV track's first spike. | the **Android track** (track 1) |
| **O-5** | The catalogue delivery: one artefact or per pack? | A: one monolithic artefact; B: per-pack artefacts plus a manifest | **B.** Only the selected packs are transferred, and the selection is always a pack selection. | step S2 (§5.3) |
| **O-6** | When does the web shell adopt the base? | A: the web shell first, as the first consumer of the base; B: Android first, the web shell later | **A.** The web shell is the only shell that exists today; adopting the base there proves the base before four other shells depend on it, and it removes the rule duplication earliest. | step S4 (§5.3) |
| **O-7** | A dual implementation of the rules during the transition | A: no dual implementation — the TypeScript rules are removed in the same change; B: a period with both | **A.** A period with both is the most dangerous state of the programme: the vectors would then only prove that one of two implementations is right. | step S4 (§5.3) |
| **O-8** | The directory name for the base | A: `core/`; B: `crates/` | **A.** Both reference projects use `core/`; *crate* already means the Rust unit of compilation. | the Cargo workspace |
| **O-9** | Who signs off a platform track? | A: the web QA role; B: a platform QA role per track, with the acceptance evidence in `docs/acceptance/` | **B**, using [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md). A platform track that reuses the web role's sign-off has no independent acceptance. | the **Android track** (track 1) |
| **O-10** | The documentation language for this set | A: English for the platform set, German elsewhere; B: English for the whole repository | **B — decided by the owner on 2026-10-25.** The whole repository is English: the documentation, the code comments, the script output and the test names. ADR-0001 to ADR-0004 were translated along with the rest; there is no exception left. The **user interface** stays German-first with a complete English translation — that is a product decision and is recorded in [`../../docs/DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md) and enforced by `scripts/check-doc-language.mjs`. | closed |

---

## 16. Related documents

| Document | Relation |
|---|---|
| [`BUILD-CONTRACT.md`](BUILD-CONTRACT.md) | the binding contract between the base and the shells — the machine-readable companion of this document |
| [`GAME-CONTRACT.md`](GAME-CONTRACT.md) | the contract of the game behaviour that the base must implement |
| [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) | the current layers and dependency direction of the **web** shell |
| [`../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`](../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md) | the layer rules that this document extends to the multi-platform case |
| [`../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md`](../adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md) | the anti-spoiler decision that §10 makes structural |
| [`../adr/ADR-0004-internationalisierungsgrenze.md`](../adr/ADR-0004-internationalisierungsgrenze.md) | the i18n boundary that §4 and the build contract extend to the base |
| [`../adr/ADR-0005-shared-rust-core-with-platform-frontends.md`](../adr/ADR-0005-shared-rust-core-with-platform-frontends.md) | the decision for the shared base |
| [`../adr/ADR-0006-binding-platform-track-order.md`](../adr/ADR-0006-binding-platform-track-order.md) | the decision for the platform order |
| [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) | the measurable quality targets that §11 extends per platform |
| [`../GETTING-STARTED.md`](../GETTING-STARTED.md) | the setup that the new toolchains will extend |
| [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) | the requirement IDs that the platform tracks will reference |
