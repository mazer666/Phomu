# ADR-0002 — Zustand: Store vs. Server vs. URL

**Status:** Accepted
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** LOBBY-001 (session), GAME-002 (points), NFR-002 (persistence)

---

## Context

Phomu is a hybrid: physical QR cards and a web app. This creates a basic
tension that shows up in three questions.

**Question 1 — Where does the game state live?** A party session comprises
players, teams, config, round, phase, points, answers and XP. Today it lives in
`src/stores/game-store.ts` (Zustand, 640 lines) with `persist` middleware and
the localStorage key `'phomu-game-state'` (`src/stores/game-store.ts:619`).

**Question 2 — Where does the state live *outside* the browser?** The projector
tab (`/projector`) should show the same score as the phone. Today this is
realised through a **polling trick**: the projector reads the same localStorage
entry, but only because both tabs run on the same device
(`src/app/projector/page.tsx:41-44` polls every 2 s, because localStorage
events do fire within one origin, but the states converge asynchronously). A
second device on the same Wi-Fi gets **nothing**.
`src/types/game-state.ts:5-7` names as a plan "in multi-device mode it syncs via
Supabase Realtime", and `DeviceMode` in `src/types/game-state.ts:23-26` knows
`'multi-device'` with "Each player uses their own device (via session code)".
The plan exists, the code does not.

**Question 3 — What belongs in the URL?** `src/utils/qr-intent.ts` parses a
QR deep link URL with the parameters `session`, `pack` and `id`
(`src/utils/qr-intent.ts:28-38`) — the QR code therefore carries a **URL**, and
the URL carries the **game context**. In parallel
`src/components/game/QRScannerModal.tsx` uses the camera scanner. The session
code is therefore already an addressing concept, but not yet URL state.

In addition there are **two more** localStorage truths next to the store:
`'phomu-admin-songs'` (`src/app/admin/songs/page.tsx:33` **and**
`src/app/browse/page.tsx:14` — the same key in two places) and
`'phomu-review-edits'` (`src/app/admin/review/page.tsx:28`). Both lie
**outside** the store and are therefore a second, uncontrolled state path.

And one more observation about the persistence scope: `partialize`
(`src/stores/game-store.ts:621-637`) stores `players`, `teams`, `config`,
`sessionId`, `totalXP`, `preferredPlayer`, `preferredMusicProvider`,
`musicEnabled`, `musicVolume`, `sfxEnabled`, `sfxVolume`, `currentRound`,
`isGameOver`, `timelineYears`, `gameStartTime`. **Not** stored are
`currentSong`, `currentAnswers`, `roundPhase`, `roundHistory`, `currentMode`,
`playedSongIds`, `winnerId`. A reload in the middle of a round therefore resets
the session to `drawing` without a song.

---

## Decision

### 1. The store is the only truth of the game state

`src/stores/game-store.ts` is the **only** place where game state is written.
Components read via `useGameStore()`, but write only via the actions of the
store (`drawSong`, `submitAnswer`, `awardPoints`, `advancePhase`, `nextRound`,
`endGame`, …). No component builds state itself.

**Consequence:** The admin area is also brought under this rule. The two
localStorage truths (`'phomu-admin-songs'`, `'phomu-review-edits'`) are either
moved into **their own, named stores** (`useAdminSongStore`, `useReviewStore`)
or documented as a deliberate exception — with **one** place for the key, not
two.

### 2. Persistence: separate slices with a documented purpose

`persist.partialize` is split into three named groups:

| Group | Content | Persisted | Rationale |
|---|---|---|---|
| `session` | `sessionId`, `players`, `teams`, `config`, `currentRound`, `isGameOver` | yes | A reload must not lose the lobby configuration (`src/stores/game-store.ts:5-7`) |
| `progression` | `totalXP`, `preferredPlayer`, `preferredMusicProvider` | yes | Progress data across devices |
| `preferences` | `musicEnabled`, `musicVolume`, `sfxEnabled`, `sfxVolume` | yes | Device settings |
| `round` | `currentSong`, `currentAnswers`, `roundPhase`, `currentMode`, `playedSongIds`, `roundHistory` | **no** | A persisted song + a persisted reveal state is a spoiler vector (see ADR-0003) |

This separation is **not** a new decision, but an explicit fixation of the
behaviour that already exists today.

### 3. Server: none today — and that is a decision, not an oversight

Phomu is built with `output: 'export'` (`next.config.ts:4`). There is **no**
server route: `find src/app -name "route.ts"` yields **0** hits. The game flow
runs 100 % in the client.

**Decision:** The game state stays client-side. A server does **not** come in
this round. Caveat: A server is **mandatory** as soon as one of the following
holds:

1. `DeviceMode 'multi-device'` is shipped (i.e. a real session code across
   device boundaries).
