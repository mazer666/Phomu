# QA-02 — Spoiler-Freeness & Game Integrity

**Severity of the findings in this report:** P0, P1, P1, P1, P2
**Area:** The named product promise of Phomu — the player must not learn the answer before the reveal.

> "Spoiler-freeness" is not a nice-to-have for a music quiz. It is the product. A music quiz that leaks the answer has no reason to exist, and the leak channels below are exactly the ones that turn a party game into a broken party game.

---

## 1. How spoiler-freeness is modelled in Phomu

The design intent is good and clearly articulated. Phomu protects the answer at five distinct layers:

| Layer | Mechanism | Where |
|---|---|---|
| Round phases | `drawing → question → locked-in → reveal → scoring`; the solution is released only after locking in the answers | `src/types/game-state.ts:29-32`, `GAME-002` |
| **Projector** | Big-screen surface deliberately shows no artist, title or album art | `src/app/projector/page.tsx:6` |
| **Censored hints** | `censorHint(hint, artist, title)` replaces artist/title tokens in every hint with `[XXX]` — a safety net; measured leak rate 3 of 7,785 hints | `src/utils/censor-utils.ts` |
| **Blurred media** | Cover/video is blurred behind a backdrop-blur overlay until the reveal | `src/components/game/MusicPlayer.tsx:548-559` |
| **Reveal gate** | `blurred` flag plus a `videoRevealed` state; some modes show an explicit reveal control | `MusicPlayer.tsx:676` |

Two of these work well and I want to credit them explicitly:

- **The projector page is genuinely clean.** I grepped the built artifact: `out/projector.html` contains **0** occurrences of `"artist"` and 0 song titles. The surface every player stares at does not give the answer away. This is the hardest part to get right, and Phomu got it right.
- **The censoring logic is non-trivial and thoughtful.** `censor-utils.ts` splits artist/title into tokens, filters stopwords, applies a minimum-length rule with an explicit exception catalogue for short artist names (`BTS`, `U2`, `2Pac`, `Die Ärzte`, …), sorts by length so multi-word phrases are replaced before their fragments, and enforces word boundaries only for short tokens. Measured against the real catalogue, it has almost nothing to do: only **3 of 7,785 hints** contain the artist or a distinctive title token. That is a compliment to the catalogue authors, not to the censorer — and it means the censoring is a safety net rather than the main defence (see QA-SPO-001).

**The problem is that all five layers protect a door which the client bundle walks straight through.**

---

## 2. QA-SPO-001 — P0 — The complete answer database is shipped to the browser

### What I measured

The production build emits a single JavaScript chunk containing the whole catalogue:

```
$ ls -l out/_next/static/chunks/1tpan17-zjsj-.js
2845675 bytes   # 2.8 MB

$ head -c 400 out/_next/static/chunks/1tpan17-zjsj-.js
(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([...82388,(e,i,t)=>{i.exports=JSON.parse('{"songs":[
{"id":"hiphop-tribe-ickit","title":"Can I Kick It?","artist":"A Tribe Called Quest",
"year":1990,"country":"US","genre":"Jazz Rap","difficulty":"easy",
"mood":["Cool","Groovy","Intelligent"],
"hints":["Aufgenommen 1989, als die drei Bandmitglieder erst 18 oder 19 Jahre alt waren.",
"Der Beat sampelt u.a. 'Walk on the Wild Side' von Lou Reed, ...","...
```

Decoding all 120 `JSON.parse('…')` payloads in that chunk and parsing them as JSON (rather than counting string occurrences) gives the exact figures:

| Measurement | Value |
|---|---|
| `JSON.parse` payloads in the chunk | 120 (one per pack) |
| Chunks in the whole build carrying catalogue payloads | **1** — this is the only one |
| Song entries in the bundle | **1,557** (1,557 unique ids) |
| Of the catalogue's 1,615 songs, the bundle ships | **1,557 (96.4 %)** |
| Entries carrying a `hints` array | **1,557** |
| Entries carrying a `lyrics` object | **1,497** (60 have empty lyrics) |
| Real lyric lines shipped | **4,491** (3 per song) |
| Fake lyric lines shipped | **1,497** (1 per song) |
| **Total lyric lines shipped** | **5,988** |

