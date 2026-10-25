# Quality Goals — "Best in Class"

"Best in Class" here is **a measurement standard, not a marketing promise**. Every
goal names a target value, a measurement method and the current state. What was not
measured is marked as **"not measured"** — an estimated number would be worse than
no number.

**State of the measurements:** 2026-04 (branch `feature/vocument-style-docs-and-i18n`).
All values below come from commands that run in the repository; the command is given
with every goal.

**The separation:** The *requirement* (what the project aims for) is in
[`../REQUIREMENTS.md`](../REQUIREMENTS.md) and [`../QUALITY.md`](../QUALITY.md). The
*measurement* (what is true today) is here. Both belong together and are maintained in
the same commit.

---

## 1. Start time

| | |
|---|---|
| **Target value** | First Contentful Paint ≤ 1.5 s on a mid-range smartphone over WLAN; Largest Contentful Paint ≤ 2.5 s |
| **Measurement method** | Lighthouse (Performance) against the static export `out/`, mobile simulated, mean of 5 runs; in addition the manual timestamp of the first visible card |
| **Current state** | **not measured** — there is no performance measurement in the repository, neither a Lighthouse run nor a web-vitals capture |

**Why this is still open:** The app is a static export without a server. For a
reliable number you need a repeatable setup (fixed file size, fixed device emulator,
five runs). The first candidate for the bottleneck is the catalog chunk — see
section 3.

---

## 2. Round transition latency

| | |
|---|---|
| **Target value** | The switch from "draw card" to "question visible" ≤ 500 ms; the switch from "reveal" to the next round ≤ 300 ms |
| **Measurement method** | Timestamps in `performance.now()` around `advancePhase()`, median over 50 rounds of a test game with 6 players |
| **Current state** | **not measured** — the code contains no time measurement, and the phase is animated in `src/app/game/page.tsx` via `AnimatePresence` with a 0.3 s transition (constant `PHASE_VARIANTS`, `transition: { duration: 0.3 }`) |

**Expected bottleneck:** The music player stays mounted across the reveal transition
(`src/app/game/page.tsx`, `display: none` instead of unmount) so that the YouTube
iframe does not restart. That is intentional, but it costs time on the first build of
the iframe in every round.

---

## 3. Bundle size

| | |
|---|---|
| **Target value** | JavaScript total ≤ 1.5 MB unpacked **and** ≤ 600 KB gzipped; largest single chunk ≤ 800 KB unpacked; static export total ≤ 20 MB |
| **Measurement method** | `npm run build`, then `find .next/static/chunks -name "*.js" -printf "%s\n"` (sum) and `cat .next/static/chunks/*.js \| gzip -c \| wc -c`; export size via `du -sh out` |
| **Current state** | **4,425,934 bytes (4.22 MiB) unpacked / 1,304,143 bytes (1.24 MiB) gzipped** in 32 chunks; **largest single chunk 2,845,675 bytes (2.71 MiB) / 840,841 bytes gzipped**; **static export 147 MB**, of which 142 MB are cover images (1,649 files in `out/covers`) and 4.5 MB `out/_next` |

**Fulfilled:** no. Neither the 1.5 MB unpacked nor the 600 KB gzipped nor the 20 MB
total export is reached.

**Known cause:** The catalog (1,615 songs) lies as JSON in the bundle and is loaded
into the client at start-up. The 2.71 MiB chunk is exactly this data block. Anyone
who wants to reduce the size must take the catalog out of the initial bundle (load
per pack, web worker parsing or a leaner start manifest) — **not** the cover images:
those are static files and cost no JavaScript transfer, only download time.

**Secondary finding:** 1,649 cover images at 142 MB give an average of about 86 KB per
image. For the export that is acceptable; for the first download of a pack it is the
actual timing question.

---

## 4. i18n completeness

| | |
|---|---|
| **Target value** | `de.json` and `en.json` are completely parallel (same keys, no empty values), **0** literal texts in the JSX, `html lang` follows the selected language |
| **Measurement method** | `npm run check:i18n` (`scripts/check-i18n-completeness.mjs`) |
| **Current state** | **Keys: 25 in `de.json`, 25 in `en.json`, parallel, 0 empty values** — fulfilled. **Literal texts: 465 violations in 47 checked `.tsx` files** (`TOTAL: 465 violations, 465 literal texts` — tool output, translated from German) — not fulfilled. The migration is running, the value is falling; at the first measurement of this document it was 624 and is therefore **a snapshot**, not a final state. **Files with `useTranslation()`: 4** (`src/app/page.tsx`, `src/components/ui/NavBar.tsx`, `LanguageSwitcher.tsx`, `ThemeSwitcher.tsx`). **Language coupling:** The server-rendered HTML bakes in German (`<html lang="de">`, title from `de.json`, `src/app/layout.tsx`); the navigation bar sets `document.title` and `document.documentElement.lang` client-side to the active language (`src/components/ui/NavBar.tsx:43-44`) |

