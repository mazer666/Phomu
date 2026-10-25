# Phomu Release Plan

**Document status:** binding plan for the release stages of every Phomu platform track
**Applies to:** the web shell and the native tracks (Android, Google TV / Fire TV, macOS, Linux, iPadOS / iOS, Windows and further operating systems)
**Quality model:** [`../../QUALITY.md`](../../QUALITY.md) — the eight acceptance dimensions
**Checklist:** [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) — the executable list for a single release
**Index:** [`README.md`](README.md)

> **Language note — a documented deviation.** The project documentation policy
> ([`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md) §3) and the
> requirement **CORE-012** ("Identifiers stay English, project documentation
> stays German", [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)) name German for
> project documentation. This document is written in English because the work
> order for this round requires it. That is a deviation from an accepted
> requirement and it is therefore recorded here and in the work report as an
> owner decision (**OD-14**), not silently accepted. No file outside
> `docs/releases/` was changed to accommodate it.

---

## 0. Purpose, scope, and how to read this document

### 0.1 Purpose

Phomu is becoming a family of applications on **one shared Rust core** with
platform-specific frontends. This document defines **when** each of those
applications may be handed to users, **at which quality level**, and **what has
to be proven** before that happens. It is the reference for the release stages
Alpha, Beta and Stable, for the gates between them, for the version scheme that
keeps core, bridge and shells in sync, and for the build and signing profile of
each track.

### 0.2 What this document does **not** contain

These documents are written by other rounds in parallel. This plan **references**
them and does not restate or duplicate their content:

| Document                               | Owner of that content | What this plan expects from it                                                                                                                   |
| -------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/design/PLATFORM-ARCHITECTURE.md` | Architect             | The shell technology per platform, the process/thread model of the core, and how the core is packaged into each shell. §5.2 and §7 depend on it. |
| `docs/spec/SRS.md`                     | Specification round   | The system-level description of the core, the bridge and the shells.                                                                             |
| `docs/spec/REQUIREMENTS-PLATFORM.md`   | Specification round   | The requirement IDs that the platform tracks must satisfy; the release gates reference the requirement domains, not the individual IDs.          |
| `docs/licensing/APPLE-LICENSING.md`    | Licensing round       | Whether and under which conditions the iPadOS / iOS track may be distributed at all. Gate **B-09** is blocked until that document exists.        |

If one of those documents contradicts this plan, the contradiction is resolved
by a documented decision (ADR or CR), never by editing one side quietly.

### 0.3 The evidence rule for this document

The rules of [`../../QUALITY.md`](../../QUALITY.md) §10 apply to every statement
here. They are the accepted requirements **CORE-010** (no dummies as accepted
functionality), **NFR-005** (one gate over the whole pipeline), **NFR-007**
(the catalogue report is part of the gate and is filed as evidence in the
release process), **NFR-008** (no acceptance on the basis of stubs) and
**NFR-016** (the development tooling stays reproducible):

1. A gate is green only with the artefact of its named verification path — a
   command with its exit code and decisive line, a test name, or a `file:line`
   reference.
2. What was not measured is **"not measured"** or **"to be verified"**. A
   plausible number is not a measurement.
3. No gate is green on the basis of a stub, a mock, a simulated flow or a dummy
   return value (`QA-003`, Vocument CR-0002, `NFR-008`).
4. A gate that was not run is red. "NOT RUN" with a reason is a valid result,
   a green gate is not.
5. No acceptance criterion in this plan may be weakened silently. What cannot be
   met is documented as not met, with a rationale and an open gap.

### 0.4 The measured starting point

Everything below was read from the repository at the time of writing. It is the
baseline against which the first release of every track is planned.

| Fact                                         | Value                                                                             | Source                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Web shell: static export, base path `/Phomu` | `output: 'export'`, `basePath: '/Phomu'`                                          | `next.config.ts:68-69`                               |
| Package version                              | `0.1.0`                                                                           | `package.json:3`                                     |
| Baseline version                             | `0.1`                                                                             | `project/project.yaml` → `project.baseline_version`  |
| Licence                                      | `GPL-3.0-or-later`                                                                | `project/project.yaml` → `project.license`           |
| CI jobs                                      | `typecheck`, `lint`, `unit-tests`, `catalog-validation`, `quality-gates`, `build` | `.github/workflows/ci.yml:36-163`                    |
| CI Node version                              | 22                                                                                | `.github/workflows/ci.yml:47`                        |
| Deployment                                   | GitHub Pages on push to `main`; **no** quality gate in the deploy workflow        | `.github/workflows/deploy.yml`; ROADMAP gap `GAP-18` |
| Rust core                                    | **not present** — no `Cargo.toml`, no `rust-toolchain.toml` in the tree           | file listing of the repository root                  |
| Native shells                                | **not present** — no `android/`, `ios/`, `desktop/` or `crates/` directory        | file listing of the repository root                  |
| Local gate runner                            | 10 steps, `format:check` non-blocking                                             | `scripts/local-ci.sh`                                |
| Quality gates                                | `check:i18n`, `check:doc-links`, `check:file-size`, combined in `check:all`       | `package.json` scripts; `scripts/check-all.mjs`      |
| Measured test coverage                       | 23.29 % statements, 28.40 % branches, 4 test files, 21 tests                      | `docs/BEST_IN_CLASS.md` §9                           |
| E2E coverage                                 | 1 test, URL assertions only, without the base path                                | `e2e/smoke.spec.ts`; gap `GAP-07`                    |
| Bundle / export size                         | 4.22 MiB JS (1.24 MiB gzip) in 32 chunks; export 147 MB (142 MB covers)           | `docs/BEST_IN_CLASS.md` §3                           |
| Security headers                             | configured, **not delivered** under a static export                               | `next.config.ts` comment; gap `GAP-13`               |
| Admin API                                    | not registered by the App Router, cannot run in an export                         | gap `GAP-22`                                         |
| Device / browser matrix                      | none                                                                              | gap `GAP-08`                                         |
| Release checklist and rollback plan          | none                                                                              | gap `GAP-18`, milestone `M8.4` (status `PLANNED`)    |
| Contrast measurement                         | not measured                                                                      | `docs/BEST_IN_CLASS.md` §5                           |
| Start time and round transition              | not measured                                                                      | `docs/BEST_IN_CLASS.md` §1, §2                       |

**Consequence for planning.** The web shell exists; the Rust core and every
native shell do not. The first native track therefore carries the cost of the
core extraction for all tracks (§9).

---

## 1. The release model

### 1.1 The three stages

| Stage      | One-sentence definition                                                                                                                             | Who receives it                                                                                          | What it triggers                                                                                 | What it promises                                                                                                          | What it does **not** promise                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Alpha**  | The application is complete enough to be played end-to-end on the target device, and every known defect is written down.                            | A named internal test group on the target device class.                                                  | A signed, installable artifact and one distribution channel for that group.                      | The main path works; the known defects are published to the testers before the testers install.                           | Performance, stability, accessibility, store availability, or that a defect report will be answered.                                       |
| **Beta**   | The application is quality-complete on the release scope: measured, accessible, migratable, and free of open blocker defects.                       | A wider group, partly under store review (Play testing tracks, TestFlight, Flathub, notarized download). | A store submission, a documented feedback loop, and an observation window with a defined length. | No known blocker defect in the release scope; measured performance values; a working update path from the previous build. | That every known limitation is fixed; that the observation window was long enough to be statistically meaningful.                          |
| **Stable** | The application is production-ready: zero known defects in the release scope, signed, listed, documented, supportable, updatable and rollback-able. | The public on the track's store or channel.                                                              | Production-track approval, release notes, a support path, a documented update and rollback path. | A published version that can be updated, that can be withdrawn or rolled back, and for which nothing open is known.       | A service-level agreement; support for versions older than the current one and its predecessor; continuity of third-party media providers. |

### 1.2 What a stage is not

- **Not a marketing label.** "Alpha" means exactly the gate list in §4.1. If the
  gates are not met, the artifact is not an Alpha, whatever it is called.
- **Not a version number.** The stage and the version are independent. An Alpha
  can carry `0.3.0`; a Stable can carry `1.0.0`. The stage is a quality
  statement, the version is a compatibility statement (§5).
- **Not a milestone.** A milestone in [`../../ROADMAP.md`](../../ROADMAP.md) is a
  unit of work with gates of its own. A release stage is a unit of distribution.
  A milestone can be `COMPLETE` without any stage having been entered.
- **Not a per-track decision.** The stage is decided per track (§3), but the
  underlying core version is shared (§5.2).

### 1.3 The stage gates at a glance

| Stage  |        Gate criteria | Applies to  | Decided by                                                           |
| ------ | -------------------: | ----------- | -------------------------------------------------------------------- |
| Alpha  | 14 (`A-01` … `A-14`) | every track | Owner on the basis of the release record                             |
| Beta   | 12 (`B-01` … `B-12`) | every track | Owner on the basis of the release record and the store decision      |
| Stable | 12 (`S-01` … `S-12`) | every track | Owner on the basis of the release record and the production approval |

Beta and Stable are **cumulative**: the Beta gate includes every Alpha gate,
and the Stable gate includes every Alpha and Beta gate. A later stage may not
be entered while an earlier gate is red. This is the same rule as
[`../../QUALITY.md`](../../QUALITY.md) §9 — one decision per release, with a
rationale.

### 1.4 What makes a gate green

A gate criterion has exactly three states in the release record:

| State     | Meaning                                                                                     | Effect                                                 |
| --------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `met`     | The verification path was executed and produced the expected result. The artefact is filed. | Counts towards the gate.                               |
| `not met` | The path was executed and produced a wrong or failing result.                               | Blocks the stage.                                      |
| `NOT RUN` | The path was not executed. The reason is written down.                                      | Blocks the stage. "NOT RUN" is never counted as "met". |

No third option exists. In particular, there is no "met by review" and no
"met in principle".

---

## 2. Stage definitions in detail

### 2.1 Alpha

#### 2.1.1 What must be finished, measured along the eight dimensions

The eight dimensions of [`../../QUALITY.md`](../../QUALITY.md) §1–§8 are the
acceptance grid of every stage. The Alpha bar per dimension:

| Dimension                  | What an Alpha must have                                                                                                                                                                                                                                                                                                                                             | What an Alpha may leave open                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **1 Functional**           | The complete game path works on the target device: lobby → pack → round phases → scoring → win condition, in **all six modes**. Edge cases defined: empty catalogue, empty player list, aborted round, timeout, a single device as the player driver. Anti-spoiler protection holds in every phase.                                                                 | Optional behaviour that is explicitly marked _later_ in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md).                   |
| **2 Technical**            | Module boundaries of the architecture respected, constants in one place only, strict typing without `any` and without `@ts-ignore`, source files within the size gate, the feature genuinely implemented and not simulated, generated bindings still generated. State survives a reload — and deliberately does not survive where it must not (anti-spoiler state). | Refactoring debt that does not change behaviour, provided it is listed as a known limitation.                               |
| **3 Performance**          | A reproducible measurement exists on the reference device with the reference data set, with the command recorded. If a budget is defined, the measurement is compared against it.                                                                                                                                                                                   | The budget itself. A budget that is not yet defined is recorded as **"budget not defined"** — never as an estimated number. |
| **4 Usability**            | The common path is findable without a tutorial; the role of the device driver is clear; every dead end has a visible exit; the operation works on the target device class, not only on the desktop.                                                                                                                                                                 | Full accessibility conformance — that is a Beta requirement.                                                                |
| **5 Security / Privacy**   | New network requests are documented; new user data and its storage location are documented; inputs and external URLs are validated; secrets are in no binary, log or commit; every hardening that runs the attack has a **negative test**.                                                                                                                          | Hardening that is not yet implemented, provided it is listed as an open gap with the risk named.                            |
| **6 Internationalisation** | Every visible string comes from the translation; `de` and `en` are completely parallel; no empty values; the English texts are genuine English.                                                                                                                                                                                                                     | Third languages.                                                                                                            |
| **7 Interoperability**     | The application works without an account and without the cloud where the track allows it; broken or blocked external media fall back to the next source; the QR card still works as a printed medium outside the app.                                                                                                                                               | Additional output formats.                                                                                                  |
| **8 Documentation**        | The release notes draft exists; the requirement IDs in the release scope are listed; the known-defect list exists; the release record is filled in.                                                                                                                                                                                                                 | Final store metadata (that belongs to Beta / Stable).                                                                       |

#### 2.1.2 Who may use an Alpha

- The tester group is **named in the release record**, with the device class each
  tester must have. A tester without the target device class cannot test the
  target device class and does not belong in the group.
- Every tester has a way to report a defect (the store channel of the track,
  or the issue tracker) and a way to be told about known defects — the known
  defect list is published to the group **before** the artifact is handed out.
- **No data leaves the device except the data the product needs.** The project
  has no telemetry to third parties — requirement **CORE-011** and the non-goal
  of milestone `M8`. An Alpha that introduces telemetry is not an Alpha. The
  verification is the command of CORE-011:
  `grep -rni "analytics|gtag|segment|sentry|posthog" src/ package.json` must
  stay empty, plus the equivalent check for the native shells.
- Size of the group: for store tracks the store decides (internal testing in
  Google Play allows up to 100 testers per app — source in §7.1). For
  non-store tracks the group is named in the release record; its size is an
  owner decision (see open decision **OD-08**).

#### 2.1.3 Which defects are allowed in an Alpha

**Allowed**, provided each one is written in the known-defect list with its
symptom, the affected configuration and a workaround:

- Cosmetic defects (text, spacing, translation nits) that do not hide information.
- Missing optional behaviour that is marked _later_ in the requirements.
- Measured performance below the target, with the measurement and the target
  both named.
- Accessibility gaps that do not block the main path — with the specific
  element named.
- Missing telemetry-free diagnostics such as a crash symbol file.

**Not allowed**, under any circumstances:

- A crash or a hang in the main game path.
- A spoiler leak: title, artist or cover reaching the screen before the
  answers are locked.
- Loss or corruption of a running game state on reload or on an update.
- A mode that cannot be started or cannot be finished.
- No way out of a dead end.
- A security defect without a negative test that runs the attack.
- A build that cannot be installed or started on the target device class.
- Any defect that is only "probably fine".

#### 2.1.4 Exit criterion for Alpha

The Alpha stage is entered when **all** of the following hold:

1. Every `A-01` … `A-14` criterion is `met` with its artefact filed.
2. The artifact is signed and installable on the target device class.
3. The known-defect list is published to the tester group.
4. The release record is filled in and the Owner has signed it.

The Alpha stage is left when the Beta gate is evaluated. The Alpha artifact
remains reproducible — the release tag and the core version are recorded, so
that a Beta can always be traced back to it.

### 2.2 Beta

Beta adds to the Alpha bar. It is not a bigger Alpha — it is a different
quality claim.

#### 2.2.1 Additional requirements

| Area                      | Beta requirement                                                                                                                                                                                                                                                                       | Source of the target                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Coverage**              | The coverage target of the project is met for the core **and** for the shell, and the core game logic (song picking, QR intent, game store, censor utils, scoring, time decay) has unit tests. The target is **≥ 80 % lines** over the measured sources.                               | `docs/BEST_IN_CLASS.md` §9 (target); current measured value 23.29 % statements — the gap is the work. |
| **Performance**           | The performance budgets of `docs/BEST_IN_CLASS.md` §1–§3 are **measured** on the reference device with the reference data set and filed with the milestone; start time, round-transition latency and memory behaviour are each recorded with the command that produced them.           | `docs/BEST_IN_CLASS.md` §1–§3; currently "not measured".                                              |
| **Security**              | Every hardening has a negative test; the threat model is up to date for the new surface; the privacy trail is described, including how to delete it; the artifact contains no secret.                                                                                                  | `../../QUALITY.md` §5, `../../SECURITY.md`, `../../PRIVACY.md`                                        |
| **Migrations**            | A state migration path exists and is tested: a build from the previous stage can be upgraded to this build, and the game state either migrates correctly or the upgrade refuses cleanly with a named message.                                                                          | `../../QUALITY.md` §1 (edge cases) and §2 (state after reload)                                        |
| **Accessibility**         | The accessibility review of `docs/BEST_IN_CLASS.md` §5 and §6 is executed and recorded: contrast measured per theme (WCAG 2.1 AA: 4.5:1 body text, 3:1 large text and controls), keyboard operation of every game mechanic, visible focus, touch targets ≥ 44 px, screen-reader names. | `docs/BEST_IN_CLASS.md` §5, §6; currently "not measured" / "not met"                                  |
| **Device matrix**         | The device / browser matrix protocol exists and has been executed at least once, with results recorded per device.                                                                                                                                                                     | gap `GAP-08`, milestone `M8.2`                                                                        |
| **Defect state**          | No open defect with severity _blocker_, _critical_ or _major_ in the release scope. Residual minor and cosmetic defects are listed with their workaround.                                                                                                                              | §4.2                                                                                                  |
| **Store / channel state** | The artifact is accepted by the distribution channel: a Play testing track, a TestFlight build, a Flathub submission, a notarized macOS build, an MSIX package.                                                                                                                        | §7                                                                                                    |

#### 2.2.2 Distribution per track

| Track               | Beta channel                                                                                                                                | Who can get it                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Web                 | The web deployment (GitHub Pages, or the host chosen by OD-06) with a version banner, plus a "beta" query parameter or a staging deployment | Anyone the tester group reaches; the group is named in the release record                             |
| Android             | Google Play **internal testing**, then **closed testing**                                                                                   | Up to 100 testers in internal testing (source §7.1); closed testing lists are set in the Play Console |
| Google TV / Fire TV | Google Play for Android TV, internal/closed testing; the TV app is a separate app id with its own listing                                   | The same tester group, extended with TV devices                                                       |
| macOS               | A notarized, Developer-ID-signed build distributed from the project's download page; optionally a TestFlight build for macOS                | The named tester group                                                                                |
| Linux               | A Flatpak built from the submission branch, and an AppImage attached to the release                                                         | Anyone who can install a Flatpak; the AppImage is public from the first Beta                          |
| iPadOS / iOS        | **TestFlight** — internal testers first, external testers via invitation or public link                                                     | Up to 100 internal testers and up to 10 000 external testers per app (source §7.5)                    |
| Windows             | An MSIX package from Partner Center (Store listing in a `private`/`unlisted` track) or a signed sideloaded package for the tester group         | The named tester group                                                                                |

#### 2.2.3 The feedback path

- **Where:** the store's own review channel for store tracks, plus the project's
  issue tracker. Both are named in the release record, with the link.
- **Who answers:** the role that owns the affected dimension (ROLE-06 QA for
  triage, ROLE-03 for game rules, ROLE-04 for interface, ROLE-07 for security,
  ROLE-08 for documentation — role list in [`../../AGENTS.md`](../../AGENTS.md) §3).
- **What is a blocker:** a crash, a spoiler leak, a state loss, a mode that
  cannot be finished, or an install failure. Everything else is a normal
  defect.
- **Response time:** the target for a first triage response is an owner
  decision (open decision **OD-05**). Until it is decided, the record says
  "no response time agreed" — not "best effort".
- **What happens to a report:** it enters the defect list of the release
  record with a severity, a reproduction step and a status. A report that is
  not reproduced is closed with the reason, not deleted.

#### 2.2.4 Duration of the Beta window

The Beta window has a **minimum** and a **recommended** length:

| Track                               | Minimum                                                                                                                                | Reason                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Android (new personal Play account) | **14 consecutive days** with at least 12 testers opted in continuously in the closed test, before production access can be applied for | Google Play requirement for personal accounts created after 13 November 2023 (source §7.1)                                                             |
| Android (organization account)      | none imposed by the store                                                                                                              | same source — the requirement does not apply to organization accounts                                                                                  |
| iPadOS / iOS                        | one TestFlight build cycle; every build is testable for up to 90 days                                                                  | Apple TestFlight overview (source §7.5)                                                                                                                |
| All other tracks                    | an owner decision                                                                                                                      | open decision **OD-04**; proposal: a window in which at least one complete game was played by every tester and at least one release cycle was observed |

The **recommended** minimum for the non-store tracks is deliberately not
invented here: it is an owner decision and is listed as such.

#### 2.2.5 Two channels that are not stores: nightly and sidecar

Two distribution channels exist next to the store channels. Both are
deliberately **outside** the release stages, so that neither can be mistaken
for a release.

**Nightly** — an automated build from the head of the main line, published to
an internal channel without a store and without a version number of its own.

- A nightly build is **not** an Alpha, not a Beta and not a Stable. It has no
  obligation, no acceptance record and no release notes.
- A nightly build is only published from a commit whose gate set for the
  affected track is already green. The nightly build is the _same code_ as a
  gated build, built more often — it does not bypass a gate, it repeats one.
- A nightly build carries the commit hash, never a marketing version. The
  version of the next real release is decided by the release, not by the
  nightly.
- A defect found on a nightly build is reported and triaged like any other
  defect, and it does not change the gate state of a release.

**Sidecar** — the companion build for the device driver (the pilot), which runs
alongside the game on another device so that the projector screen stays free
of controls.

- The sidecar is **not a separate version**. It belongs to a release of a
  track and carries the same version string and the same core version.
- It is distributed outside the store whenever the store does not carry it: a
  direct download for macOS, an AppImage or a Flatpak for Linux, an
  installable package for Windows.
- The sidecar has the same gates as the track it belongs to. A release whose
  sidecar does not work is not a release.
- The decision whether a track has a sidecar at all is part of the track's
  scope; the release plan only fixes the rule that it is not a separate
  version and not a separate stage.

#### 2.2.6 What the Beta does not change

- The **Alpha tester group** is not dissolved by the start of the Beta. Both
  groups exist during the Beta window, and the known-defect list continues to
  be published to both.
- The **known-defect list** of the Alpha continues to exist during the Beta
  and is closed entry by entry — it is not replaced by a new list.
- The **acceptance record** of the Alpha stays in the repository. The Beta has
  its own record; it does not overwrite the Alpha record.

### 2.3 Stable

#### 2.3.1 Additional requirements on top of Beta

| Area                              | Stable requirement                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Defects**                       | **Zero known defects in the release scope.** "Zero" means: no open defect of any severity is listed against the release scope. Residual observations that are not defects (for example "the cover art of one song in one pack is missing") are listed as known limitations in the user-visible documentation, with the impact named. A defect that is consciously not fixed is a **defect**, and it blocks Stable. |
| **Store / channel**               | The production track accepts the release: Google Play production, App Store production, Flathub merged, macOS build notarized and published, MSIX published in the Microsoft Store, web deployed on the production host.                                                                                                                                                                                           |
| **Signing**                       | The artifact is signed with the production key of the track, and the signature is verified with the track's verification command (§7). The signing identity is documented, and the key custody is described (who holds it, where it is stored, how it is rotated).                                                                                                                                                 |
| **Release notes**                 | Release notes exist in three places: the store description (or the download page), the project's `CHANGELOG.md`, and the release record. They name the requirement IDs in scope, the known limitations, and the minimum supported system version.                                                                                                                                                                  |
| **Support**                       | The support path is documented and reachable: the issue tracker, the known-limitations page, and the person who answers. The user guide for the track exists in German and English.                                                                                                                                                                                                                                |
| **Update path**                   | The previous stable version can be updated to this version without data loss, and the update mechanism of the track is verified on a real device (not only in the store's documentation).                                                                                                                                                                                                                          |
| **Rollback**                      | The rollback mechanism of the track is named, prepared and — where the mechanism allows it — has been exercised once during the Beta stage of the same track.                                                                                                                                                                                                                                                      |
| **Performance and accessibility** | The budgets are measured again on the **release build**, not on a development build, and the values are filed.                                                                                                                                                                                                                                                                                                     |
| **Acceptance record**             | The acceptance record of the release exists, is complete, and carries the decision `ACCEPTED` or `ACCEPTED WITH LIMITS` from [`../../QUALITY.md`](../../QUALITY.md) §9, with the rationale and the named limits. `NOT ACCEPTED` means no Stable release.                                                                                                                                                           |

#### 2.3.2 What Stable promises

A Stable release of Phomu promises:

1. **The game can be played.** The complete game path works on the supported
   devices of that track, in all six modes.
2. **Nothing is known to be broken.** Zero open defects in the release scope,
   at the moment of publication.
3. **It can be updated.** A newer version can be installed over the installed
   version without losing a running game state.
4. **It can be taken back.** The rollback mechanism of the track exists, is
   documented and is prepared.
5. **It is attributable.** The artifact is signed, the version is traceable to
   a commit and to a core version, and the release notes name what changed.
6. **Its limits are known.** The known limitations are published where players
   will meet them, not only in the fine print.

#### 2.3.3 What Stable does not promise

- No service-level agreement and no availability guarantee for third-party
  media providers (YouTube, Spotify, Amazon, Apple).
- No support for versions older than the current one and its immediate
  predecessor.
- No promise that a later minor release will not change behaviour in a corner
  case — that is what the requirement IDs in the release notes are for.
- No promise that the "later"-marked requirements of
  [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) will ever be implemented.

---

## 3. The tracks and their release order

### 3.1 Track definitions

| ID      | Track                                 | Shell form                                             | Notes                                                                                                                                                                                                       |
| ------- | ------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T0**  | Web                                   | Responsive web application                             | An **equal shell**, not a fallback. It has its own release track (Web-Alpha / Web-Beta / Web-Stable) and is **not** part of the ordered native sequence. It must stay green at every point of the sequence. |
| **T1**  | Android (phone / tablet)              | Native shell with the shared Rust core                 | First native track. Carries the core extraction for all tracks.                                                                                                                                             |
| **T2**  | Google TV / Fire TV                   | Native shell with the shared Rust core, TV form factor | Depends on T1: same core, same bridge, same AAB pipeline, second app id.                                                                                                                                    |
| **T3a** | macOS                                 | Desktop shell with the shared Rust core                | Developer ID + notarization.                                                                                                                                                                                |
| **T3b** | Linux                                 | Desktop shell with the shared Rust core                | AppImage and Flatpak.                                                                                                                                                                                       |
| **T4**  | iPadOS / iOS                          | Native shell with the shared Rust core                 | One app for iPhone and iPad.                                                                                                                                                                                |
| **T5**  | Windows and further operating systems | Desktop shell with the shared Rust core                | MSIX. "Further operating systems" are added to this stage one at a time, each with its own gate row.                                                                                                        |

### 3.2 The binding order

```text
T1 Android  →  T2 Google TV / Fire TV  →  T3 macOS + Linux  →  T4 iPadOS / iOS  →  T5 Windows + further OS
                                    ↑
                              T0 Web (parallel, always green)
```

**Rule (binding).** A track may not begin its own Alpha work until the
preceding track has a **green release candidate**: a candidate that passes
every Alpha gate of that track (§4.1) and produces a signed, installable
artifact.

**Rule (exception).** Work that is track-independent is always allowed in
parallel: the Rust core itself, the bridge, the CI pipelines, the tooling, the
catalogue, the translation, and the web shell.

**Rule (web).** The web shell is not a predecessor of any track. It is a peer.
If the web shell is red, the sequence continues — but no track may enter its
**Beta** stage while the web shell is red, because the web shell is the
reference implementation of the game rules and the reference consumer of the
catalogue.

### 3.3 The release table per track

| Track                       | Alpha gate                                 | Beta gate                      | Stable gate                    | Predecessor (must be green)       | Distribution                                                          | Store / channel                                                     |
| --------------------------- | ------------------------------------------ | ------------------------------ | ------------------------------ | --------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **T0 Web**                  | `A-01`…`A-14` + web row (§4.1, web column) | `B-01`…`B-12` + web row (§4.2) | `S-01`…`S-12` + web row (§4.3) | none (independent track)          | Static export to the production host; version banner; changelog entry | none — direct deployment (GitHub Pages, or the host of OD-06)       |
| **T1 Android**              | `A-01`…`A-14` + Android row                | `B-01`…`B-12` + Android row    | `S-01`…`S-12` + Android row    | none — first native track         | Play internal testing → closed testing → production                   | Google Play                                                         |
| **T2 Google TV / Fire TV**  | `A-01`…`A-14` + TV row                     | `B-01`…`B-12` + TV row         | `S-01`…`S-12` + TV row         | T1 green RC                       | Play for Android TV, internal/closed testing → production             | Google Play (separate app id); Fire TV route to be verified (§7.2)  |
| **T3a macOS**               | `A-01`…`A-14` + macOS row                  | `B-01`…`B-12` + macOS row      | `S-01`…`S-12` + macOS row      | T2 green RC                       | Developer-ID signed, notarized, stapled download                      | Mac App Store is optional; direct notarized download is the default |
| **T3b Linux**               | `A-01`…`A-14` + Linux row                  | `B-01`…`B-12` + Linux row      | `S-01`…`S-12` + Linux row      | T3a green RC                      | Flatpak via Flathub; AppImage attached to the release                 | Flathub (and own repository as fallback)                            |
| **T4 iPadOS / iOS**         | `A-01`…`A-14` + iOS row                    | `B-01`…`B-12` + iOS row        | `S-01`…`S-12` + iOS row        | T3 green RC (macOS **and** Linux) | TestFlight internal → external                                        | TestFlight → App Store                                              |
| **T5 Windows + further OS** | `A-01`…`A-14` + Windows row                | `B-01`…`B-12` + Windows row    | `S-01`…`S-12` + Windows row    | T4 green RC                       | MSIX via Partner Center (Store, then flights)                         | Microsoft Store                                                     |

### 3.4 The stage table per stage

| Stage                             | Tracks in it         | Entry condition                                                                      | Exit condition                                                           |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Stage 1 — Android**             | T1                   | Core skeleton with the bridge compiling for `aarch64` and `x86_64`; web shell green  | T1 reaches Stable, or the owner decides to open stage 2 on a green T1 RC |
| **Stage 2 — TV**                  | T2                   | T1 green RC                                                                          | T2 reaches Stable                                                        |
| **Stage 3 — Desktop**             | T3a macOS, T3b Linux | T2 green RC                                                                          | Both reach Stable                                                        |
| **Stage 4 — Apple mobile**        | T4                   | T3 green RC (both desktop tracks) **and** `docs/licensing/APPLE-LICENSING.md` exists | T4 reaches Stable                                                        |
| **Stage 5 — Windows and further** | T5                   | T4 green RC                                                                          | T5 reaches Stable                                                        |

---

## 4. The gates

Every criterion names the dimension it comes from
([`../../QUALITY.md`](../../QUALITY.md) §1–§8) and exactly one **verification
path**. A criterion is green only with the artefact of that path.

The verification paths marked **(new)** do not exist in the repository today.
They become available with the corresponding tooling — the Rust toolchain and
the native shells. This is stated here so that nobody mistakes a planned gate
for a runnable one.

### 4.1 Alpha gate — `A-01` … `A-14`

| ID       | Criterion                                                                                                                                                                                                                                 | Dimension | Verification path                                                                                                                                                                 | Evidence artefact                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **A-01** | The release build is reproducible from a tagged commit; the commit, the core version and the bridge ABI version are recorded.                                                                                                             | 2         | `git rev-parse HEAD` + the version command of the track, recorded in the release record                                                                                           | Release record header                                                                                  |
| **A-02** | The complete game path works on the target device class in all six modes, including the defined edge cases (empty catalogue, empty player list, aborted round, timeout, single device as driver).                                         | 1         | Acceptance record §1, scenario table filled, per mode; executed on the target device                                                                                              | Acceptance record §1                                                                                   |
| **A-03** | Anti-spoiler protection holds in every phase: no title, artist or cover reaches the screen before the answers are locked.                                                                                                                 | 1         | Negative test on the spoiler path in the core test suite + acceptance record §1 row per phase                                                                                     | Test names + acceptance record                                                                         |
| **A-04** | The web / shell static analysis and gates are green on the release commit: typecheck, lint, unit tests, catalogue validation, i18n completeness, documentation links, file size.                                                          | 2         | `npm run typecheck` · `npm run lint` · `npm run test` · `npm run validate-catalog` · `npm run validate-songs` · `npm run check:all` — the same jobs as `.github/workflows/ci.yml` | CI run URL + exit codes                                                                                |
| **A-05** | The Rust core compiles, is formatted, is lint-clean and its tests pass on the release commit.                                                                                                                                             | 2         | `cargo build --release` · `cargo fmt --check` · `cargo clippy -- -D warnings` · `cargo test` **(new)**                                                                            | Command output with exit codes                                                                         |
| **A-06** | The bridge is generated, not hand-written, and the generated bindings match the core: the bridge ABI major/minor of the build equals the value expected by the shell, and the UniFFI checksum comparison succeeds at load time.           | 2         | Binding generation in the build pipeline + the handshake log at first start **(new)**                                                                                             | Generated-bindings diff, checksum log                                                                  |
| **A-07** | The catalogue is valid and spoiler-free: no schema error, no unapproved duplicate, no missing year in the coverage window, no spoiler in the hints. The catalogue report is filed with the release.                                       | 1, 7      | `npm run validate-catalog` · `npm run validate-catalog:report` · `node scripts/audit-spoilers.js`                                                                                 | Command output, `specifications/catalog_issues_report.json`, `node_modules/.cache/spoiler-report.json` |
| **A-08** | A performance measurement exists on the reference device with the reference data set, produced by a named command. Where a budget is defined, the measurement is compared with it; where it is not, the record says "budget not defined". | 3         | The measurement command of the track, recorded with the device and the data set **(new)**                                                                                         | Measurement record                                                                                     |
| **A-09** | The common path is reachable without a tutorial and every dead end has a visible exit; the operation works on the target device class.                                                                                                    | 4         | Task walkthrough with the step count (target of the project: 3 clicks — `../../ROADMAP.md` M0) + visual check in all four themes                                                  | Walkthrough notes + screenshots                                                                        |
| **A-10** | Every visible string comes from the translation; German and English are completely parallel; no hard-coded interface text.                                                                                                                | 6         | `npm run check:i18n` for the web assets; the equivalent resource-completeness check for the native shell **(new)**                                                                | Command output / resource report                                                                       |
| **A-11** | No secret is in the binary, in the log or in the commit; every hardening that runs the attack has a negative test; the data trail of the track is documented.                                                                             | 5         | Secret scan of the artifact and the tree **(new)**, the negative tests of the core and the admin API, `../../SECURITY.md`, `../../PRIVACY.md`                                     | Test names, scan output                                                                                |
| **A-12** | The application works without an account and without the cloud where the track allows it; broken or blocked external media fall back to the next source; the QR card works as a printed medium outside the application.                   | 7         | Acceptance record §6 + the provider fallback test per mode + the print test sheet (`../../PRINTING_GUIDE.md`)                                                                     | Acceptance record §6, test sheet                                                                       |
| **A-13** | The release notes draft, the known-defect list and the list of requirement IDs in scope exist.                                                                                                                                            | 8         | `npm run check:doc-links` + the release record sections "Release notes", "Known defects", "Requirement IDs"                                                                       | Release record                                                                                         |
| **A-14** | The artifact is signed, installable and startable on the target device class; the installation and the first start are documented step by step.                                                                                           | 2, 7      | The signing and installation path of the track (§7), executed on a real device of the target class                                                                                | Installation log + device list                                                                         |

**Per-track additions to the Alpha gate**

| Track                  | Additional Alpha criterion                                                                                                                                                       | Verification path                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| T0 Web                 | The static export is generated and served from the production path with the base path `/Phomu`; the security headers are either delivered by the host or the limitation is named | `npm run build`, then the header check of the production host                                  |
| T1 Android             | The AAB is produced by Gradle, the upload key is enrolled with Play App Signing, and the bundle passes the 16 KB page-size check (native code)                                   | `gradlew bundleRelease`, the Play Console signing state, the page-size check script of the NDK |
| T2 Google TV / Fire TV | The manifest declares the leanback feature and the TV launcher intent, the banner artwork exists, and the game is fully operable with a D-pad                                    | Manifest inspection, banner check, D-pad walkthrough on a TV device                            |
| T3a macOS              | The hardened runtime is enabled, the build is signed with Developer ID, and `spctl` accepts it                                                                                   | `codesign -dv --verbose=4`, `spctl --assess --type execute -v`                                 |
| T3b Linux              | The AppImage runs on the reference distributions, the Flatpak manifest builds and the app starts inside the sandbox                                                              | AppImage run on the reference distribution, `flatpak-builder` build, sandbox start             |
| T4 iPadOS / iOS        | The build uploads to App Store Connect, the internal TestFlight group receives it, and the app runs on iPhone and iPad                                                           | Upload log, TestFlight build state, device run                                                 |
| T5 Windows             | The MSIX package is created, installs and starts, and the package identity is correct                                                                                            | `msix` packaging step, install on a clean Windows machine                                      |

### 4.2 Beta gate — `B-01` … `B-12`

All Alpha criteria remain in force.

| ID       | Criterion                                                                                                                                                                                                                                            | Dimension | Verification path                                                                                                                        | Evidence artefact                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **B-01** | The coverage target is met for the core and for the shell (**≥ 80 % lines** over the measured sources), and the core game logic — song picking, QR intent, game store, censor utils, scoring, time decay — has unit tests.                           | 2         | `npm run test` (coverage report) · `cargo test -- --coverage` or the Rust equivalent **(new)**                                           | Coverage report                                    |
| **B-02** | The performance budgets are measured on the reference device with the reference data set and filed: start time, round-transition latency, memory behaviour, and the size of the shipped artifact.                                                    | 3         | The measurement commands of `docs/BEST_IN_CLASS.md` §1–§3, re-run on the release build                                                   | Measurement record with the reference device named |
| **B-03** | The accessibility review is executed and recorded: contrast measured per theme (WCAG 2.1 AA — 4.5:1 body, 3:1 large text and controls), every game mechanic operable by keyboard, visible focus, touch targets ≥ 44 px, screen-reader names present. | 4         | `axe-core` run over the routes/themes of the track, manual keyboard traversal, screen-reader pass                                        | Accessibility report                               |
| **B-04** | The device / browser matrix protocol exists and has been executed once, with the result per device recorded.                                                                                                                                         | 7         | The matrix protocol file + the filled result table                                                                                       | Matrix protocol + result table                     |
| **B-05** | No open defect with severity _blocker_, _critical_ or _major_ in the release scope; every residual defect is listed with its workaround.                                                                                                             | 1         | The defect list of the release record, severity per entry                                                                                | Defect list                                        |
| **B-06** | The migration path works: a build of the previous stage upgrades to this build, and the game state either migrates correctly or the upgrade refuses cleanly with a named message.                                                                    | 1, 2      | Migration test executed on a device with an existing state                                                                               | Migration test record                              |
| **B-07** | The distribution channel accepts the artifact: a Play testing track build, a TestFlight build, a Flathub submission, a notarized macOS build, an MSIX package — or, for the web track, a deployed beta deployment.                                   | 7         | The channel's own state (Play Console release state, TestFlight build state, Flathub PR, `notarytool` output, Partner Center submission) | Channel state + command output                     |
| **B-08** | The feedback path is open and named: the channels, the roles that answer, the severity definitions, and the target response time (or the explicit note that none is agreed).                                                                         | 8         | The release record section "Feedback"                                                                                                    | Release record                                     |
| **B-09** | The licence and distribution conditions of the track are documented and permit this distribution. For the Apple track this means `docs/licensing/APPLE-LICENSING.md` exists and states the conditions.                                               | 8         | The licensing document; `../../LICENSE` for the general case                                                                             | Licensing document                                 |
| **B-10** | The rollback preparation exists: the previous known-good artifact is stored and signed, the rollback procedure is written, and — where the channel allows it — the rollback has been exercised once.                                                 | 2         | The artifact store entry, the rollback section of the release record, the exercise log                                                   | Rollback log                                       |
| **B-11** | The update path works: the new build installs over the previous build of the same track without data loss (version code / build number monotonically increasing).                                                                                    | 7         | Install-over-existing on a device that has the previous version, state preserved                                                         | Install log + state comparison                     |
| **B-12** | The store / channel metadata is filled in: title, description, screenshots at the required sizes, privacy declaration, content rating, support and privacy URLs.                                                                                     | 8         | The channel's own submission form, reviewed before submission                                                                            | Metadata sheet                                     |

### 4.3 Stable gate — `S-01` … `S-12`

All Alpha and Beta criteria remain in force.

| ID       | Criterion                                                                                                                                                                                                                                                    | Dimension | Verification path                                                                                                                                                                       | Evidence artefact                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **S-01** | **Zero open defects in the release scope.** Every observation that is not a defect is listed as a known limitation with its impact.                                                                                                                          | 1         | The defect list of the release record, filtered to the release scope — the filter result is attached                                                                                    | Defect list (empty for the scope) + known-limitations list |
| **S-02** | The production track approves the release.                                                                                                                                                                                                                   | 7         | The channel's production state (Play Console production release, App Store release, Flathub merge, notarization ticket, Partner Center certification)                                   | Channel state                                              |
| **S-03** | The artifact is signed with the production key and the signature verifies with the verification command of the track; the key custody and the rotation path are documented.                                                                                  | 5         | The verification command of §7 (for example `apksigner verify`, `codesign --verify --deep --strict`, `spctl --assess`, `xcrun stapler validate`, `flatpak remote-ls --show-signatures`) | Command output + custody note                              |
| **S-04** | The release notes exist in the store description, in `../../CHANGELOG.md` and in the release record; they name the requirement IDs in scope, the known limitations and the minimum supported system version.                                                 | 8         | The three locations compared with each other                                                                                                                                            | Release notes                                              |
| **S-05** | The support path is documented and reachable: the issue tracker, the known-limitations page, the user guide of the track in German and English, and the person who answers.                                                                                  | 8         | The links in the store listing are checked and resolve; the user-guide files exist                                                                                                      | Support page + user guide                                  |
| **S-06** | The update path from the previous stable version is verified on a real device of the track: the update installs, the state is preserved, and the new version starts.                                                                                         | 7         | The install-over-existing run with the state comparison                                                                                                                                 | Install log                                                |
| **S-07** | The rollback mechanism is named, prepared and, where the mechanism allows it, has been exercised at least once in the Beta stage of this track.                                                                                                              | 2         | The rollback log from the Beta stage, or the explicit statement of why the channel does not permit a rollback                                                                           | Rollback log / statement                                   |
| **S-08** | The performance and accessibility budgets are measured again on the **release build** and met, or the deviation is documented as a named limit with its impact.                                                                                              | 3, 4      | The measurement commands of `B-02` and `B-03`, re-run on the release artifact                                                                                                           | Measurement record                                         |
| **S-09** | The acceptance record of the release is complete and carries the decision from [`../../QUALITY.md`](../../QUALITY.md) §9 — `ACCEPTED` or `ACCEPTED WITH LIMITS` — with the rationale and the named limits. `NOT ACCEPTED` means no Stable release.           | all       | The acceptance record, modelled on `../acceptance/ACCEPTANCE_TEMPLATE.md`                                                                                                               | Acceptance record                                          |
| **S-10** | The observation window has run: the release has been in the channel for the agreed window without an open blocker defect. The window length is the owner decision **OD-04**.                                                                                 | 1         | The observation log: start, end, defect state per entry                                                                                                                                 | Observation log                                            |
| **S-11** | The signing and publishing material of the track is complete and reproducible: the build command, the signing command, the upload command and the verification command are written down in the release record and were executed by the person who publishes. | 2         | The release record section "Build and publish" with the commands and their exit codes                                                                                                   | Release record                                             |
| **S-12** | The rollback target is still available and verified: the artifact of the previous stable version is stored, signed and installable.                                                                                                                          | 2         | The artifact store entry plus a fresh signature verification                                                                                                                            | Artifact store entry                                       |

---

## 5. Versioning across the tracks

### 5.1 The three numbers and their jobs

| Number                 | Scope                                       | Scheme                                                             | Answers                                               |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| **Core version**       | The Rust core (`phomu-core` and its crates) | Semantic Versioning `MAJOR.MINOR.PATCH`                            | Which behaviour of the game is in this build.         |
| **Bridge ABI version** | The surface the core exposes to the shells  | `BRIDGE_ABI_MAJOR.BRIDGE_ABI_MINOR` — two integers, no patch level | Which functions and types a shell may call.           |
| **Shell version**      | One shell of one track                      | `<core version>+<track>.<shell build>`                             | Which build of which track, built against which core. |

### 5.2 The core version

- The core version is **one** number for all tracks. There is no per-track core
  version and no per-track fork of the core. A track may ship an **older** core
  version than another track (see §5.5); it never ships a _different_ core.
- The core version follows SemVer: `MAJOR` for a change of the game's
  behaviour that breaks a shell, `MINOR` for an additive change, `PATCH` for a
  fix.
- The core version is the version of the game rules. The game rules are
  defined in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) and in
  `src/config/game-config.ts`; the core version follows them.
- **Prerequisite:** the core must be packaged into each shell statically, so
  that a "core version" is a property of the build and not something that is
  downloaded at runtime. This plan assumes that packaging. If
  `docs/design/PLATFORM-ARCHITECTURE.md` decides otherwise, §5.4 and §5.5
  must be reworked before the first native Alpha — this is open decision
  **OD-02**.

### 5.3 The bridge ABI version

The bridge is the generated boundary between the core and a shell
(UniFFI for Kotlin and Swift; the concrete mechanism is the architect's
decision). It has its own version, because the game behaviour and the
callable surface change at different speeds.

| Change in the bridge surface                                                                            | Effect on the ABI version |
| ------------------------------------------------------------------------------------------------------- | ------------------------- |
| A function, method, record field or enum variant is **added**                                           | `MINOR` + 1               |
| A function, method, type or field is **removed**, **renamed**, or its **signature or semantics change** | `MAJOR` + 1               |
| Only the implementation changes, the surface does not                                                   | no change                 |

**The runtime guard.** UniFFI already computes a checksum over the API surface
and refuses to load bindings whose checksum does not match the library
(sources in §5.6). Phomu relies on that check as the _hard_ guard: a shell
built against a different surface cannot start at all.

**The soft guard.** A checksum says "different", not "how different". Therefore
the core additionally exports two integers:

- `BRIDGE_ABI_MAJOR` — must equal the value the shell expects. A mismatch in
  either direction **stops the shell** with a named error, not a crash and not
  a silent degradation.
- `BRIDGE_ABI_MINOR` — the feature level of the core.
  - `core minor ≥ shell expected`: the shell starts. Features that were added
    after the shell's expected minor are **not available**; the core exposes a
    capability list, the shell queries it and hides the unavailable entries
    instead of showing a broken button.
  - `core minor < shell expected`: refused. A shell never runs against an
    older core than it was built for.

### 5.4 The rule for incompatible bridge changes

> **Any change to the bridge surface that removes, renames or retypes an
> exported symbol raises `BRIDGE_ABI_MAJOR` by one. A shell may not be
> published with a mismatched major — not to a store, not to a Beta group.**

Consequences:

1. The change is recorded in `../../CHANGELOG.md` under a heading **"Bridge
   ABI"**, naming the symbol, the old and the new signature, and the
   migration for each shell.
2. Every shell must be rebuilt against the new core and pass the whole gate of
   its track before it may be published.
3. If a store listing contains a shell on the old major, the new major may
   only be shipped after the old one has been updated — **or** the core keeps
   the previous major exported in a compatibility module for exactly one
   release cycle. The decision which of the two applies is recorded in the
   changelog entry.
4. The build pipeline of every shell compares the generated binding checksum
   with the core's expected checksum and fails the build on a mismatch. This is
   the CI gate behind the rule — it must be green for the release to be
   allowed, not merely checked afterwards.

### 5.5 When a shell needs an older core

A shell is always built against one core version. "A shell needs an older
core" therefore means: the shell was built earlier, and the store listing
still offers the newer core version.

| Situation                                                                                                  | What is allowed                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A track ships a build with an older core version than another track                                        | **Allowed.** The core version may differ between tracks at any time.                                                                       |
| A track ships a build with an older core version than its own previous build                               | **Forbidden.** The core version of a listing only moves forward.                                                                           |
| A track ships a build whose `BRIDGE_ABI_MAJOR` differs from the previously published build of that listing | **Forbidden** without the compatibility module of §5.4 item 3. The old major must remain loadable, or the old build must be updated first. |
| A shell is patched for a bug that exists only in the older core                                            | Allowed as an exception, recorded in the release record and in the changelog, with the reason and the expiry condition.                    |
| The catalogue, the translation or the game rules change and only the web shell is rebuilt                  | Allowed. The core version of the native tracks does not change if the core did not change.                                                 |

### 5.6 The version string per track

| Track                  | Version string on the artifact                                                                            | Notes                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| T0 Web                 | `0.1.0` (package version) + build id                                                                      | The web shell has no bridge; the version is the web version.                                          |
| T1 Android             | `0.1.0 (core 0.1.0, bridge ABI 1.0)` — `versionName` plus `versionCode`                                   | `versionCode` is monotonically increasing per listing; the core version is shown in the about screen. |
| T2 Google TV / Fire TV | own `versionName` / `versionCode`; the core version is shown in the about screen                          | The TV listing has its own version counters.                                                          |
| T3a macOS              | `0.1.0 (core 0.1.0, bridge ABI 1.0)` — `CFBundleShortVersionString` plus `CFBundleVersion`                |                                                                                                       |
| T3b Linux              | AppImage: file name carries the version; Flatpak: the `branch` in the manifest plus the appstream version |                                                                                                       |
| T4 iPadOS / iOS        | `0.1.0 (0.1)` — `CFBundleShortVersionString` plus `CFBundleVersion`                                       | The build number is monotonically increasing per listing.                                             |
| T5 Windows             | `0.1.0` — `PackageVersion` in the MSIX manifest; the `Identity Version` must be four-part                 | The MSIX identity version has its own format; the core version goes into the about screen.            |

### 5.7 Sources for the versioning scheme

| Statement                                                                                                                                                    | Source                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UniFFI computes a checksum over the API surface and compares it when bindings are loaded; a mismatch across UniFFI versions is a known, documented situation | <https://github.com/mozilla/uniffi-rs/blob/main/CHANGELOG.md> — "Method checksums no longer include the self type … checksum comparisons will fail if bindings built with `0.30.x` and the Rust code is built with `0.31.x`" |
| UniFFI versions its crates in lockstep; the `uniffi` crate version indicates breaking changes for consumers                                                  | <https://github.com/deepwiki.com/mozilla/uniffi-rs/6-advanced-topics> (DeepWiki summary of `uniffi-rs`) — treat as a secondary source; the upstream CHANGELOG is authoritative                                               |
| UniFFI generates bindings for Kotlin and Swift from the same component interface                                                                             | <https://mozilla.github.io/uniffi-rs/latest/bindings.html>                                                                                                                                                                   |
| The project follows Semantic Versioning                                                                                                                      | `../../CHANGELOG.md` — "Die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/)"                                                                                                                          |

---

## 6. The release process

### 6.1 Who does what

The roles are the ones defined in [`../../AGENTS.md`](../../AGENTS.md) §3. The
table adds the release-specific duties.

| Role                                       | Release duty                                                                                                                                                                                       | May block                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Owner**                                  | Decides the stage entry and the stage exit. Signs the release record. Publishes the artifact (no agent commits, pushes, tags or releases — `AGENTS.md` §6).                                        | Everything                                                   |
| **ROLE-01 Product & Requirements Steward** | Confirms that the requirement IDs in the release scope are the accepted ones and that no scope was silently changed.                                                                               | Scope changes without a CR                                   |
| **ROLE-02 Chief Architect**                | Confirms the bridge ABI version of the build and that no boundary was crossed.                                                                                                                     | A build whose bridge ABI does not match the shell            |
| **ROLE-03 Game Engine Engineer**           | Confirms the game rules, the scoring and the anti-spoiler behaviour of the release build.                                                                                                          | A behaviour change without a requirement                     |
| **ROLE-04 UI/UX Engineer**                 | Confirms the interface, the themes, the projector mode and the accessibility of the release build.                                                                                                 | A contrast or focus regression                               |
| **ROLE-05 Internationalization Engineer**  | Confirms the translation completeness of the release build.                                                                                                                                        | A half-translation                                           |
| **ROLE-06 QA & Test Engineer**             | Owns the CI gate, the test evidence and the acceptance record. **May refuse an acceptance** if a statement stands without evidence, a test was skipped, or a gate stays green on a real violation. | An acceptance without evidence                               |
| **ROLE-07 Security & Privacy Manager**     | Confirms the negative tests, the signing custody and the privacy trail of the release build.                                                                                                       | A secret in an artifact, a hardening without a negative test |
| **ROLE-08 Documentation Lead**             | Confirms the release notes, the user guide and that every relative link resolves.                                                                                                                  | A placeholder text, a broken link                            |

### 6.2 Which checks run

The checks of the web and core pipeline are the jobs of
`.github/workflows/ci.yml`; the release adds the per-track build and signing
jobs.

| Check                          | Command                                                                                   | Job in CI                                            | Blocks              |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------- |
| Type check                     | `npm run typecheck`                                                                       | `typecheck`                                          | Alpha and later     |
| Lint                           | `npm run lint`                                                                            | `lint`                                               | Alpha and later     |
| Unit tests                     | `npm run test`                                                                            | `unit-tests`                                         | Alpha and later     |
| Catalogue validation           | `npm run validate-songs`, `npm run validate-catalog`                                      | `catalog-validation`                                 | Alpha and later     |
| Quality gates                  | `npm run check:all` (`check:i18n`, `check:doc-links`, `check:file-size`)                  | `quality-gates`                                      | Alpha and later     |
| Production build               | `npm run build`                                                                           | `build`                                              | Alpha and later     |
| Dependency audit               | `npm audit --omit=dev --audit-level=moderate`                                             | not yet in CI — part of `scripts/local-ci.sh` step 8 | Alpha and later     |
| Core build, format, lint, test | `cargo build --release`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` | **(new)**, per shell pipeline                        | Alpha and later     |
| Bridge checksum comparison     | generated-bindings checksum vs. core checksum                                             | **(new)**, per shell pipeline                        | Alpha and later     |
| Per-track packaging            | see §7                                                                                    | **(new)**                                            | Beta                |
| Signing verification           | see §7                                                                                    | **(new)**                                            | Stable              |
| Acceptance record              | modelled on `../acceptance/ACCEPTANCE_TEMPLATE.md`                                        | manual                                               | Alpha, Beta, Stable |

`scripts/local-ci.sh` runs the whole web gate set in one command and is the
quick local equivalent of the CI jobs.

### 6.3 The release record

One release record per released artifact. It is the acceptance document of the
release and it lives under `docs/acceptance/`, named
`<TRACK>-<STAGE>-<VERSION>-ACCEPTANCE.md` (for example
`ANDROID-ALPHA-0.1.0-ACCEPTANCE.md`). It follows
[`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md)
and adds the release-specific header:

