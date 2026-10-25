# Phomu Platform Requirements

**Requirements baseline:** P-1
**Status:** Product baseline for the multi-platform extension — **not implemented yet** except where the _Status_ field says otherwise.
**Owner:** Product & Requirements Steward (`ROLE-01` in [`../../AGENTS.md`](../../AGENTS.md)).
**Scope:** The shared Rust base, the six shells (Web, Android, TV, Desktop, iOS/iPadOS, Windows), the FFI bridge, the platform behaviour of each track, the release process, accessibility and performance budgets.
**Language:** English. This document is a technical specification; the product documentation in the repository root remains German (see [`DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md)) — the deviation is recorded as **OPEN-02** in [`SRS.md`](SRS.md#12-open-points).

---

## 0. How to read this document

### 0.1 Relationship to `REQUIREMENTS.md`

[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) is the binding specification of the **product behaviour**: the six game modes, scoring, the lobby, the media providers, the catalogue, security and the non-functional baseline of the **web application**. It is not modified by this programme.

This document specifies the **extension**: how the same product behaviour is carried into a family of apps that share one Rust base. It therefore:

- **does not repeat** the behaviour rules — it refers to the IDs in `REQUIREMENTS.md`;
- **extends** the non-functional baseline to the new tracks;
- **adds** the requirements that only exist once there is more than one shell: the core, the bridge, the platform behaviour, the release process.

### 0.2 ID scheme

```
<DOMAIN>-<NNN>
```

| Domain   | Meaning                                                              |   Count |
| -------- | -------------------------------------------------------------------- | ------: |
| `CORE`   | The shared Rust base: rules, data model, errors                      |      16 |
| `SHELL`  | The frontends: Web, Android, TV, Desktop, iOS/iPadOS, Windows        |      20 |
| `PLAT`   | Platform behaviour: input, screen, permissions, lifecycle            |      23 |
| `BRIDGE` | The FFI bridge: versioning, errors, threading                        |      16 |
| `REL`    | Release process: Alpha/Beta/Stable, gates, signing, store submission |      18 |
| `A11Y`   | Accessibility across all shells                                      |      10 |
| `PERF`   | Performance budgets per platform                                     |      12 |
|          | **Total**                                                            | **115** |

**Numbering rule.** `REQUIREMENTS.md` already owns `CORE-001 … CORE-012` (product principles). To keep every ID in the repository globally unique, the platform extension uses the range **101–199** inside every domain. `CORE-101` and `CORE-012` are different requirements; no ID is reused.

**Uniqueness check:** `grep -o '^### [A-Z0-9]*-[0-9]*' docs/spec/REQUIREMENTS-PLATFORM.md | sort | uniq -d` must return nothing.

### 0.3 Legend

| Marker       | Meaning                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------ |
| **Preset**   | Default behaviour of the target product; active and reachable for every user of that track |
| **Optional** | Exists in the target design, but not enabled by default or not selectable by the user      |
| **Later**    | Deliberately deferred; the code contains deliberately no usable path                       |

| Marker                     | Meaning                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Track**                  | The track(s) the requirement applies to — see §0.4                                                              |
| **Status: Planned**        | Not yet implemented. No acceptance is possible yet.                                                             |
| **Status: Existing (Web)** | Satisfied today by the web application at the repository root; cited so the extension does not silently drop it |
| **Status: Partial**        | Exists in the web application but does not yet satisfy the requirement on the target design                     |

### 0.4 Tracks

| Track | Platforms                             | Order | Notes                                                                                             |
| ----- | ------------------------------------- | ----: | ------------------------------------------------------------------------------------------------- |
| `T0`  | Web (browser)                         |     — | Stays; is **supplemented**, not replaced                                                          |
| `T1`  | Android — phone and tablet            |     1 |                                                                                                   |
| `T2`  | Google TV / Fire TV                   |     2 | Ten-foot UI, remote control                                                                       |
| `T3a` | macOS                                 |     3 |                                                                                                   |
| `T3b` | Linux                                 |     3 |                                                                                                   |
| `T4`  | iPadOS and iOS                        |     4 | Distribution gate open — see [`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md) |
| `T5`  | Windows and further operating systems |     5 |                                                                                                   |

The track identifiers are the identifiers of
[`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 3.1, so that the
specification and the release plan speak about the same tracks.

**Track order is binding.** A track may not begin its own Alpha work until the
preceding track has a **green release candidate**; the web track `T0` is a peer
and not a predecessor (**REL-101**).

### 0.5 Acceptance dimensions

Each requirement names the dimensions of the acceptance model in [`../../QUALITY.md`](../../QUALITY.md) that apply to it:

`Functional` · `Technical` · `Performance` · `Usability` · `Security/Privacy` · `Interoperability` · `Documentation`

A requirement may name a subset. The per-track acceptance matrices in §8 cover **all seven dimensions per track** and are the binding checklist for a track release.

### 0.6 Verification vocabulary

| Form             | Meaning                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `existing:`      | The test or command exists today in the repository and is named with its path                                                                                 |
| `to be written:` | The test does not exist yet. The **planned path and the planned test name** are given. This is an honest gap, not a fulfilled requirement.                    |
| `command:`       | A shell command whose output decides the acceptance                                                                                                           |
| `acceptance:`    | Decided by a human reviewer during the track acceptance, using the template in [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md) |

---

# 1. CORE — the shared Rust base

> The shared base is the single place where the rules of the product live. Every shell is a presentation layer on top of it. The behaviour rules themselves are specified in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md); this section specifies the **shape** of the base.

### CORE-101 — The game rules live once, in a shared Rust crate

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The round engine, the six mode implementations, the scoring rules, the win conditions and the turn order are implemented once in a Rust crate (`phomu-core`). No shell contains a second implementation of a game rule.
**Rationale:** Five new shells multiply every divergence in the rules by six. A rule that exists once can be tested once and cannot drift between platforms.
**Acceptance:** _(Functional, Technical)_ The crate exposes the six mode IDs `timeline`, `hint-master`, `lyrics`, `vibe-check`, `survivor`, `cover-confusion`; the shell sources of all tracks contain no mode-specific branching. The mode set matches `ALL_GAME_MODES` (`src/config/game-config.ts:300-307`).
**Verification:** `to be written:` `crates/phomu-core/tests/mode_registry.rs::every_mode_has_exactly_one_rule_implementation`; `command:` `scripts/check-no-duplicate-rules.mjs` (to be written) greps all shell source trees for the six mode identifiers outside the core crate and must report zero hits.

### CORE-102 — The core is a pure library with no user-interface dependency

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** `phomu-core` depends on no UI framework, no windowing toolkit and no platform SDK. Everything a platform provides is reached through a trait that the core defines and the shell implements.
**Rationale:** A core that pulls in a UI framework can no longer be compiled for a second platform without dragging that framework along. This is the same rule Vocument applies to its `DocumentCore` surface.
**Acceptance:** _(Technical)_ `cargo tree -p phomu-core` lists no UI, windowing or platform crate; the crate compiles for every target the release plan names.
**Verification:** `to be written:` `crates/phomu-core/tests/no_ui_dependencies.rs::core_depends_on_no_ui_crate`; `command:` `cargo tree -p phomu-core` reviewed in the acceptance.

### CORE-103 — The core owns a deterministic, versioned state model

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The complete game state is one serialisable structure with an explicit schema version field. The same seed and the same sequence of inputs produce a byte-identical state.
**Rationale:** The state is persisted on six platforms and rehydrated after a crash or a process restart. Without a version and without determinism, a saved session cannot be migrated and cannot be replayed.
**Acceptance:** _(Functional, Interoperability)_ The state carries a `schema_version`; two runs with the same seed and the same input sequence serialise to equal bytes; a state written by version _n_ is either readable by version _n+1_ or rejected with a typed error.
**Verification:** `to be written:` `crates/phomu-core/tests/determinism.rs::same_seed_and_inputs_produce_identical_state` and `::older_schema_version_is_migrated_or_rejected`.

### CORE-104 — Every game constant has exactly one home in the core

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** All numbers of the product — points, time limits, player capacity, rounds, thresholds — are declared once in the core configuration. Shells read them through the bridge and never redeclare them.
**Rationale:** The repository already enforces "one number, one place" for the web application (`src/config/game-config.ts`). The same rule has to hold across the language boundary, otherwise the first divergence is a wrong score on one platform.
**Acceptance:** _(Technical)_ The values currently in `PHOMU_CONFIG` (`src/config/game-config.ts:52-326`) exist once in the core and are readable through the bridge; no shell source file contains a numeric literal for a game rule.
**Verification:** `to be written:` `crates/phomu-core/tests/config.rs::config_exposes_the_game_constants`; `command:` `scripts/check-core-config.mjs` (to be written) must report zero numeric game-rule literals in `apps/**`.

### CORE-105 — The core owns the round phase automaton

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The transitions `drawing → question → reveal → scoring` and the conditions that trigger them are decided in the core, not in a shell. The declared phase `locked-in` keeps its current status (declared, entered by no flow) until the owner decides otherwise (**OPEN-08** in [`SRS.md`](SRS.md#12-open-points)).
**Rationale:** The phase automaton is the backbone of the game. `GAME-001` and `GAME-002` are behaviour requirements; where they live is a structural requirement of the extension.
**Acceptance:** _(Functional, Technical)_ The core exposes the transition table of [`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md) § 2.3; a shell can request a transition and can observe the result, but cannot decide one.
**Verification:** `to be written:` `crates/phomu-core/tests/phase_machine.rs::transition_table_matches_game_contract`; `command:` `grep -rn "advancePhase(" apps/` must report zero hits.

### CORE-106 — The core owns the anti-spoiler boundary

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The core exposes the current round to a shell only through a display view that omits title, artist, cover and year until the reveal is released. A shell cannot obtain the unrevealed identity through the bridge.
**Rationale:** `CORE-005` and `MEDIA-015` are product promises. In a six-shell world, "the shell forgets to hide it" is no longer a bug in one place but a spoiler leak on one platform.
**Acceptance:** _(Functional, Security/Privacy)_ Before the reveal, the serialised bridge payload contains no field that carries the song identity; a test asserts the absence rather than the presence.
**Verification:** `to be written:` `crates/phomu-core/tests/anti_spoiler.rs::display_view_omits_identity_before_reveal`; `command:` `scripts/check-bridge-payload.mjs` (to be written) inspects a captured payload.

### CORE-107 — The core owns scoring and the win conditions

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Points per mode, the time decay, the team attribution and the three ending conditions (`points`, `rounds`, `time`) are computed in the core. The values match `PHOMU_CONFIG.HINT_MASTER_POINTS` (`src/config/game-config.ts:310`) and `GAME-016 … GAME-040`.
**Rationale:** The scoring is the part of the product a group of friends argues about. It must not depend on the platform.
**Acceptance:** _(Functional)_ The core returns the same point value for the same round input on every track; scores are never negative (`GAME-006`).
**Verification:** `to be written:` `crates/phomu-core/tests/scoring.rs::points_per_mode_match_the_game_contract` and `::scores_never_go_below_zero`.

### CORE-108 — The core owns catalogue selection

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The pack, difficulty, mode and QR filters and the fallback chain are implemented once in the core. The current web implementation in `src/utils/song-picker.ts:36-70` is the reference behaviour.
**Rationale:** `GAME-043 … GAME-045` and `LOBBY-017` are product rules. `GAP-003` in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) records that they are untested; the core is the place to fix that once.
**Acceptance:** _(Functional, Technical)_ For the same catalogue, seed and filters the core returns the same song as the reference implementation; the silent fallback to the full pool is either kept deliberately or replaced by an explicit error (**OPEN-07**).
**Verification:** `to be written:` `crates/phomu-core/tests/song_picker.rs::pack_filter_selects_only_matching_songs` and `::mode_filter_fallback_is_explicit`.

### CORE-109 — The core owns hint censorship

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The runtime censorship of hints against title and artist (`src/utils/censor-utils.ts:11-59`, `CAT-012`) is implemented in the core and applied before a hint reaches any shell.
**Rationale:** A hint that names the song destroys the round. Doing the censorship in the core makes it impossible for a shell to forget it.
**Acceptance:** _(Functional)_ A hint containing a token of four characters or more from title or artist is replaced with `[XXX]`; the ignore list is honoured.
**Verification:** `to be written:` `crates/phomu-core/tests/censor.rs::hint_containing_the_artist_is_censored`.

### CORE-110 — The core owns the catalogue data model and its validation

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The catalogue is one versioned data artefact with a schema that the core validates. The web gate `npm run validate-catalog` (`src/utils/validate-song-catalog.ts`) and the core validator must agree on the verdict for the same data set.
**Rationale:** Six shells ship the same catalogue. If the validators disagree, one platform accepts songs another platform cannot play.
**Acceptance:** _(Functional, Interoperability)_ Both validators report the same number of schema errors, duplicate groups and missing years for the same artefact; the artefact carries a schema version.
**Verification:** `existing:` `npm run validate-catalog`; `to be written:` `crates/phomu-core/tests/catalogue.rs::core_and_web_validator_agree_on_the_same_artefact`.

### CORE-111 — Errors are typed and exhaustive across the whole core

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every fallible core operation returns a typed error. The core does not panic on a recoverable condition, and no error is transported as a free-text string that a shell has to parse.
**Rationale:** The web application already made this step for the admin API with `AdminRequestError` (`SEC-018`). A bridge over six platforms needs it more.
**Acceptance:** _(Technical, Security/Privacy)_ The core exposes a closed error enum; `unwrap`/`expect`/indexing that can panic are denied by lint in the core crate; every error carries a stable code, not a message that a shell parses.
**Verification:** `to be written:` `crates/phomu-core/tests/error_contract.rs::every_public_error_is_a_typed_variant`; `command:` `cargo clippy -p phomu-core -- -D unwrap_used -D expect_used -D indexing_slicing`.

### CORE-112 — The core performs no network I/O

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** `phomu-core` opens no socket and performs no HTTP request. Media playback, provider access and the user-triggered report stay in the shell or in the media layer.
**Rationale:** `CORE-003` promises local-first operation and `CORE-011` promises no telemetry. A network-capable core would make both promises unverifiable per platform.
**Acceptance:** _(Technical, Security/Privacy)_ No HTTP or socket crate is in the dependency tree of the core; the core's public API offers no I/O entry point.
**Verification:** `command:` `cargo tree -p phomu-core | grep -Ei "reqwest|ureq|hyper|tokio-tungstenite"` must produce no output; `to be written:` `crates/phomu-core/tests/error_contract.rs::core_api_exposes_no_io_entry_point`.

### CORE-113 — Randomness is seeded and reproducible

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The mode rotation (`GAME-041`), the song draw (`GAME-043`) and the team shuffle (`LOBBY-007`) use a seeded generator whose seed is part of the persisted state. A replay of the same seed reproduces the same sequence.
**Rationale:** Without a seed, an acceptance run cannot be reproduced and a bug report cannot be replayed.
**Acceptance:** _(Functional, Technical)_ The seed is stored in the state; two cores with the same seed and the same catalogue produce the same draw sequence.
**Verification:** `to be written:` `crates/phomu-core/tests/randomness.rs::seeded_draw_is_reproducible`.

### CORE-114 — The public surface of the core contains no platform-specific function

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The exported function set of the core is the same for every platform. A platform difference is expressed by selecting a different implementation of a core trait, never by adding an exported function.
**Rationale:** A core that grows a platform-specific export per track becomes five cores that only look alike. Vocument applies the same rule to its `DocumentCore` surface.
**Acceptance:** _(Technical)_ The public API list is stored as a committed baseline file; a check fails when the list grows.
**Verification:** `to be written:` `command:` `scripts/check-core-api-surface.sh` compares `cargo public-api`-style output against `crates/phomu-core/api-surface.txt`.

### CORE-115 — The core contains no telemetry and no crash reporting

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** No analytics, crash-reporting or metrics-export crate is part of the core or of any shell. No code path transmits usage data on its own.
**Rationale:** `CORE-011` is an explicit product promise, and it is repeated for every native shell because the distribution channels of the stores make "we send nothing" a claim that must be provable in the binary.
**Acceptance:** _(Security/Privacy, Technical)_ The dependency tree of core and shells contains no telemetry crate; the shipped binary contains no telemetry endpoint string.
**Verification:** `command:` `grep -Ei "analytics|sentry|posthog|telemetry|mixpanel" crates/*/Cargo.toml apps/*/Cargo.toml` must be empty; `to be written:` `scripts/check-no-telemetry.sh` inspects the built artefact.

### CORE-116 — The core carries the AGPL-3.0-or-later licence

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** `phomu-core` and the bridge are licensed AGPL-3.0-or-later, the licence text travels with the source and the artefacts, and every shell that links the core is AGPL-3.0-or-later as well. If the owner ratifies the _Phomu App Store Exception_ proposed in [`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md), it is added as a AGPL-3.0 §7 additional permission **on top of** AGPL-3.0-or-later — the licence is not changed, relaxed or dual-licensed.
**Rationale:** The whole product is AGPL-3.0-or-later (`CORE-002`, `LICENSE`, `package.json`). A native shell that links the core must not weaken that. The exception is a narrow, additional permission for the app-store channels, not a different licence.
**Acceptance:** _(Documentation, Technical)_ `Cargo.toml` declares `license = "AGPL-3.0-or-later"`; `LICENSE` is present in the crate; the store metadata of every track declares the same licence; if the exception is ratified, its text and its scope are shipped with the artefact.
**Verification:** `command:` `cargo metadata --format-version 1 | jq '.packages[] | select(.name=="phomu-core") | .license'`; `to be written:` `scripts/check-license-metadata.sh` checks the store listings.

---

# 2. SHELL — the frontends

> A shell renders what the core decides. The shells of the tracks are: Web (existing), Android, TV, Desktop (macOS/Linux), iOS/iPadOS, Windows.

### SHELL-101 — Every track has exactly one shell; the shell is a presentation layer

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Each track has one application shell that renders state, forwards user input to the core and displays the result. The shell contains no rule of the game.
**Rationale:** One shell per track avoids a "TV edition" and a "desktop edition" of every feature and keeps the feature set identical.
**Acceptance:** _(Technical)_ The dependency check of `CORE-101`/`SHELL-114` reports zero rule implementations outside the core.
**Verification:** `command:` `scripts/check-no-duplicate-rules.mjs` (to be written) must exit 0.

### SHELL-102 — The web application stays and is extended, not replaced

**Preset:** Preset · **Track:** T0 · **Status:** Existing (Web)
**Requirement:** The Next.js application at the repository root remains the web shell. It is supplemented by the shared core where that is possible without losing the static export; it is not removed and not forked into a second implementation.
**Rationale:** The web application is the only shell that is already released and tested. A rewrite would destroy working behaviour and the recorded acceptance (`docs/acceptance/M0-ACCEPTANCE.md`).
**Acceptance:** _(Functional, Documentation)_ The routes `/`, `/lobby`, `/game`, `/game-over`, `/browse`, `/projector`, `/settings/**`, `/guide`, `/privacy`, `/terms`, `/admin/**` remain reachable; `npm run build` still produces the static export.
**Verification:** `existing:` `npm run build`; `existing:` `npx @playwright/test test e2e/smoke.spec.ts`.

### SHELL-103 — The Android shell is a Kotlin/Compose application on the shared core

**Preset:** Preset · **Track:** T1 · **Status:** Planned
**Requirement:** The Android phone and tablet shell is built with Kotlin and Jetpack Compose, links the core through the bridge and ships as an Android App Bundle. It covers phone and tablet form factors in one application.
**Rationale:** Android is track 1. One application for phone and tablet keeps one release artefact and one acceptance.
**Acceptance:** _(Functional, Technical)_ The application starts, completes the lobby wizard and plays one full round using the core; the build produces an `.aab` for the declared minimum API level.
**Verification:** `to be written:` `apps/android/app/src/test/kotlin/de/phomu/RoundJourneyTest.kt::completes_one_round`; `command:` `gradle :app:assembleRelease` (to be written) plus the acceptance run on a physical device.

### SHELL-104 — The TV shell is a ten-foot application on the shared core

**Preset:** Preset · **Track:** T2 · **Status:** Planned
**Requirement:** The Google TV / Fire TV shell is built with Kotlin and Compose, is fully operable with a remote control or D-pad, and renders the projector surface of the game. It links the same core as the Android shell.
**Rationale:** A ten-foot UI has different rules from a touch UI: no hover, no right-click, focus instead of pointer, and a much larger viewing distance.
**Acceptance:** _(Functional, Usability)_ Every action of the core journey is reachable with a D-pad alone; the projector view shows mode, round, phase, score and progress but never title, artist, cover or year (`UI-006`).
**Verification:** `to be written:` `apps/tv/app/src/test/kotlin/de/phomu/tv/RemoteNavigationTest.kt::completes_one_round_with_dpad_only`; `acceptance:` documented remote-control walkthrough in the track acceptance document.

### SHELL-105 — The desktop shell covers macOS and Linux from one source tree

**Preset:** Preset · **Track:** T3a, T3b · **Status:** Planned
**Requirement:** The desktop shell runs on macOS and on Linux from one source tree and one artefact per platform. The shell links the core through the bridge.
**Rationale:** Two platforms with one shell is cheaper than two shells and keeps the track small enough for a single release cycle.
**Acceptance:** _(Technical, Interoperability)_ The same source tree produces a macOS artefact and a Linux artefact; both pass the core journey test.
**Verification:** `to be written:` `apps/desktop/tests/core_journey.rs::completes_one_round`; `command:` the build commands named in `docs/design/BUILD-CONTRACT.md`.

### SHELL-106 — The iPadOS and iOS shell is a Swift/SwiftUI application on the shared core

**Preset:** Preset · **Track:** T4 · **Status:** Planned
**Requirement:** The iPadOS and iOS shell is built with Swift and SwiftUI, links the core through the bridge and ships through the App Store. The distribution question is open and is not decided here (**OPEN-01** in [`SRS.md`](SRS.md#12-open-points)).
**Rationale:** The track exists; what it may not do is ship until the licensing question is answered.
**Acceptance:** _(Functional, Technical)_ The application completes the core journey on iPad and on iPhone; the licence and distribution preconditions named in [`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md) — a draft decision basis, not yet a ratified decision — are met before submission.
**Verification:** `to be written:` `apps/ios/PhomuTests/CoreJourneyTests.swift::completesOneRound`; `acceptance:` store-submission record.

### SHELL-107 — The Windows shell is a separate deliverable of track 5

**Preset:** Preset · **Track:** T5 · **Status:** Planned
**Requirement:** The Windows shell links the same core through the bridge, is distributed as an installer and is the first place where a new operating system may be added.
**Rationale:** Track 5 is "Windows and further operating systems"; the shell has to be extensible without becoming a fork.
**Acceptance:** _(Technical, Interoperability)_ The Windows shell passes the core journey test and consumes the same catalogue artefact as the other tracks.
**Verification:** `to be written:` `apps/windows/tests/core_journey.rs::completes_one_round`.

### SHELL-108 — All shells offer the same six game modes

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every shell offers all six modes with the same questions, the same hints, the same point values and the same reveal. No mode is missing on a track and no mode exists only on a track.
**Rationale:** `CORE-006` is a product promise. A mode that only exists on the TV is a fork of the product.
**Acceptance:** _(Functional)_ The mode list rendered by every shell equals the list the core reports; a parity test compares the rendered mode list against the core list for every shell.
**Verification:** `to be written:` `crates/phomu-core/tests/mode_registry.rs::shell_mode_lists_match_the_core`; `acceptance:` mode list screenshot per shell in the track acceptance document.

### SHELL-109 — All shells use the same design tokens and the same four themes

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The four themes `jackbox`, `spotify`, `youtube`, `musicwall` and their tokens (`UI-001`) are defined once and rendered identically in every shell.
**Rationale:** The theme is part of the product's character. A native shell with its own colours is a different product.
**Acceptance:** _(Technical, Usability)_ The token set is exported from the core or from a shared token artefact; each shell maps the same token names to the same values.
**Verification:** `to be written:` `scripts/check-design-tokens.mjs` (to be written) compares the token tables of all shells.

### SHELL-110 — All shells support German and English

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every shell ships German as the primary language and English as a complete second language, with the same key set, the same interpolation rules and the same fallback (`I18N-001` … `I18N-005`).
**Rationale:** `CORE-008` is a product promise. A native shell with English-only strings would be a half-translated product.
**Acceptance:** _(Functional, Documentation)_ The translation resources of the shells have the same key set as `src/i18n/locales/de.json` and `en.json`; no visible string is hard-coded in a shell.
**Verification:** `existing:` `npm run check:i18n` for the web shell; `to be written:` `scripts/check-i18n-parity.mjs` (to be written) compares the key sets of all shells.

### SHELL-111 — All shells persist the session and restore it after a restart

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The lobby, the players, the teams, the configuration, the score, the XP and the round progress survive a restart of the application, exactly as `LOBBY-021` requires for the web application. The rehydrated session is identical on every track.
**Rationale:** A party game interrupted by a phone call must not lose the party. This is the one behaviour a player notices immediately if it breaks.
**Acceptance:** _(Functional, Interoperability)_ After a forced termination and a restart, the session continues with the same players, the same scores and the same round; the persisted field set matches the web `partialize` list (`src/stores/game-store.ts:621-637`).
**Verification:** `to be written:` `crates/phomu-core/tests/persistence.rs::session_survives_a_restart`; per-shell test in the shell's own test suite (path to be fixed by `docs/design/PLATFORM-ARCHITECTURE.md`).

### SHELL-112 — All shells offer the same lobby wizard

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The six-step lobby assistant (`LOBBY-001`) exists in every shell with the same steps, the same validation and the same presets.
**Rationale:** The lobby is the entry point of every session. A shell with a shorter lobby is a shell with a different product.
**Acceptance:** _(Functional)_ Step 1 requires at least one player (`LOBBY-002`); the upper limit is 24 players (`LOBBY-003`); at least one pack is always selected (`LOBBY-016`).
**Verification:** `to be written:` `crates/phomu-core/tests/lobby.rs::lobby_validation_matches_the_contract`; `acceptance:` walkthrough per shell.

### SHELL-113 — All shells offer the same settings areas

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The five settings areas of the web application (`UI-017`) exist in every shell: players & profile, audio & provider, governance, legal & account, game help.
**Rationale:** Settings that exist only on the web make the product look unfinished on a phone.
**Acceptance:** _(Functional)_ The five areas are reachable in every shell; the settings that change a running game take effect from the next round (`UI-018`).
**Verification:** `to be written:` `crates/phomu-core/tests/settings.rs::settings_change_applies_from_the_next_round`; `acceptance:` settings walkthrough per shell.

### SHELL-114 — No shell contains a business rule

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The shell contains no scoring, no mode logic, no selection logic and no validation of game data. The dependency direction is: shell → bridge → core. A shell never imports a second copy of a rule.
**Rationale:** This is the architectural enforcement of `CORE-101`; without an automated check it decays at the first deadline.
**Acceptance:** _(Technical)_ The rule-duplication check of `CORE-101` is part of the CI pipeline for every track.
**Verification:** `command:` `scripts/check-no-duplicate-rules.mjs` (to be written) in `.github/workflows/ci.yml`.

### SHELL-115 — All shells consume the same catalogue artefact

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** There is exactly one catalogue artefact per release, produced by the core toolchain. No shell carries a hand-maintained copy, no shell parses catalogue JSON at runtime, and no shell downloads a catalogue at start-up without a user-visible action.
**Rationale:** The catalogue is the largest asset of the product. Six copies would drift; a silent download would break the offline promise (`CORE-003`).
**Acceptance:** _(Technical, Interoperability)_ The artefact carries a content hash; every shell verifies the hash before use; the artefact is produced by one command named in `docs/design/BUILD-CONTRACT.md`.
**Verification:** `to be written:` `crates/phomu-core/tests/catalogue.rs::artefact_hash_is_verified_on_load`.

### SHELL-116 — Every shell ships an offline-capable catalogue snapshot

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** A fresh installation can reach the lobby and start a round without any network access, using the catalogue snapshot shipped with the application.
**Rationale:** The product is played in bars, on campsites and in cellars. A network-dependent first start would break the core use case.
**Acceptance:** _(Functional)_ With the network disabled, a fresh installation reaches the lobby, draws a card and starts a round.
**Verification:** `to be written:` `crates/phomu-core/tests/catalogue.rs::bundled_snapshot_needs_no_network`; `acceptance:` offline run documented per shell in the track acceptance document.

### SHELL-117 — Every shell that can show a second screen offers the projector surface

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every shell offers the spoiler-free projector view of `UI-006` — mode, round, phase, score, active player and progress — and never the identity of the current song.
**Rationale:** The projector is a feature of the product, not of the web. On the TV track it is the primary use case.
**Acceptance:** _(Functional, Security/Privacy)_ The projector view shows no title, artist, cover or year before the reveal; the check is a negative assertion on the rendered output.
**Verification:** `to be written:` `crates/phomu-core/tests/anti_spoiler.rs::projector_view_is_spoiler_free`; `acceptance:` projector screenshot per shell in the track acceptance document.

### SHELL-118 — Every shell offers an exit from every state

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** From every screen there is a visible way back: cancel, back, leave game. Leaving a running game asks for confirmation (`LOBBY-023`).
**Rationale:** A dead end in a party app is the worst kind of bug: it happens in front of other people.
**Acceptance:** _(Usability)_ No screen is without a documented exit; the confirmation before leaving a running game exists on every track.
**Verification:** `acceptance:` dead-end walkthrough per shell, recorded in the track acceptance document.

### SHELL-119 — All shells present the same error vocabulary

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Errors that reach the user are rendered from a shared catalogue of error codes with the same wording on every track. A shell never invents its own error text.
**Rationale:** Six shells with six wordings for "the token is missing" is six support cases instead of one.
**Acceptance:** _(Functional, Documentation)_ The error catalogue is part of the shared resources; a shell renders an error only from a known code.
**Verification:** `to be written:` `scripts/check-i18n-parity.mjs` (to be written) verifies that every error code exists in every shell's resources.

### SHELL-120 — Every shell has an automated UI test suite

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every shell has at least a smoke test (the application starts, the lobby opens) and a core journey test (lobby → round → reveal → end) executed in CI.
**Rationale:** The web application currently has a smoke test that checks URLs only (`NFR-012`, `NFR-013`, `GAP-021`). The new shells must not repeat that mistake.
**Acceptance:** _(Technical)_ The CI matrix of `REL-114` runs the shell test suites; a failing shell test fails the build.
**Verification:** `to be written:` per-shell journey test, path per shell; `command:` the CI job named in `docs/design/BUILD-CONTRACT.md`.

---

# 3. PLAT — platform behaviour

> Platform behaviour is everything that differs between a phone, a television, a desktop and a tablet. Each requirement names the track it constrains.

### PLAT-101 — The input model of every track is declared before implementation

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every track declares its input devices in the track acceptance document: touch, pointer, hardware keyboard, remote/D-pad, gamepad. A control that is not part of the declared input model must not be required to complete a game.
**Rationale:** The most expensive defect in a multi-platform product is a feature that only works with a mouse.
**Acceptance:** _(Usability, Documentation)_ The input model of every track is listed in the track acceptance document before the Alpha gate of that track.
**Verification:** `acceptance:` the input table in the track acceptance document (`docs/acceptance/`).

### PLAT-102 — Touch targets on touch tracks are at least 44 px

**Preset:** Preset · **Track:** T1, T4 · **Status:** Existing (Web)
**Requirement:** Interactive elements on phone and tablet are at least 44 px high or wide, as `UI-011` already requires for the web application.
**Rationale:** Below 44 px the hit area becomes unreliable in exactly the situation Phomu is played in — with people passing a phone around.
**Acceptance:** _(Usability)_ Every interactive element in the Android and iOS shells meets the minimum.
**Verification:** `existing:` `grep -rn "min-h-\[44px\]" src/components/` for the web shell; `to be written:` an equivalent measurement in the native shell test suites.

### PLAT-103 — The TV shell is fully operable with a remote control

**Preset:** Preset · **Track:** T2 · **Status:** Planned
**Requirement:** Every action of the TV shell — start, lobby, mode selection, answering, reveal, end — is reachable with a D-pad and the remote's buttons alone. No action requires a touch screen, a mouse or a pointer.
**Rationale:** A ten-foot device is used from a couch. The TV shell is the track where this is decisive.
**Acceptance:** _(Usability, Functional)_ The focus order is linear and visible; every screen has a reachable default action; the journey test is executed with the remote only.
**Verification:** `to be written:` `apps/tv/app/src/test/kotlin/de/phomu/tv/RemoteNavigationTest.kt::core_journey_without_touch`.

### PLAT-104 — The desktop shell is fully operable with the keyboard

**Preset:** Preset · **Track:** T3a, T3b, T5 · **Status:** Planned
**Requirement:** The desktop shells are fully operable with the keyboard. The Timeline mode keeps its keyboard control (`UI-013`); every other interactive element is reachable with `Tab` and operable with `Enter`/`Space`.
**Rationale:** On a laptop the game is played without a mouse half of the time, and a second player at the same keyboard needs the same access.
**Acceptance:** _(Usability, Accessibility)_ No interactive element is reachable by pointer only; the visible focus ring is present in every theme.
**Verification:** `to be written:` `apps/desktop/tests/keyboard_journey.rs::core_journey_with_keyboard_only`; `existing:` `grep -n "focus-visible" src/app/globals.css` for the web shell.

### PLAT-105 — The idle and sleep behaviour of every track is defined

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Each track defines what happens when the screen would go to sleep during a round: on the pilot device the screen must stay on, on a second screen (TV, projector) the behaviour is defined per track. The definition is written into the track acceptance document.
**Rationale:** A screen that dims in the middle of a round interrupts the group. On a TV, a sleeping screen is the normal case and must not be treated as an error; the sleep policy is platform policy, not product behaviour.
**Acceptance:** _(Functional, Usability)_ The pilot device keeps the screen awake for the duration of a round; the policy is implemented, not only documented.
**Verification:** `to be written:` `crates/phomu-core/tests/platform.rs::keep_awake_is_requested_during_a_round` is not applicable — the behaviour is in the shell: `to be written:` per-shell test named in the track acceptance document.

### PLAT-106 — The screen is woken when a round is active

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Returning to the application during a running round brings the user back into the running round, not to a start screen. The state is rehydrated from the persisted session (`SHELL-111`).
**Rationale:** A phone that was locked during the round must not cost the group its place.
**Acceptance:** _(Functional)_ After a lock/unlock cycle or an app switch during a round, the round continues with the same players and scores.
**Verification:** `to be written:` per-shell lifecycle test; the core part is covered by `crates/phomu-core/tests/persistence.rs::session_survives_a_restart`.

### PLAT-107 — Permissions are requested just in time and explained

**Preset:** Preset · **Track:** T1, T2, T4 · **Status:** Planned
**Requirement:** A permission is requested at the moment the feature that needs it is used, with a short explanation of what it is used for. A refusal leaves the rest of the product fully usable.
**Rationale:** Store review and user trust both reward the same behaviour; a refusal must not break the game.
**Acceptance:** _(Usability, Security/Privacy)_ The camera is requested only for the QR scan (`PLAT-108`); a refusal produces a named message and a usable alternative.
**Verification:** `to be written:` `apps/android/app/src/test/kotlin/de/phomu/PermissionRequestTest.kt::camera_is_requested_only_in_the_scanner`; `acceptance:` refusal walkthrough per shell.

### PLAT-108 — The camera is only needed for the QR scan

**Preset:** Preset · **Track:** T1, T4 · **Status:** Planned
**Requirement:** The camera permission is requested only when the user opens the QR scanner in the lobby. The game itself works without any camera permission.
**Rationale:** The camera is the most intrusive permission the app can ask for. The web application already limits it to the scanner (`next.config.ts`, `Permissions-Policy: camera=(self)`).
**Acceptance:** _(Security/Privacy, Functional)_ A fresh installation without any granted permission reaches the lobby and plays a round; the QR scanner is the only feature that asks for the camera.
**Verification:** `existing:` `grep -n "Permissions-Policy" next.config.ts` for the web shell; `to be written:` per-shell permission test.

### PLAT-109 — No further platform permission is required for the core game

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The core game requires no microphone, no location, no contacts, no photo library and no account. The permission list of every track contains the camera (QR scan) and, if the platform demands it, the network state — nothing else.
**Rationale:** `CORE-002` promises freedom from forced accounts and `CORE-003` promises data minimisation. A permission list is the artefact in which that promise becomes checkable.
**Acceptance:** _(Security/Privacy)_ The declared permission list of every track is listed in the track acceptance document and contains no entry beyond the camera and the network state.
**Verification:** `acceptance:` the permission list in the track acceptance document; `to be written:` `scripts/check-permission-manifest.sh` (to be written) inspects the Android manifest and the iOS `Info.plist`.

### PLAT-110 — Data is written to app-scoped storage only

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The session, the settings and the catalogue cache are written into the application's own storage area. No data is written to a shared or global location, and no external document is written without an explicit user action.
**Rationale:** The web application keeps everything in `localStorage` (`CORE-003`). The native equivalent is app-scoped storage; the guarantee must not be weaker.
**Acceptance:** _(Security/Privacy)_ The storage locations are named in the track acceptance document; the catalogue artefact is read-only at runtime; the session is written only through the core.
**Verification:** `to be written:` `scripts/check-permission-manifest.sh` (to be written) plus `acceptance:` the storage table in the track acceptance document.

### PLAT-111 — The storage budget of every track is defined and respected

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every track defines a budget for the catalogue cache, the session state and the caches, and reports the measured consumption against it.
**Rationale:** The catalogue with covers is the largest data set in the product. On a phone with little free space an unbounded cache is a support case.
**Acceptance:** _(Performance)_ The budget and the measurement method are named in the track acceptance document; the measured value is reported with the release.
**Verification:** `acceptance:` the storage measurement in the track acceptance document; the budget itself is `PERF-105`.

### PLAT-112 — Backgrounding suspends the timer and does not lose the round

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** When the application moves into the background, running timers are suspended and resumed without losing elapsed state; the round continues when the application returns.
**Rationale:** A round timer that keeps running in the background punishes the player who answered a call.
**Acceptance:** _(Functional)_ The round timer reflects the time the application was in the foreground.
**Verification:** `to be written:` per-shell lifecycle test; the timing rules themselves are covered by `crates/phomu-core/tests/phase_machine.rs`.

### PLAT-113 — Process death and restoration are handled

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** If the operating system kills the application, the next start restores the session from the persisted state, including the current round and the current score.
**Rationale:** Memory pressure kills mobile applications without warning. The session is the only thing that must not be lost.
**Acceptance:** _(Functional, Interoperability)_ After a forced stop and a restart, the session is identical to the state before the stop.
**Verification:** `to be written:` `crates/phomu-core/tests/persistence.rs::session_survives_a_restart` for the core part; per-shell lifecycle test for the platform part.

### PLAT-114 — The layout survives resizing and orientation change

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The layout adapts to a change of orientation or window size without losing game state and without hiding a control. The minimum supported width is declared per track.
**Rationale:** A tablet is turned, a desktop window is dragged, a phone is folded. A control that disappears is a lost round.
**Acceptance:** _(Usability, Functional)_ The declared minimum width is tested; no control is unreachable at that width.
**Verification:** `to be written:` per-shell layout test at the declared minimum width; `acceptance:` the minimum width table in the track acceptance document.

### PLAT-115 — Deep links open the application in the correct role

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** A link of the form `?pack=<id>` opens the lobby with the pack selected; a link with an unknown pack is rejected with a named message; the format is identical to the format the printed cards carry (`LOBBY-018`, `LOBBY-019`).
**Rationale:** The printed cards are the physical half of the product. The QR content on the card must open the same thing in every shell.
**Acceptance:** _(Interoperability, Functional)_ The pack key from `PHOMU_CONFIG.SONG_PACKS` is accepted; an unknown key is refused with the message defined in the web shell; the legacy `id=` form remains explicitly unsupported.
**Verification:** `existing:` `npm run test -- qr-intent` for the web shell; `to be written:` `crates/phomu-core/tests/qr_intent.rs::pack_intent_is_accepted_and_unknown_packs_are_rejected`.

### PLAT-116 — QR scanning works on every track with a camera

**Preset:** Preset · **Track:** T1, T4 · **Status:** Planned
**Requirement:** On a track with a camera, the lobby can scan a card QR and apply the intent, with the same three intent types as the web shell (`LOBBY-018`).
**Rationale:** The physical card is the product's medium. Without the scanner the native shell is a worse web page.
**Acceptance:** _(Functional, Usability)_ A scan of a valid pack QR selects the pack; an invalid scan produces a named message and no state change.
**Verification:** `to be written:` `apps/android/app/src/test/kotlin/de/phomu/QrScannerTest.kt::scan_applies_the_pack_intent`; `acceptance:` scan walkthrough with a printed test card.

### PLAT-117 — Card production does not depend on any shell

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The card format (`CARD_WIDTH_MM: 59`, `CARD_HEIGHT_MM: 91`, `CARD_BLEED_MM: 3`, `MAX_CARDS_PER_SET: 110`, `src/config/game-config.ts:322-325`) and the QR content format are documented in the repository and are produced by a documented procedure, independently of any application shell.
**Rationale:** The cards are a physical product with a long lifetime. They must not depend on the build of a particular shell.
**Acceptance:** _(Documentation, Interoperability)_ The format is documented in [`../guides/PRINTING-GUIDE.md`](../guides/PRINTING-GUIDE.md) and the QR intents are defined in the core; a printed card works with every shell.
**Verification:** `existing:` `grep -n "CARD_" src/config/game-config.ts`; `acceptance:` a printed test card is scanned by each shell in the track acceptance document.

### PLAT-118 — The network policy of every track is the same as on the web

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** A shell makes no outbound request other than media provider playback and the user-triggered missing-link report (`MEDIA-013`, `MEDIA-014`, `SEC-012`). No analytics, no crash reporting, no advertising, no account check.
**Rationale:** `CORE-011` and `PRIVACY.md` make a promise that has to be repeated — and provable — for every distribution channel.
**Acceptance:** _(Security/Privacy, Interoperability)_ A network capture of a full game session contains only the provider traffic and, if used, the report request.
**Verification:** `to be written:` `scripts/check-no-telemetry.sh` (to be written); `acceptance:` the network capture in the track acceptance document.

### PLAT-119 — Assistive technology is supported on every track

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every shell exposes accessible names, roles and states for the interactive elements and works with the platform screen reader (TalkBack, VoiceOver, or the platform equivalent).
**Rationale:** The audience includes groups with players who cannot read the small text of a TV from a distance or cannot distinguish colours.
**Acceptance:** _(Usability, Interoperability)_ The screen reader can announce the mode, the score, the round and every answer option; the check is documented in the track acceptance document.
**Verification:** `acceptance:` the screen-reader walkthrough in the track acceptance document; see `A11Y-105`.

### PLAT-120 — The system font scale and the display scale are honoured

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The shell honours the platform's font size and display size settings. At the largest supported scale no control is clipped and no text overlaps.
**Rationale:** A player with a large font setting must be able to use the app.
**Acceptance:** _(Usability)_ The largest supported scale is tested per shell and documented in the track acceptance document.
**Verification:** `acceptance:` the scaling walkthrough in the track acceptance document.

### PLAT-121 — The platform appearance (light/dark) is offered

**Preset:** Optional · **Track:** T1, T2, T3a, T3b, T4, T5 · **Status:** Planned
**Requirement:** Each shell offers the system appearance as an additional option next to the four product themes (`UI-001`). The product themes remain selectable.
**Rationale:** On a native device the system appearance is an expectation. It must not replace the product's identity.
**Acceptance:** _(Usability, Technical)_ The system appearance maps onto the existing token set; it does not introduce a fifth product theme.
**Verification:** `to be written:` `scripts/check-design-tokens.mjs` (to be written) verifies that the system appearance uses the same token names.

### PLAT-122 — The platform back/close semantics are respected

**Preset:** Preset · **Track:** T1, T2, T4 · **Status:** Planned
**Requirement:** The system back gesture or button navigates back in the shell's navigation model and never triggers a destructive action without confirmation.
**Rationale:** On Android and iOS the back gesture is the most-used control; a shell that ignores it feels broken.
**Acceptance:** _(Usability, Functional)_ Back from the game asks for confirmation (`LOBBY-023`); back from a subpage returns to the parent page.
**Verification:** `to be written:` `apps/android/app/src/test/kotlin/de/phomu/BackNavigationTest.kt::back_from_game_asks_for_confirmation`.

### PLAT-123 — The multi-device session stays deferred

**Preset:** Later · **Track:** All · **Status:** Planned
**Requirement:** The multi-device session — session code, state synchronisation between two devices, spectator mode and elimination — remains **deferred** in this programme and is not implemented by any shell. `deviceMode` stays `pass-the-phone` (`src/types/game-state.ts:21-27`, `src/stores/game-store.ts:45`). The second surface on a native track is therefore not a synchronised second device; how it receives the state is the open point **OPEN-03**.
**Rationale:** The types exist but no flow ever sets them (`LOBBY-020`, `GAP-016` in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)). Implementing them inside this programme would add a local-network data flow, a privacy entry, an attack surface and a second protocol — without a decision on how the second surface is fed. Deferring it explicitly is better than leaving it implied: a shell that offers a session code would promise something the core does not do.
**Acceptance:** _(Functional, Security/Privacy)_ No shell offers a session code, a spectator mode or an elimination; the core exposes no synchronisation entry point; the deferral is visible in the acceptance document of every track instead of being silently assumed.
**Verification:** `existing:` `grep -rn "deviceMode" src/stores/game-store.ts` shows the fixed value `pass-the-phone` in the web shell; `to be written:` `crates/phomu-core/tests/session.rs::multi_device_mode_is_not_reachable`.

---

# 4. BRIDGE — the FFI bridge

> The bridge is the only technical contact between the shells and the core. It is a UniFFI surface; it is versioned; it is the place where a spoiler could leak and therefore the place where the anti-spoiler boundary is enforced (`CORE-106`).

### BRIDGE-101 — The bridge is a UniFFI surface and the only FFI surface

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The core is exposed to the shells through UniFFI. No shell uses a second FFI mechanism — no hand-written `extern "C"` layer, no JNI layer beside the generated one, no Objective-C shim beside the generated Swift bindings.
**Rationale:** One mechanism means one error model, one threading model and one version contract.
**Acceptance:** _(Technical)_ The generated bindings are the only foreign-function declarations in the repository; `scripts/check-ffi-surface.mjs` (to be written) finds no second declaration.
**Verification:** `command:` `scripts/check-ffi-surface.mjs` (to be written) must exit 0.

### BRIDGE-102 — The bridge exposes a versioned API contract

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The bridge publishes an **ABI version** of its own, independent of the app version, in the form of the release plan § 5.3 defines it: `BRIDGE_ABI_MAJOR` (the compatibility level) and `BRIDGE_ABI_MINOR` (the feature level). Both are exported by the core and are queryable at runtime; the generated bindings carry the surface checksum that UniFFI computes.
**Rationale:** A shell and a core built at different times must be able to tell that they do not match — and must be able to tell _how_ they do not match.
**Acceptance:** _(Technical, Interoperability)_ The core exports both ABI integers; the shell can read them before it starts a game; the generated bindings carry the checksum.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 5.3; `to be written:` `crates/phomu-bridge/tests/api_version.rs::bindings_carry_the_api_version`.

### BRIDGE-103 — A version mismatch fails closed

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The version check has two levels, exactly as the release plan § 5.3 defines them. The **hard guard** is the checksum UniFFI computes over the API surface: bindings whose checksum does not match the library do not load at all. The **soft guard** is the ABI integers: a differing major stops the shell with a named error; a core that is older than the shell expects is refused; a core that is newer hides the features that the shell does not know instead of offering a broken button.
**Rationale:** A silent mismatch produces wrong behaviour in the middle of a round. A loud failure at start-up is recoverable, and a feature-level difference must not be fatal.
**Acceptance:** _(Functional, Security/Privacy)_ The mismatch path is exercised by a test that builds against a deliberately different version; the capability list hides the unavailable entries.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 5.3; `to be written:` `crates/phomu-bridge/tests/api_version.rs::mismatched_version_refuses_to_start`.

### BRIDGE-104 — Errors cross the bridge as typed codes

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every error that crosses the bridge is a typed variant with a stable code and a localised message key. No error crosses as an untyped string and no panic crosses the boundary.
**Rationale:** `CORE-111` extends to the boundary. A shell must be able to react to "song is broken" differently from "no song available".
**Acceptance:** _(Technical, Functional)_ The bridge error enum and the core error enum map one to one; a test asserts that a panic in the core is caught and converted into a typed error.
**Verification:** `to be written:` `crates/phomu-bridge/tests/error_mapping.rs::core_errors_map_one_to_one` and `::panic_becomes_a_typed_error`.

### BRIDGE-105 — The core never runs on the UI thread

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every call into the core that can take more than a frame is executed off the UI thread. The result is published back to the UI thread. No shell may block its UI thread on a core call.
**Rationale:** A blocked UI thread is a frozen interface. On a television or a low-end phone it is immediately visible.
**Acceptance:** _(Performance, Technical)_ The bridge offers an asynchronous API for the long operations; the shell test measures that the interface stays responsive during a catalogue load.
**Verification:** `to be written:` `crates/phomu-bridge/tests/threading.rs::long_operations_do_not_block_the_caller`.

### BRIDGE-106 — Long-running bridge operations are cancellable

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** A long-running bridge operation can be cancelled; after cancellation no further callback for that operation is delivered.
**Rationale:** A player who leaves the lobby during a catalogue load must not receive a callback for an abandoned screen.
**Acceptance:** _(Functional, Technical)_ Every asynchronous operation returns a cancellation handle; after cancelling, the callback count stays at zero.
**Verification:** `to be written:` `crates/phomu-bridge/tests/cancellation.rs::cancelled_operation_delivers_no_callback`.

### BRIDGE-107 — Events from the core reach the shell in a defined order

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The core emits its events in a defined order: phase change, score change, round end, game end. No event is delivered twice and no event is skipped.
**Rationale:** The web application had to guard every side effect against a double call (`UI-015` — the phase comparison in `src/hooks/useGameAudioCues.ts:76-96`). The ordering contract removes the need for such guards.
**Acceptance:** _(Functional, Technical)_ The order is documented in the bridge contract and asserted by a test with a recorded event sequence.
**Verification:** `to be written:` `crates/phomu-bridge/tests/event_order.rs::events_arrive_in_the_documented_order`.

### BRIDGE-108 — The bridge payload carries no spoiler before the reveal

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The payload the bridge delivers to a shell before the reveal contains no field that carries the song identity — not the title, not the artist, not the cover URL, not the year.
**Rationale:** This is the technical enforcement of `CORE-005` and `MEDIA-015` across all platforms. The rule is stated in `LLM.md` and is currently **not** met in the web shell (`W-34`/`GAP-027` in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)).
**Acceptance:** _(Functional, Security/Privacy)_ The negative assertion is part of the bridge test suite and runs for every track.
**Verification:** `to be written:` `crates/phomu-bridge/tests/payload.rs::payload_before_reveal_carries_no_identity`.

### BRIDGE-109 — The bridge is the only channel for catalogue data

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Songs reach a shell only through the bridge. No shell reads or parses the catalogue artefact itself.
**Rationale:** A shell that parses the catalogue re-implements the data model and can drift from the core.
**Acceptance:** _(Technical)_ The rule-duplication check covers catalogue field names as well as mode identifiers.
**Verification:** `command:` `scripts/check-no-duplicate-rules.mjs` (to be written) must exit 0.

### BRIDGE-110 — The serialisation format is stable and documented

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The wire format of the bridge is documented, versioned and stable within a major version. A change that breaks the format requires a major version increase.
**Rationale:** The bridge is a published interface between independently released artefacts (core and shell).
**Acceptance:** _(Documentation, Interoperability)_ The format is described in the bridge contract with a schema version; a compatibility test reads a recorded payload of the previous version.
**Verification:** `to be written:` `crates/phomu-bridge/tests/compatibility.rs::previous_payload_version_is_readable`.

### BRIDGE-111 — The bridge surface contains no platform-specific function

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The exported bridge surface is identical for every platform. Platform differences are expressed by trait implementations inside the core, never by an extra exported function.
**Rationale:** The same argument as `CORE-114`, applied to the boundary itself.
**Acceptance:** _(Technical)_ The exported function set is compared against a committed baseline per platform; a growth is a CI failure.
**Verification:** `command:` `scripts/check-ffi-surface.mjs` (to be written) compares the exported sets of all platform builds.

### BRIDGE-112 — The bridge call overhead stays within a budget

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The overhead of a bridge call — the transfer of a round state — is measured and stays below the budget of `PERF-110`. The measurement is part of the core journey benchmark.
**Rationale:** The bridge sits in the critical path of every round transition. An unnoticed growth makes the game slower on every platform at once.
**Acceptance:** _(Performance)_ The overhead is measured with the named benchmark and reported with the release.
**Verification:** `to be written:` `crates/phomu-bridge/benches/round_transition.rs::bridge_overhead`; the budget is `PERF-110`.

### BRIDGE-113 — The bridge is testable without a device

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every bridge behaviour can be tested on the host, without an emulator and without a device. The device is needed for the shell tests, not for the contract tests.
**Rationale:** Contract tests that need a device run slowly and are skipped when the CI has no device — exactly the tests that must not be skipped.
**Acceptance:** _(Technical)_ The bridge test suite runs in the normal CI matrix without any emulator.
**Verification:** `command:` `cargo test -p phomu-bridge` in the CI job of `REL-114`.

### BRIDGE-114 — The generated bindings are generated, never hand-maintained

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The bindings for Kotlin and Swift are produced by the UniFFI generator from the core's proc-macro annotations. No generated file is edited by hand, and no generated file is committed without its generator version.
**Rationale:** The repository already applies this rule to the Next.js build ("Do not edit it manually", `src/data/songs/index.ts`).
**Acceptance:** _(Technical)_ The generation command is in the build contract; the generated files carry a "generated — do not edit" header; CI regenerates them and fails when the result differs.
**Verification:** `command:` the generation step named in `docs/design/BUILD-CONTRACT.md` plus a CI diff check.

### BRIDGE-115 — The memory ownership across the bridge is documented and leak-free

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every value that crosses the bridge has one documented owner. The core does not retain a reference to shell memory and vice versa. The bridge test suite shows no unbounded growth of the live object count.
**Rationale:** A party game runs for hours on a phone; a leak per round is a crash in round 40.
**Acceptance:** _(Technical, Performance)_ The ownership rules are documented; a soak test runs 200 rounds and the live object count stays bounded.
**Verification:** `to be written:` `crates/phomu-bridge/tests/soak.rs::live_objects_stay_bounded_over_200_rounds`.

### BRIDGE-116 — The bridge builds reproducibly and declares its minimum platform versions

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The bridge artefact is built reproducibly, and the minimum Android API level, the minimum iOS version and the minimum desktop system version are declared in one place.
**Rationale:** The minimum versions are product decisions that affect the store listings and the build contract.
**Acceptance:** _(Technical, Documentation)_ The minimum versions are listed in the build contract; two builds of the same source produce the same artefact hash.
**Verification:** `command:` the reproducibility check named in `docs/design/BUILD-CONTRACT.md`; `acceptance:` the minimum-version table in the track acceptance document.

---

# 5. REL — the release process

> Every track runs **Alpha → Beta → Stable**. The gates, the order, the
> distribution channels and the signing profile are defined in
> [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) — that document is
> binding and is **not** repeated here. This section states what the
> specification adds: the traceability from a platform requirement to a gate,
> and the requirements that the release plan does not cover.

### REL-101 — The track order is binding

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The tracks are executed in the order Android (T1) → Google TV/Fire TV (T2) → macOS (T3a) and Linux (T3b) → iPadOS/iOS (T4) → Windows and further operating systems (T5). The web track (T0) is a peer, not a predecessor, and must stay green. A track may not begin its own Alpha work until the preceding track has a **green release candidate** — the rule and the exception for track-independent work are defined in the release plan § 3.2.
**Rationale:** The order is the owner's decision; a spec that lets tracks start in parallel would double the maintenance surface with half the feedback.
**Acceptance:** _(Functional, Documentation)_ The track identifiers used in this document are the identifiers of the release plan; every acceptance document names the track identifiers of the release plan; a track that starts early is a process deviation and is recorded.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 3.1 defines `T0`…`T5`; `acceptance:` the track table in each acceptance document.

### REL-102 — Every track runs Alpha → Beta → Stable

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Each track passes through the three stages Alpha, Beta and Stable, with the gate lists `A-01` … `A-14`, `B-01` … `B-12` and `S-01` … `S-12` of the release plan. The stages are named consistently in every acceptance document and in the store metadata.
**Rationale:** One stage vocabulary across all tracks makes the release status comparable and lets the gates of one track be read against the gates of another.
**Acceptance:** _(Documentation)_ Every track acceptance document names the stage it belongs to and the gate IDs that it closes.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4; `acceptance:` the stage field in each acceptance document.

### REL-103 — Every platform requirement of a track is covered by a gate

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The Alpha stage of a track is the gate list `A-01` … `A-14` of the release plan plus the per-track additions. On top of that, **every platform requirement of [`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md) that applies to the track is named by at least one gate of the track**, and every gate names the requirement IDs it covers.
**Rationale:** Alpha is a build for the team, not for the store. The requirement-to-gate mapping is what turns a gate list into a traceability chain — without it, a requirement can be "green" because no gate ever looked at it.
**Acceptance:** _(Documentation, Technical)_ The acceptance document of the track contains a table "requirement ID → gate ID" with no empty cell in either direction.
**Verification:** `acceptance:` the requirement-to-gate table in the acceptance document of the track; `to be written:` `scripts/check-gate-coverage.mjs::every_platform_requirement_is_covered_by_a_gate`.

### REL-104 — The Beta entry criteria

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The Beta stage of a track is the gate list `B-01` … `B-12` of the release plan (all Alpha criteria remain in force). The Beta gate already covers the measured budgets (`B-02`), the accessibility review (`B-03`), the store metadata (`B-12`), the licence conditions (`B-09`) and the rollback preparation (`B-10`); this document adds the platform-specific measurement and the requirement-ID mapping of `REL-103`.
**Rationale:** Beta goes to real users. It must not be the first time the budgets are looked at.
**Acceptance:** _(Performance, Usability, Security/Privacy, Documentation)_ Every platform requirement of the track is closed by a Beta gate or by an Alpha gate that is still in force; the measured values are in the acceptance document.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.2; `acceptance:` the checklist in the Beta acceptance document.

### REL-105 — The Stable entry criteria

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The Stable stage of a track is the gate list `S-01` … `S-12` of the release plan (all Alpha and Beta criteria remain in force). It covers the production approval (`S-02`), the signature verification (`S-03`), the release notes (`S-04`), the update and rollback path (`S-06`, `S-07`, `S-12`) and the acceptance decision (`S-09`). This document adds: the release evidence of the track names every platform requirement of the track that is in scope, and every requirement outside the scope is listed as a known limitation with its impact.
**Rationale:** Stable is the state a user can depend on. The criteria are about trust, not about features.
**Acceptance:** _(Technical, Documentation)_ The scope list of the requirements and the known-limitations list are complete for the track; both are checked in the acceptance document with evidence.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.3; `acceptance:` the checklist in the Stable acceptance document.

### REL-106 — Every track has an acceptance document per stage

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Each track produces three acceptance documents — Alpha, Beta, Stable — following the template in [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md), naming the requirement IDs of this document that the stage covers and the gate IDs it closes.
**Rationale:** The acceptance model of [`../../QUALITY.md`](../../QUALITY.md) requires evidence per stage; a track without a document has no status.
**Acceptance:** _(Documentation)_ The three documents exist under `docs/acceptance/` and name their requirement IDs, their gate IDs, their build and their environment.
**Verification:** `acceptance:` the file listing in the track acceptance document; `command:` `ls docs/acceptance/`.

### REL-107 — Android artefacts are signed and delivered as an App Bundle

**Preset:** Preset · **Track:** T1, T2 · **Status:** Planned
**Requirement:** Android releases are delivered as an `.aab` with Play App Signing, exactly as the signing profile of the release plan § 7.1 requires. The upload key never enters the repository and is held by at least two owners. Because the core is native code, the release build satisfies the **16 KB page-size** requirement that Google Play enforces for Android 15 and later.
**Rationale:** A lost upload key means the app can never be updated again. The 16 KB page size is the second classic fatal mistake of an Android release with a Rust core: an app that installs and then refuses to start.
**Acceptance:** _(Security/Privacy, Technical)_ The upload key is not in the repository; the artefact is signed with the release key; the key custody is documented outside the repository; every native library in the bundle passes the page-size check.
**Verification:** `existing:` the signing profile in [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 7.1 names the verification commands (`apksigner verify --print-certs`, the NDK page-size check); `acceptance:` their output in the Beta acceptance document.

### REL-108 — Apple artefacts are signed and notarised

**Preset:** Preset · **Track:** T4 · **Status:** Planned
**Requirement:** The iOS/iPadOS build follows the signing profile of the release plan § 7.5 — an `.xcarchive` uploaded to App Store Connect, distributed through TestFlight and then the App Store. The gate `B-09` of the release plan requires that the licensing document states the conditions of the distribution; [`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md) now exists as a draft decision basis with a recommendation, and this specification does not decide the question — the owner ratifies it (OPEN-01).
**Rationale:** Signing is mechanical; the licence question is not. Both belong in the same requirement so that neither is forgotten.
**Acceptance:** _(Technical, Documentation)_ The notarisation and signature evidence is part of the release evidence; the licensing document is referenced from the acceptance document; the Beta gate `B-09` is closed before the submission.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.2 (`B-09`) and § 7.5; `acceptance:` the notarisation and licence evidence in the Stable acceptance document.

### REL-109 — Desktop artefacts are signed per platform

**Preset:** Preset · **Track:** T3a, T3b, T5 · **Status:** Planned
**Requirement:** The desktop artefacts follow the signing profile of the release plan § 7.3, § 7.4 and § 7.6: macOS is signed with a Developer ID, notarised and stapled; Linux is delivered as an AppImage and a Flatpak whose repository commits are GPG-signed; Windows is delivered as an MSIX package with a valid package identity.
**Rationale:** Unsigned desktop artefacts trigger the warnings that keep players from installing them. Flathub additionally requires the build to be reproducible from source without network access — a constraint the release plan names as a blocker.
**Acceptance:** _(Technical, Security/Privacy)_ The signature verification of each artefact is part of the release pipeline and its output is in the acceptance document.
**Verification:** `existing:` the verification commands are named in [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 7.3 (`codesign`, `spctl --assess`, `xcrun stapler validate`), § 7.4 (`flatpak remote-ls --show-signatures`, `appstreamcli validate`) and § 7.6; `acceptance:` their output.

### REL-110 — The TV track is submitted to the TV stores

**Preset:** Preset · **Track:** T2 · **Status:** Planned
**Requirement:** The TV shell is submitted to Google Play for Android TV as a **separate application id** with its own listing, and meets the TV-specific requirements of the release plan § 7.2: the leanback feature declared, a leanback launcher intent, the banner artwork in the required sizes and a fully remote-operable application. Whether the targeted Fire TV models additionally require an Amazon Appstore submission is an **open check point of the release plan** and is not decided here.
**Rationale:** The TV stores have their own review criteria; a phone submission is rejected. The separate app id is a consequence of the store rules, not a product decision.
**Acceptance:** _(Documentation, Interoperability)_ The store requirements are listed in the acceptance document and the submission status is recorded; the open check point on the Amazon Appstore is either answered or named as open.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 7.2; `acceptance:` the submission record in the Beta/Stable acceptance document.

### REL-111 — Every track has complete store metadata

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Each track's store listing fulfils the gate `B-12` of the release plan: title, description, screenshots at the required sizes, privacy declaration, content rating, support and privacy URLs — plus the description in both languages (`I18N-001`) and the screenshots of the actual application.
**Rationale:** An incomplete listing is the most common reason a store submission is rejected — and the cheapest thing to get right.
**Acceptance:** _(Documentation)_ The listing artefacts are stored with the release evidence; the two-language description and the real screenshots are part of it.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.2 (`B-12`); `acceptance:` the listing checklist in the acceptance document.

### REL-112 — The data-safety declaration matches the actual behaviour

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The store data-safety declaration states exactly what the application does: no data collection, no data sharing, no tracking, data stored only on the device. Every statement must be verifiable against the artefact — the gate `A-11` of the release plan requires the secret scan and the documented data trail of the track, and this requirement adds the network capture of `PLAT-118` as the proof of the declaration.
**Rationale:** `CORE-011` and `PRIVACY.md` are only credible if the store form says the same thing. A wrong declaration is a legal risk, not a documentation error.
**Acceptance:** _(Security/Privacy, Documentation)_ The declaration is checked against the network capture of `PLAT-118` before the submission.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.1 (`A-11`) and § 4.2 (`B-12`); `acceptance:` the declaration and the capture are attached to the acceptance document.

### REL-113 — The build chain is reproducible and pinned

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The release build of every track is reproducible from a tagged commit, exactly as the gate `A-01` of the release plan requires; the commit, the core version and the bridge ABI version are recorded in the release record. The toolchain versions are pinned in the build contract and in the CI definition.
**Rationale:** A release that cannot be rebuilt cannot be patched.
**Acceptance:** _(Technical)_ Two builds of the same tagged commit produce the same artefact hash; the release record names the commit, the core version and the bridge ABI version.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.1 (`A-01`); `to be written:` `scripts/check-reproducible-build.sh::same_source_same_hash`.

### REL-114 — The CI matrix covers every track

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The CI pipeline builds and tests every track that is in development: the core and the bridge with their Rust gates (`A-05`, `A-06`) and each shell with its own tests (`A-04`). A failing job for a track blocks the release of that track.
**Rationale:** A pipeline that only builds the web application cannot gate a native release.
**Acceptance:** _(Technical)_ The matrix lists one job per track; a red job is visible in the pull request.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.1 (`A-04` … `A-06`); `command:` the CI configuration; `acceptance:` a green matrix run attached to the acceptance document.

### REL-115 — The core and the shells carry one coherent version

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The version of the core, the bridge ABI and the shell of a release are recorded together, as the versioning scheme of the release plan § 5 defines it. A shell that ships a different bridge ABI major than the one it was built against is rejected by `BRIDGE-103`; a shell may not be published with a mismatched major.
**Rationale:** Version drift between the artefacts of a release is the classic source of "works on my machine".
**Acceptance:** _(Technical, Documentation)_ The release evidence names the core version, the bridge ABI major/minor and the shell version.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 5; `acceptance:` the version table in the acceptance document.

### REL-116 — Every track produces release notes

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Each track produces release notes in both languages, listing the changes, the known limitations, the data-safety relevant changes and the requirement IDs in scope. The notes distinguish what is new from what was already possible on the web. The three locations required by the gate `S-04` — store description, `CHANGELOG.md` and release record — are compared with each other.
**Rationale:** A player coming from the web needs to know what is different on the phone.
**Acceptance:** _(Documentation)_ The notes exist for every release in all three locations, name the known limitations and are consistent with each other.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.3 (`S-04`); `acceptance:` the release notes attached to the acceptance document.

### REL-117 — The rollout and the rollback path exist before Stable

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Before Stable, the staged rollout of the channel and a rollback path exist, as the gates `B-10`, `S-07` and `S-12` of the release plan require: the previous known-good artefact is stored and signed, the rollback procedure is written, and — where the channel allows it — the rollback is exercised once during the Beta stage. A rollback must not require a new build.
**Rationale:** Store rollbacks are slow; the plan has to exist before the failure.
**Acceptance:** _(Technical)_ The withdrawal procedure is written and rehearsed once before Stable; the rehearsal record is in the acceptance document.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.2 (`B-10`) and § 4.3 (`S-07`, `S-12`); `acceptance:` the rehearsal record in the Stable acceptance document.

### REL-118 — The store policy compliance of every track is checked before submission

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Before a submission, the track is checked against the store policies that apply to it: no account required (`A-12`), no advertising, no tracking, no data collection, AGPL-3.0-or-later licence, the licence conditions of the track (`B-09`) and — where the store requires it — an export-compliance declaration.
**Rationale:** The product promises freedom from accounts and ads (`CORE-002`). A store that demands a privacy policy must get one that says the truth, and the export rules (encryption, in particular) must be answered correctly for a GPL distribution.
**Acceptance:** _(Documentation, Security/Privacy)_ The check list is part of the Beta acceptance document and is signed off by the owner.
**Verification:** `existing:` [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) § 4.1 (`A-12`) and § 4.2 (`B-09`, `B-12`); `acceptance:` the signed checklist in the acceptance document.

---

# 6. A11Y — accessibility across all shells

> The target is **WCAG 2.1 AA**, as already recorded in [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 5 for the web application. The requirement here is that the target holds on every track — a native shell is not exempt because it is new.

### A11Y-101 — WCAG 2.1 AA is the target on every track

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every shell is assessed against WCAG 2.1 AA. An assessment is performed per track and per phase; the result and the open findings are part of the acceptance document.
**Rationale:** The target exists in the repository for the web application. Without an assessment on the native shells, the claim would silently become web-only.
**Acceptance:** _(Usability, Documentation)_ The assessment result is recorded per track with the tool and the version used.
**Verification:** `acceptance:` the accessibility section of the track acceptance document.

### A11Y-102 — The contrast of every theme is measured, not estimated

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** All visible text and controls reach at least 4.5:1 (body text) and 3:1 (large text and controls) in every theme of every shell. The measurement is taken with an automated tool and recorded.
**Rationale:** [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 5 names the risk spots in the web application — texts with reduced opacity on coloured ground — and states that the contrast is "not measured". A new shell must not inherit that gap.
**Acceptance:** _(Usability)_ The measured values per theme and per shell are in the acceptance document; a value below the target is a defect and not a note.
**Verification:** `to be written:` `scripts/check-contrast.mjs` (to be written) runs axe-core against every shell screen; `acceptance:` the measured table.

### A11Y-103 — The focus order is logical and the focus is visible on every shell

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every interactive element is reachable in a logical order and shows a visible focus indicator. The focus indicator is at least 3 px and uses the accent colour, as the web application already does (`UI-013`).
**Rationale:** The TV shell has no pointer at all. Without a visible focus, the television shell is unusable.
**Acceptance:** _(Usability, Accessibility)_ The focus order per screen is documented; the focus indicator is visible in every theme and at the largest font scale.
**Verification:** `to be written:` `apps/tv/app/src/test/kotlin/de/phomu/tv/FocusOrderTest.kt::focus_order_is_linear`; `acceptance:` the focus recording per shell.

### A11Y-104 — The target size follows the platform rule

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The minimum size of a control follows the track: 44 px on touch tracks (`PLAT-102`), and a target that is comfortably operable at a viewing distance of three metres on the TV track.
**Rationale:** The 44 px rule is a finger rule. On a television it is a different rule, and the difference must be written down rather than inherited.
**Acceptance:** _(Usability)_ The minimum size of the TV track is defined in the track acceptance document and verified in the UI.
**Verification:** `acceptance:` the target-size table in the track acceptance document.

### A11Y-105 — Every interactive element has an accessible name and a role

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every interactive element exposes a name and a role that a screen reader announces. Icon-only buttons carry a name. The state of a toggle is announced.
**Rationale:** The web application currently has no `role=` attribute anywhere in `src/` ([`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 6). The new shells must not start from the same zero.
**Acceptance:** _(Usability, Interoperability)_ The screen reader announces the mode, the score, the round and every answer option; the check is a recorded walkthrough.
**Verification:** `acceptance:` the screen-reader recording in the track acceptance document.

### A11Y-106 — The reduced-motion preference is honoured

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** When the platform reports the reduced-motion preference, the shell disables the non-essential animations — the phase transitions, the dice animation and the feedback overlays — without removing the feedback itself.
**Rationale:** Motion is a real accessibility problem and a real comfort problem in a dark room.
**Acceptance:** _(Usability)_ The feedback remains in text form; the animation is off.
**Verification:** `to be written:` `apps/android/app/src/test/kotlin/de/phomu/ReducedMotionTest.kt::animations_are_disabled_when_preferred`.

### A11Y-107 — The complete core journey is operable without a pointer

**Preset:** Preset · **Track:** T3a, T3b, T5, T2 · **Status:** Planned
**Requirement:** The core journey — start, lobby, mode, answer, reveal, end — is completed without a pointer on the desktop tracks and without touch on the TV track.
**Rationale:** This is the requirement that separates a real native shell from a ported web view.
**Acceptance:** _(Usability, Functional)_ The journey test runs with keyboard only (desktop) and with the remote only (TV).
**Verification:** `to be written:` `apps/desktop/tests/keyboard_journey.rs::core_journey_with_keyboard_only`, `apps/tv/app/src/test/kotlin/de/phomu/tv/RemoteNavigationTest.kt::core_journey_without_touch`.

### A11Y-108 — Text scaling does not remove functions

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** At the largest supported system font scale, every function remains usable: no control is clipped, no text overlaps, no button loses its label.
**Rationale:** A player with a large font must be able to play.
**Acceptance:** _(Usability)_ The largest scale is tested per shell.
**Verification:** `acceptance:` the scaling walkthrough in the track acceptance document.

### A11Y-109 — Colour is never the only carrier of meaning

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Score differences, team affiliation, correctness and the phase of the round are also carried by text, icon or shape. A player who cannot distinguish the colours still understands the game.
**Rationale:** The teams and the themes are colour-coded. That is a design decision, not an accessibility strategy.
**Acceptance:** _(Usability)_ The check is performed in greyscale in the acceptance walkthrough.
**Verification:** `acceptance:` the greyscale walkthrough in the track acceptance document.

### A11Y-110 — The accessibility check runs in CI per shell

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The automated accessibility check runs for every shell in the CI matrix and its result is part of the release evidence.
**Rationale:** An accessibility check that runs only before a release is run rarely.
**Acceptance:** _(Technical)_ The check is a CI job per shell; a new violation fails the build.
**Verification:** `command:` the CI job; `to be written:` `scripts/check-contrast.mjs` (to be written).

---

# 7. PERF — performance budgets per platform

> Every budget below names a **target value** and a **measurement method**. No measured value is stated here, because none has been measured for the new tracks — the current measured values of the web application are in [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) and are not repeated here.

### PERF-101 — The cold start budget per track

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every track has a cold-start budget: the time from process start until the first interactive frame of the lobby. The reference device and the reference data set are named per track in the acceptance document.
**Rationale:** The start time is the first thing a player experiences. Without a reference device, a measurement is not comparable.
**Acceptance:** _(Performance)_ The budget and the measured value are reported with the release; the measurement uses the named reference device and the full catalogue.
**Verification:** `acceptance:` the cold-start measurement in the track acceptance document; the method is named per platform (for Android `adb shell am start -W`, for desktop an instrumented launch).

### PERF-102 — The warm start and resume budget

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The time from tapping the icon to the restored session is budgeted separately from the cold start and is shorter.
**Rationale:** Resuming a running game is the frequent case in a party — the phone was locked, not deleted.
**Acceptance:** _(Performance)_ The warm start is measured and reported separately.
**Verification:** `acceptance:` the warm-start measurement in the track acceptance document.

### PERF-103 — The round transition budget

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The transition from "card drawn" to "question visible" is budgeted per track and measured with the same method as the web target in [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 2.
**Rationale:** The round transition is felt by every player in the room. It is the one latency that the whole group experiences.
**Acceptance:** _(Performance)_ The measured median over 50 rounds of a test game with six players is reported with the release.
**Verification:** `to be written:` `crates/phomu-core/benches/round_transition.rs::drawing_to_question`.

### PERF-104 — The reveal transition budget

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The transition from the reveal to the next round is budgeted and measured.
**Rationale:** The reveal is the moment of the round. A slow transition after it breaks the rhythm of the game.
**Acceptance:** _(Performance)_ The measured value is reported with the release.
**Verification:** `to be written:` `crates/phomu-core/benches/round_transition.rs::reveal_to_next_round`.

### PERF-105 — The memory ceiling per track

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every track has a memory ceiling for a running session with the full catalogue and 24 players. The ceiling is defined per track, because the memory model of a browser, an Android process and a desktop process differ.
**Rationale:** A game that is killed by the operating system mid-round is a broken game. The catalogue is the biggest memory consumer.
**Acceptance:** _(Performance)_ The ceiling and the measured peak are reported with the release.
**Verification:** `acceptance:` the memory measurement in the track acceptance document.

### PERF-106 — The package size budget per track

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Every track has a budget for the delivered artefact, including the bundled catalogue snapshot. The budget is named per track; the web budget of [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 3 does not transfer to a native artefact.
**Rationale:** A store has a size limit and the user has a data plan. The budget has to be set before the artefact exists, not afterwards.
**Acceptance:** _(Performance)_ The artefact size is measured and compared with the budget at every release.
**Verification:** `command:` the size measurement of the artefact in the release pipeline; `acceptance:` the measured table.

### PERF-107 — The catalogue load strategy is decided per track

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** Each track states whether the catalogue snapshot is bundled or downloaded on demand, and the decision is consistent with `SHELL-116` (a fresh installation must be able to start a round without a network).
**Rationale:** The web application loads the catalogue as JSON into the client bundle, which [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 3 names as the cause of the 2.71 MiB chunk. The native tracks must not repeat that mistake without a decision.
**Acceptance:** _(Performance, Functional)_ The strategy is named per track; a bundled catalogue does not block the first frame beyond the cold-start budget.
**Verification:** `acceptance:` the catalogue strategy in the track acceptance document.

### PERF-108 — The frame budget on low-end devices

**Preset:** Preset · **Track:** T1, T2, T4 · **Status:** Planned
**Requirement:** The phase transitions, the dice animation and the feedback overlays stay within the frame budget on the lowest device class the track supports.
**Rationale:** The animation is the "juicy" part of the product (`UI-014`) and the first thing that drops frames on a cheap phone or an old television.
**Acceptance:** _(Performance)_ The dropped-frame rate during a round is measured on the reference low-end device and reported.
**Verification:** `acceptance:` the frame measurement in the track acceptance document.

### PERF-109 — No blocking I/O on the UI thread

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** No catalogue read, no file write and no bridge call that can block runs on the UI thread. All such work happens on a background executor and is published to the UI.
**Rationale:** The same rule as in `BRIDGE-105`, applied to the shell's own I/O. It is the rule that separates a native shell from a web view.
**Acceptance:** _(Technical, Performance)_ The shell test measures that the interface stays responsive during a catalogue load.
**Verification:** `to be written:` `apps/android/app/src/test/kotlin/de/phomu/ResponsivenessTest.kt::ui_stays_responsive_during_catalogue_load`.

### PERF-110 — The bridge overhead budget

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The overhead of a bridge call is budgeted and measured with the benchmark of `BRIDGE-112`. The budget applies to the round transition, because that is the path with the most calls.
**Rationale:** The bridge is new overhead in every round. It must be measured once and shared by all tracks.
**Acceptance:** _(Performance)_ The measured overhead is reported with the release and compared against the budget.
**Verification:** `to be written:` `crates/phomu-bridge/benches/round_transition.rs::bridge_overhead`.

### PERF-111 — The power budget of a round

**Preset:** Preset · **Track:** T1, T2, T4 · **Status:** Planned
**Requirement:** The power consumption of a 30-minute round on a battery device is measured and stays within the budget of the track. The screen-awake request of `PLAT-105` is part of that budget.
**Rationale:** A party game runs for hours on a phone. A phone that dies in round 12 ends the party.
**Acceptance:** _(Performance)_ The measured consumption over a 30-minute round is reported with the release.
**Verification:** `acceptance:` the power measurement in the track acceptance document.

### PERF-112 — A performance regression gate in CI

**Preset:** Preset · **Track:** All · **Status:** Planned
**Requirement:** The core benchmarks run in CI and a regression beyond the agreed tolerance fails the build. The tolerance is named once and applies to all tracks.
**Rationale:** Without an automated gate, a performance regression is discovered by the players.
**Acceptance:** _(Technical, Performance)_ The benchmark job exists in the CI matrix; the tolerance is documented in the build contract.
**Verification:** `command:` the benchmark job; `acceptance:` a green run attached to the acceptance document.

---

# 8. Per-track acceptance matrices

> The matrices are the binding checklists for a track release. Every cell is filled with the evidence from the phase's acceptance document. A cell that was not measured is written as **NOT RUN** with a reason — never as passed.

## 8.1 Android (T1)

| Dimension        | Criterion                                                                                 | Evidence                                      |
| ---------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| Functional       | The core journey — lobby → round → reveal → end — completes on a phone and on a tablet    | Test name of the journey test                 |
| Technical        | The core rules are executed in the Rust core, not in the shell                            | `scripts/check-no-duplicate-rules.mjs` output |
| Performance      | Cold start, warm start, round transition, memory and package size within the budget       | The measured table of the acceptance document |
| Usability        | Touch targets ≥ 44 px, safe areas respected, the system back gesture behaves              | The walkthrough of the acceptance document    |
| Security/Privacy | Only the camera permission; no telemetry; the data-safety declaration matches the capture | The permission list and the network capture   |
| Interoperability | A printed card works; the catalogue artefact hash matches the other tracks                | The scan walkthrough and the hash             |
| Documentation    | The store listing, the release notes and the known limitations exist                      | The listing checklist                         |

## 8.2 Google TV / Fire TV (T2)

| Dimension        | Criterion                                                                           | Evidence                              |
| ---------------- | ----------------------------------------------------------------------------------- | ------------------------------------- |
| Functional       | The core journey completes with the remote only; the projector view is spoiler-free | The remote journey test               |
| Technical        | The TV shell links the same core version as the Android shell                       | The version table                     |
| Performance      | The frame budget holds on the low-end television class                              | The frame measurement                 |
| Usability        | Focus order, focus visibility, a legible type size at three metres                  | The focus recording                   |
| Security/Privacy | No touch requirement, no account, no tracking                                       | The store declaration and the capture |
| Interoperability | The TV store requirements are met; the submission is recorded                       | The submission record                 |
| Documentation    | The store listing in both languages, the release notes                              | The listing checklist                 |

## 8.3 macOS and Linux (T3a, T3b)

| Dimension        | Criterion                                                                   | Evidence                         |
| ---------------- | --------------------------------------------------------------------------- | -------------------------------- |
| Functional       | The core journey completes on both systems from one source tree             | The journey test per system      |
| Technical        | The artefact is signed and reproducible                                     | The signature check and the hash |
| Performance      | The desktop budgets are measured on the reference machine                   | The measured table               |
| Usability        | The keyboard alone completes the journey; the focus is visible              | The keyboard walkthrough         |
| Security/Privacy | No telemetry; the network capture matches the web policy                    | The capture                      |
| Interoperability | The same catalogue artefact and the same session format as the other tracks | The hash and the round-trip test |
| Documentation    | The install instructions, the release notes, the known limitations          | The release notes                |

## 8.4 iPadOS and iOS (T4)

| Dimension        | Criterion                                                                     | Evidence                                      |
| ---------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| Functional       | The core journey completes on iPad and on iPhone                              | The journey test per device                   |
| Technical        | The app is signed and notarised; the licence question is answered             | The notarisation log and the licence decision |
| Performance      | The iOS budgets are measured; the battery budget of `PERF-111` is met         | The measured table                            |
| Usability        | Dynamic type at the largest scale; the screen reader announces the game state | The scaling and screen-reader walkthrough     |
| Security/Privacy | Only the camera permission; the App Store privacy label matches the behaviour | The privacy label and the capture             |
| Interoperability | A printed card works; the catalogue artefact hash matches the other tracks    | The scan walkthrough and the hash             |
| Documentation    | The App Store listing, the release notes, the known limitations               | The listing checklist                         |

## 8.5 Windows and further operating systems (T5)

| Dimension        | Criterion                                                                            | Evidence                              |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| Functional       | The core journey completes on the reference Windows version                          | The journey test                      |
| Technical        | The installer is signed; the artefact is reproducible                                | The signature check                   |
| Performance      | The Windows budgets are measured                                                     | The measured table                    |
| Usability        | The keyboard alone completes the journey                                             | The keyboard walkthrough              |
| Security/Privacy | No telemetry; the network capture matches the web policy                             | The capture                           |
| Interoperability | The same catalogue artefact and session format; a new OS can be added without a fork | The hash and the build-contract entry |
| Documentation    | The install instructions, the release notes                                          | The release notes                     |

## 8.6 Web (T0) — the existing track, supplemented

| Dimension        | Criterion                                                                                        | Evidence                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Functional       | The existing routes and the game behaviour remain unchanged; the existing acceptance stays valid | `docs/acceptance/M0-ACCEPTANCE.md` and the regression run |
| Technical        | The web shell is not forked; the core is integrated without losing the static export             | The build output and the import check                     |
| Performance      | The existing web budgets of [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) still hold              | The build measurements                                    |
| Usability        | The existing accessibility findings are not made worse                                           | The regression run of the checks                          |
| Security/Privacy | The existing admin API and the local-first promise are unchanged                                 | The existing negative tests                               |
| Interoperability | A session written by the web shell can be read by the core and back                              | The round-trip test                                       |
| Documentation    | The integration is described in the architecture documents                                       | The change record                                         |

---

# 9. Open points of this document

These are the questions this document cannot answer without a decision from the owner. They are listed with priority in [`SRS.md`](SRS.md#12-open-points).

| #       | Question                                                                                          | Affected requirements                |
| ------- | ------------------------------------------------------------------------------------------------- | ------------------------------------ |
| OPEN-01 | The distribution and licence conditions for the iOS track _(= release plan OD-07)_                | `SHELL-106`, `REL-108`, `REL-118`    |
| OPEN-02 | The platform specification is written in English, the repository's documentation policy is German | all documents of this folder         |
| OPEN-03 | How the state reaches a second surface on the native tracks                                       | `SHELL-104`, `SHELL-117`, `PLAT-118` |
| OPEN-04 | The shell technology of the desktop track _(= release plan OD-01)_                                | `SHELL-105`, `SHELL-107`             |
| OPEN-05 | The reference device and reference machine per track _(= release plan B-04)_                      | `PERF-101`, `PERF-105`, `PERF-108`   |
| OPEN-06 | The minimum supported OS version per track                                                        | `BRIDGE-116`, `REL-111`, `PLAT-114`  |
| OPEN-07 | Whether the silent fallback to the full catalogue pool is kept                                    | `CORE-108`                           |
| OPEN-08 | The status of the phase `locked-in`                                                               | `CORE-105`                           |
| OPEN-09 | Encryption at rest of the session                                                                 | `PLAT-110`                           |
| OPEN-10 | Who maintains the catalogue artefact in the native tracks                                         | `CORE-110`, `SHELL-115`              |

---

# 10. Change log of this baseline

| Date       | Change                                                                                                                                         | Evidence                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-25 | Baseline P-1 created: 114 requirements across seven domains, derived from the code at commit `3d3d011` and from `REQUIREMENTS.md` baseline 0.1 | `npx vitest run` → 10 files / 97 tests green; `node scripts/check-i18n-completeness.mjs --count` → 0 literals in 48 files; `npm run validate-catalog` → 135 packs / 1.615 songs |
