# Phomu Roadmap

**Roadmap version:** 0.1
**Measurement baseline:** 2026-10-25, branch `feature/vocument-style-docs-and-i18n`, commit `d5b6422`
**Current milestone:** M3 — Documentation, requirement and i18n reform (**IN PROGRESS**)
**Machine-readable truth:** [`project/project.yaml`](project/project.yaml)

> **Principle of this roadmap**
>
> A milestone is **complete only when all gates are met** — not when
> "the interface works". Every status in this document is bound to
> evidence: a test name, a command output, or a
> file:line reference. Anything that was not measured is listed as **NOT RUN** in
> the acceptance and **not** as "passed".
>
> No milestone is completed on the basis of stubs, mock simulations, or
> dummy returns (Vocument CR-0002 / QA-003). No code or agent step
> silently moves an open item into a later
> milestone, so that a milestone looks green.

---

## Milestone model

Every milestone has the same fields. They are not optional.

| Field | Content |
|---|---|
| **Purpose** | The single product problem this milestone solves. |
| **Scope** | What is built in this milestone — work packages with an identifier. |
| **Explicit non-goals** | What is **not** built here. A non-goal without an entry is a hidden scope. |
| **Acceptance criteria** | Functional / Technical / Performance / Usability / Security-Privacy / Interoperability. Every criterion is formulated so that it can be checked. |
| **QA evidence** | What was measured, with command or test name. |
| **Release decision** | `released`, `released with a documented limitation`, `not released`, `open`. |

### Status values

| Status | Meaning | Condition |
|---|---|---|
| `COMPLETE` | All gates of the milestone are met. | There is evidence for each gate. |
| `IN PROGRESS` | Parts are delivered and evidenced, other gates are open. | The finished parts are named individually. |
| `PLANNED` | Not started or only prepared. | No gate met. |

A milestone whose only evidence is an existing scaffold is
`IN PROGRESS` — not `COMPLETE`.

---

# M0 — Stabilization & quality baseline

**Status: `COMPLETE`** (evidence: `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run build`, `npm audit` on 2026-10-25, see
[`docs/acceptance/M0-ACCEPTANCE.md`](docs/acceptance/M0-ACCEPTANCE.md))

## Purpose

The prototype must first be **reliably reproducible** before
feature breadth builds on it. M0 establishes verifiability: the same
command line must always deliver the same result.

## Scope

- **M0.1** Typecheck as a hard barrier (TypeScript strict).
- **M0.2** Lint hardening: flat config, no errors in the core paths
  (`src/app/**`, `src/components/game/**`, `src/admin-api/**`).
- **M0.3** Unit test harness (Vitest) with alias resolution `@/*`.
- **M0.4** E2E harness (Playwright, Chromium) with `webServer` configuration.
- **M0.5** Production build as a static export (`output: 'export'`).
- **M0.6** Dependency audit as a check step.
- **M0.7** A local CI script that runs all gates in one order.

## Explicit non-goals

- No expansion of the game modes.
- No catalogue cleanup (that is M1).
- No internationalization (that is M3).
- No security headers (that is M6).
- No change to the product logic.

## Acceptance criteria

**Functional**
- `npm run typecheck` ends with exit code 0.
- `npm run lint` ends with exit code 0.
- `npm run test` ends with exit code 0, all test cases are green.
- `npm run build` produces a static export without errors.

**Technical**
- No file in the production path contains `any` without justification; `any` is set
  to `warn` in the lint setup (`eslint.config.mjs`).
- The test runner resolves the `@/*` alias exactly like the app code
  (`vitest.config.ts`).
- The build artifact is a static website without a server runtime.

**Performance**
- The production build compiles without errors; compile time is not
  tracked as an acceptance criterion because it depends on the machine and has
  not yet been defined as a budget.

**Usability**
- The quick start is reachable in three clicks (landing → pack → start).

**Security-Privacy**
- `npm audit --omit=dev --audit-level=moderate` reports 0 vulnerabilities.

**Interoperability**
- The application can be delivered as a static export under a subpath
  (`basePath: '/Phomu'`) — the export works without a
  Node server.

## QA evidence

Measured on 2026-10-25 at commit `d5b6422`. Because several roles work on the
working tree in parallel in this round, the commit state was unpacked via
`git archive d5b6422` into a separate directory and measured **there**;
the result is therefore independent of the parallel work.

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | Exit 0 |
| Lint | `npm run lint` | Exit 0, 0 errors, 1 warning (`playwright.config.ts:1:1`, `import/no-anonymous-default-export`) |
| Unit tests | `npm run test` | Exit 0 — 4 test files, 21 test cases green |
| Build | `npm run build` | Exit 0 — 21 statically generated routes |
| Catalogue gate | `npm run validate-catalog` | Exit 0 — 135 packs, 1.615 songs, 0 schema errors, 126 warnings, 0 duplicates, 0 missing years |
| Audit | `npm audit --omit=dev --audit-level=moderate` | Exit 0 — "found 0 vulnerabilities" |
| E2E smoke | `npm run test:e2e:smoke` | 1 test case green (after `npx playwright install chromium`) — with the limitation from `GAP-07` |

The detailed evidence with test names is in
[`docs/acceptance/M0-ACCEPTANCE.md`](docs/acceptance/M0-ACCEPTANCE.md).

**Open in M0 (not blocking, but documented):**
`npm run format:check` (Prettier) is **red**: 287 files with
style deviations. The check is explicitly marked
**non-blocking** in `scripts/local-ci.sh`. It is tracked as gap `GAP-01`.

## Release decision

**released with a documented limitation** — the quality baseline is
green; the formatting deviation (`GAP-01`) remains open. The gates from the
work contract (`GAP-02`, `GAP-03`) now exist as scripts and are
wired into `npm run local-ci`; they belong to M3.

---

# M1 — Catalogue and data quality

**Status: `IN PROGRESS`**

## Purpose

The song catalogue is the core asset of the product. A game that gets
stuck on a broken record is worthless. M1 makes the catalogue
**verifiable** and reduces the error load to zero hard errors.

