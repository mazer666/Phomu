# Phomu — QA Assessment, Executive Summary

**Assessment type:** Independent QA audit (read-only). No production code was changed.
**Date:** 2026-10-25
**Auditor:** Mavis (QA & Review role)
**Repository:** `mazer666/Phomu` (public; licence declared as GPL-3.0-or-later in `README.md` but inconsistently across four files — see QA-DOC-001)
**Baseline assessed:** `9639c762` *"docs(platform): English documentation and the multi-platform specification"* (the last coherent project state, 2026-10-25 10:59 UTC)
**Secondary baseline assessed:** `main` @ `1c597a3` (what is actually published to GitHub Pages today)
**Current good state:** `11371eb94` — the assessment baseline `9639c762` was extended by two commits during the audit; see § 0b
**Toolchain:** Node v22.19.0, npm 10.9.3, Next.js 16.4.3 (Turbopack), Vitest 4.1.2, ESLint 9.39.4, TypeScript 5.9.3

---

## Report index

| File | Subject |
|---|---|
| **QA-00** | This document — verdict, scorecard, findings index, release recommendation |
| [QA-01](QA-01-BRANCH-AND-RELEASE-INTEGRITY.md) | Branch integrity, build reproducibility, release process |
| [QA-02](QA-02-SPOILER-FREENESS.md) | Spoiler-freeness & game integrity — the named product promise |
| [QA-03](QA-03-SECURITY-AND-PRIVACY.md) | Security & privacy — threat surface, hardening, delivered protection |
| [QA-04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) | Code quality, architecture, module boundaries |
| [QA-05](QA-05-TESTING-AND-CI.md) | Testing, coverage honesty, CI gates |
| [QA-06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) | Usability, accessibility, internationalisation |
| [QA-07](QA-07-PERFORMANCE-AND-DELIVERY.md) | Payload, build cost, delivery |
| [QA-08](QA-08-DOCUMENTATION-AND-LICENSING.md) | Documentation traceability & GPL compliance |
| [QA-09](QA-09-REMEDIATION-BACKLOG.md) | **The action plan** — 28 items, phased, with acceptance criteria |
| [QA-10](QA-10-EVIDENCE-LOG.md) | Every command that was run, with its real output |
| [QA-11](QA-11-RUST-BASE.md) | **The shared Rust base** — the crates, the rules, the bridges, the gates — closes the scope gap of § 0b |
| `evidence/gates/` | Raw captured output of all 13 gate runs |

> **Scope:** the measured baseline of QA-01 … QA-10 is the Next.js/TypeScript **web shell** at `9639c762`. The Rust base that landed during the assessment is audited separately in **[QA-11](QA-11-RUST-BASE.md)** — the scope gap of § 0b is **closed**.

---

## 0a. Revision note — corrections applied before publication

This report went through a verification pass before it was published. Three claims in the
first draft were wrong and have been corrected; they are listed here rather than quietly
fixed, because each one changes how a reader should judge a finding.

| Claim in the first draft | Correction | How it was caught |
|---|---|---|
| "`main`'s tree is **byte-identical** to the pre-reform state `d5b6422`" | **Wrong.** The *path sets* match, but **134 files differ in content** (all under `src/data/songs/` — the Spotify/Amazon link resolution). `main` is the pre-reform project *plus* the link work, not a plain rollback. | The first comparison compared paths only. Re-running it at **blob level** (path → blob SHA) exposed the difference. |
| "80 files lost from `main`" | **Understated.** The real figure is **309 affected paths**: 80 removed, 9 archived away, and **220 existing files rewritten in place** (the English conversion, the security headers, the new npm scripts, the whole `docs/` tree). | Follow-on from the blob-level comparison. |
| "The bundle's raw **hints** are the primary spoiler leak" | **Wrong.** Measured: only **3 of 7,785 hints** contain the artist or a distinctive title token. The catalogue's hints are already written spoiler-free. The real leaks are the **title/artist pairs** (1,557 songs) and the **lyric payload** (5,988 lines, which solves Lyrics Labyrinth outright). | The hint corpus was counted with an independent re-implementation of the censoring rule instead of being inferred. |