| Field                    | Content                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Track and stage          | for example `T1 Android — Alpha`                                                                                       |
| Version string           | core version, bridge ABI version, shell version                                                                        |
| Commit                   | the tag and the commit hash                                                                                            |
| Build environment        | Node version, Rust toolchain version, JDK version, Gradle version, Xcode version, OS versions of the build machines    |
| Requirement IDs in scope | the IDs from [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) that this release covers                                 |
| Gate table               | every gate criterion of §4 with its state (`met` / `not met` / `NOT RUN`) and the artefact                             |
| Known defects            | the list with severity, symptom, configuration and workaround                                                          |
| Known limitations        | the list with impact                                                                                                   |
| Release notes            | the three versions of the notes (store, changelog, record)                                                             |
| Feedback path            | the channels, the roles, the severity definitions, the response time                                                   |
| Build and publish        | the exact build, signing, upload and verification commands with their exit codes                                       |
| Rollback                 | the mechanism, the rollback target artifact, the exercise log                                                          |
| Decision                 | `ACCEPTED` / `ACCEPTED WITH LIMITS` / `NOT ACCEPTED` with the rationale, per [`../../QUALITY.md`](../../QUALITY.md) §9 |
| Signature                | the person who decided, the date                                                                                       |

### 6.4 Rollback

