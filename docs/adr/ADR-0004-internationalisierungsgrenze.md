# ADR-0004 — The Internationalisation Boundary

**Status:** Accepted
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** I18N-001 (language support), I18N-002 (completeness), UI-003 (interface)

---

## Context

Phomu is German-first and shall support English **completely**. The i18n
infrastructure exists and is wired correctly:

```text
src/i18n/config.ts          Bootstrap (i18next + LanguageDetector + initReactI18next)
src/i18n/locales/de.json    25 keys
src/i18n/locales/en.json    25 keys, key-parallel
src/components/Providers.tsx:20   import('@/i18n/config')  ← only bootstrap
```

The `LanguageDetector` searches in `localStorage` and `navigator`, caches in
`localStorage` (`src/i18n/config.ts:26-29`), `fallbackLng` is `'de'`.
`src/app/layout.tsx:32` sets `<html lang="de">` **statically** — with the
English language active the attribute stays German.

### The measured current state

| Metric | Value | Command |
|---|---|---|
| Keys in `de.json` / `en.json` | 25 / 25, **parallel**, 0 differences | JSON flat count of both files |
| Namespaces in the locales | `app`, `landing`, `settings`, `themes`, `modes`, `common` | `de.json` |
| Files with `useTranslation` | **4** | `grep -rl "useTranslation" src` → `app/page.tsx`, `components/ui/NavBar.tsx`, `components/ui/LanguageSwitcher.tsx`, `components/ui/ThemeSwitcher.tsx` |
| Files with German UI literals | **56 of 73** (without test files) | Vocabulary scan over 60 German UI terms → 746 hits |
| translated ≠ present | `modes.*` (5 values), `common.*` (7 values), `themes.*` (4) | `de.json` |

The game area is completely hardcoded German: `src/app/lobby/page.tsx`
(45 hits), `src/components/game/RevealPhase.tsx` (44),
`src/app/admin/review/page.tsx` (36), `src/components/game/modes/HintMasterMode.tsx`
(27), `src/app/game/page.tsx` (26), `src/components/game/DrawingPhase.tsx` (20),
`src/app/projector/page.tsx` (20). In addition come the **language lists** in
`src/utils/feedback-messages.ts` (76 hits, 100 correct and 100 wrong sentences)
and `src/utils/last-round-messages.ts` (12 messages).

### Why the question has to be asked

There are three possible boundary drawings:

1. **The component translates itself** (`t('…')` directly in the JSX).
2. **A helper layer translates** (e.g. `src/utils/text.ts` with
   `getLabel('lobby.start')`).
3. **The resource file translates** (`src/i18n/locales/*.json`).

Variant 2 is tempting because it types the key space. But it creates a second
place where keys and values are produced — and one that is no longer managed by
i18next (no plural forms, no fallback logic, no completeness check).

---

## Decision

### 1. The translation lives in `src/i18n/locales/*.json`

Single source for visible text. No visible literal text remains in the JSX. The
bootstrap stays in `src/i18n/config.ts`; the only initialisation happens in
`src/components/Providers.tsx:20`.

### 2. The translation happens **at the interface boundary**

The translation happens **in the client components**, right where the text is
rendered — with `useTranslation()` from `react-i18next`:

```tsx
'use client';
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('lobby');
  return <button>{t('start')}</button>;
}
```

**Why not translated in the components — the rationale:**

A component that translates itself does three things at once: it decides
**about the text**, it decides **about its placement** and it is **responsible
for completeness**. The consequences:

- **No shared place.** The same text (`"Punkte"` (points), `"Runde"` (round),
  `"Weiter"` (next)) stands in ten components in ten places. One fix, one
  change, one typo — ten times.
- **Markup and text become inseparable.** A text with a placeholder
  (`{{count}}`) has to be formatted in the component; the formatting is then
  bound to the markup and can no longer be exchanged for other language
  variants.
- **Completeness becomes uncheckable.** A script can compare `de.json` and
  `en.json`. It cannot check whether a literal is missing in the JSX.

Therefore the boundary is: **values in resources, structure in the component.**

### 3. Key space: flat, `camelCase`, dot-separated, without interpolation

| Rule | Value | Rationale |
|---|---|---|
| Separator | `.` | `namespace.subitem.label` |
| Notation of the **key** | `camelCase` | `hintLevel`, `pointsTotal` — keys are identifiers, not translations |
| Notation of the **value** | free | Values are prose, not code |
| Interpolation | **never in the key** | Placeholders stand in the **value**: `"{{count}} Spieler"`. Keys stay static, otherwise the key space is no longer findable. |
| Plural | i18next plural forms `key_one` / `key_other` | `common.player_one`, `common.player_other` |
| Numbers/date | `Intl` with `i18n.language` | **not** `toLocaleString()` without locale |
| `common.*` | predefined, shared by all areas | `common.back`, `common.cancel`, `common.points` … |
| Proper names | identical in both languages | "Spotify", "YouTube", "Jackbox", "Phomu", mode names |

### 4. Namespaces per screen

`landing`, `lobby`, `game`, `modes`, `browse`, `settings`, `admin`,
`projector`, `gameover`, `guide`, `legal`, `themes`, `common`, `errors`, `a11y`.

### 5. What is **not** translated

