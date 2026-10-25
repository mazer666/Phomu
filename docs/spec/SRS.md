# Phomu Software Requirements Specification — Multi-Platform Extension

**Document version:** 1.0
**Status:** Draft for owner review — binding on the specification of the platform extension, not on the product behaviour
**Baseline:** Requirements baseline P-1 ([`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md))
**Date:** 2026-10-25
**Repository state:** commit `3d3d011`, branch `main`

> **Scope note.** This document specifies the **extension of Phomu into a family of
> applications on a shared Rust base**. It does not restate the product behaviour;
> that is specified in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) baseline 0.1
> and stays untouched by this programme. Where this document refers to a
> behaviour, it refers to the requirement ID.

---

## 1. Introduction

### 1.1 Purpose

Phomu is today a single Next.js web application. The programme described in this
specification turns it into a **family of applications** that share **one Rust
base** and carry platform-specific frontends. The purpose of this SRS is to
state, in one place:

- what the extension must achieve and how that is measured (§ 2),
- in which environment the product is used and with which neighbouring systems it
  interacts (§ 3),
- what the extension consists of, which constraints apply and which requirements
  it inherits (§ 4),
- which external interfaces are created or extended (§ 6),
- which non-functional properties the extension must hold (§ 7),
- which data the extension uses (§ 8),
- how the user interface differs per platform (§ 9),
- which limits the extension is subject to (§ 10),
- and where every requirement can be traced to a test and an acceptance (§ 11).

The requirement bodies themselves live in
[`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md); this document refers to
them by ID and does not repeat them.

### 1.2 Scope

**In scope**

| Item               | Detail                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Shared Rust base   | Game rules, mode logic, scoring, catalogue model, catalogue selection, hint censorship, typed errors (`CORE-101` … `CORE-116`) |
| Shells             | Web (existing), Android phone/tablet, Google TV / Fire TV, macOS/Linux, iPadOS/iOS, Windows (`SHELL-101` … `SHELL-120`)        |
| Platform behaviour | Input model, screen behaviour, permissions, storage, lifecycle, deep links, network policy (`PLAT-101` … `PLAT-122`)           |
| FFI bridge         | UniFFI surface, versioning, error mapping, threading, cancellation, payload discipline (`BRIDGE-101` … `BRIDGE-116`)           |
| Release process    | Track order, Alpha/Beta/Stable, gates, signing, store submission, rollbacks (`REL-101` … `REL-118`)                            |
| Accessibility      | WCAG 2.1 AA across all shells (`A11Y-101` … `A11Y-110`)                                                                        |
| Performance        | Budgets per track with measurement methods (`PERF-101` … `PERF-112`)                                                           |

**Out of scope** — owned by other roles, referenced but not duplicated:

| Item                                                                               | Owner document                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer and dependency direction of the existing web application                     | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md), [`../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`](../adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md) |
| Structure of the platform architecture and the build chain                         | `docs/design/PLATFORM-ARCHITECTURE.md`, `docs/design/BUILD-CONTRACT.md` — written in parallel by the architect                                                         |
| Round flow, modes, anti-spoiler boundary, provider contracts                       | [`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md)                                                                                                             |
| Release calendar, gates, versioning, signing profile, store timelines              | [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md) — **binding**, written in parallel                                                                        |
| Apple distribution and licence conditions                                          | [`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md) — written in parallel; a draft decision basis, the owner has not ratified it                      |
| Product behaviour: modes, scoring, lobby, media, catalogue, security, NFR baseline | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) — unchanged                                                                                                           |
| Acceptance evidence per milestone                                                  | [`../acceptance/`](../acceptance/)                                                                                                                                     |

**Explicitly not decided here:** the Apple licence question. It is referenced
(`REL-108`, `SHELL-106`) and left to
`docs/licensing/APPLE-LICENSING.md`.

### 1.3 Definitions

