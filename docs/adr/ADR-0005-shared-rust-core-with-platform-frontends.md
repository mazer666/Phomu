# ADR-0005 — Shared Rust Core with Platform Frontends

**Status:** Proposed
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** CORE-001, CORE-004, CORE-005, CORE-006, CORE-008, CORE-009, CORE-010, CORE-012, GAME-001, GAME-006, GAME-013, MEDIA-001, MEDIA-004, CAT-002, I18N-001, NFR-005

> **Language note.** This ADR is written in English, as required by the work
> order that produced it. ADR-0001 to ADR-0004 are German. The language of a
> document is part of its identity and is recorded in
> [`../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
> §15, open decision **O-10**.

---

## Context

### The measured starting point

Phomu is one Next.js 16 static export. The facts below are measured on
branch `main`, commit `3d3d011`, 2026-10-25.

| Fact | Value | Measurement |
|---|---|---|
| Rust code in the repository | **none** | `ls Cargo.toml` → *No such file or directory* |
| Hand-written source files | **80** `*.ts`/`*.tsx` under `src/` | `find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.ts" ! -name "*.test.tsx" \| wc -l` |
| The game state machine | 640 lines in one Zustand store | [`../../src/stores/game-store.ts`](../../src/stores/game-store.ts) |
| The game constants | 326 lines in one configuration module | [`../../src/config/game-config.ts`](../../src/config/game-config.ts) |
| The six mode widgets | 2,342 lines across 6 files | `wc -l src/components/game/modes/*.tsx` |
| Game numbers defined outside the configuration | **20** | [`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md) §11.3 |
| Catalogue | 135 pack files, 1,615 songs, 3,618,328 bytes | `ls src/data/songs/*.json \| wc -l`, `du -sb src/data/songs` |
| Cover images | 1,649 files | `ls public/covers \| wc -l` |
| Static export | 147 MB | [`../../docs/BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §3 (measured 2026-04) |
| Tests for the point calculation | **none** | [`../../docs/BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §9 |

### The force

The product is to become a **family** of apps: the existing web client plus
Android, Google TV / Fire TV, macOS, Linux, iOS / iPadOS and Windows. The
platform order is fixed by
[`ADR-0006`](../adr/ADR-0006-binding-platform-track-order.md).

A party game is not a "read some text and show a list" application. Its
substance is the rules: which phase is active, what an answer is worth, when
the reveal is released, what a hint may show, what happens when the music
cannot be played. Today those rules are spread across a Zustand store, a
configuration module, six React widgets, a music player component and a
lobby page. They are **not** in one place, and they are **not** tested
without a browser.

That is acceptable for one shell. It is not acceptable for seven.

### What a shared base costs

The costs are real and are not hidden here:

- **Rust enters the stack.** A second language, a second toolchain, a second
  CI pipeline, a second dependency policy, a second supply chain, a second
  set of lints, and a second thing a newcomer has to learn. The repository
  currently has one language and one build system
  ([`../../package.json`](../../package.json)).
- **The bridge is a real maintenance surface.** Three marshalling strategies
  (UniFFI for Kotlin and Swift, wasm-bindgen for the web, a C-ABI for
  external embedders), generated bindings that must never be hand-edited,
  and an ABI version with a migration path.
- **There are still two truths for the surface.** The base decides the
  rules; the *interface* is implemented seven times. The base does not
  remove the duplication of the UI — it moves the duplication from the
  rules to the pixels.
- **There is a transition period.** While the rules move from TypeScript to
  Rust, they exist twice. That period is the most dangerous state of the
  programme, because two implementations of a rule are two rules.

### What refusing costs

If each shell implements its own game logic:

- the round automaton is implemented **seven** times, and the six game modes
  with them;
- every rule change is a change in seven places, seven reviews, seven
  releases — and the probability that all seven are changed identically
  approaches zero;
- the anti-spoiler guarantee becomes seven rendering disciplines instead of
  one structural property. Today the discipline is already measured to be
  violated in two modes (`lyrics` and `cover-confusion`,
  [`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md) §11.1,
  A1 and A2) — in **one** implementation;
- the rules can only be tested where a browser or an emulator exists. Today
  the point calculation has no test at all
  ([`../../docs/BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) §9);
- the provider fallback logic is written seven times against seven different
  provider availabilities, and the divergence is invisible until a party
  stands in front of a TV.

The refusal does not save the build chain — it multiplies it by seven and
scatters it across seven languages.

---

## Decision

### 1. One shared Rust base, platform-specific frontends

The game rules, the round automaton, the scoring, the mode logic, the
catalogue model, the configuration, the i18n key catalogue, the media
provider policy and the error taxonomy are implemented **once**, in Rust,
under `core/`. Every shell is a renderer and an input surface.

The full topology, the dependency rules and the machine-checkable gate are in
[`../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
and in the binding
[`../design/BUILD-CONTRACT.md`](../design/BUILD-CONTRACT.md).

### 2. The web client remains and becomes an equal shell

The Next.js application is **not** replaced and **not** reduced to a wrapper.
It keeps the routes, the rendering, the Tailwind design, the i18next
resources and the Zustand store — the store becomes a projection of the
base's session snapshot.

Because the web shell is a static export
([`../../next.config.ts`](../../next.config.ts) sets `output: 'export'`), it
reaches the base through **WebAssembly** (`platform/phomu-wasm`). It does not
keep its own TypeScript rules: two implementations of the rules would be two
rules.

### 3. The base does no I/O

The core never opens a file, a socket or a clock and never generates
randomness on its own. Bytes, timestamps and seeds arrive from the shell.
This is what makes the base testable without an emulator and what makes the
conformance vectors reproducible.

### 4. The dependency direction is enforced, not requested

`scripts/check-crate-boundaries.mjs` verifies the crate dependency direction
from the Cargo metadata and **exits with code 1** on a violation. The gate
has a negative self-test, because a gate that has never been seen red is not
a gate ([`../design/BUILD-CONTRACT.md`](../design/BUILD-CONTRACT.md)
§7).

### 5. The anti-spoiler guarantee becomes structural

The question-phase view model has **no field** that could carry the solution.
The type does not exist in that phase. This replaces today's rendering
discipline with a property of the interface, and it is testable on every
shell without a human reading the screen.

### 6. The platform tracks are ordered and binding

Android → Google TV / Fire TV → macOS/Linux → iOS/iPadOS → Windows. A track
starts only when the previous one has a green release candidate. This is
decided in [`ADR-0006`](../adr/ADR-0006-binding-platform-track-order.md).

---

## Consequences

### Positive

- **One implementation of the rules.** A rule change is one change, one
  review and one base release. The seven shells pick it up through their
  bridge.
- **One error hierarchy.** Every platform classifies a failure identically,
  because the taxonomy is a closed enum in the base
  (`core/phomu-errors`).
- **One catalogue model.** The selection rules — pack → difficulty → QR →
  mode → not yet played → the fallback chain — exist once and are tested
  once.
- **The rules are testable without an emulator.** The point calculation, the
  time decay, the mode predicates and the provider fallback are ordinary
  headless unit tests. This directly addresses the measured gap that the
  point calculation has **no** test today.
- **The anti-spoiler guarantee is a property, not a convention.** The
  question-phase view model cannot carry the answer, so no shell can leak it
  by forgetting a conditional.
- **The catalogue leaves the JavaScript bundle.** It becomes a versioned data
  artefact, which is the single largest lever on the web bundle budget that
  is currently missed by a factor of three.
- **The shells become smaller.** Each shell is a surface: a phone app, a
  10-foot app, a desktop window. The base is where the complexity lives.

### Negative / Trade-offs

- **The build chain grows to four toolchains**: Cargo, Gradle, SwiftPM and
  the existing npm one. Each platform also gets its own release pipeline and
  its own signing identity.
- **The bridge is a permanent maintenance surface.** Generated bindings, an
  ABI version, a version bracket and three marshalling strategies. A change
  to the facade means a regeneration and a re-review of the bindings.
- **The web shell gains a WASM toolchain** and one more download. Its build
  is no longer only `next build`.
- **The rules must not be implemented twice.** During the transition the
  TypeScript rules are removed in the same change that the Rust rules take
  over. A period in which both exist is explicitly forbidden, because it
  would make the conformance vectors prove only that one of two
  implementations is right.
- **The base inherits the repository's AGPL-3.0-or-later licence**
  ([`../../package.json`](../../package.json):4). Whether that is compatible
  with the app-store distribution channels is a legal question this ADR does
  not answer; it is open decision **O-3** in
  [`../design/PLATFORM-ARCHITECTURE.md`](../design/PLATFORM-ARCHITECTURE.md)
  §15 and it gates the iOS/iPadOS track.
- **The native shells lose the embed players.** The Spotify and Amazon embeds
  are browser constructs and the Spotify Web Playback SDK is browser-based,
  requires Premium and needs written approval for commercial use. The
  portable path is the preview audio that the catalogue already carries.
- **The base is a single point of failure for the product.** A defect in the
  core affects every shell at once. That is the price of one truth, and it is
  the reason the base is covered by headless tests and conformance vectors
  rather than by per-shell testing.

### What the decision makes impossible

- **A shell that implements its own game rules.** Not as a temporary
  measure, not "just for this mode".
- **A shell that reaches into the core's internals.** The facade is the
  boundary; the generated bindings are the only door.
- **A provider the base does not know.** The provider set is closed and
  versioned; a new provider is a base change with an ABI minor bump.
- **The web shell keeping its own TypeScript rules** after the migration. It
  would be the second truth, and the invariant would be void.
- **Adding a platform track outside the binding order** without an ADR that
  supersedes [`ADR-0006`](../adr/ADR-0006-binding-platform-track-order.md).
- **A platform-specific rule.** A rule that only makes sense on one platform
  is either a capability check in the base or a shell behaviour — it is
  never a rule.

---

## Alternatives considered

- **Pure web wrappers / progressive web apps.** *Rejected:* they do not solve
  any of the reasons for native shells. There is no general-purpose browser
  on a TV, the app stores are not reached by a wrapper, the camera and the
  background audio are platform integrations, and a wrapper keeps the rules
  in the browser while adding a layer instead of removing one. A PWA is a
  *distribution* strategy, not an architecture for a family of apps.

- **Separate native apps without a shared base.** *Rejected:* this is the
  "what refusing costs" case above — seven implementations of the round
  automaton, seven of the scoring, seven of the anti-spoiler guarantee, and
  seven providers fallbacks that diverge invisibly. It also multiplies the
  build chain by seven instead of by one.

- **Electron or Tauri as the only solution.** *Rejected:* it makes the
  desktop shell the reference implementation and the mobile shells
  second-class adaptations. It does not fit the TV form factor — a 10-foot
  interface with D-pad focus is not a desktop window — and it does not
  produce the native applications the app stores expect. Tauri remains a
  legitimate candidate for the desktop shells, but as one shell among
  several, not as the architecture.

- **Rust-only (egui for every platform).** *Rejected:* egui is a good fit
  for the Linux and Windows shells and a poor fit for the others. A TV
  interface needs explicit D-pad focus management and a 10-foot layout; the
  phone shells need native text input, the IME and TalkBack; the Apple
  shells need VoiceOver, Dynamic Type and the platform's own idioms. The
  decision keeps egui for the desktop shells only.

- **Keep the rules in TypeScript and share them by copying.** *Rejected:*
  this is the same divergence problem with an extra copy-paste step, and it
  makes the divergence invisible in the diff.

- **A server-side core with a thin client on every platform.** *Rejected:*
  it contradicts the local-first promise (CORE-003), it needs a reachable
  server for a game that is played in a room with unreliable Wi-Fi, and it
  breaks the static export that is the web shell's distribution model today.

---

## Verification

| Check | Command / place |
|---|---|
| The crate dependency direction holds | `node scripts/check-crate-boundaries.mjs` — exits 1 on a violation |
| The gate itself fails on a violation | `node scripts/check-crate-boundaries.test.mjs` — the negative self-test |
| The base compiles and its tests pass | `cargo test --workspace` |
| The lints are clean | `cargo clippy --workspace --all-targets -- -D warnings` |
| The formatting is clean | `cargo fmt --all -- --check` |
| The base does no I/O | no `std::fs`, `std::net`, `std::thread::sleep` or `std::env` in `core/*` — a source scan, enforced in review |
| The question-phase view model carries no answer | a test in `core/phomu-core` that serialises the view model and asserts that none of the song's title, artist and year tokens occur |
| The persistable set carries no song field | a test in `core/phomu-core` |
| The bridge returns no answer during the question phase | a round-trip test over the whole FFI surface |
| Every shell behaves identically | the conformance vectors, replayed per shell |
| The ABI versions agree | a unit test in `core/phomu-core`; the C header is generated |
| The web shell still works | the existing CI job, unchanged |
