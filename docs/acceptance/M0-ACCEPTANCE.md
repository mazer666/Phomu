# Acceptance — M0 (baseline state of the repository)

**Requirement IDs:** NFR-009 (file size gate), NFR-011 (doc link check), I18N-007
(every visible text comes from the translation), CORE-003 (no acceptance based on
stubs), QA-003
**Build/commit:** `d5b6422` (commit subject: `chore(catalog): Phomu-Katalog fortschreitend bereinigt`),
Branch `feature/vocument-style-docs-and-i18n`; at the time of measurement the working tree contains
uncommitted changes from several parallel agents (documentation, i18n, security, UI).
**Tester/agent roles:** QA & Test Engineer (measurement), in parallel: Docs Lead, i18n Engineer,
Security & Privacy Manager
**Date:** 2026-10-25 (measurements between 08:32 and 09:15 UTC, Node v22.19.0, npm 10.9.3)

> **Reading note:** This document is an **honest record of the current state**, not a
> success report. Every statement names its source (command output, test name or
> `file:line`). What was not measured is marked as **"not measured"**, what
> did not run, as **"NOT RUN"** with a reason.

---

## 1. Functional

| Scenario | Expectation | Result | Evidence |
|---|---|---|---|
| Catalog data is structurally valid | `validate-songs` reports 0 errors | **PASS** | `npm run validate-songs` → Exit 0, „✓ All songs are valid!" (tool output, translated from German), 12/12 songs of pack `A1` (log `/tmp/qa-validate-songs.log`) |
| Catalog holds the quality baseline | `validate-catalog` without regression | **PASS** | `npm run validate-catalog` → Exit 0, „✅ Catalog gate passed (no regression against the baseline)" (tool output, translated from German), 135 packs / 1615 songs / 0 schema errors / 126 warnings / 0 duplicate groups |
| Unit tests cover the admin-API hardening | Token, URL, cover and rate-limit negative tests are green | **PASS** | `npm run test` → Exit 0, 10 test files / **97 tests green**, including `src/admin-api/admin-token-guard.test.ts` (10), `src/admin-api/cover-fetch-guard.test.ts` (20), `src/admin-api/admin-routes-hardening.test.ts` (13), `src/admin-api/admin-rate-limit.test.ts` (12), `src/admin-api/security-headers.test.ts` (8) |
| Admin API without token → 401 | Request without a token is rejected | **PASS** | Test `responds without a token with 401` (`src/admin-api/admin-routes-hardening.test.ts`), test `rejects a request without a token (401)` (`src/admin-api/admin-token-guard.test.ts`) — both green |
| Admin API "fail closed" without env variable | 503 instead of open access | **PASS** | Test `fail-closed: without a configured env variable the API responds with 503` (`src/admin-api/admin-token-guard.test.ts`) — green |
| Cover URL protected against SSRF | internal URLs, plaintext, redirects into the internal network are rejected | **PASS** | Tests `rejects an internal URL without fetching it`, `aborts a redirect from the cover host into the internal network` (`src/admin-api/admin-routes-hardening.test.ts`), `aborts a redirect to a plaintext internal metadata address` (`src/admin-api/cover-fetch-guard.test.ts`) — green |
| Cover download with size limit | oversized file is rejected | **PASS** | Tests `rejects an oversized file that declares its own size` / `rejects an oversized file that sends no content-length` (`src/admin-api/cover-fetch-guard.test.ts`) — green |
| Smoke flow across all core pages | Home → Lobby → Game → Game-Over → Browse → Settings | **PASS with limitation** | `npx @playwright/test test e2e/smoke.spec.ts --timeout=120000` → Exit 0, „1 passed (1.0m)", test `smoke flow: home -> lobby -> game -> game-over -> browse -> settings` (53,1 s). With the default timeout setting (30 s, `playwright.config.ts:4`) **FAIL** — see section 8 |
| All visible UI texts come from the translation | no literal text in the JSX | **PASS** | `npm run check:i18n` → Exit 0, „OK — no violations. Literal texts in checked TSX files: 0" (tool output, translated from German), 48 TSX files checked (measurement time 2026-10-25T09:11Z). History: 935 (08:34Z) → 806 → 755 → 461 → 27 → 5 → **0** |

---

## 2. Technical

- **Architecture boundaries respected:** yes — no violation evidenced during the measurement period;
  the layer/dependency direction is described in `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`
  and the documentation follows that description.