So the chunk carries, for 1,557 songs: title, artist, year, country, genre, difficulty, mood and hints — and for 1,497 of them, the lyric lines that Lyrics Labyrinth is built around.

**Correction to an earlier draft of this report.** The first pass claimed that the bundle's raw *hints* were the primary leak, on the grounds that the uncensored German text was "one DevTools search away". Measuring the actual hint corpus shows that claim was **wrong**: of 7,785 hints across the bundle, only **3** contain the artist name or a distinctive title token (measured with an independent re-implementation of the censoring rule). The catalogue's hints are already written so as not to name the song. The censoring layer is therefore defending a nearly empty threat — and the **real** leak is the lyrics payload plus the title/artist pairs. The P0 stands; the reasoning has moved.

### Which pages load it

| Page | References the 2.8 MB chunk |
|---|---|
| `/game` | **1 — yes** |
| `/browse` | **1 — yes** |
| `/` | 0 |
| `/lobby` | 0 |
| `/projector` | 0 |
| `/game-over` | 0 |

`/game` is the page that runs the quiz. The entire answer key — title, artist, and the lyric lines that `LyricsMode` is built around — is downloaded **before the first question is asked**.

### Why this defeats every other layer

**Leak 1 — the answer key itself.** For 1,557 songs the bundle contains the title and the artist. That *is* the answer to a music quiz, independent of any masking. It is also what the `/browse` page shows on purpose — the catalogue browser and the answer key are the same data.

**Leak 2 — the lyrics payload defeats Lyrics Labyrinth outright.** This is the sharpest consequence, and it is new in this revision of the report. `LyricsMode` works like this (`src/components/game/modes/LyricsMode.tsx`):

```tsx
const items = [
  { text: lyrics.real[0], isFake: false },
  { text: lyrics.real[1], isFake: false },
  { text: lyrics.real[2], isFake: false },
  { text: selectedFake,      isFake: true  },
];
return shuffle(items);
```

The player must pick the **fake** line out of four options. The bundle ships, per song, `lyrics.real` (3 lines) and `lyrics.fake` (1 line, as a string) — so a player with the bundle can simply read which of the four on-screen options is the `fake` one and answer correctly every time, without listening to a note. **The mode is not weakened; it is fully solved offline.**

That is compounded by identifiability: for **590 of the 1,497 songs (39.4 %)** the shipped real lyrics contain a token of their own title, so the lyrics alone name the song. Example from the bundle:

```
song  : A Tribe Called Quest - Can I Kick It?
  lyrics.real: ["Can I kick it? (Yes, you can!)",
                 "Well, I'm gone (go on then!)",
                 "Rock and roll to the beat of the funk fuzz"]
  lyrics.fake: "Pull the record on and let the whole room unwind"
```

**Leak 3 — it scales the cheating surface from one player to all of them.** In a party game the host device is the only device that runs the game — but that is exactly the scenario where one guest can glance at the host's screen, or where the host device is a shared tablet. "Only the host has the bundle" is not a spoiler control; it is a precondition.

**Leak 4 — it breaks the product's own promise.** `GAME-002` states the reveal releases the solution only after locking in the answers. The solution was released the moment the page loaded.

### The fix already exists in this repository

The recommendation above is unusually short because the codebase already contains the answer (see Option A). The following is the concrete evidence, read from `core/phomu-core`:

```rust
// core/phomu-core/tests/anti_spoiler.rs
#[test]
fn the_question_payload_never_contains_the_title_or_the_year() {
    for mode in GameMode::ALL {
        if mode.reveals_identity() { continue; }   // the mode declares it
        let payload = question_payload(*mode);
        assert!(!payload.contains("Der Geheime Titel"), "the mode {mode:?} leaks the title");
        assert!(!payload.contains("1985"),             "the mode {mode:?} leaks the year");
    }
}

#[test]
fn the_question_payload_hides_the_artist_in_every_mode_but_the_declared_ones() {
    // ... asserts the artist is absent unless the mode declares otherwise
}
```

Note the shape of that contract: it is **not** "the UI hides the answer" — it is *"the question view model has no field that could carry the answer"*. That is the right level of abstraction, and the TypeScript shell currently has no equivalent: `MusicPlayer` receives `songTitle` and `songArtist` as props and the blur is a CSS class.

**The gap is therefore a wiring gap, not a design gap.** The most valuable single recommendation in this report is: *make the web shell consume the Rust core's question view model, and delete `songTitle` / `songArtist` from the question phase entirely.*

