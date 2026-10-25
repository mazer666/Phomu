# ADR-0001 — Layers and Dependency Direction

**Status:** Accepted
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** NFR-001 (maintainability), GAME-001 (game flow), UI-001 (interface)

---

## Context

Phomu grew out of a single Next.js App Router project. The repository contains
77 source files today (`*.ts`/`*.tsx`) under `src/`, spread across eleven
directories: `app`, `components`, `stores`, `hooks`, `contexts`, `config`,
`types`, `utils`, `data`, `admin-api`, `i18n`.

These directories grew **historically**, they were not **designed**. The
consequence is measurable:

- `src/data/songs/index.ts:8` imports `@/types/song` — the catalogue (lowest
  layer) depends on a layer above it.
- `src/types/game-state.ts:10` imports `@/config/game-config` — the type
  contracts are no longer a leaf.
- `src/app/browse/page.tsx:8` mounts `@/components/admin/SongEditor` — an admin
  component on a public page, which additionally writes the same localStorage
  key `'phomu-admin-songs'` as the admin area (`src/app/browse/page.tsx:14` and
  `src/app/admin/songs/page.tsx:33`).
- `src/stores/game-store.ts` is with **640 lines** the largest state module and
  bundles team, timeline, audio and game logic in one file.

Without a binding direction every change is guesswork: nothing states whether
`utils` may know the store, whether `data` may import types, or whether a
component should read the store directly. The placement of constants suffers
most: **ten** keys in `src/config/game-config.ts` (`COUNTDOWN_SECONDS`,
`SPOTIFY_PREVIEW_DURATION`, `MIN_ROUNDS_TO_PLAY`, `MAX_ROUNDS_TO_PLAY`,
`FORCE_REMOVE_DUPLICATE_YEARS`, `DEFAULT_UNLOCK_METHOD`, `CARD_WIDTH_MM`,
`CARD_HEIGHT_MM`, `CARD_BLEED_MM`, `MAX_CARDS_PER_SET`) are consumed
**nowhere**, while the same values are re-implemented elsewhere in the code
(e.g. preview duration 30 s in
`src/components/game/modes/HintMasterMode.tsx:132`).

---

## Decision

### 1. Five layers, arrows point downwards

Phomu gets five layers. A file may only import layers that lie **below** it.
Imports between layers of the same level are allowed as long as they form no
cycles.

| Layer | Directories | Role |
|---|---|---|
| **L1** | `src/app/**` | Routes, page orchestration, guards |
| **L2** | `src/components/**` | Presentation and interaction, no game logic |
| **L3** | `src/stores/**`, `src/hooks/**`, `src/contexts/**` | State store, side effects, context |
| **L4** | `src/config/**`, `src/types/**`, `src/utils/**` | Constants, contracts, pure logic |
| **L5** | `src/data/**` | Catalogue — lowest layer |

```text
app  →  components  →  stores/hooks/contexts  →  config/types/utils  →  data
```

### 2. Two cross-cutting axes

- **`src/admin-api/**`** is its own axis. It is consumed exclusively by L1
  (or by nobody). It may know neither store nor components nor the catalogue.
- **`src/i18n/**`** is its own axis. It may be consumed from L1 to L4, never
  from L5.

### 3. `types/` is a leaf

`src/types/**` imports nothing outside `src/types/`. The contracts defined in
`src/config/game-config.ts` (`GameMode`, `MusicProvider`, `Difficulty`,
`ThemeName`, `TeamMode`, `UnlockMethod`, `Language`) move to `src/types/`; the
configuration imports them from there. This removes the chain `config → types`
and the direction `types → config`.

### 4. `data/` is the leaf

`src/data/**` imports nothing outside `src/data/`. The generated loader
`src/data/songs/index.ts` must not import the type `PhomuSong`; the typing of
the catalogue happens at the call site (`src/utils/song-picker.ts`).
`src/data/packs/index.ts` (legacy proxy) is removed.

### 5. `src/config/` is the only source for constants

Constants that more than one file needs live in `src/config/`. The store reads
its defaults from `PHOMU_CONFIG`; no component contains magic numbers for
points, time limits, limits, IDs or paths. The legacy proxy
`src/data/packs/index.ts` and the duplicated local palettes (`TEAM_COLORS` in
`src/stores/game-store.ts:29`, `CURATED_TEAM_COLORS` in
`src/app/lobby/page.tsx:48-55`, `PLAYER_COLORS` in `src/app/lobby/page.tsx:26`)
are merged.