The **P0 severity of QA-SPO-001 is unchanged** — the finding got stronger, not weaker: the
lyrics payload defeats an entire game mode, which is a sharper defect than a hint leak.
What changed is *where* the leak is and therefore *what* the fix must prioritise.

Two claims were checked and turned out to be correct as written, and are now evidenced
rather than asserted: the **projector page is clean** (measured: `out/projector.html`, 7,846
bytes, zero occurrences of `"artist"`, `"title"`, `"lyrics"`, `"hints"`, `spotify` or
`youtube`), and the **97 tests / 10 files** baseline.

---

## 0b. What changed during the audit — the Rust base

The measured baseline `9639c762` is **no longer the tip of the good lineage**. Two commits landed while this assessment was being written:

| Time (UTC) | Commit | Content |
|---|---|---|
| 13:17:08 | `be984cdc5` | *"feat(core): the shared Rust base, the bridges and the conformance proof"* — a **new Cargo workspace**: 7 core crates, 3 platform crates, 3 tools, 101 Rust files, plus 4 new CI jobs (`rust-core`, `rust-boundaries`, `conformance`, and a modified `ci.yml`) |
| 13:21:17 | `11371eb94` | *"feat(catalog): resolve Spotify and Amazon Music links for the catalogue"* — the same 134 catalogue files, applied **on top of** the Rust base |
| 13:44:09 | `1c597a3` | `main` force-pushed **again**, to another orphan root commit with the same pre-reform structure (1,965 blobs, no `docs/`, no `ci.yml`, no `core/`) |

So the branch regression is now **572 affected paths** (421 missing, 9 extra, 142 rewritten) rather than 309.

**What this means for the report's scope — and it is the most important paragraph in it:**

The Rust base is **not** audited here. It landed after the measurement baseline was fixed, and the sandbox has no Rust toolchain, so no `cargo build`, `cargo test`, `cargo clippy` or `cargo fmt` was executed against it. Every number in this report set therefore describes the **Next.js / TypeScript web shell** at `9639c762`.

That said, three things about the Rust base are directly relevant to the findings and were read from the source:

1. **The Rust core already implements the anti-spoiler contract the web app lacks.** `core/phomu-core/tests/anti_spoiler.rs` asserts, for *every* game mode, that the question payload contains neither the title nor the year, and that the artist is hidden except in the modes that declare they disclose it. `core/phomu-core` exposes a `RoundView` facade whose question view has **no field for the solution**, and `PERSISTABLE_FIELDS` limits what a shell may persist. `platform/phomu-wasm` publishes `#[wasm_bindgen]` exports and a `catalogue.rs`. **The fix for QA-SPO-001 already exists in this repository — the web shell simply does not consume it.** That is a far better place to be than "build an API from scratch".
2. **The file-size gate does not cover Rust.** `scripts/check-file-size.mjs` matches no `.rs` extension, and two new files already exceed the project's own hard limit: `core/phomu-conformance/src/runner.rs` (**1,022 lines**) and `core/phomu-conformance/src/vector.rs` (**794 lines**). This is new finding **QA-ARC-007**.
3. **The CI pipeline grew, and the Rust side is better gated than the TypeScript side.** `rust-core` runs build, test, clippy, fmt and doc; `rust-boundaries` enforces the crate topology; `conformance` runs the conformance suite. The workspace denies `unsafe`, `unwrap`, `expect`, `indexing_slicing`, `panic`, `todo` and `unimplemented` workspace-wide. The TypeScript findings in QA-05 (no E2E in CI, no format gate, no audit gate) are unchanged — they apply to the web shell.

**A dedicated audit of the Rust base was outstanding at the time this section was written, and was not covered by this report.** It needed a separate pass with a Rust toolchain. **That pass has since been made — see § 0b.1 and [QA-11](QA-11-RUST-BASE.md).** The item in QA-09 that asked for it is **2.10**; item 2.9 asks for the file-size gate to be extended to Rust.

### 0b.1 The scope gap is closed — QA-11

**The gap described above is now closed.** [`QA-11-RUST-BASE.md`](QA-11-RUST-BASE.md) audits the Rust base with a Rust toolchain against the pinned commit `0903997a`, with the raw output of every command in `docs/qa/evidence/gates/`. It is a separate report because the base is a separate subject; it is listed in the report index above.

