# Where to change what

This file is written for someone who does **not** know the code. Every section
answers four questions: **What** do I want to change, **where** is it, **how** do
I proceed, **which command** proves the change.

If you want to change the behaviour of the product, read
[`REQUIREMENTS.md`](REQUIREMENTS.md) first — every behaviour rule with
requirement ID, acceptance and verification is there.

---

## I want to add a new game mode

A mode is **not a file**, but a network of seven places. Whoever only creates the
component ends up with a mode that the lobby does not offer and that the
projector does not know.

| # | File | What has to go in it |
|---|---|---|
| 1 | `src/config/game-config.ts` | The mode name in the type list `GameMode` (e.g. `'quiz-battle'`) and in `ALL_GAME_MODES` |
| 2 | `src/components/game/modes/<Modus>Mode.tsx` | The mode component. It receives `song`, `onAnswer(isCorrect, pointsAwarded, answeredInSeconds?)` and optionally `onReveal` |
| 3 | `src/components/game/QuestionPhase.tsx` | The call of the new component; additionally check whether the mode is in `MODES_WITH_REVEAL_BUTTON` (modes with their own reveal button, such as `lyrics` and `cover-confusion`, are **not** in there) |
| 4 | `src/components/game/RevealPhase.tsx` | A separate reveal component, e.g. `<MeinModus>Reveal song={song} />` |
| 5 | `src/components/lobby/ModeSelector.tsx` | The entry in the `MODES` list (emoji, title, tagline, text, colour gradient) |
| 6 | `src/components/game/DrawingPhase.tsx` | The entry in `MODE_META` (icon, title, instruction) — otherwise the type check breaks |
| 7 | `src/components/game/GameHeader.tsx` and `src/app/projector/page.tsx` | `MODE_ICONS` / `MODE_LABELS` respectively `MODE_LABELS` — icon and display name |

On the data side the song must carry the mode: the field `supportedModes` in
`src/types/song.ts` and in every file under `src/data/songs/`. Without this
entry the picker filters the mode away (`src/utils/song-picker.ts`, filter
`supportedModes`).

**Commands:**

```bash
npm run typecheck            # fails if one of the seven places is missing
npm run test
npm run validate-catalog     # catalogue gate after new songs
npm run build
```

---

## I want to change points, point cap or time limits

**First check whether the number already lives centrally.** The values are in
`src/config/game-config.ts`:

| Value | Constant | Default |
|---|---|---|
| Target score (win condition `points`) | `DEFAULT_WIN_SCORE` | 10 |
| Points per hint level (Hint-Master) | `HINT_MASTER_POINTS` | `[5, 4, 3, 2, 1]` |
| Point cap (Timeline) | `DEFAULT_TIMELINE_MAX_POINTS` | 5 |
| Time decay on/off | `DEFAULT_TIME_DECAY_ENABLED` | `false` |
| Grace period before the deduction | `DEFAULT_TIME_DECAY_GRACE_SECONDS` | 5 s |
| Length of one deduction step | `DEFAULT_TIME_DECAY_STEP_SECONDS` | 5 s |
| Points per deduction step | `DEFAULT_TIME_DECAY_STEP_POINTS` | 1 |
| Minimum points for a correct answer | `DEFAULT_MIN_POINTS_PER_CORRECT` | 1 |
| Time limit per question | `config.timeLimitSeconds` | `null` (no limit) |

**Attention:** four modes do **not** have their points in the config, but
hard-coded in the component:

| Mode | File | Points |
|---|---|---|
| Lyrics Labyrinth | `src/components/game/modes/LyricsMode.tsx` | `LYRICS_POINTS = 4` |
| Lyrics bonus round (without lyrics) | `src/components/game/modes/LyricsMode.tsx` | 2 |
| Survivor | `src/components/game/modes/SurvivorMode.tsx` | 3 |
| Vibe-Check | `src/components/game/modes/VibeCheckMode.tsx` | 2 (with cheat 1) |
| Cover Confusion | `src/components/game/modes/CoverConfusionMode.tsx` | `POINTS_BY_HINTS = [5, 4, 3, 2]`, variant 3 |
| Cheat deductions | `HintMasterMode.tsx` (−2), `TimelineMode.tsx` (−2 resp. −1), `SurvivorMode.tsx` (−1) | deducted immediately |

If you want to change one of these numbers, change **the constant at the place
where it stands**, and record it afterwards in `REQUIREMENTS.md`. If you want to
centralise it permanently, you move it first to `src/config/game-config.ts` —
that is the project rule "constants come from `src/config/`".