### What the censoring layer is actually worth

Because the hint corpus is already written spoiler-free (3 of 7,785 hints leak), `censorHint` is **belt-and-braces, not the load-bearing defence**. That does not make it worthless — it is a safety net for hints added later — but it changes the priority order of the remediation:

| Priority | What to fix | Why |
|---|---|---|
| 1 | Take the catalogue off the client (QA-SPO-001) | It is the whole answer key |
| 2 | Stop shipping the lyric payload (QA-SPO-007) | It solves one game mode outright |
| 3 | Test the censoring (QA-SPO-003) | It is a safety net with 0 % coverage — cheap to close, low blast radius today |

### Concrete recommendation

**Do not ship the answer key to the client.** Three approaches, in ascending order of effort. Any one of them closes the P0.

**Option A — Let the Rust core own the question, and the shell only render it (recommended).**

> **This option changed during the audit, and it got much better.** The Rust base that landed mid-assessment (`be984cdc5`, good tip `11371eb94`) **already implements the anti-spoiler contract the web shell lacks.** This is the single most important finding in this report, because it means the fix is not a new API to be designed — it is an existing, tested component that the web shell has not adopted yet.

What already exists in `core/phomu-core`:

- **`core/phomu-core/tests/anti_spoiler.rs`** asserts, for **every** `GameMode::ALL`, that the question payload contains neither the title nor the year, and that the artist is hidden except in the modes that declare they disclose it (`mode.reveals_identity()`, plus `CoverConfusion`). It also asserts that the question view model *has no field for the solution*.
- **`core/phomu-core/src/facade.rs`** exposes `RoundView`, `Prompt`, `FieldId` and `PERSISTABLE_FIELDS` — the latter defines **which fields a shell may persist**, so the solution cannot leak into `localStorage` either.
- **`core/phomu-catalog`** now owns the catalogue model (`model.rs`, `selection.rs`, `song_limits.rs`, `limits.rs`, `validation/`, `text.rs`).
- **`platform/phomu-wasm`** publishes `#[wasm_bindgen]` exports (`catalogue.rs`, `session.rs`, `config.rs`), and **`platform/phomu-ffi`** publishes a `view.rs` / `session.rs` surface for native shells.

The web shell, by contrast, still imports the whole catalogue (`src/data/songs/index.ts` + 136 JSON files) and still ships it to the browser.

The target architecture therefore becomes:

```
Rust core (phomu-catalog + phomu-core)
   │  draws the song, builds the question view model,
   │  guarantees no title / artist / year / lyrics field
   ▼
platform/phomu-wasm  ──►  web shell (Next.js) renders the view model
platform/phomu-ffi   ──►  Android / iOS / desktop shells
```

The web shell then receives a **question view model without a solution field** and never holds the catalogue. That is a stronger guarantee than any API design in this report could promise, because it is *structural*: the field that would carry the answer does not exist in the type.

**What still needs deciding for the web shell:**

| Question | Note |
|---|---|
| How does the shell get the songs? | `platform/phomu-wasm/src/catalogue.rs` already exists; the catalogue must still reach the browser **somehow** — as a data file rather than as bundled logic. The *answers* must not, but the catalogue data has to be reachable for the core to draw from it. |
| How are lyrics handled? | The core's `text.rs` / the mode contract must decide whether lyrics are part of the question view. If the lyrics are sent to the shell, the Lyrics Labyrinth needs the server-side option selection described in QA-SPO-007. |
| Does `output: 'export'` survive? | Yes for the static shell — the WASM module is a static asset. This is **cheaper** than the API migration in the first draft of this report. |

**Option A′ — If the WASM path is not chosen, fall back to a thin API** that mirrors the same contract:

```
GET /api/round?mode=hint-master&round=7
→ { "songId": "...", "hints": ["...", "..."], "coverId": "c_0192" }   // no title, no lyrics
```

The server applies the same rules the Rust core already encodes. This is the fallback, not the first choice.

**Option B — Fetch the catalogue lazily and only for the current session.**

Split the catalogue into per-pack files and load only the selected pack, then delete the raw data from memory after the round is resolved. This narrows the leak to one pack (≈12–40 songs) but does **not** close it — the pack still contains the answers for the songs in play. **Use this only as a mitigation, never as the fix.**