## Scope

- **M1.1** Schema and field validation per song (`src/utils/validate-song-data.ts`).
- **M1.2** Catalogue gate across all packs (`src/utils/validate-song-catalog.ts`).
- **M1.3** Duplicate policy with a curated allowlist (`specifications/duplicate-allowlist.json`).
- **M1.4** Year coverage from 1950 to the current year; special case for
  classical works before 1900 (`src/config/song-year-range.ts`, `MIN_SONG_YEAR = 1500`).
- **M1.5** Baseline mechanism: the gate only fails when it becomes **worse**
  than `specifications/quality-baseline.json` (regression protection).
- **M1.6** Machine-readable catalogue report (`specifications/catalog_issues_report.json`).

## Explicit non-goals

- No regeneration of hints or fake lyrics by AI.
- No cover download beyond the admin portal (M6).
- No migration of the catalogue to a different format.

## Acceptance criteria

**Functional**
- `npm run validate-catalog` ends with exit code 0.
- `npm run validate-songs` ends with exit code 0.
- 0 duplicate groups outside the allowlist.
- 0 missing years in the coverage window.

**Technical**
- The validator reads **all** pack files in `src/data/songs/`, not just one.
- The gate produces a JSON report with a timestamp (`--write-report`).
- The baseline is a file in the repo, not a number in a document.

**Performance**
- The catalogue run finishes in under one minute on a
  developer machine (no measurable budget defined; status: **NOT RUN**
  as a budget, runtime of the run on 2026-10-25 under one minute).

**Usability**
- The error report names file, field and song ID, not just a count.

**Security-Privacy**
- The catalogue contains no personal data; the validator checks
  no secrets — this is a **design decision**, not a verified
  property.

**Interoperability**
- The catalogue is JSON and machine-readable; `scripts/export-song-database.js`
  continues to export it.

## QA evidence

Measured on 2026-10-25:

| Gate | Command | Result |
|---|---|---|
| Catalogue gate | `npm run validate-catalog` | Exit 0 — Packs 135, Songs 1615, Schema errors 0, Schema warnings 126, Duplicate groups 0, allowed duplicates 4, missing years 0 |
| Song validation | `npm run validate-songs` | Exit 0 — **reads only `A1.json`**: 12 songs, 12 valid, 12 complete |
| Test coverage of the validator | `src/utils/validate-song-data.test.ts` | 8 test cases green (year validation) |

**Finished parts (evidenced):**
- 0 hard schema errors across all 135 pack files.
- 0 duplicate groups outside the allowlist.
- 0 missing years 1950–2026.
- Year logic tested including classical works and announced releases.

**Open parts:**
- 126 schema warnings have not been cleared (the acceptance criterion of
  improvement plan phase B reads "0 errors and 0 warnings").
- Despite its name, `npm run validate-songs` **checks only one file**
  (`A1.json`) — the complete catalogue is not validated via this path (`GAP-04`).
- No record regression test for critical fields (phase B criterion
  "at least 1 automated record regression test") — `GAP-05`.

## Release decision

**not released** for a public content expansion — the gate is
green, the acceptance criterion "0 warnings" is not.

---

# M2 — Test coverage & QA maturity

**Status: `IN PROGRESS`**

## Purpose

Phomu has rules that nobody has ever broken: scoring, time decay,
timeline placement, anti-spoiler release, round changeover. M2 makes these
rules automatically verifiable.

## Scope

- **M2.1** Unit tests for pure utilities (`src/utils/*.test.ts`).
- **M2.2** Integration tests for the state store (round changeover,
  answer handover, game end).
- **M2.3** Mode contract tests (scoring, lock-in, reveal logic per mode).
- **M2.4** Catalogue regression test (schema rules as a test, not only as a script).
- **M2.5** E2E for the critical journey "lobby → game start → mode rotation →
  game over".
- **M2.6** Device and browser matrix as a reproducible record.

## Explicit non-goals

- No performance benchmark in M2 (budgets come with M5).
- No security test of the admin API (M6).
- No mutation tests.

## Acceptance criteria

**Functional**
- `npm run test` is green.
- For every central utility/scoring rule at least one test exists.
- The E2E journey covers at least lobby, game start, mode rotation and
  game over.

**Technical**
- Tests are deterministic and run without network access.
- A test checks a rule, not implementation details.

**Performance**
- Coverage target: **not yet defined**. Current state: 23,29 % statements
  / 24,94 % lines over `src/utils/**` (coverage scope in `vitest.config.ts`).
  This is a **number, not a target** — see `GAP-06`.

**Usability**
- A failure names the rule that was violated in the test name.

**Security-Privacy**
- Negative tests for every hardening measure (requirement from the work contract).

**Interoperability**
- No test may depend on the order of the test files.

## QA evidence

**Commit state `d5b6422`** (measured in isolation, 2026-10-25T08:44:54Z) and
**working state** (2026-10-25T08:41:51Z) — the test inventory grows in this
round because further roles add tests.

| Test | File | Test cases (commit state) |
|---|---|---|
| Year validation | `src/utils/validate-song-data.test.ts` | 8 |
| QR intent parsing | `src/utils/qr-intent.test.ts` | 4 |
| Amazon ASIN resolution | `src/components/game/MusicPlayer.test.ts` | 7 |
| AI task queue | `src/utils/ai-task-queue.test.ts` | 2 |
| **Total** | | **21 green** (`npm run test`, Exit 0) |
| Smoke navigation | `e2e/smoke.spec.ts` | 1 green |

In the working state at 08:41:51Z there were **10 test files with 97 test cases**
(Exit 0), including `src/admin-api/admin-token-guard.test.ts` (10),
`src/admin-api/admin-rate-limit.test.ts` (12),
`src/admin-api/cover-fetch-guard.test.ts` (20),
`src/admin-api/admin-routes-hardening.test.ts` (13),
`src/admin-api/security-headers.test.ts` (8) and
`src/utils/validate-song-limits.test.ts` (13). The coverage over `src/utils/**`
rose from 23,29 % to 32,33 % statements (33,77 % lines) in the process.

