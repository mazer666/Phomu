# QA-09 — Evidence Log

Every measurement in this report set, with the exact command that produced it. Re-running these commands is how you verify the findings.

---

## 0. Environment and disclosure

| Item | Value |
|---|---|
| Sandbox | Linux, 3 GB RAM, 2 CPUs |
| Node / npm | v22.19.0 / 10.9.3 |
| Next.js | 16.4.3 (Turbopack) |
| Vitest | 4.1.2 (v8 coverage) |
| ESLint | 9.39.4 |
| TypeScript | 5.9.3 |
| Audited baseline | `9639c762b544b58d187b9b80e409357a685a34c7` |
| Publication state | `main` @ `9e0a2461feb5700e824497dd84ca29367b582bac` |

**Disclosure — one deviation.** `npm ci` fails on the audited baseline because `youtube-search-without-api-key@2.0.7` was withdrawn from the npm registry (finding QA-REL-002). To obtain a working toolchain for measurement, that single devDependency was removed from the **measurement copy's** `package.json` and `package-lock.json` — **in `/workspace/repos/Phomu-measure`, never in the audited repository.** No other dependency was altered, and `ytsr` (the project's other YouTube-search dependency) was left untouched.

**Disclosure — a tool disagreement.** The `mcode-tools` GitHub connector reported pull request #10 as `merged: false`. The GitHub REST API reports `merged: true` with `merge_commit_sha: 3d3d0112…`. The API was used as the authority throughout, and every conclusion about merge state was double-checked against it.

**No file in the audited repository was modified.** The audit artefacts are in `/workspace/qa/`.

---

## 1. Repository state

```bash
git clone https://github.com/mazer666/Phomu.git /workspace/repos/Phomu
cd /workspace/repos/Phomu && git log --oneline
# 9e0a246 feat(links): Spotify- und Amazon-Music-Links fuer den Katalog aufloesen

git log --oneline | wc -l
# 1

git branch -r
#   origin/HEAD -> origin/main
#   origin/main
```

GitHub API — `main`:

```
sha:          9e0a2461feb5700e824497dd84ca29367b582bac
date:         2026-10-25T11:28:09Z
parents:      []            ← root commit, history rewritten
files:        300 (API page limit; the tree holds 1,965 blobs)
```

GitHub API — branches:

```json
[{"name": "main", "sha": "9e0a2461feb5700e824497dd84ca29367b582bac", "protected": false}]
```

GitHub API — pull request #10:

```
number: 10, state: closed, merged: true
merged_at: 2026-10-25T09:43:35Z
merge_commit_sha: 3d3d0112fc2d98f009fe2893538e944c10760e4f
commits: 1, additions: 25474, deletions: 2824, changed_files: 124
head: feature/vocument-style-docs-and-i18n @ 227d0fec
base: main @ d5b6422
```

Tree comparison — **blob level** (recursive tree API, mapping path → blob SHA):

```
main(9e0a246): 1965 blobs | pre-reform(d5b6422): 1965 blobs | last-good(9639c762): 2036 blobs

main vs d5b6422 : same path set?                True
main vs d5b6422 : files with DIFFERENT content 134   ← all under src/data/songs/
main vs d5b6422 : files only in main             0
main vs d5b6422 : files only in d5b6422          0

main vs 9639c762 : files in 9639c762 missing from main   80
main vs 9639c762 : files in main NOT in 9639c762          9   (the specifications/*.md the reform archived)
main vs 9639c762 : shared paths with different content  220
main vs 9639c762 : TOTAL PATHS AFFECTED               309
  220 changed in place: .gitignore, CONTRIBUTING.md, LLM.md, PRINTING_GUIDE.md, README.md,
  SECURITY.md, missing_covers_prompts.md, next.config.ts, package.json,
  scripts/audit-official-youtube-links.js, scripts/audit-spoilers.js,
  scripts/check-phase1-acceptance.js, …
```

