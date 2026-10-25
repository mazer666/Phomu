# QA-09 — Remediation Backlog

**Date:** 2026-10-25
**Scope:** Every finding from this audit, converted into an ordered, executable plan.
**How to use it:** work the phases in order. Each item names the finding it closes, the concrete change, the effort, and the acceptance criterion that proves it is done.

---

## Effort summary

| Stage | Content | Items | Effort | Blocking |
|---|---|---|---|---|
| **0 — Recover** | The branch and the install | 2 | ~1 h | Release |
| **1 — Close the blockers** | Spoilers, lyrics, headers, admin API, coverage, CI | 8 | 5–7 d | Public beta |
| **2 — Best-in-class core** | File-size gate (incl. Rust), Rust adoption by the shell, accessibility, catalogue localisation, hosting, licence | 10 | 9–13 d | v1.0 |
| **3 — Excellence** | Documentation gates, performance budgets, E2E depth, license polish | 7 | 4–6 d | v1.0 |

**Total:** 28 items covering 50 findings, roughly **18–26 working days** including verification.

The single highest-leverage decision is **the hosting model** (Stage 2, item 6). Moving from GitHub Pages to a host that can serve headers *and* run API routes fixes QA-SEC-001, QA-SEC-002 and QA-SPO-001 together. Everything else is independent of it.

---

## Stage 0 — Recover (do this first, today)

> The reform commits are unreferenced and eligible for GitHub's garbage collection. **Nothing else matters until they are preserved.**

### 0.1 — Preserve the orphaned state · closes QA-REL-001 · ~10 min

```bash
git fetch origin 9639c762b544b58d187b9b80e409357a685a34c7
git tag -a recovery/9639c762 9639c762b544b58d187b9b80e409357a685a34c7 \
  -m "Recovery point: English documentation + multi-platform specification (pre-force-push main)"
git push origin recovery/9639c762
```

**Accept:** `git ls-remote --tags origin` shows `recovery/9639c762`.

### 0.2 — Restore `main` · closes QA-REL-001 · ~20 min

1. Compare and choose a target:
   ```bash
   git diff 9639c762 9e0a246 --stat -- src/data/   # does the link commit add value?
   ```
2. Restore (option a — simplest):
   ```bash
   git push --force-with-lease=main:9e0a2461feb5700e824497dd84ca29367b582bac \
     origin 9639c762:refs/heads/main
   ```
   or option b — keep the link work: cherry-pick it onto `9639c762` and push that.
3. **Then** enable branch protection on `main`: require a PR, require the six CI status checks, require linear history, and **do not allow bypassing**.
4. Re-run the Pages deploy and confirm the live site serves the restored build.

**Accept:** `main` contains `docs/`, `project/`, `REQUIREMENTS.md` and `.github/workflows/ci.yml`; `git diff --stat main 9639c762` shows no reform-related differences; a force-push PR to `main` is rejected.

### 0.3 — Restore `npm ci` · closes QA-REL-002 · ~20 min

```bash
npm uninstall youtube-search-without-api-key
```

The four consuming scripts (`scripts/fix-links.js`, `scripts/fix-youtube-links.js`, `scripts/debug-search.js`, `scripts/test-providers.js`) are manual maintenance utilities. Add a one-line comment to each:

```js
// NOTE: needs `npm i -D youtube-search-without-api-key` — the package was
// withdrawn from the npm registry on 2026-10-25. `ytsr` covers the same need.
```

**Accept:** `rm -rf node_modules && npm ci` exits 0 on a clean checkout.

---

## Stage 1 — Close the release blockers

### 1.1 — Stop shipping the answer key · closes QA-SPO-001 · ~3 d

> **The fix already exists in the repository.** The Rust base (`be984cdc5`) ships `core/phomu-core/tests/anti_spoiler.rs` — a per-mode contract that the question payload contains no title, no year and no artist — plus a `RoundView` facade whose question view has **no field for the solution**, plus `platform/phomu-wasm` bindings. The web shell does not use any of it. This item is therefore a **wiring** task, not a greenfield API.

**The change:** make the web shell consume the Rust core's question view model.

- Build the WASM artefact of `platform/phomu-wasm` and load it in the shell (a static asset — `output: 'export'` survives).
- Replace the `song` prop in the question phase with the core's question view model. **Delete `songTitle` / `songArtist` from the question phase entirely** — the type must not have a field that could carry the answer.
- Move the catalogue data out of the JavaScript bundle: the shell receives a song **data file**, not bundled catalogue logic, and the *answers* never reach it.
- Remove the catalogue import from every client component (item 2.4 keeps it from coming back).