The **selectable options in the lobby** live elsewhere: `src/app/lobby/page.tsx`,
arrays `TIME_LIMIT_OPTIONS` (no limit / 30 s / 60 s / 120 s),
`DIFFICULTY_OPTIONS` and the number lists for the win condition
(points 50/100/200/500, rounds 5/10/15/20, time 30–240 minutes).

The **time decay calculation** itself is in `src/app/game/page.tsx` in
`handleAnswered()`:

```ts
const overtime = Math.max(0, answeredInSeconds - config.timeDecayGraceSeconds);
const decaySteps = Math.floor(overtime / Math.max(1, config.timeDecayStepSeconds));
const decayPoints = decaySteps * config.timeDecayStepPoints;
pointsAwarded = Math.max(config.minPointsPerCorrect, basePointsAwarded - decayPoints);
```

**Commands:**

```bash
npm run typecheck
npm run test
npm run build
```

---

## I want to add a song

The catalogue is in `src/data/songs/`, one file per letter bucket
(`A1.json` … `Z.json`, `Ñ.json`), each file with the field `songs`.

**Steps:**

1. **Create the record.** The object must satisfy the schema from
   `src/types/song.ts`: `id`, `title`, `artist`, `year`, `country`, `genre`,
   `difficulty`, `mood[]`, `hints[5]`, `hintEvidence[5]`, `lyrics` (`null` or
   `{ real[3], fake }`), `isOneHitWonder`, `packs[]`, `supportedModes[]`,
   `isQRCompatible`, `links.youtube` (mandatory).
2. **Choose the file.** The bucket is formed by the first letter of the artist;
   the generator `scripts/migrate_and_deduplicate.py` creates up to 100 songs
   per file.
3. **Regenerate the index.** `src/data/songs/index.ts` is generated
   automatically ("Do not edit it manually"). After a new file the generator has
   to run:

   ```bash
   python3 scripts/migrate_and_deduplicate.py
   ```

4. **Validate.** The schema gate runs over a single file:

   ```bash
   npm run validate-songs                                    # checks src/data/songs/A1.json
   npx tsx src/utils/validate-song-data.ts src/data/songs/B1.json
   npm run validate-catalog                                  # catalogue gate over all files
   ```

5. **Get the cover.** The retrieval runs through the admin API (see below):
   `scripts/fetch-covers.js` searches covers via iTunes and Deezer — the script
   still targets the old directory `src/data/packs/` and has to be switched to
   `src/data/songs/` before it finds data again.
6. **Commit.** According to `docs/DOCUMENTATION_POLICY.md` the documentation
   belongs in the same commit; for a new song that is usually the catalogue
   report.

**Rules that the gate checks:** no duplicates (artist + title + year), no title
or artist spoilers in the hints, `hintEvidence` with a verifiable source, `mood`
only from the known moods, `links.youtube` set.

---

## I want to add a pack

A pack is a **key mapping**, not a folder.

1. `src/config/game-config.ts`, array `SONG_PACKS`: an entry with `id` (the key
   that is in `song.packs`), `name`, `tagline`, `emoji`, `gradient`.
2. `src/data/songs/packs.json`: an entry with the same key, optionally `pack`,
   `version`, `updatedAt`, `songCount`.
3. In the affected song files, add the new key to `packs[]`.
4. Map old key formats (e.g. `global-hits`) to the new key via `PACK_ALIASES` in
   `src/config/game-config.ts` — otherwise saved game states from older
   versions yield empty selections (`src/utils/song-picker.ts`,
   `normalizePackIds()`).

**Commands:**

```bash
npm run validate-catalog
npm run build
```

---

## I want to add a theme

Themes are sets of CSS variables that are activated via the attribute
`data-theme` on the `<html>` element.

1. Create `src/styles/themes/<name>.css`. The block must be called
   `[data-theme='<name>']` and set the same variables as the existing themes
   (`src/styles/themes/jackbox.css` as template):
   `--color-bg`, `--color-bg-secondary`, `--color-bg-card`, `--color-text`,
   `--color-text-secondary`, `--color-primary`, `--color-primary-hover`,
   `--color-secondary`, `--color-accent`, `--color-success`, `--color-error`,
   `--color-border`, `--font-heading`, `--font-body`, `--radius`.
2. `src/app/globals.css`: add the block to the list of theme selectors (all four
   `[data-theme='…']` rules stand side by side there).
3. `src/config/game-config.ts`: extend `ThemeName` and add the name to
   `AVAILABLE_THEMES`. `DEFAULT_THEME` stays as it is.