**Note on method.** An earlier pass compared the trees by *path* only and concluded
`main == d5b6422`. The blob-level comparison above corrects that: the path sets match,
but 134 files differ in content. `main` is the pre-reform project **plus** the
Spotify/Amazon-Music link resolution — not a byte-for-byte rollback.

Workflow runs (Actions API, 530 total):

```
Deploy Next.js site to Pages | success | 9e0a246 | 2026-10-25T11:31:50Z | push
CI                           | success | 9639c762 | 2026-10-25T11:01:37Z | push
Deploy Next.js site to Pages | success | 9639c762 | 2026-10-25T11:01:37Z | push
CI                           | success | 3d3d0112 | 2026-10-25T09:43:37Z | push
Deploy Next.js site to Pages | success | 3d3d0112 | 2026-10-25T09:43:37Z | push
```

**Conclusion:** the live Pages site is serving a regressed build; the last coherent state ran green CI and was replaced 27 minutes later.

### 1b. The branch moved again during the audit — final state at publication

```bash
# Branches on the remote at publication time
main                          1c597a333bf0ef9eafeb324d5652b9e125fd7886
qa/assessment-2026-10-25     91f9aa1681901dced1b71f705fe06a90d4782a61
```

A second force-push happened at **13:44:09 UTC**, and the good lineage advanced by two
commits in between:

| Time (UTC) | Commit | Content |
|---|---|---|
| 13:17:08 | `be984cdc5` | *"feat(core): the shared Rust base, the bridges and the conformance proof"* — parent `9639c762` |
| 13:21:17 | `11371eb94` | *"feat(catalog): resolve Spotify and Amazon Music links for the catalogue"* — parent `be984cdc5` |
| 13:44:09 | `1c597a3` | `main` force-pushed to another orphan root commit |

Final tree comparison, blob level:

```
main (1c597a3)      : 1965 blobs   (no docs/, no ci.yml, no core/, no project/)
good (11371eb94)    : 2377 blobs
  in good, missing from main      : 421
  in main, not in good            : 9
  shared paths, content differs   : 142
  TOTAL PATHS AFFECTED            : 572
```

Both force-pushes produced a **green CI run** and a **green Pages deploy**. The regressed
state is therefore not detectable by the pipeline as it stands — see QA-REL-001.

### 1c. The Rust base (not audited — scope note)

```bash
# Crates
core/:      phomu-catalog  phomu-config  phomu-conformance  phomu-core
            phomu-errors   phomu-i18n    phomu-media
platform/:  phomu-capi    phomu-ffi     phomu-wasm
tools/:     catalog-tool   conformance-runner  media-report

find core platform -name '*.rs' | wc -l          # 101
grep -n "^  [a-z-]*:$" .github/workflows/ci.yml
  typecheck  lint  unit-tests  catalog-validation  quality-gates
  rust-core  rust-boundaries  conformance  build
```

Workspace lints (`Cargo.toml`): `unsafe_code = "deny"`, `unwrap_used = "deny"`,
`expect_used = "deny"`, `indexing_slicing = "deny"`, `panic = "deny"`, `todo = "deny"`,
`unimplemented = "deny"`.

**No `cargo` command was executed** — the sandbox has no Rust toolchain. The Rust base is
read from source only, and is explicitly outside this report's measured scope
(QA-00 § 0b, QA-09 item 2.10).

Rust files relevant to the findings:

```
core/phomu-core/tests/anti_spoiler.rs        the per-mode anti-spoiler contract
core/phomu-core/tests/round_automaton.rs      the round state machine
core/phomu-core/tests/modes.rs                per-mode behaviour
core/phomu-core/tests/cross_crate.rs          runtime crate-boundary check
core/phomu-catalog/src/selection/tests.rs     the song selection (TS twin untested)
core/phomu-catalog/src/validation/tests.rs    the catalogue validation
core/phomu-conformance/tests/conformance.rs    cross-shell agreement
```

Rust file sizes — the gate does not check `.rs`:

```
1022  core/phomu-conformance/src/runner.rs     (over the 550 hard limit)
 794  core/phomu-conformance/src/vector.rs     (over the 550 hard limit)
 398  platform/phomu-ffi/src/dto.rs
 395  platform/phomu-ffi/src/core_api.rs
 395  core/phomu-errors/src/lib.rs
 384  core/phomu-catalog/src/model.rs
 382  core/phomu-core/src/session/state.rs
```

The web shell is unchanged by the Rust base: `src/data/songs/index.ts` and all 136 pack
JSON files are still present and still bundled — **QA-SPO-001 therefore remains open.**

---

## 2. Gate results — all commands run against `9639c762`

| Command | Exit | Duration | Result |
|---|---|---|---|
| `npm run typecheck` | 0 | 29 s | green |
| `npm run lint` | 0 | 41 s | 0 errors, 1 warning (`playwright.config.ts:1`, `import/no-anonymous-default-export`) |
| `npm run test` | 0 | 11 s | **10 files / 97 tests passed**, 8.71 s |
| `npm run check:i18n` | 0 | 2 s | PASS — 0 literal texts in 48 TSX files |
| `npm run check:doc-links` | 0 | 1 s | PASS |
| `npm run check:file-size` | 0 | 0 s | PASS — **0 errors, 10 warnings**, 8 known legacy files |
| `npm run check:doc-language` | 0 | 1 s | PASS — 53 markdown files, 0 findings |
| `npm run check:all` | 0 | 2 s | 4/4 gates PASS |
| `npm run validate-songs` | 0 | 2 s | **A1.json only — 12 songs** |
| `npm run validate-catalog` | 0 | 1 s | 135 packs, 1,615 songs, 0 schema errors, 126 warnings, 0 dup groups, 4 permitted dups, 0 missing years |
| `npm run build` | 0 | 62 s | 21 static routes; ⚠ headers not applied |
| `npm run format:check` | **1** | — | **121 files fail** |
| `npm audit --omit=dev --audit-level=moderate` | 0 | — | **0 vulnerabilities** |

### 2a. `npm ci` — the blocking failure

```
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/youtube-search-without-api-key/-/youtube-search-without-api-key-2.0.7.tgz - Not found
npm error 404  'youtube-search-without-api-key@2.0.7' is not in this registry.
```

Registry state:

```
latest: 0.0.1-security
versions: ['0.0.0-stage', '0.0.1-security']
```

Consumers of the package (all manual scripts, none in `src/` or CI):

```
scripts/debug-search.js:1
scripts/fix-links.js:15
scripts/fix-youtube-links.js:24
scripts/test-providers.js:1
```

### 2b. Coverage report

```
 Test Files  10 passed (10)
      Tests  97 passed (97)
   Duration  8.71s

 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   32.33 |     34.6 |   29.41 |   33.71 |
 ai-task-queue.ts  |   78.26 |       70 |      60 |      85 |
 censor-utils.ts   |       0 |        0 |       0 |       0 |
 check-covers.ts   |       0 |        0 |       0 |       0 |
 ...ck-messages.ts |       0 |        0 |       0 |       0 |
 ...-audio-cues.ts |       0 |      100 |     100 |       0 |
 ...nd-messages.ts |       0 |      100 |       0 |       0 |
 qr-intent.ts      |   84.21 |       80 |     100 |   84.21 |
 song-picker.ts    |       0 |        0 |       0 |       0 |
 ...ong-catalog.ts |       0 |        0 |       0 |       0 |
 ...e-song-data.ts |   37.16 |    39.17 |   52.38 |   37.83 |
 ...song-limits.ts |   98.48 |     87.8 |     100 |   98.36 |
```

`vitest.config.ts` → `coverage.include: ['src/utils/**/*.ts']` — the denominator is 11 files.

### 2c. File-size gate output

