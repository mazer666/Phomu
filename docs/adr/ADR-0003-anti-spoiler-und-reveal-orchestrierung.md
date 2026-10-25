# ADR-0003 — Anti-Spoiler and Reveal Orchestration

**Status:** Accepted
**Date:** 2026-10-25
**Owner role:** Chief Architect
**Related requirement IDs:** MEDIA-001 (anti-spoiler), GAME-003 (reveal), GAME-004 (points), UI-002 (projector)

---

## Context

Anti-spoiler is not a comfort feature in Phomu, it is the product promise:
In a round music plays, the pilot has to guess the song, and **nobody** else
may see the solution. This affects four places at the same time:

1. **The music player.** `src/components/game/MusicPlayer.tsx` knows the prop
   `blurred` (`:28`). With `blurred=true` the wrapper renders with
   `blur-[60px] scale-125` (`:424`) and on top of it lies an overlay with the
   text `"Musik läuft"` ("music is playing") and the hint `"Swipe zum Aufdecken"`
   ("swipe to reveal") (`:462`), which is resolved by a drag gesture
   (`:466-476`). The metadata (`song.title`, `song.artist`) is however **in the
   client memory and in the React tree**.
2. **The question mode.** `src/components/game/QuestionPhase.tsx` itself renders
   in question mode **no** title and **no** artist — the reveal texts of the
   round reveal exist exclusively in
   `src/components/game/RevealPhase.tsx` (`:240`, `:248`, `:297`, `:434`).
   The mode widgets follow suit for five of six modes as well; the measured
   exception is `vibe-check` (see decision 3).
3. **The hints.** `src/utils/censor-utils.ts:11` (`censorHint`) replaces title
   and artist tokens in hints with `[XXX]`. The thresholds are in
   `src/config/spoiler-config.ts` (`MIN_LENGTH: 4`, `EXCEPTIONS`, `IGNORE_WORDS`).
   Called in `src/components/game/modes/HintMasterMode.tsx:156`.
4. **The projector.** `src/app/projector/page.tsx:1-9` states:
   `"Kein Artist, kein Titel, kein Album-Art — nichts das die Frage verrät."`
   ("No artist, no title, no album art — nothing that gives away the question.")

The reveal orchestration runs through `RoundPhase`
(`src/types/game-state.ts:28-33`): `'drawing' | 'question' | 'locked-in' |
'reveal' | 'scoring'`. `src/app/game/page.tsx:404-462` keeps `QuestionPhase`
**mounted** during the reveal (`display: none`), so that the YouTube iframe does
not restart — a deliberate intervention into the render tree, documented in the
comment (`:404-407`).

### The measured breach

The phase is set exclusively via `advancePhase(phase)`
(`src/stores/game-store.ts:439-441`):

```ts
advancePhase(phase) {
  set({ roundPhase: phase });
},
```

The transition is **unchecked**: every component can switch to every phase.
There is **no** `answersLocked` flag in the code (`grep -rn "answersLocked" src` →
0 hits), and the phase `'locked-in'` is set **nowhere** — it exists only in the
type (`src/types/game-state.ts:31`) and in the type list of the audio hook
(`src/hooks/useGameAudioCues.ts:9`).

The reveal therefore hangs on the click of the pilot (the button
`"Alle fertig → Reveal"`, "everyone ready → reveal", at
`src/components/game/QuestionPhase.tsx:86-101`) resp. the timer emergency
(`handleTimeUp`, `src/app/game/page.tsx:232-236`), **not** on the fact that all
answers have been submitted. In addition
`src/components/game/modes/SurvivorMode.tsx:195` shows the text
`"Wartet auf das Reveal …"` ("waiting for the reveal …"), even though the phase
itself never switches to `'locked-in'`.

---

## Decision

### 1. Anti-spoiler is a **phase property**, not a feature switch