4. `src/components/ui/ThemeSwitcher.tsx`: button for the new theme.
5. `src/i18n/locales/de.json` **and** `en.json`: keys under `themes.<name>`.
6. `src/components/ui/NavBar.tsx`: add the accent colour to `THEME_COLORS`.

The theme is stored in `localStorage` under `phomu-theme` and set on start via
`src/contexts/ThemeContext.tsx`.

**Commands:**

```bash
npm run typecheck
npm run build
```

---

## I want to translate a new text

Basic rule: **every visible text comes from the translation**, in both
languages. The keys are flat with a dot path
(`namespace.subitem.label`), in `camelCase`, without interpolation in the key —
placeholders belong in the **value** (`{{count}}`).

1. Find the text location. Literal texts are still present in the JSX; one
   example is the button in `src/components/game/QuestionPhase.tsx`
   (`"Alle fertig → Reveal"`, in English `"Everyone's done → Reveal"`).
2. Create the same key in `src/i18n/locales/de.json` **and**
   `src/i18n/locales/en.json`. `en.json` gets a **real English** translation,
   not a copy of the German values.
3. Replace it in the component. Client components:

   ```tsx
   'use client';
   import { useTranslation } from 'react-i18next';
   const { t } = useTranslation();
   return <button>{t('game.allDoneToReveal')}</button>;
   ```

   Server components: `getTranslations` from `next/server`.
4. Proper nouns (Spotify, YouTube, Jackbox, Phomu, mode names) remain identical
   in both languages.
5. Create plural forms via `key_one` / `key_other` in parallel in both
   languages.

**Commands:**

```bash
npm run check:i18n          # DE/EN complete and in parity, no literal text in the JSX
npm run typecheck
npm run build
```

The gate command checks both: the same keys in `de.json` and `en.json`, no empty
values, **no literal text left in the JSX**. It counts the remaining hardcoded
texts — at the last measurement 465 in 47 `.tsx` files. Every replaced literal
text disappears from this number, so the value is a snapshot of the migration
progress.

---

## I want to change the admin API

The admin API lives under `src/admin-api/` and is **not** part of the static
export: `next.config.ts` sets `output: 'export'`. The routes therefore only
work while the app runs via `next dev` or `next start`, not in the exported
static build.

| Route | File | Purpose |
|---|---|---|
| `GET /admin/covers/search` | `src/admin-api/admin/covers/search/route.ts` | cover search via iTunes and Deezer |
| `POST /admin/covers/save` | `src/admin-api/admin/covers/save/route.ts` | download the cover, store it in `public/covers/`, set `coverUrl` in the pack |
| Guard and validators | `src/admin-api/_lib/security.ts` | token check, input and URL check |

**Rules for every change there:**

1. Every route begins with `assertAdminAccess(request)` and returns its response
   directly on errors.
2. Inputs go through `boundedText()`, `parseSongId()` or `parseHttpUrl()`.
3. External retrievals go through `fetchWithTimeout()`.
4. Images only over HTTPS and only from hosts in `ALLOWED_IMAGE_HOSTS`, at most
   5 MB.
5. **Every hardening needs a negative test:** missing token, token too short,
   manipulated URL, host not allowed, file too large.

**Commands:**

```bash
npm run typecheck
npm run test
npm run build
```

---

## I want to generate or change the admin token

The token protects the admin API. It is an environment variable and belongs
**not** in the repository.

```bash
# 1. Create the template
cp .env.example .env.local

# 2. Generate the token — the script does not write the value into the file,
#    it prints it to the console:
npm run security:rotate-admin-token

# 3. Enter the output in .env.local:
#    ADMIN_API_TOKEN=<the printed hex string>
```

Alternatively by hand: `openssl rand -hex 32`. The script
`scripts/generate-admin-token.js` generates 32 bytes as hex (64 characters) if
`ADMIN_TOKEN_BYTES` is not set; a smaller value is rejected.

The minimum length is **32 characters** (`MIN_ADMIN_TOKEN_LENGTH` in
`src/admin-api/_lib/security.ts`). If `ADMIN_API_TOKEN` is not set, the API
answers with **503** ("Admin API not configured"), with a token that is too
short also **503**, with a wrong token **401**.

**Commands:**

```bash
npm run typecheck
npm run test
```

---

## I want to change the print layout

The card dimensions are in `src/config/game-config.ts`:

| Constant | Value | Meaning |
|---|---|---|
| `CARD_WIDTH_MM` | 59 | card width |
| `CARD_HEIGHT_MM` | 91 | card height |
| `CARD_BLEED_MM` | 3 | bleed all around |
| `MAX_CARDS_PER_SET` | 110 | cards per set |

These are the only four places — there is **no** drawing function that uses
them. A print or export tool is **not implemented**.