```
⚠️  10 warning(s):
   src/app/admin/review/page.tsx: 863 lines — above the hard limit (550) and 108 lines more than the recorded exception state (755)
   src/app/lobby/page.tsx: 1050 lines — above the hard limit (550) and 306 lines more than the recorded exception state (744)
   src/components/game/MusicPlayer.tsx: 783 lines — above the hard limit (550) and 153 lines more than the recorded exception state (630)
   src/components/game/RevealPhase.tsx: 697 lines — above the hard limit (550) and 26 lines more than the recorded exception state (671)
   src/components/game/modes/TimelineMode.tsx: 680 lines — above the hard limit (550) and 101 lines more than the recorded exception state (579)
   src/utils/validate-song-data.ts: 817 lines — above the hard limit (550) and 315 lines more than the recorded exception state (502)
   src/app/browse/page.tsx: 767 lines — above the soft target (400) by 195 lines
   src/app/admin/songs/page.tsx: 544 lines — above the soft target (400) by 144 lines
   src/app/game/page.tsx: 521 lines — above the soft target (400) by 121 lines
   src/app/projector/page.tsx: 434 lines — above the soft target (400) by 34 lines

✅ Gate passed — 0 errors, 10 warning(s), 8 known legacy file(s).
```

**Exit code 0** with six files over the hard limit.

### 2d. Build output

```
▲ Next.js 16.4.3 (Turbopack)
⚠ Specified "headers" will not automatically work with "output: export".
✓ Running next.config.ts took 575ms
✓ Compiled successfully in 31.6s
  Finished TypeScript in 28.2s
✓ Generating static pages using 1 worker (21/21) in 1768ms
⚠ rewrites, redirects, and headers are not applied when exporting your application, detected (headers).

Route (app):  21 static routes ( /, /browse, /game, /game-over, /guide, /lobby,
                /privacy, /projector, /settings/**, /terms, /admin/review, /admin/songs )
```

**No `/admin/covers/search` and no `/admin/covers/save`** in the route list.

---

## 3. Spoiler-freeness measurements

### 3a. The catalogue chunk

```bash
ls -l out/_next/static/chunks/1tpan17-zjsj-.js
# 2845675 bytes

head -c 400 out/_next/static/chunks/1tpan17-zjsj-.js
# …i.exports=JSON.parse('{"songs":[{"id":"hiphop-tribe-ickit","title":"Can I Kick It?",
#  "artist":"A Tribe Called Quest","year":1990,…,"hints":["Aufgenommen 1989, als die drei
#  Bandmitglieder erst 18 oder 19 Jahre alt waren.",…
```

Content counts — **by parsing the payloads, not by counting string occurrences**:

```
JSON.parse payloads in the chunk            → 120
chunks in the whole build with catalogue    → 1
song entries in the bundle                  → 1557   (1557 unique ids)
  with a hints array                        → 1557
  with a lyrics object                      → 1497   (60 have empty lyrics)
real lyric lines shipped                    → 4491   (3 per song)
fake lyric lines shipped                    → 1497   (1 per song, a string)
total lyric lines shipped                   → 5988
catalogue total (validate-catalog)          → 1615 songs
  → the bundle ships 1557 of 1615 (96.4 %)
```

**Leak quantification** (independent re-implementation of the censoring rule):

```
hints total                                  7785
hints containing the artist name                3   (0.04 %)
hints containing artist or title token          3   (0.04 %)
songs whose shipped real lyrics contain a
  >=4-char token of their own title           590/1497 (39.4 %)
```

The hint corpus is effectively spoiler-free; the **lyrics payload** is the real leak.

Pages referencing the chunk:

```
out/game.html      1
out/browse.html    1
out/index.html     0
out/lobby.html     0
out/projector.html 0
out/game-over.html 0
```

### 3b. The projector is clean — measured

```bash
stat -c%s out/projector.html          # 7846 bytes
for pat in '"artist"' '"title"' '"lyrics"' '"hints"' 'spotify' 'youtube'; do
  printf "  %-12s -> %s\n" "$pat" "$(grep -o "$pat" out/projector.html | wc -l)"
done
#   "artist"     -> 0
#   "title"      -> 0
#   "lyrics"     -> 0
#   "hints"      -> 0
#   spotify      -> 0
#   youtube      -> 0
```

### 3c. Cover filenames leak the answers