What the dedicated pass measured, against `0903997a0df38cfb1fe465c47f0958bbb5a63188` with `cargo 1.99.1` / `rustc 1.99.1`:

| | |
|---|---|
| `cargo build --workspace` | exit 0, cold build 6 m 43 s |
| `cargo test --workspace` | exit 0, **304 tests**, 0 failed, 0 ignored |
| `cargo clippy --workspace --all-targets -- -D warnings` | exit 0, **0 warnings** |
| `cargo fmt --check` | exit 0 |
| `cargo doc --workspace --no-deps` | exit 0, 0 warnings |
| Crate-boundary gate and its negative self-test | exit 0, 13 crates, 22 edges, 0 violations, 12 of 12 assertions |
| `npm run check:conformance` | exit 0 — 64 portable vectors compared, 36 identical, 0 deviating, 28 intentional deviations, 6 documented |

**The three statements of § 0b above survive the audit, with one correction.**

1. The anti-spoiler contract is real and it is **in the state machine**, not in the rendering: the reveal is refused with `AnswersNotLocked` until the answers are locked in, and 8 tests walk every mode. But the claim that `platform/phomu-wasm` *"publishes the `#[wasm_bindgen]` exports"* needs a correction: the compiled module exports **three** functions (`phomu_abi_version`, `phomu_abi_versions`, `phomu_message_key`) — the whole game loop carries no `#[wasm_bindgen]` attribute and is therefore **not reachable from JavaScript**. The fix for QA-SPO-001 exists in the **core**; the bridge the web shell would consume does not yet carry it. This is **QA-RST-001 (P1)**.
2. The file-size gate does not cover Rust. Measured: **2** files over the 550-line hard limit, **0** of them seen by the gate. This is QA-ARC-007, restated with an exact number as QA-RST-006.
3. The Rust side is better gated than the TypeScript side — that holds. The deny list of the workspace is not merely declared, it is enforced: **0** `unwrap`, `expect`, `panic!`, `todo!` or `unimplemented!` on a reachable production path, and **0** `unsafe` outside the C-ABI bridge.

**The base is not the problem; the distance between the base and the shell is.** QA-11 reports **11 findings** (3 × P1, 5 × P2, 3 × P3). The three P1 findings are all about the same thing: the rules exist in the base and the bridges do not let a shell reach them — the WebAssembly module exports no game, an unanswered round cannot be closed through the exported surface, and **20 of the 32** public operations of the session are unreachable from every shell. The rules themselves are the strongest part of the repository.

**Correction to a pointer in this section:** the gap above was listed in QA-09 as **item 2.9**; the item that asks for this report is **item 2.10**. Item 2.9 asks for the file-size gate to be extended to Rust.

---

## 1. Verdict

> **Not release-ready. The current `main` must not be published as a release, and three P0 defects block any v1.0 / public-beta declaration.**

Phomu is, in documentation and product intent, one of the best-specified projects I have audited: 174 numbered requirements, a machine-readable project state, an honest security model that even records its own unresolved findings, a zero-telemetry promise, and quality gates that are actually wired into CI. The *intent* is best-in-class. The *delivered artifact* is not, and the gap is not evenly distributed — it is concentrated in exactly the three places where a party game lives or dies: **the answers must not leak**, **the build must install**, and **the branch must contain what the documentation claims**.

Two of these three are not quality gaps but *integrity* gaps, and they are what keeps the verdict at "not release-ready" rather than "needs polish":

