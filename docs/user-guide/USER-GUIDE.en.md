# Phomu — User Guide (English)

**Phomu** is a music party game for 1 to 24 people. A session runs on **one** device:
the person whose turn it is is the **pilot** and leads the round. Everyone else
answers without touching the device. Six game modes keep things varied, and printed
QR cards put the game on the table.

**Address:** The app is served under `…/Phomu`. If you open `…/` you get an error
page — that is expected, because the application is shipped with a base path.

---

## 1. Getting started

### What you need

- A current browser (Chrome, Safari, Firefox, Edge) on a device with a screen and
  sound.
- For the camera feature you additionally need a camera — and the browser's
  permission to access it.
- Optional: a second screen or projector for projector mode (see section 6).

### Starting a game

1. Open the start page.
2. Tap **Quick Start** or **Customize** — both lead to the lobby.
3. Work through the six steps of the lobby (see section 2).
4. Tap **🚀 LET'S GO!**

### What happens in a round

Every round runs through five phases:

```text
Draw card  →  Question  →  Answers locked  →  Reveal  →  Points
```

1. **Draw card** — The pilot sees the active mode and draws a card. The music
   starts, the video is still **hidden** (blurred). A 3-second countdown runs first
   so the browser releases the sound.
2. **Question** — The mode poses its task. The pilot answers or calls it out.
3. **Lock** — As soon as the answer is settled, the pilot taps **All done → Reveal**
   (Lyrics Labyrinth and Cover Confusion have their own confirmation button).
4. **Reveal** — The song is uncovered: year, title, artist, mood or lyrics appear.
   The music keeps playing, now unblurred.
5. **Points** — The points of the round are tallied. Then the next round begins with
   the next player.

### The two floating buttons in game

Bottom left and bottom right there are two floating buttons:

| Button | Effect |
|---|---|
| 🏆 **Points** | Opens the scoreboard without leaving the round. |
| ⚙️ **Settings** | Opens the menu with "Change modes & packs", "Open projector mode" and "Leave party". |

---

## 2. Lobby and game setup

The lobby is a wizard of **six steps**. Bottom left takes you back one step, bottom
right moves you forward. A step can only be left when its minimum condition is met.

### Step 1 — Who's playing?

- Enter a name in the input field and tap **+**. Pressing Enter in the field adds
  the player as well.
- **Avatar and colour are assigned automatically** — a different emoji and a
  different colour depending on the order. There are 14 avatars and 7 colours to
  cycle through.
- The **first** player automatically becomes the **pilot**. If the pilot is
  removed, the first remaining player takes over.
- **Upper limit: 24 players.** From 24 players on, the **+** button does nothing.
- The camera button 📸 opens the QR scanner (see section 5).
- The first name is pre-filled (`Player 1`). The **Enter name...** placeholder
  appears as soon as the field is empty.

### Step 2 — How do we play?

Here you choose the **game modes** that should come up. At least one must be
active; the last active mode cannot be deselected (it is marked as "mandatory").

**Select all** / **Deselect** toggles all six modes at once. The mode of each round
is drawn **at random** from the active list — so the modes change by themselves.

### Step 3 — What are we listening to?

Here you choose the **song packs** the cards are drawn from. At least one pack must
be active. **27 packs** are available (see section 7).

**Select all** / **Deselect** gives you either every pack or just the first one
again.

### Step 4 — When is it over?

Here you set the **winning condition**. Exactly **one** of the three conditions is
active — the other two do not apply.

| Condition | Presets | Rule |
|---|---|---|
| 🏆 **Points** | 50, 100, 200, 500 | The game ends as soon as the leading player (or leading team) reaches the target. |
| 🔄 **Rounds** | 5, 10, 15, 20 | Every player or team plays that many rounds. The total is therefore target × number of participants. |
| ⏱️ **Time** | 30 to 240 minutes | The clock runs from the start of the game. |

There is also a **slider** for setting a target of your own. The point presets
double as step sizes.

### Step 5 — Fine tuning

Everything here is optional; the defaults are solid.