| Term                          | Definition                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Track**                     | One platform line of the product family, with its own release cycle. Tracks: Web, Android, TV, Desktop, iOS/iPadOS, Windows (§ 1.4).                              |
| **Shell**                     | The frontend of a track: the code that renders state and forwards input to the core. Contains no game rule (`SHELL-101`, `SHELL-114`).                            |
| **Core**                      | The shared Rust crate `phomu-core` that holds the game rules, the data model and the typed errors (`CORE-101` … `CORE-116`).                                      |
| **Bridge**                    | The UniFFI surface between the core and the shells, including its versioning, error mapping and threading contract (`BRIDGE-101` … `BRIDGE-116`).                 |
| **Core journey**              | The minimum complete play sequence: start → lobby → draw → answer → reveal → score → end. Used by the test and acceptance requirements (`SHELL-120`, `A11Y-107`). |
| **Projector surface**         | The second-screen view that shows mode, round, phase, score and progress but never the identity of the current song (`UI-006`, `SHELL-117`).                      |
| **Pilot**                     | The player who holds the device and answers for the group in `pass-the-phone` mode (`LOBBY-005`, `ARCHITECTURE.md` § 1).                                          |
| **Anti-spoiler boundary**     | The rule that title, artist, cover and year of the current song are not visible to the guessing players before the reveal (`CORE-005`, `MEDIA-015`, `UI-006`).    |
| **Preset / Optional / Later** | The maturity markers of the requirement baseline ([`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md) § 0.3).                                                  |
| **Reference device**          | The device on which a performance figure is measured; named per track before the first measurement (`OPEN-05`).                                                   |

### 1.4 Abbreviations

| Abbreviation | Expansion                                                                          |
| ------------ | ---------------------------------------------------------------------------------- |
| FFI          | Foreign Function Interface                                                         |
| UniFFI       | Universal FFI — the Rust binding generator used for the bridge                     |
| WCAG         | Web Content Accessibility Guidelines                                               |
| AA           | The WCAG conformance level (WCAG 2.1 AA)                                           |
| AAB          | Android App Bundle                                                                 |
| FCP / LCP    | First Contentful Paint / Largest Contentful Paint                                  |
| D-pad        | Directional pad — the directional control of a television remote                   |
| Ten-foot UI  | The user interface of a television, operated from a distance of about three metres |
| CI           | Continuous Integration                                                             |
| ADR          | Architecture Decision Record ([`../adr/`](../adr/))                                |
| CR           | Change Request ([`../cr/`](../cr/))                                                |
| E2E          | End-to-End test                                                                    |

### 1.5 References

**Binding (the extension must comply with them):**

| Reference                                                  | Subject                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| [`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md)     | The requirements of the extension, baseline P-1               |
| [`TRACEABILITY.md`](TRACEABILITY.md)                       | Requirement → design → ADR → test → acceptance mapping        |
| [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)           | Product behaviour, baseline 0.1 — unchanged by this programme |
| [`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md) | Round flow, modes, anti-spoiler boundary, provider contracts  |
| [`../../QUALITY.md`](../../QUALITY.md)                     | The eight-dimension acceptance model                          |
| [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)           | Layering and dependency direction of the web application      |
| [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md) | Documentation rules, single source of truth, language rule    |

**Referenced (the extension uses them; their content is not repeated here):**

| Reference                                                                        | Subject                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md)                                     | Measurable quality targets and the measured current state of the web application                                                                                                                        |
| [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md)   | The template every track acceptance document follows                                                                                                                                                    |
| [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md)                     | **Binding**: the tracks, the binding order, the gates `A-01`…`A-14` / `B-01`…`B-12` / `S-01`…`S-12`, the versioning scheme, the build and signing profile per track, the open decisions `OD-01`…`OD-14` |
| `docs/design/PLATFORM-ARCHITECTURE.md`                                           | Platform architecture — architect, parallel, **not yet in the repository**                                                                                                                              |
| `docs/design/BUILD-CONTRACT.md`                                                  | Build chain and toolchain — architect, parallel, **not yet in the repository**                                                                                                                          |
| [`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md)             | Apple distribution and licence strategy — licensing round, parallel; a **draft decision basis**, not a ratified decision; open decisions `D1`…`D8`                                                      |
| [`../../SECURITY.md`](../../SECURITY.md), [`../../PRIVACY.md`](../../PRIVACY.md) | Threat model and data minimisation                                                                                                                                                                      |
| [`../../project/project.yaml`](../../project/project.yaml)                       | Machine-readable project state                                                                                                                                                                          |

### 1.6 Conventions

- Requirement IDs are `<DOMAIN>-<NNN>`; the extension uses the range 101–199 in
  every domain so that no ID collides with the product baseline in
  [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md).
- Every requirement carries **Preset/Optional/Later**, a **track**, a
  **rationale**, **acceptance** criteria and a **verification**.
- Verification is one of: an existing test, a test **to be written** (with the
  planned path and test name), a measurement command, or an acceptance check.
- Numbers without a source are not written down. A target value is written as a
  target with a measurement method; a measured value is written only when it was
  measured in this working session.

---

## 2. Product goals

The goals follow [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) and
[`../../QUALITY.md`](../../QUALITY.md). Each goal names a **target**, a
**measurement method** and the **current state**. Where the current state was
not measured in this session, it says so.

### 2.1 The goals of the extension

| #    | Goal                                                     | Target                                                                                                 | Measurement method                                                                             | Current state                                                                                                                                                                                                                                                                               |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-01 | One rule set for all platforms                           | 0 game-rule implementations outside `phomu-core`                                                       | `scripts/check-no-duplicate-rules.mjs` (to be written) reports zero hits in `apps/**`          | The web application has its rules in `src/stores/game-store.ts`, `src/utils/song-picker.ts`, `src/components/game/modes/*.tsx` — **not yet migrated**                                                                                                                                       |
| G-02 | Behaviour parity between the shells                      | The mode list, the lobby steps, the settings areas and the session format are identical on every track | Parity test per shell against the core list; `scripts/check-i18n-parity.mjs` (to be written)   | **not applicable yet** — only the web shell exists                                                                                                                                                                                                                                          |
| G-03 | No spoiler on any platform                               | 0 identity fields in the bridge payload before the reveal                                              | Negative assertion in `crates/phomu-bridge/tests/payload.rs`                                   | The web shell does **not** satisfy this today: the full song is held in the store (`src/stores/game-store.ts:394-402`) and the video iframe is in the DOM (`src/components/game/MusicPlayer.tsx:425-429`); recorded as `W-34`/`GAP-027` in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |
| G-04 | Local-first on every platform                            | A fresh installation starts a round without a network                                                  | Offline run per shell, documented in the acceptance                                            | The web shell is a static export with a local catalogue — **not applicable yet** for the native tracks                                                                                                                                                                                      |
| G-05 | Zero telemetry on every platform                         | 0 telemetry crates, 0 telemetry endpoints in the shipped artefact                                      | `scripts/check-no-telemetry.sh` (to be written) greps the dependency tree and scans the binary | The web shell has no analytics dependency (`package.json`); the native tracks do not exist yet                                                                                                                                                                                              |
| G-06 | Accessibility on every track                             | WCAG 2.1 AA: 4.5:1 body text, 3:1 large text and controls                                              | `axe-core` per screen and per theme; the measured table in the acceptance document             | **not measured** for the web application ([`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 5) — the gap exists today and is inherited by the new shells                                                                                                                                       |
| G-07 | Keyboard/remote operability of the complete core journey | The core journey is completed without a pointer on the desktop and TV tracks                           | Journey test with keyboard only / remote only                                                  | The web application supports the Timeline mode with the keyboard only (`src/components/game/modes/TimelineMode.tsx:242-255`); the other five modes are not keyboard-operable ([`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 6)                                                             |
| G-08 | One catalogue artefact for all tracks                    | 1 artefact, 1 content hash, verified by every shell                                                    | Hash comparison across the track builds                                                        | The web catalogue is 135 JSON files loaded into the client bundle ([`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 3)                                                                                                                                                                        |
| G-09 | Release readiness per track                              | 3 acceptance documents per track (Alpha, Beta, Stable), each with evidence                             | `ls docs/acceptance/` per track                                                                | Only [`../acceptance/M0-ACCEPTANCE.md`](../acceptance/M0-ACCEPTANCE.md) exists, for the web baseline                                                                                                                                                                                        |
| G-10 | The web track keeps working                              | 0 regressions in the existing behaviour and the existing gates                                         | The existing CI jobs plus the existing acceptance                                              | **Green at the time of writing**: `npx vitest run` → 10 files / 97 tests passed (20.68 s, measured in this session); `node scripts/check-i18n-completeness.mjs --count` → 0 literals in 48 files                                                                                            |

### 2.2 What the goals explicitly do **not** claim

- No goal promises a **multi-device** session. `deviceMode` exists as a type but
  is fixed to `pass-the-phone` (`src/stores/game-store.ts:45`); the multi-device
  mode is `Later` (`GAP-016` in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)).
- No goal promises a **cloud backend**. The admin API exists as a Next.js route
  under `src/admin-api/` but is not registered by the App Router and cannot run
  in the static export (`next.config.ts`, `output: 'export'`).
- No goal promises **store approval**. Approval is a precondition of the Stable
  phase, not a result the specification can guarantee (`REL-105`).

---

## 3. System context

### 3.1 The product in its environment

```text
                       ┌───────────────────────────────────────────────┐
                       │                  Phomu family                 │
                       │                                               │
   ┌───────────┐       │  ┌─────────┐   ┌─────────┐   ┌─────────┐    │
   │  Player   │──────▶│  │  Shell  │──▶│ Bridge  │──▶│  Core   │    │
   │ (human)   │◀──────│  │ (view)  │◀──│ (UniFFI)│◀──│ (Rust)  │    │
   └───────────┘       │  └─────────┘   └─────────┘   └─────────┘    │
                       │       │             │              │         │
                       │       │             │              │         │
                       └───────┼─────────────┼──────────────┼─────────┘
                               │             │              │
        ┌──────────────────────┘             │              └──────────────────┐
        │                                    │                                 │
        ▼                                    ▼                                 ▼
┌───────────────┐              ┌────────────────────┐            ┌──────────────────┐
│  Projection   │              │  Music providers   │            │ Catalogue        │
│  surface      │              │  YouTube, Spotify, │            │ (artefact, one   │
│  (2nd screen) │              │  Amazon,           │            │  per release,    │
│               │              │  Apple Music       │            │  read-only)      │
└───────────────┘              └────────────────────┘            └──────────────────┘
                                    │      │
                                    │      └──▶ user-triggered "report missing link"
                                    │           (the only other outbound flow)
                                    ▼
                        ┌───────────────────────────────┐
                        │ Catalogue maintenance         │
                        │ (admin area, admin API,       │
                        │  local edits + JSON export)   │
                        └───────────────────────────────┘
```

### 3.2 Actors

| Actor              | Description                                                                                                       | What the actor needs from the product                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Player**         | Takes part in the game, usually around one device (pass-the-phone). Reads the question, guesses, sees the reveal. | A readable question, an answer that can be given with touch, a remote or a keyboard, an immediate reveal, no spoiler before it (`CORE-005`). |
| **Pilot**          | The player who currently holds the device and answers for the group.                                              | Clear control of the flow: draw, reveal, skip, end (`GAME-040` documents the override governance).                                           |
| **Administrator**  | Maintains the catalogue: searches covers, edits song entries, exports a delta (`CAT-015`).                        | The admin area of the web shell with a token-protected API (`SEC-001`).                                                                      |
| **Store reviewer** | Reviews the submissions of the native tracks.                                                                     | Complete store metadata, a truthful data-safety declaration, no tracking (`REL-111`, `REL-112`, `REL-118`).                                  |

### 3.3 Environments

| Environment                          | Characteristics                                                                                                                         | Consequences for the extension                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Browser**                          | Static export of the Next.js application, served from GitHub Pages under the base path `/Phomu` (`next.config.ts`).                     | The web shell has no server; the admin API cannot run there. `localStorage` is the persistence.                     |
| **Android phone / tablet**           | Sandboxed application, app-scoped storage, camera, microphone (not needed), reversible navigation, process death under memory pressure. | The state must be recoverable after a process kill (`PLAT-113`); only the camera permission is needed (`PLAT-108`). |
| **Television (Google TV / Fire TV)** | Ten-foot UI, remote control only, no touch, low processing power, screen sleep is normal.                                               | D-pad operability is mandatory (`PLAT-103`); the projector surface is the primary view (`SHELL-104`).               |
| **Desktop (macOS, Linux, Windows)**  | Window resizing, keyboard and mouse, multi-window, no touch requirement, system appearance.                                             | The keyboard must be sufficient (`PLAT-104`); the layout must survive resizing (`PLAT-114`).                        |
| **Tablet / phone (iPadOS, iOS)**     | Sandboxed, app-scoped storage, camera, large screen on iPad, distribution via the App Store.                                            | The App Store terms apply; the licence question is open (`OPEN-01`).                                                |

### 3.4 Neighbouring systems

| Neighbour                  | Direction                  | What it does today                                                                                                                                                                        | What the extension must not break                                                                                   |
| -------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **YouTube**                | Outbound (embed)           | Default provider; the video is embedded via the IFrame API, autoplay with `playerVars.autoplay = 1` (`src/components/game/MusicPlayer.tsx:295`) and muted to satisfy the autoplay policy. | The embed is browser-specific. A native shell needs its own playback path (`SHELL-103` … `SHELL-107`).              |
| **Spotify**                | Outbound (embed / preview) | Spotify Free uses the 30-second preview, Spotify Premium the embed player (`MEDIA-010`, `MEDIA-011`).                                                                                     | Same as YouTube: the embed is a browser mechanism.                                                                  |
| **Amazon Music**           | Outbound (embed / preview) | Amazon Music uses the embed player; the Prime preview path has no data in the catalogue (`GAP-012`).                                                                                      | A native shell must not inherit a provider whose data does not exist.                                               |
| **Apple Music**            | Outbound (link only)       | Only linked today, not embedded; `frame-src` in `next.config.ts` deliberately excludes `music.apple.com`.                                                                                 | Whether Apple Music becomes playable in a native shell is an owner decision; the specification does not require it. |
| **Catalogue**              | Internal artefact          | 1.615 songs in 135 JSON files, validated by `npm run validate-catalog`.                                                                                                                   | Becomes one versioned artefact produced by the core toolchain (`SHELL-115`, `CORE-110`).                            |
| **Admin area / admin API** | Internal (web only)        | Token-protected Next.js routes under `src/admin-api/`; not registered in the static export.                                                                                               | The native shells consume the catalogue artefact; they do not serve the admin API.                                  |

### 3.5 The "no telemetry" promise, per environment

The promise of `CORE-011` is that Phomu transmits no usage or error data
automatically. In a store context this promise must be **provable per artefact**,
not only stated in a privacy page. Therefore:

- the core performs no network I/O at all (`CORE-112`),
- the shells make no outbound request except media provider playback and the
  user-triggered missing-link report (`PLAT-118`),
- the data-safety declaration of every track is checked against a network
  capture of an actual session (`REL-112`).

---

## 4. Overall description

### 4.1 Product perspective

Phomu is a **local-first party game**. The party sits around one device; the
device is passed around; the game state lives on that device; a second screen
may mirror the state without revealing the answer. The product extension keeps
this shape and changes the **distribution**: instead of "a web page you open in
a browser", it becomes "an application you install on the device you already
hold" — on a phone, on a television, on a desktop, on a tablet.

The **product perspective** does not change with the shell. What changes is:

1. where the rules are executed (once in Rust instead of once in TypeScript),
2. how the shell reaches the rules (through a bridge instead of a store),
3. which devices the shell runs on.

Everything a player sees — the six modes, the points, the lobby, the themes, the
two languages — is defined by [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) and
stays valid. The extension is therefore **behaviour-preserving by default**:
`SHELL-102` makes that an explicit requirement.

### 4.2 Product functions

The functions are inherited from the product baseline. This table shows which
function lives where after the extension — it is a **mapping**, not a new
requirement.

| Function                     | Today (web)                                                        | After the extension                                 | Requirement             |
| ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | ----------------------- |
| Landing / start              | `src/app/page.tsx`                                                 | Every shell                                         | `SHELL-102`             |
| Lobby assistant (6 steps)    | `src/app/lobby/page.tsx`                                           | Core validates, shell renders                       | `CORE-101`, `SHELL-112` |
| Round flow / phase automaton | `src/app/game/page.tsx` + `src/stores/game-store.ts`               | Core decides, shell renders                         | `CORE-105`              |
| Six game modes               | `src/components/game/modes/*.tsx`                                  | Core decides, shell renders                         | `CORE-101`, `SHELL-108` |
| Scoring / win conditions     | `src/app/game/page.tsx`, `src/stores/game-store.ts`                | Core only                                           | `CORE-107`              |
| Media playback               | `src/components/game/MusicPlayer.tsx` (embeds)                     | Shell-specific playback, core supplies the song     | `SHELL-115`, `PLAT-118` |
| Projector surface            | `src/app/projector/page.tsx`                                       | Every shell that has a second screen                | `SHELL-117`             |
| Catalogue browsing           | `src/app/browse/page.tsx`                                          | Every shell                                         | `SHELL-115`             |
| Settings (5 areas)           | `src/app/settings/**`                                              | Every shell                                         | `SHELL-113`             |
| Admin area                   | `src/app/admin/**`, `src/admin-api/**`                             | **Web only** — a server concern                     | § 4.6                   |
| QR scan / deep link          | `src/components/game/QRScannerModal.tsx`, `src/utils/qr-intent.ts` | Every track with a camera; intent logic in the core | `PLAT-115`, `PLAT-116`  |
| Print guide / card format    | `docs/guides/PRINTING-GUIDE.md`                                    | Unchanged, independent of every shell               | `PLAT-117`              |

### 4.3 User characteristics

| Characteristic                                  | Consequence for the extension                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Groups of 1–24 people in one room (`LOBBY-003`) | The pilot device is passed; the interface must work for a person who has never seen it before (`UI-009`). |
| People who do not read instructions             | Two clicks from start to play (`CORE-007`); mode names and emojis carry the meaning (`UI-009`).           |
| Low light, loud music, laughter                 | Large type, high contrast, no dependence on subtle animations (`A11Y-106`).                               |
| Mixed devices in one group                      | One catalogue artefact and one session format across all tracks (`SHELL-115`, `SHELL-111`).               |
| People who do not read instructions             | Two clicks from start to play (`CORE-007`); mode names and emojis carry the meaning (`UI-009`).           |
| People who may not have accounts or data plans  | No account, no cloud, offline start (`CORE-002`, `CORE-003`, `SHELL-116`).                                |
| Players with a visual or motor restriction      | WCAG 2.1 AA, keyboard/remote operability (`A11Y-101`, `A11Y-107`).                                        |

### 4.4 Constraints

| #    | Constraint                                                                                           | Source                                                         |
| ---- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| K-01 | The product is GPL-3.0-or-later; no account, no advertising, no telemetry                            | `CORE-002`, `CORE-003`, `CORE-011`, `LICENSE`                  |
| K-02 | The behaviour of the game is fixed by the product baseline; the extension may not change it silently | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) header rule   |
| K-03 | The acceptance model has eight dimensions; a decision without evidence is not a decision             | [`../../QUALITY.md`](../../QUALITY.md) § 9                     |
| K-04 | No acceptance on the basis of stubs or simulated flows                                               | `NFR-008`, `QUALITY.md` § 10.1                                 |
| K-05 | A track only starts when the previous track has a green Stable release candidate                     | `REL-101`                                                      |
| K-06 | The web application is a static export; it has no server at runtime                                  | `next.config.ts` (`output: 'export'`)                          |
| K-07 | The dependency direction of the existing application must not be violated by the extension           | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) § 2, ADR-0001 |
| K-08 | Every number of the product has exactly one place                                                    | `CORE-009`, `CORE-104`                                         |
| K-09 | Documentation and code are updated in the same change                                                | [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md)     |
| K-10 | The project documentation is German; this specification folder is English                            | `CORE-012` vs. the owner instruction — **OPEN-02**             |

### 4.5 Assumptions

| #    | Assumption                                                                                                                                                            | Consequence if it does not hold                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | The architect delivers `docs/design/PLATFORM-ARCHITECTURE.md` and `docs/design/BUILD-CONTRACT.md` with the shell layout, the crate layout and the toolchain versions. | The paths named in this specification (`crates/`, `apps/`) are placeholders and have to be reconciled with the architecture document.                                     |
| A-02 | The release plan defines the calendar, the store accounts and the signing custody.                                                                                    | `REL-107` … `REL-110` have no owner until then.                                                                                                                           |
| A-03 | The desktop shell is built with Rust (egui) and/or Tauri, as named by the owner.                                                                                      | `SHELL-105`, `SHELL-107` and the test paths change; the requirements themselves do not.                                                                                   |
| A-04 | The catalogue artefact can be produced by a Rust tool from the existing JSON sources, without a change to the catalogue format.                                       | `CORE-110` needs a migration step, which would have to be specified separately.                                                                                           |
| A-05 | A group plays with one device; the multi-device mode stays `Later`.                                                                                                   | If multi-device is pulled forward, `PLAT-118` and `PRIVACY.md` need a local-network data flow, which is currently not specified.                                          |
| A-06 | The provider embeds of the web shell cannot be reused verbatim on native platforms; each shell implements its own playback path.                                      | If an embed turned out to be reusable everywhere, the media requirements could be shared — but that would be a change to `MEDIA-001` … `MEDIA-018`, not to this document. |
| A-07 | The machine-readable project state (`project/project.yaml`) will gain a `platforms.track_order` field equivalent to the order in this specification.                  | The order exists in two places and can drift; the release plan is the second source.                                                                                      |

### 4.6 Platform requirements — the track properties

This section states the properties of each track: screen sizes, input devices,
screen sleep, permissions and storage. The normative requirements are in
[`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md) § 3 (`PLAT-101` …
`PLAT-122`); this table is the summary that the acceptance matrices work from.

| Property                 | Web (T0)                                                                | Android (T1)                                        | TV (T2)                                      | Desktop (T3a, T3b)                                         | iOS/iPadOS (T4)                          | Windows (T5)                                               |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| **Primary input**        | Pointer + keyboard                                                      | Touch                                               | Remote / D-pad                               | Pointer + keyboard                                         | Touch (+ keyboard on iPad)               | Pointer + keyboard                                         |
| **Minimum touch target** | 44 px (`UI-011`)                                                        | 44 px (`PLAT-102`)                                  | Not applicable — focus target                | Not applicable                                             | 44 px (`PLAT-102`)                       | Not applicable                                             |
| **Navigation model**     | URL routes, 23 registered routes                                        | Stack + system back (`PLAT-122`)                    | Focus-based, no pointer                      | Window + menus                                             | Stack + system gestures                  | Window + menus                                             |
| **Screen sizes**         | 360 / 768 / 1920 px (`QUALITY.md` § 4)                                  | Phone and tablet, 1 application                     | 1080p reference, 3 m viewing distance        | Resizable window, minimum width to be declared (`OPEN-06`) | iPhone and iPad, split view              | Resizable window, minimum width to be declared (`OPEN-06`) |
| **Screen sleep**         | Browser tab behaviour                                                   | Keep awake during the round (`PLAT-105`)            | Sleep is normal; the app is resumed on input | Window manager decides                                     | Keep awake during the round (`PLAT-105`) | Window manager decides                                     |
| **Permissions**          | Camera only (`next.config.ts` `Permissions-Policy`)                     | Camera only (`PLAT-109`)                            | None                                         | None                                                       | Camera only (`PLAT-109`)                 | None                                                       |
| **Storage**              | `localStorage`, key `phomu-game-state` (`src/stores/game-store.ts:619`) | App-scoped storage (`PLAT-110`)                     | App-scoped storage                           | App-scoped storage                                         | App-scoped storage                       | App-scoped storage                                         |
| **Catalogue**            | Bundled in the client bundle                                            | Bundled snapshot or on-demand download (`PERF-107`) | Same                                         | Same                                                       | Same                                     | Same                                                       |
| **Projection**           | Second tab (`UI-008`)                                                   | Second screen / cast                                | **Primary use case** (`SHELL-104`)           | Second window                                              | Second screen / cast                     | Second window                                              |
| **Store**                | GitHub Pages                                                            | Google Play                                         | Google Play TV / Amazon Appstore             | Developer download / package manager                       | App Store                                | Developer download / package manager                       |
| **Signing**              | Not applicable                                                          | Release key + Play App Signing (`REL-107`)          | Play / Amazon signing                        | Developer ID + notarisation, package checksum (`REL-109`)  | Certificate + notarisation (`REL-108`)   | Code signing (`REL-109`)                                   |

### 4.7 Boundary between the web shell and the native shells

Three things belong to the web shell only and are **not** part of the native
shells. This is a deliberate, documented delimitation:

| Item                                                               | Reason                                                                                                                                             | Requirement |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| The admin area (`/admin/songs`, `/admin/review`) and the admin API | Both are browser/server concerns; the native shells consume the catalogue artefact, they do not maintain it. `CAT-015` is a web-shell requirement. | § 4.2       |
| The catalogue editor and the JSON delta export                     | A desktop file picker would be an equivalent, but it is not required for playing and would extend the track.                                       | `CORE-110`  |
| The static export and the base path `/Phomu`                       | A deployment property of the web shell.                                                                                                            | `SHELL-102` |

---

## 5. Specific requirements

The requirements of the extension are specified in
[`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md) and are **not repeated
here**. The index:

| Domain   | IDs                         |   Count | Subject                                                                          |
| -------- | --------------------------- | ------: | -------------------------------------------------------------------------------- |
| `CORE`   | `CORE-101` … `CORE-116`     |      16 | The shared Rust base: rules, data model, catalogue, errors, determinism, licence |
| `SHELL`  | `SHELL-101` … `SHELL-120`   |      20 | The six shells: parity, persistence, projection, test suites                     |
| `PLAT`   | `PLAT-101` … `PLAT-122`     |      22 | Input, screen, permissions, storage, lifecycle, deep links, network policy       |
| `BRIDGE` | `BRIDGE-101` … `BRIDGE-116` |      16 | UniFFI surface: versioning, errors, threading, cancellation, payload discipline  |
| `REL`    | `REL-101` … `REL-118`       |      18 | Track order, Alpha/Beta/Stable, signing, store submission, rollout               |
| `A11Y`   | `A11Y-101` … `A11Y-110`     |      10 | WCAG 2.1 AA across all shells                                                    |
| `PERF`   | `PERF-101` … `PERF-112`     |      12 | Budgets per track with measurement methods                                       |
|          |                             | **114** |                                                                                  |

The mapping from each requirement to its design document, ADR, test and
acceptance document is in [`TRACEABILITY.md`](TRACEABILITY.md).

---

## 6. External interfaces

### 6.1 The Rust bridge (UniFFI)

The bridge is the only technical contact between a shell and the core
(`BRIDGE-101`). Its contract:

| Property           | Requirement                                                                                                  | Note                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Mechanism          | UniFFI                                                                                                       | Kotlin and Swift bindings are generated (`BRIDGE-114`)                                                 |
| Versioning         | An independent semantic version of the bridge surface (`BRIDGE-102`); a mismatch fails closed (`BRIDGE-103`) | The core version, the shell version and the API version are recorded together at a release (`REL-115`) |
| Error mapping      | Typed variants with stable codes; no string matching, no panic across the boundary (`BRIDGE-104`)            | Follows the `AdminRequestError` precedent of `SEC-018`                                                 |
| Threading          | The core never runs on the UI thread; results are published to the UI (`BRIDGE-105`)                         | Long operations are cancellable (`BRIDGE-106`)                                                         |
| Event order        | Defined and asserted (`BRIDGE-107`)                                                                          | Removes the need for the double-call guards the web shell needs today (`UI-015`)                       |
| Payload discipline | No identity field before the reveal (`BRIDGE-108`)                                                           | This is the technical enforcement of `CORE-005`                                                        |
| Wire format        | Versioned, stable within a major version (`BRIDGE-110`)                                                      |                                                                                                        |
| Surface neutrality | No platform-specific exported function (`BRIDGE-111`)                                                        | Mirrors `CORE-114`                                                                                     |
| Ownership          | Documented, no unbounded growth (`BRIDGE-115`)                                                               | A leak per round is a crash in round 40                                                                |

### 6.2 Music provider embeds (outbound)

The providers of the web shell are YouTube, Spotify, Amazon Music and — linked
only — Apple Music (`MEDIA-001` … `MEDIA-018`, `src/config/game-config.ts:20-26`).
Their **behaviour** (fallback chain, six-second start timeout, automatic skip on
failure, the 30-second preview) stays as specified. What changes is the
**mechanism**:

- The web shell embeds the provider in an IFrame (`src/components/game/MusicPlayer.tsx:424-430`).
- A native shell cannot rely on an arbitrary IFrame. Each shell implements its
  own playback path, receives the song and the playback window from the core,
  and reports the outcome back.

The **provider order and the fallback behaviour** remain a contract of the
product (`../design/GAME-CONTRACT.md` § 8). The native implementation of that
contract is part of the shell requirements (`SHELL-103` … `SHELL-107`).

### 6.3 QR codes and deep links

| Format                | Effect                                                           | Reference                      |
| --------------------- | ---------------------------------------------------------------- | ------------------------------ |
| `@Anna`               | Adds "Anna" as a player in the lobby                             | `src/utils/qr-intent.ts:16-18` |
| `…?pack=Rock Anthems` | Selects the pack in the lobby; an unknown key is refused         | `src/utils/qr-intent.ts:30-33` |
| `…?session=123456`    | Recognised, but not executed — a session runs on one device only | `LOBBY-020`, `GAP-016`         |
| `…?id=<song-id>`      | Explicitly unsupported                                           | `src/utils/qr-intent.ts:38-40` |

The format is identical on every track (`PLAT-115`); the intent logic moves into
the core so that all shells agree. The printed card therefore keeps working
across the family (`PLAT-117`).

### 6.4 Card printing

The card format is fixed by the configuration — 59 × 91 mm, 3 mm bleed, at most
110 cards per set (`src/config/game-config.ts:322-325`) — and documented in
[`../guides/PRINTING-GUIDE.md`](../guides/PRINTING-GUIDE.md). Card production is
independent of every shell (`PLAT-117`). The guide is not changed by this
programme.

### 6.5 The admin API

The admin API is a **web/server** interface: two Next.js route handlers under
`src/admin-api/admin/covers/`, protected by the `x-admin-token` header with a
timing-safe comparison (`SEC-001`, `SEC-002`, `src/admin-api/_lib/security.ts:47-78`).
It is **not** part of the native shells and not part of the core: the native
shells consume the catalogue artefact, they do not maintain it (§ 4.7).

### 6.6 Telemetry — the null interface

There is **no telemetry interface**. This is an interface that does not exist,
and the specification treats its absence as a requirement with a verification:

| Requirement                                                                                       | Verification                                                                    |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `CORE-112` — the core performs no network I/O                                                     | `cargo tree -p phomu-core` contains no HTTP client                              |
| `CORE-115` — no telemetry crate in core or shells                                                 | `grep -Ei "analytics\|sentry\|posthog\|telemetry" crates/*/Cargo.toml` is empty |
| `PLAT-118` — the shell's only outbound traffic is provider playback and the user-triggered report | a network capture of a full session in the acceptance document                  |
| `REL-112` — the store data-safety declaration matches the capture                                 | the declaration and the capture attached to the acceptance document             |

The one existing outbound flow that is not provider playback is the
"report missing link" dialog, which is opened by a user action and carries only
technical metadata (`MEDIA-013`, `SEC-012`).

### 6.7 The updater

| Track            | Update mechanism                                                                          | Requirement                     |
| ---------------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
| Web              | The browser; the static export is replaced by a deployment                                | `SHELL-102`                     |
| Android, TV, iOS | The store                                                                                 | `REL-107`, `REL-108`, `REL-110` |
| Desktop, Windows | The distribution channel chosen by the track; a signed artefact with a published checksum | `REL-109`                       |

No self-updating mechanism is specified. A silent update would break the
"the user decides what runs on the device" principle and adds a signature
surface of its own.

---

## 7. Non-functional requirements

The non-functional baseline of the product is in
[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) § 9 (`NFR-001` … `NFR-016`). It
continues to apply to the web shell unchanged. This section states the
**extension** of that baseline to the new tracks.

### 7.1 Performance budgets per platform

Every budget names a target and a measurement method. **No measured value is
stated for the native tracks, because none has been measured.** The reference
device or machine has to be named before the first measurement (`OPEN-05`).

| Requirement | Budget (target)                                                                                                          | Measurement method                                                                                                                                                  | Reference                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PERF-101`  | Cold start to the first interactive frame of the lobby — target value to be fixed per track before the first measurement | Instrumented launch on the named reference device; Android: `adb shell am start -W`; iOS: `os_signpost` on the launch interval; desktop: instrumented process start | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 1 for the web method                                                                                                              |
| `PERF-102`  | Warm start / resume to the restored session — shorter than the cold start                                                | Same instrumented launch, second start of the process                                                                                                               | —                                                                                                                                                                                |
| `PERF-103`  | Transition "card drawn" → "question visible"                                                                             | `performance.now()` around the transition, median over 50 rounds of a test game with 6 players                                                                      | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 2                                                                                                                                 |
| `PERF-104`  | Transition "reveal" → "next round"                                                                                       | Same method, same reference game                                                                                                                                    | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 2                                                                                                                                 |
| `PERF-105`  | Memory ceiling for a session with the full catalogue and 24 players                                                      | Platform memory inspector, peak during a full round                                                                                                                 | —                                                                                                                                                                                |
| `PERF-106`  | Size of the delivered artefact, including the catalogue snapshot                                                         | `du -sh` on the artefact; the store limit is an additional hard bound                                                                                               | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 3 for the web method                                                                                                              |
| `PERF-107`  | Catalogue load strategy — bundled or on demand, per track                                                                | The decision is documented; a bundled catalogue must not exceed the cold-start budget                                                                               | The licensing decision `D7` (catalogue metadata in the bundle, covers on demand with an explicit size prompt) applies to the iOS track and is the reference for the other stores |
| `PERF-108`  | Frame budget for the phase transitions on the lowest supported device class                                              | Frame timing during a round on the named low-end reference device                                                                                                   | —                                                                                                                                                                                |
| `PERF-109`  | No blocking I/O on the UI thread                                                                                         | The interface stays responsive during a catalogue load; measured in the shell test                                                                                  | —                                                                                                                                                                                |
| `PERF-110`  | Bridge call overhead in the round transition                                                                             | `cargo bench -p phomu-bridge` — `round_transition`                                                                                                                  | —                                                                                                                                                                                |
| `PERF-111`  | Power consumption over a 30-minute round on a battery device                                                             | Platform power instrumentation over a 30-minute session                                                                                                             | —                                                                                                                                                                                |
| `PERF-112`  | Performance regression gate in CI                                                                                        | The core benchmarks run in CI; a regression beyond the named tolerance fails the build                                                                              | —                                                                                                                                                                                |

### 7.2 Security

| Requirement            | Statement                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CORE-115`, `PLAT-118` | No telemetry, no crash reporting, no advertising, no account.                                                                                             |
| `PLAT-108`, `PLAT-109` | The camera is the only permission; it is requested just in time and only for the QR scan.                                                                 |
| `PLAT-110`             | Data is written to app-scoped storage only; the catalogue artefact is read-only at runtime.                                                               |
| `BRIDGE-104`           | Errors cross the bridge as typed codes; no panic, no free text.                                                                                           |
| `BRIDGE-108`           | The payload carries no spoiler before the reveal.                                                                                                         |
| `REL-107` … `REL-110`  | Signing and notarisation per track; keys are never in the repository.                                                                                     |
| `REL-112`, `REL-118`   | The store data-safety declaration matches the measured behaviour; the policy checklist (no account, no ads, no tracking) is signed off before submission. |

The threat model of [`../../SECURITY.md`](../../SECURITY.md) covers the web
shell. The extension adds the surfaces listed above; the native-specific
threats (a rooted device, a modified APK, a tampered store artefact) are covered
by the platform guidance of the respective track and are named in the track
acceptance documents.

### 7.3 Privacy

The data minimisation of [`../../PRIVACY.md`](../../PRIVACY.md) carries over
unchanged and becomes checkable per platform:

- the session stays on the device (`CORE-003`, `SHELL-111`, `PLAT-110`);
- the only outbound flow besides provider playback is the user-triggered report
  (`SEC-012`, `PLAT-118`);
- the store data-safety declaration states exactly this (`REL-112`).

### 7.4 Accessibility

The target is **WCAG 2.1 AA** across all shells (`A11Y-101`), with the
measurement method already established in the repository
([`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 5: `axe-core` per route, per
theme, in the lightest and the darkest theme). The requirements additionally
cover the focus order (`A11Y-103`), the accessible names (`A11Y-105`), the
reduced motion (`A11Y-106`), the keyboard and remote operability
(`A11Y-107`), the text scaling (`A11Y-108`) and the colour independence
(`A11Y-109`).

The web application currently has an **unmeasured** contrast situation
([`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 5) and **no** `role=` attribute
anywhere in `src/` (§ 6). These are inherited gaps; the new shells must not
start from zero (`A11Y-110` makes the check a CI job).

### 7.5 Maintainability

| Aspect               | Rule                                                                                                                                                                                    | Reference                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Rules in one place   | The core is the only implementation of a game rule                                                                                                                                      | `CORE-101`, `SHELL-114`  |
| Numbers in one place | All constants live in the core configuration and are read through the bridge                                                                                                            | `CORE-104`               |
| Layer discipline     | shell → bridge → core; the core depends on nothing above it                                                                                                                             | `CORE-102`, `BRIDGE-111` |
| Generated code       | The bindings are generated and never hand-edited                                                                                                                                        | `BRIDGE-114`             |
| File size            | The existing limit of 550/400 lines applies to the TypeScript sources (`NFR-009`); the equivalent limit for the Rust sources and the shell sources is to be fixed by the build contract | `OPEN-04`                |
| Documentation        | The same-change rule applies to the extension                                                                                                                                           | `K-09`                   |

### 7.6 Portability

| Aspect                           | Rule                                                              | Reference                |
| -------------------------------- | ----------------------------------------------------------------- | ------------------------ |
| Platform-neutral core            | No platform-specific export in the core or the bridge             | `CORE-114`, `BRIDGE-111` |
| Trait-based platform differences | A platform difference is a different trait implementation         | `CORE-102`               |
| Reproducible builds              | The toolchain is pinned; the same source yields the same artefact | `REL-113`                |
| Minimum versions                 | The minimum OS version per track is declared once                 | `BRIDGE-116`, `OPEN-06`  |

### 7.7 Localisation

German is the primary language, English is complete (`I18N-001`). The extension
adds:

- the same key set in every shell (`SHELL-110`),
- the same error vocabulary in every shell (`SHELL-119`),
- a parity check across the shells (`SHELL-110`),
- the store listings in both languages (`REL-111`),
- the release notes in both languages (`REL-116`).

The web shell's translation gate is green at the time of writing:
`node scripts/check-i18n-completeness.mjs --count` → **0** literal texts in 48
files (measured in this session).

### 7.8 Offline capability

| Requirement | Statement                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `CORE-112`  | The core performs no network I/O.                                                                                  |
| `SHELL-116` | A fresh installation reaches the lobby and starts a round without a network, using the bundled catalogue snapshot. |
| `PLAT-118`  | The only outbound traffic is provider playback and the user-triggered report.                                      |
| `SHELL-120` | The offline start is part of the shell test suites.                                                                |

The distinction matters: the game **logic** is fully offline; the **media** is
not, because playback goes to YouTube/Spotify/Amazon. When a provider is
unavailable, the fallback chain of `MEDIA-004` … `MEDIA-006` applies and, as a
last resort, the song is skipped (`GAME-013`).

---

## 8. Data requirements

### 8.1 The catalogue model

The catalogue is one versioned artefact. The data model stays the one of
[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) § 7 (`CAT-001` … `CAT-016`) and
of `src/types/song.ts`:

| Element          | Requirement                                                                                                                                                        | Source                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| Storage          | One artefact per release, produced by the core toolchain, read-only at runtime                                                                                     | `SHELL-115`, `CORE-110` |
| Content          | 1.615 songs in 135 pack files (measured 2026-10-25 via `npm run validate-catalog`)                                                                                 | `CAT-002`               |
| Mandatory fields | `id`, `title`, `artist`, `year`, `country`, `genre`, `difficulty`, `mood`, `packs`, `hints`, `isOneHitWonder`, `links.youtube`, `supportedModes`, `isQRCompatible` | `CAT-009`               |
| Lyrics           | Exactly three real and one invented line, or `null`                                                                                                                | `CAT-010`               |
| Cover metadata   | `coverMode.relationType`, `confidence`, `coverYear` when present                                                                                                   | `CAT-014`               |
| Packs            | 27 configured packs, all represented in the data                                                                                                                   | `CAT-003`               |
| Validation       | The core validator and the web validator agree on the verdict                                                                                                      | `CORE-110`              |
| Duplicate policy | No duplicates except the curated allowlist                                                                                                                         | `CAT-006`               |
| Year coverage    | At least one song per year from 1950 to the current year                                                                                                           | `CAT-007`               |

Two open catalogue gaps are inherited and are **not** solved by this
programme: `links.coverLink` is set in no song and `links.amazonPrimePreview`
is set in no song (`GAP-011`, `GAP-012` in
[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)). They remain data-delivery
gaps of the product.

### 8.2 The game session

The session is the state that the core owns (`CORE-103`) and that a shell
renders. Its field set is the one of the web store today
(`src/stores/game-store.ts:621-637`):

| Group              | Fields                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Identity           | `sessionId`                                                                                                       |
| Players            | `players`, `teams`, `preferredPlayer`                                                                             |
| Configuration      | `config` (selected modes, selected packs, team mode, device mode, ending condition, target values, time limit, …) |
| Score and progress | `currentRound`, `isGameOver`, `timelineYears`, `totalXP`                                                          |
| Timing             | `gameStartTime`                                                                                                   |
| Media preferences  | `preferredMusicProvider`, `musicEnabled`, `musicVolume`, `sfxEnabled`, `sfxVolume`                                |

The **anti-spoiler rule for persistence** applies to every platform: the current
song is not part of the persisted session (`../design/GAME-CONTRACT.md` § 7).
The web store honours this through its `partialize` list; the core must do the
same, and the bridge payload must not leak the identity before the reveal
(`BRIDGE-108`).

### 8.3 Persistence

| Aspect             | Rule                                                                                                                                     | Requirement                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Location           | App-scoped storage of the device                                                                                                         | `PLAT-110`                                                                                 |
| Continuity         | A session survives a reload, a restart, a lock and a process kill                                                                        | `SHELL-111`, `PLAT-106`, `PLAT-113`                                                        |
| Format             | The state schema carries a version; older versions are migrated or rejected with a typed error                                           | `CORE-103`                                                                                 |
| Compatibility      | A session written by one shell is readable by the core and by the other shells                                                           | `SHELL-111`, `REL-115`                                                                     |
| Deletion           | The player can delete the local data completely                                                                                          | `SEC-013` — the web route `/settings/account`; the native equivalent is required per track |
| Encryption at rest | Not required by the baseline — the data is a party game state without personal data. The decision is recorded rather than silently made. | § 12, OPEN-09                                                                              |

### 8.4 Migrations between versions

| Case                                          | Rule                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Core version newer than the shell expects     | The shell refuses to start the game (`BRIDGE-103`).                                                                                |
| Shell newer than the core                     | Same rule — the mismatch fails closed.                                                                                             |
| Persisted state older than the current schema | The core migrates it; a migration that cannot be performed produces a typed error and a clear message, never a crash (`CORE-103`). |
| Persisted state newer than the current schema | The core rejects it with a typed error and does not overwrite it silently.                                                         |
| Bridge wire format                            | Stable within a major version; a breaking change increases the major version (`BRIDGE-110`).                                       |

The catalogue artefact is migrated by regenerating it with the core toolchain; it
is never migrated in place on the device (`SHELL-115`).

---

## 9. User interface attributes per platform

### 9.1 The shared interface model

The user interface of the product is defined by
[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) § 5 (`UI-001` … `UI-018`): four
themes, the navigation bar, the projector mode, the game header, the feedback
overlays and the settings hub. The extension changes **how** the interface is
realised, not **what** it contains.

| Element        | Attribute                                                                                   | Requirement            |
| -------------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| Themes         | `jackbox`, `spotify`, `youtube`, `musicwall`, driven by the same token set                  | `SHELL-109`            |
| Languages      | German (primary) and English, switchable at any time                                        | `SHELL-110`            |
| Navigation     | The same targets on every shell: lobby, browse, settings; no navigation bar during the game | `SHELL-102`, `UI-004`  |
| Feedback       | The same deterministic feedback texts, the same overlays, the same sound cues               | `UI-014`, `UI-015`     |
| Touch/keyboard | 44 px targets, visible focus, `focus-visible` behaviour                                     | `A11Y-102`, `A11Y-103` |
| Projection     | The second screen shows mode, round, phase, score and progress — never the identity         | `SHELL-117`            |

### 9.2 The navigation model per platform

| Platform       | Navigation model                                                                                                | Entry / exit               | Projection                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| **Web**        | URL routes; the navigation bar is hidden during the game (`UI-004`); 23 registered routes                       | URL / in-app links         | Second browser tab, opened from the in-game settings panel (`UI-008`)  |
| **Android**    | Stack navigation with the system back gesture; the back gesture asks before leaving a running game (`PLAT-122`) | System back / top bar      | Second device or cast; the projector surface is in the app             |
| **TV**         | Focus-based linear navigation with a visible focus ring; no pointer, no touch (`PLAT-103`)                      | Remote's back button       | **The TV is the projection surface**; the pilot device sends the state |
| **Desktop**    | Window and menu; keyboard is sufficient for the whole journey (`PLAT-104`)                                      | Window close / in-app back | Second window                                                          |
| **iOS/iPadOS** | Navigation stack with the system swipe; split view on iPad                                                      | Swipe / top bar            | Second device, AirPlay or a second window on iPad                      |
| **Windows**    | Window and menu; keyboard is sufficient                                                                         | Window close / in-app back | Second window                                                          |

### 9.3 The input model per platform

| Platform       | Primary        | Secondary                             | Not available                  |
| -------------- | -------------- | ------------------------------------- | ------------------------------ |
| **Web**        | Pointer        | Keyboard (full for the Timeline mode) | Touch is available in practice |
| **Android**    | Touch          | —                                     | Hover, right-click             |
| **TV**         | Remote / D-pad | Voice (where the platform offers it)  | Touch, pointer, keyboard       |
| **Desktop**    | Pointer        | Keyboard (complete)                   | Touch                          |
| **iOS/iPadOS** | Touch          | Keyboard (iPad)                       | Hover, right-click             |
| **Windows**    | Pointer        | Keyboard (complete)                   | Touch                          |

The rule that follows from this table is `PLAT-101`: no function may depend on
an input device that is not in the track's declared model.

### 9.4 The projector surface per platform

The projector surface (`UI-006`, `UI-007`) is spoiler-free by construction. In
the web shell it reads the same persisted state and re-renders every two
seconds (`src/app/projector/page.tsx:41-44`). On native tracks the state has to
reach the second surface — a question that is **not** settled by this
specification, because it depends on the multi-device decision (`GAP-016` in
[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md), and assumption A-05 here).
The TV track is the case where this matters most (`SHELL-104`), and it is
therefore an explicit open point (OPEN-03).

---

## 10. Constraints

### 10.1 Licensing

Phomu is **GPL-3.0-or-later** (`LICENSE`, `package.json` `"license": "GPL-3.0"`,
`CORE-002`). The core and the bridge are GPL-3.0-or-later as well
(`CORE-116`), and every shell that links the core inherits that licence.

**The Apple question is not decided here.** Whether and how the iOS track may
be distributed under GPL-3.0-or-later, and what the App Store terms mean for
the linkage, is treated in
[`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md). That
document is a **draft decision basis for the owner**, not a ratified decision;
its recommendation is to keep the whole codebase under GPL-3.0-or-later and to
add exactly one narrowly scoped GPL-3.0 §7 additional permission — the
_Phomu App Store Exception_ — and to ship the Apple track through the App
Store with TestFlight as the first distribution step, the existing web app
remaining the channel that works without an Apple account. This document only
records that the question exists, that the recommendation exists and that it is
a precondition of the submission (`REL-108`, `SHELL-106`, `REL-118`).

### 10.2 Platform constraints

| Constraint                                                                             | Consequence                                                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| The stores require a privacy policy and a data-safety declaration                      | They must state the truth: no data collection, no tracking, data on the device only (`REL-112`) |
| The stores require an export-compliance declaration                                    | It must be answered correctly for a GPL distribution (`REL-118`)                                |
| The App Store requires a privacy label                                                 | It must match the measured behaviour (`REL-112`)                                                |
| Google Play and the Amazon Appstore require a signed artefact                          | Release key, Play App Signing (`REL-107`)                                                       |
| macOS requires notarisation for a smooth installation                                  | Developer ID + notarisation (`REL-109`)                                                         |
| Windows SmartScreen requires a code signature                                          | Code signing (`REL-109`)                                                                        |
| The TV stores require a remote-first application                                       | A touch-first submission is rejected (`REL-110`)                                                |
| iOS has no side-loading outside the App Store (except the EU alternative distribution) | The distribution question is open (`OPEN-01`)                                                   |

### 10.3 The build chain

The build chain is defined by the architect in
`docs/design/BUILD-CONTRACT.md`. This specification
relies on it for:

- the toolchain versions and the reproducibility requirement (`REL-113`),
- the minimum platform versions (`BRIDGE-116`),
- the generation of the bindings (`BRIDGE-114`),
- the catalogue artefact production (`SHELL-115`),
- the CI matrix (`REL-114`),
- the performance gate (`PERF-112`).

Until that document exists, the paths named in this specification
(`crates/phomu-core`, `apps/android`, `apps/tv`, `apps/ios`, `apps/desktop`,
`apps/windows`) are **placeholders** (assumption A-01).

### 10.4 Resources

| Resource                                                                  | Requirement              |
| ------------------------------------------------------------------------- | ------------------------ |
| The catalogue artefact is the largest asset; its size budget is per track | `PERF-106`, `PERF-107`   |
| The binding layer must not become the bottleneck of a round               | `BRIDGE-112`, `PERF-110` |
| The signing and store accounts are the scarce resource of the programme   | `REL-107` … `REL-110`    |
| The owner decides the licence question for the iOS track                  | `OPEN-01`                |

---

## 11. Traceability

The complete matrix — requirement → source → design document → ADR → test →
acceptance document → track → status — is in
[`TRACEABILITY.md`](TRACEABILITY.md). It covers all 114 requirements of
[`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md).

The matrix ends with two prioritised lists:

- the requirements **without a test** (the honest gap: the test does not exist
  yet, and the planned path is named),
- the requirements **without an acceptance document** (the acceptance documents
  of the tracks do not exist yet; the planned names are given).

Both lists are gaps of this programme, not defects of the product.

---

## 12. Open points

Decisions the owner has to make. Each entry names the options, a recommendation
and the requirements that depend on it.

Four of the points below already exist in the release plan as **OD-xx**; this
document refers to them instead of opening a second list. The remaining points
are specific to the specification.

| Priority | #                                                                          | Question                                                                                                                                                                                                                                                                                                                                                                            | Options                                                                                                                                                                                                                                                    | Recommendation                                                                                                                                                                                                                                                                                                                                  | Affected                                           |
| -------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1        | OPEN-01<br>_(= release plan **OD-07**, licensing **D1**…**D8**)_           | **Apple distribution and licence.** May the iOS track ship at all under GPL-3.0-or-later, and under which distribution model? The licensing round has delivered a draft decision basis with a recommendation (GPL-3.0 §7 _Phomu App Store Exception_, App Store with TestFlight first, the web app as the channel that needs no Apple account) — but it is not a ratified decision. | (a) adopt the §7 exception and ship through the App Store; (b) no App Store — alternative distribution only; (c) drop or re-licence the track; (d) defer until the owner has ratified the licensing document                                               | (a), on the basis of the licensing document, together with the decisions `D2` (CLA) and `D3` (individual enrolment) that it names as prerequisites. The gate `B-09` of the release plan blocks the Beta stage of T4 until the licensing document exists and states the conditions — it now exists; what is missing is the owner's ratification. | `SHELL-106`, `REL-108`, `REL-118`, `CORE-116`      |
| 2        | OPEN-02                                                                    | **Language of the specification.** The repository policy is German for project documentation; this specification folder is English.                                                                                                                                                                                                                                                 | (a) The whole `docs/spec/` folder is English and the policy gets an exception; (b) the folder is German; (c) English SRS, German acceptance documents                                                                                                      | (a) — a technical specification that is read by several roles and by external contributors works better in English; the exception should be written into [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md).                                                                                                                            | All documents of this folder                       |
| 3        | OPEN-03                                                                    | **How does the state reach a second surface on native tracks?** The projector on a TV or a second device needs the state of the pilot device.                                                                                                                                                                                                                                       | (a) The multi-device mode is pulled forward from `Later` into the TV track with a local-network pairing; (b) the TV track shows the game itself and the projection stays on the web; (c) the TV is only a passive screen fed by a QR/handover at the start | (c) for the TV track — it keeps the "no cloud, no account, no network" promise intact and does not pull the multi-device scope into the programme. Option (a) is the only one that gives the TV its purpose, but it needs a data-flow specification and a `PRIVACY.md` change.                                                                  | `SHELL-104`, `SHELL-117`, `PLAT-118`, `A-05`       |
| 4        | OPEN-04<br>_(= release plan **OD-01**)_                                    | **The technology of the desktop shell.** Tauri, egui, a native toolkit per platform, or one web view per shell?                                                                                                                                                                                                                                                                     | (a) Tauri for the desktop shells; (b) egui for the desktop shells; (c) a native toolkit per platform; (d) one web view per shell                                                                                                                           | Let `docs/design/PLATFORM-ARCHITECTURE.md` decide; the specification needs only the consequences (feature parity, reuse of the translation resources). The release plan leans towards (a) because it reuses the existing web assets unchanged.                                                                                                  | `SHELL-105`, `SHELL-107`, `SHELL-109`, `SHELL-110` |
| 5        | OPEN-05<br>_(= release plan **B-04**, **OD-08**)_                          | **The reference device and reference machine per track.** Without them, no performance figure is comparable.                                                                                                                                                                                                                                                                        | (a) One named device per track, chosen from the devices the team already owns; (b) the lowest supported device class per track; (c) both — a "typical" and a "lowest" device                                                                               | (b) — the budgets must hold on the weakest supported device, otherwise the budget is meaningless. The device matrix protocol is the gate `B-04` of the release plan; the concrete list belongs in the release record.                                                                                                                           | `PERF-101`, `PERF-105`, `PERF-108`, `PERF-111`     |
| 6        | OPEN-06<br>_(= release plan \"Open check point\" § 7.1, licensing **D6**)_ | **The minimum supported OS version per track.** It determines the store listings, the build contract and the bridge.                                                                                                                                                                                                                                                                | (a) The version that the current store distribution statistics support; (b) the version that the bridge and the core can be compiled for; (c) the widest possible, to maximise the audience                                                                | (b) with (a) as a check — the technical minimum must be achievable; the audience question is a product decision the release plan makes. The licensing document proposes **iOS 16** as a practical compromise between reach and SwiftUI capability, to be confirmed against the UI work.                                                         | `BRIDGE-116`, `REL-111`, `PLAT-114`                |
| 7        | OPEN-07                                                                    | **The silent fallback to the full catalogue pool.** When the mode filter yields nothing, the picker falls back to the full pool without telling anyone (`GAP-025`).                                                                                                                                                                                                                 | (a) Keep the fallback but show it; (b) replace it with a visible error; (c) fix the data so the fallback is never needed                                                                                                                                   | (a) — a round must be playable, but the pilot must know that the mode is running on unsupported songs.                                                                                                                                                                                                                                          | `CORE-108`                                         |
| 8        | OPEN-08                                                                    | **The phase `locked-in`.** It is declared and entered by no flow (`GAP-010`).                                                                                                                                                                                                                                                                                                       | (a) Build the locking phase; (b) remove it from the type; (c) keep it declared                                                                                                                                                                             | (c) — the Lyrics Labyrinth semantics are a product decision; the type alone costs nothing, but it must not be presented as a working feature.                                                                                                                                                                                                   | `CORE-105`                                         |
| 9        | OPEN-09                                                                    | **Encryption at rest of the session.** The baseline does not require it; the data is a party game state.                                                                                                                                                                                                                                                                            | (a) Not encrypted, as today; (b) encrypted with a key in the platform keystore; (c) encrypted only when the session contains personal data                                                                                                                 | (c) — it scales with the content and costs little where the platform provides a keystore.                                                                                                                                                                                                                                                       | § 8.3, `PLAT-110`                                  |
| 10       | OPEN-10                                                                    | **Who maintains the catalogue artefact in the native tracks.** The admin area is web-only (§ 4.7).                                                                                                                                                                                                                                                                                  | (a) The admin area stays web-only; the artefact is generated in the build; (b) a desktop shell gets the admin area; (c) the admin area moves into the core and every shell gets it                                                                         | (a) — the admin area is a maintenance tool, not a playing feature. It must not delay a track.                                                                                                                                                                                                                                                   | `CORE-110`, `SHELL-115`                            |

---

## 13. Contradictions with the existing requirements

The following statements contradict either [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)
baseline 0.1 or another binding document. **`REQUIREMENTS.md` is not modified by
this programme.** Each entry names the source, the conflict, the consequence and
a resolution proposal. The owner decides; the Product & Requirements Steward
files a change request if a requirement text has to change
([`../cr/CR_TEMPLATE.md`](../cr/CR_TEMPLATE.md)).

### 13.1 Conflicts with `REQUIREMENTS.md`

| #    | Source                                                                                                           | Conflict                                                                                                                                                                                                                                         | Consequence                                                                          | Resolution proposal                                                                                                                                                                                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-01 | `CORE-003` — "player, score, configuration and progress data stay in the browser of the device (`localStorage`)" | The extension replaces `localStorage` with app-scoped storage on the native tracks. The wording names a browser mechanism, not a principle.                                                                                                      | A literal reading of `CORE-003` would forbid every native track.                     | Reword `CORE-003` to name the principle ("remain on the device of the player") and add a platform-specific storage requirement; the new IDs are `PLAT-110` and `SHELL-111`. The behaviour requirement stays; only the medium is generalised. A change request is needed.                           |
| C-02 | `CORE-005` / `LLM.md:37-39` — no title, artist or cover "in the DOM **or in the state**"                         | The web implementation violates this rule today (`W-34`, `GAP-027`): the full song is in `currentSong` (`src/stores/game-store.ts:394-402`). The extension defines the same rule at the bridge level (`BRIDGE-108`).                             | The rule cannot be met on the native tracks if it is not met on the web.             | Decide once for the whole family: either implement the "display song without metadata" in the core — which then applies to all shells at once — or narrow the rule to "not visible to the player" and state it that way. Recommendation: implement it in the core; the web shell then inherits it. |
| C-03 | `MEDIA-001` … `MEDIA-018` — provider behaviour, expressed for a browser                                          | The media requirements describe an IFrame embed (`src/components/game/MusicPlayer.tsx:424-430`). A native shell cannot embed an arbitrary web page; it needs its own playback path.                                                              | Read literally, the media requirements are unsatisfiable outside the browser.        | Keep `MEDIA-*` as the **behaviour** contract (fallback chain, timeout, skip, preview length) and add the shell-specific mechanism as `SHELL-103` … `SHELL-107`. No behaviour changes; the mechanism becomes platform-dependent.                                                                    |
| C-04 | `UI-006` / `UI-007` — the projector reads the same persisted state and re-renders every two seconds              | On native tracks the state lives in app-scoped storage of the pilot device. A second surface cannot read it.                                                                                                                                     | The projector — a core product feature — has no implementation on the native tracks. | Depends on OPEN-03. If the TV track is to be more than a second-hand display, the multi-device mode must be pulled forward into the specification as a data flow. Until then, `SHELL-117` requires the projector surface per shell, and the data flow is open.                                     |
| C-05 | `UI-004` / `UI-005` — the navigation contains lobby and browse; no navigation bar during the game                | The navigation model differs fundamentally per platform (stack, focus, window).                                                                                                                                                                  | A literal reading would force a web navigation bar onto a TV remote.                 | Keep the _targets_ (lobby, browse, settings; no navigation during the game) and add the platform navigation model as `SHELL-101` and `PLAT-101`. The requirement text needs the word "targets" instead of "links".                                                                                 |
| C-06 | `SEC-001` … `SEC-011` — the admin API is a Next.js server interface                                              | The admin API cannot run in the static export (`next.config.ts`, `output: 'export'`; the handlers are not registered by the App Router), and it is not part of the native shells.                                                                | Read literally, the security requirements would apply to every track.                | State explicitly that `SEC-001` … `SEC-011` are server-side requirements of the web deployment. § 4.7 of this SRS makes the delimitation visible.                                                                                                                                                  |
| C-07 | `NFR-009` — source files stay below 550 lines (soft 400)                                                         | The limit is defined for the TypeScript sources. The Rust core, the bridge and the shell sources have no equivalent.                                                                                                                             | The extension creates a codebase with no size discipline.                            | The build contract defines the equivalent limit for Rust and shell sources. The web limit continues to apply unchanged.                                                                                                                                                                            |
| C-08 | `NFR-001` … `NFR-016` — typecheck, lint, unit tests, gates                                                       | The gate set is JavaScript-only (`npm run typecheck`, `npm run lint`, `npm run test`, `scripts/check-*.mjs`). The core and the bridge need `cargo fmt`, `cargo clippy`, `cargo test`; the native shells need their own linters and test runners. | The native tracks would ship without the equivalent of the quality gates.            | `REL-114` requires a CI matrix per track. The concrete gate list belongs in the build contract.                                                                                                                                                                                                    |
| C-09 | `CORE-002` — "all core functions — lobby, game, catalogue, admin API — work without a user account"              | The admin API needs a token (`SEC-001`) and the store listings need a developer account. The requirement talks about the _user_, not the _operator_.                                                                                             | A literal reading is impossible in a store context.                                  | No change needed to the behaviour; the specification adds `REL-118` (store policy checklist) and `PLAT-109` (permission list) so that "no user account" stays checkable per platform.                                                                                                              |
| C-10 | `CORE-012` — "code identifiers stay English, project documentation stays German"                                 | The owner instructed that this specification folder is written in English.                                                                                                                                                                       | A documented deviation from the documentation policy.                                | Decide OPEN-02. Recommendation: an explicit exception for `docs/spec/`, written into [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md).                                                                                                                                                   |

### 13.2 Conflicts with other documents

| #    | Source                                                                                                                                                                                           | Conflict                                                                                                                                                                                                    | Consequence                                                                                            | Resolution proposal                                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-11 | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 4 (465 literal texts, measurement 2026-04) against `I18N-007` in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) (935 literal texts, 2026-10-25) | Both describe the same gate with different values. The current value is **0** — measured in this session: `node scripts/check-i18n-completeness.mjs --count` → "Total literal texts: 0, Files checked: 48". | A reader who takes the requirements document literally concludes that the interface is not translated. | Update `I18N-007` in `REQUIREMENTS.md` to the measured value with the date and the command — a change request, not an edit from this role. `BEST_IN_CLASS.md` § 4 needs the same refresh. This SRS cites the measured value.            |
| C-12 | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 3 (bundle budget 1.5 MB / 600 KB gzip) against the native tracks                                                                                  | The bundle budget does not transfer to a native artefact.                                                                                                                                                   | The extension would measure against an inapplicable target.                                            | The web budget stays for the web track; `PERF-106` defines a separate artefact-size budget per track.                                                                                                                                   |
| C-13 | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) § 5 (contrast "not measured") against `A11Y-101`                                                                                                    | The accessibility target exists but has never been measured for the web shell. The extension inherits an unmeasured target.                                                                                 | "WCAG AA" would be a claim without evidence in every track.                                            | `A11Y-102` and `A11Y-110` make the measurement a gate. The web baseline measurement should be produced once and reused as the reference for the shells.                                                                                 |
| C-14 | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) § "Open gaps" (`GAP-016`: multi-device, session code, Supabase) against the need of the TV track                                            | The TV track needs a second surface, which needs the multi-device mode — which is `Later` and never implemented.                                                                                            | Either the TV track has no purpose or the scope grows.                                                 | Depends on OPEN-03. The recommendation there (the TV as a passive display with a handover) avoids pulling the multi-device scope in.                                                                                                    |
| C-15 | [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) § 2 (layer model `app → components → stores → config/types/utils → data`) against the extension                                                 | The extension introduces a new, lower layer (the Rust core) and a new boundary (the bridge). The existing document describes the web application only.                                                      | A reviewer could read the extension as a violation of the architecture.                                | The architect extends [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) with the core and the bridge as a new section, or `docs/design/PLATFORM-ARCHITECTURE.md` takes it over with an explicit reference. Not decided by this document. |
| C-16 | `docs/acceptance/M0-ACCEPTANCE.md` (10 test files / 97 tests, i18n 0) against `NFR-003` in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) (4 test files / 21 tests)                            | The requirements document names an older test count than the acceptance document and the current repository state.                                                                                          | The traceability of the baseline drifts.                                                               | Update `NFR-003` and `NFR-004` with the current measured values (10 files / 97 tests, measured in this session). A change request.                                                                                                      |

---

## 14. Annex: measured state at the time of writing

The following values were measured in this working session on commit `3d3d011`
and are quoted where they are needed. Everything else in this document is a
target, a reference or a plan.

| Measurement          | Command                                            | Result                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests           | `npx vitest run`                                   | 10 test files, 97 tests, all passed, 20.68 s                                                                                                                                                        |
| Translation literals | `node scripts/check-i18n-completeness.mjs --count` | 0 literal texts in 48 files, exit 0                                                                                                                                                                 |
| Catalogue            | `npm run validate-catalog`                         | 135 pack files, 1.615 songs, 0 schema errors, 126 warnings, 0 duplicate groups, 4 allowed duplicates, 0 missing years (1950–2026) — as recorded in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) |
| Deployment           | `next.config.ts`                                   | `output: 'export'`, `basePath: '/Phomu'`                                                                                                                                                            |
| Persistence          | `src/stores/game-store.ts:619-637`                 | Store key `phomu-game-state`; the persisted field list excludes the current song                                                                                                                    |
| Provider embeds      | `src/components/game/MusicPlayer.tsx:424-430`      | The YouTube IFrame is in the DOM during the question phase                                                                                                                                          |
