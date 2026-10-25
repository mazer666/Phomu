# QA-04 — Code Quality, Architecture & Maintainability

**Severity of the findings in this report:** P1, P2, P2, P3
**Area:** Structure, module boundaries, changeability, the honesty of the project's own quality gates.

---

## 1. Measured baseline

| Metric | Value | Source |
|---|---|---|
| TypeScript source files | 47 `.tsx` + 30 `.ts` | `find src` |
| Total source lines (`src/**`) | 14,578 | `wc -l` |
| `any` annotations | **0** | `grep -rEn ':\s*any\b|<any>|as any'` |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | **0 / 0 / 0** | `grep -rn` |
| `dangerouslySetInnerHTML` | **0** | `grep -rn` |
| `eval(` / `innerHTML =` | **0 / 0** | `grep -rn` |
| `tsconfig.compilerOptions.strict` | `true` | `tsconfig.json` |
| ESLint errors | **0** (1 warning: `playwright.config.ts:1`) | `npm run lint` |
| `eslint-disable` directives | 4 | `grep -rn` |
| Files over the 400-line soft limit | 10 (all reported as warnings) | `npm run check:file-size` |
| Files over the 550-line hard limit | **6** | `npm run check:file-size` |
| Orphaned modules (0 importers) | 2 | import-graph scan |

**This is a high-quality codebase by any reasonable standard.** TypeScript strict with zero escape hatches, zero `any`, zero XSS sinks, a clean lint, and a consistent KDoc-ish commenting style in the newer modules. The findings below are about *scale management* and *gate honesty*, not about sloppy code.

The four `eslint-disable` directives are all justified and worth keeping:

| Location | Rule | Assessment |
|---|---|---|
| `src/app/admin/review/page.tsx:547, 583` | `react-hooks/purity` | Reading a mutable ref during render — intentional for a local edit buffer; the rule is a heuristic. Document it. |
| `src/components/game/modes/LyricsMode.tsx:102` | `react-hooks/exhaustive-deps` | Acceptable, but see QA-ARC-004 — a stale closure in a lyrics effect can leak a reveal. |
| `src/components/game/modes/VibeCheckMode.tsx:143` | `react-hooks/exhaustive-deps` | Same class of risk in a spoiler-adjacent effect. |

---

## QA-ARC-001 — P1 — The file-size gate cannot fail, so it protects nothing

### What I measured

`npm run check:file-size` output:

```
⚠️  10 warning(s):
   src/app/admin/review/page.tsx: 863 lines — above the hard limit (550) and 108 lines more than the recorded exception state (755)
   src/app/lobby/page.tsx: 1050 lines — above the hard limit (550) and 306 lines more than the recorded exception state (744)
   src/components/game/MusicPlayer.tsx: 783 lines — above the hard limit (550) and 153 lines more than the recorded exception state (630)
   src/components/game/RevealPhase.tsx: 697 lines — above the hard limit (550) and 26 lines more than the recorded exception state (671)
   src/components/game/modes/TimelineMode.tsx: 680 lines — above the hard limit (550) and 101 lines more than the recorded exception state (579)
   src/utils/validate-song-data.ts: 817 lines — above the hard limit (550) and 315 lines more than the recorded exception state (502)

✅ Gate passed — 0 errors, 10 warning(s), 8 known legacy file(s).
```

**Exit code 0.** Six files breach the limit that `ARCHITECTURE.md` and `REQUIREMENTS.md` define as *hard*, and the gate reports success.

The gate has an elegant idea — it records a "known exception state" per file and compares against it, so it can distinguish *"a legacy file that is not growing"* from *"a legacy file that is growing"*. That is genuinely good design and worth keeping. But it is wired as a **warning-only** channel, so the growth it was built to detect has no consequence. The project has been able to add **306 lines to `lobby/page.tsx`** while the gate that specifically watches for this watched it happen and said "✅ Gate passed".

This is the most important structural finding, because it means the project's own definition of "best in class" is currently unenforced in the one dimension where the codebase is visibly degrading.

### Concrete recommendation

**Split the gate into two channels with different severity.** Keep the "known exception" mechanism, but make *growth* an error:

