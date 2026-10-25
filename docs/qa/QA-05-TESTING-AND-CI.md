# QA-05 — Testing & Continuous Integration

**Severity of the findings in this report:** P1, P1, P2
**Area:** Test coverage, the honesty of the metrics, and the CI gates that protect the release.

---

## 1. Measured baseline

```
$ npm run test
 Test Files  10 passed (10)
      Tests  97 passed (97)
   Duration  8.71s
```

| Metric | Value |
|---|---|
| Test files | 10 (all under `src/`) |
| Tests | **97 passed / 0 failed**, 8.71 s |
| Coverage — statements | **32.33 %** |
| Coverage — branches | **34.60 %** |
| Coverage — functions | **29.41 %** |
| Coverage — lines | **33.71 %** |
| E2E tests | 1 file (`e2e/smoke.spec.ts`) — **not executed in CI** |
| CI jobs | 7: `typecheck`, `lint`, `unit-tests`, `catalog-validation`, `quality-gates`, `build` |
| `npm audit --omit=dev --audit-level=moderate` | **0 vulnerabilities** |
| `npm run format:check` | **exit 1 — 121 files** |

The suite is fast (8.71 s), fully green, and the security tests genuinely execute their attacks rather than asserting on comments. That foundation is good. The findings below are about **what the metrics measure** and **what CI does not run**.

---

## QA-TST-001 — P1 — The coverage number does not measure the project

### What I measured

`vitest.config.ts`:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/utils/**/*.ts'],      // ← the entire denominator
}
```

The coverage report therefore covers **11 files**. The full report:

```
File               | % Stmts | % Branch | % Funcs | % Lines
All files          |   32.33 |     34.6 |   29.41 |   33.71 |
 ai-task-queue.ts  |   78.26 |       70 |      60 |      85 |
 censor-utils.ts   |       0 |        0 |       0 |       0 |
 check-covers.ts   |       0 |        0 |       0 |       0 |
 feedback-messages |       0 |        0 |       0 |       0 |
 game-audio-cues   |       0 |      100 |     100 |       0 |
 last-round-msgs   |       0 |      100 |       0 |       0 |
 qr-intent.ts      |   84.21 |       80 |     100 |   84.21 |
 song-picker.ts    |       0 |        0 |       0 |       0 |
 validate-song-cat |       0 |        0 |       0 |       0 |
 validate-song-dat |   37.16 |    39.17 |   52.38 |   37.83 |
 validate-song-lim |   98.48 |     87.8 |     100 |   98.36 |