The store knows the order of the phases. A reveal is only permitted if the
round has previously passed through the state "all answers are submitted". For
this the existing but unused type `'locked-in'` is activated:

```text
drawing ──drawSong()──▶ question ──submitAnswer() (for each pilot)──▶ locked-in
                            │                                                    │
                            │◀──────────── advancePhase('reveal') ──────────────┘
                            ▼
                          reveal ──nextRound()──▶ drawing (next round)
```

### 2. `advancePhase` becomes a **stateful** transition

`advancePhase` checks the target phase against the allowed transition set. A
transition that is not allowed is **rejected** (no-op) and not silently
executed. The check lies **in the store**, so that it cannot be bypassed by a
component.

The concrete rule:

| From | To | Condition |
|---|---|---|
| `drawing` | `question` | `currentSong !== null` |
| `question` | `locked-in` | For every pilot in `turnOrder` an answer exists in `currentAnswers` |
| `locked-in` | `reveal` | always (the pilot triggers it) |
| `reveal` | `drawing` | always, via `nextRound()` |
| any | `scoring` | only via `endGame()` |

A **timer emergency** (`handleTimeUp`, `src/app/game/page.tsx:232-236`) may
still switch directly to `reveal` — the timer is an exit, not an error case. It
deliberately bypasses the answer duty.

### 3. The metadata visibility is a **prop convention**

The anti-spoiler boundary of the presentation is defined in one place and
complied with by all mode widgets:

- `MusicPlayer` gets `blurred` as a **mandatory prop** in question mode. The
  previous form `blurred = false` as default
  (`src/components/game/MusicPlayer.tsx:135`) becomes `blurred: boolean`
  (without default) — the compiler then forces every caller to make the
  decision.
- The release of the video remains **local** in the `MusicPlayer`
  (`videoRevealed`, `src/components/game/MusicPlayer.tsx:141`) and is not
  coupled to the phase: the pilot may reveal at any time, but the **text**
  (title, artist) appears only in the reveal phase.

**Measured current state of the blur behaviour per mode**
(`grep -n "blurred" src/components/game/modes/*.tsx`):

| Mode | `blurred` prop | Shows title/artist in question mode? | Location |
|---|---|---|---|
| `survivor` | `!answered && !cheatUsed` | no — placeholder `???` | `SurvivorMode.tsx:69`, `:100-103` |
| `timeline` | `!isRevealed` | no — only after the slot resolution | `TimelineMode.tsx:281`, `:516-519` |
| `lyrics` | `!isRevealing` | no — only in the reveal block | `LyricsMode.tsx:121`, `:132-133` |
| `cover-confusion` | `phase !== 'done'` | no — only in `self-assess` | `CoverConfusionMode.tsx:114`, `:205-207` |
| `hint-master` | `!isRevealed` | no — only after `"LÖSUNG ZEIGEN"` ("show solution") | `HintMasterMode.tsx:133`, `:202-203` |
| `vibe-check` | **`false`** (always unblurred) | **yes — `song.artist` and `song.title` are permanently on the question screen** | `VibeCheckMode.tsx:99`, `:116-118` |

> **Measured exception:** `vibe-check` hides neither the video nor the
> metadata. That is defensible in terms of substance in the mode (the answer
> being looked for is the mood, not the song), but it means: **in a vibe-check
> round the song title is visible to everyone.** The rule is therefore:
> the metadata visibility is **one decision per mode**, not a property of the
> phase — and from now on it is explicitly documented instead of implicitly
> assumed.

### 4. Hint censorship remains a pure function

`censorHint` (`src/utils/censor-utils.ts:11`) remains a pure function without
React and without store access. The thresholds come **exclusively** from
`src/config/spoiler-config.ts`. The currently hardcoded `4` in
`src/utils/validate-song-data.ts:195-196`,
`src/app/admin/songs/page.tsx:84-85` and `src/utils/censor-utils.ts:50` are
replaced by `SPOILER_CONFIG.MIN_LENGTH` (ADR-0001 §5).