- **Central configuration respected:** yes — `src/config/game-config.ts` (326 lines,
  measured with `wc -l`) contains the pack and mode configuration; the file size gate
  classifies it as a "data catalog matter" (`ARCHITECTURE.md`, section after §6.2).
- **TypeScript strict:** yes — `npm run typecheck` → Exit 0, no output (18,5 s).
- **ESLint:** yes — `npm run lint` → Exit 0, **0 errors, 1 warning**
  (`playwright.config.ts:1:1 warning import/no-anonymous-default-export`, 52,6 s).
- **Tests green:** yes — `npm run test` → Exit 0, 10 test files / 97 tests (69,7 s).
  Coverage (`v8`, only `src/utils/**`): `All files 32.33 % Stmts / 34.6 % Branch /
  29.41 % Funcs / 33.77 % Lines`. **The coverage is not representative**, because the
  Vitest configuration only includes `src/utils/**/*.ts` (`vitest.config.ts:11`) —
  `src/components/**` and `src/admin-api/**` do not appear in it.
- **Migration/versioning:** not applicable — no database migration in the repository.
- **New quality gates present and wired up:** yes —
  `npm run check:i18n`, `npm run check:doc-links`, `npm run check:file-size`, `npm run check:all`
  (`package.json`), additionally as the last block in `scripts/local-ci.sh` (block 10).
- **CI present:** yes — `.github/workflows/ci.yml` with 6 jobs
  (Typecheck, Lint, Unit Tests, Catalog Validation, Quality Gates, Build),
  Node 22 pinned, `npm ci` with `cache: npm`, trigger `push` on `main` and `pull_request`.