| Setting | Options | Effect |
|---|---|---|
| **Difficulty** | All, Easy, Medium, Hard | Restricts songs by how well-known they are. Note: if the filter leaves nothing, it is ignored — you get a song anyway. |
| **Time limit per question** | ∞, 30 s, 60 s, 2 min | When the time runs out, the round goes to the reveal automatically. |
| 📸 **QR card mode** | on/off | Only draws songs that are also on a physical card. |
| ⏳ **Time decay** | on/off | Players who answer slowly lose points (see section 4). |
| 🚫 **No-cheat mode** | on/off | Locks away **all** jokers and aids for every player. For advanced players. |

### Step 6 — Who against whom?

Here you choose the **team mode** and assign the players.

| Mode | Meaning |
|---|---|
| **Individual** (Classic) | Everyone plays for themselves. Points count per person. |
| **Teams** (Fixed) | The teams stay the same for the whole game. Points count per team. |
| **Mix teams** (Rotating) | The teams stay, but the **players** are redistributed among them at the start of every round. |

In team mode you can:

- overwrite the **team name** or roll a new funny name with 🎲,
- pick the **team colour** from six colours,
- assign every player to a team with one tap (tapping again removes the assignment),
- add further teams (up to eight, and as long as the player count allows).

**Note:** For team mode, **4 players** are recommended (at least 2 per team). You
can set it up with fewer players — the teams are just very small then.

### Quick setup and reset

- **Quick setup →** (bottom left, as soon as at least one player exists) jumps
  straight to step 6. Steps 2 to 5 keep their default values.
- **Reset ↺** resets the **entire** lobby: players, teams and all settings. This
  cannot be undone.
- All settings survive a page reload — they live in the browser's storage.

---

## 3. The six game modes

| Mode | Task | Points | Validated by |
|---|---|---|---|
| 📅 **Timeline** | Place the year in the shared timeline | 1–5, depending on timeline length | automatically |
| 🕵️ **Hint Master** | Guess the song from up to five hints | 5, 4, 3, 2, 1 (the earlier you guess, the more you score) | the pilot |
| 📝 **Lyrics Labyrinth** | Find the invented line among three real ones | 4 | automatically |
| 😎 **Vibe Check** | Match the song to a mood | 2 | automatically |
| 💀 **Survivor** | One-hit wonder or career act? | 3 | automatically |
| 🎭 **Cover Confusion** | Find the original artist | 5 down to 2, depending on hints | the pilot |

### 3.1 📅 Timeline

A shared timeline grows over the whole game. It starts with **three random years**.

- **Your task:** Place the song in the right spot — between two years, or before or
  after all of them. The more years the timeline already has, the more points are
  possible, **up to a limit of 5 points**.
- **Duplicates count as correct:** If the year is already in the timeline, both
  neighbouring slots are valid.
- **After a correct answer** the song's year joins the timeline. If the year was
  already there, it is removed again (a duplicate is then no duplicate).
- **From more than ten years** on, you may **optionally remove one year** after a
  correct answer.
- **Two aids** (locked away in no-cheat mode):
  - 🕵️ **Decade hint** (−2 points) — reveals the decade.
  - 🃏 **Joker** (−1 point) — removes exactly one wrong slot.
- **Keyboard:** number keys 1 to n pick the slot, arrow keys move the selection,
  `Enter` or the space bar confirms.

### 3.2 🕵️ Hint Master

You are looking for the **title and the artist** of a song.

- The pilot requests **hints**. There are up to **five levels**; level 1 is the
  hardest.
- **From level 2** on, the music starts automatically — still **hidden** (blurred),
  so nobody who knows the song gives it away.
- The points on offer are shown top right and drop with every level:
  **5 → 4 → 3 → 2 → 1**.
- The **🎲 music cheat** (only on level 1, −2 points immediately) starts the music
  earlier.
- **SHOW SOLUTION** uncovers title and artist. The pilot then decides what they
  knew:

| Answer | Points |
|---|---|
| ✅ **Both** (title **and** artist) | full points |
| 👤 **Artist only** | half the points (rounded up) |
| 🎵 **Title only** | half the points (rounded up) |
| ❌ **Nothing** | 0 |

### 3.3 📝 Lyrics Labyrinth

You see **four lines**: three real ones from the song and **one invented**.
Your task: find the **fake** line.

The artist and the title of the song are shown above the lines — the question is
about this very text. In the other modes, title and artist stay hidden.

- **4 points** for correctly identifying the fake, 0 for a real line.
- The music plays immediately but stays blurred until you confirm.
- **Bonus round:** If a song has no lyrics yet, it becomes a bonus round: whoever
  recognises the song and says it out loud gets **2 bonus points**.