**Option C — Encrypt the client bundle.**

Encrypt the catalogue with a key that is fetched per round and never persisted. This raises the bar for casual inspection but a determined player still recovers the key from the network tab. **Not recommended** — it adds complexity without closing the hole.

Whatever option you choose, the following must become true and must be **asserted by an automated test**:

- The built client bundle must not contain song titles, artists, hint strings or lyric lines.
- A test that greps the production export for a known song title must fail if the catalogue leaks.

```ts
// Proposed acceptance test — the gate that must exist
it('does not ship the answer key to the client', async () => {
  const chunk = await readCatalogueChunk();
  expect(chunk).not.toContain('Can I Kick It?');           // a real title from the catalogue
  expect(chunk).not.toContain('A Tribe Called Quest');     // a real artist
  expect(chunk).not.toMatch(/"lyrics":/);                  // the lyric payload
  expect(chunk).not.toMatch(/"hints":/);                   // the hint corpus
});
```

**Accept when**

- `grep -c '"lyrics":' out/_next/static/chunks/*.js` returns 0.
- The number of song entries in any client chunk is 0.
- The proposed acceptance test above is in CI and passes.
- `/game` no longer references any chunk containing catalogue data.

---

## QA-SPO-002 — P1 — Cover filenames leak every title and artist in the URL

### What I measured

`out/covers/` contains **1,649** files, and the filenames are the answers:

```
$ ls out/covers | head -4
-hd--jose-jose-el-triste--en-vivo-.jpg
2000s-alicia-keys-fallin.jpg
2000s-bep-feeling.jpg
2000s-britney-toxic.jpg

$ ls out/covers | grep -i rockafeller
fatboy-slim-the-rockafeller-skank-single.jpg
```

The naming convention is `<era>-<artist>-<title>.jpg`. Every answer in the catalogue is therefore present as a filename in the deployed artifact.

### Leak channels

| Channel | Impact |
|---|---|
| **Directory listing** | If the host exposes directory indexes, the full answer list is browsable |
| **Browser history / prefetch** | Cover URLs appear in the network tab and in history |
| **CDN / server access logs** | Every requested cover path records the answer |
| **Static host file index** | A public bucket of 1,649 named files is a published answer key |
| **Referrer headers** | If a cover is embedded on an external page, the path leaks the title |
| **Search-engine indexing** | `mazer666.github.io/Phomu/covers/2000s-britney-toxic.jpg` is a crawlable URL naming a song |

### Concrete recommendation

**Rename covers to opaque, content-addressed IDs** and keep the mapping in the (server-side) catalogue:

```
out/covers/8f3a1c9e2b.jpg     # sha256(songId)[:12] or a counter
```

Then the catalogue entry that maps a song to its cover lives wherever the catalogue lives — which, per QA-SPO-001, should be server-side.

If a human-readable filename matters for the **printable card** workflow (`PRINTING_GUIDE.md` — QR/NFC physical cards), keep the descriptive name in the **print sheet** only, and serve the asset under the opaque name. The card is printed; the URL does not need to be.

**Accept when**

- `ls out/covers | grep -c -- '-'` is 0, or all remaining names are opaque hashes.
- `grep -r "britney" out/` returns nothing.

---

## QA-SPO-003 — P1 — The censoring logic has zero test coverage

### What I measured

Coverage is computed with `include: ['src/utils/**/*.ts']` in `vitest.config.ts`. The resulting report:

```
File               | % Stmts | % Branch | % Funcs | % Lines
censor-utils.ts   |       0 |        0 |       0 |       0 |  12-64
song-picker.ts    |       0 |        0 |       0 |       0 |  13-89
check-covers.ts   |       0 |        0 |       0 |       0 |  8-42
```

`censor-utils.ts` — the single module whose job is preventing spoilers — has **not one test**. There is no `censor-utils.test.ts` in the repository. The 97 tests in the suite cover the admin API, the song validators, the audio queue, the QR intent and the music player; the spoiler logic is untested.

A regression in `censorHint` would be silent: the game still runs, the hints still appear — they just stop being censored, and nobody notices until a player complains.

