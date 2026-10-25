# Phomu — Architecture

**Document version:** 1.0
**Status:** Accepted — binding baseline for code reviews
**Measurement date:** 2026-10-25, branch `feature/vocument-style-docs-and-i18n`
**Change rule:** Every deviation from the boundaries described here requires an
ADR in `docs/adr/`. Every boundary that changes additionally requires an
adjustment to `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`.

> **Language rule:** This document is in English. Code identifiers (`PHOMU_CONFIG`,
> `useGameStore`, `RoundPhase`, `assertAdminAccess`) remain English.
> The numbers in this document are measured, not estimated — the commands are
> in the respective section.

---

## 1. Overview

Phomu is a hybrid music party game: **physical QR cards** and a
**digital web app** describe the same game flow. A smartphone is passed
around during the round (mode `pass-the-phone`), the projector shows the
state-equivalent, spoiler-free projection in parallel (`/projector`), and the
party session itself lives entirely in the player's browser.

The product has six game modes (`timeline`, `hint-master`, `lyrics`,
`vibe-check`, `survivor`, `cover-confusion`), a statically exported
Next.js 16 App Router stack, a Zustand store with `persist` middleware and
a local song catalogue made of JSON files.

### Technical base (measured on 2026-10-25)

| Aspect | Value | Source |
|---|---|---|
| Framework | Next.js `^16.2.1` (App Router, `output: 'export'`) | `package.json`, `next.config.ts:4` |
| UI | React `^19.2.4`, Tailwind 4, Framer Motion | `package.json` |
| State management | Zustand `^5.0.12` + `persist` (localStorage) | `src/stores/game-store.ts:195-640` |
| Types | TypeScript strict, path alias `@/*` → `./src/*` | `tsconfig.json` |
| i18n | i18next `^26.0.2` + react-i18next `^17.0.1` | `src/i18n/config.ts` |
| Tests | Vitest (`src/**/*.test.ts`), Playwright (E2E) | `vitest.config.ts` |
| Source code | 77 files (`*.ts`/`*.tsx`) under `src/` | `find src -type f \( -name "*.ts" -o -name "*.tsx" \) \| wc -l` |

### Areas

| Area | Path | Task in one sentence |
|---|---|---|
| **App** | `src/app/**` | Routes, page orchestration, guards, server/client boundary |
| **Components** | `src/components/**` | Presentation and interaction; no game logic |
| **Store** | `src/stores/game-store.ts` | The only writing state holder of the party session |
| **Hooks** | `src/hooks/useGameAudioCues.ts` | Side effects that only read the store |
| **Contexts** | `src/contexts/ThemeContext.tsx` | UI theme, orthogonal to the game state |
| **Config** | `src/config/**` | **The only** source for constants, defaults and enums |
| **Types** | `src/types/**` | Data contracts without behaviour |
| **Utils** | `src/utils/**` | Pure logic: selection, censorship, feedback, validation |
| **Data** | `src/data/**` | Song catalogue (JSON), pack metadata — lowest layer |
| **Admin-API** | `src/admin-api/**` | Server-side admin endpoints with a token gate |
| **i18n** | `src/i18n/**` | Language resources and i18next bootstrap |

---

## 2. Layers and dependency direction

### 2.1 Desired direction (binding)