- **New file over 400 lines** → **error** (exit 1). A new file never gets an exception; that is the point of the rule.
- **Known legacy file that grew since its recorded exception state** → **error** (exit 1). This is the regression case, and it is what the gate was designed for.
- **Known legacy file at or below its recorded exception state** → warning only, with the GAP-007 refactoring note.
- **Known legacy file that shrank** → success, and *update the recorded exception state downward automatically*, so the exception list converges to zero as the backlog is worked.

Concrete implementation sketch for `scripts/check-file-size.mjs`:

```js
const HARD_LIMIT = 550;
const SOFT_LIMIT = 400;

// A file is an error if it is new and over the soft limit,
// or if it grew beyond its recorded exception state.
if (!baseline[file] && lines > SOFT_LIMIT) {
  errors.push(`${file}: ${lines} lines — new file over the soft limit (${SOFT_LIMIT}).`);
} else if (baseline[file] && lines > baseline[file].lines) {
  errors.push(`${file}: ${lines} lines — grew by ${lines - baseline[file].lines} beyond its recorded state (${baseline[file].lines}).`);
} else {
  warnings.push(...);
}
```

Then update the baseline file automatically in the same run when a file shrinks, so the exceptions list drains as the backlog is retired. Add to the CI `quality-gates` job:

```yaml
- name: File size (no growth beyond the recorded baseline)
  run: npm run check:file-size
```

**Accept when**

- A deliberately grown legacy file makes `npm run check:file-size` exit 1 (prove it with a negative test: grow a file, run the gate, capture the red output, revert, capture the green output).
- A newly added 450-line file makes the gate exit 1.
- The exception list shrinks as files are refactored.

---

## QA-ARC-002 — P2 — Six files are over the hard limit and the backlog is growing

| File | Lines | Over hard limit (550) | Growth vs. recorded state |
|---|---|---|---|
| `src/app/lobby/page.tsx` | 1,050 | +500 | **+306** |
| `src/utils/validate-song-data.ts` | 817 | +267 | **+315** |
| `src/components/game/MusicPlayer.tsx` | 783 | +233 | **+153** |
| `src/app/admin/review/page.tsx` | 863 | +313 | +108 |
| `src/components/game/RevealPhase.tsx` | 697 | +147 | +26 |
| `src/components/game/modes/TimelineMode.tsx` | 680 | +130 | +101 |
| `src/app/browse/page.tsx` | 767 | +217 | +195 (over soft) |
| `src/app/admin/songs/page.tsx` | 544 | — | +144 (over soft) |
| `src/app/game/page.tsx` | 521 | — | +121 (over soft) |
| `src/app/projector/page.tsx` | 434 | — | +34 (over soft) |

`ARCHITECTURE.md` § 6.3 already names the split plan for these (GAP-007). The plan is sound; what is missing is enforcement (QA-ARC-001) and ordering.

### Concrete recommendation — ordered by risk, not by size

Do these in this order. The first three carry the most correctness risk, not just the most lines:

1. **`src/components/game/modes/TimelineMode.tsx` (680 lines).** Timeline mode owns the round's hardest state — the shared timeline that grows with correct answers and the slot resolution (`getValidSlots`, `canonicalSlot`). Split the *logic* from the *rendering*: `timeline-logic.ts` (pure functions, fully unit-testable) + `TimelineMode.tsx` (view). This is the highest-value split in the project because it converts untested state logic into testable pure functions.

2. **`src/components/game/RevealPhase.tsx` (697 lines).** The reveal is where the spoiler boundary is crossed. Split the *transition* logic (when the answer becomes public) from the *presentation*. Splitting this file also gives you the natural place to put the QA-SPO-005 assertion that the answer is not in the DOM before the reveal.

3. **`src/components/game/MusicPlayer.tsx` (783 lines).** `ARCHITECTURE.md` already prescribes "extract the provider adapter". The component currently handles YouTube, Spotify and Amazon Music in one body; each provider has its own embed URL shape, its own error handling and its own spoiler surface. One adapter per provider, behind a common interface, makes each provider independently testable and makes the "no title before reveal" rule enforceable in one place.

4. **`src/app/lobby/page.tsx` (1,050 lines).** Split into `lobby/` (player list), `mode-selection/` (mode + pack pickers) and the page shell. `src/components/lobby/` already contains `ModeSelector`, `PackSelector` and `PlayerCard` — the page should be composing them, not re-implementing them.

