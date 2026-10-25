# QA-07 — Performance & Delivery

**Severity of the findings in this report:** P1, P2, P2, P3
**Area:** Payload size, build cost, and what a player on a phone or a TV actually has to download.

---

## 1. Measured baseline

| Metric | Value |
|---|---|
| Static export size (`out/`) | **147 MB** |
| `out/covers` | **142 MB** — 1,649 files |
| `out/_next` (all JS/CSS) | 4.6 MB — **4.5 MB of it JavaScript** |
| Largest JS chunk | **2,845,675 bytes (2.8 MB)** — the catalogue |
| Largest cover image | 718 KB |
| Median cover image | 79 KB |
| Mean cover image | 86 KB |
| 90th percentile cover image | 129 KB |
| Covers over 100 KB | 456 of 1,649 (28 %) |
| Cover formats | 1,649 × `.jpg`, no WebP/AVIF |
| Next.js image optimisation | **disabled** (`images: { unoptimized: true }`) |
| Build time | 31.6 s compile + 28.2 s typecheck + 1.8 s page generation ≈ **62 s** |
| Static routes generated | 21 |
| `basePath` | `/Phomu` |

---

## QA-PERF-001 — P1 — 147 MB of static assets, 142 MB of it album art

### What I measured

```
$ du -sh out/*
142M  out/covers
4.6M  out/_next
207K  out/settings
82K   out/admin
64K   out/apple-icon.png
46K   out/audio
```

`out/covers` holds **1,649 JPEG files** totalling **138 MB** (142 MB on disk with block overhead), with a median of 79 KB and a maximum of 718 KB. `images: { unoptimized: true }` in `next.config.ts` means Next.js performs **no** resizing, re-encoding or format negotiation — the original bytes are what the browser downloads.

### Why this matters concretely

**For the player, the cost is bounded.** A player never downloads the covers directory: the game fetches one cover per round. The 142 MB is a *deployment* and *first-visit* cost, not a per-round cost. That is the mitigating factor and it should be stated plainly — this is not a "the game is slow to start" finding.

**But it is still three real problems:**

1. **Repository and deployment weight.** The repo carries 142 MB of binary assets in version control. `git clone` downloads all of it on every clone; every CI run checks it out; the GitHub Pages deployment uploads it on every push. The repository is already at 138 MB on GitHub's counter — and GitHub warns at 1 GB. For a project that is explicitly heading for **eight platforms** (web, Android, TV, macOS/Linux, iPadOS, Windows), each with its own asset pipeline, a 142 MB blob directory in the source tree is a serious scaling problem.

2. **First-visit cost on a phone.** The catalogue chunk (2.8 MB) and the first cover are on the critical path. A player joining a party game on a mobile connection in a bar — a realistic scenario for this product — pays for the 2.8 MB chunk plus a cover of up to 720 KB **before the first question appears**.

3. **No format negotiation.** 1,649 JPEGs, zero WebP/AVIF. A modern browser can typically render a WebP at 40–60 % of the JPEG size at equal quality. At 142 MB, that is 60–85 MB of avoidable transfer.

### Concrete recommendation

**Three independent measures — apply all three.**

**(a) Move the covers out of the repository into a separate asset store.**

```
public/covers/            →  cdn.phomu.example/covers/<opaque-id>.jpg
```

with the mapping living in the catalogue (server-side, per QA-SPO-001). The repository then contains code and metadata, not 142 MB of binaries. This is the single highest-value change in this report.

**(b) Generate multiple derivatives and serve them with `srcset`.**

For each cover, produce a ladder — e.g. 160 / 320 / 640 / 1280 px — in WebP (and JPEG as a fallback). A phone at 320 px downloads ~10–25 KB instead of 79 KB.

`next/image` is already in use in `src/components/browse/SongCard.tsx`, but `images: { unoptimized: true }` disables its optimisation entirely. Either turn optimisation on (which requires a server deployment — QA-SEC-001) or generate the ladder at build time with a script (`sharp` is the usual choice) and reference it explicitly.

**(c) Use opaque, content-addressed filenames.**

`out/covers/8f3a1c9e2b.jpg` instead of `out/covers/2000s-britney-toxic.jpg`. This closes QA-SPO-002 (the filename leak) and enables immutable, long-lived CDN caching (`Cache-Control: public, max-age=31536000, immutable`) — the filename no longer changes when the underlying image is replaced.

**Accept when**

- The repository no longer contains the cover binaries (or contains only small, generated thumbnails).
- The deployed cover payload for one round is under 60 KB on a mobile connection.
- `curl -sI` on a cover returns a `Content-Type` of `image/webp` for a WebP-capable client, or a `srcset` is present.
- Cover filenames contain no artist or title.

---

## QA-PERF-002 — P2 — The 2.8 MB catalogue chunk sits on the critical path

### What I measured

The 2,845,675-byte chunk is referenced by:

| Page | Loads the catalogue chunk |
|---|---|
| `/game` | **yes** |
| `/browse` | **yes** |
| `/` , `/lobby`, `/projector`, `/game-over` | no |

2.8 MB of **uncompressed JSON** is roughly 1 MB gzipped over the wire — still the largest single asset a player downloads, and it is downloaded *before* the first question.

The reason is structural: `src/data/songs/index.ts` aggregates all 136 song files, and every consumer receives all 1,557 entries.

### Concrete recommendation

This is the same fix as QA-SPO-001, viewed as a performance problem: **serve the catalogue per round from an API, not as a bundle.**

The measurable target:

| Metric | Today | Target |
|---|---|---|
| Bytes before the first question | 2.8 MB (chunk) + cover | < 200 KB (one round) + cover |
| Catalogue data in the client bundle | 1,557 songs | 0 |

A secondary, cheap win if the API route is not taken immediately: **split the catalogue per pack** and load only the selected pack (≈12–40 songs). The `PackSelector` already knows which pack the user chose, and the catalogue is organised in packs. This alone would cut the catalogue payload by roughly an order of magnitude — and it is a small change to `src/data/songs/index.ts`.

**Accept when**

- No chunk on the `/game` critical path exceeds 500 KB.
- The catalogue data is either absent from the bundle or scoped to one pack.
- The first-question time is measured and filed (see QA-PERF-003).

---

## QA-PERF-003 — P3 — Nothing in the project is measured for performance

`QUALITY.md` §3 requires:

> *"Never write 'fast' without a measurement. Without a measurement it says 'not measured'."*

The project sets that rule for itself and then does not apply it. I searched for performance measurement in the repository and found:

- No Lighthouse / Web Vitals configuration.
- No bundle-size budget.
- No performance job in `ci.yml`.
- No performance figures in `REQUIREMENTS.md`, `QUALITY.md` or `project/project.yaml`.

The `QUALITY.md` gate even leaves a blank: its own acceptance table records `npm run build | not measured in this round`.

### Concrete recommendation

**Add a performance budget to CI.** The simplest form that gives real value:

```yaml
  performance-budget:
    name: Bundle budget
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npm run build
      - name: Check bundle budget
        run: node scripts/check-bundle-budget.mjs
```

```js
// scripts/check-bundle-budget.mjs
// Fails when a route's total transferred JS exceeds its budget.
const BUDGETS = {
  '/':        { js: 400 * 1024 },
  '/lobby':   { js: 500 * 1024 },
  '/game':    { js: 800 * 1024 },
  '/browse':  { js: 800 * 1024 },
  '/projector': { js: 300 * 1024 },
};
```

The budgets are gzipped sizes and are deliberately set **above** today's values minus the catalogue fix, so the job is green on day one and then ratchets down.

**Add three user-facing metrics** to the milestone evidence, measured on a reference device (a mid-range Android phone is the realistic target for this product):

| Metric | Target | Why this metric |
|---|---|---|
| **Time to first question** (lobby → playable) | < 2 s on 4G | The moment a party starts waiting |
| **Cover-to-prompt latency** | < 500 ms | Between the cover appearing and the first hint |
| **Frame rate during a round** | ≥ 50 fps on a mid-range device | `framer-motion` animations run during the answer phase |

Also add a Lighthouse run against the deployed URL (not `next dev`) and file the result with the milestone, so the numbers in `QUALITY.md` §3 become real.

**Accept when**

- A bundle-budget job exists in CI and is green.
- Three user-facing performance measurements are recorded for at least one milestone, on a named reference device.
- `QUALITY.md` §3 no longer contains "not measured".

---

## QA-PERF-004 — P3 — Build cost and the 62-second pipeline

Measured build stages: compile 31.6 s, TypeScript 28.2 s, page generation 1.8 s — **≈ 62 s** for a static export with 21 routes.

That is acceptable. Two observations for the future, both tied to the platform roadmap:

1. **The TypeScript step (28.2 s) runs inside `next build` and separately as the `typecheck` CI job.** That is a duplicated 28 s on every push. Once the project has a Next.js server deployment (QA-SEC-001), the separate `typecheck` job can be dropped from the per-push path and kept on `pull_request` only — or the build's typecheck can be disabled in favour of the dedicated job, since they run the same compiler.

2. **The static export re-renders every route on every build.** With the catalogue served from an API and the covers moved to a CDN, the export shrinks to a handful of route shells, and the build cost drops with it. This is a nice side effect of the QA-SPO-001 / QA-PERF-001 work rather than a separate task.

---

## QA-PERF-005 — P3 — Image delivery has no modern format or dimension strategy

`images: { unoptimized: true }` combined with 1,649 original JPEGs means:

- No `srcset`, so a phone downloads the full-resolution image. (`next/image` is used in `src/components/browse/SongCard.tsx`, but `unoptimized: true` disables exactly the optimisation that would have produced the size ladder.)
- No WebP/AVIF, so no format negotiation.
- The remaining surfaces render covers as CSS backgrounds or custom elements, so the browser cannot reserve layout space before the image loads. That produces layout shift as covers appear — directly visible as a jitter in the round card.

**Recommendation:** when the covers move behind the CDN (QA-PERF-001), serve them through `next/image` with `deviceSizes` configured for the real display sizes, or emit explicit `srcset`/`sizes` attributes. If the covers are CSS backgrounds, at minimum set an `aspect-ratio` on the container so the layout does not shift.

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-PERF-001 Move covers out of the repo, add WebP + srcset | **P1** | The repository holds no cover binaries; a round's cover payload is < 60 KB; opaque filenames |
| QA-PERF-002 Remove the catalogue from the bundle | P2 | No chunk on the `/game` path exceeds 500 KB; the catalogue is scoped per round or per pack |
| QA-PERF-003 Measure performance, add a budget | P3 | A bundle-budget CI job exists; three user-facing metrics are recorded for a milestone |
| QA-PERF-004 Remove the duplicated typecheck | P3 | The CI pipeline runs the TypeScript compiler once per push |
| QA-PERF-005 Image format and dimension strategy | P3 | `srcset`/`sizes` or `next/image` is used; no layout shift when a cover loads |