```bash
ls out/covers | head -4
# -hd--jose-jose-el-triste--en-vivo-.jpg
# 2000s-alicia-keys-fallin.jpg
# 2000s-bep-feeling.jpg
# 2000s-britney-toxic.jpg

ls out/covers | wc -l
# 1649
```

### 3d. The censoring module is untested

```
censor-utils.ts | % Stmts 0 | % Branch 0 | % Funcs 0 | % Lines 0
```

No `censor-utils.test.ts` exists in the repository.

### 3e. The censoring code

`src/utils/censor-utils.ts` — `censorHint(hint, artist, title)`: tokenises artist and title, skips `SPOILER_CONFIG.IGNORE_WORDS` (which contains `DER`, `DIE`, `DAS`, `AND`, `THE`, `FEAT`, …), applies `MIN_LENGTH: 4` with an exception list of 44 short artist names, sorts tokens by descending length, uses word boundaries only for tokens shorter than 4 characters, and replaces with `[XXX]`.

`src/config/spoiler-config.ts` — `MIN_LENGTH: 4`, 44 `EXCEPTIONS`, 21 `IGNORE_WORDS`.

---

## 4. Security measurements

```bash
grep -rn "dangerouslySetInnerHTML" src | wc -l   # 0
grep -rn "innerHTML\s*=\|eval(" src | wc -l        # 0
grep -rEn ':\s*any\b|<any>|as any' src | wc -l     # 0
grep -rn '@ts-ignore' src | wc -l                  # 0
grep -rn '@ts-expect-error' src | wc -l            # 0
grep -rn '@ts-nocheck' src | wc -l                 # 0
grep -rn 'eslint-disable' src | wc -l              # 4
```

`tsconfig.json` → `"strict": true`.

Import-graph checks:

```bash
grep -rn "admin-api" src --include=*.ts --include=*.tsx | grep -v '^src/admin-api/' | wc -l
# 0
grep -rn "types/session" src | grep -v 'src/types/session.ts' | wc -l
# 0
grep -rn "fetch(" src/app/admin/ | wc -l
# 0
```

Admin API hardening (read from `src/admin-api/_lib/security.ts`):

- `timingSafeEqual` on SHA-256 digests of both tokens.
- `MIN_ADMIN_TOKEN_LENGTH = 32`; short/missing token → 503.
- `AUTH_FAILURE_LIMIT` 10 / 5 min per client; `AUTH_FAILURE_GLOBAL_LIMIT` 100 / 5 min global.
- `MAX_REDIRECTS = 3`, `MAX_IMAGE_BYTES = 5 MB`, `MAX_JSON_BYTES = 512 KB`, `DEFAULT_TIMEOUT_MS = 7000`.
- `fetchGuardedBinary` follows redirects manually and re-validates **every hop** against the allowlist.
- `readCappedBody` streams and aborts mid-body at the cap.
- `rate-limit.ts`: `MAX_TRACKED_KEYS = 10_000`, oldest-first eviction, periodic pruning.
- `save/route.ts`: lock file with `LOCK_STALE_MS = 120_000` stale detection.

`next.config.ts` defines 8 headers; `output: 'export'` means **none are delivered** (see §2d).

---

## 5. Usability and accessibility measurements

```bash
grep -rho '<img' src --include=*.tsx | wc -l              # 0  (next/image is used in SongCard.tsx)
grep -rho 'aria-label' src --include=*.tsx | wc -l         # 11
grep -rho 'role=' src --include=*.tsx | wc -l              # 0
grep -rho 'aria-live' src --include=*.tsx | wc -l          # 0
grep -rho 'tabIndex' src --include=*.tsx | wc -l            # 1
grep -rho 'onKeyDown' src --include=*.tsx | wc -l           # 1
grep -rho 'focus-visible' src --include=*.tsx --include=*.css | wc -l  # 5
grep -rn 'prefers-reduced-motion' src | wc -l              # 0
grep -rn '\.focus()' src --include=*.tsx | wc -l           # 0
```

i18n:

```bash
# leaf keys in de.json / en.json
1258 / 1258   (exactly parallel)

# literal texts
node scripts/check-i18n-completeness.mjs --count
# Total literal texts: 0
# Files checked: 48
```

Contrast ratios, computed from `src/styles/themes/*.css`:

| Theme | text / bg | text-secondary / bg | accent / bg | border / bg |
|---|---|---|---|---|
| jackbox | 18.64:1 ✅ | 9.73:1 ✅ | 5.59:1 ✅ | **2.19:1 ❌** |
| musicwall | 15.96:1 ✅ | 5.27:1 ✅ | 3.38:1 ✅ | **1.21:1 ❌** |
| spotify | 18.73:1 ✅ | 8.93:1 ✅ | 7.24:1 ✅ | **1.81:1 ❌** |
| youtube | 19.17:1 ✅ | 8.25:1 ✅ | 4.79:1 ✅ | **1.82:1 ❌** |

Text needs 4.5:1; non-text (borders, focus rings) needs 3:1.

---

## 6. Performance measurements

```bash
du -sh out          # 147M
du -sh out/covers   # 142M   (138.0 MB of file bytes)
du -sh out/_next    # 4.6M
find out -name '*.js' -exec du -ch {} + | tail -1   # 4.5M total JS
ls out/covers | wc -l                              # 1649
ls out/covers | sed 's/.*\.//' | sort | uniq -c    # 1649 jpg
```

Cover size distribution: mean 85.7 KB, median 79.0 KB, p90 128.5 KB, max 717.9 KB; 456 files over 100 KB.

---

## 7. Documentation and licensing measurements

```bash
grep -c '^### ' REQUIREMENTS.md
# 174

grep -o '^### [A-Z]*-[0-9]*' REQUIREMENTS.md | sort | uniq -d
# (empty — no duplicate IDs)

wc -l LICENSE
# 21          ← the complete GPL-3.0 text is ~674 lines

grep -rn "GPL-3.0" package.json project/project.yaml README.md LICENSE
# package.json:5:          "license": "GPL-3.0",
# project/project.yaml:38:  license: "GPL-3.0-or-later"
# README.md:10:             - **License:** GPL-3.0
# README.md:158:            GPL-3.0-or-later. See [`LICENSE`](LICENSE).
# LICENSE:21:                This project (Phomu) is licensed under GPL-3.0.
```

GitHub API: `license.spdx_id = "NOASSERTION"`, `name = "Other"`.

Stale baseline references (13):

```
ARCHITECTURE.md:5                 REQUIREMENTS.md:4        REQUIREMENTS.md:1582
ROADMAP.md:4,113,115,288,418,652  SECURITY.md:6
docs/BEST_IN_CLASS.md:8            docs/acceptance/M0-ACCEPTANCE.md:6
project/project.yaml:17
```

---

## 8. Re-verification checklist

To confirm the findings are fixed, run these in order:

```bash
# 1. Branch integrity
git ls-remote --heads origin
git ls-tree --name-only origin/main | grep -E 'docs/|project/|REQUIREMENTS.md|ci.yml'
git diff --stat origin/main origin/qa/assessment-2026-10-25

# 2. Installability
rm -rf node_modules && npm ci && echo "npm ci OK"

# 3. All gates
npm run typecheck && npm run lint && npm run test && npm run check:all
npm run build

# 4. The spoiler invariant — must print 0
grep -c '"lyrics":' out/_next/static/chunks/*.js | grep -v ':0' || echo "no lyrics in any chunk"
grep -c '"hints":'  out/_next/static/chunks/*.js | grep -v ':0' || echo "no hints in any chunk"
grep -rc 'A Tribe Called Quest' out/_next/static/chunks/ | grep -v ':0' || echo "no song titles in any chunk"
ls out/covers | grep -c -- '-' || echo "no descriptive cover filenames"

# 5. Headers — must show the CSP
curl -sI https://<host>/Phomu/ | grep -i 'content-security-policy\|strict-transport'

# 6. Licence
wc -l LICENSE        # expect ~674
grep '"license"' package.json   # expect GPL-3.0-or-later
```