```

**Excluded from the denominator:** every React component (`src/components/**`, 47 TSX files), every route (`src/app/**`), the Zustand store (`src/stores/game-store.ts`, 640 lines), the entire admin API (`src/admin-api/**`), the configuration, the types, the i18n layer, and the data layer.

The label "All files" is therefore **wrong**. The 32.33 % figure means *"32 % of `src/utils/`"*, not *"32 % of Phomu"*. If the real denominator were the whole `src/` tree — which is what a reader of the report will assume — the number would be in the single digits for statements, because the excluded tree contains roughly 12,000 lines of application code against about 1,400 covered lines.

This matters because **coverage is the metric a maintainer will look at first** when deciding what to test next. A green 32 % creates a false impression of coverage, and the files that are actually excluded are precisely the ones where the risky logic lives (the reveal transition, the timeline state machine, the mode components).

There is a second-order problem: **63 of the 97 tests are not counted in the coverage figure at all.** The admin API has five test files — `admin-routes-hardening` (13), `cover-fetch-guard` (20), `security-headers` (8), `admin-rate-limit` (12), `admin-token-guard` (10) = 63 tests — and none of them appears in the coverage table, because `src/admin-api/**` is not in `include`. The most security-critical code in the project is excluded from the metric.

### Concrete recommendation

**Widen the denominator, and report two numbers.**

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'src/data/**',        // catalogue data, not logic
    'src/i18n/types.ts',  // generated
  ],
  thresholds: {
    lines: 40,
    functions: 35,
    branches: 30,
    statements: 40,
  },
},
```

The thresholds must be set **below the true current value**, not above it — a gate that fails on day one is a gate that gets disabled. Measure first, then set the floor slightly below the measured value, and ratchet it up.

Two practical notes:

- **`.tsx` coverage needs a DOM environment.** The current `environment: 'node'` cannot render React components. Add `jsdom` (or `happy-dom`) and set `environment: 'jsdom'` for the component tests via a per-file docblock (`// @vitest-environment jsdom`) so the pure-Node tests keep the fast path.
- **`src/stores/game-store.ts` is the highest-value target.** It is 640 lines of game state machine — the exact logic `GAME-001` … `GAME-012` describe — and it is currently untested and excluded from the metric. A store test needs no DOM at all.

Add `coverage/lcov.info` to the CI artifact upload (it already uploads `coverage/`, but `lcov` must be in the reporter list to be produced), so that a coverage service or a PR comment can show the real number.

**Accept when**

- The coverage table lists every file under `src/`, not only `src/utils/`.
- `src/stores/game-store.ts` and at least one `src/components/game/modes/*.tsx` appear in the table.
- The reported number is accompanied by the explicit scope in the report header (e.g. "coverage of `src/**` excluding data and generated files").
- A threshold is configured and the gate is green at the current true value.

---

## QA-TST-002 — P1 — CI does not run the E2E test, the formatter, or the dependency audit

### What I measured

Jobs in `.github/workflows/ci.yml`: `typecheck`, `lint`, `unit-tests`, `catalog-validation`, `quality-gates`, `build`. Nothing else.

| Check | Exists in the repo | Runs in CI |
|---|---|---|
| `npm run typecheck` | yes | **yes** |
| `npm run lint` | yes | **yes** |
| `npm run test` (Vitest + coverage) | yes | **yes** |
| `npm run validate-songs`, `validate-catalog` | yes | **yes** |
| `npm run check:i18n` / `doc-links` / `file-size` / `doc-language` | yes | **yes** |
| `npm run build` | yes | **yes** |
| `npm run test:e2e:smoke` (Playwright) | **yes** — `e2e/smoke.spec.ts` | **no** |
| `npm run format:check` | yes — **fails on 121 files** | **no** |
| `npm audit --omit=dev --audit-level=moderate` | in `scripts/local-ci.sh` | **no** |
| `npm run check:all` | yes | **no** (only the four individual gates run) |

Three consequences:

1. **The one E2E test never runs.** `e2e/smoke.spec.ts` and `playwright.config.ts` are maintained, the Playwright dependency is installed, and `npm run test:e2e:smoke` exists as a script — but no CI job invokes it. The only test that exercises a real browser against the real application is the only test that never runs automatically. For a project whose critical path is "does the game actually start and play", that is the most valuable test to automate and the biggest waste to leave manual.

2. **121 files fail `prettier --check`.** `scripts/local-ci.sh` deliberately marks the format check as **non-blocking**, and CI omits it entirely — so the codebase has no enforced formatting standard at all. The `.prettierrc` exists, so the intent is there; only the enforcement is missing.

3. **No dependency audit in CI.** `npm audit` runs in the local script only. A newly published CVE in a transitive dependency is discovered by a contributor who happens to run the local script — not by CI, and not before release.

### Concrete recommendation

**Add three jobs.** All three are cheap.

```yaml
  e2e:
    name: End-to-end smoke (Playwright)
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:smoke
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  format:
    name: Prettier format check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npm run format:check

  dependency-audit:
    name: Dependency audit
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npm audit --omit=dev --audit-level=moderate
```

**On the formatter — do this in the right order.** The repository was never Prettier-formatted, and a blanket `prettier --write .` produced 30–60 % longer files in an earlier round (a lesson already recorded in the project's own history). The safe sequence:

1. Run `prettier --write` on **one module at a time**, as a dedicated change set.
2. After each module: `npm run typecheck && npm run lint && npm run test` — all green, and the diff reviewed for anything other than whitespace.
3. Only then turn the CI job on.

Do **not** add the `format` CI job before the repository is formatted — it will be red on the first run and will either be ignored or force someone to `--disable` it, which is worse than not having it. The Prettier configuration in `.prettierrc` should also be checked against the project's actual style (the code is written in a compact, deliberate style; if Prettier's defaults disagree with it, either adjust `.prettierrc` or accept the reformat).

**Accept when**

- The E2E job appears in the Actions tab and has a green run; its report is uploaded as an artifact.
- `npm run format:check` exits 0, and the `format` job is green.
- The `dependency-audit` job is green and runs on every push.

---

## QA-TST-003 — P2 — The CI "Catalog Validation" job validates 0.74 % of the songs

### What I measured

`src/utils/validate-song-data.ts:789`:

```ts
const targetFile = process.argv[2] ?? 'src/data/songs/A1.json';
```

The script validates exactly **one** file by default. The CI job runs `npm run validate-songs` with no argument:

```
$ npm run validate-songs
Lese Datei: .../src/data/songs/A1.json
📊 Zusammenfassung:
   Gesamt:       12 Songs
   Gültig:       12 / 12
✓ Alle Songs sind gültig!
```

The repository contains **136** song JSON files and **1,615** songs. The per-file schema validator therefore checks **12 of 1,615 songs — 0.74 %** — and reports "✓ All songs are valid!".

The other 1,603 songs are only touched by `validate-catalog`, which runs a *different* and looser check (pack-level aggregation, duplicate detection, year ranges). A per-song schema violation in any pack other than A1 — a missing `links.youtube`, a malformed `previewTimestamp`, an out-of-range `difficulty` — is invisible to CI.

**Recommendation:**

Make the script accept a directory or glob and iterate over all packs, then make the CI job run it in strict mode:

```ts
// Accept a file, a directory or a glob; default to the whole catalogue.
const target = process.argv[2] ?? 'src/data/songs';
const files = resolveSongFiles(target);
let total = 0; let invalid = 0;
for (const file of files) {
  const result = validateFile(file);
  total += result.songs.length;
  invalid += result.invalid.length;
}
```

And in CI, fail on any invalid song:

```yaml
      - name: Song schema validation (all packs)
        run: npm run validate-songs -- src/data/songs --strict
```

The `--strict` flag should make **warnings** fail as well, because "126 schema warnings" currently passes silently. Warnings should at least be reported in the CI job summary so that a rising warning count is visible.

**Accept when**

- `npm run validate-songs` reports the song count of the whole catalogue (≈1,615), not 12.
- A deliberately corrupted song in a non-A1 pack makes the CI job fail — prove it with a red/green negative test.
- The CI job summary lists the warning count.

---

## QA-TST-004 — P2 — The catalogue's own validators are barely tested

| File | Coverage |
|---|---|
| `src/utils/validate-song-catalog.ts` | **0 %** |
| `src/utils/validate-song-data.ts` | 37.16 % (uncovered: lines 655, 678-809, 816) |
| `src/utils/song-picker.ts` | **0 %** |
| `src/utils/check-covers.ts` | **0 %** |
| `src/utils/feedback-messages.ts` | **0 %** |
| `src/utils/last-round-messages.ts` | **0 %** (100 % branch) |
| `src/utils/game-audio-cues.ts` | **0 %** (100 % branch) |

`song-picker.ts` is the function that **chooses which song to ask** — it is the component that decides whether a player gets a fresh song, a repeat, or a difficulty-appropriate one. It has no tests at all. `check-covers.ts` verifies cover availability, which is directly relevant to the spoiler surface (QA-SPO-002).

**Recommendation:** prioritise `song-picker.ts` and `check-covers.ts` for unit tests, then the two message modules (they are pure functions and trivial to cover). A pure-function module at 0 % coverage is the cheapest coverage available in the project.

---

## QA-TST-004a — P2 — The Rust base covers what the TypeScript side does not

The Rust workspace that landed during the assessment brings test suites the web shell does not have:

| Rust test | What it proves |
|---|---|
| `core/phomu-core/tests/anti_spoiler.rs` | The question payload never carries the title, the year or the artist — per mode, with declared exceptions |
| `core/phomu-core/tests/round_automaton.rs` | The round state machine's transitions |
| `core/phomu-core/tests/modes.rs` + `src/modes/tests.rs` | The behaviour of each game mode |
| `core/phomu-core/tests/cross_crate.rs` | The crate boundaries hold at runtime, not only statically |
| `core/phomu-catalog/src/selection/tests.rs` | The **song selection** logic that `song-picker.ts` (0 % coverage) leaves untested on the TypeScript side |
| `core/phomu-catalog/src/validation/tests.rs` | The catalogue validation the TypeScript validators only partly cover |
| `core/phomu-conformance/tests/conformance.rs` | That two shells agree |

**This materially changes the priority of QA-TST-004.** The gaps listed there are not gaps in the *product* — they are gaps in the *older of two implementations*. The right reading of the coverage picture is now: **the rules of the game are tested in Rust; the web shell that still ships those rules to the browser is not.** That is another argument for QA-SPO-001's Option A — once the shell consumes the core, the untested TypeScript logic becomes redundant rather than merely untested.

**Recommendation:** when the web shell is migrated onto the Rust core, **delete** the duplicated TypeScript logic (`src/utils/song-picker.ts`, the mode components' own rule logic) rather than porting its tests. Removing a second implementation of a rule is worth more than testing it.

---

## QA-TST-005 — P3 — The E2E suite is a single smoke test

`e2e/smoke.spec.ts` is the only browser-level test. The platform roadmap commits to Android, Google TV, Fire TV, macOS, Linux, iPadOS, iOS and Windows clients; the web shell is the reference implementation, and the six game modes have no browser-level coverage.

**Recommendation:** grow the E2E suite along the **acceptance criteria**, not along the UI. The highest-value browser tests, in order:

1. **A full round in each of the six modes** — lobby → game → question → reveal → score. Six tests, one per mode; they cover the entire mode-component surface.
2. **The spoiler invariant** — start a game, and assert that the song title and artist are absent from `document.body.innerText` and from the accessibility tree before the reveal. This is the automated form of QA-SPO-001/005 and should be the strongest test in the suite.
3. **The projector invariant** — open `/projector` during a question and assert it contains no artist, title or cover.
4. **Keyboard-only play** — complete a round using only `Tab`/`Enter`/`Arrow` keys.

**Accept when:** each of the six modes has an E2E test that plays a round to completion; the spoiler-invariant test fails when the reveal is triggered early.

---

## QA-TST-006 — P3 — The local CI script is the de-facto gate and is not aligned with CI

`scripts/local-ci.sh` runs nine checks; the GitHub CI workflow runs seven. They disagree in both directions: the local script runs `npm audit` (which CI does not) and CI runs the four quality gates individually (the local script does not). The local script also runs `npm run build`, which CI does in a separate job — so a contributor pushing from the hook gets a slower run than CI.

The pre-push hook is also fragile in the way described in QA-REL-003.

**Recommendation:** make `scripts/local-ci.sh` call `npm run check:all` and add the missing checks so that *one* definition of "green" exists, then have CI call the same script. A single source of truth for the gate set removes the whole class of drift.

**Accept when:** `bash scripts/local-ci.sh` and the CI workflow run the identical set of checks, and the list is defined in one place (`package.json` scripts).

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-TST-001 Widen the coverage denominator | **P1** | The report covers `src/**`; the store and mode components appear; a ratcheting threshold is green |
| QA-TST-002 Add E2E, format and audit jobs | **P1** | Three new CI jobs exist and have green runs; `format:check` exits 0 |
| QA-TST-003 Validate the whole catalogue | P2 | `validate-songs` reports ≈1,615 songs; a corrupted song in a non-A1 pack fails CI |
| QA-TST-004 Test the untested pure modules | P2 | `song-picker.ts` and `check-covers.ts` have non-zero coverage |
| QA-TST-005 Grow the E2E suite | P3 | One round-playing test per game mode; a spoiler-invariant test exists |
| QA-TST-006 One definition of green | P3 | Local script and CI run the same check set from one definition |
| QA-TST-004a Retire the duplicated TypeScript rules instead of testing them | P2 | The web shell consumes the Rust core; the duplicate TS rule logic is deleted, not ported |
