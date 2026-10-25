# QA-06 — Usability, Accessibility & Internationalisation

**Severity of the findings in this report:** P1, P2, P2, P3
**Area:** Whether the game is comfortable to play, operable without a mouse, usable with assistive technology, and genuinely bilingual.

---

## 1. Measured baseline

| Metric | Value |
|---|---|
| `aria-label` occurrences, whole app | **11** |
| `role=` occurrences | **0** |
| `aria-live` occurrences | **0** |
| `tabIndex` occurrences | **1** |
| `onKeyDown` handlers (`.tsx`) | **1** (lobby: Enter to add a player) + 1 in `TimelineMode` |
| `.focus()` calls (focus management) | **0** |
| `prefers-reduced-motion` handling | **0** |
| `dangerouslySetInnerHTML` | 0 |
| i18n leaf keys `de.json` / `en.json` | **1,258 / 1,258** (exactly parallel) |
| Literal UI texts in 48 TSX files | **0** (enforced by `check:i18n`) |
| `<html lang>` handling | Hardcoded `lang="de"` in `layout.tsx`, synchronised at runtime by `NavBar` |
| Themes | 4 (`jackbox`, `musicwall`, `spotify`, `youtube`) with CSS custom properties |
| Viewport | `viewportFit: 'cover'` — notch/Dynamic Island aware |

**The internationalisation work is the strongest part of this report's subject area.** The accessibility work is the weakest.

---

## 2. What is excellent

### 2a — i18n as an enforced invariant

This is a textbook implementation:

- **1,258 leaf keys**, byte-parallel between `de.json` and `en.json`. No missing, no extra, no orphaned.
- **Zero literal texts in 48 TSX files** — and this is *not* a convention, it is a **gate**: `scripts/check-i18n-completeness.mjs` fails the build if a literal string appears where a key belongs. That is the only way i18n stays intact over time.
- A **typed key space** derived from the locale files (`src/i18n/types.ts`, `src/i18n/variant-keys.ts`), so `t('typo.key')` is a **compile error** rather than a silent fallback to the key string.
- `<html lang>` and `document.title` are kept in sync with the active language — the detail most projects forget.
- `load: 'languageOnly'` with a `fallbackLng`, and a documented rule that `de-DE` must resolve to `de`.
- The UI language choice is German-primary with complete English — a deliberate product decision, documented as such.

For a project of this size, this is better than I usually see. The only thing missing is content localisation (QA-UX-004).

### 2b — The theme system

Four themes with a consistent token set (`--color-text`, `--color-text-secondary`, `--color-accent`, `--color-bg`, `--color-border`) applied via `data-theme` on `<html>`. Token-driven theming is the right structure: a theme change never requires touching a component, and it is exactly what a future TV/Android client will need.

---

## QA-UX-001 — P1 — A timed, score-driven game is completely silent to screen readers

### What I measured

**Zero** `aria-live` regions in the entire application.

A screen-reader user playing Phomu receives no announcement for any of:

- the **round timer** counting down (`GameHeader.tsx` renders `secondsLeft` — it has an `aria-label`, but the value is not in a live region, so it is not announced as it changes)
- the **score** changing after a correct answer
- the **phase change** from question → locked-in → reveal
- the **reveal itself** — the moment the answer is announced, the most important event in the game
- the **correct/incorrect feedback** from `FeedbackOverlay`
- the **round result** and the **game-over** state

The `aria-label` on `GameHeader.tsx:95` (`t('game.header.secondsLeft', { seconds })`) is a static label that is re-read only when focus returns to that element — it is not a live announcement.

This is not a marginal gap. For a game whose entire loop is *watch a timer, decide, get feedback, see the answer*, the live regions **are** the interface for assistive technology. Without them the game is unplayable with a screen reader.

### Concrete recommendation

Add three live regions, with the right politeness levels:

```tsx
// In the game shell (src/app/game/page.tsx or GameHeader.tsx)

/* Polite: informational, does not interrupt. */
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {phaseAnnouncement}
</div>

/* Assertive: the answer and the time-up. */
<div aria-live="assertive" aria-atomic="true" className="sr-only">
  {revealAnnouncement}
</div>

/* Timer: off by default, announced at thresholds, not every second. */
<div aria-live="off" className="sr-only">{secondsLeft}</div>
```

Content rules that matter as much as the markup:

- **Do not announce the timer every second.** Announce at meaningful thresholds only — 10, 5, and "time is up" — otherwise the screen reader output becomes unusable. Use `aria-live="off"` on the ticking element and drive the threshold announcements from a `polite` region.
- **Announce the phase transition.** "Round 3. The answers are locked. The reveal shows: <title> by <artist>."
- **Announce the score delta**, not the total score only: "+20 points" is actionable; "340" is not.

Add the `sr-only` utility (Tailwind provides `sr-only` natively).

**Accept when**

- At least three live regions exist, with a documented politeness policy.
- A screen-reader session (NVDA, VoiceOver or Orca) completes a full round and announces: the round start, the time warning, the lock, the reveal with title and artist, and the score change.
- The timer is not announced every second.

---

## QA-UX-002 — P2 — No ARIA roles, no focus management, and keyboard support in 2 of ~10 interactive surfaces

### What I measured

| Signal | Count | Reading |
|---|---|---|
| `role=` | 0 | No custom widgets are exposed as widgets. |
| `tabIndex` | 1 | Almost everything depends on native focus order. |
| `.focus()` | 0 | **Focus is never moved programmatically.** |
| `onKeyDown` in TSX | 1 (+1 in `TimelineMode`) | Keyboard support exists in the lobby (Enter to add a player) and in `TimelineMode` (arrow keys / Enter / Space to place a year). Nowhere else. |

### Why "no focus management" matters most here

The game's central interaction is a **phase transition**: question → locked-in → reveal. When the phase changes, the DOM is replaced. A keyboard or screen-reader user's focus is then either lost (focus falls back to `<body>`) or left on a removed node — in both cases, **the next `Tab` starts from the top of the page**. In a timed game, that is the difference between playing and not playing.

### Why the missing roles matter

`TimelineMode` is a drag-and-drop year-placement interaction implemented with a custom widget (arrow keys, Enter, number keys). Without `role="slider"` / `role="listbox"` / `role="option"` and the matching `aria-*` state, a screen reader sees an unlabelled group of divs and cannot convey the current selection or the available years.

### Concrete recommendation

**1. Move focus on phase change.** One hook, used by the game shell:

```tsx
// src/hooks/usePhaseFocus.ts
export function usePhaseFocus(phase: GamePhase, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    // On every phase change, move focus to the phase heading so the
    // screen reader reads the new phase, and so the next Tab continues
    // from the right place.
    ref.current?.focus();
  }, [phase, ref]);
}
```

Render each phase heading with `tabIndex={-1}` so it can receive focus programmatically without joining the tab order.

**2. Expose the timeline as a proper widget.**

```tsx
<div role="listbox" aria-label={t('modes.timeline.label')} aria-activedescendant={activeId}>
  {slots.map(s => (
    <div role="option" id={s.id} aria-selected={s.id === activeId}
         aria-label={t('modes.timeline.slot', { year: s.year })} … />
  ))}
</div>
```

**3. Add the missing keyboard affordances.** At minimum: a shortcut to lock in the answers, a shortcut to trigger the reveal, and `Escape` to open the in-game settings panel. These are already-implemented actions (`onReveal`, `onReroll`, the settings toggle) that currently require a pointer.

**4. Add landmarks and headings.** One `<main>` per page, one `<h1>` per page, and `<nav>` / `<header>` / `<footer>` landmarks — so a screen reader can navigate by landmark instead of by tabbing through every control.

**Accept when**

- Focus is programmatically moved on every phase change.
- The timeline exposes `listbox`/`option` roles with `aria-selected`.
- A keyboard-only session can play a full round: add players, choose a mode, answer, lock in, reveal.
- Every page has exactly one `<h1>` and one `<main>`.

---

## QA-UX-003 — P2 — Motion is not reduced for users who ask for it

### What I measured

**Zero** occurrences of `prefers-reduced-motion` in the codebase — while `framer-motion` is used throughout with `initial`/`animate`/`transition` props and `useAnimation` in the game components.

Phomu is a *loud* product: dice animations, feedback overlays, score reveals, mode transitions. Motion is core to its feel. That makes respecting `prefers-reduced-motion` more important here, not less — the animation is large enough to be a genuine accessibility issue (vestibular disorders, migraine triggers).

**Recommendation:**