5. **`src/utils/validate-song-data.ts` (817 lines).** Split into `song-schema.ts`, `song-limits.ts` and `catalog-validation.ts`. The existing `validate-song-limits.test.ts` already covers one of these three seams — the split is half-done and can be finished by moving code, not by rewriting it.

6. **The three "over soft limit" files** (`browse`, `admin/songs`, `game`) — schedule them after the above.

**Rule for every split:** behaviour-preserving. Existing tests must be green before and after, and both outputs must be captured. `ARCHITECTURE.md` already requires this; it is the right rule, because a refactor of the reveal logic that silently changes *when* the answer appears is a spoiler regression.

---

## QA-ARC-003 — P2 — Two modules are dead code

| Module | Importers | Assessment |
|---|---|---|
| `src/types/session.ts` | **0** | Orphaned type draft — nothing imports it |
| `src/admin-api/**` (4 files) | **0 outside itself** | Guarded API with no caller and no deployed route — see QA-SEC-002 |

`src/types/session.ts` is a small type-only module with no importers. It costs nothing at runtime, but it is a trap: it looks like the canonical session type, and a future contributor will either import it (and thereby introduce a second, divergent session model alongside `src/types/game-state.ts`) or delete it and discover it was load-bearing.

**Recommendation:** delete `src/types/session.ts`, or merge its useful parts into `src/types/game-state.ts` and delete it. Whichever you choose, record the decision in `docs/cr/` (the change-request folder already exists) so the next contributor does not re-open it.

**Accept when:** `grep -rn "types/session" src` returns nothing and the file is gone, or the type is consolidated into `game-state.ts` with the CR referenced.

---

## QA-ARC-004 — P2 — Two `exhaustive-deps` suppressions sit in spoiler-adjacent effects

`src/components/game/modes/LyricsMode.tsx:102` and `src/components/game/modes/VibeCheckMode.tsx:143` both suppress `react-hooks/exhaustive-deps`. A stale closure in these two effects is not a style issue — it is a potential **spoiler leak**: if the effect captures a stale `isRevealed` or a stale song, it can reveal the answer early or fail to blur it.

**Recommendation:** do not simply keep the suppression. Extract the effect body into a named, testable function that takes its dependencies as parameters, so the dependency list becomes explicit and the stale-closure risk is visible in the signature:

```ts
// Before
useEffect(() => { /* ... uses song, isRevealed, ... */ }, []);   // eslint-disable

// After
useEffect(() => {
  const next = computeLyricMask(song, isRevealed, maskSeed);
  setMasked(next);
}, [song, isRevealed, maskSeed]);   // no suppression needed
```

**Accept when:** both suppressions are removed, and `computeLyricMask` has a unit test covering the "not yet revealed" and "revealed" states.

---

## QA-ARC-005 — P3 — Module boundaries are sound, but the import graph is not enforced

The package layout follows the protocol-isolation principle well:

```
src/app/          route shells only
src/components/   presentation, split by domain (game, lobby, browse, admin, ui)
src/stores/       state (Zustand)
src/config/       constants — the single home for game configuration
src/utils/        pure helpers
src/types/        shared types
src/i18n/         translations and typed key space
src/data/         catalogue (songs, packs)
```

Constants do live in one place (`src/config/`), and `QUALITY.md` makes "every constant lives in exactly one place" an explicit acceptance criterion. No import cycles were observed. The layering is coherent.

What is missing is **enforcement**. Nothing prevents a future `src/components/game/` file from importing `src/data/songs/index.ts` directly and pulling the whole catalogue into a component — which is precisely the mechanism behind QA-SPO-001.

**Recommendation:** add a lightweight boundary check to `scripts/check-all.mjs`:

```bash
# No component or page may import the raw catalogue.
if grep -rn "from '@/data/songs'" src/components src/app; then
  echo "❌ Components must not import the raw song catalogue."
  exit 1
fi
```

Add more rules as the architecture stabilises: `src/config` must not import from `src/components`; `src/utils` must not import from `src/stores`.

**Accept when:** the boundary check fails when a component imports the catalogue, and passes on the current tree.

---

## QA-ARC-006 — P3 — The catalogue is coupled to the UI through a single barrel file

