# Phomu Traceability — Multi-Platform Extension

**Baseline:** Requirements baseline P-1 ([`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md))
**Date:** 2026-10-25
**Repository state:** commit `3d3d011`, branch `main`

> **Reading note.** This matrix proves that nothing was lost between the
> requirement, its design, its test and its acceptance. It is an **honest
> record**: where a test does not exist yet, the cell says **to be written** and
> names the planned path and the planned test name. That is a gap, not a
> fulfilled requirement.

---

## 1. Conventions

| Column             | Content                                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement ID** | `CORE-101` … `PERF-112`, as defined in [`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md)                                                                                                |
| **Source**         | Where the requirement comes from: the owner's programme directive, or an existing requirement ID in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)                                         |
| **Design**         | The document that carries the design for the requirement. `PLATFORM-ARCHITECTURE.md` and `BUILD-CONTRACT.md` are written in parallel by the architect and are referenced by name.            |
| **ADR**            | The architecture decision record that fixes the choice. `ADR-00xx (planned)` means the decision is expected but not yet taken. `—` means no ADR is needed.                                   |
| **Test**           | `existing:` — the test exists in the repository today. `to be written:` — the test does not exist; the planned path and test name are given.                                                 |
| **Acceptance**     | The acceptance document that closes the requirement. The file names are **planned**; none of them exists yet.                                                                                |
| **Track**          | `All`, `T0` (Web), `T1` (Android), `T2` (TV), `T3a` (macOS), `T3b` (Linux), `T4` (iPadOS/iOS), `T5` (Windows)                                                                                |
| **Status**         | `Planned` — not implemented. `Existing (Web)` — satisfied today by the web application. `Partial` — exists in the web application but does not satisfy the requirement on the target design. |

### 1.1 Planned acceptance documents

The matrix in § 2 … § 8 uses the **short form** of the document name — for
example `T1-ANDROID-ALPHA` stands for
`docs/acceptance/T1-ANDROID-ALPHA-ACCEPTANCE.md`.

| Track            | Alpha                                             | Beta                                            | Stable                                            |
| ---------------- | ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Web              | `docs/acceptance/T0-WEB-ALPHA-ACCEPTANCE.md`      | `docs/acceptance/T0-WEB-BETA-ACCEPTANCE.md`     | `docs/acceptance/T0-WEB-STABLE-ACCEPTANCE.md`     |
| Web (regression) | `docs/acceptance/T0-WEB-REGRESSION-ACCEPTANCE.md` | —                                               | —                                                 |
| Android          | `docs/acceptance/T1-ANDROID-ALPHA-ACCEPTANCE.md`  | `docs/acceptance/T1-ANDROID-BETA-ACCEPTANCE.md` | `docs/acceptance/T1-ANDROID-STABLE-ACCEPTANCE.md` |
| TV               | `docs/acceptance/T2-TV-ALPHA-ACCEPTANCE.md`       | `docs/acceptance/T2-TV-BETA-ACCEPTANCE.md`      | `docs/acceptance/T2-TV-STABLE-ACCEPTANCE.md`      |
| Desktop          | `docs/acceptance/T3-DESKTOP-ALPHA-ACCEPTANCE.md`  | `docs/acceptance/T3-DESKTOP-BETA-ACCEPTANCE.md` | `docs/acceptance/T3-DESKTOP-STABLE-ACCEPTANCE.md` |
| iOS/iPadOS       | `docs/acceptance/T4-IOS-ALPHA-ACCEPTANCE.md`      | `docs/acceptance/T4-IOS-BETA-ACCEPTANCE.md`     | `docs/acceptance/T4-IOS-STABLE-ACCEPTANCE.md`     |
| Windows          | `docs/acceptance/T5-WINDOWS-ALPHA-ACCEPTANCE.md`  | `docs/acceptance/T5-WINDOWS-BETA-ACCEPTANCE.md` | `docs/acceptance/T5-WINDOWS-STABLE-ACCEPTANCE.md` |

The template for each of them is
[`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md).
The web regression document (`T0-WEB-REGRESSION-ACCEPTANCE.md`) is not one of
the three phases; it proves that the web track still behaves as accepted in
[`M0-ACCEPTANCE.md`](../acceptance/M0-ACCEPTANCE.md) after the integration of
the core.

### 1.2 Planned gate scripts

| Script                                 | Purpose                                                      | Requirements                                       |
| -------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| `scripts/check-no-duplicate-rules.mjs` | No game rule outside the core                                | `CORE-101`, `SHELL-101`, `SHELL-114`, `BRIDGE-109` |
| `scripts/check-core-api-surface.sh`    | The exported core surface does not grow                      | `CORE-114`                                         |
| `scripts/check-ffi-surface.mjs`        | Only generated bindings; identical exported set per platform | `BRIDGE-101`, `BRIDGE-111`                         |
| `scripts/check-no-telemetry.sh`        | No telemetry crate and no telemetry endpoint in the artefact | `CORE-115`, `PLAT-118`                             |
| `scripts/check-core-config.mjs`        | No game-rule number outside the core configuration           | `CORE-104`                                         |
| `scripts/check-i18n-parity.mjs`        | The key sets of all shells are identical                     | `SHELL-110`, `SHELL-119`                           |
| `scripts/check-design-tokens.mjs`      | The token tables of all shells are identical                 | `SHELL-109`, `PLAT-121`                            |
| `scripts/check-contrast.mjs`           | The WCAG contrast target holds per screen and theme          | `A11Y-102`, `A11Y-110`                             |
| `scripts/check-permission-manifest.sh` | Only the camera and the network state are declared           | `PLAT-109`, `PLAT-110`                             |
| `scripts/check-signature.sh`           | The artefact is signed per platform                          | `REL-107`, `REL-109`                               |
| `scripts/check-reproducible-build.sh`  | The same source yields the same hash                         | `REL-113`, `BRIDGE-116`                            |
| `scripts/check-generated-bindings.sh`  | The generated bindings are up to date                        | `BRIDGE-114`                                       |
| `scripts/check-artefact-size.sh`       | The artefact stays within the budget                         | `PERF-106`                                         |
| `scripts/check-perf-regression.sh`     | No performance regression beyond the tolerance               | `PERF-112`                                         |
| `scripts/check-license-metadata.sh`    | The licence of the artefacts and the store listings          | `CORE-116`                                         |

---

## 2. Matrix — CORE (shared Rust base)

| Requirement ID | Source                                                                   | Design (document)                                                       | ADR                                               | Test (path/name)                                                                                                                                  | Acceptance (document) | Track | Status  |
| -------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----- | ------- |
| CORE-101       | Programme directive; `REQUIREMENTS.md` `CORE-006`, `GAME-016`…`GAME-045` | `docs/design/PLATFORM-ARCHITECTURE.md` § core; `docs/spec/SRS.md` § 4.2 | ADR-0005 (planned) — one rule set                 | to be written: `crates/phomu-core/tests/mode_registry.rs::every_mode_has_exactly_one_rule_implementation`; `scripts/check-no-duplicate-rules.mjs` | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-102       | `ARCHITECTURE.md` § 2 (dependency direction)                             | `docs/design/PLATFORM-ARCHITECTURE.md` § core                           | ADR-0005 (planned)                                | to be written: `crates/phomu-core/tests/no_ui_dependencies.rs::core_depends_on_no_ui_crate`                                                       | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-103       | `REQUIREMENTS.md` `LOBBY-021`; `GAME-CONTRACT.md` § 7                    | `docs/design/PLATFORM-ARCHITECTURE.md` § state model                    | ADR-0006 (planned) — state schema                 | to be written: `crates/phomu-core/tests/determinism.rs::same_seed_and_inputs_produce_identical_state`                                             | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-104       | `REQUIREMENTS.md` `CORE-009`; `GAME-CONTRACT.md` § 1.2                   | `docs/design/PLATFORM-ARCHITECTURE.md` § configuration                  | ADR-0005 (planned)                                | to be written: `crates/phomu-core/tests/config.rs::config_exposes_the_game_constants`; `scripts/check-core-config.mjs`                            | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-105       | `REQUIREMENTS.md` `GAME-001`, `GAME-002`; `GAME-CONTRACT.md` § 2         | `docs/design/GAME-CONTRACT.md` § 2 (binding)                            | — (the contract is the decision)                  | to be written: `crates/phomu-core/tests/phase_machine.rs::transition_table_matches_game_contract`                                                 | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-106       | `REQUIREMENTS.md` `CORE-005`, `MEDIA-015`, `UI-006`                      | `docs/design/GAME-CONTRACT.md` § 3 (binding)                            | ADR-0007 (planned) — display view                 | to be written: `crates/phomu-core/tests/anti_spoiler.rs::display_view_omits_identity_before_reveal`                                               | T1-ANDROID-BETA       | All   | Planned |
| CORE-107       | `REQUIREMENTS.md` `GAME-006`…`GAME-040`; `GAME-CONTRACT.md` § 5          | `docs/design/GAME-CONTRACT.md` § 5 (binding)                            | —                                                 | to be written: `crates/phomu-core/tests/scoring.rs::points_per_mode_match_the_game_contract`                                                      | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-108       | `REQUIREMENTS.md` `GAME-043`…`GAME-045`, `LOBBY-017`, `GAP-003`          | `docs/design/GAME-CONTRACT.md` § 4                                      | ADR-0008 (planned) — fallback behaviour (OPEN-05) | to be written: `crates/phomu-core/tests/song_picker.rs::pack_filter_selects_only_matching_songs`                                                  | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-109       | `REQUIREMENTS.md` `CAT-011`, `CAT-012`, `GAP-004`                        | `docs/design/GAME-CONTRACT.md` § 3.4                                    | —                                                 | to be written: `crates/phomu-core/tests/censor.rs::hint_containing_the_artist_is_censored`                                                        | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-110       | `REQUIREMENTS.md` `CAT-001`…`CAT-009`; `NFR-007`                         | `docs/design/BUILD-CONTRACT.md` § catalogue artefact                    | ADR-0009 (planned) — catalogue artefact           | to be written: `crates/phomu-core/tests/catalogue.rs::core_and_web_validator_agree_on_the_same_artefact`                                          | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-111       | `REQUIREMENTS.md` `SEC-018`; `ARCHITECTURE.md` § 5.1                     | `docs/design/PLATFORM-ARCHITECTURE.md` § error model                    | ADR-0010 (planned) — error model                  | to be written: `crates/phomu-core/tests/error_contract.rs::every_public_error_is_a_typed_variant`                                                 | T1-ANDROID-BETA       | All   | Planned |
| CORE-112       | `REQUIREMENTS.md` `CORE-003`, `CORE-011`                                 | `docs/design/PLATFORM-ARCHITECTURE.md` § core                           | ADR-0005 (planned)                                | to be written: `crates/phomu-core/tests/error_contract.rs::core_api_exposes_no_io_entry_point`                                                    | T1-ANDROID-BETA       | All   | Planned |
| CORE-113       | `REQUIREMENTS.md` `GAME-041`, `GAME-043`, `LOBBY-007`                    | `docs/design/GAME-CONTRACT.md` § 6.2                                    | —                                                 | to be written: `crates/phomu-core/tests/randomness.rs::seeded_draw_is_reproducible`                                                               | T1-ANDROID-ALPHA      | All   | Planned |
| CORE-114       | `ARCHITECTURE.md` § 2; Vocument `PLATFORM-004` (pattern only)            | `docs/design/PLATFORM-ARCHITECTURE.md` § core API                       | ADR-0005 (planned)                                | to be written: `scripts/check-core-api-surface.sh::api_surface_matches_baseline`                                                                  | T1-ANDROID-BETA       | All   | Planned |
| CORE-115       | `REQUIREMENTS.md` `CORE-011`, `PRIVACY.md`                               | `docs/design/PLATFORM-ARCHITECTURE.md` § dependencies                   | ADR-0005 (planned)                                | to be written: `scripts/check-no-telemetry.sh::no_telemetry_dependency_in_artefact`                                                               | T1-ANDROID-BETA       | All   | Planned |
| CORE-116       | `REQUIREMENTS.md` `CORE-002`; `LICENSE`; `package.json`                  | `docs/licensing/APPLE-LICENSING.md` § 7 (licence propagation)           | ADR-0011 (planned) — licence propagation          | to be written: `scripts/check-license-metadata.sh::licence_declared_everywhere`                                                                   | T4-IOS-BETA           | All   | Planned |

## 3. Matrix — SHELL (the frontends)

| Requirement ID | Source                                                            | Design (document)                                                                       | ADR                                              | Test (path/name)                                                                                                                    | Acceptance (document) | Track    | Status         |
| -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- | -------------- |
| SHELL-101      | Programme directive; `ARCHITECTURE.md` § 2                        | `docs/design/PLATFORM-ARCHITECTURE.md` § shells                                         | ADR-0005 (planned)                               | to be written: `scripts/check-no-duplicate-rules.mjs::no_rule_outside_the_core`                                                     | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-102      | `REQUIREMENTS.md` `CORE-002`…`CORE-009`; existing web application | `docs/design/PLATFORM-ARCHITECTURE.md` § web shell                                      | —                                                | existing: `e2e/smoke.spec.ts::smoke flow: home -> lobby -> game -> game-over -> browse -> settings`; `npm run build`                | T0-WEB-ALPHA          | T0       | Existing (Web) |
| SHELL-103      | Programme directive (track 1)                                     | `docs/design/PLATFORM-ARCHITECTURE.md` § Android shell; `docs/design/BUILD-CONTRACT.md` | ADR-0012 (planned) — Android toolchain           | to be written: `apps/android/app/src/test/kotlin/de/phomu/RoundJourneyTest.kt::completes_one_round`                                 | T1-ANDROID-ALPHA      | T1       | Planned        |
| SHELL-104      | Programme directive (track 2)                                     | `docs/design/PLATFORM-ARCHITECTURE.md` § TV shell                                       | ADR-0013 (planned) — ten-foot UI                 | to be written: `apps/tv/app/src/test/kotlin/de/phomu/tv/RemoteNavigationTest.kt::completes_one_round_with_dpad_only`                | T2-TV-ALPHA           | T2       | Planned        |
| SHELL-105      | Programme directive (track 3)                                     | `docs/design/PLATFORM-ARCHITECTURE.md` § desktop shell                                  | ADR-0014 (planned) — desktop toolchain (OPEN-03) | to be written: `apps/desktop/tests/core_journey.rs::completes_one_round`                                                            | T3-DESKTOP-ALPHA      | T3a, T3b | Planned        |
| SHELL-106      | Programme directive (track 4)                                     | `docs/design/PLATFORM-ARCHITECTURE.md` § iOS shell; `docs/licensing/APPLE-LICENSING.md` | ADR-0015 (planned) — iOS distribution (OPEN-02)  | to be written: `apps/ios/PhomuTests/CoreJourneyTests.swift::completesOneRound`                                                      | T4-IOS-ALPHA          | T4       | Planned        |
| SHELL-107      | Programme directive (track 5)                                     | `docs/design/PLATFORM-ARCHITECTURE.md` § Windows shell                                  | ADR-0016 (planned) — Windows shell               | to be written: `apps/windows/tests/core_journey.rs::completes_one_round`                                                            | T5-WINDOWS-ALPHA      | T5       | Planned        |
| SHELL-108      | `REQUIREMENTS.md` `CORE-006`                                      | `docs/design/GAME-CONTRACT.md` § 4 (six modes)                                          | —                                                | to be written: `crates/phomu-core/tests/mode_registry.rs::shell_mode_lists_match_the_core`                                          | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-109      | `REQUIREMENTS.md` `UI-001`, `UI-002`                              | `docs/design/PLATFORM-ARCHITECTURE.md` § design tokens                                  | ADR-0017 (planned) — token artefact              | to be written: `scripts/check-design-tokens.mjs::token_tables_are_identical`                                                        | T1-ANDROID-BETA       | All      | Planned        |
| SHELL-110      | `REQUIREMENTS.md` `CORE-008`, `I18N-001`…`I18N-007`               | `docs/design/PLATFORM-ARCHITECTURE.md` § localisation                                   | —                                                | existing: `scripts/check-i18n-completeness.mjs` (web); to be written: `scripts/check-i18n-parity.mjs::key_sets_match_across_shells` | T1-ANDROID-ALPHA      | All      | Partial        |
| SHELL-111      | `REQUIREMENTS.md` `LOBBY-021`; `GAME-CONTRACT.md` § 7             | `docs/design/PLATFORM-ARCHITECTURE.md` § persistence                                    | ADR-0006 (planned)                               | to be written: `crates/phomu-core/tests/persistence.rs::session_survives_a_restart`                                                 | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-112      | `REQUIREMENTS.md` `LOBBY-001`…`LOBBY-024`                         | `docs/design/GAME-CONTRACT.md` § 9 (module limits)                                      | —                                                | to be written: `crates/phomu-core/tests/lobby.rs::lobby_validation_matches_the_contract`                                            | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-113      | `REQUIREMENTS.md` `UI-017`, `UI-018`                              | `docs/design/PLATFORM-ARCHITECTURE.md` § settings                                       | —                                                | to be written: `crates/phomu-core/tests/settings.rs::settings_change_applies_from_the_next_round`                                   | T1-ANDROID-BETA       | All      | Planned        |
| SHELL-114      | `ARCHITECTURE.md` § 2; ADR-0001                                   | `docs/design/PLATFORM-ARCHITECTURE.md` § shells                                         | ADR-0005 (planned)                               | to be written: `scripts/check-no-duplicate-rules.mjs::no_rule_outside_the_core`                                                     | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-115      | `REQUIREMENTS.md` `CAT-001`, `CAT-003`; `BEST_IN_CLASS.md` § 3    | `docs/design/BUILD-CONTRACT.md` § catalogue artefact                                    | ADR-0009 (planned)                               | to be written: `crates/phomu-core/tests/catalogue.rs::artefact_hash_is_verified_on_load`                                            | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-116      | `REQUIREMENTS.md` `CORE-003`                                      | `docs/design/BUILD-CONTRACT.md` § catalogue artefact                                    | ADR-0009 (planned)                               | to be written: `crates/phomu-core/tests/catalogue.rs::bundled_snapshot_needs_no_network`                                            | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-117      | `REQUIREMENTS.md` `UI-006`, `UI-007`, `UI-008`                    | `docs/design/GAME-CONTRACT.md` § 3 (anti-spoiler)                                       | ADR-0007 (planned)                               | to be written: `crates/phomu-core/tests/anti_spoiler.rs::projector_view_is_spoiler_free`                                            | T1-ANDROID-BETA       | All      | Planned        |
| SHELL-118      | `REQUIREMENTS.md` `LOBBY-023`; `QUALITY.md` § 4                   | `docs/design/PLATFORM-ARCHITECTURE.md` § navigation                                     | —                                                | — (acceptance walkthrough only)                                                                                                     | T1-ANDROID-ALPHA      | All      | Planned        |
| SHELL-119      | `REQUIREMENTS.md` `SEC-018`; `QUALITY.md` § 7                     | `docs/design/PLATFORM-ARCHITECTURE.md` § error surface                                  | ADR-0010 (planned)                               | to be written: `scripts/check-i18n-parity.mjs::every_error_code_exists_in_every_shell`                                              | T1-ANDROID-BETA       | All      | Planned        |
| SHELL-120      | `REQUIREMENTS.md` `NFR-012`, `NFR-013`, `GAP-021`                 | `docs/design/BUILD-CONTRACT.md` § CI                                                    | ADR-0018 (planned) — test matrix                 | to be written: per-shell journey test (path per shell)                                                                              | T1-ANDROID-ALPHA      | All      | Planned        |

## 4. Matrix — PLAT (platform behaviour)

| Requirement ID | Source                                                                      | Design (document)                                           | ADR                                 | Test (path/name)                                                                                                                                                                              | Acceptance (document) | Track        | Status         |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------ | -------------- |
| PLAT-101       | `QUALITY.md` § 4; `REQUIREMENTS.md` `UI-011`                                | `docs/design/PLATFORM-ARCHITECTURE.md` § input              | ADR-0013 (planned)                  | — (acceptance input table only)                                                                                                                                                               | T1-ANDROID-ALPHA      | All          | Planned        |
| PLAT-102       | `REQUIREMENTS.md` `UI-011`                                                  | `docs/design/PLATFORM-ARCHITECTURE.md` § layout             | —                                   | existing: `grep -rn "min-h-\[44px\]" src/components/` (web); to be written: native measurement in the shell suites                                                                            | T1-ANDROID-ALPHA      | T1, T4       | Existing (Web) |
| PLAT-103       | `QUALITY.md` § 4; programme directive (track 2)                             | `docs/design/PLATFORM-ARCHITECTURE.md` § TV navigation      | ADR-0013 (planned)                  | to be written: `apps/tv/app/src/test/kotlin/de/phomu/tv/RemoteNavigationTest.kt::core_journey_without_touch`                                                                                  | T2-TV-ALPHA           | T2           | Planned        |
| PLAT-104       | `REQUIREMENTS.md` `UI-013`; `BEST_IN_CLASS.md` § 6                          | `docs/design/PLATFORM-ARCHITECTURE.md` § desktop navigation | ADR-0014 (planned)                  | to be written: `apps/desktop/tests/keyboard_journey.rs::core_journey_with_keyboard_only`                                                                                                      | T3-DESKTOP-ALPHA      | T3a, T3b, T5 | Planned        |
| PLAT-105       | `QUALITY.md` § 4; programme directive                                       | `docs/design/PLATFORM-ARCHITECTURE.md` § lifecycle          | ADR-0019 (planned) — screen policy  | — (acceptance policy table only)                                                                                                                                                              | T1-ANDROID-ALPHA      | All          | Planned        |
| PLAT-106       | `REQUIREMENTS.md` `LOBBY-021`                                               | `docs/design/PLATFORM-ARCHITECTURE.md` § lifecycle          | ADR-0006 (planned)                  | to be written: `crates/phomu-core/tests/persistence.rs::session_survives_a_restart` (core part); per-shell lifecycle test                                                                     | T1-ANDROID-ALPHA      | All          | Planned        |
| PLAT-107       | `REQUIREMENTS.md` `SEC-012`; store policies                                 | `docs/design/PLATFORM-ARCHITECTURE.md` § permissions        | ADR-0019 (planned)                  | to be written: `apps/android/app/src/test/kotlin/de/phomu/PermissionRequestTest.kt::camera_is_requested_only_in_the_scanner`                                                                  | T1-ANDROID-BETA       | T1, T2, T4   | Planned        |
| PLAT-108       | `REQUIREMENTS.md` `LOBBY-018`; `next.config.ts` `Permissions-Policy`        | `docs/design/PLATFORM-ARCHITECTURE.md` § permissions        | ADR-0019 (planned)                  | existing: `grep -n "Permissions-Policy" next.config.ts` (web); to be written: native permission test                                                                                          | T1-ANDROID-BETA       | T1, T4       | Existing (Web) |
| PLAT-109       | `REQUIREMENTS.md` `CORE-002`, `CORE-003`                                    | `docs/design/PLATFORM-ARCHITECTURE.md` § permissions        | ADR-0019 (planned)                  | to be written: `scripts/check-permission-manifest.sh::no_permission_beyond_camera_and_network`                                                                                                | T1-ANDROID-BETA       | All          | Planned        |
| PLAT-110       | `REQUIREMENTS.md` `CORE-003`                                                | `docs/design/PLATFORM-ARCHITECTURE.md` § storage            | ADR-0020 (planned) — storage broker | to be written: `scripts/check-permission-manifest.sh` (storage part); acceptance storage table                                                                                                | T1-ANDROID-BETA       | All          | Planned        |
| PLAT-111       | `BEST_IN_CLASS.md` § 3 (catalogue size)                                     | `docs/design/BUILD-CONTRACT.md` § catalogue artefact        | ADR-0009 (planned)                  | — (acceptance measurement only)                                                                                                                                                               | T1-ANDROID-BETA       | All          | Planned        |
| PLAT-112       | `REQUIREMENTS.md` `GAME-038`, `UI-010`                                      | `docs/design/PLATFORM-ARCHITECTURE.md` § lifecycle          | ADR-0006 (planned)                  | to be written: per-shell lifecycle test (path per shell)                                                                                                                                      | T1-ANDROID-BETA       | All          | Planned        |
| PLAT-113       | `REQUIREMENTS.md` `LOBBY-021`                                               | `docs/design/PLATFORM-ARCHITECTURE.md` § persistence        | ADR-0006 (planned)                  | to be written: `crates/phomu-core/tests/persistence.rs::session_survives_a_restart`                                                                                                           | T1-ANDROID-ALPHA      | All          | Planned        |
| PLAT-114       | `QUALITY.md` § 4 (360/768/1920 px)                                          | `docs/design/PLATFORM-ARCHITECTURE.md` § layout             | —                                   | to be written: per-shell layout test at the declared minimum width                                                                                                                            | T1-ANDROID-ALPHA      | All          | Planned        |
| PLAT-115       | `REQUIREMENTS.md` `LOBBY-018`, `LOBBY-019`; `docs/guides/PRINTING-GUIDE.md` | `docs/design/GAME-CONTRACT.md` § 9                          | —                                   | existing: `src/utils/qr-intent.test.ts` (4 tests, `npm run test -- qr-intent`); to be written: `crates/phomu-core/tests/qr_intent.rs::pack_intent_is_accepted_and_unknown_packs_are_rejected` | T1-ANDROID-ALPHA      | All          | Existing (Web) |
| PLAT-116       | `REQUIREMENTS.md` `LOBBY-018`, `CORE-004`                                   | `docs/design/PLATFORM-ARCHITECTURE.md` § QR                 | ADR-0021 (planned) — scanner        | to be written: `apps/android/app/src/test/kotlin/de/phomu/QrScannerTest.kt::scan_applies_the_pack_intent`                                                                                     | T1-ANDROID-BETA       | T1, T4       | Planned        |
| PLAT-117       | `REQUIREMENTS.md` `CORE-004`; `src/config/game-config.ts:322-325`           | `docs/guides/PRINTING-GUIDE.md`                             | —                                   | existing: `grep -n "CARD_" src/config/game-config.ts`; acceptance print test per shell                                                                                                        | T1-ANDROID-ALPHA      | All          | Existing (Web) |
| PLAT-118       | `REQUIREMENTS.md` `CORE-011`, `MEDIA-013`, `SEC-012`; `PRIVACY.md`          | `docs/design/PLATFORM-ARCHITECTURE.md` § networking         | ADR-0011 (planned)                  | to be written: `scripts/check-no-telemetry.sh`; acceptance network capture                                                                                                                    | T1-ANDROID-BETA       | All          | Planned        |
| PLAT-119       | `BEST_IN_CLASS.md` § 5, § 6                                                 | `docs/design/PLATFORM-ARCHITECTURE.md` § accessibility      | ADR-0017 (planned)                  | — (acceptance screen-reader walkthrough only)                                                                                                                                                 | T1-ANDROID-BETA       | All          | Planned        |
| PLAT-120       | `QUALITY.md` § 4                                                            | `docs/design/PLATFORM-ARCHITECTURE.md` § layout             | —                                   | — (acceptance scaling walkthrough only)                                                                                                                                                       | T1-ANDROID-BETA       | All          | Planned        |
| PLAT-121       | `REQUIREMENTS.md` `UI-001`; platform conventions                            | `docs/design/PLATFORM-ARCHITECTURE.md` § themes             | ADR-0017 (planned)                  | to be written: `scripts/check-design-tokens.mjs::system_appearance_uses_the_same_tokens`                                                                                                      | T1-ANDROID-BETA       | T1–T5        | Planned        |
| PLAT-122       | `REQUIREMENTS.md` `LOBBY-023`                                               | `docs/design/PLATFORM-ARCHITECTURE.md` § navigation         | —                                   | to be written: `apps/android/app/src/test/kotlin/de/phomu/BackNavigationTest.kt::back_from_game_asks_for_confirmation`                                                                        | T1-ANDROID-ALPHA      | T1, T2, T4   | Planned        |

## 5. Matrix — BRIDGE (the FFI bridge)

| Requirement ID | Source                                                               | Design (document)                                    | ADR                                   | Test (path/name)                                                                                                         | Acceptance (document) | Track | Status  |
| -------------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------- | ----- | ------- |
| BRIDGE-101     | Programme directive                                                  | `docs/design/PLATFORM-ARCHITECTURE.md` § bridge      | ADR-0022 (planned) — UniFFI           | to be written: `scripts/check-ffi-surface.mjs::only_generated_bindings_exist`                                            | T1-ANDROID-ALPHA      | All   | Planned |
| BRIDGE-102     | `REL-115`; `BRIDGE-103`                                              | `docs/design/BUILD-CONTRACT.md` § bridge             | ADR-0022 (planned)                    | to be written: `crates/phomu-bridge/tests/api_version.rs::bindings_carry_the_api_version`                                | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-103     | `BRIDGE-102`                                                         | `docs/design/BUILD-CONTRACT.md` § bridge             | ADR-0022 (planned)                    | to be written: `crates/phomu-bridge/tests/api_version.rs::mismatched_version_refuses_to_start`                           | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-104     | `REQUIREMENTS.md` `SEC-018`                                          | `docs/design/PLATFORM-ARCHITECTURE.md` § error model | ADR-0010 (planned)                    | to be written: `crates/phomu-bridge/tests/error_mapping.rs::core_errors_map_one_to_one`; `::panic_becomes_a_typed_error` | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-105     | `QUALITY.md` § 3; `BEST_IN_CLASS.md` § 2                             | `docs/design/PLATFORM-ARCHITECTURE.md` § threading   | ADR-0023 (planned) — threading model  | to be written: `crates/phomu-bridge/tests/threading.rs::long_operations_do_not_block_the_caller`                         | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-106     | `PLAT-112`                                                           | `docs/design/PLATFORM-ARCHITECTURE.md` § threading   | ADR-0023 (planned)                    | to be written: `crates/phomu-bridge/tests/cancellation.rs::cancelled_operation_delivers_no_callback`                     | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-107     | `REQUIREMENTS.md` `UI-015`                                           | `docs/design/GAME-CONTRACT.md` § 2.3                 | —                                     | to be written: `crates/phomu-bridge/tests/event_order.rs::events_arrive_in_the_documented_order`                         | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-108     | `REQUIREMENTS.md` `CORE-005`, `MEDIA-015`; `LLM.md:37-39`; `GAP-027` | `docs/design/GAME-CONTRACT.md` § 3                   | ADR-0007 (planned)                    | to be written: `crates/phomu-bridge/tests/payload.rs::payload_before_reveal_carries_no_identity`                         | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-109     | `SHELL-115`; `CORE-110`                                              | `docs/design/PLATFORM-ARCHITECTURE.md` § data flow   | ADR-0009 (planned)                    | to be written: `scripts/check-no-duplicate-rules.mjs::no_catalogue_field_access_in_shells`                               | T1-ANDROID-ALPHA      | All   | Planned |
| BRIDGE-110     | `CORE-103`                                                           | `docs/design/BUILD-CONTRACT.md` § bridge             | ADR-0022 (planned)                    | to be written: `crates/phomu-bridge/tests/compatibility.rs::previous_payload_version_is_readable`                        | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-111     | `CORE-114`                                                           | `docs/design/PLATFORM-ARCHITECTURE.md` § bridge      | ADR-0022 (planned)                    | to be written: `scripts/check-ffi-surface.mjs::exported_set_identical_on_all_platforms`                                  | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-112     | `PERF-110`                                                           | `docs/design/BUILD-CONTRACT.md` § benchmarks         | ADR-0023 (planned)                    | to be written: `crates/phomu-bridge/benches/round_transition.rs::bridge_overhead`                                        | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-113     | `NFR-003`                                                            | `docs/design/BUILD-CONTRACT.md` § CI                 | ADR-0018 (planned)                    | to be written: `crates/phomu-bridge/tests/host_only.rs::runs_without_a_device`                                           | T1-ANDROID-ALPHA      | All   | Planned |
| BRIDGE-114     | `REQUIREMENTS.md` `NFR-016`                                          | `docs/design/BUILD-CONTRACT.md` § codegen            | ADR-0022 (planned)                    | to be written: `scripts/check-generated-bindings.sh::generated_files_are_up_to_date`                                     | T1-ANDROID-ALPHA      | All   | Planned |
| BRIDGE-115     | `PERF-105`                                                           | `docs/design/PLATFORM-ARCHITECTURE.md` § bridge      | ADR-0023 (planned)                    | to be written: `crates/phomu-bridge/tests/soak.rs::live_objects_stay_bounded_over_200_rounds`                            | T1-ANDROID-BETA       | All   | Planned |
| BRIDGE-116     | `REL-113`; `OPEN-06`                                                 | `docs/design/BUILD-CONTRACT.md` § toolchain          | ADR-0024 (planned) — minimum versions | to be written: `scripts/check-reproducible-build.sh::same_source_same_hash`                                              | T1-ANDROID-ALPHA      | All   | Planned |

## 6. Matrix — REL (the release process)

| Requirement ID | Source                                                                            | Design (document)                                                          | ADR                                             | Test (path/name)                                                            | Acceptance (document) | Track        | Status  |
| -------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- | --------------------- | ------------ | ------- |
| REL-101        | Programme directive (binding order)                                               | `docs/releases/RELEASE-PLAN.md`                                            | ADR-0025 (planned) — track order                | — (acceptance order check only)                                             | all track documents   | All          | Planned |
| REL-102        | Programme directive                                                               | `docs/releases/RELEASE-PLAN.md`                                            | ADR-0025 (planned)                              | — (acceptance phase field only)                                             | all track documents   | All          | Planned |
| REL-103        | `QUALITY.md` § 9                                                                  | `docs/releases/RELEASE-PLAN.md` § gates                                    | ADR-0025 (planned)                              | — (acceptance checklist only)                                               | T1-ANDROID-ALPHA      | All          | Planned |
| REL-104        | `QUALITY.md` § 9; `BEST_IN_CLASS.md`                                              | `docs/releases/RELEASE-PLAN.md` § gates                                    | ADR-0025 (planned)                              | — (acceptance checklist only)                                               | T1-ANDROID-BETA       | All          | Planned |
| REL-105        | `QUALITY.md` § 9                                                                  | `docs/releases/RELEASE-PLAN.md` § gates                                    | ADR-0025 (planned)                              | — (acceptance checklist only)                                               | T1-ANDROID-STABLE     | All          | Planned |
| REL-106        | `QUALITY.md` § 9; `docs/acceptance/ACCEPTANCE_TEMPLATE.md`                        | `docs/spec/SRS.md` § 6                                                     | ADR-0025 (planned)                              | — (acceptance file listing only)                                            | all track documents   | All          | Planned |
| REL-107        | `SEC-004` (key custody principle)                                                 | `docs/releases/RELEASE-PLAN.md` § signing                                  | ADR-0026 (planned) — key custody                | to be written: `scripts/check-signature.sh::android_artefact_is_signed`     | T1-ANDROID-BETA       | T1, T2       | Planned |
| REL-108        | `CORE-002`; `docs/licensing/APPLE-LICENSING.md` (draft decision basis, `D1`…`D8`) | `docs/licensing/APPLE-LICENSING.md`; `docs/releases/RELEASE-PLAN.md` § 7.5 | ADR-0015 (planned) — iOS distribution (OPEN-01) | — (acceptance notarisation log only)                                        | T4-IOS-BETA           | T4           | Planned |
| REL-109        | `CORE-002`; platform conventions                                                  | `docs/design/BUILD-CONTRACT.md` § signing                                  | ADR-0026 (planned)                              | to be written: `scripts/check-signature.sh::desktop_artefacts_are_signed`   | T3-DESKTOP-BETA       | T3a, T3b, T5 | Planned |
| REL-110        | Programme directive (track 2)                                                     | `docs/releases/RELEASE-PLAN.md` § stores                                   | ADR-0027 (planned) — TV stores                  | — (acceptance submission record only)                                       | T2-TV-BETA            | T2           | Planned |
| REL-111        | Store policies; `I18N-001`                                                        | `docs/releases/RELEASE-PLAN.md` § stores                                   | ADR-0027 (planned)                              | — (acceptance listing checklist only)                                       | T1-ANDROID-BETA       | All          | Planned |
| REL-112        | `CORE-011`; `PRIVACY.md`; `SEC-012`                                               | `docs/releases/RELEASE-PLAN.md` § stores                                   | ADR-0028 (planned) — data-safety declaration    | — (acceptance declaration + capture only)                                   | T1-ANDROID-BETA       | All          | Planned |
| REL-113        | `REQUIREMENTS.md` `NFR-016`                                                       | `docs/design/BUILD-CONTRACT.md` § toolchain                                | ADR-0024 (planned)                              | to be written: `scripts/check-reproducible-build.sh::same_source_same_hash` | T1-ANDROID-ALPHA      | All          | Planned |
| REL-114        | `REQUIREMENTS.md` `NFR-005`, `NFR-012`                                            | `docs/design/BUILD-CONTRACT.md` § CI                                       | ADR-0018 (planned)                              | to be written: `.github/workflows/ci.yml::matrix_includes_every_track`      | T1-ANDROID-ALPHA      | All          | Planned |
| REL-115        | `BRIDGE-102`, `BRIDGE-103`                                                        | `docs/releases/RELEASE-PLAN.md` § versioning                               | ADR-0029 (planned) — version scheme             | — (acceptance version table only)                                           | all track documents   | All          | Planned |
| REL-116        | `REQUIREMENTS.md` `I18N-001`                                                      | `docs/releases/RELEASE-PLAN.md` § notes                                    | —                                               | — (acceptance release notes only)                                           | all track documents   | All          | Planned |
| REL-117        | `QUALITY.md` § 9                                                                  | `docs/releases/RELEASE-PLAN.md` § rollout                                  | ADR-0027 (planned)                              | — (acceptance rehearsal record only)                                        | T1-ANDROID-STABLE     | All          | Planned |
| REL-118        | `CORE-002`, `CORE-011`; store policies                                            | `docs/releases/RELEASE-PLAN.md` § stores                                   | ADR-0028 (planned)                              | — (acceptance signed checklist only)                                        | T1-ANDROID-BETA       | All          | Planned |

## 7. Matrix — A11Y (accessibility)

| Requirement ID | Source                                             | Design (document)                                      | ADR                | Test (path/name)                                                                                                                                            | Acceptance (document) | Track            | Status  |
| -------------- | -------------------------------------------------- | ------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------- | ------- |
| A11Y-101       | `BEST_IN_CLASS.md` § 5                             | `docs/design/PLATFORM-ARCHITECTURE.md` § accessibility | ADR-0017 (planned) | — (acceptance assessment result only)                                                                                                                       | T1-ANDROID-BETA       | All              | Planned |
| A11Y-102       | `BEST_IN_CLASS.md` § 5                             | `docs/design/PLATFORM-ARCHITECTURE.md` § design tokens | ADR-0017 (planned) | to be written: `scripts/check-contrast.mjs::no_violation_below_the_target`                                                                                  | T1-ANDROID-BETA       | All              | Planned |
| A11Y-103       | `REQUIREMENTS.md` `UI-013`; `BEST_IN_CLASS.md` § 6 | `docs/design/PLATFORM-ARCHITECTURE.md` § navigation    | ADR-0013 (planned) | to be written: `apps/tv/app/src/test/kotlin/de/phomu/tv/FocusOrderTest.kt::focus_order_is_linear`                                                           | T2-TV-BETA            | All              | Planned |
| A11Y-104       | `REQUIREMENTS.md` `UI-011`; `QUALITY.md` § 4       | `docs/design/PLATFORM-ARCHITECTURE.md` § layout        | ADR-0013 (planned) | — (acceptance target-size table only)                                                                                                                       | T2-TV-BETA            | All              | Planned |
| A11Y-105       | `BEST_IN_CLASS.md` § 6 (no `role=` in `src/`)      | `docs/design/PLATFORM-ARCHITECTURE.md` § accessibility | ADR-0017 (planned) | — (acceptance screen-reader recording only)                                                                                                                 | T1-ANDROID-BETA       | All              | Planned |
| A11Y-106       | `REQUIREMENTS.md` `UI-014`, `UI-015`               | `docs/design/PLATFORM-ARCHITECTURE.md` § motion        | ADR-0017 (planned) | to be written: `apps/android/app/src/test/kotlin/de/phomu/ReducedMotionTest.kt::animations_are_disabled_when_preferred`                                     | T1-ANDROID-BETA       | All              | Planned |
| A11Y-107       | `REQUIREMENTS.md` `UI-013`; `BEST_IN_CLASS.md` § 6 | `docs/design/PLATFORM-ARCHITECTURE.md` § navigation    | ADR-0013 (planned) | to be written: `apps/desktop/tests/keyboard_journey.rs::core_journey_with_keyboard_only`; `apps/tv/.../RemoteNavigationTest.kt::core_journey_without_touch` | T3-DESKTOP-BETA       | T2, T3a, T3b, T5 | Planned |
| A11Y-108       | `QUALITY.md` § 4                                   | `docs/design/PLATFORM-ARCHITECTURE.md` § layout        | —                  | — (acceptance scaling walkthrough only)                                                                                                                     | T1-ANDROID-BETA       | All              | Planned |
| A11Y-109       | `REQUIREMENTS.md` `LOBBY-006` (teams)              | `docs/design/PLATFORM-ARCHITECTURE.md` § design tokens | ADR-0017 (planned) | — (acceptance greyscale walkthrough only)                                                                                                                   | T1-ANDROID-BETA       | All              | Planned |
| A11Y-110       | `REQUIREMENTS.md` `NFR-005`                        | `docs/design/BUILD-CONTRACT.md` § CI                   | ADR-0018 (planned) | to be written: `scripts/check-contrast.mjs::runs_in_ci`                                                                                                     | T1-ANDROID-BETA       | All              | Planned |

## 8. Matrix — PERF (performance budgets)

| Requirement ID | Source                              | Design (document)                                                                                           | ADR                                    | Test (path/name)                                                                                                            | Acceptance (document) | Track      | Status  |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------- | ------- |
| PERF-101       | `BEST_IN_CLASS.md` § 1              | `docs/design/BUILD-CONTRACT.md` § benchmarks; `docs/releases/RELEASE-PLAN.md` § reference devices (OPEN-07) | ADR-0030 (planned) — reference devices | — (acceptance measurement only)                                                                                             | T1-ANDROID-BETA       | All        | Planned |
| PERF-102       | `BEST_IN_CLASS.md` § 1              | `docs/design/BUILD-CONTRACT.md` § benchmarks                                                                | ADR-0030 (planned)                     | — (acceptance measurement only)                                                                                             | T1-ANDROID-BETA       | All        | Planned |
| PERF-103       | `BEST_IN_CLASS.md` § 2              | `docs/design/BUILD-CONTRACT.md` § benchmarks                                                                | ADR-0030 (planned)                     | to be written: `crates/phomu-core/benches/round_transition.rs::drawing_to_question`                                         | T1-ANDROID-BETA       | All        | Planned |
| PERF-104       | `BEST_IN_CLASS.md` § 2              | `docs/design/BUILD-CONTRACT.md` § benchmarks                                                                | ADR-0030 (planned)                     | to be written: `crates/phomu-core/benches/round_transition.rs::reveal_to_next_round`                                        | T1-ANDROID-BETA       | All        | Planned |
| PERF-105       | `BEST_IN_CLASS.md` § 3              | `docs/design/BUILD-CONTRACT.md` § benchmarks                                                                | ADR-0030 (planned)                     | — (acceptance measurement only)                                                                                             | T1-ANDROID-BETA       | All        | Planned |
| PERF-106       | `BEST_IN_CLASS.md` § 3              | `docs/design/BUILD-CONTRACT.md` § artefacts                                                                 | ADR-0009 (planned)                     | to be written: `scripts/check-artefact-size.sh::artefact_within_budget`                                                     | T1-ANDROID-BETA       | All        | Planned |
| PERF-107       | `BEST_IN_CLASS.md` § 3; `SHELL-116` | `docs/design/BUILD-CONTRACT.md` § catalogue artefact                                                        | ADR-0009 (planned)                     | — (acceptance strategy decision only)                                                                                       | T1-ANDROID-ALPHA      | All        | Planned |
| PERF-108       | `QUALITY.md` § 3                    | `docs/design/BUILD-CONTRACT.md` § benchmarks                                                                | ADR-0030 (planned)                     | — (acceptance frame measurement only)                                                                                       | T2-TV-BETA            | T1, T2, T4 | Planned |
| PERF-109       | `QUALITY.md` § 3; `BRIDGE-105`      | `docs/design/PLATFORM-ARCHITECTURE.md` § threading                                                          | ADR-0023 (planned)                     | to be written: `apps/android/app/src/test/kotlin/de/phomu/ResponsivenessTest.kt::ui_stays_responsive_during_catalogue_load` | T1-ANDROID-BETA       | All        | Planned |
| PERF-110       | `BRIDGE-112`                        | `docs/design/BUILD-CONTRACT.md` § benchmarks                                                                | ADR-0030 (planned)                     | to be written: `crates/phomu-bridge/benches/round_transition.rs::bridge_overhead`                                           | T1-ANDROID-BETA       | All        | Planned |
| PERF-111       | `PERF-105`; `PLAT-105`              | `docs/design/BUILD-CONTRACT.md` § benchmarks                                                                | ADR-0030 (planned)                     | — (acceptance power measurement only)                                                                                       | T1-ANDROID-BETA       | T1, T2, T4 | Planned |
| PERF-112       | `REQUIREMENTS.md` `NFR-005`         | `docs/design/BUILD-CONTRACT.md` § CI                                                                        | ADR-0018 (planned)                     | to be written: `scripts/check-perf-regression.sh::no_regression_beyond_tolerance`                                           | T1-ANDROID-BETA       | All        | Planned |

---

## 9. Coverage summary

The classification counts the **primary verification** of each requirement —
the first entry of the _Test_ column. Six requirements carry an existing
verification from the web application; of those, five additionally name a test
that still has to be written for the native tracks.

| Domain    | Requirements | With an existing verification | With a test to be written | Verified by acceptance only | Without an acceptance document |
| --------- | -----------: | ----------------------------: | ------------------------: | --------------------------: | -----------------------------: |
| `CORE`    |           16 |                             0 |                        16 |                           0 |                             16 |
| `SHELL`   |           20 |                             2 |                        17 |                           1 |                             20 |
| `PLAT`    |           22 |                             4 |                        13 |                           5 |                             22 |
| `BRIDGE`  |           16 |                             0 |                        16 |                           0 |                             16 |
| `REL`     |           18 |                             0 |                         4 |                          14 |                             18 |
| `A11Y`    |           10 |                             0 |                         5 |                           5 |                             10 |
| `PERF`    |           12 |                             0 |                         6 |                           6 |                             12 |
| **Total** |      **114** |                         **6** |                    **77** |                      **31** |                        **114** |

The six requirements with an existing verification are `SHELL-102`,
`SHELL-110`, `PLAT-102`, `PLAT-108`, `PLAT-115` and `PLAT-117`. In every one of
them the existing part covers the **web shell**; the native part still needs
the test named in the matrix.

The 31 requirements verified by acceptance only are process, policy and
documentation requirements — an acceptance checklist is the correct instrument
for them. They are listed in § 10.6.

---

## 10. Requirements without a test

Every requirement of this baseline still lacks an executable test, except the
four that are already covered by the web application. The list below is ordered
by priority: what has to exist first, what can wait for its track.

### 10.1 Priority 1 — the foundation of the core (blocks every track)

| Requirement  | Planned test                                                                               | Why it is first                                                        |
| ------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `CORE-101`   | `crates/phomu-core/tests/mode_registry.rs::every_mode_has_exactly_one_rule_implementation` | Without it the whole programme produces six divergent games            |
| `CORE-103`   | `crates/phomu-core/tests/determinism.rs::same_seed_and_inputs_produce_identical_state`     | The state is persisted on six platforms; determinism is its foundation |
| `CORE-105`   | `crates/phomu-core/tests/phase_machine.rs::transition_table_matches_game_contract`         | The phase automaton is the backbone of the game                        |
| `CORE-107`   | `crates/phomu-core/tests/scoring.rs::points_per_mode_match_the_game_contract`              | The scoring is the part players argue about                            |
| `CORE-106`   | `crates/phomu-core/tests/anti_spoiler.rs::display_view_omits_identity_before_reveal`       | The product promise; it must be enforceable once, in the core          |
| `BRIDGE-108` | `crates/phomu-bridge/tests/payload.rs::payload_before_reveal_carries_no_identity`          | The same promise at the boundary                                       |
| `CORE-111`   | `crates/phomu-core/tests/error_contract.rs::every_public_error_is_a_typed_variant`         | The error model is used by every shell                                 |
| `BRIDGE-104` | `crates/phomu-bridge/tests/error_mapping.rs::core_errors_map_one_to_one`                   | The error model at the boundary                                        |

### 10.2 Priority 2 — the bridge contract (blocks every shell)

| Requirement  | Planned test                                                                          |
| ------------ | ------------------------------------------------------------------------------------- |
| `BRIDGE-101` | `scripts/check-ffi-surface.mjs::only_generated_bindings_exist`                        |
| `BRIDGE-102` | `crates/phomu-bridge/tests/api_version.rs::bindings_carry_the_api_version`            |
| `BRIDGE-103` | `crates/phomu-bridge/tests/api_version.rs::mismatched_version_refuses_to_start`       |
| `BRIDGE-105` | `crates/phomu-bridge/tests/threading.rs::long_operations_do_not_block_the_caller`     |
| `BRIDGE-106` | `crates/phomu-bridge/tests/cancellation.rs::cancelled_operation_delivers_no_callback` |
| `BRIDGE-107` | `crates/phomu-bridge/tests/event_order.rs::events_arrive_in_the_documented_order`     |
| `BRIDGE-110` | `crates/phomu-bridge/tests/compatibility.rs::previous_payload_version_is_readable`    |
| `BRIDGE-111` | `scripts/check-ffi-surface.mjs::exported_set_identical_on_all_platforms`              |
| `BRIDGE-113` | `crates/phomu-bridge/tests/host_only.rs::runs_without_a_device`                       |
| `BRIDGE-114` | `scripts/check-generated-bindings.sh::generated_files_are_up_to_date`                 |
| `BRIDGE-115` | `crates/phomu-bridge/tests/soak.rs::live_objects_stay_bounded_over_200_rounds`        |
| `BRIDGE-112` | `crates/phomu-bridge/benches/round_transition.rs::bridge_overhead`                    |

### 10.3 Priority 3 — the data path (blocks the first track)

| Requirement  | Planned test                                                                              |
| ------------ | ----------------------------------------------------------------------------------------- |
| `CORE-104`   | `crates/phomu-core/tests/config.rs::config_exposes_the_game_constants`                    |
| `CORE-108`   | `crates/phomu-core/tests/song_picker.rs::pack_filter_selects_only_matching_songs`         |
| `CORE-109`   | `crates/phomu-core/tests/censor.rs::hint_containing_the_artist_is_censored`               |
| `CORE-110`   | `crates/phomu-core/tests/catalogue.rs::core_and_web_validator_agree_on_the_same_artefact` |
| `CORE-113`   | `crates/phomu-core/tests/randomness.rs::seeded_draw_is_reproducible`                      |
| `CORE-102`   | `crates/phomu-core/tests/no_ui_dependencies.rs::core_depends_on_no_ui_crate`              |
| `CORE-112`   | `crates/phomu-core/tests/error_contract.rs::core_api_exposes_no_io_entry_point`           |
| `CORE-114`   | `scripts/check-core-api-surface.sh::api_surface_matches_baseline`                         |
| `CORE-115`   | `scripts/check-no-telemetry.sh::no_telemetry_dependency_in_artefact`                      |
| `CORE-116`   | `scripts/check-license-metadata.sh::licence_declared_everywhere`                          |
| `SHELL-115`  | `crates/phomu-core/tests/catalogue.rs::artefact_hash_is_verified_on_load`                 |
| `SHELL-116`  | `crates/phomu-core/tests/catalogue.rs::bundled_snapshot_needs_no_network`                 |
| `SHELL-111`  | `crates/phomu-core/tests/persistence.rs::session_survives_a_restart`                      |
| `BRIDGE-109` | `scripts/check-no-duplicate-rules.mjs::no_catalogue_field_access_in_shells`               |

### 10.4 Priority 4 — the shell parity and the platform behaviour (per track)

| Requirement              | Planned test                                                                                                  | Track        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------ |
| `SHELL-101`, `SHELL-114` | `scripts/check-no-duplicate-rules.mjs::no_rule_outside_the_core`                                              | All          |
| `SHELL-103`              | `apps/android/app/src/test/kotlin/de/phomu/RoundJourneyTest.kt::completes_one_round`                          | T1           |
| `SHELL-104`              | `apps/tv/app/src/test/kotlin/de/phomu/tv/RemoteNavigationTest.kt::completes_one_round_with_dpad_only`         | T2           |
| `SHELL-105`              | `apps/desktop/tests/core_journey.rs::completes_one_round`                                                     | T3a, T3b     |
| `SHELL-106`              | `apps/ios/PhomuTests/CoreJourneyTests.swift::completesOneRound`                                               | T4           |
| `SHELL-107`              | `apps/windows/tests/core_journey.rs::completes_one_round`                                                     | T5           |
| `SHELL-108`              | `crates/phomu-core/tests/mode_registry.rs::shell_mode_lists_match_the_core`                                   | All          |
| `SHELL-109`              | `scripts/check-design-tokens.mjs::token_tables_are_identical`                                                 | All          |
| `SHELL-110`              | `scripts/check-i18n-parity.mjs::key_sets_match_across_shells`                                                 | All          |
| `SHELL-112`              | `crates/phomu-core/tests/lobby.rs::lobby_validation_matches_the_contract`                                     | All          |
| `SHELL-113`              | `crates/phomu-core/tests/settings.rs::settings_change_applies_from_the_next_round`                            | All          |
| `SHELL-117`              | `crates/phomu-core/tests/anti_spoiler.rs::projector_view_is_spoiler_free`                                     | All          |
| `SHELL-119`              | `scripts/check-i18n-parity.mjs::every_error_code_exists_in_every_shell`                                       | All          |
| `SHELL-120`              | per-shell journey test (path per shell)                                                                       | All          |
| `PLAT-103`               | `apps/tv/app/src/test/kotlin/de/phomu/tv/RemoteNavigationTest.kt::core_journey_without_touch`                 | T2           |
| `PLAT-104`               | `apps/desktop/tests/keyboard_journey.rs::core_journey_with_keyboard_only`                                     | T3a, T3b, T5 |
| `PLAT-106`               | `crates/phomu-core/tests/persistence.rs::session_survives_a_restart` + shell lifecycle test                   | All          |
| `PLAT-107`               | `apps/android/app/src/test/kotlin/de/phomu/PermissionRequestTest.kt::camera_is_requested_only_in_the_scanner` | T1           |
| `PLAT-108`               | native permission test                                                                                        | T1, T4       |
| `PLAT-109`               | `scripts/check-permission-manifest.sh::no_permission_beyond_camera_and_network`                               | All          |
| `PLAT-110`               | `scripts/check-permission-manifest.sh` (storage part)                                                         | All          |
| `PLAT-112`               | per-shell lifecycle test                                                                                      | All          |
| `PLAT-113`               | `crates/phomu-core/tests/persistence.rs::session_survives_a_restart`                                          | All          |
| `PLAT-114`               | per-shell layout test                                                                                         | All          |
| `PLAT-115`               | `crates/phomu-core/tests/qr_intent.rs::pack_intent_is_accepted_and_unknown_packs_are_rejected`                | All          |
| `PLAT-116`               | `apps/android/app/src/test/kotlin/de/phomu/QrScannerTest.kt::scan_applies_the_pack_intent`                    | T1, T4       |
| `PLAT-118`               | `scripts/check-no-telemetry.sh`                                                                               | All          |
| `PLAT-121`               | `scripts/check-design-tokens.mjs::system_appearance_uses_the_same_tokens`                                     | T1–T5        |
| `PLAT-122`               | `apps/android/app/src/test/kotlin/de/phomu/BackNavigationTest.kt::back_from_game_asks_for_confirmation`       | T1, T2, T4   |
| `PLAT-102`               | native measurement in the shell suites                                                                        | T1, T4       |

### 10.5 Priority 5 — accessibility, performance and release (per track, before Beta)

| Requirement  | Planned test                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `A11Y-102`   | `scripts/check-contrast.mjs::no_violation_below_the_target`                                                                                  |
| `A11Y-103`   | `apps/tv/app/src/test/kotlin/de/phomu/tv/FocusOrderTest.kt::focus_order_is_linear`                                                           |
| `A11Y-106`   | `apps/android/app/src/test/kotlin/de/phomu/ReducedMotionTest.kt::animations_are_disabled_when_preferred`                                     |
| `A11Y-107`   | `apps/desktop/tests/keyboard_journey.rs::core_journey_with_keyboard_only`; `apps/tv/.../RemoteNavigationTest.kt::core_journey_without_touch` |
| `A11Y-110`   | `scripts/check-contrast.mjs::runs_in_ci`                                                                                                     |
| `PERF-103`   | `crates/phomu-core/benches/round_transition.rs::drawing_to_question`                                                                         |
| `PERF-104`   | `crates/phomu-core/benches/round_transition.rs::reveal_to_next_round`                                                                        |
| `PERF-106`   | `scripts/check-artefact-size.sh::artefact_within_budget`                                                                                     |
| `PERF-109`   | `apps/android/app/src/test/kotlin/de/phomu/ResponsivenessTest.kt::ui_stays_responsive_during_catalogue_load`                                 |
| `PERF-110`   | `crates/phomu-bridge/benches/round_transition.rs::bridge_overhead`                                                                           |
| `PERF-112`   | `scripts/check-perf-regression.sh::no_regression_beyond_tolerance`                                                                           |
| `REL-107`    | `scripts/check-signature.sh::android_artefact_is_signed`                                                                                     |
| `REL-109`    | `scripts/check-signature.sh::desktop_artefacts_are_signed`                                                                                   |
| `REL-113`    | `scripts/check-reproducible-build.sh::same_source_same_hash`                                                                                 |
| `REL-114`    | `.github/workflows/ci.yml::matrix_includes_every_track`                                                                                      |
| `BRIDGE-116` | `scripts/check-reproducible-build.sh::same_source_same_hash`                                                                                 |

### 10.6 Requirements verified by acceptance only (no executable test planned)

These 31 requirements are process, policy or documentation requirements. They
are verified by a reviewer during the track acceptance, using the template of
[`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md).
That is deliberate — an acceptance checklist is the correct instrument for a
process requirement. They are listed here so that the absence of a test is
visible and not mistaken for an oversight.

`SHELL-118`, `PLAT-101`, `PLAT-105`, `PLAT-111`, `PLAT-119`, `PLAT-120`,
`REL-101`, `REL-102`, `REL-103`, `REL-104`, `REL-105`, `REL-106`, `REL-108`,
`REL-110`, `REL-111`, `REL-112`, `REL-115`, `REL-116`, `REL-117`, `REL-118`,
`A11Y-101`, `A11Y-104`, `A11Y-105`, `A11Y-108`, `A11Y-109`, `PERF-101`,
`PERF-102`, `PERF-105`, `PERF-107`, `PERF-108`, `PERF-111`.

---

## 11. Requirements without an acceptance document

**All 114 requirements** lack an acceptance document today. The
`docs/acceptance/` folder currently contains only
[`M0-ACCEPTANCE.md`](../acceptance/M0-ACCEPTANCE.md), which covers the web
baseline (`NFR-009`, `NFR-011`, `I18N-007`, `CORE-003`) and not the platform
requirements.

The planned documents are listed in § 1.1. The order in which they have to be
produced follows the track order (`REL-101`):

| Priority | Document                                                     | Requirements it closes                                                                                                                                                                        | Depends on                                                                                                |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1        | `docs/acceptance/T1-ANDROID-ALPHA-ACCEPTANCE.md`             | `CORE-101`…`CORE-116`, `SHELL-101`, `SHELL-111`…`SHELL-116`, `SHELL-120`, `PLAT-101`, `PLAT-106`, `PLAT-111`…`PLAT-118`, `BRIDGE-101`…`BRIDGE-116`, `REL-101`…`REL-106`, `REL-113`, `REL-114` | the core and the bridge exist                                                                             |
| 2        | `docs/acceptance/T0-WEB-REGRESSION-ACCEPTANCE.md`            | `SHELL-102` and the regression evidence for the web track (§ 8.6 of the SRS)                                                                                                                  | the web shell is connected to the core                                                                    |
| 3        | `docs/acceptance/T1-ANDROID-BETA-ACCEPTANCE.md`              | the accessibility, performance and privacy requirements of the Android track                                                                                                                  | Alpha accepted                                                                                            |
| 4        | `docs/acceptance/T2-TV-ALPHA-ACCEPTANCE.md`                  | `SHELL-104`, `PLAT-103`, `A11Y-103`, `A11Y-107`                                                                                                                                               | the TV shell exists                                                                                       |
| 5        | `docs/acceptance/T2-TV-BETA-ACCEPTANCE.md`                   | the remaining TV requirements                                                                                                                                                                 | Alpha accepted                                                                                            |
| 6        | `docs/acceptance/T1-ANDROID-STABLE-ACCEPTANCE.md`            | the store, signing and rollback requirements of the Android track                                                                                                                             | Beta accepted                                                                                             |
| 7        | `docs/acceptance/T3-DESKTOP-ALPHA-ACCEPTANCE.md` … `-STABLE` | the desktop requirements                                                                                                                                                                      | OPEN-03 decided                                                                                           |
| 8        | `docs/acceptance/T4-IOS-ALPHA-ACCEPTANCE.md` … `-STABLE`     | the iOS requirements                                                                                                                                                                          | **OPEN-01 decided** (the licensing document exists as a draft decision basis; the owner has to ratify it) |
| 9        | `docs/acceptance/T5-WINDOWS-ALPHA-ACCEPTANCE.md` … `-STABLE` | the Windows requirements                                                                                                                                                                      | track 4 finished                                                                                          |

### 11.1 The three gaps that block the most requirements

| Gap                                                                                                                                           | Requirements blocked                                                                      | What closes it                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The acceptance template has no section for the native tracks (no permission list, no network capture, no signature evidence, no store record) | all `PLAT-*`, `REL-107`…`REL-118`, `A11Y-*`                                               | An extension of [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md) with the five native sections — a task for the QA role, referenced from `REL-106` |
| The reference devices are undefined                                                                                                           | `PERF-101`, `PERF-105`, `PERF-108`, `PERF-111`                                            | OPEN-07, decided in [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md)                                                                                                 |
| The design documents of the parallel work do not exist yet                                                                                    | every row whose _Design_ cell points to `PLATFORM-ARCHITECTURE.md` or `BUILD-CONTRACT.md` | the architect's delivery; until then the paths in the _Test_ column are placeholders (assumption A-01 in the SRS)                                                                |

---

## 12. Change log of this baseline

| Date       | Change                                                                                                                                                                           | Evidence                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-25 | Baseline P-1 created: 114 requirements mapped; 6 with an existing verification, 77 with a test to be written, 31 verified by acceptance only; 114 without an acceptance document | `npx vitest run` → 10 files / 97 tests green; `node scripts/check-i18n-completeness.mjs --count` → 0 literals in 48 files |
