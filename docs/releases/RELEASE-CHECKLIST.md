# Phomu Release Checklist

**Purpose:** the executable list for a single Phomu release. One copy per
release artifact.
**Plan:** [`RELEASE-PLAN.md`](RELEASE-PLAN.md) — the stages, the gates and their verification paths.
**Record template:** [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md)

> **How to use.** Every line is a task with a defined result. A line is ticked
> when its result exists — a command with its exit code, a test name, a
> `file:line` reference, or a screenshot of a named flow. A tick without a
> result is not a tick (`../../QUALITY.md` §10). Lines that are not applicable
> are **not** ticked but annotated with `N/A — <reason>`; the annotation is
> part of the record.
>
> The stage gates are cumulative: the Beta list includes the Alpha list, the
> Stable list includes both.

---

## 0. Release header

Fill in before the first line of the list is ticked.

- [ ] Track: `T0 Web` / `T1 Android` / `T2 Google TV / Fire TV` / `T3a macOS` / `T3b Linux` / `T4 iPadOS / iOS` / `T5 Windows + further OS`
- [ ] Stage: `Alpha` / `Beta` / `Stable`
- [ ] Shell version (as it appears on the artifact): `______`
- [ ] Core version: `______`
- [ ] Bridge ABI version: `______.______`
- [ ] Release tag: `______`
- [ ] Commit (`git rev-parse HEAD`): `______`
- [ ] Predecessor track with a green release candidate (required for T2–T5): `______` — acceptance record of that candidate: `______`
- [ ] Release owner: `______`
- [ ] Date of the release decision: `______`
- [ ] Build environment recorded: Node `______`, npm `______`, Rust toolchain `______`, JDK `______`, Gradle `______`, Xcode `______`, build OS `______`

---

## 1. Preconditions

### 1.1 Core and bridge

- [ ] The Rust core builds from the release tag: `cargo build --release` → exit code 0
- [ ] The core test suite passes: `cargo test` → exit code 0, test count written into the record
- [ ] The core is formatted: `cargo fmt --check` → exit code 0
- [ ] The core is lint-clean: `cargo clippy -- -D warnings` → exit code 0
- [ ] The bridge bindings were **generated** from the core in this build, not taken from a stored copy — the generation step ran in the build pipeline and its output is in the build log
- [ ] The generated bindings checksum equals the core's expected checksum — the comparison ran in the build pipeline and its output is in the build log
- [ ] `BRIDGE_ABI_MAJOR` of the built core equals the value the shell was built for
- [ ] `BRIDGE_ABI_MINOR` of the built core is greater than or equal to the minimum the shell accepts
- [ ] The capability list of the core is read by the shell at first start and unavailable features are hidden (not shown as a broken control) — visible in the start log
- [ ] The core version of this build is not older than the core version of the previous build of this listing
- [ ] `BRIDGE_ABI_MAJOR` of this build equals the major of the previous build of this listing — if not, the compatibility module of the previous major is present and documented in the changelog

### 1.2 Dependencies

- [ ] `npm ci` completed without error and `package-lock.json` is unchanged by this release
- [ ] The dependency audit is clean: `npm audit --omit=dev --audit-level=moderate` → exit code 0, "found 0 vulnerabilities"
- [ ] The licence, security and maintenance check of every new dependency exists (see `../../AGENTS.md` rule 15) — for a release without new dependencies: `N/A — no new dependency`
- [ ] The catalogue validation is green: `npm run validate-catalog` → exit code 0
- [ ] The song schema validation is green: `npm run validate-songs` → exit code 0
- [ ] The spoiler audit is green: `node scripts/audit-spoilers.js` → "Total spoilers: 0"

### 1.3 Web and core pipeline

- [ ] Type check green: `npm run typecheck` → exit code 0
- [ ] Lint green: `npm run lint` → exit code 0, warning count written into the record
- [ ] Unit tests green: `npm run test` → exit code 0, test count and coverage written into the record
- [ ] Quality gates green: `npm run check:all` → three gates PASS (`check:i18n`, `check:doc-links`, `check:file-size`)
- [ ] Production build green: `npm run build` → exit code 0, the generated route count written into the record
- [ ] The CI workflow run for the release commit is green in every job (`typecheck`, `lint`, `unit-tests`, `catalog-validation`, `quality-gates`, `build`) — the run URL is in the record
- [ ] The local gate runner agrees with CI: `npm run local-ci` → exit code 0

