# Phomu Glossary

The terms that have **a meaning of their own** in Phomu — that is, terms that are
neither generally German nor English, but are defined in the code. Every entry names
the definition in one sentence and the file in which the term is implemented.

Whoever looks for numbers does not find them here, but in
[`src/config/game-config.ts`](src/config/game-config.ts). Numbers live in exactly one
place; this glossary only explains *what* the things are.

---

**Admin API** — The internal HTTP interface for catalogue maintenance and cover management.  
*Requirement:* SEC-001 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
It is protected by the header `x-admin-token`, whose value is compared with
`ADMIN_API_TOKEN` from the environment.
*Implementation:* `src/admin-api/_lib/security.ts`, `src/admin-api/admin/covers/search/route.ts`,
`src/admin-api/admin/covers/save/route.ts`

**Anti-Spoiler** — The property of the game flow that before the reveal neither  
*Requirement:* CORE-005, GAME-002, MEDIA-015, UI-006 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
the title, nor the artist, nor the album cover of the sought card is visible or
audible in the interface; every mode therefore hides its solution until the reveal.
*Implementation:* `src/components/game/MusicPlayer.tsx` (prop `blurred`),
`src/components/game/modes/*.tsx` (gating via `isRevealed` / `answered`),
`src/app/projector/page.tsx` (spoiler-free projector view)

**Catalogue** — The totality of all playable song data sets, from which the picker  
*Requirement:* CAT-001, CAT-002, CAT-005 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
chooses; it comprises 1,615 songs in 135 JSON files under `src/data/songs/`.
*Implementation:* `src/data/songs/index.ts` (`ALL_SONGS`),
checked by `src/utils/validate-song-catalog.ts`

**Cover Version** — A song entry that references a foreign recording of the same work;  
*Requirement:* CAT-014, GAME-034 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
it carries the cover link in `links.coverLink` and the relationship in the field
`coverMode`.
*Implementation:* `src/types/song.ts` (`CoverModeMetadata`),
`src/components/game/modes/CoverConfusionMode.tsx`

**Hint Level** — The level of a hint in the Hint Master mode; level 1 is the  
*Requirement:* GAME-023, GAME-026, CAT-011 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
hardest and awards 5 points, level 5 the easiest with 1 point. The number of levels
is the number of hints stored with the song, at most five.
(German UI: `Ebene`, `Mögliche Punkte`.)
*Implementation:* `src/config/game-config.ts` (`HINT_MASTER_POINTS: [5, 4, 3, 2, 1]`),
`src/components/game/modes/HintMasterMode.tsx`, data field `hints` in `src/types/song.ts`

**Locking the Answers** — The moment in which the round is closed for input  
*Requirement:* GAME-001, GAME-002 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
and the solution can be released. In the current code the phase `locked-in` exists
for this; it is handled in the interface, but set by no flow — in fact the locking
happens through the reveal, which the pilot triggers or which the timer
triggers. (German UI: `Antworten gesperrt`.)
*Implementation:* `src/types/game-state.ts` (phase `locked-in`),
`src/app/game/page.tsx` (`advancePhase('reveal')`, `handleTimeUp()`)

**Pack** — A named thematic group of songs, from which the lobby draws;  
*Requirement:* CAT-003, CAT-004, LOBBY-017 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
a song can be in several packs. In the interface 27 packs are selectable.
(German UI: `Pack`, `Song Packs`.)
*Implementation:* `src/config/game-config.ts` (`SONG_PACKS`, `PACK_ALIASES`),
`src/components/lobby/PackSelector.tsx`, data field `packs` in `src/types/song.ts`

**Pilot** — The person who holds the device and runs the game flow;  
*Requirement:* GAME-004, LOBBY-005, GAME-025 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
they decide the answer in the Hint Master mode and trigger the round. In every
round exactly one person is up, in team mode the team.
(German UI: `Pilot`.)
*Implementation:* `src/types/player.ts` (`Player.isPilot`),
`src/stores/game-store.ts` (`turnOrder`, `currentTurnIndex`), `src/app/game/page.tsx`

**Point Cap** — The upper limit of the points that a mode awards per correct answer;  
*Requirement:* GAME-016 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
in the Timeline mode this is `timelineMaxPoints` (default 5), the score grows with
the number of years already given, but it is hard-capped.
(German UI: `Pkt möglich`.)
*Implementation:* `src/config/game-config.ts` (`DEFAULT_TIMELINE_MAX_POINTS`),
`src/components/game/modes/TimelineMode.tsx` (`Math.min(timelineYears.length + 1, config.timelineMaxPoints)`)

**Projector Mode** — The projector view under `/projector`, which shows the mode,  
*Requirement:* UI-006, UI-007, UI-008 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
the round, the phase, the score and the active pilot, but deliberately does not
reveal any title, artist or cover.
(German UI: `Projector`.)
*Implementation:* `src/app/projector/page.tsx`