1. **`main` no longer contains the project.** A force-push at 11:28 UTC today — and a second one at 13:44 UTC — replaced the branch with orphan root commits. Its file structure is identical to the pre-reform state `d5b6422` — but **134 catalogue files differ in content** (the Spotify/Amazon-Music link resolution), so `main` is the *pre-reform project with the catalogue links updated*, not a byte-for-byte rollback. Everything the reform added or changed is gone: **572 paths differ** between `main` and the current good state `11371eb94` — **421 files missing** (including `.github/workflows/ci.yml`, the whole `docs/` tree, `project/project.yaml` and the entire new `core/` Rust workspace), 9 files that the reform had archived, and **142 existing files changed in place** (the English conversion, the security headers, the new npm scripts). The documentation reform, the CI quality gates, the 97-test suite and the Rust base exist only in unreferenced commits.
2. **The answers are shipped to the client.** The web shell still bundles the catalogue (`src/data/songs/index.ts` + 136 JSON files) even though the Rust core now owns the catalogue model. The production bundle contains **1,557 songs** with title, artist, year and hints, and **1,497 of them also ship their lyric lines** (3 real + 1 fake each — 5,988 lyric lines in total). That is a complete answer key, delivered before the first question is asked, and it defeats the Lyrics Labyrinth outright: with the bundle you can see which of the four on-screen options is the fake line.
3. **`npm ci` fails for everyone.** A devDependency was yanked from the public npm registry and replaced with a placeholder version; the lockfile still pins the dead tarball. Every CI job and the Pages deploy are red on the next push.

None of the three needs a new feature. Two are a day's work; the third — taking the catalogue off the client — is the one piece of real engineering in this list, and it is a *migration*, not a rewrite.

---

## 2. Scorecard

Weighted for Phomu's stated goal ("best in class, clutter-free, error-free, performant, secure, privacy-compliant, interoperable").

| # | Dimension | Weight | Score | Headline |
|---|---|---|---|---|
| 1 | Release & branch integrity | 10% | **1.5 / 5** | `main` was force-pushed twice to orphan commits; 572 paths of the project are gone; the real state is unreferenced |
| 2 | Spoiler-freeness & game integrity | 15% | **2.0 / 5** | Answer key + lyric lines ship in the client bundle; censoring untested |
| 3 | Security & privacy | 15% | **3.5 / 5** | Genuinely strong threat model; headers configured but not delivered; admin API unreachable |
| 4 | Code quality & architecture | 12% | **3.0 / 5** | Strict TS, zero `any`; but 6 files breach the hard size limit and the gate cannot fail |
| 5 | Testing & CI quality | 15% | **2.5 / 5** | 97 tests and 7 CI jobs; coverage metric excludes most of the app; no E2E in CI |
| 6 | Usability, accessibility & i18n | 13% | **3.0 / 5** | Outstanding i18n discipline; no live regions, no roles, ~1 keyboard handler app-wide |
| 7 | Performance & delivery | 10% | **2.0 / 5** | 147 MB static export; 138 MB of cover art; 2.8 MB catalogue chunk |
| 8 | Documentation & traceability | 10% | **4.0 / 5** | Exceptional document set; two stale pointers after the force-push |
| | **Weighted total** | **100%** | **2.70 / 5 (54%)** | **Conditional — blocked on P0-1 and P0-2** |

---

## 3. Findings overview

Severity: **P0** blocks any release · **P1** blocks a public beta · **P2** required for "best in class" · **P3** improvement.