Arrows point **downwards**. A module may only import layers that lie
**below** it. Dependencies within the same layer (e.g. `components` →
`components`) are allowed as long as they do not form cycles.

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ L1  app/          Routes, page orchestration, guards, layout                   │
│     src/app/{lobby,game,game-over,browse,settings,admin,projector,guide,…}     │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  measured: 21×components · 11×stores · 7×types · 3×data
                 │             3×config · 2×utils · 1×hooks · 1×app
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L2  components/   Presentation, interaction, mode widgets, overlays              │
│     src/components/{game,game/modes,lobby,browse,admin,ui}, Providers.tsx       │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  measured: 14×types · 13×utils · 10×config · 7×stores
                 │             3×contexts · 13×components · 1×i18n
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L3  stores/ + hooks/ + contexts/                                             │
│     Zustand, side effects, UI context — writes and reads the game state        │
│     src/stores/game-store.ts · src/hooks/useGameAudioCues.ts ·                  │
│     src/contexts/ThemeContext.tsx                                             │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  measured: stores→3×types, 1×config · hooks→1×config, 1×utils
                 │             contexts→1×config
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L4  config/ + types/ + utils/                                                 │
│     Constants · data contracts · pure logic (no React, no store)               │
│     src/config/{game-config,spoiler-config,song-year-range}.ts                 │
│     src/types/{game-state,player,song,session,music-provider}.ts               │
│     src/utils/{song-picker,censor-utils,feedback-messages,last-round-messages} │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  measured: utils→5×config, 3×types, 1×data, 1×utils
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L5  data/         Catalogue: pack JSON + pack metadata — lowest layer          │
│     src/data/songs/*.json + src/data/songs/index.ts + src/data/packs/index.ts  │
└────────────────────────────────────────────────────────────────────────────────┘

  ══════════════════════════ Cross-cutting axes ═══════════════════════════

  admin-api/   Server-only. Consumer: only L1 (app) — or nobody.
                Contains: _lib/security.ts (auth gate, input validation),
                admin/covers/search/route.ts, admin/covers/save/route.ts.
                Must NOT: mutate the store, React components or the catalogue
                on the client.

  i18n/        Language resources + i18next bootstrap.
                config.ts initialises, locales/{de,en}.json hold the values.
                May be consumed by L1–L4, never by L5 (data).
```

**Rule of thumb:** A module in L4 or below must **never** import `app/`,
`components/`, `stores/`, `hooks/`, `contexts/` or `admin-api/`.
A module in L5 (`data/`) may only import `data/`.

### 2.2 Area table with actual status (measured)

"Actual status (measured)" names the actually measured edges and whether they
fit the desired direction. Basis: a script over all `import`/`export … from`
and `import()` statements in `src/**/*.ts{,x}` (without test files), resolution
via `@/*` → `src/*` and relative paths.

| Area | Responsibility | may depend on | must NOT depend on | Actual status (measured) |
|---|---|---|---|---|
| **app** | Page orchestration, guards, routing, layout metadata | components, stores, hooks, contexts, config, types, utils, data | admin-api internals, raw i18n data | **Compliant.** 21×components, 11×stores, 7×types, 3×data, 3×config, 2×utils, 1×hooks, 1×app. No upward/lateral violation. ⚠ `src/app/browse/page.tsx:8` mounts `@/components/admin/SongEditor` — boundary violation, see §5.3 |
| **components** | Presentation, interaction, mode widgets | stores, hooks, contexts, config, types, utils, i18n, components | app, admin-api, catalogue internals | **Compliant.** 14×types, 13×utils, 10×config, 7×stores, 3×contexts, 13×components, 1×i18n. No import from `app/` or `admin-api/` |
| **stores** | The only writing state holder (`persist` → localStorage) | config, types | app, components, hooks, contexts, utils, data, admin-api | **Compliant.** 3×types (`game-state`, `player`, `song`), 1×config. No UI or catalogue dependency |
| **hooks** | Reading side effects (audio cues) | config, types, utils | app, components, stores, data, admin-api | **Compliant.** 1×config (`game-config`), 1×utils (`game-audio-cues`) |
| **contexts** | UI theme (orthogonal to the game) | config | app, components, stores, utils, data | **Compliant.** 1×config (`game-config`) |
| **config** | Constants, defaults, enums — the single truth | types | app, components, stores, hooks, contexts, utils, data | **Compliant.** **0 imports** — `src/config/game-config.ts` imports nothing (`grep -n "^import" src/config/game-config.ts` → 0 hits). ⚠ 10 declared values are consumed nowhere, see §8 |
| **types** | Data contracts without behaviour | — (leaf) | everything outside `types/` | **1 deviation.** `src/types/game-state.ts:10` imports `@/config/game-config` — horizontal instead of downwards. `types/` is therefore no longer a leaf |
| **utils** | Pure logic without React/store | config, types, data | app, components, stores, hooks, contexts, admin-api | **Compliant.** 5×config, 3×types, 1×data (`song-picker.ts:4` → `@/data/songs`), 1×utils. ⚠ Binding to the full-data import, see §5.3 |
| **data** | Song catalogue + pack metadata | data | config, types, utils, stores, components, app | **1 deviation.** `src/data/songs/index.ts:8` imports `@/types/song` — **dependency upwards**. `data/` is therefore not the lowest layer |
| **admin-api** | Server endpoints, auth gate, input validation | admin-api | stores, components, app, data, config | **Compliant in the structure** (2×admin-api), ⚠ but **0 consumers** — see §6.1 |
| **i18n** | i18next bootstrap + language resources | i18n | app, components, stores, config, data | **Compliant.** 2×i18n (config → `locales/de.json`, `locales/en.json`), 1 consumer (`src/components/Providers.tsx:20`). ⚠ Only 4 components consume `useTranslation`, see §6.2 |

---

## 3. Measured import graph

### 3.1 Measurement command

```bash
# Determine the edges between files (alias @/* → src/*, relative paths, also import()).
# IMPORTANT: comments must be removed first — otherwise the
# example import in the header comment of src/stores/game-store.ts:8 counts as an edge.
find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.ts" ! -name "*.test.tsx" \
  | xargs grep -hoE "(import|export)[^;]*from '[^']+'|import\('[^']+'\)" \
  | grep -oE "'[^']+'" | tr -d "'" | sort -u
```

The executed script (Node, `readFileSync` + regex over `import`/`export … from`
and `import()`), resolution relative and via the alias `@/*` → `src/*`.
**Block and line comments are removed before the evaluation.**

> **Measurement note:** In the naive run (without comment removal) two
> phantom edges arise that do not exist in reality:
> `config → config` (from the example import in the header comment
> `src/config/game-config.ts:6`) and `stores → stores` (from
> `src/stores/game-store.ts:8`). The numbers in §3.2 are the **cleaned** ones.

### 3.2 Area edges (aggregated, number of file→file imports)

```text
admin-api    -> admin-api(2)
app          -> app(1), components(21), stores(11), types(7), data(3), config(3), utils(2), hooks(1)
components   -> components(13), types(14), utils(13), config(10), stores(7), contexts(3), i18n(1)
config       -> (no imports)
contexts     -> config(1)
data         -> data(137), types(1)
hooks        -> config(1), utils(1)
i18n         -> i18n(2)
stores       -> types(3), config(1)
types        -> types(4), config(1)
utils        -> config(5), types(3), data(1), utils(1)
```

Single edges that matter for the classification:

```text
src/utils/validate-song-catalog.ts:16   ->  src/utils/validate-song-data.ts   (the only utils→utils edge)
src/app/layout.tsx:4                    ->  src/app/globals.css                (the only app→app edge)
src/data/songs/index.ts:11-145          ->  136 pack JSON files                 (data→data)
src/i18n/config.ts:11-12                ->  src/i18n/locales/{de,en}.json       (i18n→i18n)
```

### 3.3 Deviations from the desired direction

**A1 — `data/` imports `types/` (direction break, upwards)**

```text
src/data/songs/index.ts:8   import type { PhomuSong } from '@/types/song';
```

`src/data/` is the lowest layer (L5) in §2.1 and may only import
`data/`. Through the type import the catalogue is attached to L4 and the
layer boundary is broken.

*Canonical solution:* `PhomuSong` stays in `src/types/song.ts` (the type definition
is correct there), but the catalogue loader must not import the type.
Options: (a) keep `PhomuSong` **in content** in L5 via `import type` and
re-export it to L4, (b) write the loader as a generic function without
`PhomuSong` reference (`getSongsForPacks` yields `unknown[]`, the typing
happens in `src/utils/song-picker.ts`). Decision open, see
`/workspace/workers/architecture-deliverable.md` → *Open architecture decisions*.

**A2 — `types/` imports `config/` (horizontal instead of downwards)**

```text
src/types/game-state.ts:10   import type { GameMode, MusicProvider, Difficulty } from '@/config/game-config';
```

`src/types/` should be a leaf without dependencies. Through the import a
cycle risk is structurally possible (`config` ↔ `types`) and the
layer rule "L4 consists of three siblings that do not know each other"
no longer holds.

*Canonical solution:* The three types (`GameMode`, `MusicProvider`, `Difficulty`)
belong in `src/types/` (they are contracts, not values); `src/config/game-config.ts`
then imports them from `src/types/` — a direction that exists and keeps the
chain acyclic. `src/config/game-config.ts` currently imports **nothing at all**
(`grep -n "^import" src/config/game-config.ts` → 0 hits) and is
therefore the only place where the direction can be reversed without conflict.

**A3 — the public page mounts an admin component (functional boundary)**

```text
src/app/browse/page.tsx:8   import { SongEditor } from '@/components/admin/SongEditor';
```

Directionally permitted (`app` → `components`), but the **public**
browse page thus uses the **admin** component and shares the same
localStorage key with the admin area (`'phomu-admin-songs'`, see
`src/app/browse/page.tsx:14` and `src/app/admin/songs/page.tsx:33`). Thus a
normal browse visit can overwrite the admin state.

*Canonical solution:* Move `SongEditor` to a neutral place
(`src/components/browse/SongEditor.tsx`) and let the admin area reference it,
or define a shared store key in `src/config/`.

**A4 — `admin-api/` has no consumer**

```text
src/admin-api/admin/covers/search/route.ts:3   import { assertAdminAccess, … } from '@/admin-api/_lib/security';
src/admin-api/admin/covers/save/route.ts:5     import { assertAdminAccess, … } from '@/admin-api/_lib/security';
```

The import graph contains **no** edge from `app/`, `components/` or another
area to `admin-api/`. Additionally there is **no** file
`src/app/**/route.ts` (`find src/app -name "route.ts" \| wc -l` → `0`), and
`next.config.ts:4` sets `output: 'export'`. The two route handlers are
therefore currently **not reachable**; there is also no client call
(`grep -rn "x-admin-token" src` hits only `security.ts` and the
two `route.ts`). See §6.1.

### 3.4 Notable but compliant couplings

| Coupling | File | Assessment |
|---|---|---|
| `utils` → `data` (full catalogue) | `src/utils/song-picker.ts:4` | Permitted (downwards). But it binds every use of `song-picker` to the complete catalogue import (`src/data/songs/index.ts` imports 136 JSON files) |
| `data` → `data` (136 JSON imports) | `src/data/songs/index.ts:11-145` | Technically necessary; according to the header `src/data/songs/index.ts:1-6` the loader is **generated** by `scripts/migrate_and_deduplicate.py` and must not be maintained by hand |
| Legacy proxy without its own boundary | `src/data/packs/index.ts:7` → `export * from '@/data/songs'` | Re-exports the catalogue completely; every import of `@/data/packs` receives the full data set |
| `data` → `types` | `src/data/songs/index.ts:8` | See A1 |

---

## 4. Gameplay data flow

### 4.1 State holders

| State | Holder | Lifetime | Persistence |
|---|---|---|---|
| Party session (players, teams, config, round, phase, points, XP) | `useGameStore` (Zustand + `persist`) | Browser session | **localStorage**, key `phomu-game-state` (`src/stores/game-store.ts:619`) |
| Current song, answers, reveal phase | `useGameStore` (volatile) | Round | **not** persisted — `partialize` (`:621-637`) does not list `currentSong`, `currentAnswers`, `roundPhase`, `roundHistory` |
| Projector score state | `useGameStore` → localStorage → `/projector` | Device | localStorage; the projector tab polls every 2 s (`src/app/projector/page.tsx:41-44`) |
| Theme | `ThemeContext` | Session | localStorage, key `phomu-theme` (`src/contexts/ThemeContext.tsx:27`) |
| Admin song changes | **no store** — directly in localStorage | Session | localStorage, key `phomu-admin-songs` (`src/app/admin/songs/page.tsx:33`, `src/app/browse/page.tsx:14`) |
| Review changes | **no store** — directly in localStorage | Session | localStorage, key `phomu-review-edits` (`src/app/admin/review/page.tsx:28`) |
| Language | i18next `LanguageDetector` | Session | localStorage (`src/i18n/config.ts:26-29`) |

> **Persistence boundary:** `persist.partialize` (`src/stores/game-store.ts:621-637`)
> is the only place that determines what survives a reload. The song and
> the answers of the running round do **not** survive — after a reload
> the party session starts in `drawing` without a song. This is intended (no
> spoiler breakthrough on reload) and is recorded in ADR-0002.

### 4.2 Round phase sequence

```text
  /lobby  (Wizard, 5 steps)
     │  Players+teams, modes, packs, end condition
     │  → useGameStore.startGame()  [game-store.ts:255]
     ▼
  ┌──────────────────────── drawing ────────────────────────┐
  │ DrawingPhase [components/game/DrawingPhase.tsx]         │
  │  pickRandomSong({playedIds, selectedPacks, difficulty,   │
  │                  onlyQRCompatible, currentMode})         │
  │  [utils/song-picker.ts:28]                               │
  │  → onCardDrawn(song) → drawSong(song)                    │
  │    [game-store.ts:394] set currentSong, roundPhase=      │
  │    'question', playedSongIds += song.id                  │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  ┌─────────────────────── question ────────────────────────┐
  │ QuestionPhase [components/game/QuestionPhase.tsx]        │
  │  → Mode widget (Survivor/Vibe/Hint/Timeline/Lyrics/      │
  │    CoverConfusion) → MusicPlayer (blurred)                │
  │  Anti-spoiler: music plays, image blurred. Title/artist   │
  │  are NOT rendered in 5 of 6 modes; exception:             │
  │  vibe-check (VibeCheckMode.tsx:99/:116-118).               │
  │  onAnswer(isCorrect, points, seconds) → submitAnswer +  │
  │  awardPoints [game-store.ts:444/451]                     │
  │  onReveal() → advancePhase('reveal')                     │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  ┌──────────────────────── reveal ─────────────────────────┐
  │ RevealPhase [components/game/RevealPhase.tsx]            │
  │  6 mode-specific reveal cards (each with its own         │
  │  function), score overview, power user menu               │
  │  QuestionPhase stays mounted (display:none), so that the  │
  │  YouTube iframe does not restart [app/game/page.tsx:      │
  │  404-431]                                                 │
  │  onNextRound() → nextRound() [game-store.ts:278]          │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  ┌─────────────────────── scoring ─────────────────────────┐
  │ endGame() [game-store.ts:379] sets isGameOver=true,       │
  │ roundPhase='scoring', adds sessionXP to totalXP           │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  /game-over  [app/game-over/page.tsx] → Podium, ranking, XP