**QR Card** — The printed game card in the format 59 × 91 mm with 3 mm bleed, which  
*Requirement:* LOBBY-018, LOBBY-019 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
opens the associated song via a QR code; a song carries the marker `isQRCompatible`
when it lies on a physical card.
(German UI: `Phomu-Karte`, `Phomu-Karte scannen`.)
*Implementation:* `src/config/game-config.ts` (`CARD_WIDTH_MM`, `CARD_HEIGHT_MM`,
`CARD_BLEED_MM`, `MAX_CARDS_PER_SET`), `src/components/game/QRScannerModal.tsx`,
`src/utils/qr-intent.ts`, data field `isQRCompatible` in `src/types/song.ts`

**Reveal** — The phase in which the solution of the round becomes visible: the card is  
*Requirement:* GAME-002, MEDIA-017 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
uncovered, the mode-specific resolution appears and the points of the round are
broken down. (German UI: `Auflösung`.)
*Implementation:* `src/components/game/RevealPhase.tsx`, phase `reveal` in
`src/types/game-state.ts`, triggered via `advancePhase('reveal')` in `src/app/game/page.tsx`

**Round** — One turn: one song, one active pilot, one question and one resolution. The  
*Requirement:* GAME-004, GAME-005 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
round counter `currentRound` counts every turn, not one round for all players; with
teams a round runs across all teams.
*Implementation:* `src/types/game-state.ts` (`currentRound`, `GameRound`),
`src/stores/game-store.ts` (`nextRound()`)

**Round phase** — The stage a round is in: `drawing` (drawing a card),  
*Requirement:* GAME-001 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
`question` (the question is running), `locked-in` (all answers have been given, it
waits for the reveal), `reveal` (the solution is shown) and `scoring` (the points are
awarded, the game is over).
(German UI: `Song wird gezogen …`, `Frage läuft`, `Antworten gesperrt`, `Auflösung`, `Punkte werden vergeben`.)
*Implementation:* `src/types/game-state.ts` (`RoundPhase`),
`src/stores/game-store.ts` (`advancePhase()`), `src/app/game/page.tsx`

**Session Code** — The planned short number with which further devices join a  
*Requirement:* LOBBY-020, LOBBY-021 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
multiplayer session; the QR parser already recognises it, but the synchronisation
between the devices is not yet implemented.
*Implementation:* `src/types/session.ts` (`MultiDeviceSession.code`),
`src/utils/qr-intent.ts` (`kind: 'session'`), `src/types/game-state.ts` (`DeviceMode`)

**Shifting Teams** — The team mode `shifting`: at the beginning of every round the  
*Requirement:* LOBBY-006, LOBBY-007 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
players are redistributed onto the existing teams, the teams themselves persist.
(German UI: `Mix-Teams`, `wechselnde Konstellationen`.)
*Implementation:* `src/stores/game-store.ts` (`nextRound()`, block `With shifting teams`),
`src/app/lobby/page.tsx` (option `Mix-Teams`)

**Swap** — The change of a player from one team to another; it takes place in the  
*Requirement:* LOBBY-010 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
lobby and changes the assignment, not the points.
*Implementation:* `src/stores/game-store.ts` (`assignPlayerToTeam()`),
`src/app/lobby/page.tsx` (team assignment in step 6)

**Team Mode** — The way the points are distributed: `individual` (everyone for  
*Requirement:* LOBBY-006, GAME-007, GAME-010 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
himself), `fixed` (fixed teams for the whole game) or `shifting` (the teams are
remixed every round).
(German UI: `Team-Modus`, `Teams`, `Einzeln`.)
*Implementation:* `src/config/game-config.ts` (`TeamMode`), `src/types/player.ts`,
`src/app/lobby/page.tsx` (step 6), `src/stores/game-store.ts` (`nextRound()`)

**Time Decay** — The optional point deduction for slower answers: after a  
*Requirement:* GAME-038, GAME-039 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
grace period one point is deducted per step, at least one point remains for a
correct answer. (German UI: `Zeitabzug`.)
*Implementation:* `src/config/game-config.ts` (`DEFAULT_TIME_DECAY_*`,
`DEFAULT_MIN_POINTS_PER_CORRECT`), applied in `src/app/game/page.tsx` (`handleAnswered()`)

**Vibe** — The mood specification of a song, stored as a list of mood names in  
*Requirement:* GAME-030, GAME-031 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
`mood`; in the Vibe Check mode at least one of them must be selected for the
answer to count as correct.
(German UI: `Vibe-Check`, `Stimmung`.)
*Implementation:* `src/types/song.ts` (field `mood`),
`src/components/game/modes/VibeCheckMode.tsx`, mood list `ALL_MOODS`

**Win Condition** — The rule set in the lobby that determines when the game ends:  
*Requirement:* GAME-008, GAME-009, LOBBY-013 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
`points` (a player or a team reaches the target score), `rounds` (a fixed number
of rounds per participant) or `time` (the playing time runs out).
*Implementation:* `src/types/game-state.ts` (`GameEndingCondition`, `GameConfig.targetPoints`,
`targetRounds`, `targetTimeMinutes`), checked in `src/stores/game-store.ts` (`nextRound()`)

---

## Not in this glossary

Terms that have no project meaning of their own are deliberately not listed here:
*Server*, *Component*, *State*, *Route*, *Bundle*, *Commit*. They are covered in
[`ARCHITECTURE.md`](ARCHITECTURE.md) and in
[`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md).