| ID | Severity | Area | Finding | Detailed report |
|---|---|---|---|---|
| QA-REL-001 | **P0** | Release | `main` force-pushed twice to orphan commits; 572 paths of the project lost (incl. `ci.yml` and `core/`) | [01](QA-01-BRANCH-AND-RELEASE-INTEGRITY.md) |
| QA-REL-002 | **P0** | Release | `npm ci` fails (E404) — yanked devDependency; all CI and deploys are red | [01](QA-01-BRANCH-AND-RELEASE-INTEGRITY.md) |
| QA-SPO-001 | **P0** | Spoiler | 1,557 songs + 5,988 lyric lines serialised into a client JS chunk loaded by `/game` | [02](QA-02-SPOILER-FREENESS.md) |
| QA-SPO-002 | **P1** | Spoiler | 1,649 cover files named `artist-title.jpg` leak every answer via URL | [02](QA-02-SPOILER-FREENESS.md) |
| QA-SPO-003 | **P1** | Spoiler | `censor-utils.ts` (the censoring logic) has **0 % test coverage** | [02](QA-02-SPOILER-FREENESS.md) |
| QA-SPO-004 | **P2** | Spoiler | Hints are German-only inside a bilingual UI; `IGNORE_WORDS` can leak an artist | [02](QA-02-SPOILER-FREENESS.md) |
| QA-SPO-005 | **P2** | Spoiler | The blur is visual only — the answer stays in the DOM and the accessibility tree | [02](QA-02-SPOILER-FREENESS.md) |
| QA-SPO-006 | **P3** | Spoiler | No test asserts that cover identifiers stay opaque | [02](QA-02-SPOILER-FREENESS.md) |
| QA-SPO-007 | **P1** | Spoiler | The shipped lyric payload defeats Lyrics Labyrinth outright — the real leak, not the hints | [02](QA-02-SPOILER-FREENESS.md) |
| QA-SEC-001 | **P1** | Security | Security headers configured in `next.config.ts` but **not delivered** by the static export | [03](QA-03-SECURITY-AND-PRIVACY.md) |
| QA-SEC-002 | **P1** | Security | `src/admin-api/` has **0 consumers** and is **absent from the export** — 63 tests guard unreachable code | [03](QA-03-SECURITY-AND-PRIVACY.md) |
| QA-SEC-003 | **P2** | Security | The per-instance rate limiter cannot run at all on the current host | [03](QA-03-SECURITY-AND-PRIVACY.md) |
| QA-SEC-004 | **P2** | Security | CSP allows `'unsafe-inline'` for scripts — removable once a server exists | [03](QA-03-SECURITY-AND-PRIVACY.md) |
| QA-SEC-005 | **P3** | Security | `.gitignore` coverage for secrets not confirmed | [03](QA-03-SECURITY-AND-PRIVACY.md) |
| QA-SEC-006 | **P3** | Security | The admin bearer token's HTTPS-only requirement is not documented | [03](QA-03-SECURITY-AND-PRIVACY.md) |
| QA-SEC-007 | **P3** | Security | The privacy notice will need a new data flow once the catalogue moves behind an API | [03](QA-03-SECURITY-AND-PRIVACY.md) |
| QA-ARC-001 | **P1** | Architecture | File-size gate treats hard-limit (550 lines) breaches as *warnings*; it can never go red | [04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) |
| QA-ARC-002 | **P2** | Architecture | Six files over the hard limit and the backlog is growing (lobby +306 lines) | [04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) |
| QA-ARC-003 | **P2** | Architecture | `src/types/session.ts` is imported by nobody | [04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) |
| QA-ARC-004 | **P2** | Architecture | Two `exhaustive-deps` suppressions sit in spoiler-adjacent effects | [04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) |
| QA-ARC-005 | **P3** | Architecture | Module boundaries are sound but not enforced by any check | [04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) |
| QA-ARC-006 | **P3** | Architecture | The catalogue is coupled to the UI through a single barrel file | [04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) |
| QA-ARC-007 | **P2** | Architecture | The file-size gate matches no `.rs` file — the new Rust base is ungated, and two files already breach the hard limit | [04](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) |
| QA-TST-001 | **P1** | Testing | Coverage denominator is `src/utils/**` only — the "All files" 32 % figure is not project coverage | [05](QA-05-TESTING-AND-CI.md) |
| QA-TST-002 | **P1** | Testing | E2E smoke test exists but is **not in CI**; `format:check` and `npm audit` are not gated either | [05](QA-05-TESTING-AND-CI.md) |
| QA-TST-003 | **P2** | Testing | `validate-songs` validates 12 of 1,615 songs (0.74 %) — it defaults to `A1.json` | [05](QA-05-TESTING-AND-CI.md) |
| QA-TST-004 | **P2** | Testing | `song-picker.ts` — the function that picks the song — has 0 % coverage | [05](QA-05-TESTING-AND-CI.md) |
| QA-TST-004a | **P2** | Testing | The Rust base tests the game rules; the older TypeScript duplicate is untested — retire it rather than port its tests | [05](QA-05-TESTING-AND-CI.md) |
| QA-TST-005 | **P3** | Testing | One E2E smoke test for six game modes | [05](QA-05-TESTING-AND-CI.md) |
| QA-TST-006 | **P3** | Testing | The local CI script and the GitHub workflow define different gate sets | [05](QA-05-TESTING-AND-CI.md) |
| QA-UX-001 | **P1** | Usability | No `aria-live` anywhere — a timed, score-driven game is silent to screen readers | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-UX-002 | **P2** | Usability | No `role=` attributes, 0 focus management, keyboard support in 2 of ~10 interactive surfaces | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-UX-003 | **P2** | Usability | `prefers-reduced-motion` is honoured nowhere, despite heavy framer-motion use | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-UX-004 | **P2** | Usability | Catalogue hints and lyrics are German-only inside a bilingual UI | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-UX-005 | **P3** | Usability | `--color-border` fails the 3:1 non-text contrast requirement in **all four** themes | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-UX-006 | **P3** | Usability | Focus indicators are barely present (5 occurrences) | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-UX-007 | **P3** | Usability | Six game modes with no documented input model — a problem for the TV track | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-UX-008 | **P3** | Usability | Guide and rules pages have no E2E coverage against the implemented rules | [06](QA-06-USABILITY-ACCESSIBILITY-I18N.md) |
| QA-PERF-001 | **P1** | Performance | 147 MB export; 138 MB of cover art served at original resolution, no WebP | [07](QA-07-PERFORMANCE-AND-DELIVERY.md) |
| QA-PERF-002 | **P2** | Performance | 2.8 MB catalogue chunk on the critical path of `/game` and `/browse` | [07](QA-07-PERFORMANCE-AND-DELIVERY.md) |
| QA-PERF-003 | **P3** | Performance | Nothing in the project is measured for performance, despite `QUALITY.md` requiring it | [07](QA-07-PERFORMANCE-AND-DELIVERY.md) |
| QA-PERF-004 | **P3** | Performance | The TypeScript compiler runs twice per push (28 s wasted) | [07](QA-07-PERFORMANCE-AND-DELIVERY.md) |
| QA-PERF-005 | **P3** | Performance | No `srcset`, no format negotiation, layout shift on cover load | [07](QA-07-PERFORMANCE-AND-DELIVERY.md) |
| QA-DOC-001 | **P1** | Docs/Legal | `LICENSE` is a 21-line stub, not the GPL-3.0 text; the licence is stated four different ways | [08](QA-08-DOCUMENTATION-AND-LICENSING.md) |
| QA-DOC-002 | **P2** | Docs | 13 documentation references point at the deleted branch and orphaned commit | [08](QA-08-DOCUMENTATION-AND-LICENSING.md) |
| QA-DOC-003 | **P2** | Docs | The acceptance table in `REQUIREMENTS.md` contradicts the measured state (21 vs 97 tests) | [08](QA-08-DOCUMENTATION-AND-LICENSING.md) |
| QA-DOC-004 | **P3** | Docs | The language gate does not cover catalogue content or script output | [08](QA-08-DOCUMENTATION-AND-LICENSING.md) |
| QA-DOC-005 | **P3** | Docs | The traceability matrix spans one requirement file, not two | [08](QA-08-DOCUMENTATION-AND-LICENSING.md) |
| QA-REL-003 | **P2** | Release | `npm ci` fails inside a git worktree — the hook installer does not handle a `.git` file | [01](QA-01-BRANCH-AND-RELEASE-INTEGRITY.md) |
| QA-REL-004 | **P3** | Release | The live site is deployed from a branch with no CI at all | [01](QA-01-BRANCH-AND-RELEASE-INTEGRITY.md) |