Rollback means: the released artifact is withdrawn or replaced, and the
players are returned to a state in which the game works.

| Track                  | Rollback mechanism                                                                                                     | Notes                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T0 Web                 | Redeploy the previous build artifact to the production host                                                            | The previous export must be kept; a build is reproducible from the tag                                                                                  |
| T1 Android             | Halt the staged rollout; the previous `versionCode` remains installable for users who have it                          | Users who already received the new build keep it — the mechanism is _stop the rollout_, not _un-install_. That limitation is named in the release notes |
| T2 Google TV / Fire TV | as Android, per listing                                                                                                |                                                                                                                                                         |
| T3a macOS              | Publish a new notarized build with the previous version; users update forward                                          | A silent downgrade is not possible for a signed, notarized app — the rollback is a forward fix, or a published withdrawal notice                        |
| T3b Linux              | Flatpak: the previous commit can be rolled back on Flathub; AppImage: publish the previous file with a higher revision |                                                                                                                                                         |
| T4 iPadOS / iOS        | The previous build stays available; a phased release can be stopped; the last approved version remains on the store    | Apple does not offer a "revert to previous version" for a published app — the mechanism is _stop the phased release_ and _publish a fix_                |
| T5 Windows             | The previous flight is withdrawn; the store update path stays                                                          |                                                                                                                                                         |