- This mode has its own **Confirm & reveal** button — there is no "All done →
  Reveal" here.

### 3.4 😎 Vibe Check

Artist, title and decade are visible. You pick the **mood** that fits the song.

- **6 options** are on offer, **2 points** for the right one.
- The cheat **✂️ Halve the options** leaves only **3 options** — but then you score
  at most **1 point**.

### 3.5 💀 Survivor

The artist is hidden at first (three question marks). The question is: was this
artist a **one-hit wonder**?

- **3 points** for the right answer.
- The cheat **🕵️ Reveal artist** (−1 point immediately) shows the artist before you
  answer.
- After the answer, artist, title, decade and genre are displayed.

### 3.6 🎭 Cover Confusion

Two variants, each picked at random with 50 % probability.

**Variant "Who is the original?"**

- **I know it! ✋** → **5 points** (honour system: the player decides for themselves
  whether they knew it).
- **Get a hint** → **4 points** (1st hint), **3 points** (2nd hint).
- **Last hint** → the app names **three artists** to choose from, **2 points**.

**Variant "Cover or original?"**

- The question: is what you are hearing a **cover** or the **original**?
- **3 points** for the right answer.
- Although: if the song has a cover link, you can already see it in the
  "COVER VERSION ACTIVE" label.

---

## 4. Rules, points and winning condition

### Whose turn is it?

The order is held in the **turn order**. Every round belongs to exactly one person
— the **pilot**. In team mode the round belongs to the whole team, and the team
decides together.

The pilot is the person holding the device. They:

- draw the card,
- answer the question (or call it out),
- decide in Hint Master and Cover Confusion what was known,
- reveal the round ("All done → Reveal").

### Points per mode

| Mode | Correct answer | Wrong answer |
|---|---|---|
| Timeline | 1–5 points (capped, grows with the timeline) | 0 |
| Hint Master | 5/4/3/2/1 points (halved for half knowledge) | 0 |
| Lyrics Labyrinth | 4 points, bonus round 2 points | 0 |
| Vibe Check | 2 points (1 with the cheat) | 0 |
| Survivor | 3 points | 0 |
| Cover Confusion | 5, 4, 3 or 2 points (3 in the cover/original variant) | 0 |

**Basic rule:** Points are only awarded for correct answers. A score can never go
**negative** — cheat deductions are floored at zero.

### What cheats cost

| Cheat | Mode | Cost |
|---|---|---|
| 🕵️ Music cheat | Hint Master | 2 points |
| 🕵️ Decade hint | Timeline | 2 points |
| 🃏 Joker | Timeline | 1 point |
| 🕵️ Reveal artist | Survivor | 1 point |
| ✂️ Halve the options | Vibe Check | points drop from 2 to 1 |

Cheat deductions are taken off the score **immediately**, regardless of whether the
follow-up question is answered correctly. In **no-cheat mode** all cheats are
locked away.

### Time decay

If **time decay** is switched on in the lobby, a slow answer costs points:

- The first **5 seconds** are free.
- After that, **1 point** is deducted for every **5 seconds**.
- A correct answer keeps **at least 1 point**.

**Important:** The answering time is measured **in Timeline mode only**. The other
five modes are not affected by time decay.

### Winning condition

The game ends when the active condition is met — this is checked at the end of a
complete round, once every participant has had their turn.

| Condition | Target | Who wins |
|---|---|---|
| 🏆 Points | 50, 100, 200, 500 or your own value | The leading player or leading team has reached the target. |
| 🔄 Rounds | 5, 10, 15, 20 or your own value | Every player or team has played the target number of rounds. |
| ⏱️ Time | 30 to 240 minutes | The playing time is up. |

The header shows the progress. Once the target is reached, the winner screen appears
with a podium (places 1–3) and the full table.

There you have two ways forward:

- **Play again** — the lobby is kept, only the points are reset.
- **Start over** — everything is reset.

### Looking at the score

The 🏆 **Points** button bottom right opens the table at any time without
interrupting the round. In team mode the teams are ranked, in individual mode the
players.

---

## 5. QR cards and printing

### What the scanner understands

The QR scanner is opened in **step 1 of the lobby** via the camera button 📸.
It understands three kinds of content:

| On the QR code | What happens |
|---|---|
| `@Anna` | "Anna" is added to the lobby as a new player. |
| `…?pack=Rock Anthems` | The **Rock Anthems** pack is selected in the lobby. |
| `…?session=123456` | Recognised, but not executed yet — a session currently runs on one device only. |

**Important:** A code of the form `…?id=<song id>` is deliberately **not**
supported (`unsupported-song-link`). So Phomu cannot yet "put this song on the
table" — a QR code that is meant to open a song is planned for a later stage. The
forms for player names and for packs are what exist today.

### Camera access

On the first scan, the browser asks for permission to use the camera. If you
decline, or if there is no camera, the scanner image stays empty. In that case
enter the name or the pack by hand in the lobby — both are printed on the card as
text.

### Printing the cards yourself

The card format, the resolution and the test print are in the
[printing guide](../guides/PRINTING-GUIDE.md):

- format **59 × 91 mm** with **3 mm** bleed on every side,
- print on card stock of at least **300 g/m²**,
- **300 dpi** for a sharp QR code image,
- always print **one test sheet** first.

There is **no export tool in the app yet**. The card dimensions are defined, the
tool is the next stage.

---

## 6. Projector mode

Projector mode is the **screen for the projector**: a second page that shows the
scoreboard large, without giving the answer away.

### Opening it

1. Open a second browser window or tab.
2. Go to `…/Phomu/projector` there — **with** the base path `/Phomu`.
3. Leave that window on the projector or TV.

**Note:** The **📺 Open projector mode** button in the in-game menu currently opens
the address **without** the base path and therefore lands on an error page. Open
the address by hand as described above.

### What the projector shows

| Shown | Not shown |
|---|---|
| The active mode with its icon | The song |
| Round and phase | Title and artist |
| The full scoreboard | Album cover |
| The active pilot | The text of the question |
| Progress towards the target | |

### How the two views are connected

Both windows read the **same** state from the browser's storage. There is no
network connection and no server: what you do on the phone appears on the
projector. The projector refreshes itself every **2 seconds**.

If it says **"No active game"**, no session has been started yet. Start one in the
lobby and the view fills up.

---

## 7. Catalogue and packs

### The browse area

Under **Browse** you find the complete library with all **1,615 songs** from
**27 packs**. Songs with the same title and artist are only shown once.

### Filters

| Filter | Effect |
|---|---|
| **Search** | Finds by title, artist or genre. |
| **Decade** | Filters by decade (e.g. "1990s"). |
| **Mood** | Filters by mood (e.g. "Dance Floor"). |
| **Genre** | Filters by genre. |
| **QR-compatible** | Only songs that are on a physical card. |
| **One-hit wonders** | Only songs by artists with exactly one big hit. |
| **With lyrics** | Only songs that have lyrics — required for Lyrics Labyrinth. |
| **Show hints** | Shows the hints of the songs. |

You can sort by year, title or artist, ascending or descending. The page numbers
take you through the catalogue; **All** shows everything at once.

### Starting a song immediately

Tap a song cover and then **▶** to start straight away with exactly that song. It
is the quickest way to test a round.

### Admin mode

The switch **🔒 Admin off / 🔓 Admin on** at the top of the library unlocks the
editing mode: create songs, edit them and export them as JSON. All changes stay
**in this browser only** — they are not merged into the project unless you export
and submit them.

---

## 8. Settings and languages

The settings hub (`/Phomu/settings`) has five areas:

| Area | Content |
|---|---|
| 👥 **Players & profile** | Change names, choose avatars and colours. |
| 🔊 **Audio & provider** | Music provider, YouTube player mode, volumes. |
| 🧠 **Governance** | Override rules, hint release, AI behaviour, strict mode. |
| 📄 **Legal & account** | Privacy notice and terms of service, reset XP. |
| 🧭 **Game help** | A short overview of all six modes. |

On top of that the hub shows three values: the number of players, the **XP**
collected and the **level** derived from it (one level per 100 XP).

### Language

The language can be switched with the language switcher in the navigation bar (⚙️)
and in the settings. **German** and **English** are available. The choice is saved
and survives a reload.

**Current state:** The interface is **not yet fully** translated — some screens
still carry hard-coded German text. The sections that have been converted (start
page, language and design switcher) exist in both languages.