Full prioritised backlog with effort, dependencies and acceptance criteria: **[QA-09 remediation backlog](QA-09-REMEDIATION-BACKLOG.md)**.
Raw command outputs and the re-verification checklist: **[QA-10 evidence log](QA-10-EVIDENCE-LOG.md)**.

---

## 4. What is genuinely excellent — keep it

An audit that only lists defects is not an audit. The following are above the bar I expect from a project of this size and should be protected during the remediation work:

- **Requirement discipline.** 174 requirement blocks in `REQUIREMENTS.md`, every one with Requirement / Rationale / Acceptance / Verification, IDs gapless per domain (`CORE`, `GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`). Each names the code path that proves it and the command that checks it. This is rare.
- **Honest self-documentation.** `SECURITY.md` records finding **F-05** ("security headers are not delivered with the static export") in its own threat table, with the Next.js warning text and the consequence. `next.config.ts` carries the same limitation in a comment block. Self-reported, accurately-scoped unresolved findings are the single best sign of a healthy project.
- **i18n as a gate, not a convention.** 1,258 leaf keys in `de.json` and `en.json`, exactly parallel, **0 literal texts in 48 TSX files**, enforced by `scripts/check-i18n-completeness.mjs` in CI. A typed key space derived from the locale files prevents the drift that usually eats i18n projects.
- **Type discipline.** `strict: true`, **0** `any` annotations, **0** `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`, **0** `dangerouslySetInnerHTML`, **0** `eval`/`innerHTML` assignments. For a project that renders user-supplied catalogue data, this is the right baseline and it eliminates the entire stored-XSS class from the rendering path.
- **Zero-telemetry promise that is technically enforceable.** `CORE-003` verifies the absence of any analytics SDK by grep, and the state lives in `localStorage`. The claim is checkable, and it checks out.
- **The projector page.** `src/app/projector/page.tsx` carries the comment *"No artist, no title, no album art — nothing that gives the question away."* The big-screen surface — the one every player is looking at — is genuinely spoiler-free, and the build output confirms it: `out/projector.html` contains **0** song titles.
- **Gates that gate.** `check:i18n`, `check:doc-links`, `check:file-size` and `check:doc-language` all pass, and `check:all` aggregates them into one exit code that CI honours.
- **Negative security tests that actually attack.** `src/admin-api/admin-token-guard.test.ts` contains *"limits brute-force attempts even when x-forwarded-for is forged"* — the test executes the forgery rather than asserting a comment. This is the right instinct and it should be extended, not reduced.