**The rule.** The rollback mechanism of a track is named in the release record
**before** the release, the previous known-good artifact is stored and signed,
and — where the mechanism allows it — the rollback is exercised once during the
Beta stage of that track (gate `B-10`). A rollback that has never been
exercised is a plan, not a capability, and the release record says so.

### 6.5 Hotfixes

1. The hotfix branches from the **release tag** of the affected track, not from
   the head of the main line.
2. The hotfix contains the smallest possible change. Anything else is a
   separate release.
3. The hotfix passes the gate of its track **for the affected scope**: the
   functional and technical criteria of the changed area, the security criteria
   if security-relevant, and the build and signing criteria of the track. The
   gates that are explicitly not re-run are named in the release record, with
   the reason.
4. The core version increases by one **patch** level. A bridge change is
   forbidden in a hotfix — a bridge change raises the ABI major and belongs in
   a regular release with the full rebuild of every shell (§5.4).
5. The hotfix is published through the normal channel of the track, with
   release notes that name the defect it fixes.
6. The defect entry in the defect list of the affected release is closed with
   the reference to the hotfix version.

---

## 7. Build and signing profile per track

This section states, per track: **what is needed**, **which account is
required**, and **what blocks**. Every number that comes from a store is
given with its source. Where a fact could not be verified from a primary
source, it is written as an open check point, not as a number.