| Do not translate | Rationale |
|---|---|
| Song titles, artists, lyrics from the catalogue | Content, not UI. They stand in `src/data/songs/*.json` and are **not** pulled through i18next. |
| `PhomuSong.FIELDS` (field names in the admin editor) | Schema identifiers, not interface |
| Error messages of the admin API | Server-side; `src/admin-api/**` runs without an i18n runtime |
| Emoji and symbols | `🎵`, `🏆` — character-wise, not linguistic |
| Mode IDs (`timeline`, `hint-master`) | Identifiers in the code and in the URL |
| **Numeric values** (points, rounds, minutes) | Values, not texts — they are formatted via `Intl` |

### 6. The migration path: screen by screen

The migration is **incremental** and proceeds in the order of the areas:

| Order | Area | Why first |
|---|---|---|
| 1 | `common.*`, `errors.*`, `a11y.*` | Basic vocabulary, shared by all areas |
| 2 | `lobby`, `modes`, `themes` | Entry point for most users |
| 3 | `game`, `gameover` | Game text, including `src/utils/feedback-messages.ts` and `src/utils/last-round-messages.ts` |
| 4 | `browse`, `admin` | Tool pages |
| 5 | `settings`, `projector`, `guide`, `legal` | Side areas |

Each migrated area is secured with a negative test: the completeness gate fails
if a key exists in only one language, if a value is empty, or if literal text
remains in the JSX.

### 7. The `lang` attribute follows the language

`src/app/layout.tsx:32` sets `lang="de"` statically. With `en` active the
attribute must be `lang="en"` — screen readers and the keyboard then follow
the actual language. Because `src/app/layout.tsx` is a server component and
the language is chosen client-side, the attribute is set via a small client
helper (`src/components/LanguageHtmlAttribute.tsx`) or via a
`document.documentElement.lang` effect.

---

## Consequences

### Positive

- One place for text: `src/i18n/locales/*.json`. A fix for `"Zurück"` (back)
  is a change to **one** line.
- Completeness becomes **checkable**: `de.json` ↔ `en.json` are parallel
  (already today: 25 ↔ 25, 0 differences), and a gate can prevent a literal
  from returning in the JSX.
- Plural forms, placeholders and date formats get a defined home
  (`common.*`, i18next plural forms, `Intl`).
- The catalogue stays language-neutral: song titles are neither translated nor
  duplicated into the locale files.

### Negative / Trade-offs

- **Migration effort.** 56 of 73 source files contain German UI literals
  (746 hits in the vocabulary scan). That is work without product benefit for
  the German version.
- **The game area is the most expensive.** The 102 feedback sentences in
  `src/utils/feedback-messages.ts` (`CORRECT_MESSAGES`, `WRONG_MESSAGES`) and
  the 12 messages in `src/utils/last-round-messages.ts` are **data, not UI
  literals**: They are exported as **one** key per array
  (`game.feedback.correct`, `game.feedback.wrong`, `game.lastRound.messages`),
  so that the translation gets **one** string per language instead of 102.
- **Stricter gates hit existing code.** A completeness gate that finds literal
  text in the JSX will be **red** at first — it has to work with a baseline
  (`known-untranslated`), otherwise it blocks every further development.
- **One key for an array is unusual.** The i18next convention
  `feedback.correct.0`, `feedback.correct.1`, … would be more precise, but
  generates 204 keys per language and a fragile index mapping.

### What the decision makes impossible

- Visible literal text in the JSX is no longer permissible.
- The catalogue (`src/data/**`) does **not** become part of the i18n system.
- A key may not contain interpolation.
- `de.json` and `en.json` are always kept **parallel** — one language without
  the other is an error, not a feature.

---

## Rejected alternatives

- **Translation directly in the components with fixed key strings.**
  *Rejected:* That is exactly the variant that replaces the resource file. The
  key space is spread across the components, completeness becomes uncheckable,
  and markup and text stay coupled.
- **A separate translation layer `src/utils/text.ts`.** *Rejected:* It
  duplicates the i18next functionality (fallback, plural, locale detection)
  and creates a second place where keys are produced.
- **Include the catalogue in the locales.** *Rejected:* Song titles, artists
  and lyrics are content and not UI; 136 JSON files would be duplicated into
  two language files and kept in sync with every catalogue change.
- **Maintain only `de.json`, `en.json` later.** *Rejected:* `fallbackLng: 'de'`
  hides the gap state — the user sees German and does not notice that
  something is missing. Parallel files with a gate are more honest.
- **Translation at runtime via a server service.** *Rejected:*
  `output: 'export'` allows no server routes; in addition a network access
  during rendering would dilute the static delivery.
- **Leave the mode and feedback texts as code constants (status quo).**
  *Rejected:* `src/utils/feedback-messages.ts` is a list of **German
  sentences** — that is content which belongs into the language files.

---

## Verification

| Check | Command / Location |
|---|---|
| Parallelity of the locales | `scripts/check-i18n-completeness.mjs` (new): `de.json` ↔ `en.json`, same keys, no empty values, plural forms identical |
| No literal text in the JSX | same gate, pattern "German literal text in JSX text nodes" — with a baseline for the migrated areas |
| Use of the translation | `grep -rl "useTranslation" src` — grows with every migrated area |
| No interpolation in the key | Gate rule: keys contain no `{` |
| Plural forms | `grep -rn "_one\|_other" src/i18n/locales/*.json` — identical in both languages |
| Number format | `grep -rn "toLocaleString()" src` → 0 hits without a locale argument |
| `lang` attribute | `src/app/layout.tsx:32` — follows `i18n.language` |