### 5. The projector remains its own spoiler-free projection

`/projector` renders mode, score, active pilot and timer — **no** title, **no**
artist, **no** cover. That is not a convention but the purpose of the page; it
reads from the same store and deliberately shows a subset of the fields.

---

## Consequences

### Positive

- The reveal is decoupled from the click of the pilot: "all answers are
  submitted" becomes a **state of the store** and thus checkable and testable.
- The phase `'locked-in'` goes from a type to a lived concept — no more dead
  enum value.
- A failed or forgotten call of `advancePhase('reveal')` can no longer silently
  release the solution.
- The anti-spoiler rules are documented in **three** places (store transition,
  `MusicPlayer` prop, projector page) and are therefore visible in the review.

### Negative / Trade-offs

- **More state in the store.** `locked-in` has to be set by `submitAnswer`, not
  only by `advancePhase`. The store grows by one condition.
- **One timer case remains.** `handleTimeUp` skips the answer duty. That is
  intended, but it means: the reveal is **not** coupled to "all answers are
  submitted" in every case. The rule is "answer duty, unless the timer runs
  out".
- **Mandatory prop `blurred`** forces changes at all callers of the
  `MusicPlayer` (6 mode widgets + `LyricsMode` bonus round).
- **One test is missing today.** There is no test that proves that the reveal
  happens only after the answer duty.
  `src/components/game/QuestionPhase.test.tsx` does **not** exist (the
  repository only contains `src/utils/*.test.ts` and
  `src/components/game/MusicPlayer.test.ts`).

### What the decision makes impossible

- A component can no longer force the solution via `advancePhase('reveal')`
  without bypassing the answer duty.
- `'locked-in'` can no longer be removed without giving up the answer duty.
- The `MusicPlayer` can no longer be called without a decision about the blur
  state.

---

## Rejected alternatives

- **Release of the reveal solely via the click of the pilot (status quo).**
  *Rejected:* The pilot is a player and therefore no reliable guardian. An
  accidental click on `"Alle fertig → Reveal"` ("everyone ready → reveal")
  gives away the solution before the round has been played.
- **Server-side secrecy (never send the song title to the client).**
  *Rejected:* `output: 'export'` (`next.config.ts:4`) allows no server routes,
  and the QR cards need the song record in the client anyway in order to play
  the video. A server-side solution would be a server project — that comes with
  ADR-0002 (server), not here.
- **Encrypt the metadata in the client.** *Rejected:* The key would lie in the
  client. That would be security theatre without cryptographic benefit.
- **A global `spoilerFree` switch in the config.** *Rejected:* The state is
  **phase-dependent**, not global. A switch would not map the phase logic and
  would branch the paths.
- **Move the anti-spoiler check into the components.** *Rejected:* Every
  component would be individually checkable and individually bypassable — the
  rule would no longer be enforceable in one place.

---

## Verification

| Check | Command / Location |
|---|---|
| Transition check in the store | `src/stores/game-store.ts` — `advancePhase` must check the allowed set |
| `'locked-in'` is set | `grep -rn "locked-in" src` → at least one set location in the store |
| No `answersLocked` as a second truth | `grep -rn "answersLocked" src` → 0 hits |
| No metadata leak in question mode | `grep -n "song.title\|song.artist" src/components/game/modes/*.tsx` — per mode only in its reveal path; `vibe-check` is the documented exception (§ Decision 3) |
| Censorship threshold from the config | `grep -rn "length >= 4\|length < 4" src` → 0 hits except `src/config/spoiler-config.ts` |
| Projector stays spoiler-free | `grep -n "song.title\|song.artist\|coverUrl" src/app/projector/page.tsx` → 0 hits |
| Negative test | New test `src/stores/game-store.test.ts`: `advancePhase('reveal')` from `question` without answers remains a no-op |