**What the gate does not cover yet:** The page title and the description in
`src/app/layout.tsx` are **baked server-side from `de.json`** — the static export
therefore always serves the German version. That is acceptable as long as the client
catches up; the navigation bar sets title and `lang` correctly. A **metadata
snippet** (OG image, description) stays English, because it cannot be generated per
language in the static export.

---

## 5. Contrast

| | |
|---|---|
| **Target value** | All visible texts and controls reach at least **WCAG 2.1 AA**: 4.5:1 for body text, 3:1 for large type and controls; every theme checked separately |
| **Measurement method** | `axe-core` (browser extension or Playwright) across the routes `/Phomu`, `/Phomu/lobby`, `/Phomu/browse`, `/Phomu/game`, `/Phomu/projector`, each in the lightest and in the darkest theme (`jackbox`, `musicwall`) |
| **Current state** | **not measured** — there is no contrast check in the repository, no axe setup and no documented contrast ratios |

**Known risk spots** (read from the code, not measured): In the mode components,
texts with low opacity are displayed on a coloured background, for example
`opacity-40` and `opacity-30` on `--color-accent`
(`src/components/game/modes/HintMasterMode.tsx`). Opacity reduces the contrast
arithmetically — that has to be measured, not estimated.

---

## 6. Keyboard operation

| | |
|---|---|
| **Target value** | Every game mechanic is operable without a mouse; visible focus on all controls; touch targets ≥ 44 px in height |
| **Measurement method** | Manual traversal of every route with `Tab`/arrow keys/`Enter`; in addition `grep -rn "addEventListener('keydown'" src` and `grep -rho "min-h-\[44px\]" src --include=*.tsx \| wc -l` |
| **Current state** | **Keyboard listeners: 1** (`src/components/game/modes/TimelineMode.tsx`, choose numbers 1–n, arrow keys move, `Enter`/`space` confirms). **Touch targets with `min-h-[44px]`: 4 files** (`QuestionPhase.tsx`, `modes/SurvivorMode.tsx`, `lobby/ModeSelector.tsx`, `lobby/PackSelector.tsx`) — the remaining controls set the height via padding. **`focus:ring-2`: 16 hits**, of which **0** `focus-visible:` — so the focus ring also appears on mouse clicks. **No `role=` attribute** in the whole of `src/` |

**Fulfilled:** no. The timeline is fully keyboard-operable, the other five modes are
not. That is the most important reachable gap, because it affects an entire game
mechanic.

---

## 7. Error handling

| | |
|---|---|
| **Target value** | Every error case has a visible, named message and no crash; **0** unhandled errors in normal operation; every hardening has a negative test |
| **Measurement method** | `grep -rc "catch" src --include=*.ts --include=*.tsx`; manual error cases (no network, broken song, missing token, blocked audio) against the checklist in [`guides/TROUBLESHOOTING.md`](guides/TROUBLESHOOTING.md) |
| **Current state** | **12 files with `catch` blocks.** The admin API answers protected: **503** on missing or too short configuration (`ADMIN_API_TOKEN` < 32 characters), **401** on a wrong token, timing-constant comparison via SHA-256. The answers of the admin API are proven by negative tests, but the endpoints themselves are **not registered in the delivered build** (`SECURITY.md` §5, item 1). In the game the following are named: "No songs available. Please check your song pack." (key `game.drawing.noSongsError`, `src/components/game/DrawingPhase.tsx`), "Video broken? Roll again" (key `game.question.reroll`, `src/components/game/QuestionPhase.tsx`), "The camera could not be initialized." (key `game.qr.cameraError`, `src/components/game/QRScannerModal.tsx`), "Audio is blocked by your browser. Please tap play." (translated in `src/i18n/locales/de.json`) |

**Gap:** The browser's autoplay blocker is swallowed **silently**:
`void audio.play().catch(() => { … })` in `src/components/game/MusicPlayer.tsx`
(lines 399 and 412) — the player sees no hint that they have to start it themselves.
A visible text for this is **not yet** in place: the key `errors.audioBlocked`
provided for in `CONTRACT.md` §5.2 is not yet in
`src/i18n/locales/de.json`.

---

## 8. Catalog quality