### 7.1 T1 — Android (phone / tablet)

| Item                 | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Build**            | Gradle with the Android Gradle Plugin; the publishable artifact is the **Android App Bundle** (`bundleRelease` → `.aab`). Gradle and the plugin version are pinned in the build files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Artifact**         | `.aab` — Google Play generates the device-specific APKs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Signing**          | **Play App Signing**: the _upload key_ is kept by Phomu (a keystore in the Java keystore format, RSA, ≥ 2048 bit), the _app signing key_ is generated and held by Google. Play App Signing is required for new apps that use app bundles.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Account**          | A Play Console developer account. The registration fee is **US$25, one time** (no annual renewal stated by Google). Source: <https://support.google.com/googleplay/android-developer/answer/6112435> — "There is a US$25 one-time registration fee".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Blocks**           | (1) New apps must be published as an app bundle — since August 2021. Source: <https://support.google.com/googleplay/android-developer/answer/9844279> — "Starting August 2021, new apps are required to publish with the Android App Bundle on Google Play." (2) Apps with native code (the Rust core does) targeting Android 15+ must support 16 KB page sizes; Google Play blocks updates that do not. Source: <https://android-developers.googleblog.com/2025/05/prepare-play-apps-for-devices-with-16kb-page-size.html> and <https://developer.android.com/guide/practices/page-sizes>. (3) For personal accounts created after 13 November 2023, production access requires a closed test with **at least 12 testers opted in continuously for 14 days**. Source: <https://support.google.com/googleplay/android-developer/answer/14151465>. (4) Internal testing allows **up to 100 testers per app**. Source: <https://support.google.com/googleplay/android-developer/answer/9845334> and <https://play.google.com/intl/en_ALL/console/about/internal-testing/>. |
| **Verification**     | `apksigner verify --print-certs` on the extracted APK; the 16 KB page-size check script of the NDK against the extracted native libraries; the Play Console "App integrity" state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Open check point** | The minimum `sdkVersion` and the concrete device set of the first Alpha are **to be verified** — they follow from the device matrix (gate `B-04`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### 7.2 T2 — Google TV / Fire TV

| Item                 | Content                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**            | The same Gradle pipeline as T1 with a TV-specific product flavour: `android.software.leanback` declared as required, a `LEANBACK_LAUNCHER` intent filter, and a TV banner in the required sizes.                                                                                                                                                                                                                                                |
| **Artifact**         | A separate `.aab` for a **separate app id**. A phone/tablet app and a TV app are separate listings with separate reviews; the core and the bridge are shared with T1.                                                                                                                                                                                                                                                                           |
| **Signing**          | The same Play App Signing procedure as T1, with a separate upload key per app id.                                                                                                                                                                                                                                                                                                                                                               |
| **Account**          | The same Play Console account as T1.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Blocks**           | (1) **All** TV app updates must be published as app bundles; APK-based TV updates are no longer supported since 30 June 2023. Source: <https://support.google.com/googleplay/android-developer/answer/9844279> — "As of June 30, 2023, Google Play no longer support TV app updates using APKs." (2) The leanback manifest requirements and the banner artwork are mandatory. (3) The 16 KB page-size requirement of §7.1 applies here as well. |
| **Verification**     | Manifest inspection of the built bundle (`aapt2 dump badging`), the banner check, a D-pad walkthrough on a TV device of the target class.                                                                                                                                                                                                                                                                                                       |
| **Open check point** | Whether the targeted Fire TV device models additionally require an **Amazon Appstore** submission, and what the Fire TV-specific requirements are, is **to be verified** against Amazon's developer documentation before the T2 Alpha starts. The release plan does not assume an answer.                                                                                                                                                       |

### 7.3 T3a — macOS

| Item             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**        | Xcode (or SwiftPM for the shell, plus the Rust static library) → an `.app` bundle with the **hardened runtime** enabled. The hardened runtime is mandatory for notarization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Artifact**     | A Developer-ID-signed `.app` inside a `.dmg` or a `.zip`, plus the notarization ticket stapled to it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Signing**      | A **Developer ID Application** certificate. Notarization via `xcrun notarytool`, stapling via `xcrun stapler staple`. The notary service no longer accepts uploads via `altool` or Xcode 13 or earlier — `notarytool` or Xcode 14+ is required. Source: <https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution>.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Account**      | **Apple Developer Program** — **99 USD per membership year**. Source: <https://developer.apple.com/programs/> and <https://developer.apple.com/programs/whats-included/>. The Enterprise Program (299 USD/year) is not the right product for a public game distribution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Blocks**       | (1) Notarization requires: a valid Developer ID certificate, the hardened runtime, a secure timestamp, no `com.apple.security.get-task-allow` entitlement with a `true` value, and a link against the macOS 10.9 SDK or later. Source: <https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution>. (2) On macOS 10.15 and later, software distributed outside the App Store must be signed with Developer ID **and** notarized to run under the default Gatekeeper settings. Source: <https://support.apple.com/guide/security/app-code-signing-process-sec3ad8e6e53/web>. (3) The licence and distribution conditions of the project must permit macOS distribution — see `docs/licensing/APPLE-LICENSING.md` (open decision **OD-07**). |
| **Verification** | `codesign -dv --verbose=4 <app>` (signature and hardened runtime flag), `spctl --assess --type execute -v <app>` (Gatekeeper result — expected: `accepted`, `source=Notarized Developer ID`), `xcrun stapler validate <app>`. The `spctl` expectation is documented by Apple: <https://support.apple.com/en-ie/guide/platform-support/sup1bb3ceba8/web>.                                                                                                                                                                                                                                                                                                                                                                                                                          |

### 7.4 T3b — Linux

| Item             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**        | Two artifacts: an **AppImage** (a single file, no installation) and a **Flatpak** built with `flatpak-builder` from a manifest in the repository.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Artifact**     | `.AppImage` plus a Flatpak bundle / repository.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Signing**      | **AppImage: optional.** The AppImage format carries an optional GPG signature; an unsigned AppImage runs, but the desktop shows a warning. **Flatpak: mandatory for the repository.** Every commit to a Flatpak repository should be signed with a GPG signature; `flatpak-builder --gpg-sign=<key>` is the mechanism. Source: <https://docs.flatpak.org/en/latest/conventions.html> — "Every commit to a Flatpak repository should be signed with a GPG signature." On Flathub, the build itself is signed by Flathub's key and Flatpak/OSTree verifies those signatures on install and update. Source: <https://docs.flathub.org/blog/app-safety-layered-approach-source-to-user>.                                                                                                                                                                                  |
| **Account**      | For Flathub: a GitHub account with write access to the Flathub repository and an **application id** in reverse-DNS form over a domain the project controls. Source: <https://docs.flathub.org/docs/for-app-authors/requirements>. For an own repository: a GPG key for the repository signing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Blocks**       | (1) Flathub requires that all source-available submissions are built **entirely from source**, that no binary or precompiled file is in the submission, and that no source code or build artifact is included in the submission. Source: <https://docs.flathub.org/docs/for-app-authors/requirements>. (2) There is **no network access during the build** — every dependency must be reachable via the manifest sources with publicly accessible URLs. Same source. (3) The manifest must use the current Flathub runtime, the app id must exactly match the id tag in the metainfo file, a valid metainfo file is mandatory, and a desktop file is mandatory for graphical applications. Same source. (4) The app id must be over a domain the project controls, or a domain verified via `https://<domain>/.well-known/org.flathub.VerifiedApps.txt`. Same source. |
| **Verification** | `flatpak remote-ls --show-signatures` for the repository signature, `appstreamcli validate` for the metainfo file, an install-and-start inside the sandbox, and the AppImage on the reference distributions of the matrix.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### 7.5 T4 — iPadOS / iOS

| Item             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**        | Xcode project + SwiftPM for the shell, the Rust static library linked in, an archive per architecture.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Artifact**     | An `.xcarchive` uploaded to App Store Connect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Signing**      | The distribution certificate and the provisioning profile of the Apple Developer Program; the build is signed with the distribution identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Account**      | **Apple Developer Program** — **99 USD per membership year**. Source: <https://developer.apple.com/programs/enroll/> — "The Apple Developer Program is 99 USD per membership year." A personal/individual membership publishes under the personal legal name; an organization membership requires a legal entity and its verification. Same source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Blocks**       | (1) **The licence condition.** The project is **GPL-3.0-or-later** (`project/project.yaml` → `project.license`). Whether and how that may be reconciled with the App Store distribution terms is decided in `docs/licensing/APPLE-LICENSING.md` — **until that document exists, this track may not enter Beta** (gate `B-09`). (2) TestFlight: up to **100 internal testers** and up to **10 000 external testers** per app; an external beta may require beta review; a build can be tested for up to **90 days**. Source: <https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/> and <https://developer.apple.com/programs/> ("invite up to 10,000 external users"). (3) The upload requires the current Xcode and the current SDK for the target OS versions. The current minimum SDK requirement of Apple is **to be verified** at the time of the upload — it changes with every OS release and is therefore not written here as a fixed number. |
| **Verification** | The build state in App Store Connect, the TestFlight group state, and a run on iPhone and iPad.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### 7.6 T5 — Windows and further operating systems

| Item             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**        | An **MSIX** package. Microsoft recommends MSIX over MSI for Store distribution; the package may be built from any app framework. Source: <https://learn.microsoft.com/en-us/windows/apps/publish/faq/get-started-with-the-microsoft-store> — "We recommend packaging your app … as **MSIX**."                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Artifact**     | `.msix` / `.msixbundle` with a four-part `Identity Version`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Signing**      | A package signed with a trusted certificate. For the Store route, Microsoft signs the package at no cost after the certification review. Source: <https://learn.microsoft.com/en-us/windows/apps/publish/faq/get-started-with-the-microsoft-store> and <https://developer.microsoft.com/en-us/windows/apps/build-a-windows-app> — "When you submit an MSIX package, the Store signs it at no cost."                                                                                                                                                                                                                                                                                                                                                                 |
| **Account**      | A Microsoft Partner Center developer account (Individual or Company). **The current fee state is contradictory in the vendor's own documentation and is therefore an open check point, not a number here:** the FAQ page states a one-time registration fee of approximately 99 USD for companies, while the current onboarding documentation states that the new onboarding experience has **no registration fees** for either account type. Sources: <https://learn.microsoft.com/en-us/windows/apps/publish/faq/get-started-with-the-microsoft-store> and <https://learn.microsoft.com/en-us/windows/apps/get-started/sign-up> and <https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-company-developer>. **To be verified before the T5 Alpha.** |
| **Blocks**       | (1) The certification review of the Microsoft Store — the review criteria are not reproduced here; the criteria list of the Store is the normative reference and must be checked per submission. (2) For distribution **outside** the Store, a trusted code-signing certificate is required, and the reputation requirement for SmartScreen is a separate question — **to be verified**. (3) The package must install and update correctly on a clean Windows machine with a clean profile.                                                                                                                                                                                                                                                                         |
| **Verification** | The installation on a clean machine, the package identity check, the update over the previous version, and the Partner Center certification state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### 7.7 T0 — Web

| Item             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**        | `npm run build` → static export into `out/`, with `basePath: '/Phomu'`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Artifact**     | The static export.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Signing**      | Not applicable — a static site has no code signature.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Account**      | The hosting account (GitHub Pages with the repository's Pages site, or the host of open decision **OD-06**).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Blocks**       | (1) **The security headers are configured but not delivered.** `next.config.ts` states that Next.js does not apply `headers()` to a static export, so no CSP and no HSTS reach the served pages (gap `GAP-13`). Until the host delivers the headers, the web track cannot pass the security criterion of the Stable gate. (2) The GitHub Pages limits: a published site may be **no larger than 1 GB**, a **soft** bandwidth limit of **100 GB per month**, and a **soft** limit of **10 builds per hour** (the build limit does not apply to a custom Actions workflow). Source: <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>. The measured export is **147 MB**, of which **142 MB** are cover images (`docs/BEST_IN_CLASS.md` §3) — the size is inside the limit, the bandwidth is the real constraint and must be checked against the expected number of pack downloads. (3) The deployment workflow currently runs **no** quality gate (gap `GAP-18`); the deploy must depend on the CI workflow before the first web release. |
| **Verification** | The header check against the production URL, the export size measurement, and the CI-to-deploy dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## 8. What the alphas of the other tracks mean for the active track

The order of the tracks is binding. This section states what that means in
practice.

### 8.1 The rule and its exact wording

> A track may begin its Alpha work only when its predecessor has a **green
> release candidate**.

**"Green release candidate"** means, for the predecessor track:

1. Every Alpha criterion of §4.1 is `met` with its artefact filed.
2. A release candidate artifact exists that is signed and installable on the
   predecessor's target device class.
3. The acceptance record of that candidate exists and carries the decision
   `ACCEPTED` or `ACCEPTED WITH LIMITS`.
4. The known-defect list of that candidate exists.

It does **not** mean that the predecessor has reached Stable. The sequence is
about _readiness_, not about _public availability_.

### 8.2 What each track inherits from its predecessor

| Transition | What the new track inherits                                                                                          | What it must build itself                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| T0 → T1    | The game rules, the catalogue, the translation, the CI pattern, the acceptance pattern, the documentation discipline | The Rust core, the bridge, the Android shell, the Gradle pipeline, the signing, the store account          |
| T1 → T2    | The core, the bridge, the AAB pipeline, the signing practice, the defect list                                        | The leanback manifest, the banner, the TV navigation, the TV layout, the second app id                     |
| T2 → T3    | The core, the bridge, the release discipline, the gate pattern                                                       | The desktop shell, the desktop build, the notarization or the packaging, the desktop input handling        |
| T3 → T4    | The core, the bridge, the macOS toolchain experience, the Apple account, the licensing answer                        | The Swift shell, the Xcode project, the touch and pencil input, the iOS lifecycle, the TestFlight pipeline |
| T4 → T5    | The core, the bridge, the release discipline, the gate pattern                                                       | The Windows shell, the MSIX packaging, the Windows input handling, the Store submission                    |

### 8.3 What is always parallel

- The Rust core itself.
- The bridge and its ABI version.
- The CI pipelines and the release tooling.
- The catalogue, the translation and the documentation.
- The web shell.

### 8.4 What happens when a predecessor regresses

1. The successor track **does not** lose its already-earned Alpha status; the
   gates that were met stay met.
2. A **new** release of the successor track may not enter its Beta stage while
   the predecessor's current release candidate is red. The reason is written
   into the release record.
3. A defect that is found in the core and affects several tracks is fixed in
   the core, and the fix is released per track in the order of the sequence.
   A track may not ship a build that contains a core defect known to be fixed.
4. If the core must make an incompatible bridge change (§5.4), all shells in
   the field are affected. The change is made in the core first, then the
   shells are rebuilt in the order of the sequence. The rule in §5.4 item 3
   (compatibility module for one release cycle) exists exactly for this case.

### 8.5 The role of the web shell

The web shell is the reference implementation of the game rules. It is not a
predecessor in the sequence, but:

- The catalogue and the game rules are validated on the web shell first; a rule
  that the web shell does not satisfy is not ready for a native shell.
- A track may not enter **Beta** while the web shell is red.
- The web shell keeps its own stage (Web-Alpha / Web-Beta / Web-Stable) and is
  released on its own cadence. A web Stable does not unblock a native track —
  only the predecessor's green release candidate does.

---

## 9. Effort estimate

**No dates.** This section states the **order of magnitude** of the work per
track and milestone, with the reason. The dates are the owner's decision and
are not derivable from the repository.

**S** = a single focused work package. **M** = several work packages, or one
work package with an unfamiliar technology. **L** = several work packages
including one that must first be built for the first time.

### 9.1 The shared foundations (counted once)

| Work package                                                                                                               | Size  | Reason                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust core extraction of the game logic (catalogue, song picking, censor, scoring, time decay, game store)                  | **L** | No Rust code exists in the repository today (no `Cargo.toml` in the tree). The core is the precondition for every native track and is built once, in the T1 track.      |
| Bridge (UniFFI) with the ABI version scheme of §5                                                                          | **M** | The mechanism exists and is documented; the work is the API design, the generated bindings for Kotlin and Swift, the checksum gate in CI, and the capability handshake. |
| Release tooling (release record template, per-track build and publish pipelines, the artefact store, the rollback scripts) | **M** | Six build pipelines, six signing paths, one record format.                                                                                                              |
| Device matrix protocol and the accessibility measurement setup (`axe-core`)                                                | **M** | Both are missing today (`GAP-08`; contrast "not measured" in `docs/BEST_IN_CLASS.md` §5).                                                                               |

### 9.2 Per track

| Track                       | Alpha | Beta  | Stable | Reason                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ----- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T0 Web**                  | **M** | **M** | **S**  | The application exists; what is missing is measurement and acceptance: performance (§1–§3 not measured), contrast (§5 not measured), the i18n literal cleanup, the E2E content assertions (`GAP-07`), the deploy gate (`GAP-18`) and the header delivery (`GAP-13`).                                                                      |
| **T1 Android**              | **L** | **M** | **M**  | Alpha carries the core extraction (L) plus the bridge plus the first native shell, the Gradle pipeline, the NDK integration, the 16 KB page-size work and the Play signing. Beta adds the store round trip, the closed-test window and the migration tests. Stable adds the certification, the staged rollout and the observation window. |
| **T2 Google TV / Fire TV**  | **M** | **M** | **S**  | The core, the bridge and the pipeline are inherited. What is new is the leanback manifest, the banner, the D-pad navigation of all six modes and the TV layout, plus a second app id and a second review.                                                                                                                                 |
| **T3a macOS**               | **M** | **M** | **S**  | A new shell technology, the hardened runtime, the Developer-ID signing, the notarization round trip and the stapling. The notarization round trip is a waiting process, not a work package.                                                                                                                                               |
| **T3b Linux**               | **M** | **S** | **S**  | The AppImage is mostly packaging; the Flatpak is a manifest, a metainfo file and a desktop file. The Flathub submission is a review process, not a work package — but it is an external dependency, which is why the size is not smaller than the macOS Alpha.                                                                            |
| **T4 iPadOS / iOS**         | **L** | **M** | **M**  | A new shell technology, the Xcode project, the SwiftPM integration, the device lifecycle and the touch input, plus the App Store Connect pipeline and the licence condition (open decision **OD-07**), which is a blocker and not a work package.                                                                                         |
| **T5 Windows + further OS** | **M** | **M** | **S**  | The MSIX packaging, the Windows input handling, the Partner Center submission. Each additional operating system in this stage is **S** per system, because the core and the bridge are already there.                                                                                                                                     |

### 9.3 The cross-cutting work that every track inherits

| Work package                                                                                    | Size  | Reason                                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Test coverage from 23.29 % to the 80 % target (`docs/BEST_IN_CLASS.md` §9)                      | **L** | The largest single gap; it is a prerequisite for the Beta gate of every track.                                                             |
| Accessibility from "not measured" to the WCAG 2.1 AA target (§5, §6 of `docs/BEST_IN_CLASS.md`) | **M** | The contrast and keyboard gaps are known and named; the work is the measurement, the fixes and the regressions.                            |
| E2E from URL assertions to content assertions (`GAP-07`)                                        | **M** | One test exists and asserts URLs without the base path; the real work is the test harness for the native shells, which does not exist yet. |

---

## 10. Open decisions of the owner

Prioritised. Each decision names the question, the options, the recommendation
and what it blocks.

| ID        | Priority | Question                                                                                                                                                                                | Options                                                                                                                                                                                                 | Recommendation                                                                                                                                                                                                                                                                                    | Blocks                                                         |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **OD-01** | 1        | Which shell technology is used per platform?                                                                                                                                            | (a) Tauri for the desktop shells, (b) egui for the desktop shells, (c) a native toolkit per platform, (d) one web view per shell                                                                        | Let `docs/design/PLATFORM-ARCHITECTURE.md` decide; the release plan needs the decision only in its consequences (build system, signing, accessibility support). **(a)** is the only option that reuses the existing web assets unchanged.                                                         | §7.3, §7.4, §7.6                                               |
| **OD-02** | 1        | Is the Rust core linked statically into each shell, or is it downloaded/upgraded at runtime?                                                                                            | (a) statically linked, one core version per artifact, (b) a runtime component with its own update path                                                                                                  | **(a) statically linked.** Only (a) makes the version scheme of §5.2 simple and the rollback of §6.4 per artifact. With (b), the core version becomes a runtime dependency and §5.5 must be rewritten.                                                                                            | §5.2, §5.5, §6.4                                               |
| **OD-03** | 1        | Is the bridge ABI scheme of §5.3 accepted as it stands?                                                                                                                                 | (a) `MAJOR.MINOR` plus the UniFFI checksum, (b) a single integer ABI version, (c) rely on the checksum alone                                                                                            | **(a).** The checksum alone cannot express "this feature is not available in this shell" — it can only say "different".                                                                                                                                                                           | §5.3, §5.4                                                     |
| **OD-04** | 2        | How long is the Beta observation window for the non-store tracks, and how long must a Stable be observed before it is called Stable?                                                    | (a) a fixed number of days, (b) a fixed number of tester sessions, (c) both                                                                                                                             | **(b) with (a) as a minimum.** "Every tester has completed at least one full game and at least one update cycle" is verifiable; a number of days is not. The store minimum (14 consecutive days for a new personal Play account) is a floor imposed from outside and does not replace this.       | `B-10`, `S-10`                                                 |
| **OD-05** | 2        | What is the target response time for a defect report in Beta?                                                                                                                           | (a) one working day for a blocker, (b) three working days for any report, (c) no target                                                                                                                 | **(a) for blockers, (b) for everything else.** A beta without a response target is a beta without a feedback loop.                                                                                                                                                                                | `B-08`                                                         |
| **OD-06** | 2        | Does the web track stay on GitHub Pages, or does it move to Vercel?                                                                                                                     | (a) GitHub Pages, (b) Vercel, (c) a self-hosted static host                                                                                                                                             | **(b)** if the delivery of the security headers (`GAP-13`) is a Stable requirement — Next.js does not apply `headers()` to a static export, and a host that can set the headers is needed. With (a), the headers stay a named limitation of the web Stable release.                               | §7.7, `S-01` (web row)                                         |
| **OD-07** | 1        | May the iPadOS / iOS track ship at all under GPL-3.0-or-later?                                                                                                                          | (a) yes, with the conditions that `docs/licensing/APPLE-LICENSING.md` documents, (b) no — the track is dropped or re-licensed, (c) deferred until the licence question is answered                      | **(c)** until the licensing round has produced its document; then (a) or (b) on its basis. The release plan must not assume an answer — the answer is a legal question, not a release question.                                                                                                   | T4 entirely; `B-09`                                            |
| **OD-08** | 3        | How large is the Alpha tester group per track, and who is in it?                                                                                                                        | (a) a fixed core team, (b) the team plus invited external players, (c) different per track                                                                                                              | **(a) for T0–T2**, (b) additionally for T3–T5, because the desktop and mobile devices are not in the hands of the core team. The size must be sufficient to exercise the game with 1, 6 and 24 players.                                                                                           | §2.1.2                                                         |
| **OD-09** | 3        | Which account type is used on Google Play — personal or organization?                                                                                                                   | (a) personal (25 USD once, but subject to the 12-tester / 14-day closed test before production access), (b) organization (verification with a legal entity, the closed-test requirement does not apply) | **Decide before the T1 Alpha.** The choice changes the Beta duration by at least the 14-day window and the account setup time. If no legal entity exists, **(a)** and the window must be planned into the Beta.                                                                                   | §2.2.4, §7.1                                                   |
| **OD-10** | 3        | Is the TV track a separate app id in the same Play Console account, or a separate app in a separate account?                                                                            | (a) separate app id, same account, (b) separate app id, separate account                                                                                                                                | **(a).** One account keeps the signing practice and the tester list in one place; the review of a second app id is unavoidable either way.                                                                                                                                                        | §7.2                                                           |
| **OD-11** | 3        | Is the Phomu release published on Flathub, in an own Flatpak repository, or both?                                                                                                       | (a) Flathub only, (b) own repository only, (c) both                                                                                                                                                     | **(c)** — Flathub for the discoverability, the own repository as the fallback while the Flathub review runs. Both need an application id over a domain the project controls.                                                                                                                      | §7.4                                                           |
| **OD-12** | 4        | Does the release plan replace the milestone `M8.4` ("Release checklist and rollback plan") in [`../../ROADMAP.md`](../../ROADMAP.md), or does it stay a separate document?             | (a) this plan is the deliverable of M8.4 and the roadmap entry is closed with it, (b) both documents stay, the roadmap entry is closed with a reference                                                 | **(b).** The roadmap entry is owned by the roadmap round; this document does not touch it. The closure of `M8.4` is a decision for the owner and the roadmap round.                                                                                                                               | `GAP-18`, `M8.4`                                               |
| **OD-13** | 4        | Which "further operating systems" join stage T5, and in which order?                                                                                                                    | (a) BSD, (b) a mobile-agnostic shell for other systems, (c) none — T5 stays Windows only                                                                                                                | **(a) with (c) as the fallback.** The rule that every additional system is an **S** work package (see §9.2) holds as long as the core and the bridge are unchanged.                                                                                                                               | §9.2, T5 scope                                                 |
| **OD-14** | 2        | The release documentation of this round is written in English, while **CORE-012** and the documentation policy name German for `docs/`. Which of the two governs the release documents? | (a) English for the release documents, with a change request that amends CORE-012 for this folder, (b) German for the release documents, (c) both: a German release plan and an English checklist       | **(a).** The release documents are read next to the platform documents, which are written in English; a mixed-language documentation set is harder to maintain than a documented exception. If (a) is chosen, the change request names the folder `docs/releases/` as the scope of the exception. | The language of §0.3 and of all three documents in this folder |

---

## 11. Change rule for this document

A gate criterion may only be changed by a documented decision that names the
requirement or the quality dimension it touches, the reason, and the effect on
the already-released tracks. A criterion may not be weakened in order to let a
milestone look green — the same rule that applies to
[`../../ROADMAP.md`](../../ROADMAP.md) and to
[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) applies here.

A new track that is added to §3 changes the order only by a decision of the
owner that is recorded here and in the change history below.

### Change history

| Date | Change          | Reason                                                                                       |
| ---- | --------------- | -------------------------------------------------------------------------------------------- |
| —    | Initial version | Work order: release plan for the platform family with Alpha → Beta → Stable gates per track. |