```css
/* src/styles/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

And in the framer-motion components, use the `useReducedMotion()` hook so the *animation semantics* adapt rather than merely being shortened:

```tsx
const reduce = useReducedMotion();
<motion.div
  initial={reduce ? false : { opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={reduce ? { duration: 0 } : { duration: 0.3 }}
/>
```

The CSS rule alone is the minimum; the hook is the correct treatment, because a dice roll that is merely "instant" still flashes.

**Accept when:** with `prefers-reduced-motion: reduce` enabled at the OS level, the game plays a full round without large translations, spins or flashes, and the dice/feedback components use `useReducedMotion()`.

---

## QA-UX-004 — P2 — The catalogue content is German-only inside a bilingual product

### What I measured

The UI is fully bilingual. The **content** is not. Every hint in the catalogue is German:

```
"hints":["Aufgenommen 1989, als die drei Bandmitglieder erst 18 oder 19 Jahre alt waren.", …]
```

An English-speaking player with the English UI receives German hints, and the same applies to lyrics and any German-only catalogue metadata. The German-primary-with-complete-English decision in the README applies to the *interface*; the *content* was never part of that work.

This also intersects directly with the spoiler model: `censorHint` is applied to German text with a German/English stopword list, and `SPOILER_CONFIG.EXCEPTIONS` contains German artist names (`Die Ärzte`, `DÖF`, `DAF`, `Fettes Brot`). The censoring logic is therefore tuned for German content only.

**Recommendation:**

1. Change the catalogue schema to carry both languages: `hints: { de: string[], en: string[] }`, `lyrics: { de: string, en: string }`.
2. Select by the active i18next language, with a documented fallback (German) when a translation is missing.
3. Extend `src/utils/validate-song-data.ts` so a pack **fails validation** when a song lacks a hint in a declared locale — making the gap machine-detectable instead of a surprise for English users.
4. Extend `SPOILER_CONFIG.EXCEPTIONS` with the short English artist names, and make `IGNORE_WORDS` language-aware (the current list already mixes both languages, which works only because the content is German).

**Accept when:** an English-language session shows English hints; the catalogue validator fails when a required locale is missing; `check:i18n` (or a sibling check) covers catalogue content.

---

## QA-UX-005 — P3 — Colour contrast: text passes everywhere, the border token fails in all four themes

I parsed the four theme files (`src/styles/themes/*.css`) and computed every foreground token against all three background tokens of its own theme (`--color-bg`, `--color-bg-secondary`, `--color-bg-card`).

**Text contrast — WCAG AA (≥ 4.5:1): all pass, with margin.**

| Theme | `--color-text` on bg | `--color-text-secondary` on bg |
|---|---|---|
| `jackbox` | `#ffffff` on `#1a0a2e` = **18.64 : 1** ✅ | `#c4b5d9` on `#1a0a2e` = **9.73 : 1** ✅ |
| `musicwall` | `#1a1a1a` on `#f5f5f5` = **15.96 : 1** ✅ | `#666666` on `#f5f5f5` = **5.27 : 1** ✅ |
| `spotify` | `#ffffff` on `#121212` = **18.73 : 1** ✅ | `#b3b3b3` on `#121212` = **8.93 : 1** ✅ |
| `youtube` | `#ffffff` on `#0f0f0f` = **19.17 : 1** ✅ | `#aaaaaa` on `#0f0f0f` = **8.25 : 1** ✅ |

The text palette is well chosen — the darkest secondary text still clears 5:1.

**Non-text contrast — WCAG 1.4.11 (≥ 3:1): `--color-border` fails in all four themes.**

| Theme | `--color-border` on `--color-bg` | Ratio | Required |
|---|---|---|---|
| `jackbox` | `#5a3d8a` on `#1a0a2e` | **2.19 : 1** | 3:1 — ❌ |
| `musicwall` | `#e0e0e0` on `#f5f5f5` | **1.21 : 1** | 3:1 — ❌ |
| `spotify` | `#404040` on `#121212` | **1.81 : 1** | 3:1 — ❌ |
| `youtube` | `#3f3f3f` on `#0f0f0f` | **1.82 : 1** | 3:1 — ❌ |

Against the *card* background the ratios are worse (1.48 / 1.32 / 1.42 / 1.42 : 1), because the card is lighter than the page background in three of the four themes.

The accent token passes comfortably everywhere (`jackbox` 5.59:1, `musicwall` 3.38:1, `spotify` 7.24:1, `youtube` 4.79:1) — the **border** is the token that is too quiet.

### Why the border token matters more than the numbers suggest

`--color-border` draws the boundaries of input fields, cards, mode buttons and score panels. A 1.21:1 border in `musicwall` is effectively invisible: a user with low vision cannot tell where the interactive area ends. It is also the token most likely to be reused as a **focus ring**, and a focus indicator needs 3:1 (WCAG 2.4.11 / 1.4.11).

This is a real, concrete accessibility defect across the whole product — and exactly the kind of thing a scripted check prevents from coming back.

**Recommendation:** raise the border tokens to ≥ 3:1 against their background, then make it permanent with an automated contrast check — a script that parses the theme files, computes every foreground/background pair, and fails below 4.5:1 for text and 3:1 for borders and focus rings. Suggested starting points (each needs re-verification against all three backgrounds):

| Theme | Current | Suggested | Verify |
|---|---|---|---|
| `jackbox` | `#5a3d8a` | `#8b6fc4` | against `#1a0a2e`, `#2d1b4e`, `#3b2766` |
| `musicwall` | `#e0e0e0` | `#767676` | against `#f5f5f5`, `#ffffff` |
| `spotify` | `#404040` | `#6e6e6e` | against `#121212`, `#1e1e1e`, `#282828` |
| `youtube` | `#3f3f3f` | `#707070` | against `#0f0f0f`, `#1a1a1a`, `#272727` |

**Accept when:** a contrast test covers all four themes, every border token clears 3:1 against all three of its backgrounds, and the test fails on a deliberately darkened token.

---

## QA-UX-006 — P3 — Focus indicators are barely present

`focus-visible` appears **5** times across the app. With `tabIndex` at 1 and no focus management (QA-UX-002), keyboard users get the browser default focus ring — which is acceptable, but a themed product on a dark background usually needs an explicit, high-contrast ring.

**Recommendation:** define one global focus-visible token in the theme layer:

```css
:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
```

with `--color-focus` defined per theme and verified at ≥ 3:1 against the background (WCAG 1.4.11).

---

## QA-UX-007 — P3 — Six game modes with no browser-level coverage of the player experience

The platform roadmap commits to Android, Google TV, Fire TV, macOS, Linux, iPadOS, iOS and Windows clients, and the web shell is the reference implementation. Yet the six game modes have no E2E coverage (see QA-TST-005), and the modes differ substantially in their interaction model — `TimelineMode` is drag-and-drop and keyboard-driven, `VibeCheckMode` is a set of mood chips, `CoverConfusionMode` is a multiple choice, `SurvivorMode` is a one-tap answer, `LyricsMode` is text input, `HintMasterMode` is a staged reveal.

**Recommendation:** record, for each mode, its **input model** (pointer, keyboard, text, drag) and its **expected platform parity** — a mode that relies on drag-and-drop will not translate to a TV remote, and that is a product decision that should be explicit before the Android/TV tracks begin, not discovered during them.

This connects to the platform spec: ADR-0006 fixes the track order (Web → Android → TV → Desktop → iOS → Windows), so a mode-by-mode input audit belongs in the **Android track's** entry criteria, not in the web QA backlog.

---

## QA-UX-008 — P3 — The guide and rules pages are the onboarding surface and deserve E2E coverage

`/guide`, `/settings/game-rules` and `/settings/governance` exist. A first-time player has to understand six modes, the scoring rules and the three end conditions before playing.

**Recommendation:** add an E2E test that navigates the guide and settings pages, asserts that every navigation target resolves, and that the game-rules page lists the same three end conditions that `GAME-008` defines. A drift between the documented rules and the implemented rules is exactly the kind of defect that survives without a browser test.

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-UX-001 Live regions for timer, score and reveal | **P1** | A screen reader announces round start, time warning, lock, reveal and score change — and not the timer every second |
| QA-UX-002 Roles, focus management, keyboard play | P2 | Focus moves on phase change; the timeline exposes listbox/option; a keyboard-only round is completable |
| QA-UX-003 Respect `prefers-reduced-motion` | P2 | With the OS setting on, no large motion plays; `useReducedMotion()` is used in the animation components |
| QA-UX-004 Bilingual catalogue content | P2 | An English session shows English hints; the validator enforces locale completeness |
| QA-UX-005 Automated contrast check | P3 | A contrast test covers all four themes and fails on a bad token |
| QA-UX-006 A themed focus ring | P3 | `:focus-visible` uses `--color-focus` at ≥ 3:1 in every theme |
| QA-UX-007 Per-mode input model | P3 | Every mode documents its input model and its TV-remote suitability |
| QA-UX-008 E2E for guide and rules | P3 | An E2E test asserts the documented end conditions match the implementation |