**One calibration, measured rather than assumed.** The censoring has a small blast radius *today*: only 3 of the 7,785 hints in the catalogue contain a spoiler token. So this finding is **not** the biggest hole in the spoiler model — the shipped catalogue and the lyrics payload are (QA-SPO-001, QA-SPO-007). What makes it still worth closing is that the catalogue grows, hints get added by hand, and the exception list is edited over time; an untested safety net is one edit away from being a broken one. It is a cheap fix (a pure function, no dependencies) for a permanent guarantee.

### Concrete recommendation

Add `src/utils/censor-utils.test.ts` with at least these cases — each one a real spoiler scenario:

```ts
describe('censorHint', () => {
  it('replaces the artist name inside a hint', () => {
    expect(censorHint('Aufgenommen 1989, als die drei Bandmitglieder erst 18 oder 19 waren.',
                      'A Tribe Called Quest', 'Can I Kick It?')).toContain('[XXX]');
  });

  it('replaces the title inside a hint', () => { /* ... */ });

  it('censors short artists from the exception list', () => {
    expect(censorHint('BTS spielt hier', 'BTS', 'Dynamite')).toContain('[XXX]');
  });

  it('does not censor stopwords', () => {
    expect(censorHint('The beat is sampled from Lou Reed', 'X', 'The Dark Side'))
      .toContain('The');
  });

  it('is case-insensitive', () => { /* ... */ });

  it('censors multi-word artists before single words', () => { /* ... */ });

  it('never returns the original artist or title', () => {
    const result = censorHint(hint, artist, title);
    expect(result).not.toMatch(new RegExp(artist.split(' ')[0], 'i'));
  });
});
```

The last test is the important one — a **property-style assertion** that no token of the artist or title survives, which is exactly the invariant the feature promises.

**Accept when:** `censor-utils.ts` shows a non-zero coverage figure, and the "no artist or title token survives" assertion is present and passing.

---

## QA-SPO-004 — P2 — Two concrete correctness gaps in the censoring rules

### 4a — `IGNORE_WORDS` can leak the artist outright

`SPOILER_CONFIG.IGNORE_WORDS` contains `DER`, `DIE`, `DAS`, `UND`, `MIT`, `VON`, `FÜR`, `EINE`, `EINER`, `EINES` alongside the English stopwords. In `censor-utils.ts` these words are skipped **before** the length check:

```js
if (SPOILER_CONFIG.IGNORE_WORDS.includes(cleanWord)) return;
```

So if the artist is literally `Die Ärzte`, the token `Die` is allow-listed and never censored. A hint reading *"Die Ärzte schrieben …"* keeps `Die` — and `Die` alone is enough to identify the artist, because there are only a handful of German artists starting with that word. The same applies to an artist named `Der`, or to a title whose only distinctive word is on the list.

**Recommendation:** apply the ignore-list only to the **title**, never to the **artist**. The artist's name is the answer; stopwords in the artist's name are still identifying. Restructure `censorHint` so artist and title are processed with different word filters:

```js
[artist, title].forEach((text, idx) => {
  const isArtist = idx === 0;
  // Stopwords are only safe to keep in the title.
  if (!isArtist && SPOILER_CONFIG.IGNORE_WORDS.includes(cleanWord)) return;
  ...
});
```

### 4b — Catalog content is German-only inside a bilingual product

The UI is fully bilingual (1,258 leaf keys, `de.json`/`en.json`, 0 literal texts in 48 TSX files) — but the **content** is not. Every hint in the catalogue is German:

```
"hints":["Aufgenommen 1989, als die drei Bandmitglieder erst 18 oder 19 Jahre alt waren.", ...]
```

An English-speaking player using the English UI receives German hints. The same applies to the lyrics and to any German-language metadata in the catalogue.

**Recommendation:** make the catalogue schema bilingual — `hints: { de: [...], en: [...] }`, `lyrics: { de, en }` — and select by the active i18next language, with the existing German text kept as the `de` source and English added by translation. Extend `src/utils/validate-song-data.ts` so that a pack fails validation when a song lacks a hint in any declared locale — this makes the gap machine-detectable rather than a surprise for English users.

---

## QA-SPO-005 — P2 — Blur is a visual disguise; the answer is in the accessibility tree

`MusicPlayer.tsx` applies the spoiler blur with CSS:

```tsx
className={`... ${!videoRevealed && blurred ? 'opacity-50 blur-[60px] scale-125 pointer-events-none' : 'opacity-100 blur-none scale-100'}`}
```