**Accept:**
```bash
grep -c '"lyrics":' out/_next/static/chunks/*.js    # all zero
grep -c '"hints":'  out/_next/static/chunks/*.js    # all zero
grep -rc 'A Tribe Called Quest' out/_next/static/chunks/ | grep -v ':0'   # no titles
```
plus a TypeScript type-level test that the question view model has no solution field — the same guarantee `anti_spoiler.rs` gives the Rust side.

### 1.2 — Move the lyrics option selection server-side · closes QA-SPO-007 · ~1 d

**The change:** the round API must not send `lyrics.real` / `lyrics.fake` to the client for Lyrics Labyrinth. It selects the fake line and returns the four rendered options; the `isFake` flag never leaves the server.

Measured justification: the bundle currently ships 4,491 real and 1,497 fake lyric lines, so the mode — "spot the fabricated line" — is fully solvable offline. For 590 of the 1,497 songs the real lyrics contain a token of their own title.

**Accept:** no client chunk contains a `lyrics` object with a `fake` field; an E2E test in Lyrics Mode asserts the four on-screen options cannot be classified from any client-side data.

### 1.3 — Rename the covers · closes QA-SPO-002 · ~1 d

```bash
# For each cover, derive an opaque name from the song id.
# 2000s-britney-toxic.jpg → 8f3a1c9e2b.jpg
```

Keep the descriptive name only in the **print sheet** for the physical QR cards (`PRINTING_GUIDE.md`).

**Accept:** `ls out/covers | grep -c -- '-'` is 0; `grep -r "britney" out/` returns nothing.

### 1.4 — Test the censoring · closes QA-SPO-003 · ~0.5 d

> **Calibration:** measured against the real catalogue, only **3 of 7,785 hints** contain the artist or a distinctive title token — the censoring is a safety net, not the main defence, and it has a small blast radius today. It is still worth closing (pure function, no dependencies, permanent guarantee) but it is **not** a release blocker; items 1.1 and 1.2 are.

Create `src/utils/censor-utils.test.ts` with, at minimum: the artist token replaced, the title token replaced, a short artist from `EXCEPTIONS` censored, stopwords preserved in titles, case-insensitivity, multi-word artists censored before their fragments, and the invariant test:

```ts
it('never leaves an artist or title token in the hint', () => {
  const result = censorHint(hint, artist, title);
  for (const token of [artist, title].flatMap(t => t.split(/\s+/))) {
    expect(result).not.toMatch(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});
```

**Accept:** `censor-utils.ts` shows a non-zero coverage figure and the invariant test passes.

### 1.5 — Deliver the security headers · closes QA-SEC-001 · ~1 d (host-dependent)

Move to a host that sets headers (Cloudflare Pages recommended — see item 2.6) and create `public/_headers` with the same values as `next.config.ts`. Generate one from the other so they cannot drift, and add a CI parity check.

**Accept:** `curl -sI https://<host>/Phomu/` returns all eight headers; **F-05** is closed in `SECURITY.md` with the new host named.

### 1.6 — Decide the admin API's fate · closes QA-SEC-002 · ~1 d

Either wire it up (requires the server from 1.1) or delete `src/admin-api/` plus its five test files and the admin routes. **Do not leave it half-wired.** Record the decision as a CR in `docs/cr/` and update `REQUIREMENTS.md` and `project/project.yaml` to match.

**Accept:** the admin API is reachable from the admin UI and tested against a live path, **or** it no longer exists and no document claims it.

