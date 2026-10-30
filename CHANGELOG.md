# Changelog

All notable changes to Phomu are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
and the versioning follows [Semantic Versioning](https://semver.org/lang/de/).

The version numbers from before the reform cannot be reconstructed — until the
reform the history of the repository consisted of a single, combined commit.
The state before the reform is preserved in `specifications/archive/` as a
document state, not as a version history.

---

## [Unreleased]

### Added — Platform expansion (specification)

Phomu grows from a web application into a **family** of applications: one
product, one shared Rust core, platform-specific frontends. The web app stays
and becomes a first-class shell — supplemented, not replaced.

Everything is specified before it is built:

- **`docs/design/PLATFORM-ARCHITECTURE.md`** — the crate topology, the
  dependency direction, what belongs in the core and what belongs in a shell,
  the bridge, the platform differences as gaps rather than special cases, the
  build chain and the honest limits.
- **`docs/design/BUILD-CONTRACT.md`** — the binding contract between core and
  shells, with the rule for incompatible bridge changes and the self-test of
  the boundary gate.
- **`docs/spec/SRS.md`** — the software requirements specification: product
  goals, system context, external interfaces, non-functional requirements,
  constraints and the traceability matrix.
- **`docs/spec/REQUIREMENTS-PLATFORM.md`** — the platform requirements in the
  same discipline as `REQUIREMENTS.md`: every requirement carries an ID, a
  rationale, acceptance criteria and a verification path.
- **`docs/spec/TRACEABILITY.md`** — requirement → design → ADR → test →
  acceptance, including an honest list of what has no test yet.
- **`docs/releases/RELEASE-PLAN.md`** — **alpha → beta → stable** per platform
  track, with gate criteria and a checkable definition of each stage.
- **`docs/releases/RELEASE-CHECKLIST.md`** — the executable checklist for a
  release.
- **`docs/licensing/APPLE-LICENSING.md`** — the licensing and distribution
  analysis for iOS/iPadOS, with 44 cited sources.
- **ADR-0005** (shared Rust core), **ADR-0006** (binding platform track
  order), **ADR-0007** (Apple distribution and licensing strategy).

The **platform track order is binding**: Android → Google TV / Fire TV →
macOS and Linux → iPadOS and iOS → Windows. A track only starts once the
previous one has a green release candidate.

The **Apple licensing question** is answered rather than dodged: the whole
codebase stays under AGPL-3.0-or-later, and exactly one narrowly scoped
AGPL-3.0 §7 additional permission — the *Phomu App Store Exception* — removes
the conflict with app-store distribution channels while leaving every copyleft
obligation intact. The iOS/iPadOS track is **blocked** until the owner has an
Apple Developer Program account; the web application keeps working without one.

### Added — The shared Rust base (milestone P0)

The first milestone of the platform extension is implemented: the shared Rust
core, the bridges and the proof that both play the same game.

- **Cargo workspace** with the crate topology of
  [`docs/design/PLATFORM-ARCHITECTURE.md`](docs/design/PLATFORM-ARCHITECTURE.md):
  `core/phomu-{core,catalog,config,i18n,media,errors,conformance}`,
  `platform/{phomu-ffi,phomu-capi,phomu-wasm}` and the `tools/` crates.
- **The rules live in the core**: the round automaton, the six game modes as
  pure state machines, scoring, time decay, teams and the win conditions.
  The `facade` is the single surface every bridge exports.
- **The bridges**: UniFFI for Kotlin and Swift, a C-ABI for embedders,
  wasm-bindgen for the web shell, with a versioned ABI
  ([ADR-0008](docs/adr/ADR-0008-abi-version-and-the-exported-surface.md)).
- **`scripts/check-crate-boundaries.mjs`** — the dependency rule is enforced
  mechanically, with a self-test that shows the gate turning red on a
  deliberate violation and green again afterwards.
- **The conformance proof**: 70 vectors in `core/phomu-conformance/vectors/`
  run against both the web shell and the Rust core. `npm run check:conformance`
  compares them and reports: **64 portable vectors compared, 36 identical, 0
  deviating, 28 intentional deviations, 6 documented divergences**.
- **`docs/acceptance/P0-ACCEPTANCE.md`** — the honest record, including the
  divergences that are deliberate (the core is stricter than the reference) and
  the ones that are not comparable yet.
- **The CI** now has three Rust jobs: *Rust Core* (build, test, clippy, fmt,
  doc), *Rust Boundaries* (the dependency rule) and *Conformance* (the shared
  core against the web shell).

### Added — the timeline runs from left to right in the landscape

The Timeline mode draws its axis along the shape of the viewport. The
portrait reads the years from top to bottom; the landscape — a tablet on the
table — runs the timeline from left to right, with the years as the marks
on the line and the slots as the gaps between them. The mode uses the whole
width of the phase column there, and the line scrolls when the timeline
grows beyond it.

### Fixed

- **A round of the Timeline mode could be released without the answer.** The
  generic button "everyone's done → reveal" was offered in the Timeline mode
  as well. It released the solution of the round **without** sending the
  answer to the base — the round was judged without a judgement: the slot
  showed a wrong placement and the year `0`. The mode has its own button,
  and it sends the answer before it releases the solution; the generic button
  belongs to the modes that have no own one. A round that is revealed
  without an answer (the round timed out, the table skipped it) now keeps
  the placement of the player and carries no judgement.
- **The quick game showed an empty screen.** Starting a song from the library
  put the shell into the phase `question` without a question — the core never
  drew a card, and the player was left in front of an empty game screen. The
  shell waits for the card of the core now, and the core draws the song the
  player chose (it owns the catalogue). A song that the player added or
  changed in the library is not in the catalogue of the core — the round
  draws a song from the catalogue instead of ending in a dead screen.
- **The Timeline mode was broken from the first card.** The shell kept the
  years of the timeline in its own state and never handed them to the shared
  core, so the core evaluated the answer against an empty timeline: every
  placement but the first was refused (`errors.invalidAnswer`), the answer
  never reached the core, and the solution of the round could not be
  released afterwards — the player saw the message *"The solution could not
  be shown."* The shell now hands the three starting years to the core
  **before** the card is drawn (the core builds the slots and the possible
  points of the round from the timeline it knows — the round promised one
  point instead of four), and tells the core about a year the player
  removes.
- **The years of the last game survived the next game.** The years of the
  timeline are persisted, and the core starts every session with an empty
  timeline. A game after another one therefore began with a timeline that
  only the shell knew — the core evaluated the answer against years that
  were not on the screen, and the round promised one point instead of four.
  The shell throws the years away when the session of the core starts.
- **A round that nobody answered could not be closed.** The core releases
  the solution only after the answers are locked in; the shell offered the
  reveal before the answer had arrived. The reveal now falls back to the
  timeout of the core, which locks the round and releases the solution in
  one go. The timer of the round tells the core as well — a round that the
  shell only revealed on the screen stayed in the phase `question` inside
  the core, and the core refused to close it afterwards.
- The **anti-spoiler lock** was not enforced in the shared core: the lock flag
  was set but a further answer was still accepted. The lock is now enforced in
  the state machine, and the round enters the phase `locked-in`. That closes
  deviation A6 in
  [`docs/design/GAME-CONTRACT.md`](docs/design/GAME-CONTRACT.md) and the open
  decision E3 with it.
- The **E2E smoke test** no longer fails intermittently: the Playwright
  timeout was 30 s, which is too tight on a slow file system (limitation L5 in
  [`docs/acceptance/M0-ACCEPTANCE.md`](docs/acceptance/M0-ACCEPTANCE.md)).

### Changed — the address of the game

The game is reachable at **https://phomu.pages.dev** now.

The address of a Pages project is fixed when the project is created — the
subdomain cannot be changed afterwards (the known issues of the Cloudflare
documentation). The deployment workflow therefore does not rename a project
to change its address; it does the opposite: a project that carries the
wanted name but serves the wrong address gives the name back, and the upload
creates the project with the wanted name — and with the address that belongs
to it.

The project that was created as `supermazerworld` keeps its address and its
deployments of the past. It can be deleted in the dashboard once the new
project is in place. The new project has no Git integration — the GitHub
workflow is the only deployer.

### Changed — the licence is now AGPL-3.0-or-later

The project moved from **GPL-3.0-or-later** to **AGPL-3.0-or-later** by owner
decision on 2026-10-25. This is not a relicensing of the work by its
contributors — it is the adoption of a licence the work was already compatible
with, plus one obligation the GPL does not have.

- **`LICENSE`** now carries the full AGPL-3.0 text and the project notice.
- **`LICENSE.md`** (new) explains what changed, what §13 adds, and how every
  distribution channel is covered.
- **`package.json`, `Cargo.toml`** and every crate manifest declare
  `"AGPL-3.0-or-later"`.
- **The documentation and the user interface** name the same licence — including
  the German and English terms in the application.
- **`CORE-002a`** (new requirement) records the AGPL §13 obligation: everyone
  who interacts with Phomu over a network can obtain the source of the version
  they are interacting with. The web shell is a static client without a
  server-side component, so the source of the deployed version is the source in
  the repository; the legal pages link to it.
- **The Apple analysis was redone for the AGPL** in
  [`docs/licensing/APPLE-LICENSING.md`](docs/licensing/APPLE-LICENSING.md) and
  [`docs/adr/ADR-0007-apple-distribution-and-licensing-strategy.md`](docs/adr/ADR-0007-apple-distribution-and-licensing-strategy.md):
  §7 works exactly as in the GPL, the App Store conflict is identical, and the
  Haven precedent is an AGPL grant as well. New section 7.0 covers §13.
- **`scripts/check-license.mjs`** (new gate) verifies that the licence
  statement is identical in the licence file, both package manifests, every
  crate, the documentation and the user interface. Its negative test — a
  deliberately wrong identifier in `package.json` — turns the gate red and
  green again after the fix.

### Added — the web shell is hosted on Cloudflare Pages

The hosting question of the QA backlog is decided and prepared. The decision
and the rejected alternatives are in
[`docs/adr/ADR-0010-hosting-on-cloudflare-pages.md`](docs/adr/ADR-0010-hosting-on-cloudflare-pages.md),
the runbook is in
[`docs/deployment/CLOUDFLARE.md`](docs/deployment/CLOUDFLARE.md).

- the nine security headers have **one** source,
  `config/security-headers.mjs`. The Next.js server reads it, the deployment
  writes it into `public/_headers`, and the CI compares the two. The headers
  therefore reach the browser for the first time, which closes QA-SEC-001.
- the Content-Security-Policy allows `'wasm-unsafe-eval'` — without it the
  browser refuses to compile the WebAssembly module of the shared base and
  the game does not start.
- the base path becomes a variable: `/Phomu` on GitHub Pages, empty on a
  Pages project.
- `public/_routes.json` reserves `/api/*` for the functions that the admin API
  and the round API will become, so the static traffic stays free.
- `wrangler.toml` and a deployment workflow that builds the WebAssembly
  module, the shell and the headers together. It skips itself when the token
  is missing, so the repository stays usable without a Cloudflare account.
- a new gate `scripts/check-workflows.mjs` parses every workflow and rejects
  a job-level condition that reads the secrets context — the mistake that made
  the first version of the deployment workflow an invalid workflow file.

**Still open:** the three steps with the account (the Pages project, an API
token with the permission *Cloudflare Pages: Edit*, the two repository
secrets), the R2 bucket for the cover files, and the round API.

### Added — Documentation language gate

The project documentation and the repository are **English**. The user
interface stays German-first with a complete English translation.

- **`scripts/check-doc-language.mjs`** — a new gate that fails when German
  prose reappears in the documentation, the YAML state or the workflows.
  Quoted interface strings and acronyms are exempt.
- The gate runs in `npm run check:all` and in the CI quality-gates job.
- `specifications/archive/` is deliberately **not** covered: those files are
  verbatim snapshots of the German-language era, and translating them would
  falsify the record.


### Added — Documentation and specification

The document set was converted to the house format of **Vocument** and
**PhairPlayRust**: from a collection of loose snapshots it became a set with
roles, IDs, gates and evidence.

- **`REQUIREMENTS.md`** — 169 requirements in nine domains (`CORE`, `GAME`,
  `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`), each with requirement,
  rationale, acceptance and verification as well as a Preset/Optional/Later label.
- **`ARCHITECTURE.md`** — layers and dependency direction, measured import graph,
  data flow of the game flow, boundaries of admin API, i18n, data and audio, file
  size measurement with all violations.
- **`ROADMAP.md`** — milestones with purpose, non-goals, acceptance criteria
  across all eight dimensions, evidence and release decision; plus a risk
  register and the open gaps.
- **`AGENTS.md`** — the working rules for agents: 20 universal rules, naming
  standard, eight roles (`ROLE-01` to `ROLE-08`) with ownership, review and
  blocking scope, workflow and handover format.
- **`QUALITY.md`** — the acceptance model across eight dimensions, with the hard
  rule that no acceptance counts on the basis of stubs or mock simulations.
- **`WHERE_TO_CHANGE.md`**, **`GLOSSARY.md`**, **`PROJECT_MANAGEMENT.md`**,
  **`PRIVACY.md`**, **`SECURITY.md`** — new in the house style.
- **`docs/`** — index (`docs/README.md`), `DOCUMENTATION_POLICY.md`,
  `GETTING-STARTED.md`, `BEST_IN_CLASS.md`, four ADRs plus template, one change
  request, the acceptance template and one acceptance record.
- **`docs/design/`** — `GAME-CONTRACT.md` (round state machine, anti-spoiler
  boundary, contracts of the six modes, persistence rules) and an index.
- **`docs/user-guide/`** — the guide for players, **once in German and once in
  English**, with an identical structure.
- **`docs/guides/`** — printing guide and troubleshooting.
- **`project/project.yaml`** — the machine-readable project state as the single
  truth for values that several documents touch.
- **`CHANGELOG.md`**, **`CONTRIBUTING.md`**, **`README.md`**, **`LLM.md`** —
  newly written or converted.

### Added — Internationalisation

Apart from four files, the interface was completely hardcoded German with
25 translation keys. Now:

- **1231 keys** in `src/i18n/locales/de.json` and `en.json`, **completely in
  parity** — checked by the gate `npm run check:i18n` and
  `npm run verify:i18n-keys` (677 used keys, 0 missing).
- **40 components** take their texts from the translation instead of JSX
  literals.
- **Real English texts** — no German copies. Proper nouns (Spotify, YouTube,
  Jackbox, mode names) deliberately remain identical.
- **Plural forms** as `_one`/`_other` in both languages.
- **Typed keys** via `src/i18n/types.ts` — a typo in a key name is now a compile
  error. The list of variant texts (reveal wordings, feedback, team names) is
  **generated** from `de.json` (`npm run generate:variant-keys`), so that keys
  and list cannot drift apart.
- **The language data has been reconstructed from the build cache.** A migration
  step had placed the leaf key `modes.timeline` over the nested object
  `modes.timeline.*` and thereby destroyed 173 mode keys in both languages.
  `scripts/recover-locales-from-build.mjs` retrieves the data from `.next/`; the
  trigger — a leaf key that is at the same time a namespace prefix — is
  documented in `scripts/seed-shared-keys.mjs` and excluded for the future.
- **`src/i18n/config.ts`** — `supportedLngs`, `load: 'languageOnly'` and
  `nonExplicitSupportedLngs`, so that a regional variant such as `de-DE` shows
  the shipped language instead of nothing.
- **`src/components/LanguageHtmlAttribute.tsx`** — the `lang` attribute of the
  document now follows the active language. Previously it stayed statically on
  German, even when English was selected.

### Added — Quality gates and CI

- **`scripts/check-i18n-completeness.mjs`** — checks DE/EN parity, empty values,
  plural forms and remaining literals in TSX files.
- **`scripts/check-doc-links.mjs`** — checks that every relative Markdown link
  in the repository resolves.
- **`scripts/check-file-size.mjs`** — target 400 lines, hard limit 550.
- **`scripts/merge-i18n-parts.mjs`** — merges the part files of the translation
  into one file per language.
- **`.github/workflows/ci.yml`** — jobs for typecheck, lint, unit tests,
  catalogue validation, quality gates and build. Until now there was only a
  deployment workflow, **no test CI**.
- **`npm run check:i18n`**, **`npm run check:doc-links`**,
  **`npm run check:file-size`**, **`npm run check:all`** — the gates locally as
  well.

### Added — Security

- **Rate limiting** for the admin API (`src/admin-api/_lib/rate-limit.ts`), with
  its own upper limit for failed authentication attempts.
- **Security headers** (CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`) in `next.config.ts`. The allowed
  origins are derived from the code, so that media playback does not break.
- **Hard limits** for text inputs (`src/utils/validate-song-limits.ts`).
- **66 new tests** for token guard, rate limit, cover retrieval, route hardening,
  security headers and input limits — throughout **negative tests** that
  actually execute the attack.

### Changed — the repository is English

- The entire documentation set was translated from German to English:
  `README.md`, `AGENTS.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`,
  `QUALITY.md`, `WHERE_TO_CHANGE.md`, `GLOSSARY.md`, `PROJECT_MANAGEMENT.md`,
  `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `PRIVACY.md`, `LLM.md` and
  the whole `docs/` tree.
- The code comments, the script output and the test names were translated too.
- `docs/user-guide/USER-GUIDE.de.md` was removed; the guide exists in English.
  The **interface** is unaffected and remains German-first with a complete
  English translation.

### Changed

- **`specifications/`** — the predecessor documentation has moved to
  `specifications/archive/` and is versioned there with a date stamp. It was
  **not** deleted. `specifications/README.md` explains the mapping from old state
  to successor.
- **`LLM.md`** — from the 170-line master specification to the short version
  with references to the binding documents. The full text is preserved as an
  archive state under `specifications/archive/`.

### Fixed

- The `lang` attribute of the HTML document no longer stays on German when
  English was selected (see Internationalisation above).
- **Three dead anchors** in `REQUIREMENTS.md` (`#offende-lücken` × 2,
  `#game-006--…`) are fixed; `npm run check:doc-links` reports 0 dead links
  in 57 Markdown files.
- **Duplicate theme values** in `NavBar.tsx` and `ThemeSwitcher.tsx` now live
  exactly once in `src/config/themes.ts` — together with the typed translation
  keys of the theme names.
- The typo "Zurueck" in `common.back` is corrected.

### Known limitations

These points are **open** and are recorded with a priority in `ROADMAP.md`:

- The coverage of the **test suite** is at 32 % of statements. The game
  mechanics (`src/stores/game-store.ts`, `src/utils/song-picker.ts`,
  `src/components/game/modes/*`) are not yet covered by unit tests.
- **Eight source files** exceed the hard limit of 550 lines. The split-up is
  described in `ARCHITECTURE.md` § 6.3 and not yet implemented. The files
  touched in this round were thereby **converted to Prettier formatting** — that
  corresponds to the `.prettierrc` of the project, but makes the files visibly
  longer (on its own `src/utils/validate-song-data.ts` grows from 493 to 817
  lines, roughly two thirds of which is pure formatting). The file size gate
  reports this as "backlog is growing"; the legacy debt is recorded as
  documented exceptions. **The conversion was deliberately not reverted**,
  because `npm run format:check` would otherwise stay permanently red for
  exactly these files.
- **318 further files** in the repository also do not follow Prettier. They were
  **not** touched in this round, because that would produce a diff that hides
  the actual change. The migration is open as its own step.
- **`src/admin-api/` has no consumers according to the import graph** — cover
  search and saving is not reachable under the target architecture.
- **Fourteen configuration keys** in `src/config/` are read by nobody.
  `src/config/` is thus one of several truths.
- The **English edition** of the user guides is a translation, but it is **not**
  proofread by an English-speaking person.
- **No E2E test** covers the six game modes; the smoke test covers only the
  basic flow.

---

## Before the reform

Until 25 October 2026 the history consisted of a single commit. The content
state is preserved in `specifications/archive/` as a document state — see the
table of contents there and the warning about the numbers that no longer apply.