```

### 4.3 Scoring

| Step | Location | Rule |
|---|---|---|
| Base points | Mode widget | `HINT_MASTER_POINTS` (`src/config/game-config.ts:310`) or mode-specific values |
| Time deduction | `src/app/game/page.tsx:131-136` | `timeDecayEnabled` → `max(minPointsPerCorrect, base − steps × stepPoints)`; `steps = floor((overrun − grace) / stepSeconds)` |
| Awarding | `awardPoints` (`src/stores/game-store.ts:451-476`) | adds to player **and** team, clamped at `Math.max(0, …)` |
| Override | `handleOverrideCorrect` (`src/app/game/page.tsx:197-210`) | points ≥ `minPointsPerCorrect`; the governance state `overrideGovernance` is **not** enforced (see §7) |

### 4.4 Anti-spoiler boundary

The anti-spoiler boundary lies **at the phase**, not in the components:

1. **No metadata leak in the client:** The store holds `currentSong` (incl.
   `song.title`, `song.artist`) in client memory. The protection is
   **on the presentation side**: `MusicPlayer` renders no usable image at
   `blurred=true` (`src/components/game/MusicPlayer.tsx:424`, `blur-[60px]`)
   and lays a swipe overlay on top (`:434-479`).
2. **No text leak:** `QuestionPhase` renders **neither** title
   **nor** artist in question mode. The reveal texts exist exclusively in
   `RevealPhase` (`:240`, `:248`, `:297`, `:434`). The mode widgets follow this
   for five of six modes as well — the **measured exception** is
   `vibe-check`: there `song.artist` and `song.title` are permanently on the
   question screen (`src/components/game/modes/VibeCheckMode.tsx:99`, `:116-118`).
   The blur decision per mode:

   | Mode | `blurred` prop | Location |
   |---|---|---|
   | `survivor` | `!answered && !cheatUsed` | `SurvivorMode.tsx:69` |
   | `timeline` | `!isRevealed` | `TimelineMode.tsx:281` |
   | `lyrics` | `!isRevealing` | `LyricsMode.tsx:121` |
   | `cover-confusion` | `phase !== 'done'` | `CoverConfusionMode.tsx:114` |
   | `hint-master` | `!isRevealed` | `HintMasterMode.tsx:133` |
   | `vibe-check` | `false` (exception) | `VibeCheckMode.tsx:99` |
3. **Hint censorship:** `censorHint(hint, artist, title)`
   (`src/utils/censor-utils.ts:11`) replaces title/artist tokens in hints
   with `[XXX]`; called in `src/components/game/modes/HintMasterMode.tsx:156`.
   The rules live in `src/config/spoiler-config.ts`.
4. **Projector:** `src/app/projector/page.tsx:1-9` fixes that "no artist, no
   title, no album art" appears there.

**Measured gap:** `advancePhase(phase)` (`src/stores/game-store.ts:439-441`)
sets `roundPhase` **without any check**. There is no `answersLocked`
flag in the code (`grep -rn "answersLocked" src` → 0 hits), and the phase
`'locked-in'` is carried in the type
(`src/types/game-state.ts:31`) and in the audio hook
(`src/hooks/useGameAudioCues.ts:9`), but **never set**. The
reveal is therefore not coupled to "all answers have been submitted", but to
the click of the pilot. Details in ADR-0003.

---

## 5. Boundaries

### 5.1 Admin API boundary

**What may go into the admin API:** exclusively administrative operations on
the catalogue (search cover, save cover) — operations that do not take place
in the game session and need file system write access.

**What must not go in:**

| Forbidden | Reason |
|---|---|
| Game state (store, `currentSong`, points, rounds) | The store is the only writing state holder (§4.1). An API that changes the game state creates a second truth. |
| Catalogue mutation without token | `assertAdminAccess` (`src/admin-api/_lib/security.ts:13-28`) enforces `x-admin-token` against `process.env.ADMIN_API_TOKEN` with `timingSafeEqual` and a minimum length of 32. |
| Unlimited or unvalidated inputs | `parseSongId` (`:37`), `parseHttpUrl` (`:44`, HTTPS only, allowlist hosts only), `boundedText` (`:30`) |
| Foreign hosts / arbitrary URLs | `ALLOWED_IMAGE_HOSTS` (`src/admin-api/admin/covers/save/route.ts:11`) |
| Unlimited file sizes | `MAX_IMAGE_BYTES = 5 * 1024 * 1024` with header **and** content check (`route.ts:10`, `:56-63`) |
| Database / cloud access | The app is a static export; there is no server database. |
| Delivering the token to the client | `ADMIN_API_TOKEN` is a server env variable (`security.ts:14`), not a `NEXT_PUBLIC_*`. A client that needs the admin API needs a server-side proxy. |

**Actual status (measured):** `src/admin-api/` contains 3 files, has **0 consumers**
and is **not reachable** — there is no `route.ts` under `src/app/` and
`next.config.ts:4` sets `output: 'export'`. See §3.3 A4.

### 5.2 i18n boundary

**Where the translation happens:** exclusively at the UI boundary, in the
client components, via `useTranslation()` from `react-i18next`.

```text
src/i18n/config.ts          Bootstrap: i18n.use(LanguageDetector).use(initReactI18next).init(…)
src/i18n/locales/de.json    25 keys (flat, nested: app, landing, settings,
src/i18n/locales/en.json    themes, modes, common)
src/components/Providers.tsx:20   import('@/i18n/config')  ← only bootstrap
```

**Why the components do not translate — and why that would be wrong:**
A component that translates itself decides about text, placement and
tone. That creates three sources of error: (1) the same text appears
differently in several language states, (2) markup and text become
inseparable, (3) the number of keys grows without any statement about the
visible text volume. The translation therefore belongs in **resource files**,
not in components — that is exactly the structure of `src/i18n/locales/`.

**Actual status (measured):**

| Metric | Value | Command |
|---|---|---|
| Keys in `de.json` / `en.json` | 25 / 25, key-parallel | JSON flat count, 0 differences |
| Files with `useTranslation` | **4** | `grep -rl "useTranslation" src` → `app/page.tsx`, `components/ui/LanguageSwitcher.tsx`, `components/ui/NavBar.tsx`, `components/ui/ThemeSwitcher.tsx` |
| Files with German UI literals | **56 of 73** (without test files) | Vocabulary scan over 60 German UI terms → 746 hits |
| Language scope of the translation | only `app`, `landing`, `settings`, `themes`, `modes`, `common` | `de.json` |
| Bootstrap gate | `Providers` renders `null` until i18n is loaded | `src/components/Providers.tsx:25-27` |

> **Core finding:** The i18n infrastructure is present and correctly wired, but
> it currently covers only the navigation bar, the theme switcher, the
> language switcher and the landing page. The entire game area
> (`lobby`, `game`, `game-over`, `projector`, `browse`, `admin`, `settings/*`)
> is **hardcoded German**. Details in ADR-0004.

### 5.3 Data and catalogue boundary

```text
src/data/songs/*.json      136 pack files (A1…Z, Ñ, NUMBERS, OTHERS, Q, U, X …)
src/data/songs/packs.json  Pack metadata
src/data/songs/index.ts    GENERATED loader — header: „generated by
                           scripts/migrate_and_deduplicate.py. Do not edit it manually."
                           exports ALL_SONGS, PACKS_METADATA, AVAILABLE_PACKS,
                           getSongsForPacks
src/data/packs/index.ts    Legacy proxy: export * from '@/data/songs'
```

**Rules:**

1. The catalogue is **data, not logic**. `src/data/` contains no
   game rule, no React code and no side effects.
2. `src/data/songs/index.ts` is generated. Changes go through
   `scripts/migrate_and_deduplicate.py` or `npm run update-pack` /
   `npm run upsert-song`, not through manual editing.
3. Selection and filter logic belongs in `src/utils/song-picker.ts`. The
   catalogue file only delivers data.
4. Validation is a **tool**, not runtime code:
   `src/utils/validate-song-data.ts` (493 lines) and
   `src/utils/validate-song-catalog.ts` (271 lines) run via
   `npm run validate-songs` / `npm run validate-catalog`. They are **not**
   included in the client bundle — the import graph confirms: `utils → data`
   exists exactly **1×**, namely in `src/utils/song-picker.ts:4`.
5. Year limits come from `src/config/song-year-range.ts`
   (`MIN_SONG_YEAR = 1500`, `MAX_SONG_YEAR_OFFSET = 1`), not from validator code.

**Catalogue threshold check:** `npm run validate-catalog:report` writes
the report; `scripts/check-phase1-acceptance.js` evaluates it.

### 5.4 Audio boundary

```text
src/utils/game-audio-cues.ts   GAME_SFX (correct/incorrect/reveal/win/lose),
                                MODE_CUES (one cue per GameMode)
src/hooks/useGameAudioCues.ts  Playback logic of the game: phase change,
                                answer counter, game over. Uses one
                                map cache per asset, `audio.currentTime = 0` before
                                every play, `volume = clamp(volume × sfxVolume)`.
src/components/game/MusicPlayer.tsx  Music playback (YouTube IFrame API,
                                Spotify Free/Premium, Amazon Prime/Premium).
```

**Rules:**

1. **Music and SFX are separate channels.** SFX (`useGameAudioCues`) are
   one-shots of ≤ 0,34 s and never interrupt the music flow
   (`src/hooks/useGameAudioCues.ts:39-61`).
2. **Missing assets are not an error.** The hook catches every error
   (`:55-60`) — the game flow must never hang on a file in `public/audio/`.
3. **The store controls the volume**, not the hook:
   `musicEnabled`/`musicVolume`/`sfxEnabled`/`sfxVolume` live in the store
   (`src/types/game-state.ts:199-208`) and are persisted
   (`src/stores/game-store.ts:630-633`).
4. **The provider selection belongs to the store**, not the component:
   `preferredMusicProvider` (`src/stores/game-store.ts:423-426`) decides whether
   YouTube, Spotify Free/Premium or Amazon Prime/Premium is used
   (`src/components/game/MusicPlayer.tsx:167-170`).
5. **Autoplay blocks are an expected state.** `PHOMU_CONFIG.COUNTDOWN_SECONDS`
   is intended as an autoplay workaround (`src/config/game-config.ts:81`), but
   is **never used** (see §8).
6. **No provider code in the game logic.** The `MusicPlayer` encapsulates all
   provider-specific details (`extractAmazonTrackId`, `extractSpotifyTrackId`).

---

## 6. File size rule

**Rule:** Target **≤ 400 lines** per source file. **Maximum 550 lines** — beyond
that a file is no longer reviewable and must be split before the merge.
The **physical line count** (`wc -l`) is authoritative.

**Measurement command:**

```bash
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 \
  | xargs -0 wc -l | sort -rn | awk '$2 != "total" { printf "%6d  %s\n", $1, $2 }'
```

**Scope:** 77 files (`*.ts`/`*.tsx`) under `src/`.

### 6.1 Violations of the hard maximum (> 550 lines) — 7 files

| # | File | Lines | over maximum by |
|---|---|---|---|
| 1 | `src/app/admin/review/page.tsx` | **755** | +205 |
| 2 | `src/app/lobby/page.tsx` | **744** | +194 |
| 3 | `src/components/game/RevealPhase.tsx` | **671** | +121 |
| 4 | `src/stores/game-store.ts` | **640** | +90 |
| 5 | `src/components/game/MusicPlayer.tsx` | **630** | +80 |
| 6 | `src/components/game/modes/TimelineMode.tsx` | **579** | +29 |
| 7 | `src/app/browse/page.tsx` | **572** | +22 |

### 6.2 Violations of the target (401–550 lines) — 3 more files

| # | File | Lines | over target by |
|---|---|---|---|
| 8 | `src/utils/validate-song-data.ts` | **493** | +93 |
| 9 | `src/app/game/page.tsx` | **466** | +66 |
| 10 | `src/app/admin/songs/page.tsx` | **445** | +45 |

**Total:** 7 hard violations (> 550), 10 violations of the target (> 400).

**Additionally:** `src/config/game-config.ts` (326 lines) contains 28
`SONG_PACKS` entries with marketing text and is therefore rather a **data catalogue**
than configuration — the question of whether the pack metadata belongs into the
configuration or into `src/data/` is open.

**Gate:** `scripts/check-file-size.mjs` (planned in `CONTRACT.md` §6) does
**not** exist yet — `ls scripts/ | grep check` yields only
`check-phase1-acceptance.js`. The state is therefore **not** automatically
enforced.

### 6.3 Proposal for the split (not implemented yet)

| File | Natural cut |
|---|---|
| `src/app/admin/review/page.tsx` (755) | `ReviewTable`, `ReviewFilters`, `DeltaExport`, `isStub/isComplete` (`:32-50`) |
| `src/app/lobby/page.tsx` (744) | 5 wizard steps + constants (`:25-55`) + `ModeSelector`/`PackSelector` (already extracted) |
| `src/components/game/RevealPhase.tsx` (671) | 6 reveal cards (`:185-444`) → `src/components/game/reveal/*`; texts (`:37-58`, `:76-183`) → `src/utils/reveal-messages.ts` |
| `src/stores/game-store.ts` (640) | Team actions (`:529-592`), timeline actions (`:594-615`), `FUNNY_TEAM_NAMES`/`TEAM_COLORS` (`:20-29`) → `src/config/team-names.ts` |
| `src/components/game/MusicPlayer.tsx` (630) | Provider adapters (`:96-120`, `:547-619`) → `src/utils/music-providers.ts`; report flow (`:172-237`) → own component |
| `src/components/game/modes/TimelineMode.tsx` (579) | Slot rendering (`:429-540`) → own component |
| `src/app/browse/page.tsx` (572) | Filter/pagination (`:64-140`), admin mode (`:8`) |

---

## 7. Rules for handling configuration

> **`src/config/` is the only source for constants.**
> If you need a constant, put it in `src/config/` and import it.
> If you find a constant in the code that is missing from `src/config/`, add it
> there — and only there.

### 7.1 Binding rules

1. **No magic numbers in components, stores or utils.** Time limits,
   point values, player limits, pack IDs, year ranges, censorship thresholds,
   request limits and asset paths belong in `src/config/`.
2. **`PHOMU_CONFIG` is the only aggregate entry point** for
   game constants (`src/config/game-config.ts:52-326`). Besides it there are
   exactly two further, thematically separate configuration modules:
   `SPOILER_CONFIG` (`src/config/spoiler-config.ts`) and the year range values
   (`src/config/song-year-range.ts`).
3. **No import from `config` to `types`.** The direction is `types` → nothing,
   `config` → `types` (see A2).
4. **Admin API limits** live in `src/admin-api/_lib/security.ts` or the
   route, because they are server-side and must not enter the client bundle.
5. **Configuration is read-only.** `PHOMU_CONFIG` is `as const`; the
   runtime variation runs via `GameConfig` in the store, not via the
   constants.

### 7.2 Evidenced violations (actual state)

**Values in `src/config/game-config.ts` that are consumed nowhere**
(`grep -rn "<KEY>" src --include=*.ts --include=*.tsx` without hits other than in
`game-config.ts`):

| Key | Line | Value |
|---|---|---|
| `COUNTDOWN_SECONDS` | 81 | `3` |
| `SPOTIFY_PREVIEW_DURATION` | 82 | `30` |
| `MIN_ROUNDS_TO_PLAY` | 61 | `10` |
| `MAX_ROUNDS_TO_PLAY` | 62 | `30` |
| `FORCE_REMOVE_DUPLICATE_YEARS` | 316 | `true` |
| `DEFAULT_UNLOCK_METHOD` | 313 | `'swipe'` |
| `CARD_WIDTH_MM` | 322 | `59` |
| `CARD_HEIGHT_MM` | 323 | `91` |
| `CARD_BLEED_MM` | 324 | `3` |
| `MAX_CARDS_PER_SET` | 325 | `110` |

**Values in the store that are missing in the configuration** (hardcoded in
`src/stores/game-store.ts:41-66`):

| Field | Line | Value | Note |
|---|---|---|---|
| `targetPoints` | 47 | `100` | contradicts `DEFAULT_WIN_SCORE: 10` |
| `targetRounds` | 48 | `10` | duplicates `DEFAULT_ROUNDS_TO_PLAY: 10` |
| `targetTimeMinutes` | 49 | `60` | **no** config key present |

**Configuration values that the code bypasses** (rebuilt in the code instead of
read from the config): minimum spoiler length, preview duration, pack alias
application, text normalisation, hash seed, hint count, admin timeouts, colour
palettes, mode labels. The complete list of locations is in
`/workspace/workers/architecture-deliverable.md`.

---

## 8. Known gaps (measured, with location)

| # | Gap | Location | Impact | Status |
|---|---|---|---|---|
| 1 | No `answersLocked`; phase `'locked-in'` is never set | `src/stores/game-store.ts:439`, `src/types/game-state.ts:31` | The reveal is not coupled to "all answers submitted" (ADR-0003) | **open** |
| 2 | `advancePhase` checks nothing | `src/stores/game-store.ts:439-441` | Every component can switch to every phase | **open** |
| 3 | `overrideGovernance` is not enforced | `src/types/game-state.ts:93`, `src/app/game/page.tsx:197-210` | The power user menu (`src/components/game/RevealPhase.tsx:604-634`) is reachable for everyone | **open** |
| 4 | `admin-api/` has 0 consumers and is not reachable | §3.3 A4 | Cover search/save does not work | **open** |
| 5 | 56 of 73 source files contain German UI literals | §5.2 | The English interface is incomplete | **resolved** on 2026-10-25: 0 literal texts in 48 checked TSX files (`npm run check:i18n`) |
| 6 | `scripts/check-file-size.mjs` is missing | `ls scripts/` | The file size gate does not exist; 7 hard violations are unenforced | **resolved** on 2026-10-25: gate exists, 7 legacy debts are recorded as documented exceptions |
| 7 | `scripts/check-i18n-completeness.mjs` is missing | `ls scripts/` | The completeness of the translation is not checked | **resolved** on 2026-10-25: gate exists, 1231 keys parallel in DE and EN |
| 8 | `scripts/check-doc-links.mjs` is missing | `ls scripts/` | Relative Markdown links are not checked | **resolved** on 2026-10-25: gate exists, 0 dead links in 57 Markdown files |
| 9 | 10 config keys without consumer | §7.2 | `src/config/` is not the only truth — it is one of several | **partially resolved**: the duplicated theme values now live in `src/config/themes.ts`; the remaining keys are **open** |
| 10 | `src/app/layout.tsx:32` hardcodes `lang="de"` | `src/app/layout.tsx:32` | With `en` the `lang` stays German | **resolved** on 2026-10-25: `src/components/LanguageHtmlAttribute.tsx` sets `document.documentElement.lang` to the active language |
| 11 | `src/types/session.ts` is imported by nobody | Import graph | Dead type design | **open** |

**New (2026-10-25):** The key space of the translation is typed
(`src/i18n/types.ts`, `src/i18n/variant-keys.ts`). A typo in a
key name is a compile error; the list of varied texts is generated from
`de.json` (`npm run generate:variant-keys`), so that keys and list cannot
drift apart.

---

## 9. Further documents

| Document | Content |
|---|---|
| `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md` | Layers, direction, handling of deviations |
| `docs/adr/ADR-0002-zustand-store-server-und-url.md` | State management, persistence, server, URL |
| `docs/adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md` | Anti-spoiler boundary, reveal orchestration |
| `docs/adr/ADR-0004-internationalisierungsgrenze.md` | i18n boundary, key space, migration path |
| `docs/adr/ADR_TEMPLATE.md` | Template for further ADRs |