**Finished parts (evidenced):**
- Four utility rules are tested (year logic, QR intent, Amazon links, task queue).
- The task queue checks **the error path as well**: a handler that throws ends
  after `maxAttempts` in `failed` with `lastError` (`ai-task-queue.test.ts`).
- The QR intent rule knows an explicit state for unsupported
  song links (`unsupported-song-link`) — the test covers exactly this branch.

**Open parts:**
- No test for scoring, time decay, timeline placement, mode logic or
  the state store (`src/stores/game-store.ts`, 640 lines, 0 % tested).
- The E2E smoke checks **only URLs** (`e2e/smoke.spec.ts:5–20`); it checks
  neither content nor game behavior. Because of `basePath: '/Phomu'`
  (`next.config.ts:5`) the paths hit by the test — `/lobby`,
  `/game` etc. — answer with the Next.js 404 page, not with the application — the
  test is green but checks the wrong URL (`GAP-07`).
- No device/browser matrix (`GAP-08`).

## Release decision

**not released** for the next feature wave — the rules of the game
are still untested.

---

# M3 — Documentation, requirement and i18n reform

**Status: `IN PROGRESS`** (current round, state as of 2026-10-25)

## Purpose

The previous documentation state described behavior in prose without IDs. Tests
could not refer to a requirement, status reports contradicted
each other. M3 introduces a **referenceable** documentation set:
requirements with IDs, a machine-readable project state, acceptance evidence
with evidence and the internationalization boundary in `src/i18n`.

## Scope

- **M3.1** Requirement set with the ID schema `<DOMÄNE>-<NNN>` and nine domains
  (`CORE`, `GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`).
- **M3.2** Architecture document with layers and dependency direction.
- **M3.3** Machine-readable state in `project/project.yaml`.
- **M3.4** Change request template and this change request
  (`docs/cr/CR-0001-…`).
- **M3.5** Acceptance template and acceptance evidence per milestone
  (`docs/acceptance/`).
- **M3.6** Agent roles `ROLE-01` … `ROLE-08` with ownership, review and
  blocking scope.
- **M3.7** i18n boundary: `de.json`/`en.json` fully parallel, every
  visible text from the translation.
- **M3.8** New gates: i18n completeness, documentation link check, file size.
- **M3.9** Archiving of the predecessor documentation (not deletion).

## Explicit non-goals

- No change to the game logic in this round.
- No conversion of `src/` components to translation — that is the
  continuation of M3.7 (migration is running, state see evidence).
- No new feature, no new game mode.

## Acceptance criteria

**Functional**
- `REQUIREMENTS.md` covers every behavior rule detectable in the code, with ID,
  acceptance and verification.
- `project/project.yaml` exists and serves as the single truth.
- `docs/cr/` and `docs/acceptance/` contain template and evidence.

**Technical**
- `node scripts/check-i18n-completeness.mjs` is green: de/en parallel, no
  empty values, no one-sidedness, no literal text left in the JSX.
- `node scripts/check-doc-links.mjs` is green: every relative Markdown link
  resolves.
- `node scripts/check-file-size.mjs` is green: no source file over 550
  lines (soft: 400).
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` stay green.

**Performance**
- No budget. M3 is a documentation and structure milestone; a
  runtime budget would be an invented number here.

**Usability**
- A new developer finds the statement "how does mode X work" via
  exactly one link.

**Security-Privacy**
- Moving the legacy documentation changes no permissions, no
  runtime and no data flows — documentation only.

**Interoperability**
- The old files remain intact and readable; the transition is traceable via
  `specifications/README.md` and `specifications/archive/README.md`.

## QA evidence

Measured on 2026-10-25. The numbers carry a timestamp because several roles
work in parallel in this round; each number applies to the stated
moment.

| Item | Evidence |
|---|---|
| Requirements | `REQUIREMENTS.md` contains **175** requirement blocks in nine domains (counted at 2026-10-25T08:56:58Z via `### <DOMÄNE>-<NNN>`), no ID duplicated |
| i18n key space | `src/i18n/locales/de.json` and `en.json`: keys parallel, no empty values, 7 identical values (only proper names like "Spotify", "Jackbox Party") |
| Literal text measurement | `npm run check:i18n`: **6** literal texts in 47 files (2026-10-25T08:59Z) — at the start of the round it was 935 (08:34:52Z). The remaining 6: four theme proper names in `src/app/lobby/page.tsx:77–82` ("Phomu Blue", "Neon Purple", "Cyber Pink", "Gold Rush"), a status prefix `` `draft- ` `` in `src/app/admin/songs/page.tsx:444` and an emoji symbol in `src/app/settings/game-rules/page.tsx:63`. The gate is therefore **almost** green, but still exit 1 |
| Gate scripts present | `scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs` and `scripts/check-file-size.mjs` exist; `package.json` lists them as `check:i18n`, `check:doc-links`, `check:file-size`, `check:all`; `scripts/local-ci.sh:78` calls `npm run check:all` blocking |
| Documentation link check | `node scripts/check-doc-links.mjs`: exit 1, **4 dead links** in 56 checked Markdown files (2026-10-25T08:56:58Z) — three of them in `REQUIREMENTS.md` (anchors `#offende-lücken` and `#game-006-…`), one in `docs/acceptance/M0-ACCEPTANCE.md` (file name with a space; since fixed) |
| File sizes | `npm run check:file-size` → exit 0 with 8 warnings and 7 documented legacy debts (2026-10-25T08:58:43Z): `src/app/lobby/page.tsx` 801, `src/app/admin/review/page.tsx` 767, `src/components/game/MusicPlayer.tsx` 641, `src/stores/game-store.ts` 640, `src/components/game/modes/TimelineMode.tsx` 617, `src/components/game/RevealPhase.tsx` 596, `src/app/browse/page.tsx` 575; in the 401–550 band: `src/utils/validate-song-data.ts` 502, `src/app/game/page.tsx` 468, `src/app/admin/songs/page.tsx` 461 |
| Archiving | `git status` shows the move of the predecessor files to `specifications/archive/` with a date stamp; `specifications/README.md` and `specifications/archive/README.md` explain the assignment |
| Acceptance | `docs/acceptance/M0-ACCEPTANCE.md` — acceptance of the commit state `d5b6422` with evidence per line |