### 1.7 — Fix the coverage denominator · closes QA-TST-001 · ~1 d

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/data/**', 'src/i18n/types.ts'],
  thresholds: { lines: 40, functions: 35, branches: 30, statements: 40 },
}
```

Set the thresholds **below** the true measured value — measure first, then ratchet up. Add `jsdom` for the component tests.

**Accept:** the report covers `src/**`; `game-store.ts` and the mode components appear; the gate is green.

### 1.8 — Complete the CI pipeline · closes QA-TST-002 · ~1 d

Add three jobs: **e2e** (Playwright smoke + artifact upload), **format** (`npm run format:check`), **dependency-audit** (`npm audit --omit=dev --audit-level=moderate`).

Order matters for the formatter: format the repository module by module, with `typecheck && lint && test` green after each module, **then** switch the CI job on. Adding a red format job first gets it disabled.

**Accept:** all three jobs exist and have green runs; `npm run format:check` exits 0.

---

## Stage 2 — Best-in-class core

### 2.1 — Make the file-size gate able to fail · closes QA-ARC-001 · ~0.5 d

Split the gate into two channels:

- **New file over 400 lines → error (exit 1).**
- **Known legacy file that grew beyond its recorded state → error (exit 1).**
- **Known legacy file at or below its state → warning**, with the GAP-007 note.
- **Known legacy file that shrank → success**, and the recorded state is updated downward automatically.

**Accept:** growing a legacy file turns the gate red; adding a new 450-line file turns it red; both proven by a red/green negative test.

### 2.2 — Split the six oversized files · closes QA-ARC-002 · ~4 d

In this order (highest correctness risk first, not highest line count first):

| # | File | Lines | Split | Why first |
|---|---|---|---|---|
| 1 | `modes/TimelineMode.tsx` | 680 | `timeline-logic.ts` (pure) + view | Hardest state; pure functions become testable |
| 2 | `game/RevealPhase.tsx` | 697 | transition logic + presentation | The spoiler boundary lives here |
| 3 | `game/MusicPlayer.tsx` | 783 | one provider adapter per provider | Per-provider testing; one place for the no-title rule |
| 4 | `app/lobby/page.tsx` | 1,050 | lobby / mode-selection / shell | Already has `ModeSelector`, `PackSelector`, `PlayerCard` to compose |
| 5 | `utils/validate-song-data.ts` | 817 | schema / limits / catalog | `validate-song-limits.test.ts` already covers one seam |
| 6 | `app/admin/review/page.tsx` | 863 | song list + editor | Named in GAP-007 |

**Behaviour-preserving.** Tests green before and after; capture both outputs.

**Accept:** every file is under 550 lines; no test changed to accommodate the split.

### 2.3 — Deliver the accessibility core · closes QA-UX-001, QA-UX-002 · ~2 d

- **Live regions** (QA-UX-001): a `polite` region for phase announcements, an `assertive` region for the reveal, and a timer that is **not** announced every second — announce at 10 s, 5 s and time-up only.
- **Focus management** (QA-UX-002): move focus to the phase heading on every phase change (`tabIndex={-1}` on the heading).
- **Roles**: expose the timeline as `listbox`/`option` with `aria-selected`; add `role="status"` to the score.
- **Keyboard**: a shortcut to lock in, a shortcut to reveal, `Escape` for the settings panel; one `<main>` and one `<h1>` per page.

**Accept:** a screen reader announces round start, time warning, lock, reveal (with title and artist) and score change; a keyboard-only session completes a round.

### 2.4 — Enforce the module boundaries · closes QA-ARC-005, QA-ARC-006 · ~1 d

```bash
# No component or page may import the raw catalogue.
if grep -rn "from '@/data/songs'" src/components src/app; then
  echo "❌ Components must not import the raw song catalogue."; exit 1
fi
# src/config must not import from src/components; src/utils must not import from src/stores.
```

Reshape the catalogue behind a narrow interface so the consumer chooses how much it receives:

```ts
export interface CatalogueEntry { id: string; title: string; artist: string; year: number; }
export interface RoundBundle { entry: CatalogueEntry; hints: string[]; lyrics?: string; }
export function loadPack(packId: string): Promise<RoundBundle[]>;
```

**Accept:** the boundary check fails on a deliberate violation and passes on the current tree.

### 2.5 — Localise the catalogue content · closes QA-UX-004, QA-SPO-004b · ~2 d

- Schema: `hints: { de: string[], en: string[] }`, `lyrics: { de, en }`.
- Select by the active i18next language; document the fallback.
- Extend `validate-song-data.ts` to fail when a song lacks a hint in a declared locale.
- Add the short English artist names to `SPOILER_CONFIG.EXCEPTIONS`; make `IGNORE_WORDS` language-aware.

**Accept:** an English session shows English hints; the validator fails on a missing locale.

### 2.6 — Choose the hosting model · closes QA-SEC-001, QA-SEC-002, QA-SPO-001 · ~1 d decision + 2 d migration

| Option | Headers | API routes | Cost | Verdict |
|---|---|---|---|---|
| GitHub Pages (today) | ❌ | ❌ | free | Insufficient |
| **Cloudflare Pages** | ✅ `_headers` | ⚠️ Pages Functions | free tier | **Recommended** — static + Functions covers 1.1 and 1.4 |
| Cloudflare Workers | ✅ | ✅ | free tier | Best if the catalogue API grows |
| Vercel / Node host | ✅ | ✅ | paid | Simplest, full Next.js runtime |
| Netlify | ✅ | ✅ | free tier | Good alternative |

**Recommendation: Cloudflare Pages** (or Workers if the catalogue API becomes substantial). It keeps the static shell, adds `_headers`, and Pages Functions cover the round API — without abandoning the static-export architecture that the deploy workflow already implements.

**Accept:** the live host sets the headers, serves the round API, and the deployment workflow is updated accordingly.

### 2.7 — Move the covers out of the repository · closes QA-PERF-001 · ~2 d

- Covers move to a CDN (`cdn.phomu.example/covers/<opaque-id>.webp`).
- The repository keeps only metadata.
- Build-time derivative ladder: 160 / 320 / 640 / 1280 px, WebP + JPEG fallback.
- `Cache-Control: public, max-age=31536000, immutable` (safe now that names are opaque).

**Accept:** the repository holds no cover binaries; one round's cover payload is under 60 KB; `Content-Type: image/webp` is negotiated.

### 2.8 — Fix the licence · closes QA-DOC-001 · ~0.5 d

```bash
curl -o LICENSE https://www.gnu.org/licenses/gpl-3.0.txt   # ~674 lines
```

Then set `package.json` → `"license": "GPL-3.0-or-later"`, `README.md:10` → "GPL-3.0-or-later", and add `scripts/check-license.mjs` asserting the four files agree and that `LICENSE` is the full text.

**Accept:** `wc -l LICENSE` ≈ 674; GitHub reports `spdx_id: GPL-3.0` instead of `NOASSERTION`.

---

### 2.9 — Extend the file-size gate to the Rust base · closes QA-ARC-007 · ~1 d

```js
// scripts/check-file-size.mjs
const SOURCE_GLOBS = ['src/**/*.{ts,tsx}', 'core/**/*.rs', 'platform/**/*.rs', 'tools/**/*.rs'];
```

Apply the same 400/550 rule and the same known-legacy mechanism to both languages, then split the two files that already breach the hard limit: `core/phomu-conformance/src/runner.rs` (1,022 lines) and `core/phomu-conformance/src/vector.rs` (794 lines).

**Accept:** the gate reports `.rs` files; a Rust file over 550 lines turns it red; both files are split.

### 2.10 — Audit the Rust base properly · closes the scope gap in QA-00 § 0b · ~2 d

The Rust workspace (101 files, 13 crates) landed **after** this assessment's measurement baseline and was **not** audited — the sandbox had no Rust toolchain, so no `cargo build`, `cargo test`, `cargo clippy` or `cargo fmt` was run against it.

A dedicated pass should cover: the crate topology and the dependency direction the workspace comments describe, the `unsafe`/`unwrap`/`expect`/`indexing_slicing` deny list actually being enforced, the WASM and FFI surfaces, the conformance runner's own logic, and the boundary between `core/phomu-catalog` and the web shell's still-duplicated TypeScript rules.

**Accept:** a QA report section for the Rust base, with real `cargo` output, exists and is referenced from `docs/qa/`.

---

## Stage 3 — Excellence

### 3.1 — Make the gates self-verifying · closes QA-DOC-003 · ~1 d

Generate the `REQUIREMENTS.md` gate-evidence table from the gates themselves:

```
<!-- BEGIN:GATE-EVIDENCE -->
… generated by scripts/generate-gate-evidence.mjs …
<!-- END:GATE-EVIDENCE -->
```

CI regenerates it and fails if the committed table differs.

### 3.2 — Remove the stale baseline pointers · closes QA-DOC-002 · ~0.5 d

Move the baseline SHA into `project/project.yaml` → `project.baseline_commit`, replace the 13 hard-coded references with a pointer to it, and add `scripts/check-doc-refs.mjs` that fails when a document mentions a branch or commit that does not exist.

### 3.3 — Validate the whole catalogue in CI · closes QA-TST-003 · ~0.5 d

Make `validate-song-data.ts` iterate over `src/data/songs` by default (or accept a glob) instead of defaulting to `A1.json`, and run it with `--strict` in CI.

**Accept:** the script reports ≈1,615 songs; a corrupted song in a non-A1 pack fails CI (red/green negative test).

### 3.4 — Test the untested pure modules · closes QA-TST-004 · ~1 d

`song-picker.ts` (decides which song is asked — the most consequential untested function in the project), `check-covers.ts`, `feedback-messages.ts`, `last-round-messages.ts`, `game-audio-cues.ts`.

### 3.5 — Grow the E2E suite · closes QA-TST-005, QA-UX-007, QA-UX-008 · ~2 d

One round-playing test per game mode (six); a spoiler-invariant test; a projector-invariant test; a keyboard-only round; a guide/rules-drift test.

### 3.6 — Respect `prefers-reduced-motion` · closes QA-UX-003 · ~0.5 d

Global CSS rule **and** `useReducedMotion()` in the framer-motion components (the CSS rule alone still flashes).

### 3.7 — Fix the border contrast and add a contrast gate · closes QA-UX-005, QA-UX-006 · ~0.5 d

Raise `--color-border` to ≥ 3:1 against all three backgrounds of each theme, add a `--color-focus` token, and add a script that computes every theme pair and fails below threshold.

**Accept:** a contrast test covers all four themes and fails on a deliberately darkened token.

---

## Dependency map

```
                     ┌──────────────────────────┐
                     │ 0.1 Preserve the commits │  ← do first, today
                     │ 0.2 Restore main         │
                     │ 0.3 Fix npm ci           │
                     └────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
   ┌────▼─────┐            ┌──────▼──────┐          ┌───────▼────────┐
   │ 1.6 Coverage│           │ 1.4 Headers │          │ 1.5 Admin API │
   │ 1.7 CI jobs│           │ 2.6 Hosting │          └───────┬────────┘
   └────┬─────┘            └──────┬──────┘                  │
        │                         │                    ┌────▼─────┐
        │  ┌──────────────────────▼──────────────┐     │          │
        └──►│ 2.2 Split files (Timeline, Reveal, │◄────┘          │
           │     MusicPlayer) — needed before the  │                │
           │     spoiler and a11y work is stable   │                │
           └──────────────────────┬──────────────┘                │
                                  │                               │
                    ┌─────────────▼──────────────┐                │
                    │ 1.1 Serve the catalogue    │◄───────────────┘
                    │     from an API (2.6)      │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │ 2.3 Accessibility core      │
                    │ 1.2 Opaque covers (2.7)     │
                    │ 3.5 E2E depth               │
                    └────────────────────────────┘
