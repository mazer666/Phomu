# QA-01 — Release & Branch Integrity

**Severity of the findings in this report:** P0, P0
**Area:** Git history, branch management, build reproducibility, release process
**Baseline:** `main` @ `1c597a3` (live, at publication time), `11371eb94` (current good state), `9639c762` (measured state), `3d3d011` (reform merge)

---

## QA-REL-001 — P0 — `main` was force-pushed to a pre-reform orphan commit

### What I measured

GitHub API, `mazer666/Phomu`:

| Fact | Value |
|---|---|
| `main` HEAD | `1c597a333bf0ef9eafeb324d5652b9e125fd7886` |
| `main` HEAD commit date | 2026-10-25 13:44:09 UTC |
| `main` HEAD parents | **`[]` — empty** (root commit, no history) |
| `main` HEAD tree | 1,965 blobs — no `docs/`, no `ci.yml`, no `core/` |
| Tree of pre-reform `d5b6422` | 1,965 blobs |
| Same **file structure** as `d5b6422`? | Yes — identical path sets |
| Same **file contents** as `d5b6422`? | **No — 134 files differ** (all under `src/data/songs/`) |
| Branch list | `["main"]` — only one branch exists |
| Reform merge commit `3d3d011` | Reachable by SHA, **not an ancestor of `main`** |
| English/platform commit `9639c762` | Reachable by SHA, **not an ancestor of `main`** |
| Rust-base commit `be984cdc5` | Reachable by SHA, **not an ancestor of `main`** |
| Current good tip `11371eb94` | Reachable by SHA, **not an ancestor of `main`** |

**Correction to an earlier draft of this report.** The first pass compared the trees by *path* and concluded that `main` was byte-identical to `d5b6422`. That was wrong, and it matters: `main` is **not** a plain rollback. It is the pre-reform project **plus** the Spotify/Amazon-Music link resolution — 134 files under `src/data/songs/` have different content. The regression is the *reform* that was lost, not the link work.

Comparing `main` against the last good state `9639c762` at blob level (path → blob SHA):

| Difference class | Count |
|---|---|
| Files in the current good state **removed** from `main` | **421** |
| Files in `main` **not present** in the good state | **9** (the `specifications/*.md` files the reform archived) |
| Shared paths whose **content changed** | **142** |
| **Total paths affected** | **572** |

(The earlier figure of 309 paths was measured against `9639c762`, the baseline at the time of the audit. The good lineage has since advanced by two commits — a new Rust workspace and the catalogue link work — which is why the number is now 572.)

So the regression is not "80 files were deleted" — measured against the measured baseline `9639c762` it was **309 paths** (80 removed, 9 archived away, 220 rewritten in place), and against the current good state `11371eb94` it is **572 paths** (421 removed, 9 extra, 142 rewritten). The difference is the Rust base, which arrived after the baseline was fixed.

The two commits that contain the entire documentation reform, the English conversion and the multi-platform specification are still fetchable by SHA but are attached to **no branch**, because `feature/vocument-style-docs-and-i18n` was deleted.

### The timeline, reconstructed from the Actions API

| Time (UTC, 2026-10-25) | Event |
|---|---|
| 09:42:28 | PR #10 head `227d0fec` pushed — "docs(reform): Vocument-Hausformat für Doku, Specs und Agenten + i18n-Vollständigkeit" |
| 09:43:34 | **`3d3d011` merged into `main`** (+25,474 / −2,824, 124 files) — CI ran, green |
| 09:43:35 | PR #10 marked merged; branch later deleted |
| 10:59:25 | **`9639c762`** on `main` — "docs(platform): English documentation and the multi-platform specification" — CI ran, green |
| 11:01:37 | CI + Pages deploy for `9639c762` — **green** |
| **11:28:09** | **`main` force-pushed to `9e0a246`**, an orphan root commit whose file structure equals the pre-reform `d5b6422` (with 134 catalogue files changed) |
| 11:31:48 | Pages deploy for `9e0a246` — green |
| **13:17:08** | **`be984cdc5`** on the good lineage — *"feat(core): the shared Rust base, the bridges and the conformance proof"*: a new Cargo workspace (7 core crates, 3 platform crates, 3 tools, 101 Rust files) |
| 13:21:17 | **`11371eb94`** — *"feat(catalog): resolve Spotify and Amazon Music links for the catalogue"*, applied on top of the Rust base. CI green |
| **13:44:09** | **`main` force-pushed again** to `1c597a3`, another orphan root commit with the same pre-reform structure (1,965 blobs, no `docs/`, no `ci.yml`, no `core/`) |
| 13:46:30 | Pages deploy for `1c597a3` — green |