### Design (themes)

Four designs are available: **Jackbox Party** (default, colourful and loud),
**Spotify** (dark and calm), **YouTube** (dark with red) and **Music Wall**
(light, a grid of album covers). The design is saved and survives a reload.

### Audio & provider

| Setting | Options |
|---|---|
| **Music provider** | YouTube (default, free), Spotify (premium required), Spotify Free (preview), Amazon Music (preview) |
| **YouTube player mode** | Standard or Music |
| **Background music** | on/off, plus a volume slider |
| **Sound effects** | on/off, plus a volume slider |

You can reach this straight from the lobby with the **🔊 Audio** button top right.

### Governance

| Setting | Options | Effect |
|---|---|---|
| **Override governance** | Host, Co-host, Majority | Who may decide via "Power Actions" on the reveal screen. |
| **Hint release policy** | Auto publish, Manual review | Whether AI-generated hints are published right away. |
| **AI blocking behaviour** | Queue + retry + pending, Fail fast | How the app reacts when the AI services rate-limit. |
| **Strict mode** | on/off | Disables all cheats and jokers for every player. |

### Rules and packs in the middle of a game

Under **Settings → Game modes & packs** (also reachable from the in-game menu),
the active modes and packs can be changed **while** a game is running. The change
applies **from the next round** — points, players and the current state stay
untouched.

---

## 9. Troubleshooting

### There is no sound

1. Check in **Audio & provider** that "Background music" and "Sound effects" are
   switched on.
2. Allow automatic playback for this site in your browser.
3. Click any button on the page once — after that the sound is released.
4. Check whether another program is taking the sound (video in full screen,
   Bluetooth headset).
5. Switch to **YouTube**: Spotify Free and Amazon Music only play a 30-second
   preview, which may be unavailable in your region.
6. If the song is region-locked, tap **🎲 Video broken? Re-roll** in the game — a
   different song is drawn.

### The camera cannot find a code

- Allow camera access in your browser settings (the icon next to the address bar).
- The code must be complete and well lit in the picture.
- It must be the **YouTube/Spotify/Amazon preview** that actually plays: check it
  on the device with speakers.
- Codes with `?id=` are not supported (see section 5).
- Alternative: player names and packs can also be entered without a camera — the
  name is printed on the card as text.

### I lost the session

After a browser reload the lobby is **still there**: players, teams and settings
live in the browser's storage and are restored. What is lost is the **running game
state** — the points already awarded in the current round.

- **Do you want to start over?** Tap **Reset ↺** in the lobby. That clears players,
  teams and settings.
- **Do you want to reset only the points?** The screen after the game offers
  **Play again**: the lobby is kept, only the points go back to zero.
- **Resetting XP** is under **Settings → Legal & account**, in the "danger zone".

### A cover is missing or wrong

- If a cover image is missing, the card shows a neutral placeholder — the game
  works anyway.
- **A different cover:** In the browse area switch on admin mode, open the song
  via "Edit" and pick a suitable image. Covers can be searched via iTunes and
  Deezer.
- **Pulling all covers again:** This happens through the admin interface at
  `/Phomu/admin/review` (delta export) and `/Phomu/admin/songs`.

### A song is missing from the catalogue

1. **Is a filter to blame?** In the browse area reset all filters
   (**RESET EVERYTHING ↺**). A filter that is set hides songs.
2. **Is the pack active?** Open step 3 of the lobby and select the pack in
   question. The draw only searches the **selected** packs.
3. **Is the mode to blame?** Every song names the modes it supports. For Lyrics
   Labyrinth the song additionally needs **three real and one invented line**. If
   no song fits, the draw falls back to the base pool.
4. **The song is in the library but never drawn?** Then it does not match the
   filters for pack, difficulty, QR or mode. Those filters are ignored when they
   leave nothing — except for the mode "Lyrics", which strictly needs a song with
   lyrics.

### The page shows "404"

The address is wrong. The app lives under `…/Phomu`, not under `…/`.
Correct: `…/Phomu` · Wrong: `…/` and `…/lobby`.

### Further help

- Technical setup and error images: [Getting started](../GETTING-STARTED.md)
- Printing: [printing guide](../guides/PRINTING-GUIDE.md)
- More error images: [troubleshooting](../guides/TROUBLESHOOTING.md)