2. Scores are to be synchronised between devices.
3. The admin API actually becomes reachable (today it has 0 consumers and no
   route, see ADR-0001 §3.3 A4).

Until then `sessionId` is documented in `src/types/game-state.ts:143` as "used for
multi-device sync", but **not** filled with multi-device semantics.

### 4. URL: only the **entry context**, never the game state

The URL may carry what is decided **before** the session:

| In the URL | Purpose | today |
|---|---|---|
| `?session=<code>` | Session code (QR deep link) | `src/utils/qr-intent.ts:28` |
| `?pack=<id>` | Pack pre-selection | `src/utils/qr-intent.ts:33` |
| `?id=<songId>` | Direct start of a song (Quick Play) | `src/utils/qr-intent.ts:38` |

The URL may **not** carry: points, phase, answers, player lists. Reason:
The URL is shareable, ends up in the history and in logs. A score in the URL is
a cheat vector and breaks the anti-spoiler promise (ADR-0003).

**Decision:** When a page is entered with these parameters, the parameter is
transferred into the store **once** (`setConfig` respectively `startQuickGame`)
and afterwards **removed from the URL** (history replace), so that a reload does
not apply it again.

### 5. Session and admin state each get **one** storage key

Every persisted state has exactly one key, defined in exactly one place. For
the keys that exist today this means: `'phomu-admin-songs'` is defined in one
place and imported by both users (`/browse` and `/admin/songs`).

---

## Consequences

### Positive

- There is exactly one answer to "where is the game state?":
  `useGameStore`. No context, no `localStorage`, no URL parameter.
- The anti-spoiler promise is backed up at the persistence level: `currentSong`
  and `currentAnswers` are **not** persisted, a reload starts the round anew
  instead of giving away the solution.
- Local operation stays completely offline and without a backend — matching
  `output: 'export'` and the party scenario (dead spot in the garden).
- The multi-device question is not answered with a half implementation, but
  cleanly recorded as a decision record: it is **server + realtime**, and the
  server comes with its own ADR.

### Negative / Trade-offs

- **No cross-device sync.** Two devices in the same room are two independent
  sessions. The `/projector` mode only works with projector and phone **on the
  same device** (or the same origin with shared localStorage). This is a
  deliberate limitation that has to be communicated visibly in the product.
- **Data loss on reload during a round.** The points of the running round and
  the progress of the round history are lost; `currentRound` is retained. For a
  party game on Wi-Fi this is acceptable, for a tournament scenario it is not.
- **The admin truths move.** Two localStorage states have to be moved into
  stores — effort without benefit for the game, but necessary for the
  uniqueness of the state holders.
- **The URL cleanup** needs a router call (`router.replace`) and has to be
  weighed against the hydration race condition of Next.js 16.

### What the decision makes impossible

- The game state cannot be replicated without a server.
- A score cannot stand in a URL.
- A running song cannot survive a reload.
- `DeviceMode 'multi-device'` is not implementable before the server ADR.

---

## Rejected alternatives

- **Everything in localStorage without a store.** *Rejected:* The store already
  exists, offers `partialize`, typed actions and a single write location.
  Distributing localStorage fields across components violates the store rule
  and creates the current double write of `'phomu-admin-songs'`.
- **Everything in the URL (shareable state).** *Rejected:* Points and phase in
  the URL are a spoiler and cheat vector; the URL ends up in the history and in
  shared links, and it is too long for scores.
- **Session state on the server right now (Supabase Realtime).** *Rejected for
  this round:* `output: 'export'` excludes server routes, a realtime channel
  would need keys and operation, and the game session is prone to network
  errors — at a party on Wi-Fi a local state is more robust. The plan in
  `src/types/game-state.ts:5-7` remains as a follow-up step.
- **Persisting `currentSong` and `currentAnswers`.** *Rejected:* A persisted
  reveal state makes the anti-spoiler boundary depend on the discipline of the
  users (see ADR-0003).
- **State per screen (page-local state).** *Rejected:* `players`, `teams` and
  `config` are needed in `src/app/lobby/page.tsx:61-65`, in
  `src/app/game/page.tsx:47-71` and in `src/app/projector/page.tsx:26-34` —
  three pages need the same state.

---

## Verification

| Check | Command / Location |
|---|---|
| The store is the only write location | `grep -rn "useGameStore(" src/components src/app` → only read accesses and action calls, no `setState` bypass |
| Persistence scope | `src/stores/game-store.ts:621-637` — `partialize` contains **no** `currentSong`, `currentAnswers`, `roundPhase` |
| No state in the URL | `grep -rn "useSearchParams\|searchParams" src/app` → no points/phase parameters |
| Storage keys unique | `grep -rn "localStorage.getItem\|localStorage.setItem" src` → exactly one definition place per key |
| Store layer rule | ADR-0001 §2.2 — `components → stores` is allowed, `data → stores` is not |