The Pages site (`https://mazer666.github.io/Phomu/`) is therefore serving the **regressed** build, and it was deployed *after* the regression, so the regression is live in production right now.

**Pattern worth naming.** Within two hours the branch was force-pushed twice, each time to a valid but reduced orphan commit, and each time the CI ran **green**. A green CI on a state that has quietly lost 421 files is the signature of a pipeline that verifies the code in front of it, not the state it is supposed to be in. That is why the remediation is not only "restore the branch" but "make the branch unable to regress" (branch protection + a required CI check that asserts the expected tree, e.g. `check:doc-links` and `check:file-size` running against `main` rather than against whatever was pushed).

### What was lost from `main`

**Removed outright (80 files)** — including:

- **`.github/workflows/ci.yml`** — the entire CI pipeline (7 jobs: typecheck, lint, unit-tests, catalog-validation, quality-gates, build). `main` today has **only** `deploy.yml`. *This means the published branch has no CI at all.*
- `AGENTS.md`, `ARCHITECTURE.md`, `QUALITY.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `CHANGELOG.md`, `PRIVACY.md`, `GLOSSARY.md`, `PROJECT_MANAGEMENT.md`, `WHERE_TO_CHANGE.md`
- The entire `docs/` tree (`BEST_IN_CLASS.md`, `DOCUMENTATION_POLICY.md`, `adr/`, `cr/`, `acceptance/`, `design/`, `guides/`, `user-guide/`)
- `project/project.yaml` — the machine-readable source of truth
- The four quality-gate scripts (`check-i18n-completeness.mjs`, `check-doc-links.mjs`, `check-file-size.mjs`, `check-doc-language.mjs`) and `check-all.mjs`

**Archived away (9 files)** — the nine `specifications/*.md` documents that the reform moved into `specifications/archive/`. `main` still carries them in their pre-reform location, so the archive is gone and the originals are back.

**Changed in place (220 files)** — the largest and least visible part of the regression. These are files that exist on `main` but whose content was rewritten by the reform, so `main` silently serves the *old* version:

| Group | Examples |
|---|---|
| Root documents | `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `LLM.md`, `PRINTING_GUIDE.md`, `missing_covers_prompts.md` |
| Configuration | `next.config.ts` (the security headers), `package.json` (the `check:*` scripts), `.gitignore` |
| Scripts | `scripts/audit-spoilers.js`, `scripts/check-phase1-acceptance.js`, `scripts/audit-official-youtube-links.js`, … |
| Documentation | the whole English-converted document set |
| Source | the English-converted `src/**` files |

**Consequence for a reader:** the project looks *almost* right on `main`. The files are all there — just older, in German, without the gates, without the headers, without the machine-readable state. That is much harder to spot than a missing directory, and it is why the branch protection recommendation below matters more than the restoration itself.

### Why this is P0 and not a documentation nit

1. **The documented contract and the shipped code no longer describe the same thing.** Every statement in `REQUIREMENTS.md`, `QUALITY.md` and `ARCHITECTURE.md` refers to files that are not on `main`, and the 220 files that *are* on `main` carry their pre-reform content. Any contributor, reviewer or agent that clones `main` sees a project with 25 i18n keys, 4 test files, no CI, no security headers and no requirements — not the project in the documentation.
2. **The regression is invisible.** The force-push produced a *green* CI and a *green* deploy run, because the reduced state is a valid, smaller project. Nothing announces the loss. And because most of the damage is *rewritten content* rather than deleted files, a reviewer skimming the file list sees nothing unusual.
3. **The live site serves the wrong build.** The deploy at 11:31 published the regressed state to GitHub Pages.
4. **The good work is on a timer.** Unreferenced commits are eligible for GitHub's garbage collection. As long as no ref points at them, they should be preserved by a branch or tag.

### Concrete recommendation

**Do this first, in this order. It is ~15 minutes of work and it is the prerequisite for everything else.**

**Step 1 — Preserve the state before anything else.** Create a tag so the commits can never be collected:

```bash
git fetch origin 9639c762b544b58d187b9b80e409357a685a34c7
git tag -a recovery/9639c762 9639c762b544b58d187b9b80e409357a685a34c7 \
  -m "Recovery point: English documentation + multi-platform specification (pre-force-push main)"
git push origin recovery/9639c762
```

Do this **before** any other git operation. If you skip it and the commits are collected, the reform is gone.

**Step 2 — Decide what `main` should be.** The force-pushes discarded the reform entirely (572 paths against the current good state), while *keeping* some of the catalogue link resolution. Two candidate targets:

- **(a) Restore the current good tip `11371eb94` as `main`** — simplest and correct; it contains the reform, the Rust base and the catalogue link work. This is the recommended target, because `11371eb94` already *is* the reform plus the link resolution applied on top of it.
- **(b) Keep the link work** — if you want the link resolution that is in `1c597a3` *and* the Rust base, diff the two catalogue states and merge the differences onto `11371eb94`.

Option (b) is preferable if the link commit contains real catalogue improvements, because it preserves both. Before deciding, diff the link commit against `9639c762`:

```bash
git diff 9639c762 9e0a246 -- src/data/ | head -100
```

**Step 3 — Make the restoration safe.** `main` is currently `protected: false`. Turn on branch protection *after* the restore, not before, or the force-push will be blocked when you need it:

- Require a pull request for `main` (no direct pushes).
- Require status checks: `typecheck`, `lint`, `unit-tests`, `catalog-validation`, `quality-gates`, `build`.
- Require linear history.
- **Enable "Do not allow bypassing the above settings"** — otherwise the protection can still be bypassed by an admin, which is the failure mode that just occurred.

**Step 4 — Verify.** After the restore:

```bash
git ls-remote --heads origin            # expect main == the restored SHA
ls docs/ project/ .github/workflows/     # expect all present
npm run check:all                       # expect 4/4 PASS
```

**Step 5 — Prevent recurrence.** The root cause is that a destructive `git push --force` was possible on a branch with a green CI and no protection. Add to the contributor documentation (`CONTRIBUTING.md`) and to `AGENTS.md`: *"Never force-push `main`. Use `git push --force-with-lease` on feature branches only; `main` is protected and accepts fast-forward only."*

### Accept when

- `git ls-remote --heads origin main` returns the intended SHA.
- `git ls-tree --name-only main` contains `docs/`, `project/project.yaml`, `REQUIREMENTS.md` and `.github/workflows/ci.yml`.
- A PR attempting a force-push to `main` is rejected by branch protection.
- The Pages deployment triggered by the restore is green and the live site serves the restored build.

---

## QA-REL-002 — P0 — `npm ci` fails: a devDependency was removed from the npm registry

### What I measured

```
$ npm ci
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/youtube-search-without-api-key/-/youtube-search-without-api-key-2.0.7.tgz - Not found
npm error 404  'youtube-search-without-api-key@2.0.7' is not in this registry.
```

The registry now serves only two placeholder versions:

| Registry state | Versions available |
|---|---|
| `youtube-search-without-api-key` | `0.0.0-stage`, `0.0.1-security` (latest) |
| Version pinned by `package-lock.json` | `2.0.7` → **404 Not Found** |

The real `2.0.7` tarball is gone and the package name now resolves to a placeholder (`0.0.1-security`). This is the signature of a **package takedown or compromise**: the version is withdrawn and the name is parked on a stub.

Every other dependency I checked resolves normally (`ytsr` 200, `next` 200, `react` 200, `vitest` 200).

### Blast radius

`npm ci` is the first step of **every** job in `.github/workflows/ci.yml` (7 jobs) and of the Pages deploy workflow. With `npm ci` failing, **the entire pipeline is red for every contributor and every push** — not just the job that happens to use the package.

| Consumer | Impact |
|---|---|
| `.github/workflows/ci.yml` — all 7 jobs | Fail at install. No typecheck, no lint, no tests, no gates, no build. |
| `.github/workflows/deploy.yml` | Fails at install → Pages deploy fails → the site stops updating |
| Every contributor cloning the repo | `npm ci` fails → cannot run anything locally |
| The `pre-push` git hook | `npm run local-ci` fails → pushes are rejected locally |

**Important nuance:** the last successful CI run (11:01 UTC) proves the package existed then. This is a *live supply-chain incident*, not a historical mistake — and it can be reversed by the registry owner or by simply not depending on the package.

### Who actually uses it

Only four **manual maintenance scripts** — none of them on any CI or runtime path:

| File | Role |
|---|---|
| `scripts/fix-links.js` | One-off catalogue link repair (imports `search` at line 15) |
| `scripts/fix-youtube-links.js` | One-off link repair (dynamic import at line 24) |
| `scripts/debug-search.js` | Debug helper |
| `scripts/test-providers.js` | Debug helper |

**No runtime code (`src/**`) and no CI step imports it.** `ytsr` — the other YouTube-search dependency — is still published and working, and it covers the same purpose.

### Concrete recommendation

**Remove the dependency from the install path.** It is a dev-only, manual-script-only dependency with a dead upstream; keeping it in `package.json` makes the whole project uninstallable.

Option A — remove it (recommended; the scripts that need it can use `ytsr`):

```bash
npm uninstall youtube-search-without-api-key
```

Then update the four scripts to use `ytsr` (already a dependency) or to document the manual install in a comment. Because these are maintenance utilities and not part of the product, a one-line comment in each file such as
`// NOTE: this script needs `npm i -D youtube-search-without-api-key` — the package was withdrawn from npm on 2026-10-25`
is sufficient and keeps the scripts usable for whoever maintains the catalogue.

Option B — if a script genuinely cannot be migrated, move it out of the npm dependency graph entirely: put it in `scripts/legacy/` with its own `package.json` and a README, and remove the dependency from the root manifest.

**Independently, add a dependency-integrity gate.** This class of failure is silent until it breaks, and it is cheap to detect. Add to CI:

```bash
# Fail fast if the lockfile can no longer be installed
npm ci --ignore-scripts --dry-run
```

Better still, use `npm ci` itself as the integrity check — it already is — but add an explicit **weekly scheduled** job (`schedule:` in `ci.yml`) that runs `npm ci && npm audit` so that a yank is detected within days rather than at the next push.

Also worth adding, because it addresses the root cause class:

```bash
npx npm-check-updates --target minor --format json   # report available upgrades
```

### Accept when

- `rm -rf node_modules && npm ci` completes with exit code 0 on a clean checkout.
- All 7 CI jobs are green.
- A scheduled dependency-integrity job exists and has run at least once.

---

## QA-REL-003 — P2 — The pre-push hook fails `npm ci` inside a git worktree

**Observed:** `npm ci` in a linked git worktree fails with

```
❌ Failed to create .git/hooks directory: ENOTDIR: not a directory, mkdir '.../.git/hooks'
npm error command failed
npm error command sh -c node scripts/setup-git-hooks.js
```

**Cause:** `scripts/setup-git-hooks.js` guards correctly for a missing `.git` directory but not for `.git` being a *file* — which is exactly what a linked worktree or a submodule checkout produces. The guard `if (!fs.existsSync(gitDir))` passes (the file exists), and the subsequent `mkdir` throws.

**Impact:** Low. It does not affect GitHub Actions (`actions/checkout` produces a real `.git` directory) and does not affect ordinary clones. It does affect contributors who use worktrees — a growing habit among people who review many branches.

**Recommendation:** make the guard type-aware rather than existence-aware:

```js
// In a linked worktree or submodule, .git is a FILE, not a directory.
// Hook installation is not possible there and not required.
if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
  console.log('⚠️ No writable .git directory (worktree or submodule). Skipping hook installation.');
  process.exit(0);
}
```

**Accept when:** `npm ci` succeeds inside a linked worktree, and the hook is still installed in a normal clone.

---

## QA-REL-004 — P3 — The live site is deployed from a branch with no CI

While `main` is in its regressed state, `.github/workflows/` contains only `deploy.yml`. The deploy workflow therefore publishes to GitHub Pages with **no typecheck, no lint, no tests, no quality gates and no build verification** — it runs `npm ci && next build` and uploads `./out`.

This is not a defect in itself (a deploy workflow does not have to duplicate CI), but it means that in the regressed state, *nothing* verifies the published artifact.

**Recommendation:** add `workflow_run` triggering — deploy only after a successful `CI` run on the same SHA — or require the `build` status check on `main` via branch protection before the deploy workflow is allowed to publish. The deploy workflow already records the SHA it built; make that check explicit.

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-REL-001 Preserve + restore `main` | **P0** | `main` points at the intended SHA; `docs/`, `project/`, `REQUIREMENTS.md`, `ci.yml` present; force-push to `main` is blocked by protection |
| QA-REL-002 Restore `npm ci` | **P0** | Clean `npm ci` exits 0; all 7 CI jobs green; weekly dependency-integrity job scheduled |
| QA-REL-003 Worktree-safe hook installer | P2 | `npm ci` succeeds in a linked worktree |
| QA-REL-004 Deploy gated on CI | P3 | A push to `main` without a green CI run cannot publish to Pages |
