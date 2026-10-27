# Phomu — Product specification (Requirements)

**Requirements baseline:** 0.1
**Status:** Product baseline — derived from the code state `feature/vocument-style-docs-and-i18n`, commit `d5b6422` (2026-10-25)
**Rule:** The requirements in this document are the truth for the behaviour of Phomu. Code that behaves differently is a bug in the code — not a silent change of the requirement.

**Origin of this document:** The document was **derived from the code**, not from the legacy specifications. The predecessor documents (`LLM.md` as well as `specifications/*.md`) were moved on 25.10.2026 to `specifications/archive/*_archivstand_2026-10-25.md` and are **historical, no longer binding** (see `specifications/README.md`). The comparison with the archived state is listed in [Contradictions](#contradictions) with evidence. Every requirement names the path that proves it and the command with which it is checked. Where a rule is not yet tested, this is stated explicitly and the associated gap is tracked in [Open gaps](#open-gaps).

**Machine-readable truth:** `project/project.yaml` carries baseline, status, milestones, module boundaries, requirement IDs and quality thresholds. The root documents point there; this document is the subject-matter source, the file there is the machine-readable project status. For `project/project.yaml` see [Project status file](#project-status-file-projectprojectyaml).

**Legend**

| Marker | Meaning |
|---|---|
| **Preset** | Default behaviour, active and reachable for every user |
| **Optional** | Present in the code, but not enabled or not selectable |
| **Later** | Deliberately deferred — the code deliberately contains no reliable path |

**Verifiability of the gates (measured in this work round, 2026-10-25)**

| Command | Result | Source |
|---|---|---|
| `npm run typecheck` | green (exit 0) | `tsc --noEmit` |
| `npm run lint` | 0 errors, 1 warning (`playwright.config.ts:1`) | `eslint .` |
| `npx vitest run` | 4 test files / 21 tests passed | `vitest.config.ts` (`include: src/**/*.test.ts`) |
| `npm run validate-catalog` | 135 pack files, 1,615 songs, 0 schema errors, 126 warnings, 0 duplicate groups, 4 permitted duplicates, 0 missing years (1950–2026) | `src/utils/validate-song-catalog.ts` |
| `node scripts/check-i18n-completeness.mjs --count` | 935 literal texts in 47 files; `src/i18n/locales/parts/` is empty | `scripts/check-i18n-completeness.mjs` |
| `npm run build` | not measured in this round | — |

---

# 1. Product principles (CORE)

### CORE-001 — Requirements are the truth for behaviour

**Preset:** Preset
**Requirement:** The behaviour of Phomu is defined by the requirement IDs in this document. Every ID is referenced in the code, in tests and in the documentation; an ID is never reused.
**Rationale:** Without stable IDs it cannot be checked whether a change violates a requirement. The ID schemes (`CORE`, `GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`) are fixed in the reform contract.
**Acceptance:** Every requirement block in this document carries an ID from the `<DOMAIN>-<NNN>` scheme with three digits; the IDs are consecutive and gapless per domain.
**Verification:** `grep -c '^### ' REQUIREMENTS.md` counts all requirement blocks (current state: 175); the uniqueness of the IDs is checked with `grep -o '^### [A-Z]*-[0-9]*' REQUIREMENTS.md | sort | uniq -d` (empty = no duplicate).

### CORE-002 — Free open source without a forced account

**Preset:** Preset
**Requirement:** Phomu is licensed under AGPL-3.0-or-later. There is no registration, no subscription, no advertising and no forced coupling to a service. All core features — lobby, game, catalogue, the local admin tool — work without a user account.
**Rationale:** The game is played in bars, at birthday parties and in clubs. A mandatory sign-up would be an obstacle precisely where the product is supposed to work.
**Acceptance:** `LICENSE` contains AGPL-3.0-or-later; `package.json` lists `"license": "AGPL-3.0-or-later"`; there is no auth provider and no login route in `src/app/`.
**Verification:** `cat LICENSE | head -3`; `grep -rn '"license"' package.json`; `ls src/app/` contains no `login`/`signup` route.

### CORE-002a — The source of the deployed version is offered to the network users

**Preset:** Preset
**Requirement:** Everyone who interacts with Phomu over a network can obtain the complete corresponding source of the version they are interacting with. This is the obligation of AGPL-3.0 §13 and it applies to every distribution channel.
**Rationale:** The AGPL was chosen over the GPL because a party game is played through a browser as often as on a phone: the users of the web application are users of a modified version, and they are entitled to its source. The obligation is satisfied by making the source easy to find, not by adding a new account or a new dialog.
**Acceptance:** The legal pages name the repository and offer the source (`src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/i18n/locales/de.json` → `legal.terms.section5.body`, `legal.privacy.section5.body`); the footer carries the licence name (`landing.footerTagline`); `LICENSE.md` explains how the obligation is met per channel. The web shell has no server-side component that runs the program, so the deployed version is the version in the repository.
**Verification:** `grep -n "github.com/mazer666/Phomu" src/i18n/locales/de.json src/i18n/locales/en.json`; `grep -n "footerTagline" src/i18n/locales/de.json`; `ls LICENSE.md`.

### CORE-003 — Local-first and data-minimising

**Preset:** Preset
**Requirement:** Player, score, configuration and progress data stay in the browser of the device (`localStorage`). No personal profiles are created on servers; there is no tracking and no telemetry upload.
**Rationale:** Party games are played in situations where guests do not want to hand their account over to strangers. The privacy notice must reflect the technical reality, not a wish.
**Acceptance:** The state lives in the state store with `persist` middleware under the key `phomu-game-state` (`src/stores/game-store.ts:618-638`); the admin interface writes exclusively to `localStorage` (`src/app/admin/songs/page.tsx:30`, `STORAGE_KEY = 'phomu-admin-songs'`). The only outgoing usage data flow is the optional "Report Missing" dialog (see MEDIA-013).
**Verification:** `grep -n "persist(" src/stores/game-store.ts`; `grep -rn "localStorage" src/app/admin/ src/stores/`; `grep -rni "supabase\|firebase\|analytics\|gtag" src/ package.json` (must be empty).

### CORE-004 — Hybrid of physical card and digital deck

**Preset:** Preset
**Requirement:** Both ways into the game are supported to the same degree: the digital deck (a random draw from the catalogue) and the physical card (QR scan). The QR scan leads to a quick play with the scanned song.
**Rationale:** The product idea is the bridge between printed game material and digital music playback. One way without the other halves the value of the product.
**Acceptance:** `DrawingPhase` draws digitally (`src/components/game/DrawingPhase.tsx:123-146`); `QRScannerModal` + `parseQrIntent` process card QRs (`src/components/game/QRScannerModal.tsx:31-56`, `src/utils/qr-intent.ts:16-43`); `startQuickGame` starts with the scanned song (`src/stores/game-store.ts:496-513`).
**Verification:** `npm run test -- qr-intent`; `grep -n "startQuickGame" src/stores/game-store.ts src/app/browse/page.tsx`.

### CORE-005 — Anti-spoiler is a product promise, not a comfort feature

**Preset:** Preset
**Requirement:** During the question round, title, artist, cover and streaming metadata are not visible to the guessing players. The reveal releases the identity of the song only once the answer has been secured.
**Rationale:** Anyone who identifies the song before the reveal ruins the round for everyone else. The protection must apply in every mode, not only in the obvious ones.
**Acceptance:** The `MusicPlayer` renders the provider embed beneath a blur/overlay layer (`src/components/game/MusicPlayer.tsx:424-479`); `blurred` is set in all question phases (`TimelineMode.tsx:281`, `HintMasterMode.tsx:133`, `LyricsMode.tsx:121`, `SurvivorMode.tsx:69`, `CoverConfusionMode.tsx:114`); `VibeCheckMode.tsx:99` deliberately sets `blurred={false}`, because there the mood is asked instead of the identity.
**Verification:** `grep -rn "blurred={" src/components/game/modes/`; no test exists — see [GAP-001](#open-gaps).

### CORE-006 — One core, six clearly separated game modes

**Preset:** Preset
**Requirement:** Phomu knows exactly six game modes: `timeline`, `hint-master`, `lyrics`, `vibe-check`, `survivor`, `cover-confusion`. Each mode has its own question logic, its own scoring formula and its own reveal presentation.
**Rationale:** The six modes are the actual product core. They must not collapse into a generic quiz, otherwise the mode switch is mere cosmetics.
**Acceptance:** `PHOMU_CONFIG.ALL_GAME_MODES` lists the six modes (`src/config/game-config.ts:300-307`); `QuestionPhase` dispatches per mode to its own component (`src/components/game/QuestionPhase.tsx:58-83`); `RevealPhase` has its own reveal card per mode (`src/components/game/RevealPhase.tsx:541-546`).
**Verification:** `grep -n "ALL_GAME_MODES" src/config/game-config.ts`; no test exists — see [GAP-001](#open-gaps).

### CORE-007 — No forced detours, no onboarding mandate

**Preset:** Preset
**Requirement:** From the start screen to the game at most two clicks are needed. There is no tour, no red dots, no "tip-of-the-day" messages and no mandatory registration.
**Rationale:** A party game lives on immediate playability. Every step placed in front of it is a lost party.
**Acceptance:** Both start buttons of the landing page navigate directly to `/lobby` (`src/app/page.tsx:56-84`); the lobby offers `Schnell-Setup` (quick setup) as a shortcut (`src/app/lobby/page.tsx:730-734`).
**Verification:** `grep -n "router.push('/lobby')" src/app/page.tsx`; `grep -n "Schnell-Setup" src/app/lobby/page.tsx`.

### CORE-008 — German-first, English complete

**Preset:** Preset
**Requirement:** The interface is German-first; English is completely maintained as a second language. Both languages must have the same key scope, and no visible text may be hard-coded in the JSX.
**Rationale:** The product originated in the German-speaking market but is advertised internationally. A half-translated interface is worse than an honestly German one.
**Acceptance:** **Partially met.** `src/i18n/locales/de.json` and `en.json` are parallel (currently 6 namespaces / 25 flat keys each, measured); `i18n.config` uses `fallbackLng: 'de'` (`src/i18n/config.ts:22`). Not met: the visible text still comes predominantly hard-coded from the JSX (935 literal texts in 47 files).
**Verification:** `node scripts/check-i18n-completeness.mjs --count` — currently reports 935 literal texts in 47 files. The gate is only green when 0 literal texts remain; it is not yet wired as `npm run check:i18n` — see [GAP-006](#open-gaps) and [I18N-007](#i18n-007--every-visible-text-comes-from-the-translation).

### CORE-009 — The code is the truth, the documentation follows

**Preset:** Preset
**Requirement:** The numbers and rules in this document are derived from `src/config/game-config.ts` and from the code. Anyone who changes a number in the documentation must change the source as well; the source takes precedence.
**Rationale:** The previous documentation (LLM.md, `specifications/*`) is outdated exactly where it took numbers from memory instead of from the code (Next.js 15 instead of 16, 5 instead of 6 modes, 1,915 instead of 1,615 songs).
**Acceptance:** Every requirement related to points, time or capacity names `file:line`. No requirement contains a number without a source.
**Verification:** `grep -n "game-config.ts" REQUIREMENTS.md` — every rule related to points, time or capacity refers to an evidenced location.

### CORE-010 — No decoys as accepted functionality

**Preset:** Preset
**Requirement:** A feature that is reported as implemented must be a real, executable implementation. Stubs, dummy returns, placeholder assets or synthetic mock bridges do not count as "done".
**Rationale:** The catalogue contains hundreds of entries with empty fields; the admin area is full of localStorage mock-ups. Without this rule every acceptance becomes a claim.
**Acceptance:** Known violations are named in the [Open gaps](#open-gaps) (missing audio assets, unreachable cover versions, unused providers) and are not recorded as met.
**Verification:** Compare the gap list with the actual repository state at every acceptance; the gates from [NFR-005](#nfr-005--one-gate-over-the-entire-pipeline) to [NFR-008](#nfr-008--no-acceptance-based-on-stubs) must be green.

### CORE-011 — No telemetry, no auto-upload of diagnostic data

**Preset:** Preset
**Requirement:** Phomu does not transmit usage or error data to the operator automatically. The only disclosure channel is an action that the user actively triggers.
**Rationale:** The user installs no analytics service; the absence of telemetry is part of the privacy promise in `/privacy`.
**Acceptance:** There is no analytics SDK in `package.json`; the missing-link report opens a new browser tab only on user click (`src/components/game/MusicPlayer.tsx:216-230`).
**Verification:** `grep -rni "analytics\|gtag\|segment\|sentry\|posthog" src/ package.json` (must be empty).

### CORE-012 — Identifiers stay English, project documentation stays German

**Preset:** Preset
**Requirement:** Code identifiers, types, component names, commit conventions and comments are English. Root documentation and `docs/` are German.
**Rationale:** The code is read internationally, the documentation addresses the German-speaking owner. Keeping both languages clean is cheaper than the later separation.
**Acceptance:** `src/` contains no German identifiers (exceptions: German UI literals in `src/i18n/locales/de.json`); all root documents are German (as of baseline 0.1 — the English documentation round of 2026-10-25 moved the root documentation and `docs/` to English; the identifier rule is unaffected).
**Verification:** `grep -rn "const [a-zA-Z]* = " src/ | grep -P "[äöüß]"` (must be empty).

---

# 2. Game modes, round logic and scoring (GAME)

## 2.1 Round flow and phases

### GAME-001 — Five round phases with defined transitions

**Preset:** Preset
**Requirement:** A round runs through the phases `drawing` → `question` → `reveal` → (`scoring`). The phase `locked-in` exists as a type, but is not entered by any code path.
**Rationale:** The phase automaton is the backbone of the game; an unclear phase automaton produces duplicate answers and hanging rounds.
**Acceptance:** `RoundPhase` is defined in `src/types/game-state.ts:28-33`; `drawSong` sets `question` (`src/stores/game-store.ts:394-402`), `nextRound` sets `drawing` (`src/stores/game-store.ts:365-375`), `endGame` sets `scoring` (`src/stores/game-store.ts:385-390`). `advancePhase('reveal')` is called only in `src/app/game/page.tsx:165` and `:234`; there is no call for `locked-in` (`grep -rn "advancePhase(" src`).
**Verification:** `grep -rn "advancePhase(" src`; no test exists — see [GAP-002](#open-gaps).

### GAME-002 — The reveal releases the solution only after locking the answers

**Preset:** Preset
**Requirement:** The reveal (`reveal`) starts exclusively when the answer of the active round has been submitted — either via the mode's own completion or via the `Alle fertig → Reveal` (all done → reveal) button.
**Rationale:** The anti-spoiler protection is a product promise; a reveal without a secured answer would be a breach of the rules.
**Acceptance:** `QuestionPhase` renders the reveal button only for `survivor`, `vibe-check`, `hint-master`, `timeline` (`src/components/game/QuestionPhase.tsx:34-40`, `:86-102`); `lyrics` and `cover-confusion` trigger the reveal themselves (`src/components/game/modes/LyricsMode.tsx:95`, `src/components/game/modes/CoverConfusionMode.tsx:288`).
**Verification:** `grep -n "MODES_WITH_REVEAL_BUTTON" -A 7 src/components/game/QuestionPhase.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-003 — The game flow only starts with players

**Preset:** Preset
**Requirement:** The route `/game` is protected: without a running round (`currentRound === 0`) or without players it redirects to the lobby immediately. After the game has ended it goes to `/game-over`.
**Rationale:** An empty game screen is a dead screen; the redirect protects against empty rounds and against states without participants.
**Acceptance:** `src/app/game/page.tsx:89-93` (guard → `/lobby`), `:96-100` (`isGameOver` → `/game-over`), `:290-292` (renders nothing before the redirect).
**Verification:** `npm run test:e2e:smoke` covers the reachability, not the redirect — see [GAP-021](#open-gaps).

### GAME-004 — The active order changes per turn

**Preset:** Preset
**Requirement:** The turn order is `turnOrder`; in individual mode it contains the player IDs, in team mode the team IDs. `currentTurnIndex` points at the active turn and advances cyclically.
**Rationale:** The pilot changes; that is the core of the pass-the-phone principle.
**Acceptance:** `startGame` builds the order per `teamMode` (`src/stores/game-store.ts:258-261`); `nextRound` increments cyclically (`src/stores/game-store.ts:345-347`); the game page derives the pilot from it (`src/app/game/page.tsx:103-113`).
**Verification:** no test exists — see [GAP-002](#open-gaps).

### GAME-005 — The round is logged before the next one begins

**Preset:** Preset
**Requirement:** On the transition to the next round, the completed round (number, mode, song, answers, completion time) is placed in `roundHistory`. A round without a drawn song is not logged.
**Rationale:** The round history is the basis for later statistics, replays and QA regressions.
**Acceptance:** `src/stores/game-store.ts:331-343` — only when `currentSong !== null` a `GameRound` entry is created, with `completedAt: new Date().toISOString()`.
**Verification:** no test exists — see [GAP-002](#open-gaps).

### GAME-006 — Points never go negative

**Preset:** Preset
**Requirement:** Every scoring is clamped to a minimum value of 0; a deduction (cheat, joker, override) cannot bring a player below 0.
**Rationale:** Cheats cost points. A score below 0 is inexplicable and would lead to nonsense in team evaluations.
**Acceptance:** `awardPoints` uses `Math.max(0, t.score + points)` respectively `Math.max(0, p.score + points)` (`src/stores/game-store.ts:455-474`).
**Verification:** `grep -n "Math.max(0" src/stores/game-store.ts`; no test exists — see [GAP-002](#open-gaps).

### GAME-007 — A player's points flow to their team

**Preset:** Preset
**Requirement:** When a score is credited to a player in a team, the team score increases by the same amount.
**Rationale:** In team mode the evaluation of the team is kept; the team score must correspond to the sum of its members.
**Acceptance:** `src/stores/game-store.ts:470-473` — when a `teamId` exists, the team is updated with the same delta.
**Verification:** no test exists — see [GAP-002](#open-gaps).

### GAME-008 — Three end conditions, exactly one is active

**Preset:** Preset
**Requirement:** The game ends via exactly one of the conditions `points`, `rounds` or `time`. The check only happens when the last round of the current rotation is completed.
**Rationale:** A session needs a defined end; checking in the middle of a rotation would rob a player of their turn.
**Acceptance:** `src/stores/game-store.ts:300-323` — `isEndOfRotation` (`:300`), points check against `targetPoints` (`:303-311`), rounds check `currentRound >= targetRounds * number of players or teams` (`:312-316`), time check against `targetTimeMinutes` from `gameStartTime` (`:317-322`).
**Verification:** no test exists — see [GAP-002](#open-gaps).

### GAME-009 — The points condition ends with the leading player or team

**Preset:** Preset
**Requirement:** When the points condition is met, the player or team with the highest score is the winner.
**Rationale:** The winner must be unambiguous; a tie is not resolved, the current leader is set.
**Acceptance:** `src/stores/game-store.ts:304-311` — sorting descending by score, `winnerId` = ID of the leader; the display uses the same logic (`src/components/game/RevealPhase.tsx:486-495`).
**Verification:** no test exists — see [GAP-002](#open-gaps).

### GAME-010 — The rounds condition counts per team or per player

**Preset:** Preset
**Requirement:** `targetRounds` is the number of rounds **per** player (individual) respectively **per** team. The total number of turns is `targetRounds × number of players or teams`.
**Rationale:** "10 rounds" with 6 players means 60 turns; without this reading the progress display breaks.
**Acceptance:** `src/stores/game-store.ts:314` — `currentRound >= config.targetRounds * (individual ? players.length : teams.length)`; identical in the progress display `src/app/game/page.tsx:269-271`.
**Verification:** `grep -n "targetRounds \*" src/stores/game-store.ts src/app/game/page.tsx`; no test exists — see [GAP-002](#open-gaps).

### GAME-011 — The time condition is measured from the start of the game

**Preset:** Preset
**Requirement:** The time condition counts from `gameStartTime`, which is set when the game starts. The expiry of the time ends the game even in the middle of a round.
**Rationale:** A party has an end, even if nobody notices how long it has been running.
**Acceptance:** `gameStartTime: Date.now()` in `startGame` (`src/stores/game-store.ts:273`); check in `nextRound` (`src/stores/game-store.ts:317-322`); the header progress also counts from that point (`src/app/game/page.tsx:279-285`).
**Verification:** no test exists — see [GAP-002](#open-gaps).

### GAME-012 — The last turn is announced

**Preset:** Preset
**Requirement:** When the game page detects the last rotation, a `Letzte Runde` (last round) banner is shown before the change (random selection from 12 texts), which stands for about 3.4 seconds before the next round starts.
**Rationale:** The last turn is the dramatic climax; it must not look like every other one.
**Acceptance:** `isLastRotation` (`src/app/game/page.tsx:169-179`), `handleNextRound` with 3,400 ms banner duration (`src/app/game/page.tsx:182-193`), texts in `src/utils/last-round-messages.ts:14-77` (12 entries).
**Verification:** `grep -n "3400" src/app/game/page.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-013 — A broken song is skipped, not blocked

**Preset:** Preset
**Requirement:** If playback fails, the phase switches back to `drawing`. With a random draw a new song is drawn immediately; with a song scanned via QR only the draw phase is re-entered.
**Rationale:** A blocked video must not stop the party — especially in regions with blocked YouTube videos that is the normal case.
**Acceptance:** `skipBrokenSong` (`src/stores/game-store.ts:405-416`) — QR source: only `roundPhase = 'drawing'`; random source: additionally `currentSong = null` and `autoDrawIntent = true`. `DrawingPhase` reacts to `autoDrawIntent` with an automatic draw (`src/components/game/DrawingPhase.tsx:149-157`).
**Verification:** `grep -n "autoDrawIntent" src/stores/game-store.ts src/components/game/DrawingPhase.tsx`; no test exists — see [GAP-002](#open-gaps).

### GAME-014 — After the skip the pilot can re-roll

**Preset:** Preset
**Requirement:** During the question round a discreet re-roll button is available (`Video kaputt? Neu würfeln` — video broken? re-roll). It waits 2 seconds (dice animation) and then skips the song.
**Rationale:** The automatic skip only takes effect after the error; the manual option covers edge cases.
**Acceptance:** `onReroll` in `src/components/game/QuestionPhase.tsx:105-112`; `handleReroll` with 2,000 ms in `src/app/game/page.tsx:239-246`; `DiceAnimation` in `src/app/game/page.tsx:304`.
**Verification:** `grep -n "handleReroll" -A 8 src/app/game/page.tsx`.

### GAME-015 — Points are awarded only for correct answers

**Preset:** Preset
**Requirement:** `awardPoints` is called only when `isCorrect` is true and `pointsAwarded > 0`. Wrong answers do not change the score.
**Rationale:** A wrong answer that costs points would be a penalty mechanic; the game only knows wins.
**Acceptance:** `src/app/game/page.tsx:147-149` — `if (isCorrect && pointsAwarded > 0) { awardPoints(...) }`.
**Verification:** `grep -n "isCorrect && pointsAwarded" src/app/game/page.tsx`.

## 2.2 Scoring formulas per mode

### GAME-016 — Timeline: points grow with the timeline, capped

**Preset:** Preset
**Requirement:** In Timeline mode the possible score is `min(number of year numbers + 1, timelineMaxPoints)`. The default is `timelineMaxPoints = 5`.
**Rationale:** A longer timeline is harder to hit and should therefore be worth more — but without an upper limit the round becomes unpayable.
**Acceptance:** `src/components/game/modes/TimelineMode.tsx:154` — `Math.min(timelineYears.length + 1, config.timelineMaxPoints)`; `DEFAULT_TIMELINE_MAX_POINTS: 5` in `src/config/game-config.ts:63`.
**Verification:** `grep -n "timelineMaxPoints" src/components/game/modes/TimelineMode.tsx src/config/game-config.ts`; no test exists — see [GAP-001](#open-gaps).

### GAME-017 — Timeline: the timeline starts with three year numbers

**Preset:** Preset
**Requirement:** If the timeline is empty, three random, ascending year numbers are generated from the catalogue.
**Rationale:** Without starting values there is no ordering question; three anchor points create a real ordering task.
**Acceptance:** `randomInitialYears(3)` (`src/components/game/modes/TimelineMode.tsx:82-86`), called in `src/components/game/modes/TimelineMode.tsx:139-143`; `initTimeline` sorts ascending (`src/stores/game-store.ts:595-597`).
**Verification:** `grep -n "randomInitialYears(3)" src/components/game/modes/TimelineMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-018 — Timeline: duplicate years count as correct

**Preset:** Preset
**Requirement:** If the requested year is already in the timeline, the slot **before** and **after** the duplicate counts as correct as well; the canonical slot is the first slot at which the year is smaller than the existing year.
**Rationale:** Without this rule the player would have to determine the exact position of a year that is not unambiguous at all.
**Acceptance:** `getValidSlots` (`src/components/game/modes/TimelineMode.tsx:93-115`) — canonical slot plus slot `i` and `i + 1` in the case of equal years; `canonicalSlot` (`src/components/game/modes/TimelineMode.tsx:118-123`).
**Verification:** no test exists — see [GAP-001](#open-gaps). The rule is a pure function and therefore the first choice for a unit test.

### GAME-019 — Timeline: after a hit the timeline grows

**Preset:** Preset
**Requirement:** After a correct placement the year of the song is added to the timeline. If a duplicate arises as a result, the duplicate is removed again immediately, without intervention by the player.
**Rationale:** The timeline should grow, but not contain the same number twice.
**Acceptance:** `src/components/game/modes/TimelineMode.tsx:185-192` — `addTimelineYear(newYear)` and, with `isDuplicate`, immediately `removeTimelineYear(newYear)`.
**Verification:** no test exists — see [GAP-001](#open-gaps).

### GAME-020 — Timeline: from more than ten year numbers one may be removed

**Preset:** Preset
**Requirement:** If a hit leads to more than ten year numbers (`timelineYears.length + 1 > 10`), the player may optionally remove a year number. The removal is voluntary.
**Rationale:** The upper limit keeps the timeline readable; the removal gives the player an active role.
**Acceptance:** `src/components/game/modes/TimelineMode.tsx:193-196` (`setRemovalState('choosing')`), selection UI `:396-413`, completion `:415-421`.
**Verification:** `grep -n "removalState" src/components/game/modes/TimelineMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-021 — Timeline: the decade hint costs two points

**Preset:** Preset
**Requirement:** The decade hint (e. g. "synthesiser, shoulder pads, moustache") immediately deducts 2 points from the active player and can be used only once per round.
**Rationale:** Help has to cost something, otherwise the pilot asks for the help and guesses immediately.
**Acceptance:** `handleCheat` (`src/components/game/modes/TimelineMode.tsx:214-220`) — `awardPoints(currentPlayerId, -2)`, abort on `cheatActive`; visible as badge `-2 PKT CHEAT` (`:366-378`).
**Verification:** `grep -n "awardPoints(currentPlayerId, -2)" src/components/game/modes/TimelineMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-022 — Timeline: the joker removes exactly one wrong slot for one point

**Preset:** Preset
**Requirement:** The joker randomly chooses one of the wrong slots, makes it invalid and costs 1 point. It is only available from four slots onwards (`numSlots > 3`) and only once per round.
**Rationale:** A joker that could also hit the right slot would be no joker, but a game of chance with high stakes.
**Acceptance:** `handleJoker` (`src/components/game/modes/TimelineMode.tsx:222-237`) — selection exclusively from `wrongSlots`, `awardPoints(currentPlayerId, -1)`, unlocking the selection when the joker slot was chosen; availability condition in `src/components/game/modes/TimelineMode.tsx:335`.
**Verification:** `grep -n "numSlots > 3" src/components/game/modes/TimelineMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-023 — Hint-Master: five levels, five down to one point

**Preset:** Preset
**Requirement:** The Hint-Master mode shows up to five hints. The score per level is `[5, 4, 3, 2, 1]` (level 1 = 5 points, level 5 = 1 point). The song provides exactly five hints.
**Rationale:** The graduated payment is the principle of the mode: early hits are worth more.
**Acceptance:** `PHOMU_CONFIG.HINT_MASTER_POINTS: [5, 4, 3, 2, 1]` (`src/config/game-config.ts:310`); `points = HINT_MASTER_POINTS[shownHints - 1] ?? 1` (`src/components/game/modes/HintMasterMode.tsx:36`); `hints` is a tuple of five strings in the type (`src/types/song.ts:87`).
**Verification:** `grep -n "HINT_MASTER_POINTS" src/config/game-config.ts src/components/game/modes/HintMasterMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-024 — Hint-Master: from level two the music plays (blurred)

**Preset:** Preset
**Requirement:** From the second hint on, the music starts automatically, still behind the blur layer. The pilot can already unlock the music manually at level 1 (costs 2 points).
**Rationale:** From level 2 on the hint is so unambiguous that the identity is almost clear; the music is the last step to the reveal.
**Acceptance:** `handleNextHint` (`src/components/game/modes/HintMasterMode.tsx:39-45`) — `if (shownHints + 1 >= 2) setShowMusic(true)`; music cheat `handleCheat` with −2 points (`:57-63`, button `:176-183`).
**Verification:** `grep -n "shownHints + 1 >= 2" src/components/game/modes/HintMasterMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-025 — Hint-Master: the pilot's verdict determines the points

**Preset:** Preset
**Requirement:** After the reveal the pilot states what he knew: `Beides` (both) = full score, `Nur Künstler` (artist only) or `Nur Titel` (title only) = half score rounded up (`Math.ceil(points / 2)`), `Nichts` (nothing) = 0 points.
**Rationale:** Hint-Master is the only mode with a verbal answer; without differentiation the hit rate would be worthless.
**Acceptance:** `handleFinalDecision` (`src/components/game/modes/HintMasterMode.tsx:47-55`) — `awardedPoints = knew === 'both' ? points : knew === 'none' ? 0 : Math.ceil(points / 2)`; display of the four options `:206-241`.
**Verification:** `grep -n "Math.ceil(points / 2)" src/components/game/modes/HintMasterMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-026 — Hint-Master: the audio length grows with the level

**Preset:** Preset
**Requirement:** Up to level 4 the audio runs 30 seconds from `previewTimestamp.start`; from level 5 on or after the reveal 180 seconds.
**Rationale:** Anyone who reaches level 5 is entitled to the whole identification phase.
**Acceptance:** `src/components/game/modes/HintMasterMode.tsx:132` — `endSeconds={(isRevealed || shownHints === 5) ? startSecs + 180 : startSecs + 30}`.
**Verification:** `grep -n "endSeconds" src/components/game/modes/HintMasterMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-027 — Lyrics Labyrinth: four lines, one is invented

**Preset:** Preset
**Requirement:** The mode mixes three real lyric lines and one AI-generated line and lets the player identify the **false** line. The order of the options is random per song, but stable during a round.
**Rationale:** The guessing picture is the change of pace to the other modes.
**Acceptance:** `src/components/game/modes/LyricsMode.tsx:68-83` — `useMemo` over `song.id` with `shuffle`; the options are numbered with `A.`, `B.`, `C.`, `D.` (`:164-166`).
**Verification:** no test exists — see [GAP-001](#open-gaps).

### GAME-028 — Lyrics Labyrinth: four points for the right fake line

**Preset:** Preset
**Requirement:** A correctly identified fake line brings 4 points, a wrong one 0.
**Rationale:** Four options, four points — a recognisable unit.
**Acceptance:** `LYRICS_POINTS = 4` (`src/components/game/modes/LyricsMode.tsx:21`), awarding in `handleConfirm` (`:89-96`).
**Verification:** `grep -n "LYRICS_POINTS" src/components/game/modes/LyricsMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-029 — Lyrics Labyrinth: without lyrics data there is a bonus round

**Preset:** Preset
**Requirement:** If a song lacks the lyrics structure (`lyrics === null`), a bonus round is played instead of the question: whoever recognises the song and says it aloud gets 2 points, otherwise 0.
**Rationale:** 62 of the 1,615 catalogue songs have no lyrics; without a fallback rule the mode would be unplayable for these songs.
**Rationale addendum:** The fallback keeps the mode playable without blocking the catalogue.
**Acceptance:** `src/components/game/modes/LyricsMode.tsx:42-44` (fallback to `BonusRound`), `BonusRound` `:214-263` with `onAnswer(true, 2)` (`:239`). Measured state: 1,553 of 1,615 songs with `lyrics !== null` (measured via `src/data/songs/*.json`).
**Verification:** `grep -n "BonusRound" src/components/game/modes/LyricsMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-030 — Vibe-Check: six options, two points

**Preset:** Preset
**Requirement:** The player chooses from six mood options. If the chosen mood is contained in `song.mood`, there are 2 points, otherwise 0. Artist, title and decade are visible — the mood is the quantity being asked for.
**Rationale:** The mode tests feeling, not knowledge; the identity has to be known for that.
**Acceptance:** `src/components/game/modes/VibeCheckMode.tsx:52-59` — `isCorrect = song.mood.includes(mood)`, `points = isCorrect ? (cheatUsed ? 1 : 2) : 0`; option construction `:62-73` (5 wrong + 1 right); decade display `:118`.
**Verification:** `grep -n "song.mood.includes(mood)" src/components/game/modes/VibeCheckMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-031 — Vibe-Check: the cheat halves the options and lowers the win

**Preset:** Preset
**Requirement:** The cheat reduces the selection from six to three options and limits the win to 1 point.
**Rationale:** The advantage has to be paid for with the lower point count.
**Acceptance:** `src/components/game/modes/VibeCheckMode.tsx:62-73` — `half` = 2 wrong + 1 right; point limit in `handleSelect` (`:57`); hint text `Optionen halbiert — max. +1 Pkt` (options halved — maximum one point) (`:141`).
**Verification:** `grep -n "cheatUsed ? 1 : 2" src/components/game/modes/VibeCheckMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-032 — Survivor: one-hit wonder or career act, three points

**Preset:** Preset
**Requirement:** The player decides whether the artist is a one-hit wonder. Correct is the entry `song.isOneHitWonder`; there are 3 points, otherwise 0. The artist name stays hidden until the answer.
**Rationale:** Without the concealment the question would be trivial (the name reveals the answer).
**Acceptance:** `src/components/game/modes/SurvivorMode.tsx:30-37` — `isCorrect = guessedOneHit === song.isOneHitWonder`, 3 points; concealment of the artist `:97-102` (`???`), reveal only after the answer or cheat (`:103-114`); `blurred={!answered && !cheatUsed}` (`:69`).
**Verification:** `grep -n "isOneHitWonder" src/components/game/modes/SurvivorMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-033 — Survivor: the cheat reveals the artist for one point

**Preset:** Preset
**Requirement:** The cheat immediately shows the artist name and deducts 1 point.
**Rationale:** A more expensive cheat than in Timeline mode, because the reveal follows immediately.
**Acceptance:** `handleCheat` (`src/components/game/modes/SurvivorMode.tsx:39-44`) — `awardPoints(currentPlayerId, -1)`; badge `-1 PKT CHEAT` (`:83-94`).
**Verification:** `grep -n "awardPoints(currentPlayerId, -1)" src/components/game/modes/SurvivorMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-034 — Cover Confusion: five down to two points depending on the number of hints

**Preset:** Preset
**Requirement:** The mode knows four point levels: no hint = 5 points, one text hint = 4, two text hints = 3, multiple choice with three artists = 2 points.
**Rationale:** The hints become more expensive the more information the player has.
**Acceptance:** `POINTS_BY_HINTS = [5, 4, 3, 2]` (`src/components/game/modes/CoverConfusionMode.tsx:23`); `points = POINTS_BY_HINTS[Math.min(hintsUsed, 3)]` (`:41`); awarding of hints `handleGetHint` (`:53-61`).
**Verification:** `grep -n "POINTS_BY_HINTS" src/components/game/modes/CoverConfusionMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-035 — Cover Confusion: two variants with equal probability

**Preset:** Preset
**Requirement:** Per round one of two variants is chosen at random: `Wer ist das Original?` (who is the original? — honour system plus optional hints) or `Cover oder Original?` (cover or original? — binary question, 3 points).
**Rationale:** The variant keeps the mode varied and uses the existing `coverMode` metadata structure.
**Acceptance:** `const [variation] = useState(() => Math.random() > 0.5 ? 'who-is-it' : 'original-or-cover')` (`src/components/game/modes/CoverConfusionMode.tsx:39`); binary variant with 3 points (`:78-84`, `:188`).
**Verification:** `grep -n "variation" src/components/game/modes/CoverConfusionMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### GAME-036 — Cover Confusion: the player decides the honour-system variant himself

**Preset:** Preset
**Requirement:** In the `Wer ist das Original?` (who is the original?) variant the original artist is displayed and the player confirms himself whether he knew them. Only the multiple-choice variant is evaluated automatically.
**Rationale:** Without a guess there is no ground truth — the honour-system variant is the honest solution.
**Acceptance:** `handleSelfAssess` (`src/components/game/modes/CoverConfusionMode.tsx:63-68`) — points according to self-assessment; `handleChoice` (`:70-76`) — automatic evaluation in the multiple choice.
**Verification:** no test exists — see [GAP-001](#open-gaps).

## 2.3 Cheats, no-cheat and time decay

### GAME-037 — The no-cheat mode disables all aids

**Preset:** Preset
**Requirement:** If `noCheatMode` is active, all cheat and joker buttons are hidden: decade hint and joker (Timeline), music cheat (Hint-Master), option halving (Vibe-Check), artist reveal (Survivor).
**Rationale:** For experienced groups the expert mode is the only honest mode.
**Acceptance:** `config.noCheatMode` in `src/components/game/modes/TimelineMode.tsx:308` and `:335`, `src/components/game/modes/HintMasterMode.tsx:176`, `src/components/game/modes/VibeCheckMode.tsx:133`, `src/components/game/modes/SurvivorMode.tsx:153`; default `DEFAULT_NO_CHEAT_MODE: false` (`src/config/game-config.ts:72`); switchable in the lobby (`src/app/lobby/page.tsx:487-508`), the governance settings (`src/app/settings/governance/page.tsx`) and the in-game panel (`src/components/game/InGameSettingsPanel.tsx`).
**Verification:** `grep -rn "noCheatMode" src/components/game/modes/`; no test exists — see [GAP-001](#open-gaps).

### GAME-038 — The time decay punishes slow answers

**Preset:** Optional
**Requirement:** If `timeDecayEnabled` is active, the point count of a correct answer is reduced by `floor(max(0, answer time − timeDecayGraceSeconds) / timeDecayStepSeconds) × timeDecayStepPoints`. The default values are: grace period 5 s, step width 5 s, 1 point per step, minimum point count 1.
**Rationale:** The time decay creates pressure in the game — it must be able to be switched off, because in calm rounds it is unpleasant.
**Acceptance:** `src/app/game/page.tsx:130-136` — calculation and `Math.max(config.minPointsPerCorrect, ...)`; defaults in `src/config/game-config.ts:64-68` (`DEFAULT_TIME_DECAY_ENABLED: false`, `DEFAULT_TIME_DECAY_GRACE_SECONDS: 5`, `DEFAULT_TIME_DECAY_STEP_SECONDS: 5`, `DEFAULT_TIME_DECAY_STEP_POINTS: 1`, `DEFAULT_MIN_POINTS_PER_CORRECT: 1`); switch in the lobby (`src/app/lobby/page.tsx:463-484`).
**Verification:** `grep -n "timeDecayStepPoints" src/app/game/page.tsx src/config/game-config.ts`; no test exists — see [GAP-001](#open-gaps).

### GAME-039 — The answer time is measured only in Timeline mode

**Preset:** Preset
**Requirement:** Only the Timeline mode passes `answeredInSeconds` to the answer evaluation. The other modes pass no time value, so that the time decay does not take effect there.
**Rationale:** A time decay that works in a mode without decision pressure would be a silent disadvantage in points.
**Acceptance:** `answeredInSeconds` is calculated only in `src/components/game/modes/TimelineMode.tsx:178` and evaluated in `src/app/game/page.tsx:133`.
**Verification:** `grep -rn "answeredInSeconds" src/components/game/modes/` (only TimelineMode) and `grep -rn "answeredInSeconds" src/app/game/page.tsx`.

### GAME-040 — Power-user override with documented governance

**Preset:** Preset
**Requirement:** In the reveal there is a power-user menu with two actions: `Antwort trotzdem korrekt werten` (count the answer as correct anyway) and `Runde verwerfen & neue Frage` (discard the round and ask a new question). The governance setting (`host`, `co-host`, `majority`) is displayed, but not yet enforced.
**Rationale:** The pilot has to be able to intervene in disputes. Role enforcement is deliberately deferred (see [GAP-019](#open-gaps)).
**Acceptance:** `src/components/game/RevealPhase.tsx:604-634` (menu with governance display), `src/app/game/page.tsx:197-215` (`handleOverrideCorrect` awards `max(1, minPointsPerCorrect)`, `handleOverrideRedraw` calls `nextRound`).
**Verification:** `grep -n "overrideGovernance" src/components/game/RevealPhase.tsx src/app/game/page.tsx src/config/game-config.ts`; no test exists — see [GAP-002](#open-gaps).

## 2.4 Mode rotation and turn selection

### GAME-041 — The mode is chosen randomly per round

**Preset:** Preset
**Requirement:** From the modes enabled in the lobby, one mode is chosen at random at the beginning of each round. If the list is empty, `timeline` applies.
**Rationale:** The mode change keeps long sessions varied, without the pilot having to plan modes manually.
**Acceptance:** `pickRandomMode` (`src/stores/game-store.ts:189-191`), call in `startGame` (`:268`) and `nextRound` (`:368`).
**Verification:** `grep -n "pickRandomMode" src/stores/game-store.ts`; no test exists — see [GAP-002](#open-gaps).

### GAME-042 — At least one mode always stays active

**Preset:** Preset
**Requirement:** In the lobby the last active mode cannot be deselected. The mode then carries the label `Pflicht` (mandatory).
**Rationale:** A game without a mode is not playable.
**Acceptance:** `toggleMode` (`src/components/lobby/ModeSelector.tsx:78-86`) — `if (selectedModes.length === 1) return`; `Pflicht` badge in `src/components/lobby/ModeSelector.tsx`; `canGoNext` requires `selectedModes.length > 0` (`src/app/lobby/page.tsx:84`).
**Verification:** `grep -n "selectedModes.length === 1" src/components/lobby/ModeSelector.tsx`.

### GAME-043 — The song is drawn to match the mode

**Preset:** Preset
**Requirement:** The song draw filters by the active mode: in mode `lyrics` the song must have lyrics data, otherwise `supportedModes` must contain the current mode. If the filter leads to an empty pool, a soft fallback applies.
**Rationale:** A song without lyrics in Lyrics mode is a dead end; a song without support for the mode is a miscast.
**Acceptance:** `src/utils/song-picker.ts:56-70` — mode filter and hard lyrics fallback to the base selection without difficulty/QR filter.
**Verification:** `grep -n "currentMode === 'lyrics'" -A 12 src/utils/song-picker.ts`; no test exists — see [GAP-003](#open-gaps).

### GAME-044 — Played songs are preferably avoided

**Preset:** Preset
**Requirement:** Already played songs are excluded from the random draw. If the pool is empty as a result, only the last five played songs are excluded; afterwards the draw is made from the full pool.
**Rationale:** With 1,615 songs repetitions are avoidable; the exception prevents a dead end.
**Acceptance:** `src/utils/song-picker.ts:72-84` — filter over `playedIds`, fallback to `playedIds.slice(-5)`.
**Verification:** `grep -n "recentlyPlayed" src/utils/song-picker.ts`; no test exists — see [GAP-003](#open-gaps).

### GAME-045 — The random draw respects pack, difficulty and QR filters

**Preset:** Preset
**Requirement:** The random draw filters first by the selected packs, then by `onlyQRCompatible`, then by `difficulty`, then by the mode. Every filter is a soft fallback: if it leads to an empty pool, it is discarded. If even the pack filter leads to an empty pool, the entire catalogue is used.
**Rationale:** A filter that is too narrow must not block the session.
**Acceptance:** `src/utils/song-picker.ts:36-70` — the order and the fallback chain with the comments `Soft-Fallback` (`:45`) and `Absoluter Fallback` (absolute fallback) (`:41`).
**Verification:** `grep -n "Soft-Fallback\|Absoluter Fallback" src/utils/song-picker.ts`; no test exists — see [GAP-003](#open-gaps).

---

# 3. Lobby, players, teams, session and cards (LOBBY)

### LOBBY-001 — The lobby is a six-step assistant

**Preset:** Preset
**Requirement:** The lobby guides through the configuration in six steps: 1 players, 2 modes, 3 packs, 4 game end, 5 fine tuning, 6 teams. The progress is displayed as a bar and as a step counter.
**Rationale:** An assistant on small screens prevents clutter; the step order is the subject-matter order of the decisions.
**Acceptance:** `TOTAL_STEPS = 6` (`src/app/lobby/page.tsx:80`), step rendering `:153-669`, progress bar `:142-146`.
**Verification:** `grep -n "TOTAL_STEPS" src/app/lobby/page.tsx`; no test exists — see [GAP-021](#open-gaps).

### LOBBY-002 — Step 1 requires at least one player

**Preset:** Preset
**Requirement:** The `Weiter` (next) button in step 1 is only active when at least `MIN_PLAYERS` players exist. Default: 1.
**Rationale:** A game without participants is not a game.
**Acceptance:** `canGoNext` (`src/app/lobby/page.tsx:82-87`) — `players.length >= PHOMU_CONFIG.MIN_PLAYERS`; `MIN_PLAYERS: 1` (`src/config/game-config.ts:56`).
**Verification:** `grep -n "MIN_PLAYERS" src/app/lobby/page.tsx src/config/game-config.ts`.

### LOBBY-003 — Upper limit of 24 players

**Preset:** Preset
**Requirement:** There can be at most 24 players in a session. The 25th player is not created.
**Rationale:** The upper limit is part of the product promise "1–24 players".
**Acceptance:** `MAX_PLAYERS: 24` (`src/config/game-config.ts:55`); check in the store `addPlayer` (`src/stores/game-store.ts:210`) and in the lobby (`src/app/lobby/page.tsx:91`).
**Verification:** `grep -rn "MAX_PLAYERS" src/`; no test exists — see [GAP-002](#open-gaps).

### LOBBY-004 — Players automatically receive an avatar and a colour

**Preset:** Preset
**Requirement:** When a player is added, an emoji avatar (from 14 fixed emojis) and a colour (from 7 fixed colours) are assigned automatically — cyclically according to the number of existing players. The first player becomes the pilot.
**Rationale:** Without automatic assignment the pilot would have to choose colour and avatar manually for every player.
**Acceptance:** `EMOJI_AVATARS` (14 entries, `src/app/lobby/page.tsx:25`), `PLAYER_COLORS` (7 entries, `:26`), assignment in `handleAddPlayer` (`:93-97`); `isPilot: players.length === 0` (`src/stores/game-store.ts:219`).
**Verification:** `grep -n "EMOJI_AVATARS\|PLAYER_COLORS" src/app/lobby/page.tsx`; no test exists — see [GAP-002](#open-gaps).

### LOBBY-005 — When the pilot is removed, the first remaining player takes over

**Preset:** Preset
**Requirement:** If the pilot is removed, the first remaining player takes over the pilot role. Afterwards there are never two pilots and never none.
**Rationale:** Without a pilot the round cannot be validated.
**Acceptance:** `removePlayer` (`src/stores/game-store.ts:231-245`) — `removedWasPilot` and handover to `remaining[0]`.
**Verification:** no test exists — see [GAP-002](#open-gaps).

### LOBBY-006 — Three team modes: individual, fixed, shifting

**Preset:** Preset
**Requirement:** The team mode is `individual` (everyone on their own), `fixed` (fixed teams) or `shifting` (teams are remixed every round). The default is `individual`.
**Rationale:** The shifting team mode is the strongest social lever of the game.
**Acceptance:** `TeamMode` (`src/types/player.ts:9-12`), `DEFAULT_TEAM_MODE: 'individual'` (`src/config/game-config.ts:57`), selection in `src/app/lobby/page.tsx:42-46` and `:533-545`.
**Verification:** `grep -rn "shifting" src/stores/game-store.ts src/app/lobby/page.tsx`; no test exists — see [GAP-002](#open-gaps).

### LOBBY-007 — When switching to a team mode, two teams are created

**Preset:** Preset
**Requirement:** If `fixed` or `shifting` is chosen and no team exists yet, two teams are created automatically.
**Rationale:** A team mode without teams cannot be configured.
**Acceptance:** `handleTeamModeChange` (`src/app/lobby/page.tsx:104-109`) — `initTeams(2)`.
**Verification:** `grep -n "initTeams(2)" src/app/lobby/page.tsx`.

### LOBBY-008 — Teams carry names from a curated list

**Preset:** Preset
**Requirement:** Newly created teams receive a name from a list of 24 fixed, humorous team names; names that are already taken are skipped. If the list is exhausted, a new random choice is made. The colour rotates over six fixed team colours.
**Rationale:** The name is a conversation starter; randomly generated names would be arbitrary.
**Acceptance:** `FUNNY_TEAM_NAMES` (24 entries, `src/stores/game-store.ts:20-27`), `TEAM_COLORS` (6, `:29`), `pickTeamName` (`:31-35`), `initTeams` (`:530-544`), `createTeam` (`:547-558`).
**Verification:** `grep -n "FUNNY_TEAM_NAMES" src/stores/game-store.ts`; no test exists — see [GAP-002](#open-gaps).

### LOBBY-009 — Team names and colours are freely editable

**Preset:** Preset
**Requirement:** The team name is editable as a text field; a dice button assigns a random name from the same list. The team colour is selectable from six curated colours.
**Rationale:** Preset colours and names are a starting point, not a regulation.
**Acceptance:** `src/app/lobby/page.tsx:564-582` (name field and dice), `CURATED_TEAM_COLORS` (`:48-55`) and colour selection (`:600-608`).
**Verification:** `grep -n "CURATED_TEAM_COLORS" src/app/lobby/page.tsx`.

### LOBBY-010 — Players are assigned to a team or removed

**Preset:** Preset
**Requirement:** In mode `fixed` each player can be assigned to exactly one team; a second click on the current team cancels the assignment. Removing a team cancels all assignments without deleting players.
**Rationale:** Mistaken assignments have to be correctable without touching the player list.
**Acceptance:** `assignPlayerToTeam` (`src/stores/game-store.ts:572-592`), `removeTeam` (`:561-569`), UI `src/app/lobby/page.tsx:621-648`.
**Verification:** `grep -n "assignPlayerToTeam\|removeTeam" src/stores/game-store.ts`; no test exists — see [GAP-002](#open-gaps).

### LOBBY-011 — Notice about too few players in team mode

**Preset:** Preset
**Requirement:** With fewer than four players the lobby points out that in team mode at least two players per team are needed.
**Rationale:** The information saves a confused discussion at the table.
**Acceptance:** `src/app/lobby/page.tsx:659-664`.
**Verification:** `grep -n "mindestens 4 Spieler" src/app/lobby/page.tsx`.

### LOBBY-012 — The number of teams is limited and follows the number of players

**Preset:** Preset
**Requirement:** An additional team can only be created as long as fewer teams exist than the greater of 2 and half the number of players, and as long as at most 8 teams are present. A team can only be deleted from the third team onwards.
**Rationale:** The limits prevent unusable team sizes (one team per player).
**Acceptance:** Condition `src/app/lobby/page.tsx:651`; delete button only from `teams.length > 2` (`:587`).
**Verification:** `grep -n "teams.length < 8\|teams.length > 2" src/app/lobby/page.tsx`.

### LOBBY-013 — The game-end condition is chosen exclusively

**Preset:** Preset
**Requirement:** The end condition is exclusive: `points`, `rounds` or `time`. Defaults: 100 points, 10 rounds, 60 minutes.
**Rationale:** Only one active condition is unambiguous; parallel conditions provoke disputes about the moment the game ends.
**Acceptance:** Selection `src/app/lobby/page.tsx:279-290`; defaults `DEFAULT_CONFIG` (`src/stores/game-store.ts:41-66`): `endingCondition: 'rounds'`, `targetPoints: 100`, `targetRounds: 10`, `targetTimeMinutes: 60`.
**Verification:** `grep -n "targetPoints: 100\|targetRounds: 10\|targetTimeMinutes: 60" src/stores/game-store.ts`.

### LOBBY-014 — The target values are selectable via presets and a slider

**Preset:** Preset
**Requirement:** For points 50/100/200/500, for rounds 5/10/15/20 and for time 30/60/90/120/150/180/210/240 minutes are available as presets; in addition a slider regulates the target value (points/rounds: 5–500 in steps of 5, time: 30–240 in steps of 30).
**Rationale:** Presets speed up the configuration, the slider covers individual values.
**Acceptance:** `src/app/lobby/page.tsx:293-321` (presets), `:333-346` (slider). **Caution:** The preset list for rounds (5/10/15/20) lies below `MIN_ROUNDS_TO_PLAY = 10` (`src/config/game-config.ts:61`); the value is not enforced, however — see [GAP-026](#open-gaps).
**Verification:** `grep -n "50, 100, 200, 500\|5, 10, 15, 20" src/app/lobby/page.tsx`; `grep -n "MIN_ROUNDS_TO_PLAY" src/config/game-config.ts`.

### LOBBY-015 — The legacy aliases for target values are carried along

**Preset:** Preset
**Requirement:** `winCondition` mirrors `targetPoints` and `roundsToPlay` mirrors `targetRounds`. Both are set on every change.
**Rationale:** Older game states and calling components use the aliases; a divergence produces contradictory displays.
**Acceptance:** `src/types/game-state.ts:62-63` and `:71-72` (aliases), `src/app/lobby/page.tsx:296`, `:306`, `:341-342` (joint setting).
**Verification:** `grep -n "winCondition\|roundsToPlay" src/app/lobby/page.tsx src/types/game-state.ts`.

### LOBBY-016 — At least one song pack is always selected

**Preset:** Preset
**Requirement:** The last selected pack cannot be deselected. `Alle wählen` (select all) and `Abwählen` (deselect all) set the selection to all respectively to the first pack.
**Rationale:** Without a pack there are no songs and therefore no game.
**Acceptance:** `src/components/lobby/PackSelector.tsx:36-40` (`if (selectedPacks.length === 1) return`), `:44-45` (`selectAll`/`selectNone`); `canGoNext` in `src/app/lobby/page.tsx:85`.
**Verification:** `grep -n "selectedPacks.length === 1" src/components/lobby/PackSelector.tsx`.

### LOBBY-017 — Old pack IDs are mapped to valid pack keys

**Preset:** Preset
**Requirement:** Twelve historical lobby pack IDs (e. g. `global-hits`) are mapped to the current pack keys, so that stored game states still hit a selection. The mapping is kept centrally in the configuration.
**Rationale:** Without the mapping, old game states deliver empty selections — the bug is explicitly documented in the configuration.
**Acceptance:** `PACK_ALIASES` with 12 entries (`src/config/game-config.ts:284-297`), application in `normalizePackIds` (`src/utils/song-picker.ts:12-15`) and for the QR pack intent (`src/app/lobby/page.tsx:684-685`).
**Verification:** `grep -n "PACK_ALIASES" src/config/game-config.ts src/utils/song-picker.ts src/app/lobby/page.tsx`; no test exists — see [GAP-003](#open-gaps).

### LOBBY-018 — QR cards deliver three intent types

**Preset:** Preset
**Requirement:** A scanned QR code can have three meanings: `@Name` adds a player, a URL with `?pack=` activates a pack, a URL with `?session=` is provided as a session intent. Old `?id=` links are marked as unsupported.
**Rationale:** The physical card should carry several functions in one code, without the user needing an app for every function.
**Acceptance:** `parseQrIntent` (`src/utils/qr-intent.ts:16-43`), classification in `src/app/lobby/page.tsx:676-692`; test `src/utils/qr-intent.test.ts`.
**Verification:** `npm run test -- qr-intent`.

### LOBBY-019 — A pack intent for an unknown pack is rejected

**Preset:** Preset
**Requirement:** If a QR code points to a pack that does not exist, the scan is discarded and the user is informed; no empty pack is added to the selection.
**Rationale:** A dead pack entry would empty the filter of the entire game.
**Acceptance:** `src/app/lobby/page.tsx:686-687` — check via `PHOMU_CONFIG.SONG_PACKS` and `alert`.
**Verification:** `grep -n "Pack nicht gefunden" src/app/lobby/page.tsx`.

### LOBBY-020 — The session intent is recognised, but not yet executed

**Preset:** Later
**Requirement:** A QR code with `?session=` is recognised as a session intent and parsed; the actual session lookup and join are not implemented.
**Rationale:** The multi-device mode is intended for a later expansion stage; the recognition creates the connection point without pretending that it already exists.
**Acceptance:** `src/utils/qr-intent.ts:28-31` (parsing), test in `src/utils/qr-intent.test.ts`; in the lobby the intent is deliberately not handled (`src/app/lobby/page.tsx:676-692` handles only `player` and `pack`).
**Verification:** `npm run test -- qr-intent`; the gap is tracked as [GAP-016](#open-gaps).

### LOBBY-021 — The session is client-side and survives a reload

**Preset:** Preset
**Requirement:** The entire game state (players, teams, configuration, session ID, XP, audio settings, current round, timeline) is persisted in `localStorage` under `phomu-game-state`. After a reload the lobby configuration is still available.
**Rationale:** At a party the phone is cleared, locked or the app is reloaded — the configuration must not be lost.
**Acceptance:** `persist(...)` with `name: 'phomu-game-state'` and the `partialize` list (`src/stores/game-store.ts:618-638`).
**Verification:** `grep -n "partialize" -A 20 src/stores/game-store.ts`; no test exists — see [GAP-002](#open-gaps).

### LOBBY-022 — Play again keeps the lobby, a new lobby resets everything

**Preset:** Preset
**Requirement:** On the end screen Phomu offers two ways: `Nochmal spielen` (play again) resets only the points and starts the game again (configuration and players remain), `Neue Lobby starten` (start a new lobby) resets the entire state.
**Rationale:** Both actions are needed in practice — the first for a second round, the second for a new group.
**Acceptance:** `resetScores` (`src/stores/game-store.ts:479-493`) resets points, rounds, history, `playedSongIds`, answers, song, timeline, but keeps players/teams/configuration; `initSession` (`:201-203`) resets everything to the initial state; calls in `src/app/game-over/page.tsx:147-159`.
**Verification:** `grep -n "resetScores\|initSession" src/app/game-over/page.tsx src/stores/game-store.ts`.

### LOBBY-023 — When leaving the game, a confirmation is requested

**Preset:** Preset
**Requirement:** The exit button in the game and the `Party verlassen` (leave party) button in the in-game panel ask for confirmation via a dialogue before the state is reset and the lobby is opened.
**Rationale:** An accidental exit in the middle of a session destroys the game state.
**Acceptance:** `handleExit` (`src/app/game/page.tsx:224-229`) — `confirm('Spiel abbrechen und zur Lobby zurückkehren?')`, then `initSession()` and `router.push('/lobby')`.
**Verification:** `grep -n "confirm(" src/app/game/page.tsx src/app/settings/account/page.tsx`.

### LOBBY-024 — The lobby offers a quick setup and a full reset

**Preset:** Preset
**Requirement:** In step 1 `Schnell-Setup` (quick setup) leads directly to the start step; `Reset` resets the session and jumps to step 1.
**Rationale:** For experienced groups the six-step assistant is too long.
**Acceptance:** `src/app/lobby/page.tsx:730-738`.
**Verification:** `grep -n "Schnell-Setup\|Reset ↺" src/app/lobby/page.tsx`.

---

# 4. Music providers, anti-spoiler and playback (MEDIA)

### MEDIA-001 — YouTube is the default provider

**Preset:** Preset
**Requirement:** The default music provider is `youtube`. Playback runs via the YouTube IFrame Player API with `autoplay: 1`, `controls: 0`, `rel: 0` and `modestbranding: 1`.
**Rationale:** YouTube is the only provider that works for every user without an account, without an API key and without payment.
**Acceptance:** `DEFAULT_MUSIC_PROVIDER: 'youtube'` (`src/config/game-config.ts:80`); player initialisation `src/components/game/MusicPlayer.tsx:290-303`.
**Verification:** `grep -n "autoplay\|controls\|rel\|modestbranding" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-002 — The provider selection is persistent

**Preset:** Preset
**Requirement:** The selected provider (`youtube`, `spotify-premium`, `spotify-free`, `amazon-music`) and the YouTube player mode (`standard` = www.youtube.com, `music` = music.youtube.com) are stored and survive sessions.
**Rationale:** Changing the provider for every session would be annoying.
**Acceptance:** `preferredMusicProvider` and `preferredPlayer` in the `partialize` list (`src/stores/game-store.ts:626-628`); selection in `src/app/settings/audio/page.tsx` and `src/components/game/InGameSettingsPanel.tsx`.
**Verification:** `grep -n "preferredMusicProvider" src/stores/game-store.ts src/app/settings/audio/page.tsx`.

### MEDIA-003 — YouTube links are robustly normalised to video IDs

**Preset:** Preset
**Requirement:** Both plain 11-character IDs and complete URLs (`youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/vi/`) are resolved to a video ID. If neither ID nor URL is recognisable, the unchanged value applies.
**Rationale:** The catalogue mixes both forms; a robust resolution is the basis of the fallback mechanism.
**Acceptance:** `extractYouTubeId` (`src/components/game/MusicPlayer.tsx:69-73`).
**Verification:** no test exists — see [GAP-001](#open-gaps).

### MEDIA-004 — Broken YouTube videos trigger a fallback chain

**Preset:** Preset
**Requirement:** If a YouTube video fails, the next entry of the fallback list is tried automatically (main link, then `youtubeAlternatives`, then `fallbackYoutubeId`). If the list is exhausted, the player shows an error state with three actions: `Jetzt überspringen` (skip now), `Alternative Player` (alternative player — switch between www.youtube.com and music.youtube.com) and `Report Missing`.
**Rationale:** Regional blocks and deletions are the normal case on YouTube, not the exception; the session must not fail because of them.
**Acceptance:** Fallback queue `src/components/game/MusicPlayer.tsx:149-155`, error handling `:254-272`, error overlay `:483-535`; catalogue state: 30 songs with `youtubeAlternatives`, 7 with `fallbackYoutubeId` (measured via `src/data/songs/*.json`).
**Verification:** `grep -n "fallbackQueue" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-005 — If a video does not start, a six-second timeout applies

**Preset:** Preset
**Requirement:** If the YouTube player stays in the state `UNSTARTED`, an error is assumed after 6,000 ms and the fallback chain is triggered.
**Rationale:** Without a timeout a round hangs forever when a video is blocked.
**Acceptance:** `src/components/game/MusicPlayer.tsx:333-342` — `setTimeout(..., 6000)` with a check of `getPlayerState()`.
**Verification:** `grep -n "6000" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-006 — After an error the song is skipped automatically

**Preset:** Preset
**Requirement:** If the fallback chain is exhausted, a 10-second countdown starts, after which the song is skipped automatically. The user can also trigger the skip immediately.
**Rationale:** The pilot should not have to tap the error away; the visible warning keeps the control.
**Acceptance:** `startAutoSkipCountdown` (`src/components/game/MusicPlayer.tsx:239-252`) with start value 10 and a 1-second tick; display `Skip in {n}s` (`:504-508`); immediate skip button (`:511-516`).
**Verification:** `grep -n "setAutoSkipCountdown(10)" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-007 — Playback starts at a defined offset

**Preset:** Preset
**Requirement:** Songs can be played from a defined second via `previewTimestamp.start`. If the value is missing, playback starts at second 0.
**Rationale:** Intros in which the song is not recognisable waste the scarce question time.
**Acceptance:** `startSeconds = 0` as default (`src/components/game/MusicPlayer.tsx:133`), handover to `playerVars.start` (`:299`), call sites `src/components/game/modes/TimelineMode.tsx:270-282` (without offset), `src/components/game/modes/HintMasterMode.tsx:131`, `src/components/game/modes/LyricsMode.tsx:120`, `src/components/game/modes/VibeCheckMode.tsx:98`, `src/components/game/modes/CoverConfusionMode.tsx:113`.
**Verification:** `grep -rn "startSeconds" src/components/game/`.

### MEDIA-008 — Playback ends automatically at the configured end point

**Preset:** Preset
**Requirement:** If an end point is set, playback is paused when the end point is reached. The check happens every 500 ms.
**Rationale:** The mode dictates the playback length; the control must not depend on the user.
**Acceptance:** `src/components/game/MusicPlayer.tsx:317-327` — `setInterval(..., 500)`, `pauseVideo()` at `currentTime >= endSeconds`.
**Verification:** `grep -n "endSeconds" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-009 — The volume and the on/off state control playback

**Preset:** Preset
**Requirement:** The global music volume (0–1) is transferred to the player (as a percentage 0–100). If the music is disabled, the player is muted and paused.
**Rationale:** Without a master volume a session in a library can be inaudible or inescapable.
**Acceptance:** `onReady` sets the volume and checks `musicEnabled` (`src/components/game/MusicPlayer.tsx:305-315`); the reactivation effect `:372-389`; defaults `musicEnabled: true`, `musicVolume: 0.8` (`src/stores/game-store.ts:177-180`).
**Verification:** `grep -n "musicVolume" src/components/game/MusicPlayer.tsx src/stores/game-store.ts`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-010 — Spotify Free uses the 30-second preview

**Preset:** Optional
**Requirement:** If `spotify-free` is selected and a `links.spotifyFreePreview` is stored, the preview is played via an `<audio>` element. If no preview is stored, YouTube is used.
**Rationale:** The free Spotify access delivers only 30 seconds; without a preview YouTube remains the honest answer.
**Acceptance:** `useSpotifyFree` (`src/components/game/MusicPlayer.tsx:168`), preview block `:573-583`, overlay hint `Free ist auf kurze Preview-Clips begrenzt` (free is limited to short preview clips) (`:578-580`); catalogue state: only 7 of 1,615 songs have `spotifyFreePreview` (measured).
**Verification:** `grep -n "useSpotifyFree" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-011 — Spotify Premium uses the embed player

**Preset:** Optional
**Requirement:** If `spotify-premium` is selected and a Spotify track ID is available, a Spotify embed iframe is placed over the player. Without a premium account YouTube stays active, and the user is pointed to that.
**Rationale:** Full-track playback via Spotify is a comfort feature; YouTube remains the reliable way.
**Acceptance:** `extractSpotifyTrackId` (`src/components/game/MusicPlayer.tsx:75-80`), `useSpotifyPremium` (`:167`), embed `:559-571`, hint `bei fehlender Premium-Wiedergabe wird YouTube genutzt` (if premium playback is missing, YouTube is used) (`:552`); catalogue state: 734 of 1,615 songs have a Spotify link.
**Verification:** `grep -n "useSpotifyPremium" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-012 — Amazon Music uses the embed player, Prime only with preview

**Preset:** Optional
**Requirement:** For Amazon there are two paths: `amazon-music-premium` with full-track embed (from `links.amazonMusic`) and `amazon-music` with Prime preview (from `links.amazonPrimePreview`). If the respective source is missing, YouTube is used and the restricted scope is displayed.
**Rationale:** Amazon Music delivers no preview without Prime access; the user has to know why it sounds quieter or shorter.
**Acceptance:** `extractAmazonTrackId` with five supported URL forms (`src/components/game/MusicPlayer.tsx:96-120`), `useAmazonPrime`/`useAmazonPremium` (`:169-170`), embeds `:585-619`, hint `:553-555`; catalogue state: 381 songs with `amazonMusic`, 0 with `amazonPrimePreview` (measured) — see [GAP-012](#open-gaps).
**Verification:** `npm run test -- MusicPlayer` (the existing tests cover `extractAmazonTrackId`); no test exists for the path selection — see [GAP-001](#open-gaps).

### MEDIA-013 — Missing links can be reported, with rate limit

**Preset:** Preset
**Requirement:** The user can report a song that cannot be played. The disclosure channel is exclusively user-triggered: a GitHub issue with technical metadata (song ID, title, artist, pack, selected provider, available links, time zone, locale, region) is opened in a new tab. If no issue URL is configured, the JSON report is copied to the clipboard.
**Rationale:** The community can heal link and region problems itself; the disclosure channel should work without a server.
**Acceptance:** `handleReportMissing` (`src/components/game/MusicPlayer.tsx:172-237`); the user consent is explicitly noted: "avoid free-text fields … to prevent accidental transmission of PII" (`src/app/privacy/page.tsx`, section "Technical Metadata").
**Verification:** `grep -n "NEXT_PUBLIC_GITHUB_ISSUE_URL" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-014 — The report is limited to five reports per hour and device

**Preset:** Preset
**Requirement:** Per device a maximum of 5 reports per hour is allowed. Each song can only be reported once. The device ID is stored in `localStorage` under `phomu-device-id`, the report status under `phomu-missing-report-state-v1`.
**Rationale:** Without a limit a broken song produces a report storm into the open issues.
**Acceptance:** `src/components/game/MusicPlayer.tsx:172-195` — `HOUR_MS = 60 * 60 * 1000`, `MAX_PER_HOUR = 5`, duplicate check via `parsed.songs[songId]`; status display `:621-627` — rate limit per device and duplicate report (`Rate limit: max 5/h je Gerät`, `Für diesen Song bereits gemeldet`).
**Verification:** `grep -n "MAX_PER_HOUR\|phomu-device-id\|phomu-missing-report-state-v1" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-015 — The anti-spoiler overlay uses blur plus a reveal gesture

**Preset:** Preset
**Requirement:** If `blurred` is set, a blur layer (`blur-[60px]`, `opacity-50`, `scale-125`, `pointer-events-none`) lies over the player. A drag handle allows the reveal from a horizontal displacement of more than 150 px. After the reveal the state can be reset via `Verbergen` (hide).
**Rationale:** The gesture is deliberately not trivial: whoever knows it gets an advantage — that is the anti-cheat the pilot controls.
**Acceptance:** Blur wrapper `src/components/game/MusicPlayer.tsx:424-430`; overlay `:434-478` — `drag="x"`, `if (info.offset.x > 150) setVideoRevealed(true)`; `Verbergen` button `:538-545`.
**Verification:** `grep -n "offset.x > 150\|blur-\[60px\]" src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-016 — If no playable medium is available, this is stated explicitly

**Preset:** Preset
**Requirement:** If there is neither a YouTube ID nor a Spotify/Amazon source, the player renders the hint `Kein Video verfügbar` (no video available) instead of an empty area.
**Rationale:** An empty area looks like an error in the game; the plain text explains the situation.
**Acceptance:** `src/components/game/MusicPlayer.tsx:417-419`.
**Verification:** `grep -n "Kein Video verfügbar" src/components/game/MusicPlayer.tsx`.

### MEDIA-017 — The music player stays mounted across the reveal transition

**Preset:** Preset
**Requirement:** During the switch from the question to the reveal phase, the question component is not unmounted, but hidden via `display: none`. As a result playback continues without a restart.
**Rationale:** A restart of the video in the middle of the reveal would be audible and would break the rhythm.
**Acceptance:** `src/app/game/page.tsx:404-431` — comment `QuestionPhase bleibt gemountet … display:none hält den Iframe am Leben — Audio läuft weiter` (QuestionPhase stays mounted … display:none keeps the iframe alive — the audio keeps running); `QuestionPhase` and `RevealPhase` are rendered in the same container (`:423-460`).
**Verification:** `grep -n "display: 'none'" src/app/game/page.tsx`; no test exists — see [GAP-001](#open-gaps).

### MEDIA-018 — The provider status is shown in the player

**Preset:** Preset
**Requirement:** When a restricted provider is used, the player displays a status text at the bottom left that names the restriction and announces the YouTube fallback.
**Rationale:** Transparency about the actual source of sound prevents complaints about "missing" music.
**Acceptance:** `src/components/game/MusicPlayer.tsx:547-557`.
**Verification:** `grep -n "YouTube-Fallback aktiv" src/components/game/MusicPlayer.tsx`.

---

# 5. Interface, themes, navigation, projector, accessibility (UI)

### UI-001 — Four themes with CSS custom properties

**Preset:** Preset
**Requirement:** Phomu offers the themes `jackbox` (default), `spotify`, `youtube` and `musicwall`. Each theme defines the same tokens (`--color-bg`, `--color-bg-secondary`, `--color-bg-card`, `--color-text`, `--color-text-secondary`, `--color-primary`, `--color-primary-hover`, `--color-secondary`, `--color-accent`, `--color-success`, `--color-error`, `--color-border`, `--radius`).
**Rationale:** A uniform token set turns new themes into a pure CSS file.
**Acceptance:** `AVAILABLE_THEMES` (`src/config/game-config.ts:86`), `DEFAULT_THEME: 'jackbox'` (`:85`); the four token blocks in `src/app/globals.css`.
**Verification:** `grep -n "data-theme=" src/app/globals.css`; no test exists — see [GAP-001](#open-gaps).

### UI-002 — The theme is controlled via an HTML attribute

**Preset:** Preset
**Requirement:** The active theme is set via `data-theme` on the `<html>` element and stored under `phomu-theme` in `localStorage`. If the stored value is unknown, the default theme applies.
**Rationale:** An attribute instead of JavaScript classes allows server-side styling and prevents flickering.
**Acceptance:** `src/contexts/ThemeContext.tsx:27-41` — `STORAGE_KEY = 'phomu-theme'`, validation against `PHOMU_CONFIG.AVAILABLE_THEMES` (`:33`), `document.documentElement.setAttribute('data-theme', theme)` (`:39`); initial value in `src/app/layout.tsx:40` (`data-theme="jackbox"`).
**Verification:** `grep -n "data-theme" src/contexts/ThemeContext.tsx src/app/layout.tsx`; no test exists — see [GAP-001](#open-gaps).

### UI-003 — Theme and language switchers are reachable in NavBar and settings

**Preset:** Preset
**Requirement:** The theme and the language can be switched both via the settings panel of the navigation bar and via the settings pages. The active selection is clearly marked.
**Rationale:** The switch must be reachable at any time, also in the middle of the game.
**Acceptance:** NavBar panel `src/components/ui/NavBar.tsx`; `ThemeSwitcher` (`src/components/ui/ThemeSwitcher.tsx:33-51`) and `LanguageSwitcher` (`src/components/ui/LanguageSwitcher.tsx:30-51`) with `aria-pressed`; additionally in the in-game panel (`src/components/game/InGameSettingsPanel.tsx`).
**Verification:** `grep -rn "aria-pressed" src/components/ui/`; no test exists — see [GAP-001](#open-gaps).

### UI-004 — The navigation bar does not appear in the game

**Preset:** Preset
**Requirement:** On the routes `/game` and `/game-over` no navigation bar is shown; these pages bring their own header bar.
**Rationale:** In the game there is space for points, mode and timer — not for navigation.
**Acceptance:** `HIDDEN_PREFIXES = ['/game', '/game-over']` (`src/components/ui/ConditionalNavBar.tsx:13-19`), integrated in `src/app/layout.tsx:36-39`.
**Verification:** `grep -n "HIDDEN_PREFIXES" src/components/ui/ConditionalNavBar.tsx`.

### UI-005 — The navigation contains lobby and browse

**Preset:** Preset
**Requirement:** The main navigation contains the links `Lobby` and `Browse` as well as a settings button that opens a panel with language, theme and admin link. The active entry is highlighted in colour.
**Rationale:** Two main destinations are enough: play and browse.
**Acceptance:** `NAV_LINKS` (`src/components/ui/NavBar.tsx:17-20`), `isActive` calculation in the render function, admin link to `/admin/songs`.
**Verification:** `grep -n "NAV_LINKS" src/components/ui/NavBar.tsx`.

### UI-006 — The projector mode is spoiler-free

**Preset:** Preset
**Requirement:** The route `/projector` shows mode, round, phase, score, active player and the progress towards the target — but never title, artist, cover or year of the current song. During the question round an animated placeholder is shown there.
**Rationale:** The projector hangs above the table; a solution visible there devalues the round for the entire room.
**Acceptance:** Placeholder `src/app/projector/page.tsx:226-254`; in the player no song title is displayed; `phaseLabel` (`:54-59`).
**Verification:** `grep -n "Frage läuft" src/app/projector/page.tsx`; no test exists — see [GAP-001](#open-gaps).

### UI-007 — The projector mode synchronises itself via the same state

**Preset:** Preset
**Requirement:** `/projector` reads from the same persisted state as the game and re-renders every 2 seconds, so that point changes from the device arrive. Without a running game the route shows `Kein Spiel aktiv` (no game active).
**Rationale:** A second device or a second tab should mirror the same session without a server.
**Acceptance:** `setInterval(..., 2000)` (`src/app/projector/page.tsx:41-44`), state source `useGameStore()` (`:27-36`), empty state `:61-69`; persistence see [LOBBY-021](#lobby-021--the-session-is-client-side-and-survives-a-reload).
**Verification:** `grep -n "2000" src/app/projector/page.tsx`; no test exists — see [GAP-001](#open-gaps).

### UI-008 — The projector mode is reachable from the game via a button

**Preset:** Preset
**Requirement:** From the in-game settings panel a button opens the projector mode in a new browser tab.
**Rationale:** The projector is a second device; a tab switch on the game device would be an error.
**Acceptance:** `window.open('/projector', '_blank')` in `src/components/game/InGameSettingsPanel.tsx`.
**Verification:** `grep -n "projector" src/components/game/InGameSettingsPanel.tsx`.

### UI-009 — The header shows mode, pilot, progress and timer

**Preset:** Preset
**Requirement:** The game header shows the active mode (with emoji), the pilot (avatar, name, colour), the progress towards the target and — if `timeLimitSeconds` is set — a seconds counter. It contains an exit button with `aria-label`.
**Rationale:** The pilot must always know whose turn it is, how much time is left and how far the game has come.
**Acceptance:** `src/components/game/GameHeader.tsx:127-209`; `TimerCountdown` `:66-92` with colour change at ≤ 20 s (`:78-81`) and `aria-label` (`:87`); `timeLimitSeconds` is passed only in the question phase (`src/app/game/page.tsx:317`).
**Verification:** `grep -n "TimerCountdown\|aria-label" src/components/game/GameHeader.tsx`; no test exists — see [GAP-001](#open-gaps).

### UI-010 — If the question time runs out, the round goes to the reveal

**Preset:** Preset
**Requirement:** When the timer reaches 0, the phase changes from `question` to `reveal`. In other phases the timer has no effect.
**Rationale:** Without an automatic reveal the session hangs when the pilot forgets.
**Acceptance:** `handleTimeUp` (`src/app/game/page.tsx:232-236`) — `if (roundPhase === 'question') advancePhase('reveal')`; timer reset per round via the `key` in `src/components/game/GameHeader.tsx:201-205`.
**Verification:** `grep -n "handleTimeUp" -A 5 src/app/game/page.tsx`; no test exists — see [GAP-001](#open-gaps).

### UI-011 — Touch targets are at least 44 pixels high

**Preset:** Preset
**Requirement:** Interactive elements in game and lobby are at least 44 px high (height or width). This applies in particular to the mode, pack and settings buttons, the remove button of a player and the buttons of the time limit selection.
**Rationale:** 44 px is the established minimum size for touch targets; below that it becomes unreliable on the phone.
**Acceptance:** `min-h-[44px]` in `src/components/lobby/ModeSelector.tsx`, `src/components/lobby/PackSelector.tsx`, `src/components/game/QuestionPhase.tsx:108`; `w-11 h-11` in `src/components/lobby/PlayerCard.tsx` and `src/components/game/GameHeader.tsx:150`.
**Verification:** `grep -rn "min-h-\[44px\]\|h-11 w-11\|w-11 h-11" src/components/ | wc -l`; no test exists — see [GAP-021](#open-gaps).

### UI-012 — Safe-area insets are taken into account

**Preset:** Preset
**Requirement:** For devices with a notch and home indicator, the CSS variables `--sat`, `--sar`, `--sab`, `--sal` are set from `env(safe-area-inset-*)`; the utilities `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe` use them. The viewport is opened with `viewportFit: 'cover'`.
**Rationale:** Without the insets the header lies under the notch and the footer over the home indicator.
**Acceptance:** `src/app/globals.css` (safe-area block and utilities); `src/app/layout.tsx:29-33` (`viewportFit: 'cover'`); application in `src/app/lobby/page.tsx:128` and `:697`, `src/components/game/GameHeader.tsx:129`.
**Verification:** `grep -n "safe-area-inset" src/app/globals.css`; no test exists — see [GAP-021](#open-gaps).

### UI-013 — Keyboard operation and visible focus are guaranteed

**Preset:** Preset
**Requirement:** The Timeline mode is operable by keyboard: the number keys select slot 1–n, the arrow keys navigate, Enter/Space confirms. Visible focus rings are set via `:focus-visible` with a 3 px thick outline in the accent colour; tooltips also appear on focus.
**Rationale:** At home on the laptop Phomu is played without a mouse.
**Acceptance:** `src/components/game/modes/TimelineMode.tsx:242-255` (keyboard control), `src/app/globals.css` (`:focus-visible` block), `src/components/ui/Tooltip.tsx` (`onFocus`/`onBlur`).
**Verification:** `grep -n "focus-visible" src/app/globals.css`; `grep -n "ArrowUp" src/components/game/modes/TimelineMode.tsx`; no test exists — see [GAP-001](#open-gaps).

### UI-014 — The feedback picture is deliberately "juicy", but not blocking

**Preset:** Preset
**Requirement:** Correct and wrong answers are acknowledged with deterministically selected texts from two lists (more than 100 entries each). The same input (song ID, correct/wrong) always produces the same text. The texts vary the tone between cheeky and dry, without impairing playability.
**Rationale:** The feedback is an essential part of the _party_ factor; determinism ensures that a song always reacts the same way.
**Acceptance:** `CORRECT_MESSAGES` (`src/utils/feedback-messages.ts:10`), `WRONG_MESSAGES` (`:115`), `hashSeed`/`pickDeterministic` (`:223-240`), `getSpicyMessage`/`getSpicyColor` (`:242-249`); calls in `src/components/game/RevealPhase.tsx:508-513` and in every mode.
**Verification:** `grep -n "getSpicyMessage" src/components/game/`; no test exists — see [GAP-001](#open-gaps).

### UI-015 — Feedback overlays accompany the game events

**Preset:** Preset
**Requirement:** On the switch into the question phase, on the reveal, on a correct and a wrong answer as well as at the end of the game, own overlays respectively sound effects are triggered. A double trigger on a re-render is excluded (comparison with the previous state).
**Rationale:** Feedback has to be coupled to the event, not to the render cycle.
**Acceptance:** `src/hooks/useGameAudioCues.ts:76-96` (phase comparison), `:97-108` (answer counter), `:109-116` (end of game); `FeedbackOverlay` and `DiceAnimation` in `src/app/game/page.tsx:300-304`.
**Verification:** `grep -n "previousPhaseRef\|previousAnswerCountRef" src/hooks/useGameAudioCues.ts`; no test exists — see [GAP-001](#open-gaps).

### UI-016 — Sound effects can be switched off and are scalable

**Preset:** Preset
**Requirement:** Sound effects can be deactivated individually and regulated in volume (default 0.55). Missing or unplayable files lead to no error message.
**Rationale:** Sound effects must never interrupt the flow of the music.
**Acceptance:** `src/hooks/useGameAudioCues.ts:36-58` — `if (!sfxEnabled) return`, silence in the error case; default `sfxEnabled: true`, `sfxVolume: 0.55` (`src/stores/game-store.ts:181-184`); slider `src/app/settings/audio/page.tsx`.
**Verification:** `grep -n "sfxVolume" src/hooks/useGameAudioCues.ts src/stores/game-store.ts`; no test exists — see [GAP-001](#open-gaps).

### UI-017 — The settings hub is divided into five areas

**Preset:** Preset
**Requirement:** `/settings` links to five areas: players & profile, audio & provider, governance, legal & account and game help. In the header the number of players, the total XP and the level are displayed; if a game is running, a button leads back into the game.
**Rationale:** Five clearly separated areas are findable on the phone; a flat list with 20 options is not.
**Acceptance:** `SETTINGS_SECTIONS` (`src/app/settings/page.tsx:10-37`), `StatCard` display (`:42-47`), level calculation `Math.floor(totalXP / 100) + 1` (`:43`).
**Verification:** `grep -n "SETTINGS_SECTIONS" src/app/settings/page.tsx`.

### UI-019 — The interface recognises the orientation it runs in

**Preset:** Preset
**Requirement:** The interface knows whether it runs in portrait or in landscape and reacts to a change of the orientation while the game is running. The orientation is derived from the viewport, not from the device class: a narrow, tall window is portrait, a wide, flat one is landscape. The recognition reacts to a rotation and to a change of the window size, not only to the first render.
**Rationale:** A party game runs on a phone in the hand (portrait) and on a tablet or a laptop on the table (landscape). The interface has to know which of the two it is, otherwise the landscape case is simply the portrait case with empty space.
**Acceptance:** `src/hooks/useOrientation.ts` — the orientation is derived from the viewport and the change is delivered through a `change` listener on `matchMedia('(orientation: landscape)')`; the hook does not access `window` during the server render.
**Verification:** `grep -n "matchMedia\|orientation" src/hooks/useOrientation.ts`; the unit test of the hook covers portrait, landscape and the change between them.

### UI-020 — The landscape layout uses the width of the screen

**Preset:** Preset
**Requirement:** In landscape the game screen is laid out in two columns: the phase (drawing, question, reveal) on the left, the player list and the score table on the right, permanently visible. The score table is therefore not an overlay in landscape — the button that opens it disappears there, while the keyboard operation stays complete. The lobby shows the steps on the left and a preview of the selected modes, packs, player count and end condition on the right. In portrait both screens stay one column and unchanged.
**Rationale:** Landscape has twice the width and half the height. A one-column layout leaves half of the screen unused, and the score table has to be opened by hand in the middle of a round.
**Acceptance:** the layout variant is derived by a pure function from the viewport and the state, so that it is testable without a browser; in landscape the score table is a column, in portrait an overlay. The pure function and the hook have tests.
**Verification:** `grep -n "useOrientation\|landscape" src/app/game/page.tsx src/app/lobby/page.tsx`; the test of the layout decision proves one column in portrait and two in landscape.

### UI-021 — A rotation does not interrupt the running game

**Preset:** Preset
**Requirement:** Rotating the device or resizing the window during a running round does not end the round, does not reset the score, does not redraw the song and does not lose the answers that have been given. The orientation only changes the layout.
**Rationale:** The game state lives in the state store and must survive a layout change. A rotation that interrupts the game is a bug that costs the party a round.
**Acceptance:** the orientation is read by a hook and not written into the state; the state store keeps the round, the score, the drawn song and the answers; no effect of the orientation changes the state.
**Verification:** `grep -n "setState\|useGameStore" src/hooks/useOrientation.ts` — the hook writes nothing; the test of the hook leaves the store untouched.

### UI-018 — Changes in the game take effect from the next round

**Preset:** Preset
**Requirement:** If modes, packs or governance rules are changed during a running game, players, points and the current state remain unchanged. The interface points out that changes only take effect from the next round.
**Rationale:** A mode change in the middle of a round would devalue the running round.
**Acceptance:** Notice text `src/app/settings/game-rules/page.tsx` (`Änderungen gelten ab der nächsten Runde` — changes take effect from the next round), `currentRound` query in all settings pages, mode/pack change via `setConfig` without intervention in `currentRound` (`src/stores/game-store.ts:248-252`).
**Verification:** `grep -rn "currentRound" src/app/settings/*/page.tsx | wc -l`; no test exists — see [GAP-001](#open-gaps).

---

# 6. Internationalization (I18N)

### I18N-001 — Two languages: German as the standard language

**Preset:** Preset
**Requirement:** Supported are `de` (default) and `en`. The list of supported languages and the standard language are kept centrally in the configuration.
**Rationale:** German is the language of the market centre; English opens up the international market.
**Acceptance:** `SUPPORTED_LANGUAGES: ['de', 'en']` and `DEFAULT_LANGUAGE: 'de'` (`src/config/game-config.ts:76-77`); `fallbackLng: 'de'` (`src/i18n/config.ts:22`).
**Verification:** `grep -n "SUPPORTED_LANGUAGES\|DEFAULT_LANGUAGE" src/config/game-config.ts`; `grep -n "fallbackLng" src/i18n/config.ts`.

### I18N-002 — The language is detected, stored and switchable manually

**Preset:** Preset
**Requirement:** The language is detected via `localStorage` and browser setting and stored in `localStorage`. The user can switch manually at any time; the switch takes effect immediately.
**Rationale:** A forced restart after the language switch is an avoidable stumbling block.
**Acceptance:** `src/i18n/config.ts:26-29` — `detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }`; switch `i18n.changeLanguage(lang)` in `src/components/ui/LanguageSwitcher.tsx:34` and `src/components/ui/NavBar.tsx`.
**Verification:** `grep -n "changeLanguage" src/components/ui/`; no test exists — see [GAP-006](#open-gaps).

### I18N-003 — The language switch must not show an untranslated screen

**Preset:** Preset
**Requirement:** The i18n library is loaded only after successful initialisation; until then the application renders nothing. Thus no intermediate state with untranslated or missing texts arises.
**Rationale:** Loading the language packs is an asynchronous step; without a waiting phase the interface flickers.
**Acceptance:** `src/components/Providers.tsx:20-31` — dynamic import of `@/i18n/config`, `if (!isReady) return null`.
**Verification:** `grep -n "isReady" src/components/Providers.tsx`; no test exists — see [GAP-006](#open-gaps).

### I18N-004 — DE and EN are completely parallel

**Preset:** Preset
**Requirement:** `de.json` and `en.json` contain the same key scope in the same structure; no values are empty, no key exists in only one language. The English values are real translations, not copies of the German ones.
**Rationale:** A one-sided key is dead text in production and an error in the interface.
**Acceptance:** Measured state: both files have 6 namespaces (`app`, `landing`, `settings`, `themes`, `modes`, `common`) and 25 flat keys each — parallel and complete. `en.json` contains independent English values (e. g. `"landing.quickStartDesc": "3 clicks and you're playing!"`). The gate script `scripts/check-i18n-completeness.mjs` checks parity, empty values and plural forms.
**Verification:** `node scripts/check-i18n-completeness.mjs` (gate, exit 1 on violation) respectively `node scripts/check-i18n-completeness.mjs --count` for the count. The script has existed since 25.10.2026; as npm script `npm run check:i18n` it is not yet wired — see [GAP-006](#open-gaps).

### I18N-005 — The key space is flat and dot-based

**Preset:** Preset
**Requirement:** Keys are flat dot paths of the form `namespace.subpoint.designation`. Keys contain no interpolation; placeholders stand exclusively in the value (`{{count}}`).
**Rationale:** Static keys are the precondition for a completeness gate being able to work at all.
**Acceptance:** `src/i18n/locales/de.json` and `en.json` use exclusively dot paths; in the current state no value contains a placeholder.
**Verification:** `grep -n "{{" src/i18n/locales/*.json` (must be empty as long as no placeholders are used); plural forms are checked by the gate `node scripts/check-i18n-completeness.mjs`.

### I18N-006 — Proper names and mode names stay identical in both languages

**Preset:** Preset
**Requirement:** Product and provider names (Phomu, Spotify, YouTube, Jackbox, Amazon Music) as well as the six mode names remain unchanged in both languages. The mode names are English in the code (`timeline`, `hint-master`, …) and are translated in the interface via the mode key.
**Rationale:** A brand name is not a translatable text.
**Acceptance:** `themes.*` and `modes.*` in `src/i18n/locales/de.json` and `en.json` are identical respectively correspond to the respective mode name; the assignment mode → display name happens per interface (e. g. `MODE_LABELS` in `src/app/projector/page.tsx:17-24`).
**Verification:** `node -e "const d=require('./src/i18n/locales/de.json'),e=require('./src/i18n/locales/en.json');console.log(JSON.stringify(d.themes)===JSON.stringify(e.themes)?'themes identisch':'ABWEICHUNG')"`; the proper-name whitelist is stored in the gate via `BRAND_ALLOWLIST` (`scripts/check-i18n-completeness.mjs`).

### I18N-007 — Every visible text comes from the translation

**Preset:** Preset
**Requirement:** Every text visible to the user is obtained via `t()`. There is no literal text in the JSX any more.
**Rationale:** Only in this way is "German first, English complete" sustainable at all.
**Acceptance:** **Status: not met.** Currently `useTranslation` is used only in `src/app/page.tsx`. The gate counts 935 literal texts in 47 checked files; the largest occurrences are `src/components/game/RevealPhase.tsx` (141), `src/components/game/FeedbackOverlay.tsx` (3) and `src/components/game/QuestionPhase.tsx` (2). See [GAP-006](#open-gaps).
**Verification:** `node scripts/check-i18n-completeness.mjs --count` — currently reports 935 literal texts in 47 files; the gate is only green when 0 literal texts remain. The current state can additionally be checked with `grep -rn "useTranslation" src/ | wc -l` (result 1).

---

# 7. Song catalogue, packs and data quality (CAT)

### CAT-001 — The catalogue is the file basis, not a database

**Preset:** Preset
**Requirement:** The song catalogue lies as JSON per pack under `src/data/songs/` and is merged via `src/data/songs/index.ts` into `ALL_SONGS`. The loader is generated and not maintained manually.
**Rationale:** A versioned file basis is reviewable and deterministic; the generated aggregation prevents manual deviations.
**Acceptance:** `src/data/songs/index.ts` (note `This file is generated by scripts/migrate_and_deduplicate.py. Do not edit it manually.`), import of 135 pack files; `ALL_SONGS` exported.
**Verification:** `ls src/data/songs/*.json | grep -v packs.json | wc -l` (measured: 135); `grep -n "generated by" src/data/songs/index.ts`.

### CAT-002 — The catalogue comprises 135 pack files with 1,615 songs

**Preset:** Preset
**Requirement:** The stock comprises 135 pack files and 1,615 songs (measured on 2026-10-25 via `npm run validate-catalog`).
**Rationale:** The stock is the largest single asset of the product; every number that describes it has to be measurable.
**Acceptance:** `npm run validate-catalog` reports "Packs: 135", "Songs: 1615".
**Verification:** `npm run validate-catalog`.

### CAT-003 — There are exactly 27 configured packs, and all are covered in the catalogue

**Preset:** Preset
**Requirement:** `PHOMU_CONFIG.SONG_PACKS` lists 27 packs with ID, name, claim, emoji and colour gradient. Each of these IDs occurs as a `packs` entry in at least one song, and no pack name exists in the catalogue without a corresponding configuration.
**Rationale:** A pack without songs delivers an empty selection and blocks the session; a catalogue pack without configuration is not selectable and would be dead stock.
**Acceptance:** `src/config/game-config.ts:89-279` (27 entries); measured: 27 different pack names in the song data, 0 SONG_PACKS IDs without songs, 0 data pack names without configuration.
**Verification:** `grep -c "^      id: '" src/config/game-config.ts` (result 27); counter-check via a script over `src/data/songs/*.json`.

### CAT-004 — The catalogue access filters by pack assignment

**Preset:** Preset
**Requirement:** A song belongs to a pack if its `packs` list contains at least one of the selected pack IDs. The access filters via this assignment.
**Rationale:** The pack assignment is the only ordering principle of the catalogue.
**Acceptance:** `src/utils/song-picker.ts:36-40` — `ALL_SONGS.filter(s => s.packs.some(p => packIds.includes(p)))`; type `packs: string[]` (`src/types/song.ts:83`).
**Verification:** `grep -n "packs.some" src/utils/song-picker.ts`; no test exists — see [GAP-003](#open-gaps).

### CAT-005 — The catalogue gate prevents regressions

**Preset:** Preset
**Requirement:** `npm run validate-catalog` fails if the number of schema errors, duplicate groups or missing years rises compared to `specifications/quality-baseline.json`. With `--strict` every excess counts as an error. The gate optionally writes a JSON report.
**Rationale:** A stock without a baseline gate erodes unnoticed.
**Acceptance:** `src/utils/validate-song-catalog.ts:250-268` — strict mode and baseline comparison; baseline file `specifications/quality-baseline.json` (`schemaErrors: 3194`, `duplicateGroups: 164`, `missingYears: 0`); report path `specifications/catalog_issues_report.json` (`:200-204`).
**Verification:** `npm run validate-catalog` (measured: `Katalog-Gate bestanden (keine Regression gegen Baseline).` — catalogue gate passed (no regression against baseline)); `npm run validate-catalog:report`.

### CAT-006 — Duplicates are forbidden, exceptions are curated

**Preset:** Preset
**Requirement:** Two songs with the same normalised `artist + title + year` are inadmissible. Exceptions are allowed exclusively via entries in `specifications/duplicate-allowlist.json`. Pure secondary import duplicates from `youtube-import.json` are not counted as a curated error as long as at most one primary pack is affected.
**Rationale:** Songs contained twice double the draw probability and damage the evaluation of the catalogue.
**Acceptance:** `duplicateKey` and `checkDuplicates` (`src/utils/validate-song-catalog.ts:92-133`), allowlist access `:44-53`, secondary pack set `:57-61`; policy in `specifications/duplicate_policy.md`. Measured state: 0 open duplicate groups, 4 permitted duplicates.
**Verification:** `npm run validate-catalog`; `cat specifications/duplicate-allowlist.json`.

### CAT-007 — The catalogue must cover every year from 1950 to the current year

**Preset:** Preset
**Requirement:** For every year from 1950 to the current year at least one song must exist. Missing years are a hard gate error.
**Rationale:** The Timeline mode needs dense years; a hole makes the question "when was that?" unplayable.
**Acceptance:** `checkYearCoverage(packs, 1950, coverageEndYear)` (`src/utils/validate-song-catalog.ts:198`), option `--coverage-end-year` (`:161-173`); measured state: 0 missing years for 1950–2026.
**Verification:** `npm run validate-catalog` — the output line reports the missing years (`Fehlende Jahre (1950-2026): 0`).

### CAT-008 — The year of a song lies between 1500 and current year + 1

**Preset:** Preset
**Requirement:** The year of a catalogue entry must be an integer between 1500 and the current year plus 1. The lower bound 1500 covers classical works; the upper bound + 1 allows announced releases.
**Rationale:** A lower bound of 1900 would mark correct composition years as errors; without an upper bound unrealistic releases could slip in.
**Acceptance:** `MIN_SONG_YEAR = 1500`, `MAX_SONG_YEAR_OFFSET = 1` (`src/config/song-year-range.ts:21-24`), check in `validateSong` (`src/utils/validate-song-data.ts:122-137`), bounded upper limit `getMaxSongYear` (`:27-29`).
**Verification:** `npm run test -- validate-song-data` (8 tests, e. g. `accepts classical composition years before 1900` and `rejects future years beyond +1`).

### CAT-009 — The mandatory fields of a song are complete and typed

**Preset:** Preset
**Requirement:** A song must contain: `id` (non-empty string), `title`, `artist`, `year` (number), `country` (ISO-3166-1 alpha-2, two upper-case letters), `genre`, `difficulty` (`easy`|`medium`|`hard`), `mood` (at least one entry), `packs` (at least one entry), `hints` (4 or 5 strings; 5 outside the pack group "YouTube Collection"), `isOneHitWonder` (boolean), `links.youtube` as well as `supportedModes` and `isQRCompatible`.
**Rationale:** Missing mandatory fields produce broken game states at runtime.
**Acceptance:** `src/utils/validate-song-data.ts:107-168` and `:171-228`; hint count rule `:175-180`.
**Verification:** `npm run validate-songs`; `npm run validate-catalog` (measured: 0 schema errors).

### CAT-010 — Lyrics must have exactly three real lines and one invented line

**Preset:** Preset
**Requirement:** If `lyrics` is set, `lyrics.real` contains exactly three strings and `lyrics.fake` exactly one string. `lyrics === null` is allowed and produces a warning, not an error.
**Rationale:** The mode mixes exactly these four lines; a different structure makes the question unplayable.
**Acceptance:** `src/utils/validate-song-data.ts:313-324`; type `src/types/song.ts:96-102`. Measured state: 1,553 of 1,615 songs have lyrics, 62 do not.
**Verification:** `npm run validate-catalog`; `npm run test -- validate-song-data`.

### CAT-011 — Hints must not give away the song

**Preset:** Preset
**Requirement:** A hint that contains a token from title or artist (from 4 characters, normalised) produces a warning. In addition: if `hintEvidence` is present, it must contain five valid URLs; if it is missing, this produces a warning.
**Rationale:** A hint that names the artist destroys the game. The verifiability of the hints additionally protects against false statements.
**Acceptance:** `src/utils/validate-song-data.ts:191-222` — spoiler token warning and `hintEvidence` check; the hint text is additionally censored at runtime (`src/utils/censor-utils.ts:11-59`).
**Verification:** `npm run validate-catalog` (measured: 126 warnings); no test exists — see [GAP-004](#open-gaps).

### CAT-012 — Hints are censored at runtime

**Preset:** Preset
**Requirement:** Before the display, a hint is checked against title and artist. Tokens from four characters on as well as all artist names listed in the exception list (e. g. `BTS`, `U2`, `2Pac`) are replaced with `[XXX]`. Short tokens (< 4 characters) only with word boundaries; words from the ignore list (`THE`, `AND`, `DER`, `UND` …) are never censored.
**Rationale:** A cover version added retroactively can make a hint spoiler-free retroactively — the censorship has to happen at runtime, not only at import.
**Acceptance:** `censorHint` (`src/utils/censor-utils.ts:11-59`), configuration `src/config/spoiler-config.ts:13` (`MIN_LENGTH: 4`), `:19-22` (exceptions), `:25-28` (ignore list); application in `src/components/game/modes/HintMasterMode.tsx:156`.
**Verification:** `grep -n "censorHint" src/components/game/modes/HintMasterMode.tsx src/utils/censor-utils.ts`; no test exists — see [GAP-004](#open-gaps).

### CAT-013 — Streaming links are formally checked

**Preset:** Preset
**Requirement:** `links.youtube` must be present; a placeholder (`TODO:`, empty, `PLACEHOLDER`) produces a warning. `spotify` must be a `spotify:track:` URI or an `open.spotify.com/track/` URL, `spotifyFreePreview`, `amazonMusic` and `amazonPrimePreview` must be http(s) URLs. `previewTimestamp.start` must be smaller than `.end`.
**Rationale:** Malformed links are the most frequent cause of unplayable songs.
**Acceptance:** `src/utils/validate-song-data.ts:231-308` and `:348-355`.
**Verification:** `npm run validate-catalog`; no test exists — see [GAP-001](#open-gaps).

### CAT-014 — Cover metadata is typed and checked

**Preset:** Preset
**Requirement:** If `coverMode` is set, `relationType` must be one of `original`, `cover`, `sample`, `remix` and `confidence` one of `low`, `medium`, `high`; `coverYear` must be a number.
**Rationale:** The Cover Confusion mode needs reliable relation data.
**Acceptance:** `src/utils/validate-song-data.ts:327-345`; type `src/types/song.ts:29-41`.
**Verification:** `npm run validate-catalog`; no test exists — see [GAP-001](#open-gaps).

### CAT-015 — The admin interface edits songs locally and exportably

**Preset:** Preset
**Requirement:** `/admin/songs` and `/admin/review` allow viewing, filtering, editing and exporting songs. Changes are kept in `localStorage` under `phomu-admin-songs` respectively `phomu-review-edits` and exported as a JSON delta. No server data is changed.
**Rationale:** The catalogue is maintained without a database; the interface is the only work surface for it.
**Acceptance:** `src/app/admin/songs/page.tsx:30` (`STORAGE_KEY`), `src/app/admin/review/page.tsx:33` (`STORAGE_KEY = 'phomu-review-edits'`), delta/full export in `src/app/admin/review/page.tsx`.
**Verification:** `grep -n "phomu-admin-songs\|phomu-review-edits" src/app/admin/*/page.tsx`; no test exists — see [GAP-001](#open-gaps).

### CAT-016 — The browse area can start a song directly

**Preset:** Preset
**Requirement:** In the browse area a song can be played immediately by click (quick play). The browse area deduplicates by title and artist, filters by search, genre, decade, difficulty, mood, one-hit wonder, lyrics and QR compatibility and paginates (8/24/48/96/all).
**Rationale:** "Which song was that again?" is one of the most frequent questions in your own party round.
**Acceptance:** `handlePlaySong` (`src/app/browse/page.tsx`), filter logic in `filteredSongs`, pagination `PAGE_SIZE_OPTIONS` (`src/app/browse/page.tsx:15`).
**Verification:** `grep -n "startQuickGame\|onlyWithLyrics\|onlyQR" src/app/browse/page.tsx`; no test exists — see [GAP-001](#open-gaps).

---

# 8. Security, privacy and admin API (SEC)

> **State 25.10.2026:** The admin API area is hardened in parallel by the security role (`src/admin-api/_lib/security.ts` and `src/admin-api/_lib/rate-limit.ts` were extended the same day by rate limiting, redirect guard, size caps and error statuses). The line references in this section relate to this state.
>
> **Operational status of this section — blocked, with a condition:** The requirements SEC-001 … SEC-018 describe the **code** of the admin API and are valid. They do **not** describe a running endpoint: the two handlers lie in `src/admin-api/` and are therefore not registered by the App Router, and `next.config.ts` sets `output: 'export'`, a static export that cannot execute a route handler at all. Measured: `npm run build` prints a route list of 20 entries, none of them an admin API route; `.next/app-path-routes-manifest.json` has 21 entries and no admin API entry; `grep -rn "admin/covers" out/` returns 0 hits; nothing outside `src/admin-api/` imports the module and `src/app/admin/` contains no `fetch()` call. The single test that states this is `src/admin-api/admin-api-reachability.test.ts`; it turns red as soon as the architecture changes.
>
> The decision — wire the API up (needs the server of the hosting decision, QA-09 item 2.6) or remove it — is an **owner decision** and is recorded in [`docs/cr/CR-0002-admin-api-entscheidung.md`](docs/cr/CR-0002-admin-api-entscheidung.md). Until it falls, this section is **blocked**; it is not open in the sense of "not started" and not done. See [GAP-030](#open-gaps).
>
> What was open before this entry — that the hardened helpers were not yet used by the routes — is closed: the routes use `fetchGuardedBinary`, `assertRateLimit`, `MAX_JSON_BYTES` and the credential-free URL check. The remaining hard limits live in `src/admin-api/_lib/hard-limits.ts`.

### SEC-001 — The admin API is token-protected

**Preset:** Preset
**Requirement:** Every admin API route demands the header `x-admin-token`. Without a valid token the answer is `401 Unauthorized`.
**Rationale:** The cover API writes files into the repository; it must not stand open on the internet.
**Acceptance:** `assertAdminAccess` (`src/admin-api/_lib/security.ts:81-112`); call in `src/admin-api/admin/covers/search/route.ts:69-70` and `src/admin-api/admin/covers/save/route.ts:133-134`.
**Verification:** `grep -rn "assertAdminAccess" src/admin-api/`; the negative tests are in `src/admin-api/admin-token-guard.test.ts` and `src/admin-api/admin-api-hardening.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-002 — The token comparison is time-constant

**Preset:** Preset
**Requirement:** The token comparison happens via `crypto.timingSafeEqual` on SHA-256 hashes and thus without a measurable side channel. Both hashes have the same length, so that the comparison cannot throw.
**Rationale:** A simple string comparison reveals the length and position of the token via the response time.
**Acceptance:** `timingSafeEqual` (`src/admin-api/_lib/security.ts:63-67`), use in `assertAdminAccess` (`:105`).
**Verification:** `grep -n "timingSafeEqual" src/admin-api/_lib/security.ts`; the negative test is `compares the token with timingSafeEqual instead of ===` in `src/admin-api/admin-token-guard.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-003 — Missing or too short configuration leads to 503, not to open access

**Preset:** Preset
**Requirement:** If `ADMIN_API_TOKEN` is not set or is shorter than 32 characters, the API answers with `503` — in no case with access.
**Rationale:** A failed deployment must not lead to an unlimited write API.
**Acceptance:** `src/admin-api/_lib/security.ts:83-101` — `MIN_ADMIN_TOKEN_LENGTH = 32` (`:25`). Both misconfigurations answer with status 503 and the **same** body (`ADMIN_UNAVAILABLE_MESSAGE`, `src/admin-api/_lib/errors.ts:34`), so that the answer does not disclose whether a usable secret exists; the concrete reason goes into the server log.
**Verification:** `grep -n "MIN_ADMIN_TOKEN_LENGTH\|503" src/admin-api/_lib/security.ts`; the negative tests are `fail-closed: without a configured env variable the API responds with 503` and `fail-closed: a too short token responds with 503` in `src/admin-api/admin-token-guard.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-004 — The token is generated locally and not checked in

**Preset:** Preset
**Requirement:** The token is generated with `node scripts/generate-admin-token.js` (default: 32 random bytes, hex-encoded; at least 16 bytes permitted) and set via the environment variable `ADMIN_API_TOKEN`. The `.env.example` contains only a placeholder.
**Rationale:** A token that is checked in is not a token.
**Acceptance:** `scripts/generate-admin-token.js:4-12`; `.env.example` ("ADMIN_API_TOKEN=replace-with-long-random-token"); `scripts/generate-admin-token.js` refuses values below 16 bytes.
**Verification:** `node scripts/generate-admin-token.js`; `grep -n "ADMIN_API_TOKEN" .env.example`; the token must not be in `git ls-files` (`git ls-files | xargs grep -l "ADMIN_API_TOKEN=" 2>/dev/null` — must hit only `.env.example`).

### SEC-005 — External cover downloads are restricted to HTTPS and a host allowlist

**Preset:** Preset
**Requirement:** A cover URL must use `https:` and lie on one of four permitted hosts (`mzstatic.com`, `is1-ssl.mzstatic.com`, `cdn-images.dzcdn.net`, `dzcdn.net`); subdomains of the permitted hosts are allowed. All other URLs are rejected with `400`.
**Rationale:** A URL freely chosen by the client is an SSRF vector (access to internal networks) and a file type vector.
**Acceptance:** `assertAllowedHost` (`src/admin-api/_lib/security.ts:187-190`), `parseHttpUrl` (`:203-223`), allowlist `src/admin-api/admin/covers/save/route.ts:19-24`, call `:155-156`, error handling `:154-160` → HTTP 400.
**Verification:** `grep -n "ALLOWED_IMAGE_HOSTS\|Only HTTPS" src/admin-api/`; the negative tests are in `src/admin-api/cover-fetch-guard.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-006 — The download is limited in time, type and size

**Preset:** Preset
**Requirement:** The cover download aborts after 10 seconds, accepts only responses with `content-type` beginning with `image/`, and rejects files over 5 MiB (both via `content-length` and via the actual byte count). Failed downloads deliver `502`, oversized files `413`.
**Rationale:** An unlimited download is a denial-of-service surface.
**Acceptance:** `fetchGuardedBinary` (`src/admin-api/_lib/security.ts:287-347`), `MAX_IMAGE_BYTES = 5 * 1024 * 1024` (`src/admin-api/_lib/hard-limits.ts:23`), the streaming reader with the hard limit (`src/admin-api/_lib/hard-limits.ts:52-95`), the call site `src/admin-api/admin/covers/save/route.ts:170-174`.
**Verification:** `grep -n "MAX_IMAGE_BYTES\|content-type\|10_000" src/admin-api/`; the negative tests are `rejects an oversized file that declares its own size` and `rejects an oversized file that sends no content-length` in `src/admin-api/cover-fetch-guard.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-007 — Search requests of the cover API are length-limited and time-limited

**Preset:** Preset
**Requirement:** `artist` and `title` of the cover search are limited to 120 characters and must not be empty. External retrievals abort after 7,000 ms and run without cache (`cache: 'no-store'`).
**Rationale:** Unlimited inputs and hanging upstreams block the server.
**Acceptance:** `boundedText` (`src/admin-api/_lib/security.ts:164-172`), call `src/admin-api/admin/covers/search/route.ts:85-86`; `fetchWithTimeout` with `DEFAULT_TIMEOUT_MS = 7000` (`src/admin-api/_lib/security.ts:24`, `:235-265`).
**Verification:** `grep -n "boundedText\|DEFAULT_TIMEOUT_MS" src/admin-api/`; the negative tests are `rejects a missing search field with 400` and `rejects an overlong search field with 400` in `src/admin-api/admin-routes-hardening.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-008 — The cover search uses two fixed external sources

**Preset:** Preset
**Requirement:** The cover search queries exclusively the search interfaces of the iTunes Search API and Deezer, each with `limit=5`. The results are deduplicated and limited to 10.
**Rationale:** A fixed, documented catalogue protects against unexpected data sources and keeps the behaviour traceable.
**Acceptance:** `src/admin-api/admin/covers/search/route.ts:93-143` — both retrievals, `uniqueResults` (`:58-65`), `slice(0, MAX_RESULTS)` (`:146`). The answer is bounded per field (`boundedOutputText`, `src/admin-api/_lib/hard-limits.ts:135-141`) and per number of inspected entries (`MAX_PROVIDER_ENTRIES`, `src/admin-api/admin/covers/search/route.ts:53`).
**Verification:** `grep -n "itunes.apple.com\|api.deezer.com" src/admin-api/admin/covers/search/route.ts`; the negative test is `uses the third-party results as text only` in `src/admin-api/admin-routes-hardening.test.ts`; the hard limit of the answer is proven by `cuts a field of the third-party answer off at the hard limit` in `src/admin-api/admin-api-hardening.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-009 — Write accesses to the catalogue are serialised

**Preset:** Preset
**Requirement:** The updating of the pack files happens under an exclusive lock file `.covers-save.lock` (flag `wx`). At most 30 attempts are made at intervals of 60 ms; if this fails, the API answers with `503`.
**Rationale:** Two parallel cover saves must not overwrite each other's JSON file.
**Acceptance:** `withPacksLock` (`src/admin-api/admin/covers/save/route.ts:88-104`), constants `:25-26`, `:37`, error "Cover save is temporarily busy" (`:92-95`).
**Verification:** `grep -n "withPacksLock\|LOCK_RETRIES" src/admin-api/admin/covers/save/route.ts`; the negative test is `responds with 429 when there are too many save requests` in `src/admin-api/admin-routes-hardening.test.ts`; the stale lock is documented in `src/admin-api/admin/covers/save/route.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-010 — Unknown song IDs are not created

**Preset:** Preset
**Requirement:** If a `songId` is passed that occurs in no pack file, the API answers with `404` and changes no pack file. The format of the ID is restricted to `[a-z0-9][a-z0-9-_]{2,120}`.
**Rationale:** An unchecked ID is a way to generate arbitrary file names.
**Acceptance:** `parseSongId` (`src/admin-api/_lib/security.ts:175-180`), search over all pack files and 404 answer (`src/admin-api/admin/covers/save/route.ts:106-130`, `:177-183`).
**Verification:** `grep -n "not found in any pack" src/admin-api/admin/covers/save/route.ts`; no test exists for the 404 answer — see [GAP-005](#open-gaps) (open for this single case).

### SEC-011 — Errors of the admin API do not disclose internal details

**Preset:** Preset
**Requirement:** Error responses contain a message and a status code; unexpected errors deliver `500` with generic text. Internal stack traces, paths or token values are not output.
**Rationale:** Error messages of the admin API are an information leak.
**Acceptance:** `src/admin-api/admin/covers/save/route.ts:186-202`, `src/admin-api/admin/covers/search/route.ts:148-162`; the error class documents the promise explicitly (`src/admin-api/_lib/errors.ts:9-20`).
**Verification:** `grep -n "status: 500" src/admin-api/`; the negative test is `refuses a malformed request body with 400` and `refuses an oversized request body with 413 before it is parsed` in `src/admin-api/admin-api-hardening.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-012 — No personal data in the disclosure channel

**Preset:** Preset
**Requirement:** The missing-link report contains exclusively technical metadata (song identifier, technical designations, available providers, time zone, locale, region, random device ID) — no free-text fields, no names, no contact data.
**Rationale:** The device ID is a random UUID, not a user account; free text fields would be a PII risk.
**Acceptance:** `src/components/game/MusicPlayer.tsx:198-214` (payload), `deviceId = localStorage.getItem(DEVICE_KEY) ?? crypto.randomUUID()` (`:179`); promised property in `src/app/privacy/page.tsx` ("We explicitly avoid free-text fields in these flows").
**Verification:** `grep -n "issuePayload" -A 18 src/components/game/MusicPlayer.tsx`; no test exists — see [GAP-001](#open-gaps).

### SEC-013 — The local data can be deleted completely

**Preset:** Preset
**Requirement:** Via `/settings/account` the entire local progress (XP) can be reset after confirmation. The action is marked as "danger zone".
**Rationale:** Privacy rights have to be exercisable without technical knowledge.
**Acceptance:** `resetProgress` (`src/stores/game-store.ts:525-527`), `src/app/settings/account/page.tsx` (danger zone with `confirm(...)`).
**Verification:** `grep -n "resetProgress" src/app/settings/account/page.tsx src/stores/game-store.ts`.

### SEC-014 — Failed sign-in attempts are limited

**Preset:** Preset
**Requirement:** Failed token checks are counted: 10 attempts per client and 100 attempts globally per 5-minute window. If a limit is exceeded, the API answers with `429` and a `Retry-After` header. The bucket per client is hard-limited (at most 10,000 keys), so that spoofed keys cannot fill up the memory.
**Rationale:** Without a limit the token is a brute-force surface.
**Acceptance:** `enforceAuthFailureLimit` (`src/admin-api/_lib/security.ts:118-141`), limits `:36` and `:49`, `checkRateLimit`/`getClientKey` (`src/admin-api/_lib/rate-limit.ts:13-48`, `MAX_TRACKED_KEYS = 10.000` in `:43`). The limitation acts **per instance** and is not a distributed DoS protection — that is documented explicitly in `src/admin-api/_lib/rate-limit.ts:4-11`.
**Verification:** `grep -n "AUTH_FAILURE_LIMIT\|AUTH_FAILURE_GLOBAL_LIMIT\|429" src/admin-api/_lib/security.ts`; the negative tests are `limits brute-force attempts per client (429 after 10 failed attempts)` and `limits brute-force attempts even when x-forwarded-for is forged` in `src/admin-api/admin-token-guard.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-015 — Redirects are followed manually and checked per hop

**Preset:** Preset
**Requirement:** Binary downloads follow redirects manually, at most three hops. Every hop is checked again against the protocol (`https:`) and the host allowlist; a redirect without a target, into an internal network or to a non-permitted host is rejected with `400`.
**Rationale:** An automatically followed redirect is the usual way to bypass the allowlist (`http://169.254.169.254/`).
**Acceptance:** `fetchGuardedBinary` (`src/admin-api/_lib/security.ts:287-347`), `MAX_REDIRECTS = 3` (`:28`), hop check `:306-330`.
**Verification:** `grep -n "fetchGuardedBinary\|MAX_REDIRECTS" src/admin-api/_lib/security.ts`; the negative tests are in `src/admin-api/cover-fetch-guard.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-016 — Response bodies of external services are size-limited

**Preset:** Preset
**Requirement:** The body of external responses is streamed and aborted as soon as it exceeds the configured limit (5 MiB for images, 512 KiB for JSON responses). A server without `content-length` can therefore not exhaust the memory of the process.
**Rationale:** `arrayBuffer()` without a limit is a memory disaster with malicious or broken upstreams.
**Acceptance:** `readCappedBody` (`src/admin-api/_lib/hard-limits.ts:52-95`), `readCappedJsonBody` (`:108-120`), `MAX_IMAGE_BYTES` (`:23`), `MAX_JSON_BYTES = 512 * 1024` (`:26`), integration in `fetchWithTimeout` (`src/admin-api/_lib/security.ts:252-255`). The **request** body of the save route is read under the same hard limit (`MAX_REQUEST_BODY_BYTES = 16 * 1024`, `src/admin-api/_lib/hard-limits.ts:20`; call `src/admin-api/admin/covers/save/route.ts:147`).
**Verification:** `grep -n "readCappedBody\|MAX_JSON_BYTES" src/admin-api/_lib/security.ts`; the negative tests are `refuses an oversized request body with 413 before it is parsed` and `cuts a field of the third-party answer off at the hard limit` in `src/admin-api/admin-api-hardening.test.ts`; the reader lives in `src/admin-api/_lib/hard-limits.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-017 — Credentials in URLs are forbidden

**Preset:** Preset
**Requirement:** A cover URL with `username` or `password` is rejected.
**Rationale:** Embedded credentials end up in logs, in error messages and in upstream requests.
**Acceptance:** `src/admin-api/_lib/security.ts:211-212` (the length of the URL is limited as well — `MAX_URL_LENGTH = 2048`, `src/admin-api/_lib/hard-limits.ts:32`).
**Verification:** `grep -n "Credentials in URL" src/admin-api/_lib/security.ts`; the negative test is `rejects embedded credentials` in `src/admin-api/cover-fetch-guard.test.ts` — see [GAP-005](#open-gaps) (closed).

### SEC-018 — Errors of the admin API carry an explicit HTTP status

**Preset:** Preset
**Requirement:** Errors of the admin API are carried by a dedicated error class with status code (`AdminRequestError`), so that status and message cannot drift apart via error texts.
**Rationale:** String matching on error texts is error-prone and untestable.
**Acceptance:** `src/admin-api/_lib/errors.ts:14-22` (class), `src/admin-api/_lib/hard-limits.ts:60`, `:118`, `src/admin-api/_lib/security.ts:309`, `:315`, `:319`, `:324`, `:332`, `:340`, `:346` (status mapping).
**Verification:** `grep -n "AdminRequestError" src/admin-api/_lib/security.ts`; the negative test is `carries the error status in the AdminRequestError` in `src/admin-api/cover-fetch-guard.test.ts`; the class lives in `src/admin-api/_lib/errors.ts` — see [GAP-005](#open-gaps) (closed).

---

# 9. Non-functional requirements (NFR)

### NFR-001 — TypeScript runs in strict mode without errors

**Preset:** Preset
**Requirement:** `npm run typecheck` (`tsc --noEmit`) is error-free. `any` is not permitted; types are defined centrally via `src/types/` and `src/config/`.
**Rationale:** A strict type system is the cheapest form of quality assurance.
**Acceptance:** `tsconfig.json` with `strict: true`; measured state: `npm run typecheck` ends with exit 0.
**Verification:** `npm run typecheck`; `grep -rn ": any\|<any>\|as any" src/ | grep -v "\.test\."` (must be empty).

### NFR-002 — ESLint is error-free

**Preset:** Preset
**Requirement:** `npm run lint` reports no errors. Remaining warnings are documented and justified.
**Rationale:** Lint is the cheapest continuously running quality check.
**Acceptance:** Measured state: 0 errors, 1 warning (`playwright.config.ts:1` — `import/no-anonymous-default-export`).
**Verification:** `npm run lint` — the output must contain "0 errors".

### NFR-003 — Unit tests cover the pure logic

**Preset:** Preset
**Requirement:** Vitest tests the rule-bearing utilities. The test scope comprises at least: QR intent parsing, AI task queue, catalogue year validation and the Amazon link resolution.
**Rationale:** The most expensive rules of the product (scoring, slot logic, selection chain) are still untested — that is the largest coverage gap (see [GAP-001](#open-gaps) to [GAP-003](#open-gaps)).
**Acceptance:** Measured state: 4 test files, 21 tests, all passed (`src/utils/qr-intent.test.ts`, `src/utils/ai-task-queue.test.ts`, `src/utils/validate-song-data.test.ts`, `src/components/game/MusicPlayer.test.ts`). `vitest.config.ts` includes `src/**/*.test.ts`.
**Verification:** `npx vitest run` — 4 files / 21 tests must be green.

### NFR-004 — The test configuration is extended beyond the source area

**Preset:** Preset
**Requirement:** Vitest captures all test files under `src/` and measures the coverage over the entire product code, not only over `src/utils/`.
**Rationale:** The current coverage measurement completely excludes store, components and mode logic — exactly the areas with the most expensive rules.
**Acceptance:** **Status: not met.** `vitest.config.ts` limits `coverage.include` to `src/utils/**/*.ts`. See [GAP-001](#open-gaps).
**Verification:** `grep -n "include" vitest.config.ts`; target state: `coverage.include: ['src/**/*.{ts,tsx}']`.

### NFR-005 — One gate over the entire pipeline

**Preset:** Preset
**Requirement:** `npm run local-ci` runs in a fixed order: typecheck, lint, unit tests, format check (non-blocking), song validation, catalogue validation, build, dependency audit (from `moderate`) as well as — only with `YOUTUBE_API_KEY` set — the YouTube link audit.
**Rationale:** A gate that checks only a part creates a false sense of security.
**Acceptance:** `scripts/local-ci.sh:47-72` (checklist);
**Verification:** `bash scripts/local-ci.sh` — every check marked as blocking must report "[SUCCESS]".

### NFR-006 — The format check is non-blocking, but present

**Preset:** Optional
**Requirement:** The formatting is checked with Prettier (`npm run format:check`), the check currently does not block the pipeline.
**Rationale:** A blocking format check in an active content repository creates noise; the existence of the check suffices for now.
**Acceptance:** `scripts/local-ci.sh:56` —
**Verification:** `npm run format:check`.

### NFR-007 — The catalogue report is part of the gate

**Preset:** Preset
**Requirement:** The catalogue gate writes its report to `specifications/catalog_issues_report.json` and is led as evidence in the release process.
**Rationale:** Without a report written along, the state of the gate cannot be evidenced.
**Acceptance:** `src/utils/validate-song-catalog.ts:230-244` (writing of the report), `npm run validate-catalog:report`.
**Verification:** `npm run validate-catalog:report`; `cat specifications/catalog_issues_report.json`.

### NFR-008 — No acceptance based on stubs

**Preset:** Preset
**Requirement:** A feature counts as implemented only when a real, executable implementation exists. Placeholder assets, mock bridges and providers that are only listed as configured do not count as implementation. Known violations are tracked in the [Open gaps](#open-gaps) and block the acceptance of the affected feature.
**Rationale:** The stock contains audio prompts instead of audio, a cover variant without cover data and an Amazon path without preview data. Without this rule every acceptance becomes a claim.
**Acceptance:** Known violations: [GAP-009](#open-gaps) (audio assets), [GAP-011](#open-gaps) (cover versions), [GAP-012](#open-gaps) (Amazon preview). Counter-check: `ls public/audio/sfx/` contains only `.prompt.md` files, no `.mp3`.
**Verification:** `ls public/audio/sfx/ public/audio/mode-cues/` — the evidence of the gap is part of the acceptance, not its replacement.

### NFR-009 — Source files stay below the size limit

**Preset:** Preset
**Requirement:** No source file exceeds 550 lines (soft target 400 lines). The gate `scripts/check-file-size.mjs` checks this automatically.
**Rationale:** Very large files are the main reason for hard-to-maintain code.
**Acceptance:** **Status: not met.** Measured: 5 files over 550 lines (`src/app/admin/review/page.tsx` 755, `src/app/lobby/page.tsx` 744, `src/components/game/RevealPhase.tsx` 671, `src/stores/game-store.ts` 640, `src/components/game/MusicPlayer.tsx` 630) and 5 more over 400 lines. The gate script does not exist. See [GAP-007](#open-gaps).
**Verification:** `find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | head -15` — after completion `scripts/check-file-size.mjs` must exist, run green and be integrated into `scripts/local-ci.sh`.

### NFR-010 — An i18n gate prevents untranslated texts

**Preset:** Preset
**Requirement:** `scripts/check-i18n-completeness.mjs` checks that `de.json` and `en.json` are parallel, contain no empty values and that no visible literal text is left in the JSX. The gate runs locally and in the CI.
**Rationale:** Without an automatic gate the translation drifts apart with every change.
**Acceptance:** **Status: partially met.** The script `scripts/check-i18n-completeness.mjs` has existed since 25.10.2026 and checks parity, empty values, plural forms and literal texts (`--count`, `--json`, `--files=`). Not met: the wiring as `npm run check:i18n` in `package.json` and the run in `scripts/local-ci.sh`. See [GAP-006](#open-gaps).
**Verification:** `node scripts/check-i18n-completeness.mjs` — must end without hits (exit 0). Wiring: `grep -n "check:i18n" package.json scripts/local-ci.sh`.

### NFR-011 — A doc link check prevents dead references

**Preset:** Preset
**Requirement:** `scripts/check-doc-links.mjs` checks that every relative Markdown link in the project documentation is resolvable. The gate runs locally and in the CI.
**Rationale:** Dead links in a specification are more expensive than missing links, because they destroy trust.
**Acceptance:** **Status: not met.** The script does not exist. The repo does however contain a `broken-links-report.json` (72,904 bytes) as a legacy artefact. See [GAP-008](#open-gaps).
**Verification:** `ls scripts/check-doc-links.mjs` — after completion the script must exist, run green and be integrated into `scripts/local-ci.sh`.

### NFR-012 — The E2E smoke test checks the reachability of the core routes

**Preset:** Preset
**Requirement:** The Playwright smoke test opens the core routes `/`, `/lobby`, `/game`, `/game-over`, `/browse` and `/settings` and checks that each route is loaded. A live server is started via the Playwright configuration.
**Rationale:** The smoke test catches the most common production error: a route that no longer builds.
**Acceptance:** `e2e/smoke.spec.ts` (one test case with six route checks), `playwright.config.ts`.
**Verification:** `npm run test:e2e:smoke` (presupposes an installed Chromium browser: `npm run test:e2e:install`).

### NFR-013 — The E2E test covers the core journey

**Preset:** Preset
**Requirement:** The end-to-end test must cover the complete game flow: create a player, choose a mode, start the game, answer a round, trigger the reveal, end the game.
**Rationale:** The current smoke test only checks URLs; a bug in the state automaton would remain undetected.
**Acceptance:** **Status: not met.** `e2e/smoke.spec.ts` consists exclusively of URL assertions. See [GAP-021](#open-gaps).
**Verification:** `npm run test:e2e:smoke` — after the extension the test must run through at least one complete round.

### NFR-014 — The AI task queue works with retry and status model

**Preset:** Optional
**Requirement:** The queue processes tasks with a default parallelism of 1 and a retry interval of 1,000 ms. On errors a retry is made with linear delay (`retryDelayMs × attempts`) until `maxAttempts` is reached; afterwards the status is `failed` with the error message. Successful tasks receive the status `done`.
**Rationale:** The model is the basis for the planned AI hint pipeline; the retry semantics must be fixed before the deployment.
**Acceptance:** `src/utils/ai-task-queue.ts:20-64`; test `src/utils/ai-task-queue.test.ts` (2 tests: success, retry until `failed`).
**Verification:** `npm run test -- ai-task-queue`.

### NFR-015 — The AI hint pipeline is not yet connected

**Preset:** Later
**Requirement:** The settings `hintReleasePolicy` (`auto-publish` | `manual-review`) and `aiQueueStrategy` (`queue-retry-pending` | `fail-fast`) are stored and displayed in the interface, but do not yet control any process. There is no AI hint generation in the product code.
**Rationale:** A visible setting without effect is a promise that is not kept; it is therefore tracked here as "Later" and not claimed as a feature.
**Acceptance:** Types `src/types/game-state.ts:17-20`, defaults `src/config/game-config.ts:70-71`, interface `src/app/settings/governance/page.tsx`; no caller of the queue in the product code (`grep -rn "processAITaskQueue" src/` finds only the test file).
**Verification:** `grep -rn "processAITaskQueue" src/`; the gap is tracked as [GAP-020](#open-gaps).

### NFR-016 — The development tools remain reproducible

**Preset:** Preset
**Requirement:** The generator and repair scripts (`scripts/*.js`, `scripts/*.py`) change the catalogue deterministically and are versioned. The loader `src/data/songs/index.ts` is generated by `scripts/migrate_and_deduplicate.py` and not maintained manually.
**Rationale:** A catalogue that is maintained by hand alone cannot be checked reproducibly.
**Acceptance:** Header comment in `src/data/songs/index.ts`; `scripts/migrate_and_deduplicate.py`, `scripts/fix-duplicates.js`, `scripts/find-duplicates.js`, `scripts/repair-links.js`, `scripts/fix-youtube-links.js` are present.
**Verification:** `ls scripts/ | wc -l`; `head -8 src/data/songs/index.ts`.

---

# Contradictions

The following statements from `LLM.md` and the legacy specifications under `specifications/` contradict the code. The code is authoritative; the old documents are to be corrected or archived.

| # | Location | Claim | Actual state (code) | Resolution |
|---|---|---|---|---|
| W-01 | `specifications/archive/LLM_archivstand_2026-10-25.md:11` (old `LLM.md`) | "Next.js 15 (App Router)" | `package.json`: `"next": "^16.2.1"`, `eslint-config-next: ^16.2.1`, `react: ^19.2.4` | **Done** through the archiving and the new entry card `LLM.md` ("Next.js 16 (App Router) · React 19 …"). `package.json` is authoritative. |
| W-02 | `specifications/archive/LLM_archivstand_2026-10-25.md:43` | "THE 5 GAME MODES" | Six modes: `src/config/game-config.ts:12-18` and `:300-307` | Done via the archive; the six IDs are binding in [CORE-006](#core-006--one-core-six-clearly-separated-game-modes). |
| W-03 | `specifications/archive/LLM_archivstand_2026-10-25.md:44` | Timeline = "Drag & drop songs onto a timeline" | Slot-based click/keyboard selection, no drag & drop: `src/components/game/modes/TimelineMode.tsx:466-536`, `:242-255` | Done via the archive; tracked as "ordering via slot selection". |
| W-04 | `specifications/archive/LLM_archivstand_2026-10-25.md:52` | Lyrics Labyrinth: "Players MUST lock in their choice **before** the music starts. Audio is the reveal." | The music starts immediately when the question is built (blurred): `src/components/game/modes/LyricsMode.tsx:109-122` | Done via the archive. The lock-in semantics are still **not** implemented — see [GAP-010](#open-gaps). |
| W-05 | `specifications/archive/LLM_archivstand_2026-10-25.md:55` | Vibe-Check: "Community stats show how many other users chose the same vibe (via Supabase)." | No community statistic. Scoring happens locally against `song.mood`: `src/components/game/modes/VibeCheckMode.tsx:54` | Done via the archive; binding is [GAME-030](#game-030--vibe-check-six-options-two-points). |
| W-06 | `specifications/archive/LLM_archivstand_2026-10-25.md:72` | "Strategy Pattern: A single `MusicPlayer` component delegates to provider-specific adapters." | `src/types/music-provider.ts:34-93` defines `MusicProviderInterface`, but **no** implementation exists. `MusicPlayer` is a monolithic component with inline branches (`:149-170`, `:559-619`) | Done via the archive. The interface remains **Later**; the actual architecture is described in [MEDIA-001](#media-001--youtube-is-the-default-provider) to [MEDIA-018](#media-018--the-provider-status-is-shown-in-the-player). |
| W-07 | `specifications/archive/LLM_archivstand_2026-10-25.md:79` | "No title, artist, album art, or provider chrome visible — **not even in the DOM**." | The YouTube iframe lies in the DOM, covered by the blur layer: `src/components/game/MusicPlayer.tsx:424-430` | Done via the archive. "Not visible" is the provable statement; `controls: 0` and `modestbranding: 1` (`:296-297`) prevent visible chrome. |
| W-08 | `specifications/archive/LLM_archivstand_2026-10-25.md:86` | Autoplay workaround: "User must click a 'Play' button, followed by a countdown (3-2-1), then music starts." | No play button and no countdown. `playerVars.autoplay = 1` (`:295`); `PHOMU_CONFIG.COUNTDOWN_SECONDS: 3` is used nowhere | Done via the archive. `COUNTDOWN_SECONDS` is dead configuration stock — see [GAP-022](#open-gaps). |
| W-09 | `specifications/archive/LLM_archivstand_2026-10-25.md:81-82` | Reveal trigger: "Singleplayer: After the player locks in their answer. Multiplayer: After ALL players have locked in." | There is only pass-the-phone with one answering pilot; the reveal runs via a manual button: `src/components/game/QuestionPhase.tsx:86-102`, `src/app/game/page.tsx:164-166` | Done via the archive; the actual trigger is described in [GAME-002](#game-002--the-reveal-releases-the-solution-only-after-locking-the-answers). |
| W-10 | `specifications/archive/LLM_archivstand_2026-10-25.md:20`, `:25-26`, `:29` | Anti-cheat UI with swipe-to-unlock, "PASS DEVICE" screen, 6-digit session code, Supabase realtime, Google login, spectator mode, elimination | Not implemented. `isEliminated`/`isSpectator` are only set to `false` (`src/stores/game-store.ts:216-217`) and never changed. `deviceMode` is fixed to `'pass-the-phone'` (`:45`). `MultiDeviceSession` and `SessionPreset` are pure types (`src/types/session.ts:21-49`) | Done via the archive; tracked as **Later** — see [GAP-016](#open-gaps). |
| W-11 | `specifications/archive/LLM_archivstand_2026-10-25.md:109` | "File Size: Target 400 lines; **Absolute Max 600** lines per file." | `CONTRACT.md:307` demands a gate with max. 550 (soft 400). Reality: 5 files over 550 lines, largest 755 lines | Done via the archive. Binding is the limit 550/400 from [NFR-009](#nfr-009--source-files-stay-below-the-size-limit). |
| W-12 | `specifications/archive/LLM_archivstand_2026-10-25.md:132` | `PhomuSong.pack: string` | `packs: string[]` (`src/types/song.ts:83`) | Done via the archive; binding is [CAT-004](#cat-004--the-catalogue-access-filters-by-pack-assignment). |
| W-13 | `specifications/archive/LLM_archivstand_2026-10-25.md:135` | `lyrics.real: string[]` | Tuple of exactly three strings: `[string, string, string]` (`src/types/song.ts:98`) | Done via the archive; binding is [CAT-010](#cat-010--lyrics-must-have-exactly-three-real-lines-and-one-invented-line). |
| W-14 | `specifications/archive/LLM_archivstand_2026-10-25.md:101` | "Standard Packs: … (20 total)" | 27 configured packs (`src/config/game-config.ts:89-279`), 27 different pack names in the data | Done via the archive; binding is [CAT-003](#cat-003--there-are-exactly-27-configured-packs-and-all-are-covered-in-the-catalogue). |
| W-15 | `specifications/archive/LLM_archivstand_2026-10-25.md:102` | "First Pack: 'Global Hits 1950-2026' (50 songs for development…)" | The pack contains 1,107 songs (measured via `src/data/songs/*.json`). `src/data/songs/packs.json` claims `songCount: 59` | Done via the archive; `packs.json` nevertheless remains an outdated metadata source (see [GAP-028](#open-gaps)). |
| W-16 | `specifications/archive/LLM_archivstand_2026-10-25.md:116` | "Printing: Card generator exporting high-res PNGs (59x91mm + 3mm bleed) for `meinspiel.de`" | `CARD_WIDTH_MM: 59`, `CARD_HEIGHT_MM: 91`, `CARD_BLEED_MM: 3` exist (`src/config/game-config.ts:322-324`), but are used nowhere; a card generator does not exist | Done via the archive. The dimensions are named as a product feature in the new `LLM.md`, the generator is missing — see [GAP-022](#open-gaps). |
| W-17 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:12` | `Lint: ❌ nicht grün (10 Errors, 2 Warnings)` | Measured: 0 errors, 1 warning (`playwright.config.ts:1`) | Done via the archive; the code is lint-green. |
| W-18 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:13` | `Unit Tests (Vitest): ✅ 2 Test-Dateien, 6 Tests bestanden` | Measured: 4 test files, 21 tests | Done via the archive. |
| W-19 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:7` | `37 Packs / 1.629 Songs` | Measured: 135 pack files, 1,615 songs (`npm run validate-catalog`) | Done via the archive; see [CAT-002](#cat-002--the-catalogue-comprises-135-pack-files-with-1615-songs). |
| W-20 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:14` | `Coverage (Vitest): ⚠️ gesamt 7.56% Lines` | The coverage currently measures only `src/utils/**/*.ts` (`vitest.config.ts`), thus neither store nor components. A current value was not newly measured in this round | Done via the archive. Do not cite any number without a fresh measurement; the limitation of the measurement scope is the reliable statement. |
| W-21 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:24` | `Große Contentbasis (1.915 Songs)` | 1,615 songs (measured) | Done via the archive. |
| W-22 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:114` | `Admin-Cover-Routen ohne AuthN/AuthZ Guardrail sichtbar.` | AuthN is implemented: `assertAdminAccess` with token, length check and time-constant comparison (`src/admin-api/_lib/security.ts:13-28`). AuthZ (roles) is missing | Done via the archive; the finding is to be corrected to "AuthN present, AuthZ open". See [SEC-001](#sec-001--the-admin-api-is-token-protected). |
| W-23 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:134` | `Lint: viele Warnungen (65), keine Errors` | 1 warning, 0 errors | Done via the archive. |
| W-24 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:113` | `Keine expliziten Security-Header in Next-Konfiguration.` | **Confirmed:** `next.config.ts` contains only `reactStrictMode`. No CSP/HSTS/referrer/permissions headers are delivered | **Open** — tracked as [GAP-018](#open-gaps). |
| W-25 | `specifications/archive/logic-flow_archivstand_2026-10-25.md:8-12` | Validation table with five modes, Vibe-Check with community stats, Lyrics with lock-in before the audio | Six modes, no community stats, audio starts immediately | Done via the archive; see W-02, W-04, W-05. |
| W-26 | `specifications/archive/logic-flow_archivstand_2026-10-25.md:18` | "A 'Staff Menu' is available in all modes to manually adjust scores or skip turns" | The power-user menu appears only in the reveal phase: `src/components/game/RevealPhase.tsx:604-634`; it corrects only the current round, not arbitrary points | Done via the archive; binding is [GAME-040](#game-040--power-user-override-with-documented-governance). |
| W-27 | `specifications/archive/database_schema_archivstand_2026-10-25.md:4`, `:19`, `:52-60` | "Used across all 5 game modes", `pack: string`, Supabase tables `songs`, `sessions`, `session_players`, `game_rounds`, `vibe_votes`, `user_profiles`, `saved_presets` | Six modes, `packs: string[]`, lyrics optional. No Supabase table exists; `package.json` contains no Supabase dependency, the only persistence is `localStorage` | Done via the archive. Supabase is **Later** — see [GAP-016](#open-gaps). |
| W-28 | `CONTRACT.md:196` | `Heute: 25 Schlüssel, ~285 Literale in 41 Dateien` | The 25 keys are correct. The literals are **not** translated: `useTranslation` is used only in `src/app/page.tsx`. The gate counts 935 literal texts in 47 files | The number `~285 Literale in 41 Dateien` is to be replaced by the measured value (935 in 47). See [I18N-007](#i18n-007--every-visible-text-comes-from-the-translation) and [GAP-006](#open-gaps). |
| W-29 | `CONTRACT.md:214-259` | Specification of 46 `common.*` keys | `de.json`/`en.json` contain 6 `common.*` keys each (`play`, `back`, `next`, `cancel`, `save`, `loading`); `src/i18n/locales/parts/` is empty | The list is a target specification, not the actual state. Track the status as "planned". |
| W-30 | `CONTRACT.md:78` | Example requirement with `answersLocked === true` as condition for the reveal | A variable `answersLocked` does not exist (`grep -rn "answersLocked" src` is empty). The reveal follows a button press respectively the flow of the mode | Adapt the example to the code; binding is [GAME-002](#game-002--the-reveal-releases-the-solution-only-after-locking-the-answers). |
| W-31 | `CONTRACT.md:305-307` | Gates `scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs`, `scripts/check-file-size.mjs` | `check-i18n-completeness.mjs` has existed since 25.10.2026 (result: 935 literal texts in 47 files). `check-doc-links.mjs` and `check-file-size.mjs` are missing; `npm run check:i18n` is not defined in `package.json` | **Partially done.** Wiring, file size gate and link check remain open — see [NFR-009](#nfr-009--source-files-stay-below-the-size-limit) to [NFR-011](#nfr-011--a-doc-link-check-prevents-dead-references). |
| W-32 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:15` | `Song-Validation (validate-songs): ❌ fehlgeschlagen (A1.json: 52 Fehler, 362 Warnungen)` | `npm run validate-catalog` reports 0 schema errors and 126 warnings across all 135 packs | Done via the archive. The single-pack check `npm run validate-songs` still checks `src/data/songs/A1.json` as a single file (`src/utils/validate-song-data.ts:465`) and is not identical to the catalogue gate. |
| W-33 | `src/config/game-config.ts:282-283` | Comment: old pack IDs `lieferten im Filter leere Auswahlen` | `PACK_ALIASES` (`:284-297`) fixes this for the 12 listed IDs. The 27 IDs in `SONG_PACKS` and the 27 pack names in the data match exactly (measured) | No open contradiction; the configuration is consistent. The 12 aliases remain necessary for old game states. |
| W-34 | `LLM.md:37-39` (new entry card, state 25.10.2026) | Rule 2: `Vor dem Sperren der Antworten darf kein Titel, kein Interpret und kein Albumcover **im DOM oder im Zustand** liegen.` | The song with title, artist, year and cover lies in the state (`currentSong` in `src/stores/game-store.ts:394-402`), and the YouTube iframe with the video lies in the DOM (`src/components/game/MusicPlayer.tsx:425-429`). The rule is **not** met in the code | **Open — highest priority.** Either the rule is implemented (separate display song without metadata) or the entry card is made more precise. See [GAP-027](#open-gaps). |
| W-35 | `LLM.md:40-42` (new entry card) | Rule 3: `Jeder sichtbare Text kommt aus der Übersetzung. … Keine hartkodierten UI-Zeichenketten.` | 935 literal texts in 47 files (`node scripts/check-i18n-completeness.mjs --count`) | **Open.** The gate exists and pinpoints the location; the migration is pending. See [GAP-006](#open-gaps). |
| W-36 | `specifications/catalog_issues_report.json:5-6` | Report of 22.10.2026: "songs: 1623", "schemaWarnings: 308" | Measured on 25.10.2026: 1,615 songs, 126 warnings (`npm run validate-catalog`) | The report is not current — it was not regenerated after the catalogue cleanup. Gate: re-run `npm run validate-catalog:report`. |

---

# Open gaps

Every gap names the affected requirements and the question of whether it is a **requirement** (has to be implemented) or a deliberately deferred **Later**. Without a decision by the owner it stays open — it is not recorded as met.

| ID | Gap | Affected requirements | Classification | Location |
|---|---|---|---|---|
| GAP-001 | No tests for the game mode logic: scoring formulas, timeline slot logic, cheat deductions, no-cheat behaviour. The most expensive rules of the product are untested. | GAME-016 … GAME-039 | **Requirement** | `src/components/game/modes/*.tsx`; `vitest.config.ts` (`include: src/**/*.test.ts` — no component tests) |
| GAP-002 | No tests for the store transitions: `startGame`, `nextRound`, end conditions, team mixing, scoring, pilot handover. | GAME-001 … GAME-015, GAME-039, GAME-041, LOBBY-003 … LOBBY-012 | **Requirement** | `src/stores/game-store.ts` |
| GAP-003 | No tests for `pickRandomSong` (pack/difficulty/QR/mode filters and their fallback chain) and for `normalizePackIds`. | GAME-043 … GAME-045, LOBBY-017 | **Requirement** | `src/utils/song-picker.ts` |
| GAP-004 | No tests for `censorHint` (spoiler censorship in hints). | CAT-011, CAT-012 | **Requirement** | `src/utils/censor-utils.ts` |
| GAP-005 | No tests for the admin API: token check, SSRF allowlist, size limit, content type check, lock mechanism. | SEC-001 … SEC-011 | **Requirement** — **closed**: 78 test cases in 7 files under `src/admin-api/` (token gate, SSRF allowlist with per-hop revalidation, size caps, content type, rate limit, lock, hard limits, reachability) | `src/admin-api/admin-token-guard.test.ts`, `admin-rate-limit.test.ts`, `cover-fetch-guard.test.ts`, `admin-routes-hardening.test.ts`, `security-headers.test.ts`, `admin-api-hardening.test.ts`, `admin-api-reachability.test.ts` |
| GAP-006 | The i18n gate is **created** (`scripts/check-i18n-completeness.mjs`), but not yet wired (`npm run check:i18n` is missing in `package.json`, no run in `scripts/local-ci.sh`). The core of the gap remains: 935 hard-coded literal texts in 47 files are not translated (among others in `src/app/lobby`, `src/app/game`, `src/app/projector`, `src/app/settings`, `src/components/game/**`). | I18N-004, I18N-005, I18N-006, I18N-007, NFR-010 | **Requirement** | `node scripts/check-i18n-completeness.mjs --count` → `Summe Literaltexte: 935`, `Dateien geprüft: 47`; `grep -rn "useTranslation" src/` → 1 hit (`src/app/page.tsx`) |
| GAP-007 | No file size gate; 5 files over 550 lines, 5 more over 400 lines. | NFR-009 | **Requirement** | `src/app/admin/review/page.tsx` (755), `src/app/lobby/page.tsx` (744), `src/components/game/RevealPhase.tsx` (671), `src/stores/game-store.ts` (640), `src/components/game/MusicPlayer.tsx` (630) |
| GAP-008 | No doc link check gate. | NFR-011 | **Requirement** | `scripts/` contains no `check-doc-links.mjs` |
| GAP-009 | The sound effect and mode cue files are missing. What exists are only asset prompts (`public/audio/sfx/*.prompt.md`, `public/audio/mode-cues/*.prompt.md`); the `.mp3` files referenced in the code do not exist. The SFX player swallows the error silently. | UI-015, UI-016, NFR-008 | **Requirement** (or deliberately "Later" if the sounds are dropped) | `src/utils/game-audio-cues.ts:4-20` against `ls public/audio/sfx/` |
| GAP-010 | The phase `locked-in` is not entered by any code path; there is no `answersLocked` semantics. The lyrics variant starts the music before the answer. | GAME-001, GAME-002, W-04, W-30 | **Decision required**: build a real locking phase or reduce the phase scope to four phases | `src/types/game-state.ts:31`; `grep -rn "advancePhase(" src` |
| GAP-011 | `links.coverLink` is set in **none** of the 1,615 songs. The cover confusion variant `Cover oder Original?` is therefore never linked to a real cover, and the label `COVER-VERSION AKTIV` never appears. | GAME-034, GAME-035, MEDIA-016, NFR-008 | **Requirement** (data delivery) or **Later** (remove the variant) | measured via `src/data/songs/*.json`; `src/components/game/modes/CoverConfusionMode.tsx:116-120` |
| GAP-012 | `links.amazonPrimePreview` is set in **no** song. The path `useAmazonPrime` is therefore dead code; the selection "Amazon Music" in the settings does nothing beyond a hint text — YouTube is played. | MEDIA-012, MEDIA-002, NFR-008 | **Requirement** (data delivery) or **Later** (remove the provider from the selection) | measured via `src/data/songs/*.json`; `src/components/game/MusicPlayer.tsx:169`, `:285` |
| GAP-013 | `apple-music` and `amazon-music-premium` are provider types without UI selection and without adapter (`src/config/game-config.ts:20-26`). | MEDIA-001 … MEDIA-018 | **Later** | `grep -rn "amazon-music-premium\|apple-music" src/` → only type definition and embed branch |
| GAP-014 | `onlyQRCompatible` has no effect: all 1,615 songs have `isQRCompatible: true`. The switch in the lobby suggests a filtering that does not exist. | LOBBY-023 (lobby step 5), GAME-045 | **Decision required**: sharpen the filter (maintain real card compatibility) or remove the switch | measured via `src/data/songs/*.json`; `src/app/lobby/page.tsx:439-460` |
| GAP-015 | `supportedModes` is inconsistent with `lyrics !== null`: 1,521 songs list "lyrics" in `supportedModes`, 1,553 have lyrics data. The mode filter in `pickRandomSong` therefore does not take effect for 32 songs with lyrics. | GAME-043, CAT-003 | **Requirement** (data cleanup) | measured via `src/data/songs/*.json`; `src/utils/song-picker.ts:58-62` |
| GAP-016 | Multi-device mode, session code, Supabase, Google login, spectator mode and elimination exist only as types respectively flags that are never set. | LOBBY-020, W-10, W-27 | **Later** | `src/types/session.ts`; `src/types/player.ts:31-43`; `src/stores/game-store.ts:216-217` |
| GAP-017 | `FORCE_REMOVE_DUPLICATE_YEARS: true` (`src/config/game-config.ts:316`) is not enforced: a duplicate is removed automatically, the player selection only takes effect from more than ten year numbers. | GAME-019, GAME-020 | **Decision required**: make the constant effective or remove it | `src/components/game/modes/TimelineMode.tsx:185-196` |
| GAP-018 | No security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are delivered. `next.config.ts` contains only `reactStrictMode`. | SEC-001 … SEC-013 | **Requirement** | `next.config.ts`; `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:113` |
| GAP-019 | `overrideGovernance` is displayed but not enforced — there are no roles, no co-host identity and no majority decision. | GAME-040 | **Requirement** (role model) or **Later** | `src/components/game/RevealPhase.tsx:614-618`; `src/app/game/page.tsx:197-215` |
| GAP-020 | `hintReleasePolicy` and `aiQueueStrategy` are persisted and displayed, but control no process. There is no AI hint generation in the product code. | NFR-014, NFR-015 | **Later** | `src/app/settings/governance/page.tsx`; `grep -rn "processAITaskQueue" src/` |
| GAP-021 | The E2E test checks exclusively the reachability of six routes; the core journey (lobby → round → reveal → end of game) is not covered. | GAME-003, LOBBY-001, UI-011, UI-012, NFR-012, NFR-013 | **Requirement** | `e2e/smoke.spec.ts` |
| GAP-022 | Eight configuration constants are never used: `SPOTIFY_PREVIEW_DURATION`, `COUNTDOWN_SECONDS`, `DEFAULT_UNLOCK_METHOD`, `FORCE_REMOVE_DUPLICATE_YEARS`, `MIN_ROUNDS_TO_PLAY`, `MAX_ROUNDS_TO_PLAY`, `MAX_CARDS_PER_SET`, `DEFAULT_LANGUAGE` (as well as `CARD_*_MM`, `ALL_GAME_MODES`). | MEDIA-001 … MEDIA-018, LOBBY-014 | **Decision required**: make them effective or remove them (dead configuration stock) | `src/config/game-config.ts:61-62`, `:81-82`, `:313`, `:316`, `:322-325` |
| GAP-023 | The pack selector shows the unchecked number `Über 1.000 Songs bereit zum Spielen` (a count of songs ready to play). With 1,615 songs the statement is true, but not measured and not maintained on catalogue changes. | LOBBY-016, CAT-002 | **Decision required**: derive the number from the catalogue or use text without a number | `src/components/lobby/PackSelector.tsx` (footer badge) |
| GAP-024 | `chipsEnabled` is persisted, but there is no chips mechanic. `ENABLE_CHIPS_BETTING: false` is the source of truth. | GAME-001 … GAME-039 (configuration) | **Later** | `src/types/game-state.ts:102`, `src/config/game-config.ts:319` |
| GAP-025 | `supportedModes` currently allows all six modes for 1,615 songs (`timeline`, `hint-master`, `vibe-check`, `cover-confusion`, `survivor`), `lyrics` only for 1,521. The mode filter silently falls back to the full pool when a filter is empty — the mode then runs with songs that do not support it. | GAME-043, GAME-045 | **Decision required**: keep the silent fallback or show an error | `src/utils/song-picker.ts:56-70` |
| GAP-026 | `MIN_ROUNDS_TO_PLAY = 10` and `MAX_ROUNDS_TO_PLAY = 30` are not enforced. The lobby offers 5, 10, 15 and 20 rounds, the slider allows 5 to 500. | LOBBY-014 | **Decision required**: enforce the limits or remove the constants | `src/config/game-config.ts:61-62`; `src/app/lobby/page.tsx:305-310`, `:333-346` |

---


| GAP-027 | The new entry card `LLM.md:37-39` demands that before locking the answers neither title nor artist nor cover may lie `im DOM oder im Zustand` (in the DOM or in the state). The code keeps the complete song (including `title`, `artist`, `year`, `coverUrl`) in `currentSong` and renders the YouTube iframe in the DOM. The rule is therefore **not** met in the product code. | CORE-005, MEDIA-015, W-34 | **Requirement** (implementation: display song without metadata) or **decision by the owner** (sharpen the rule to "not visible") | `src/stores/game-store.ts:394-402`; `src/components/game/MusicPlayer.tsx:425-429`; `LLM.md:37-39` |
| GAP-028 | `src/data/songs/packs.json` is outdated as metadata source: For "Global Hits 1950-2026" it states `songCount: 59`, the pack actually contains 1,107 songs. Several entries are moreover empty objects (`{}`), e. g. `electronic-synth`, `80s-pop`, `kids-disney`. | CAT-003, W-15 | **Requirement** (metadata maintenance) or **Later** (remove the source) | `src/data/songs/packs.json`; measured via `src/data/songs/*.json` |
| GAP-029 | The hardened helpers of the admin API (`fetchGuardedBinary`, `assertRateLimit`, `MAX_JSON_BYTES`, credential-free URLs) are not used by the routes yet: `src/admin-api/admin/covers/save/route.ts:37-44` still downloads with `redirect: 'follow'` and its own `downloadCover` function, `src/admin-api/admin/covers/search/route.ts:57` and `:75` call `fetchWithTimeout` without `maxBytes`. Thus the redirect guard and the JSON size cap do not take effect in the operational case. | SEC-006, SEC-007, SEC-015, SEC-016, SEC-017 | **Requirement** — **closed**: both routes use `fetchGuardedBinary` (redirect checked per hop), `assertRateLimit` (429 with `Retry-After`), `MAX_JSON_BYTES` (512 KB) and the credential-free URL check; the remaining hard bounds live in `src/admin-api/_lib/hard-limits.ts` | `src/admin-api/admin/covers/save/route.ts`; `src/admin-api/admin/covers/search/route.ts`; `src/admin-api/_lib/hard-limits.ts` |
| GAP-030 | The admin API is **not reachable**: the two handlers lie in `src/admin-api/` and are therefore not registered by the App Router (which collects only `src/app/`), and `next.config.ts` sets `output: 'export'`, a static export that cannot execute a route handler. Measured: `npm run build` prints a route list of 20 entries, none of them an admin API route; `.next/app-path-routes-manifest.json` has 21 entries and no admin API entry; `find .next/server/app -name route.js` yields only the two icon routes; `grep -rn "admin/covers" out/` returns 0 hits; nothing outside `src/admin-api/` imports the module; `src/app/admin/` contains no `fetch()` call. The hardening of the module therefore protects a surface that no caller can reach. | SEC-001 … SEC-018 | **Owner decision — blocked**: wire it up (needs the server of the hosting decision, QA-09 item 2.6) or remove `src/admin-api/` and its test files. The decision is recorded in [`docs/cr/CR-0002-admin-api-entscheidung.md`](docs/cr/CR-0002-admin-api-entscheidung.md); it falls automatically as soon as the hosting model is decided for a host that executes route handlers, or as soon as the owner confirms that Phomu stays a static export without a server. Until then the state is **blocked**, not open and not done. The single test that states the measured reachability is `src/admin-api/admin-api-reachability.test.ts`; it turns red when the architecture changes. | `src/admin-api/admin-api-reachability.test.ts`; `src/admin-api/admin/covers/{search,save}/route.ts`; `next.config.ts`; `docs/cr/CR-0002-admin-api-entscheidung.md` |

# Project status file (`project/project.yaml`)

`project/project.yaml` is the **machine-readable truth** about the project state. It is maintained in parallel to this document and referenced by the root documents. The file does not yet exist in the repository (`ls project/` → "No such file or directory"); it is to be created by the parallel worker.

**What belongs into it** (without inventing numbers here — the values are taken over from the code and from the gates of this round):

| Section | Content | Source of the values |
|---|---|---|
| `project` | Name, licence (AGPL-3.0-or-later), baseline version, status | `package.json`, `LICENSE`, head of this document |
| `stack` | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Framer Motion, Zustand, i18next, Playwright, Vitest | `package.json` |
| `milestones` | Current milestone, completed milestones, each with evidence | `specifications/project_roadmap.md`, `specifications/current_status_2026-04-08.md` |
| `domains` | The nine requirement domains with their ID ranges and number of requirements | This document |
| `requirements` | List of the requirement IDs with status and preset | This document |
| `module_boundaries` | Module boundaries: `src/config`, `src/types`, `src/stores`, `src/utils`, `src/components`, `src/app`, `src/admin-api`, `src/i18n`, `src/data` | Directory structure |
| `quality_thresholds` | Measurable thresholds: max. file size 550/400 lines, gate list, catalogue baseline | `specifications/quality-baseline.json`, `scripts/local-ci.sh` |
| `open_gaps` | The GAP IDs from this document with status | [Open gaps](#open-gaps) |
| `contradictions` | The W IDs from this document with status | [Contradictions](#contradictions) |

**Rule:** Numbers, thresholds and status statements in `project/project.yaml` are derived from the gates, not estimated. Every value has to be evidenced by a command or a file:line.

---

# Change log of this baseline

| Date | Change | Evidence |
|---|---|---|
| 2026-10-25 | Baseline 0.1 created: 175 requirements derived from the code, 36 contradictions, 29 open gaps (CORE-002a added for AGPL §13) | Commit `d5b6422`; `npm run typecheck` (green), `npm run lint` (0 errors), `npx vitest run` (21 tests), `npm run validate-catalog` (135 packs / 1,615 songs), `node scripts/check-i18n-completeness.mjs --count` (935 literal texts in 47 files) |