```

**Critical path:** 0.1 → 0.2 → 2.6 → 1.1 → 3.5. Everything else can proceed in parallel.

---

## Decisions the owner has to make

These are the points where the audit found a genuine fork in the road. Each has a recommendation, and each changes the size of the work materially.

| # | Decision | Options | Recommendation | Impact if changed |
|---|---|---|---|---|
| **D1** | Where does the catalogue live? | Bundle it / per-pack files / API | **API** (Stage 2, item 2.6) | Bundling keeps the P0 open. Per-pack files reduce the leak but do not close it. |
| **D2** | Where is the app hosted? | GitHub Pages / Cloudflare Pages / Workers / Vercel | **Cloudflare Pages** | GitHub Pages cannot deliver headers or API routes — QA-SEC-001 and QA-SPO-001 both stay open. |
| **D3** | Is the admin UI a product feature? | Keep and wire it / remove it | **Decide explicitly** — do not leave it half-wired | Removing it deletes 63 tests and the admin pages; keeping it requires the server. |
| **D4** | Is the catalogue content localised? | German only / DE+EN | **DE+EN** | The project promises a complete English UI; leaving the content German-only makes the promise hollow. |
| **D5** | Does the file-size rule stay a warning? | Warning / error | **Error on growth** | A warning-only gate cannot prevent the exact regression it was built to detect. |
| **D6** | Is `main` force-pushable by an admin? | Yes / no | **No — branch protection with no bypass** | The incident in QA-REL-001 was possible only because `main` was `protected: false`. |
| **D7** | Does the web shell adopt the Rust core now, or keep both implementations? | Adopt / keep both | **Adopt** (item 1.1) | Keeping both means two implementations of the game rules — one of them untested — and the answer key still in the browser bundle. |

---

## What I did **not** do, and why

- **No code was changed.** The instruction was explicit: assess and report, do not develop. Every recommendation above is a specification, not a patch.
- **No issue or PR was opened.** Creating 24 GitHub issues in your repository is a significant act that was not requested. The backlog is written so it can be pasted into issues, or turned into a milestone, in one step — say the word and I will do it.
- **No commit, tag or push was made** to the audited repository, and the recovery tag in item 0.1 is left for you to run, deliberately: it is a write to your history, and it should be yours.
- **No coverage percentage is quoted that I did not measure**, and no number in these reports comes from a document unless I re-ran the command and confirmed it. Where a document and the code disagreed, the disagreement is itself a finding (QA-DOC-003).

---

## Suggested next step

Close **Stage 0** first and re-run the gate suite on the restored `main`. That produces a trustworthy CI baseline, and the six green jobs then become the acceptance evidence for Stage 1 — rather than the current situation, where the last green CI run belongs to a commit that is no longer on the branch.