### 1.4 Secrets and signing material

- [ ] The signing key for this track is available in the secure location named in the key custody note, and the note names who holds it
- [ ] The upload key / keystore / certificate / GPG key / Apple distribution identity is **not** in the repository, not in a log and not in the artifact
- [ ] No secret is in the release artifact — the secret scan of the build output was executed and its result is in the record
- [ ] The store accounts named in the release record exist and are accessible with the account that publishes this release
- [ ] The token or key needed for the upload is present in the CI secret store under the name named in the release record — for a manual release: `N/A — manual release, the key was used locally`

---

## 2. Alpha

### 2.1 Code

- [ ] The release artifact was built from the release tag and not from a working tree — `git status --porcelain` is empty in the build checkout
- [ ] The shell of this track contains no code of a later stage — the feature list of the record matches the Alpha scope
- [ ] The game path works end-to-end on the target device class: lobby → pack → round phases → scoring → win condition, in all six modes
- [ ] The edge cases are exercised on the device: empty catalogue, empty player list, aborted round, timeout, a single device as the player driver
- [ ] The anti-spoiler protection holds in every phase — no title, artist or cover on the screen before the answers are locked
- [ ] The state survives a reload where it must and does not survive where it must not
- [ ] The constants of the game are in one place only (`src/config/`) — no duplicated number in the shell or in the core

### 2.2 Tests

- [ ] A test exists for every behaviour changed since the last release of this track, and the test names are listed in the record
- [ ] A negative test exists for every hardening that runs the attack, and the test names are listed in the record
- [ ] No test was skipped, ignored or commented out to make a gate green — `git diff` of the test files of this release was reviewed for `.skip`, `xit`, `xdescribe`, `@Ignore`
- [ ] The E2E smoke test asserts content and not only URLs (gap `GAP-07`), and it navigates with the base path `/Phomu`
- [ ] The core test suite covers the game logic that the shell calls (song picking, QR intent, censor, scoring, time decay)

### 2.3 Gates