**Finished parts (evidenced):**
- The documentation tree is in place; the root documents and `docs/` exist.
- The machine-readable project state exists (`project/project.yaml`).
- Template and first acceptance evidence exist (`docs/acceptance/`).
- The change request of this round is written
  (`docs/cr/CR-0001-dokumentations-und-agentenstruktur-reform.md`).

**Open parts:**
- The i18n gate is **not yet green**: 6 findings (2026-10-25T08:59Z) — four
  theme proper names, a status prefix and an emoji symbol. The question is a
  product decision: are proper names like "Phomu Blue" non-translatable
  proper names (then into the allowlist) or localizations (then
  translate)? (`GAP-09`)
- The documentation link check is **not yet green**: 4 dead links, three of them
  in `REQUIREMENTS.md` (`GAP-10`).
- The file size gate is green, but only with **documented exceptions**:
  7 files are over 550 lines, and for 5 of them the exception state
  is already exceeded ("the backlog is growing", `GAP-11`).
- The i18n partial files `src/i18n/locales/parts/` exist; the target state
  requires **one** file per language (`GAP-12`).
- The gates are now reachable via `npm run check:*` and run
  blocking in `npm run local-ci` (`GAP-02`, `GAP-03` closed).

## Release decision

**open** — the round is not finished as long as the gates are not green.

---

# M4 — Music-centred UX & game feel

**Status: `PLANNED`**

## Purpose

Phomu promises music as a constant presence, not as a quiz task. The pilot
is supposed to listen to the music, not count the points. M4 makes the audio
flow the product core: no dead phase, every mode has its own musical
moment.

## Scope

- **M4.1** Pre-round beds and transition stings (no standstill > 3 s in the
  standard flow).
- **M4.2** Mode audio: hint level stinger, era stinger when placing,
  signature hook on the survivor reveal, loop volume in the vibe check question.
- **M4.3** Session dramaturgy (warmup / core / party peak, finale with
  accelerated reveal cadence).
- **M4.4** Audio cue pipeline (`src/utils/game-audio-cues.ts`,
  `src/hooks/useGameAudioCues.ts`) with real assets.

## Explicit non-goals

- No own streaming channel, no upload of user music.
- No `drum machine` editor.
- No change to the scoring formulas (that would be a separate change request).

## Acceptance criteria

**Functional**
- No silent phase > 3 seconds in the standard flow.
- Each of the six modes has at least **one** distinctive musical
  moment in the question phase.