The underlying video element — and the `songTitle` / `songArtist` props threaded into it — are in the DOM throughout. A CSS blur hides pixels from a human eye; it does not remove content from the document. The element's accessible name, the browser tab title, and the "open in YouTube" link all carry the real title.

**Recommendation:**

- While `blurred` is true, set `aria-hidden="true"` on the media container and render a text alternative (`t('game.blurHint')`) instead of the real title.
- Ensure the "open on YouTube / Spotify" links are not focusable while blurred (`tabIndex={-1}` plus `aria-hidden`), because following them reveals the title in a new tab.
- Keep the blur as a *visual* affordance — it is good UX — but stop relying on it as the only protection.

**Accept when:** while the answer is hidden, `document.body.innerText` contains neither the song title nor the artist, and a screen reader announces no artist or title.

---

## QA-SPO-006 — P3 — The cover-image spoiler deserves a dedicated negative test

`src/utils/check-covers.ts` exists (0 % coverage) and appears to verify that cover images exist for songs. Its natural extension is the inverse check — the one that matters for this report:

**Recommendation:** add a test that asserts, for a sample of songs, that the cover URL resolved for a song during the question phase **does not embed the artist or title** — i.e. it is an opaque ID (see QA-SPO-002). This turns the naming convention into an enforced invariant rather than a convention.

---

## QA-SPO-007 — P1 — The lyric payload is the highest-value part of the leak

### What I measured

The Lyrics Labyrinth asks the player to identify the **fabricated** line among four options. The bundle ships the label for each line:

| Measurement | Value |
|---|---|
| Songs with a `lyrics` object | 1,497 |
| Real lines shipped per song | 3 → **4,491 lines** |
| Fake lines shipped per song | 1 (as a string, for all 1,497) → **1,497 lines** |
| Songs whose real lyrics contain a token of their own title | **590 / 1,497 (39.4 %)** |

`LyricsMode` builds its four options from `lyrics.real[0..2]` plus one `lyrics.fake` line, then shuffles them. Anyone holding the bundle knows which option is the fake one. The mode is solved without listening.

This is a distinct finding from QA-SPO-001 because it has a distinct fix: even a catalogue served per round must **not send `lyrics.fake` to the client before the answer is locked**. The server must choose the fake line and send only the four rendered options — or send the real lines and the fake line only after the lock-in.

### Concrete recommendation

**Move the option selection server-side.** The round API returns the four *rendered* options, not the raw lyric structure:

```jsonc
// GET /api/round?mode=lyrics
{
  "songId": "…",
  "coverId": "c_0192",
  "options": [
    { "id": "a", "text": "Rock and roll to the beat of the funk fuzz" },
    { "id": "b", "text": "Well, I'm gone (go on then!)" },
    { "id": "c", "text": "Pull the record on and let the whole room unwind" },
    { "id": "d", "text": "Can I kick it? (Yes, you can!)" }
  ]
}
```

The `isFake` flag never leaves the server; the reveal endpoint returns it. `LyricsMode` then renders options it cannot classify.

**Accept when**

- No client chunk contains a `lyrics` object with a `fake` field.
- An E2E test in Lyrics Mode asserts that the four on-screen options cannot be distinguished by any data present in the client bundle.

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-SPO-001 Stop shipping the answer key | **P0** | No client chunk contains song titles, hints or lyrics; an automated test asserts it |
| QA-SPO-002 Opaque cover filenames | **P1** | `out/covers` filenames contain no artist or title |
| QA-SPO-003 Test the censoring logic | **P1** | `censor-utils.ts` has a test file with a "no artist token survives" invariant |
| QA-SPO-007 Move the lyrics option selection server-side | **P1** | No client chunk contains a `lyrics.fake` value; an E2E test asserts the on-screen options are indistinguishable from client data |
| QA-SPO-004a Stopword leak in artist names | P2 | `IGNORE_WORDS` is not applied to the artist token stream |
| QA-SPO-004b Bilingual catalogue content | P2 | Catalogue schema carries `de`/`en` hints and lyrics; validation enforces completeness |
| QA-SPO-005 Hide the answer from the accessibility tree | P2 | While blurred, the DOM and the accessibility tree contain neither title nor artist |
| QA-SPO-006 Negative cover-name test | P3 | A test asserts cover identifiers are opaque |