- [ ] `A-01` — commit, core version and bridge ABI version are recorded
- [ ] `A-02` — the complete game path on the target device class is documented in the acceptance record §1, one row per mode
- [ ] `A-03` — the anti-spoiler negative tests are named in the record
- [ ] `A-04` — typecheck, lint, unit tests, catalogue validation, i18n, doc links, file size are green on the release commit (CI run URL in the record)
- [ ] `A-05` — `cargo build --release`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` are green (command output in the record)
- [ ] `A-06` — the bridge checksum comparison and the ABI handshake ran at first start (log in the record)
- [ ] `A-07` — `npm run validate-catalog`, `npm run validate-songs` and `node scripts/audit-spoilers.js` are green
- [ ] `A-08` — a performance measurement exists on the reference device with the reference data set; where a budget is undefined, the record says "budget not defined"
- [ ] `A-09` — the task walkthrough is documented with the step count, and the visual check covers all four themes
- [ ] `A-10` — `npm run check:i18n` is green and the native shell has no hard-coded interface text (the resource-completeness report is in the record)
- [ ] `A-11` — the secret scan of the artifact is clean, the negative tests are named, and the data trail of this track is documented
- [ ] `A-12` — the fallback to the next media source is tested per mode, and the QR card works as a printed medium outside the application
- [ ] `A-13` — the release notes draft, the known-defect list and the requirement IDs in scope exist
- [ ] `A-14` — the artifact is signed, installed and started on a device of the target device class, and the installation steps are written down
- [ ] The track-specific addition of §4.1 of the plan is met (Android: AAB + Play signing + 16 KB page size; TV: leanback manifest + banner + D-pad; macOS: hardened runtime + Developer ID; Linux: AppImage + Flatpak build; iOS: upload + TestFlight + iPhone and iPad run; Windows: MSIX install and start; Web: export served with the base path)

### 2.4 Documentation

- [ ] The requirement IDs in scope are listed in the record
- [ ] The release notes draft names the changes, the known limitations and the minimum supported system version
- [ ] The known-defect list names, per entry: symptom, affected configuration, workaround
- [ ] Every relative link of the new or changed documentation resolves — `npm run check:doc-links` → exit code 0
- [ ] The user guide of this track exists in German and English if the track has a user-visible interface outside the web shell
- [ ] The changelog entry for this release is drafted, with the "Bridge ABI" heading when the bridge changed

### 2.5 Signing

- [ ] The artifact is signed with the **Alpha** identity of this track — the identity is named in the record
- [ ] The signature is verified with the verification command of the track, and the output is in the record
- [ ] The identity is not a production identity (no production key is used before the Stable stage)

### 2.6 Distribution

- [ ] The tester group is named in the record, with the device class per tester
- [ ] Every tester of the group has the target device class
- [ ] The known-defect list was published to the tester group **before** the artifact was handed out
- [ ] The artifact reached the tester group through the channel named in the record, and the channel state is documented (for a store track: the release state of the testing track)
- [ ] The defect report channel for this track is announced to the testers

### 2.7 Known defects

- [ ] Every open defect of this track is listed with a severity
- [ ] No defect of the severity blocker, critical or major is open in the release scope — if one is, the Alpha is not released and the reason is written down
- [ ] Every allowed Alpha defect (cosmetic, missing optional behaviour, measured performance gap, named accessibility gap) has an entry with the symptom, the affected configuration and the workaround
- [ ] The forbidden list of §2.1.3 of the plan was checked explicitly: no crash in the main path, no spoiler leak, no state loss, no unfinishable mode, no dead end without an exit, no security defect without a negative test

### 2.8 Acceptance record

- [ ] The acceptance record of this release exists as `docs/acceptance/<TRACK>-<STAGE>-<VERSION>-ACCEPTANCE.md`
- [ ] The record follows `../acceptance/ACCEPTANCE_TEMPLATE.md`: functional, technical, performance, usability, security/privacy, interoperability, known limitations, decision
- [ ] Every section is filled in; a section that was not checked says `NOT RUN` with the reason
- [ ] The performance section names the reference hardware and the method, and the measured values
- [ ] The known-limitations table has one row per limitation with its impact and where it is tracked

### 2.9 Release approval

- [ ] The release record is signed by the release owner with the date
- [ ] The decision is `ACCEPTED` or `ACCEPTED WITH LIMITS`; `NOT ACCEPTED` means no release
- [ ] The decision and its rationale are in the record

---

## 3. Beta

The Alpha list applies unchanged and is ticked again for the Beta artifact.

### 3.1 Code

- [ ] The Beta artifact was built from a new release tag, not from the Alpha artifact
- [ ] The changes since the Alpha are listed with their requirement IDs
- [ ] The game path works end-to-end on the target device class in all six modes (re-verified on the Beta artifact)

### 3.2 Tests

- [ ] The coverage of the core and of the shell is measured and compared with the target of **≥ 80 % lines**; the measured value is in the record
- [ ] The core game logic has unit tests: song picking, QR intent, game store, censor utils, scoring, time decay — each with its test name in the record
- [ ] The E2E test asserts content in the main journeys, not only URLs
- [ ] The migration test exists and runs: a build of the previous stage is upgraded to this build
- [ ] The upgrade either migrates the game state correctly or refuses cleanly with a named message — the behaviour is documented with the test name

### 3.3 Gates

- [ ] `B-01` — the coverage target is met and the values are in the record
- [ ] `B-02` — the performance budgets of `../BEST_IN_CLASS.md` §1–§3 are measured on the release build; the reference device and the data set are named
- [ ] `B-03` — the accessibility review is executed: contrast measured per theme (WCAG 2.1 AA — 4.5:1 body, 3:1 large text and controls), every game mechanic keyboard-operable, visible focus, touch targets ≥ 44 px, screen-reader names present
- [ ] `B-04` — the device / browser matrix protocol exists and was executed once; the result per device is in the record
- [ ] `B-05` — no open defect with severity blocker, critical or major in the release scope; the residual list has a workaround per entry
- [ ] `B-06` — the migration path is verified (see 3.2)
- [ ] `B-07` — the distribution channel accepted the artifact (Play testing track / TestFlight build / Flathub submission / notarized build / MSIX package / web beta deployment), and the channel state is in the record
- [ ] `B-08` — the feedback path is open and named: the channels, the roles that answer, the severity definitions, the response time (or the explicit note that none is agreed)
- [ ] `B-09` — the licence and distribution conditions of this track are documented and permit this distribution; for the Apple track: `docs/licensing/APPLE-LICENSING.md` exists and its conditions are met
- [ ] `B-10` — the previous known-good artifact is stored and signed, the rollback procedure is written, and the rollback has been exercised once where the channel allows it (exercise log in the record)
- [ ] `B-11` — the new build installs over the previous build of this track without data loss (the version code / build number is monotonically increasing)
- [ ] `B-12` — the store metadata is complete: title, description, screenshots at the required sizes, privacy declaration, content rating, support and privacy URLs

### 3.4 Documentation

- [ ] The store description of the Beta track is written and reviewed
- [ ] The known limitations of the Beta are published where the testers meet them
- [ ] The changelog entry of this release exists with the requirement IDs

### 3.5 Signing

- [ ] The artifact is signed with the Beta identity of this track, or with the production identity if the track has only one
- [ ] The signature is verified with the verification command of the track, and the output is in the record

### 3.6 Distribution

- [ ] The Beta window has run for the agreed length; the store-imposed minimum is met (Google Play: 14 consecutive days with at least 12 testers opted in continuously for a new personal account)
- [ ] The tester group of the Beta is named, with the device class per tester
- [ ] The testers were told what is expected of them: how to report, what a blocker is, and where the known limitations are
- [ ] The channel state after the publication is documented (the release state of the testing track, the TestFlight build state, the Flathub PR state, the notarization output)
- [ ] The nightly channel of this track, if it exists, publishes only from a commit whose gate set for this track is green — and the nightly build carries the commit hash, not a marketing version
- [ ] The sidecar artifact of this release, if this track has one, carries the same version string as the main artifact, is distributed outside the store where the store does not carry it, and is installed and started as part of this release
- [ ] The Alpha tester group and the Alpha acceptance record still exist and were not replaced by the Beta

### 3.7 Known defects

- [ ] The defect list of the Beta is complete, with the severity, the reproduction step and the status per entry
- [ ] Every defect that was reported and could not be reproduced is closed with the reason, not deleted
- [ ] The observation log of the Beta window exists with the defect state per entry

### 3.8 Acceptance record

- [ ] The acceptance record of the Beta exists as `docs/acceptance/<TRACK>-BETA-<VERSION>-ACCEPTANCE.md`
- [ ] The record is complete in all eight sections, with the evidence artefacts
- [ ] The decision is `ACCEPTED` or `ACCEPTED WITH LIMITS` with the rationale

### 3.9 Release approval

- [ ] The Beta decision is signed by the release owner with the date
- [ ] The Beta channel is opened to the wider group only after the signature

---

## 4. Stable

The Alpha and Beta lists apply unchanged and are ticked again for the Stable artifact.

### 4.1 Code

- [ ] The Stable artifact was built from a new release tag
- [ ] The changes since the Beta are listed with their requirement IDs
- [ ] The game path works end-to-end on the target device class in all six modes (re-verified on the Stable artifact)
- [ ] The core version of this build is not older than the core version of the Beta build of this track

### 4.2 Tests

- [ ] The coverage of the Stable artifact is at least the Beta value and at or above the target
- [ ] The whole test suite of the track is green on the Stable artifact
- [ ] The negative tests of every hardening of this track are green

### 4.3 Gates

- [ ] `S-01` — **zero** open defects in the release scope; the filter result is attached, and every remaining observation is listed as a known limitation with its impact
- [ ] `S-02` — the production track has approved the release (production release state, App Store release, Flathub merge, notarization ticket, Store certification)
- [ ] `S-03` — the artifact is signed with the production key and the signature verifies with the verification command of the track; the key custody and the rotation path are documented
- [ ] `S-04` — the release notes exist in the store description, in `../../CHANGELOG.md` and in the record, and name the requirement IDs, the known limitations and the minimum supported system version
- [ ] `S-05` — the support path is reachable: the issue tracker link, the known-limitations page, the user guide in German and English, and the person who answers
- [ ] `S-06` — the update from the previous stable version is verified on a real device of the track: install, state preserved, new version starts
- [ ] `S-07` — the rollback mechanism is named, prepared and has been exercised at least once in the Beta stage of this track (or the limitation of the channel is documented)
- [ ] `S-08` — the performance and accessibility budgets are measured **again on the release build** and met, or the deviation is documented as a named limit with its impact
- [ ] `S-09` — the acceptance record of the Stable exists as `docs/acceptance/<TRACK>-STABLE-<VERSION>-ACCEPTANCE.md`, is complete and carries the decision with the rationale
- [ ] `S-10` — the observation window has run for the agreed length without an open blocker defect; the observation log with start, end and defect state is in the record
- [ ] `S-11` — the build, signing, upload and verification commands are written down with their exit codes, and the person who publishes executed them
- [ ] `S-12` — the rollback target (the artifact of the previous stable version) is stored, signed and its signature verifies

### 4.4 Documentation

- [ ] The store listing text, the screenshots and the description match the release
- [ ] The changelog entry of this release is complete, with the "Bridge ABI" heading if the bridge changed
- [ ] The known limitations are published in the user-visible documentation, not only in the record
- [ ] `npm run check:doc-links` is green on the release commit

### 4.5 Signing

- [ ] The production key of the track was used, and it is not in the repository, in a log or in the artifact
- [ ] The signature verification output is in the record
- [ ] The key custody note names the holder, the storage location and the rotation path

### 4.6 Distribution

- [ ] The production release was published in the channel named in the record
- [ ] The rollout strategy is documented (staged rollout for the store tracks, an announcement for the direct channels)
- [ ] The release is announced in the channel the project announces releases in (changelog, release page, store listing)
- [ ] The build number / version code / build number of this listing is higher than the previous one

### 4.7 Known defects

- [ ] The defect list of the release scope is empty — the filtered list is attached as evidence
- [ ] Every known limitation has an entry with its impact and where it is tracked
- [ ] No defect is open that the release notes describe as fixed

### 4.8 Acceptance record

- [ ] The acceptance record of the Stable is complete in all eight sections
- [ ] The performance section names the reference hardware, the method and the measured values of the release build
- [ ] The decision is `ACCEPTED` or `ACCEPTED WITH LIMITS` with the rationale, the named limits and the open items with their owner

### 4.9 Release approval

- [ ] The Stable decision is signed by the release owner with the date
- [ ] The publication happens after the signature, by the release owner or by a person named in the record

---

## 5. After the release

### 5.1 Distribution and announcement

- [ ] The published artifact is downloaded once from the public channel and its signature is verified (the artifact in the channel is the artifact that was signed)
- [ ] The version, the core version and the bridge ABI version are visible in the application (the about screen) and match the record
- [ ] The changelog entry is published and the store description is live
- [ ] The announcement is posted where the project announces releases

### 5.2 Monitoring the defect reports

- [ ] The defect channel of the track is checked on the schedule named in the record — for a first Stable, the schedule is the owner decision `OD-05`
- [ ] Every new report is triaged within the agreed response time and gets a severity
- [ ] Every report that is a blocker is recorded with a reproduction step and escalated to the release owner the same day
- [ ] The defect list of the release is updated after each triage round and the version of the list is kept

### 5.3 Rollback preparation

- [ ] The rollback target (the artifact of the previous stable version) is stored, signed and its signature verifies
- [ ] The rollback command or the store action is written down in the record and can be executed by a second person without further instructions
- [ ] The rollback decision rule is written down: who decides, on which evidence, and within which time window after the release
- [ ] The rollout of the new version is checked against the rollback rule at the agreed interval (a staged rollout is checked at each stage)

### 5.4 Next milestones

- [ ] The release is linked to the milestone it closes in `../../ROADMAP.md` — the entry is updated by the roadmap round, not by this checklist
- [ ] The open items of the acceptance record are transferred into the defect list with an owner
- [ ] The next stage of this track is prepared: the gate list of §4 of the plan is reviewed for the changes the release revealed
- [ ] The next track in the order of §3.2 of the plan is checked against its entry condition (the green release candidate of this track)
- [ ] The release outcome is fed back into the plan: a gate criterion that was not verifiable in practice is changed by a documented decision, not silently

---

## 6. Records to file with this release

- [ ] The acceptance record: `docs/acceptance/<TRACK>-<STAGE>-<VERSION>-ACCEPTANCE.md`
- [ ] The build artefacts: the signed artifact, the checksums of the artifact, the notarization ticket (where applicable)
- [ ] The command outputs: the CI run URL, the core and shell build logs, the signature verification outputs
- [ ] The measurement records: performance, accessibility, coverage, device matrix
- [ ] The defect list, the known-limitations list and the observation log
- [ ] The rollback target and the rollback decision rule