**Technical**
- The cue files really exist as audio files, not as descriptions.
- Missing assets produce no visible error (this rule is already
  implemented in the code: `src/utils/game-audio-cues.ts`, comment "Missing
  files are handled silently").

**Performance**
- Audio cues must not interrupt the music flow (short cues, no
  long overlays).

**Usability**
- Mode recognition > 90 % without text help — **the measurement method is
  still to be defined** (instrument, sample, questionnaire).

**Security-Privacy**
- No telemetry. No audio recording. The cue files are static
  assets in the repository.

**Interoperability**
- The cues work on Chromium and Safari (media autoplay policy:
  the user has to start the playback once — `COUNTDOWN_SECONDS: 3`).

## QA evidence

Measured on 2026-10-25:

- `src/utils/game-audio-cues.ts` and `src/hooks/useGameAudioCues.ts` exist
  and name the expected asset paths (file:line).
- **The assets are missing.** `public/audio/sfx/` contains only
  `correct.prompt.md`, `incorrect.prompt.md`, `lose.prompt.md`, `reveal.prompt.md`,
  `win.prompt.md`; `public/audio/mode-cues/` contains only six
  `.prompt.md` files. **No `.mp3` file exists.** The pipeline
  is implemented, the effect is not — that is the reason for `PLANNED`
  instead of `IN PROGRESS`.
- The session playtest (subjective music presence > 8/10) is **NOT RUN**.

## Release decision

**not released** — the milestone has not started; the
prerequisite (real audio assets) is missing.

---

# M5 — Mobile UX Excellence

**Status: `PLANNED`**

## Purpose

Phomu is played on a phone in the hand, standing up, in a loud round.
M5 makes the interface usable and fast from 360 px to 430 px.

## Scope

- **M5.1** Touch targets ≥ 44 × 44 px for all primary interactions.
- **M5.2** Sticky footer/bottom sheet for lobby and game.
- **M5.3** Safe area support (`env(safe-area-inset-*)`).
- **M5.4** Reduction of the decisions per screen (at most one primary CTA).
- **M5.5** Standardized state feedback (Loading / Success / Error / Disabled).
- **M5.6** Bundle analysis and code splitting for heavy UI blocks.
- **M5.7** Lighthouse measurement on the main pages.

## Explicit non-goals

- No native app.
- No offline caching beyond the static export.

## Acceptance criteria

**Functional**
- No horizontal overflow at 360 px width.
- All primary interactions are reachable with the thumb in the lower viewport
  area.

**Technical**
- No horizontal scrolling in the tested views.
- Safe area variables are used in the stylesheet.

**Performance**
- Lighthouse Mobile: Performance ≥ 85, Accessibility ≥ 90 on `/`, `/lobby`,
  `/game`, `/browse`.

**Usability**
- Manual usability test with at least 5 tasks and a documented
  success rate ≥ 90 %.

**Security-Privacy**
- Not affected.

**Interoperability**
- Landscape orientation and Dynamic Island insets are not cut off.

## QA evidence

Measured on 2026-10-25:

- Safe area support **exists** as CSS variables `--sat`, `--sar`,
  `--sab`, `--sal` and as utility classes `.pt-safe`, `.pb-safe`,
  `.pl-safe`, `.pr-safe` (`src/app/globals.css:109–139`); `viewportFit: 'cover'`
  is set (`src/app/layout.tsx`, `viewport`).
- Individual components already set `min-h-[44px]` (example:
  `src/components/game/QuestionPhase.tsx:108`).
- **Lighthouse is NOT RUN** in this environment — there is no measurement value.
- **360-px overflow is NOT RUN** — there is no measurement value.

## Release decision

**not released** — no gate of this milestone is met.

---

# M6 — Security hardening

**Status: `IN PROGRESS`**

## Purpose

Phomu has an admin API that loads cover images from the network and changes the
catalogue. This is the only place in the product where data comes in from
outside. M6 secures it and documents the threat model.

## Scope

- **M6.1** Authentication of the admin routes (token, timing-safe comparison).
- **M6.2** Input validation (lengths, formats, URL allowlist).
- **M6.3** SSRF and size limits for external cover downloads.
- **M6.4** Security headers on all productive routes (CSP, HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **M6.5** Threat model and incident runbook as versioned documents.
- **M6.6** Secret scanning and dependency audit in the CI.
- **M6.7** Rate limiting and abuse protection.

## Explicit non-goals

- No user account system (Phomu stays anonymous, login is optional).
- No tenant or role model before M7.

## Acceptance criteria

**Functional**
- Unauthorized requests receive 401; missing or too short configuration
  yields 503.
- Invalid inputs yield 400, not 500.

**Technical**
- The token comparison is timing-safe.
- External cover URLs must be HTTPS and be on an allowlist.
- The download is limited in time and in size.
- Concurrent cover saves are serialized via a lock file.

**Performance**
- No performance budget for security paths; instead: the admin path
  must not block the game flow (the game flow does not call the admin API).

**Usability**
- Error messages of the admin API are unambiguous without disclosing secrets.

**Security-Privacy**
- The token is never in the bundle and never in the repository.
- Cover downloads end up exclusively under `public/covers/<songId>.jpg`.

**Interoperability**
- The catalogue remains valid after a cover save (`npm run validate-catalog`
  stays green).

## QA evidence

Two measurement points, because several workers work on the
admin area in parallel in this round. **Commit state** = `d5b6422` (isolated extract via
`git archive`, all commands executed there). **Working state** = running
branch at 2026-10-25, 08:55Z.

| Check | Location | State (working state 08:55Z) |
|---|---|---|
| Token check, constant time | `src/admin-api/_lib/security.ts:44–51` | present |
| Token minimum length 32, otherwise 503 | `src/admin-api/_lib/security.ts:7`, `:66–68` | present |
| Missing configuration → 503 | `src/admin-api/_lib/security.ts:65` | present |
| `songId` format check | `src/admin-api/_lib/security.ts:125–134` | present |
| HTTPS requirement + host allowlist | `src/admin-api/_lib/security.ts:136–163` | present |
| Redirect chain limited (max. 3) | `src/admin-api/_lib/security.ts:10`, `:269` (`fetchGuardedBinary`) | present |
| Size limits: 5 MB image, 512 KB JSON | `src/admin-api/_lib/security.ts:13`, `:16` | present |
| Fetch timeout | `src/admin-api/_lib/security.ts:173` (`fetchWithTimeout`) | present |
| Rate limiting per client **and** global, 429 + `Retry-After` | `src/admin-api/_lib/rate-limit.ts:84`, `:137`; `src/admin-api/_lib/security.ts:104` | present (new in this round) |
| Separate buckets per route | `src/admin-api/admin-rate-limit.test.ts` (test `"separates the buckets per route"`) | present |
| Lock file against concurrent saves | `src/admin-api/admin/covers/save/route.ts` | present |
| Security headers (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, `Referrer-Policy`, `nosniff`, COOP) | `next.config.ts` (`securityHeaders`, `headers()`) | **configured but not delivered** — `headers()` does not work with `output: 'export'`; the code comments this explicitly (`GAP-13`) |
| **Threat model / incident runbook** | — | **missing** (`GAP-14`) |
| **Secret scan in the CI** | `.github/workflows/deploy.yml` | **missing** — the workflow builds and deploys but checks no gate (`GAP-18`) |
| **Audit log of admin accesses** | — | **missing** (`GAP-16`) |
| Negative tests for the admin API | `src/admin-api/admin-token-guard.test.ts` (10), `admin-rate-limit.test.ts` (12), `cover-fetch-guard.test.ts` (20), `admin-routes-hardening.test.ts` (13), `security-headers.test.ts` (8) | present — 63 test cases, green (`npm run test`, 2026-10-25T08:41:51Z) |
| **Reachability of the admin routes** | `.next/app-path-routes-manifest.json` | **not in the route tree** — the handlers lie under `src/admin-api/`, the Next app only registers `src/app/`; in addition `output: 'export'` is a static export that cannot serve runtime routes (`GAP-22`) |

**Finished parts (evidenced):**
- The guard logic exists in the source and is **negatively tested**:
  `admin-token-guard.test.ts` checks `"rejects a request without a token (401)"`
  and `"rejects a request with a wrong token (401)"`; `cover-fetch-guard.test.ts`
  checks the allowlist and the size limits; `admin-routes-hardening.test.ts`
  checks the error codes of the routes.
- Foreign hosts, non-HTTPS, overlong fields, oversized responses and
  long redirect chains are rejected.
- Rate limiting acts per client and additionally globally, so that a
  forged `x-forwarded-for` cannot bypass the block
  (`admin-token-guard.test.ts`: `"limits brute-force attempts even when
  x-forwarded-for is forged"`).
- External downloads are limited in time and size; parallel saves are
  serialized.

**Open parts:**
- **The admin routes are currently not reachable.** They lie outside
  `src/app/` and therefore do not appear in the route manifest of the build;
  the static export cannot execute route handlers in any case. The
  hardening is therefore **source-code hardening, not an effectiveness statement**
  about HTTP (`GAP-22`).
- The configured security headers are **not** delivered with the static
  export — the GitHub Pages host does not set them (`GAP-13`).
- No threat model, no incident runbook (`GAP-14`).
- No audit log of admin accesses (`GAP-16`).

## Release decision

**not released** — the admin code is hardened but neither reachable
nor evidenced over HTTP; the delivered product header protection is missing
as well.

---

# M7 — Realtime & multi-device

**Status: `PLANNED`**

## Purpose

Passing one device around is the default. Multiple devices are the wish for
rights, presence and remote participation. M7 introduces the multi-device mode —
deliberately **late**, because it forces authentication, rights and data storage.

## Scope

- **M7.1** Session code (6 digits) and route to join.
- **M7.2** Realtime synchronisation of the core actions (round, answer, score).
- **M7.3** Role model: host, co-host, pilot, player, spectator.
- **M7.4** Reconnect behavior and conflict resolution.
- **M7.5** Abuse protection: limit join attempts, session expiry.

## Explicit non-goals

- No cloud account, no forced login.
- No server-side data storage as long as M7 is not released.
- No chat, no friend circle.

## Acceptance criteria

**Functional**
- 2 to 6 devices play the same session without drift in the core actions.
- Reconnect within a defined time window (target value still to be defined).

**Technical**
- The sync runs over a defined realtime boundary, not over
  `localStorage`.
- The local single-device mode remains fully functional.

**Performance**
- P95 event latency < 500 ms local/near-region (target from
  improvement plan phase E).

**Usability**
- Joining is done in three steps.

**Security-Privacy**
- No unauthorized data access; that requires a rights model that
  only exists in M7.3.
- Data minimisation: the server stores only the session state.

**Interoperability**
- A guest can join the room without installing the app.

## QA evidence

Measured on 2026-10-25:

- `src/types/game-state.ts:23–26` declares `DeviceMode` with
  `'pass-the-phone' | 'multi-device'`.
- `src/types/session.ts:31–56` declares `MultiDeviceSession` with a
  6-digit code and `channelName` for Supabase Realtime.
- `src/stores/game-store.ts:45` sets `deviceMode: 'pass-the-phone'` as the
  default.
- **No implementation:** `package.json` contains no Supabase or
  realtime dependency; no route `/join` exists in the repository; the
  build produces 21 routes, none of them a join route.
- The types therefore describe a **promise**, not a state. Hence
  `PLANNED` and not `IN PROGRESS`.

## Release decision

**not released** — the mode exists as a type, not as a function.

---

# M8 — Launch Readiness & Live Ops

**Status: `PLANNED`**

## Purpose

A party game lives on repetition: the same group, next week, other
packs. M8 secures operations — test matrix, release checklist, way back.

## Scope

- **M8.1** E2E test set for the critical journeys.
- **M8.2** Browser/device matrix (iOS Safari, Android Chrome, desktop
  Chrome/Firefox/Safari) as a reproducible record.
- **M8.3** Accessibility review (contrast, focus order, screen reader).
- **M8.4** Release checklist and rollback plan.
- **M8.5** Optional live-ops mechanic (weekly challenges, event packs).
- **M8.6** KPI evaluation **without** telemetry outflow to third parties.

## Explicit non-goals

- No telemetry to external services.
- No account or subscription model.
- No mobile app.

## Acceptance criteria

**Functional**
- The critical journeys are green in E2E.
- The defined browser/device matrix has no blockers.

**Technical**
- The release checklist is a file in the repository and names every gate.

**Performance**
- The Lighthouse targets measured in M5 apply here as well.

**Usability**
- The success rate of the manual usability test remains ≥ 90 %.

**Security-Privacy**
- No player data flows to third parties. KPI evaluation takes place locally or
  via voluntary, aggregated exports.

**Interoperability**
- The card printing path (59 × 91 mm + 3 mm bleed) remains documented and
  checked (`PRINTING_GUIDE.md`, `PHOMU_CONFIG.CARD_*`).

## QA evidence

Measured on 2026-10-25:

- There exists **one** E2E test (`e2e/smoke.spec.ts`, 1 test case, green).
- There exists **no** device matrix, **no** release checklist,
  **no** rollback plan, **no** KPI evaluation.
- The only existing workflow (`.github/workflows/deploy.yml`) builds and
  publishes on `main`; it runs not a single one of the gates
  (no typecheck, no lint, no test, no build gate, no coverage).

## Release decision

**not released.**

---

# Platform tracks — the multi-platform extension

The milestones M0 to M8 make the product solid. The platform tracks make it
**reachable**: the same game, the same rules, on the devices people actually
sit in front of — phone, television, desktop, tablet.

**The invariant.** One product, one Rust core, platform-specific frontends.
The rules live in the core and are implemented **once**. The web application
stays and becomes a first-class shell; it is **supplemented, not replaced**.

The binding track order is decided in
[`docs/adr/ADR-0006-binding-platform-track-order.md`](docs/adr/ADR-0006-binding-platform-track-order.md):
a track only starts once the previous one has a green release candidate.

| Track | Shell | Order | Prerequisite |
|---|---|---|---|
| Web | Next.js 16, React 19 | 0 | active today |
| Android | Kotlin, Jetpack Compose | 1 | M0–M2 green |
| Google TV / Fire TV | Kotlin, Compose for TV | 2 | Android has a green release candidate |
| macOS and Linux | Rust, egui | 3 | TV has a green release candidate |
| iPadOS and iOS | Swift, SwiftUI | 4 | desktop has a green release candidate, Apple licence question settled |
| Windows | Rust, egui | 5 | iOS/iPadOS has a green release candidate |

The design is in
[`docs/design/PLATFORM-ARCHITECTURE.md`](docs/design/PLATFORM-ARCHITECTURE.md),
the binding contract between core and shells in
[`docs/design/BUILD-CONTRACT.md`](docs/design/BUILD-CONTRACT.md), the
specification in [`docs/spec/`](docs/spec/), the release rules in
[`docs/releases/`](docs/releases/) and the licence question in
[`docs/licensing/`](docs/licensing/).

Each track runs through **alpha → beta → stable**. What each stage requires
is defined once in [`docs/releases/RELEASE-PLAN.md`](docs/releases/RELEASE-PLAN.md);
the checklist is in
[`docs/releases/RELEASE-CHECKLIST.md`](docs/releases/RELEASE-CHECKLIST.md).

## P0 — Platform foundation

### Purpose

Establish the shared Rust core and prove that a second shell can be built on
top of it without duplicating a single rule.

### Scope

- Rust workspace with the crate topology and the dependency rules
- the build contract between core and shells, enforced by a gate script
- the bridge (UniFFI) with its ABI versioning
- the web application as the reference shell
- the boundary gate with its self-test

### Explicit non-goals

- No native shell beyond the web one
- No store publication
- No change of the game rules

### Acceptance criteria

- The dependency gate exists, fails on a deliberate violation and passes on a
  clean tree (negative test documented)
- The bridge round-trips its core types
- The platform requirements of [`docs/spec/REQUIREMENTS-PLATFORM.md`](docs/spec/REQUIREMENTS-PLATFORM.md)
  are covered by tests or carry an explicit "to be written" entry in
  [`docs/spec/TRACEABILITY.md`](docs/spec/TRACEABILITY.md)

### QA evidence

[`docs/acceptance/`](docs/acceptance/)

### Release decision

Pending. The web shell stays the production surface until a second shell has a
green release candidate.

## P1 — Android

### Purpose

The phone and tablet are where a party game actually gets played.

### Scope

- Kotlin shell over the shared core
- lobby, modes, round flow, catalogue browsing
- the projector-free full-screen experience, wake lock, audio focus
- accessibility for touch, screen readers and reduced motion

### Explicit non-goals

- No television support (that is P2)
- No desktop (P3)
- No App Store publication of an iOS build (P4)

### Acceptance criteria

- The eight dimensions of [`QUALITY.md`](QUALITY.md) are addressed
- The core rules are not re-implemented in the shell
- The Android release gate of
  [`docs/releases/RELEASE-PLAN.md`](docs/releases/RELEASE-PLAN.md) is met

### QA evidence

[`docs/acceptance/`](docs/acceptance/)

### Release decision

Pending.

## P2 — Google TV and Fire TV

### Purpose

The television is the screen the whole room looks at.

### Scope

- Kotlin shell over the same core, large type, remote control navigation
- the projector surface as a first-class screen
- the handover between the device running the game and the television showing
  it

### Explicit non-goals

- No full game loop on the television in the first release — the device runs the
  game, the television displays it
- No voice input, no casting protocol

### Acceptance criteria

- Legible from the back of the room at the defined size
- Fully operable with the remote control alone
- The spoiler rule holds on the television surface as well

### QA evidence

[`docs/acceptance/`](docs/acceptance/)

### Release decision

Pending.

## P3 — macOS and Linux

### Purpose

The desktop is where the projector mode, the print layout and the long evening
live.

### Scope

- Rust shell with egui over the shared core
- windowing, multi-monitor, the projector window
- macOS: signed, notarised bundle; Linux: AppImage

### Explicit non-goals

- No Windows build in this track (that is P5)
- No macOS-only feature that Linux cannot mirror

### Acceptance criteria

- The build contract is unchanged for a shell that is not written in Kotlin or
  Swift
- Performance budgets of the desktop track are met on the reference machine

### QA evidence

[`docs/acceptance/`](docs/acceptance/)

### Release decision

Pending.

## P4 — iPadOS and iOS

### Purpose

The tablet as the second screen and the phone as the remote.

### Scope

- Swift shell with SwiftUI over the same core
- the handover model to the television and to the desktop
- the distribution decision from
  [`docs/licensing/APPLE-LICENSING.md`](docs/licensing/APPLE-LICENSING.md)

### Explicit non-goals

- No App Store publication before the licence question in
  [`docs/adr/ADR-0007-apple-distribution-and-licensing-strategy.md`](docs/adr/ADR-0007-apple-distribution-and-licensing-strategy.md)
  is settled
- No feature that the web application cannot do

### Acceptance criteria

- The Apple release gate is met
- The AGPL obligations are met for the shipped binary

### QA evidence

[`docs/acceptance/`](docs/acceptance/)

### Release decision

**Blocked.** Two prerequisites: an Apple Developer Program account (the owner
will obtain one) and the licence decision above.

## P5 — Windows and further operating systems

### Purpose

The remaining desktop platforms.

### Scope

- Rust shell with egui, MSIX packaging and signing
- the same track model as P3

### Explicit non-goals

- No platform-specific features that the other shells cannot mirror

### Acceptance criteria

- The Windows release gate is met

### QA evidence

[`docs/acceptance/`](docs/acceptance/)

### Release decision

Pending.


# The QA remediation as a work stream

The independent QA assessment of 25 October 2026 ([`docs/qa/`](docs/qa/))
raised 48 findings and produced a 28-item plan
([`docs/qa/QA-09-REMEDIATION-BACKLOG.md`](docs/qa/QA-09-REMEDIATION-BACKLOG.md)).
It is worked as its own stream, in the stages the plan names: recover, close the
release blockers, build the core, polish.

The execution record — what is done, what is in flight, what the owner has to
decide — is in
[`docs/remediation/STATUS.md`](docs/remediation/STATUS.md). Two items are
**owner decisions**, because they change what the product is and not only how it
is built: the **hosting model** (2.6) and the **fate of the admin API** (1.6).

# Known gaps

Prioritized by impact on the acceptance readiness. Each gap names the
milestone in which it is closed, the evidence that reveals it, and
its state. **State as of 2026-10-25, 08:55Z** — several gaps were already
closed in this round; they remain in the record with their evidence so that the
closure stays verifiable.

| ID | Gap | Impact | Milestone | Evidence | State |
|---|---|---|---|---|---|
| GAP-01 | Prettier format check red (287 files) | Style drift; blocks no gate, but prevents a green `format:check` | M3 | `npm run format:check` → Exit 1 | open |
| GAP-02 | `scripts/check-file-size.mjs` missing | The file size gate from the work contract is not executable | M3 | File does not exist | **closed in this round** (script present, `npm run check:file-size` → Exit 0) |
| GAP-03 | No `npm run check:*` scripts in `package.json` | The gates have to be called manually, the CI does not call them | M3 | `package.json` scripts: no `check:i18n`, `check:doc-links`, `check:file-size` | **closed in this round** (`check:i18n`, `check:doc-links`, `check:file-size`, `check:all` present; `scripts/local-ci.sh:78` calls `npm run check:all` blocking) |
| GAP-04 | `npm run validate-songs` checks only `A1.json` | The complete catalogue is not validated via this path | M1 | Command output: `"Lese Datei: …/A1.json"` ("Reading file: …/A1.json") | open |
| GAP-05 | No record regression test for the catalogue rules | A catalogue change can break a rule without any test going red | M1 | No test in `src/utils/` for the catalogue rules (a limit test for the validator was added in this round) | partially closed |
| GAP-06 | No coverage target defined | 23,29 % statements (commit state) are a number, not a benchmark | M2 | `npm run test` coverage output | open |
| GAP-07 | E2E smoke checks only URLs and hits the 404 page because of `basePath` | The green test does not prove that the pages work | M2 | `e2e/smoke.spec.ts:5–20`, `next.config.ts:5` | open |
| GAP-08 | No browser/device matrix | A regression on Safari stays unnoticed | M8 | No matrix record in the repository | open |
| GAP-09 | 6 literal texts in 47 files not yet translated (at the start of the round: 935) | The i18n gate is red; the interface is almost completely bilingual | M3 | `npm run check:i18n`, 2026-10-25T08:59Z: 4 theme proper names (`src/app/lobby/page.tsx:77–82`), 1 status prefix (`src/app/admin/songs/page.tsx:444`), 1 emoji symbol (`src/app/settings/game-rules/page.tsx:63`) | open (decision on proper names vs. translation needed) |
| GAP-10 | Dead Markdown links (at the start of the round: 66, now 4) | The documentation link check is red, the documentation tree is incomplete | M3 | `node scripts/check-doc-links.mjs` → Exit 1, 4 findings, 3 of them in `REQUIREMENTS.md` | partially closed (this contribution resolves `ROADMAP.md`, `project/project.yaml`, `docs/cr/`, `docs/acceptance/`) |
| GAP-11 | 7 files over 550 lines (documented legacy debts), 3 more over 400 | Violation of the file size rule; large diff risks | M3 | `npm run check:file-size` → Exit 0, 8 warnings, 7 legacy debts with a recorded exception state (2026-10-25T08:58:43Z) | open (exceptions documented, the backlog is growing for 5 files) |
| GAP-12 | `src/i18n/locales/parts/` exists in parallel to `de.json`/`en.json` | Two truths for the same key space | M3 | Directory listing | open |
| GAP-13 | Security headers are configured but are not delivered under `output: 'export'` | No CSP and no HSTS on the delivered host; the code names the limitation itself | M6 | `next.config.ts` (`securityHeaders`, comment on the export limitation) | open (configuration in place, delivery missing) |
| GAP-14 | No threat model, no incident runbook | In the event of an incident the documented reaction is missing | M6 | No file in the repository | open |
| GAP-15 | No negative tests for the admin API | The hardening would be unprotected against a rollback | M6 | `src/admin-api/*.test.ts` — 5 files, 63 test cases, green (`npm run test`, 2026-10-25T08:41:51Z) | **closed in this round** |
| GAP-16 | No rate limiting, no audit log | Abuse of the admin API remains possible | M6 | Rate limiting: `src/admin-api/_lib/rate-limit.ts` (present, tested). Audit log: no find | partially closed |
| GAP-17 | No `.mp3` assets; only prompt files | The audio flow does not exist, only its description | M4 | Listing `public/audio/sfx/`, `public/audio/mode-cues/` | open |
| GAP-18 | No CI gates: the workflow builds and deploys without typecheck, lint, test | A red push is published | M8 | `.github/workflows/deploy.yml` | open |
| GAP-19 | Contradictory catalogue numbers in the documentation | The README names 37 packs / 1.629 songs; 135 pack files / 1.615 songs are measured | M1 | `README.md` against `npm run validate-catalog` | open |
| GAP-20 | No test for scoring, time decay, timeline, mode logic, store | The rules of the game are untested | M2 | Coverage output: `src/stores/game-store.ts` 0 % | open |
| GAP-21 | Lighthouse, 360-px overflow, usability study not measured | The acceptance criteria of M5 are unevidenced | M5 | No measurement value in the repository | open |
| GAP-22 | Admin API routes lie outside `src/app/` and are not registered in the build; `output: 'export'` cannot execute route handlers | The admin hardening exists in the source but is not effective over HTTP and not verifiable | M6 | `.next/app-path-routes-manifest.json` (23 entries, no `/admin-api/*`), `next.config.ts` (`output: 'export'`) | open |

---

# Roadmap change rule

A milestone scope may only be changed via a documented change request
if it touches accepted requirements or release gates.
A step that silently moves an open item into a later milestone
so that a milestone looks green is forbidden.

No milestone and no feature counts as done when it rests on stubs,
dummy returns or mock bridges. Acceptance demands an
authentic, fully integrated implementation with real runtime verification.

The detailed criteria per milestone are in
[`docs/acceptance/`](docs/acceptance/), the acceptance model in
[`QUALITY.md`](QUALITY.md), the machine-readable summary in
[`project/project.yaml`](project/project.yaml).

## History

The milestones M0 to M8 are taken over from the predecessor documents and
sharpened:

| Source | Taken over as |
|---|---|
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, phase 1 (AP 1.1–1.3) | M0, M1, M2 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, phase 2 (AP 2.1–2.3) | M4, M5 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, phase 3 (AP 3.1–3.3) | M6 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, phase 4 (AP 4.1–4.2) | M7 |
| `specifications/archive/project_roadmap_archivstand_2026-10-25.md`, phase 5 (AP 5.1–5.2) | M8 |
| `specifications/archive/improvement_plan_mobile_ux_security_archivstand_2026-10-25.md`, phases A–F | M0, M1, M5, M6, M7, M8 |
| `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md` | section "Known gaps" |
| Reform documentation of this round | M3 |