- **Build:** yes — `npm run build` → Exit 0, „✓ Generating static pages using 1 worker
  (21/21)", 21 static routes, 108,2 s. In the full run `npm run local-ci` is green as well
  („[SUCCESS] Next.js Production Build passed").

### Gate results (measurement time 2026-10-25T09:11Z)

| Gate | Command | Exit | Findings |
|---|---|---:|---|
| i18n completeness | `npm run check:i18n` | **0** | 0 violations, 0 literal texts in 48 TSX files |
| Doc link check | `npm run check:doc-links` | **1** | 3 dead anchors in `REQUIREMENTS.md` (lines 857, 865, 1478) — see section 8 |
| File size | `npm run check:file-size` | **0** | 0 errors, 7 warnings, 7 documented legacy files over 550 lines |

The collective call `npm run check:all` (`scripts/check-all.mjs`) runs all three gates and
summarizes: `[PASS] i18n-Vollständigkeit`, `[FAIL] Doku-Linkcheck`, `[PASS] Dateigröße`
→ Exit 1.

#### Cross-check with an independent scanner

The i18n worker delivered a second, regex-based counter with
`scripts/count-ui-literals.mjs`. Comparing both tools (state 2026-10-25 ≈ 09:10 UTC) shows
that no finding of one tool goes unnoticed in the other:

| Finding (`count-ui-literals.mjs`, 16 findings) | reported by the `check:i18n` gate? | Reason for the deviation |
|---|---|---|
| `PRIVACY.md`, `SECURITY.md` in `terms/page.tsx` and `privacy/page.tsx` (4) | **yes** | visible link text → must be translated |
| `Sunset`, `Phomu Blue`, `Neon Purple`, `Gold Rush`, `Emerald`, `Cyber Pink` (6) | no | color definitions `{ name, value: '#hex' }` — only `value` is rendered (`src/app/lobby/page.tsx:649-658`) |
| `YouTube`, `Spotify`, `Spotify Free`, `Amazon Music` (4) | no | proper names per CONTRACT §5 ("proper names stay identical in both languages", translated from German) |
| `US` (1) | no | ISO 3166 code (identifier) |
| `timeline, hint-master, ...` (1) | no | identifier list (format example) |
| — | **yes**: `L` (`src/app/admin/review/page.tsx:229`) | not captured by the regex counter, because its JSX text rule does not allow curly braces (`scripts/count-ui-literals.mjs:98`) |

The exception list of the gate is thus tightly scoped: every German or English sentence,
every visible file name and every label remains a violation.

**State 09:11Z:** The 5 findings still open at the time of comparison (1× `L`,
4× `PRIVACY.md`/`SECURITY.md`) were migrated in parallel; `npm run check:i18n` reports
**0 violations** since 09:11Z (Exit 0). The table above remains as evidence of the
mode of operation of the gate and its delimitation against the independent counter.

### File size inventory (measured, `wc -l`)

7 files above the hard maximum of 550 (documented exceptions in
`scripts/check-file-size.mjs`, inventory in `ARCHITECTURE.md` §6.1, backlog in
`REQUIREMENTS.md` GAP-007):

| File | Lines | Over 550 by |
|---|---:|---:|
| `src/app/lobby/page.tsx` | 801 | +251 |
| `src/app/admin/review/page.tsx` | 769 | +219 |
| `src/stores/game-store.ts` | 640 | +90 |
| `src/components/game/MusicPlayer.tsx` | 641 | +91 |
| `src/components/game/RevealPhase.tsx` | 596 | +46 |
| `src/components/game/modes/TimelineMode.tsx` | 573 | +23 |
| `src/app/browse/page.tsx` | 575 | +25 |

Three more files between 401 and 550 lines (`src/utils/validate-song-data.ts` 502,
`src/app/game/page.tsx` 468, `src/app/admin/songs/page.tsx` 461) — reported by the gate
as a warning. `src/data/songs/index.ts` (297 lines) is detected as a generated file and
skipped (header comment „Auto-generated … Do not edit it manually").

---

## 3. Performance

| Metric | Budget | Measured | Result |
|---|---:|---:|---|
| `npm run typecheck` | — | 18,5 s | Baseline |
| `npm run lint` | — | 52,6 s | Baseline |
| `npm run test` (10 files / 97 tests) | — | 69,7 s | Baseline |
| `npm run build` (Next.js 16, static export) | — | 108,2 s | Baseline |
| `npm run local-ci` (full run) | — | 181,9 s | Baseline (1 block red, see below) |
| `npm run validate-catalog` | — | 1,7 s | Baseline |
| App load time in the browser | — | **not measured** | No Lighthouse, no bundle analysis run, no device comparison |
| Bundle size (JS/CSS) | — | **not measured** | `next build` does not output bundle sizes (Turbopack) |
| Time to interaction | — | **not measured** | — |
| Admin API response time | — | **not measured** | — |

Reference environment: container on a network filesystem (`/run/csi/mount-root/nas/...`).
Playwright reports for this: „⚠ Slow filesystem detected. The benchmark took 2629ms"
(`/tmp/qa-e2e-2.log`). **All times are therefore only valid for this container** and
are no reference for end devices.

---

## 4. Usability

- **Number of steps for the common path:** not measured — no usability test performed.
- **Discoverability:** not measured.
- **Mobile/native behavior:** not measured — the E2E smoke test ran in the
  default desktop viewport size (Playwright default 1280×720), no touch emulation,
  no device check (375 px / 768 px / 1920 px).
- **Visual polish:** not measured — no screenshot evaluation in this round
  (`npm run screenshot:settings` was not run).
- **Language switch DE/EN:** **partially evidenced** — the language switch is present in the code
  (`src/components/ui/LanguageSwitcher.tsx`), the label `DE`/`EN` is
  accepted by the i18n gate as an identifier (ISO code); no click test exists.

### Accessibility

- **Keyboard:** not measured — no keyboard navigation test.
- **Screen readers (VoiceOver/TalkBack):** not measured.
- **Scaling / contrast:** not measured — no contrast calculation.
- **Positively evidenced:** the security headers check the camera permission and the
  CSP directives (`src/admin-api/security-headers.test.ts`, tests
  `allows the camera only on its own origin (QR scanner)`, `sets a CSP with all
  expected directives`, `contains no wildcard and no unsafe object-src` — green).
  This is an indication of A11y hardening, **but not A11y evidence**.

---

## 5. Security/Privacy

- **Newly stored user data:** none — the changes checked store no
  personal data. The catalog (`src/data/songs/*.json`) contains song metadata,
  no user data.
- **Network access:** the admin cover route calls external cover hosts; the
  host allowlist, the ban on plaintext HTTP, the abort logic on redirects into the
  internal network as well as the file size limit are evidenced by tests
  (`src/admin-api/cover-fetch-guard.test.ts`, 20 tests green).
- **Negative tests (required hardening):**
  - Admin token: `src/admin-api/admin-token-guard.test.ts` — 10 tests, including
    `rejects a request with a wrong token (401)`,
    `rejects a token with only one correct character (401)`,
    `fail-closed: a too short token responds with 503`,
    `limits brute-force attempts per client (429 after 10 failed attempts)`,
    `keeps the token value out of responses and logs`,
    `compares the token with timingSafeEqual instead of ===`.
  - URL validation: `src/admin-api/cover-fetch-guard.test.ts` — 20 tests (host allowlist,
    subdomains, `localhost`, internal addresses, `file:`/`data:`/`javascript:`, SSRF redirects).
  - Cover upload/download: `rejects an oversized file that declares its own size`,
    `rejects an oversized file that sends no content-length`,
    `rejects a response that is not an image`, `aborts with 502 on an HTTP error`.
  - Catalog validation: `src/utils/validate-song-data.test.ts` (8 tests) and
    `src/utils/validate-song-limits.test.ts` (13 tests, including `reports an unknown
    game mode`, `keeps the current catalog valid`).
  - Rate limit: `src/admin-api/admin-rate-limit.test.ts` — 12 tests, including
    `limits the number of stored keys (no unbounded growth)`,
    `uses the first address from x-forwarded-for`, `counts rejected requests as well`.
- **Threat model:** `SECURITY.md` (present in the repository, not re-checked within the scope of
  this measurement).
- **Privacy:** `PRIVACY.md` — **NOT RUN**: the file does not exist at the time of measurement,
  although 6 links point to it (`README.md:132`, `README.md:163`, `CONTRIBUTING.md:137`,
  `QUALITY.md:116`, `LLM.md:117`, `docs/README.md:78`).

---

## 6. Interoperability / data integrity

- **External media sources (YouTube, Spotify, Amazon) with broken links:** **NOT RUN** —
  no test exists that verifies a provider outage with fallback to the next source.
  The provider extraction is only tested for Amazon ASINs
  (`src/components/game/MusicPlayer.test.ts`, 7 tests, including
  `prefers trackAsin over the album path`).
- **QR card outside the app:** **partially evidenced** — the QR target resolution is tested
  (`src/utils/qr-intent.test.ts`, 4 tests: `parses a player tag`, `parses a pack intent`,
  `parses a session intent`, `marks legacy song links as unsupported`); no test with a
  printed/external medium exists.
- **Print layout / reference printer:** **NOT RUN** — no print test performed.
- **Without cookies/account/cloud:** **not measured** — the static export builds green,
  but offline operation was not checked.
- **Recovery/storage integrity:** **not measured**.

---

## 7. Documentation

- **Requirements with ID, rationale, acceptance and verification:** `REQUIREMENTS.md`
  present (target state per the file; not fully cross-checked within the scope of
  this measurement).
- **Every relative link resolves:** **PASS** (state 2026-10-25, after the fix) —
  `npm run check:doc-links` → Exit 0, 0 dead links in 57 Markdown files.
  Previously FAIL with 3 dead anchors in `REQUIREMENTS.md`:
  - `REQUIREMENTS.md:857` → `#open-gaps` (the heading is called "# Open gaps",
    the anchor slug is `open-gaps`) — **fixed**
  - `REQUIREMENTS.md:865` → `#open-gaps` (identical) — **fixed**
  - `REQUIREMENTS.md:1478` → `#game-006--ein-kern-sechs-klar-getrennte-spielmodi`
    (the document contains `### GAME-006 — Points never go negative`, `REQUIREMENTS.md:176`) —
    **fixed**, the reference now points to `CORE-006` (`REQUIREMENTS.md:74`)
- **Documentation updated in the same change step:** not applicable — in this round
  no commit was created (working rule: no commit/push).

---

## 8. Known limitations

| # | Gap | Evidence | Impact |
|---|---|---|---|
| L1 | ~~Five visible literal texts are not migrated~~ **— closed on 2026-10-25T09:11Z**: `npm run check:i18n` → Exit 0, 0 literal texts in 48 TSX files. History of the measurement: 935 → 806 → 755 → 461 → 27 → 5 → 0 | `npm run check:i18n` (log `/tmp/qa-final-i18n.log`) | i18n gate green |
| L2 | ~~Two dead anchors `#offende-lücken` in `REQUIREMENTS.md`~~ **— closed on 2026-10-25**: the anchors are now `open-gaps` (heading `# Open gaps`, `REQUIREMENTS.md:1516`) | `npm run check:doc-links` → Exit 0, 0 dead links in 57 Markdown files | closed |
| L3 | ~~One dead anchor `#game-006--ein-kern-sechs-klar-getrennte-spielmodi` in `REQUIREMENTS.md`~~ **— closed on 2026-10-25**: the reference now points to `CORE-006` (`REQUIREMENTS.md:74`), the actual requirement | `npm run check:doc-links` → Exit 0 | closed |
| L4 | 7 source files above the maximum of 550 lines | `npm run check:file-size` → 7 „bekannte Altlasten"; inventory `ARCHITECTURE.md` §6.1 | Gate reports, does not block (documented exception, GAP-007) |
| L5 | ~~The E2E smoke test fails with the default timeout (30 s)~~ **— closed on 2026-10-25**: `playwright.config.ts` now sets `timeout: 120_000`; the run passes in 21,7 s | `npm run test:e2e:smoke` → 1 passed | closed |
| L6 | The coverage measures only `src/utils/**` | `vitest.config.ts:11` (`include: ['src/utils/**/*.ts']`) | 32,33 % total coverage are not representative for the app |
| L7 | ~~`PRIVACY.md` does not exist, 6 links point to it~~ **— closed on 2026-10-25**: `PRIVACY.md` is present, all 6 references resolve | `npm run check:doc-links` → Exit 0 | closed |
| L8 | Prettier formatting is not complied with (38 files) | `npm run format:check` → `[warn]` list in `/tmp/qa-local-ci.log`; not blocking in `local-ci` | Formatting drift |
| L9 | No performance, usability or accessibility measurement | Sections 3 and 4 | Dimensions 3 and 4 of the acceptance are unevidenced |
| L10 | The E2E test is not included in the CI | `.github/workflows/ci.yml` contains 6 jobs, none runs Playwright | Browser regressions become visible only after the merge |
| L11 | `npm audit --omit=dev --audit-level=moderate` is only locally part of `local-ci`, not in the CI | `scripts/local-ci.sh` (block 8) vs. `.github/workflows/ci.yml` | Dependency gaps are not checked with every PR |

---

## 9. Decision

**NOT ACCEPTED** — in accordance with `QUALITY.md` §9 ("at least one gate not fulfilled —
with rationale and open gap").

**Rationale (evidenced):**

1. The doc link check gate is red: `npm run check:doc-links` → Exit 1 with 3 dead
   anchors in `REQUIREMENTS.md` (L2, L3). A gate that is red is, per
   `QUALITY.md` §10.6, not evidence.
2. `npm run test:e2e:smoke` is red with the default configuration (L5). The smoke test
   is only green with an increased timeout — that is not a green acceptance, but a
   correction of the test configuration, which is the owner's responsibility.
3. The dimensions performance, usability and accessibility are **not measured**
   (L9). `QUALITY.md` §10.5: "An incomplete report is an error, not a
   partial success."

**What is measured green and explicitly not in question:**

- `npm run typecheck` → Exit 0
- `npm run lint` → Exit 0 (1 warning, 0 errors)
- `npm run test` → Exit 0, 97/97 tests green (10 test files)
- `npm run build` → Exit 0, 21/21 static pages
- `npm run validate-songs` / `npm run validate-catalog` → Exit 0
- `npm run check:i18n` → Exit 0 (0 literal texts in 48 TSX files)
- `npm run check:file-size` → Exit 0 (0 errors)
- `npm audit --omit=dev --audit-level=moderate` → Exit 0 (in the `local-ci` run)
- All three gates are **negatively tested** (violation → red → rollback → green);
  the evidence is in the handover document `/workspace/workers/qa-deliverable.md`.

**Path from "NOT ACCEPTED" to "ACCEPTED" (effort for the owner):**

1. `REQUIREMENTS.md:857`, `:865` → correct the anchor to `#open-gaps`.
2. `REQUIREMENTS.md:1478` → correct the anchor to the real GAME-006 anchor.
3. `playwright.config.ts:4` → raise the timeout to ≥ 60 s **or** switch the web server to
   `next build && next start`; afterwards re-provide evidence for `npm run test:e2e:smoke`.
4. `vitest.config.ts:11` → extend the coverage to `src/**` so that the coverage figure
   is representative.
5. Optional: add an E2E job and `npm audit` to `.github/workflows/ci.yml`.

If 1–2 are done, the technical acceptance of this state is **ACCEPTED WITH LIMITS**
(L4–L11 remain open).