### 6. Deviations are measured, not estimated

The import graph is determined by a script over all `import`/`export … from`
and `import()` statements (resolution via `@/*` → `src/*` and relative paths).
Every deviation from the desired direction is tracked in `ARCHITECTURE.md` §3.3
with **file and line**.

### 7. File sizes

Target **≤ 400 lines** per source file, **maximum 550 lines**. The limit
applies to `*.ts` and `*.tsx` under `src/`. The gate
`scripts/check-file-size.mjs` is implemented and run in CI.

---

## Consequences

### Positive

- The import graph becomes checkable: a script can test edges against the
  layer rule without a human having to understand the structure.
- `src/config/` becomes the real single source: the ten unused keys are either
  consumed or removed, and values such as the preview duration exist only once.
- `types/` and `data/` become testable without mocking: they need neither
  React nor the store nor the catalogue.
- The file size limit stops depending on chance and becomes a property:
  `RevealPhase.tsx` (671 lines) is split into six reveal cards plus a text
  catalogue, `game-store.ts` (640 lines) into team, timeline and session
  actions.
- The coupling between the public browse page and the admin area disappears;
  `SongEditor` gets a neutral home.

### Negative / Trade-offs

- **Short-term effort:** Splitting the seven files over 550 lines
  (`src/app/admin/review/page.tsx` 755, `src/app/lobby/page.tsx` 744,
  `src/components/game/RevealPhase.tsx` 671, `src/stores/game-store.ts` 640,
  `src/components/game/MusicPlayer.tsx` 630,
  `src/components/game/modes/TimelineMode.tsx` 579, `src/app/browse/page.tsx` 572)
  is pure refactoring work without visible product benefit.
- **One more import per step:** Moving the types from
  `src/config/game-config.ts` to `src/types/` touches **19 consumers**
  (`grep -rl "config/game-config" src` → 20 hits, of which
  `src/config/game-config.ts` itself is one).
- **The generated loader becomes clumsier:** Without a type import
  `src/data/songs/index.ts` needs a type that is either declared locally or
  fetched via `import type` from L4 — the latter contradicts the rule.
- **One more gate in CI:** `check-file-size.mjs` must run, otherwise the limit
  is not binding.

### What the decision makes impossible

- `src/data/**` can no longer use types from `src/types/**` — the typing moves
  to the call site.
- `src/types/**` can no longer reference values from `src/config/**` —
  contracts and values are separated.
- `src/components/**` can no longer read the server state directly; the only
  path leads through L3.
- `src/config/**` can no longer import pages, components or stores.

---

## Rejected alternatives

- **Free layers without a direction rule** (status quo). *Rejected:* The
  measured graph shows that the freedom has already led to three concrete
  boundary violations (`data → types`, `types → config`,
  `app → components/admin`).
- **Only `app` and `components` as layers, the rest one level.** *Rejected:*
  `stores`, `hooks` and `contexts` have different access rights (write vs. read
  only) — a common level allows the hook to write the store.
- **Database or Supabase Realtime sync instead of a pure client store.**
  *Rejected for now:* `src/types/game-state.ts:5-7` already names Supabase
  Realtime as a plan, but `next.config.ts:4` sets `output: 'export'` — a
  static export has no server route. The sync is a separate decision (see
  ADR-0002) and is not pre-empted.
- **Components may import the store directly** (status quo in
  `src/components/game/DrawingPhase.tsx:12`). *Rejected:* Read access to the
  store is better verifiable via L3 hooks; the existing direct use is a one-off
  and can be converted.

---

## Verification

| Check | Command / Location |
|---|---|
| Measure the import graph | Script over `src/**/*.ts{,x}` (resolution `@/*` → `src/*`), result in `ARCHITECTURE.md` §3.2 |
| Check direction deviations | `ARCHITECTURE.md` §3.3 — the list must be empty when all deviations are fixed |
| File size gate | `npm run check:file-size` (new: `scripts/check-file-size.mjs`) — target ≤ 400, maximum 550 |
| Configuration single source | `grep -rn "PHOMU_CONFIG\." src` — no key may remain without a consumer |
| Types leaf | `grep -rn "from '@/config" src/types` → 0 hits |
| Data leaf | `grep -rn "from '@/" src/data` → 0 hits |