`src/data/songs/index.ts` (297 lines) aggregates the 136 song JSON files, and every consumer receives all 1,557 entries. This is the structural root of QA-SPO-001 and QA-PERF-002.

**Recommendation:** reshape the catalogue access behind a narrow interface so that the consumer decides *how much* it receives:

```ts
// src/data/catalogue.ts
export interface CatalogueEntry {
  id: string; title: string; artist: string; year: number;
}
export interface RoundBundle {
  entry: CatalogueEntry;
  hints: string[];        // already censored
  lyrics?: string[];
}
export function loadPack(packId: string): Promise<RoundBundle[]>;
```

This is the same change as QA-SPO-001 Option A, seen from the architecture side. Doing it as an interface change rather than a bundling trick keeps the fix from being undone by the next person who "optimises" the import.

---

## QA-ARC-007 — P2 — The file-size gate does not cover the Rust base, and two Rust files already breach the hard limit

### What I measured

The Rust workspace (`be984cdc5`, good tip `11371eb94`) added 101 `.rs` files across 13 crates. `scripts/check-file-size.mjs` matches **no** `.rs` extension, so the entire Rust base is invisible to the gate.

Two new files already exceed the project's own hard limit of 550 lines:

| File | Lines | Over hard limit | Gate visibility |
|---|---|---|---|
| `core/phomu-conformance/src/runner.rs` | **1,022** | +472 | **not checked** |
| `core/phomu-conformance/src/vector.rs` | **794** | +244 | **not checked** |
| `platform/phomu-ffi/src/dto.rs` | 398 | — | not checked (under soft limit) |
| `platform/phomu-ffi/src/core_api.rs` | 395 | — | not checked |
| `core/phomu-errors/src/lib.rs` | 395 | — | not checked |
| `core/phomu-catalog/src/model.rs` | 384 | — | not checked |
| `core/phomu-core/src/session/state.rs` | 382 | — | not checked |

For comparison, the six TypeScript files that *are* checked exceed the limit by 26–500 lines — and the gate reports them as warnings anyway (QA-ARC-001). So the situation is: the checked files are gated softly, and the unchecked files include the two largest in the repository.

**Why this matters more than a file-size number.** `phomu-conformance` is the crate that decides whether two shells agree — it is the crate the whole multi-platform strategy rests on. A 1,022-line conformance runner with no size gate and no per-file rule is exactly the file where a subtle divergence between the TypeScript and Rust implementations of a rule could hide.

### Concrete recommendation

**1. Extend the gate to Rust.** The gate is a script; adding a language is a glob change:

```js
// scripts/check-file-size.mjs — include the Rust sources
const SOURCE_GLOBS = ['src/**/*.{ts,tsx}', 'core/**/*.rs', 'platform/**/*.rs', 'tools/**/*.rs'];
```

**2. Apply the same rule** — 400 soft / 550 hard — to both languages, with the same "known legacy file" mechanism so the Rust files can be registered as exceptions with a recorded state and a shrinking baseline.

**3. Split the two oversized files.** `runner.rs` (1,022) should become `runner/` with the comparison logic, the vector handling and the reporting separated; `vector.rs` (794) should separate the vector model from the comparison algorithm.

**Accept when**

- `npm run check:file-size` reports `.rs` files.
- A Rust file over 550 lines turns the gate red.
- `runner.rs` and `vector.rs` are split below the limit.

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-ARC-001 File-size gate must be able to fail | **P1** | Growing a legacy file, or adding a new >400-line file, makes the gate exit 1 — demonstrated by a red/green negative test |
| QA-ARC-002 Split the six oversized files | P2 | Each file is under the limit; tests green before and after |
| QA-ARC-003 Remove dead modules | P2 | `types/session.ts` deleted or consolidated; `src/admin-api` wired up or removed |
| QA-ARC-004 Remove the two `exhaustive-deps` suppressions | P2 | Both suppressions gone; extracted functions are unit-tested |
| QA-ARC-005 Enforce module boundaries | P3 | A boundary check script fails on a deliberate violation |
| QA-ARC-006 Narrow the catalogue interface | P3 | Consumers can request a pack, not the whole catalogue |
| QA-ARC-007 Cover the Rust base with the file-size gate | P2 | The gate checks `.rs` files; `runner.rs` and `vector.rs` are split under the limit |