What the QR scanner understands is in `src/utils/qr-intent.ts`:

| Content | Meaning | Processed by the game? |
|---|---|---|
| `@Name` | add the player to the lobby | yes |
| `…?pack=<packId>` | select the pack in the lobby | yes |
| `…?session=<code>` | join the session | parser yes, game no |
| `…?id=<songId>` | open the song | explicitly **not** (`unsupported-song-link`) |

If you change the layout, change the four constants in
`src/config/game-config.ts`, adapt the format in the printing guide
([`docs/guides/PRINTING-GUIDE.md`](docs/guides/PRINTING-GUIDE.md)) and check
whether a new payload format has to be added in `src/utils/qr-intent.ts`.

**Commands:**

```bash
npm run typecheck
npm run test -- qr-intent
```

---

## I want to write a test

| Layer | Location | Tool |
|---|---|---|
| Unit (utilities) | `src/utils/*.test.ts` | Vitest |
| Unit (component) | `src/components/**/*.test.ts(x)` | Vitest |
| E2E | `e2e/*.spec.ts` | Playwright |

Existing examples: `src/utils/qr-intent.test.ts` (4 tests),
`src/utils/validate-song-data.test.ts` (8 tests),
`src/components/game/MusicPlayer.test.ts` (7 tests),
`src/utils/ai-task-queue.test.ts` (2 tests).

**Unit test:**

```bash
npm run test -- qr-intent          # one file
npm run test                        # everything with coverage
```

**E2E test:** The browsers must be installed once.

```bash
npm run test:e2e:install            # Chromium
npm run test:e2e:install:linux      # Linux only: missing system libraries
npm run test:e2e:smoke              # the smoke test
```

The Playwright runner starts a dev server on port 3000 itself
(`playwright.config.ts`, `webServer.command = 'npm run dev'`). If something is
already running there, set `E2E_BASE_URL` to the existing instance.

**Rules:** Every behaviour change needs a test that **executes** the behaviour,
not imitates it. No `skip`, no `@Ignore`, no commented-out test to make a gate
green. Every hardening additionally needs a **negative** test.

---

## I want to extend the CI

Currently there is **one** workflow file: `.github/workflows/deploy.yml`. It
builds the site and publishes it to GitHub Pages. It only runs on pushes to
`main` and manual starts; it runs **neither** typecheck nor lint nor tests.

**Add a new job** (file `.github/workflows/quality.yml`):

```yaml
name: Quality

on:
  push:
    branches: ["main", "feature/**"]
  pull_request:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run validate-catalog
      - run: npm run build
```

**Node version:** `package.json` contains **no** `engines` field. Version 20 is
derived from `.github/workflows/deploy.yml` (`node-version: "20"`). If you need
a different version, change both places at the same time — or add `engines` to
`package.json` first.

**Run the same locally:**

```bash
npm run local-ci
```

`scripts/local-ci.sh` runs typecheck, lint, unit tests, format check (not
blocking), `validate-songs`, `validate-catalog`, build and `npm audit` in this
order.

---

## I want to change a behaviour (game rule, points, flow)

1. Look for the requirement in [`REQUIREMENTS.md`](REQUIREMENTS.md) that
   describes the behaviour, or create a new one with the next free ID of the
   domain (`GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `CORE`,
   `NFR`).
2. Material changes need a change request under `docs/cr/`.
3. Implement, write a test, update the documentation in the same commit — the
   mapping is in [`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md).
4. Prove it:

   ```bash
   npm run local-ci
   ```

---

## I want to change the documentation

| I change | Then I update |
|---|---|
| a term | [`GLOSSARY.md`](GLOSSARY.md) |
| a number in `src/config/` | the place in the documentation that mentions it — the constant itself remains the only truth |
| a game mode | `REQUIREMENTS.md`, `docs/user-guide/USER-GUIDE.en.md`, `docs/BEST_IN_CLASS.md` |
| the interface | `docs/user-guide/USER-GUIDE.en.md` |
| the catalogue | the catalogue report, not the numbers in the README |

Existing documentation in the repo root (`README.md`, `CONTRIBUTING.md`,
`SECURITY.md`, `LLM.md`, `PRINTING_GUIDE.md`) stays where it is;
`PRINTING_GUIDE.md` refers to
[`docs/guides/PRINTING-GUIDE.md`](docs/guides/PRINTING-GUIDE.md).

---

## I do not know where the file is

The index of all documents is in [`docs/README.md`](docs/README.md). The layers
of the code and their dependency direction are in
[`ARCHITECTURE.md`](ARCHITECTURE.md).