| | |
|---|---|
| **Target value** | **0** schema errors, **0** forbidden duplicates, **0** missing years between 1950 and the current year, **0** spoilers in the hints; warnings only as a hint, not as an error |
| **Measurement method** | `npm run validate-catalog` (gate against the baseline) and `npm run validate-songs` (schema per file) |
| **Current state** | **1,615 songs** in 135 JSON files. **0** schema errors, **126** schema warnings, **0** duplicate groups, **4** allowed duplicates (allowlist), **0** ignored secondary duplicates, **0** missing years 1950–2026. In addition: `npm run validate-songs` checks by default **only `src/data/songs/A1.json`** (12 songs, valid) — the catalog gate is the only thing that checks the remaining 134 files |

**Open:** The 126 schema warnings are not broken down. Which field rule triggers them
does not emerge from the gate output; anyone who wants to resolve them needs the
report (`npm run validate-catalog:report` →
`specifications/catalog_issues_report.json`).

---

## 9. Test coverage

| | |
|---|---|
| **Target value** | ≥ 80 % line coverage across `src/`, **every** core logic (`song-picker`, `qr-intent`, `game-store`, `censor-utils`, `ai-task-queue`) with a unit test, an E2E test that checks the core journey **by content** (not only the URL) |
| **Measurement method** | `npm run test` (Vitest with v8 coverage); coverage threshold in `vitest.config.ts` |
| **Current state** | **23.29 % statements, 28.40 % branches, 21.05 % functions, 24.94 % lines** across all measured files. **4 test files, 21 tests**, all green: `src/utils/validate-song-data.test.ts` (8), `src/components/game/MusicPlayer.test.ts` (7), `src/utils/qr-intent.test.ts` (4), `src/utils/ai-task-queue.test.ts` (2). **0 tests** for `song-picker.ts`, `censor-utils.ts`, `feedback-messages.ts`, `game-store.ts` and **0 tests** for all React components except `MusicPlayer` |

**Fulfilled:** no, clearly not. Two concrete gaps:

1. **The score calculation is untested.** Neither `PHOMU_CONFIG.HINT_MASTER_POINTS`
   nor the mode score logic nor the time decay calculation in
   `src/app/game/page.tsx` has a test.
2. **The E2E smoke test checks URLs, not the application.**
   `e2e/smoke.spec.ts` navigates to `'/'`, `'/lobby'`, `'/game'`, `'/game-over'`,
   `'/browse'`, `'/settings'` — **without** the base path `/Phomu`. These paths
   return HTTP 404. The assertions only check the URL pattern, which is why the
   test is green although not a single page was loaded.

**Correction of the smoke test** (one line plus a content assertion):

```ts
await page.goto('/Phomu/');
await expect(page.getByRole('heading', { name: 'Phomu' })).toBeVisible();
```

---

## 10. Other gates that are measurable today

| Goal | Target value | Current state | Command |
|---|---|---|---|
| TypeScript strict | 0 errors | **green** | `npm run typecheck` |
| ESLint | 0 errors | **0 errors, 1 warning** (`playwright.config.ts`, anonymous default export) | `npm run lint` |
| Formatting | Prettier without deviations | non-blocking, part of `local-ci` | `npm run format:check` |
| Production build | Build runs through | **green** (static export to `out/`) | `npm run build` |
| Dependency audit | 0 findings from "moderate" upwards | part of `local-ci` | `npm audit --omit=dev --audit-level=moderate` |
| File size of the source files | ≤ 550 lines, soft limit 400 | **Gate result: 0 errors, 6 warnings, 4 documented legacy files.** 7 files are above the hard limit of 550: `src/app/lobby/page.tsx` (801), `src/components/game/RevealPhase.tsx` (671), `src/stores/game-store.ts` (640), `src/components/game/MusicPlayer.tsx` (630), `src/components/game/modes/TimelineMode.tsx` (579), `src/app/admin/review/page.tsx` (760), `src/app/browse/page.tsx` (575) | `npm run check:file-size` |
| Scope of `src/` | — | 85 checked source files | `npm run check:file-size` |

---

## 11. What has to be measured next

By urgency, measured as the distance to the target value:

1. **Contrast** (section 5) — the largest unchecked gap with a direct effect on
   playability. One `axe` run across five routes in two themes is enough.
2. **Test coverage of the score calculation** (section 9) — the core mechanic of the
   game is untested.
3. **E2E with base path and content assertion** (section 9) — the smoke test currently
   checks nothing.
4. **Start time and round transition** (sections 1 and 2) — need a measurement
   environment that does not exist yet.
5. **Bundle** (section 3) — the catalog delivery is the lever; every other
   optimisation barely moves the 4.22 MiB.