---

## 5. Release recommendation

**Do not declare v1.0. Do not treat the current `main` as the release candidate.**

Minimum set to reach "public beta" — all P0 and P1 items, approximately 4–6 working days including verification:

| Order | Item | Report |
|---|---|---|
| 1 | Restore `main` to the `9639c762` lineage (or cherry-pick the 80 missing files onto it) and re-point the branch | QA-REL-001 |
| 2 | Remove the yanked devDependency, or vendor/replace it, so `npm ci` succeeds | QA-REL-002 |
| 3 | Stop shipping the catalogue to the client — serve it per round from an API | QA-SPO-001 |
| 4 | Rename cover assets to opaque IDs and serve them through a manifest | QA-SPO-002 |
| 5 | Move security headers from `next.config.ts` to the hosting layer | QA-SEC-001 |
| 6 | Wire the admin API into the admin pages, or remove it and its 63 tests | QA-SEC-002 |
| 7 | Fix the coverage denominator and add the E2E job to CI | QA-TST-001/002 |
| 8 | Add live regions, roles and keyboard support to the game surface | QA-UX-001/002 |
| 9 | Ship the complete GPL-3.0 text and make the licence statement consistent | QA-DOC-001 |
| 10 | Extend the file-size gate to Rust and split the two oversized Rust files | QA-ARC-007 |
| 11 | Wire the web shell to the Rust core's anti-spoiler contract instead of building a new API | QA-SPO-001 |

To reach "best in class" — add the P2 items. The P2 list is where the project separates itself from merely competent: the catalogue's German-only content in a bilingual product, the file-size gate that cannot fail, the 147 MB payload, and the traceability pointers that still reference a deleted branch.

**One caution on sequencing:** items 1 and 2 are cheap and must land first, because every measurement in this report was taken on the restored `9639c762` state. Once `main` is restored and the install is fixed, the CI evidence in §2 becomes trustworthy and can be re-run as the acceptance baseline for the P0 fixes.

---

## 6. How this was assessed

Every number in this report comes from a command I ran in the sandbox against the code, not from a document. Where a document and the code disagreed, the code won and the disagreement is recorded as a finding.

- All gates were executed against `9639c762` in a copy at `/workspace/repos/Phomu-measure` (`node_modules` installed from the registry).
- One deviation was required and is disclosed in the evidence log: `youtube-search-without-api-key@2.0.7` is no longer on the registry, so it was removed from the measurement copy's `package.json`/`package-lock.json` in order to install the rest of the toolchain. This is the exact defect reported as QA-REL-002; no other dependency was altered.
- The publication state (`main`, pull requests, workflow runs, Pages deployment) was verified against the GitHub API directly, because the CLI connector reported `merged: false` for a pull request that the API confirms was merged.
- No file in the audited repository was modified. The audit artefacts live in `/workspace/qa/`.
