# Troubleshooting for players

The problems that really occur while playing — and what to do in each case.
No case of "that's just how it is".

**In short:** The most frequent case is a **404** (address without `/Phomu`), the
second most frequent one is a **blocked sound**. Both are at the very bottom.

---

## 1. The sound stays silent

**Symptom:** The card is drawn, the countdown runs, but there is nothing to hear.
The score works, the game runs.

**Cause:** Browsers only start audio playback after a user gesture. The app counts
three seconds down so that the sound is released — if that is not enough, you
have to click once.

**Solution, in this order:**

1. **Check the volume.** Under `Einstellungen → Audio & Provider` (settings →
   audio & provider) there are the `Hintergrundmusik` (background music) and
   `Soundeffekte` (sound effects) switches. Both have to be on. Both sliders are
   **independent** of each other — the music can be off while the effects are on.
2. **Click once.** Any click on the page is enough. After that, the sound plays.
3. **Allow autoplay.** In Chrome and Safari via the icon next to the address bar
   → `Website-Einstellungen` (site settings) → allow `Automatische Wiedergabe`
   (automatic playback). In Firefox: `about:config` → `media.autoplay.default` →
   `0`.
4. **Check the system mixer.** Is a video running fullscreen, another tab with
   sound, or a Bluetooth headset connected? The browser mixes with the system
   mixer — the device can be muted while the app plays correctly.
5. **Switch to YouTube.** Under *Audio & Provider* **YouTube** is the default and
   needs no account. **Spotify Free** and **Amazon Music** only play a
   30-second preview; that is not available in every region. If you hear nothing
   there, you do not have a device problem but a missing preview.
6. **Skip the song.** If the video is blocked regionally or faulty, there is the
   button `🎲 Video kaputt? Neu würfeln` ("Video broken? Roll again") in the
   game. Another song is drawn, the round counter keeps running normally.
7. **Check the provider mode.** Under *Audio & Provider* there is
   `YouTube Player Modus` (YouTube player mode) with **Standard** and **Music**.
   "Music" is the YouTube Music variant and delivers a different result depending
   on the region. When in doubt, set it to **Standard**.

---

## 2. The camera finds no code

**Symptom:** The scanner opens, but the code is not recognised. Or the scanner
image stays black.

**Cause and solution:**

| Cause | What to do |
|---|---|
| The camera permission is missing | Allow the camera for this site in the browser settings. The icon next to the address bar opens the settings. Then open the scanner again. |
| There is no camera / it is busy | Close the other application that uses the camera (video call, camera app). |
| The code is too small or too far away | Hold the card closer and bring the QR code into the frame in the centre of the image. |
| The code is mirrored or too crooked | Hold the card straight. |
| The code is too dark | Better light. At night the screen brightness often is not enough. |
| The code is **covered** (for example by a sticker) | The QR code has to lie completely free. |
| The code points to an unsupported address | See below. |

**Important note about the QR contents:** The scanner understands three formats:

- `@Anna` — adds a player,
- `…?pack=Rock Anthemes` — selects a pack,
- `…?session=123456` — is recognised but not yet executed.

A code of the form `…?id=<Song-ID>` is **not** supported. If such a card is
scanned, nothing visible happens — that is not a defect of the camera but a
function that has not yet been implemented.

**If nothing helps at all:** The player name is written as text on the card. Enter
it by hand in step 1 of the lobby. The same applies to the pack: select it in
step 3.

---

## 3. The session is lost

**Symptom:** After a reload (or a tab switch on the phone) the lobby is empty or
the game state is back at the beginning.

**What actually survives:** Everything that was set in the lobby — players, teams,
modes, packs, end condition, audio and design choice. That lives in the browser's
storage and is restored on reload. The total XP survives as well.

**What is lost:** The **running game state**: the points already awarded in the
current round and the order of the turns.

**Solution:**

| I want to … | Then … |
|---|---|
| continue with the same lobby | simply tap **🚀 JETZT STARTEN!** ("LET'S GO!") in the lobby — the settings are still there |
| only reset the points | after the game choose `Nochmal spielen` ("Play again"): the lobby stays, only the points go to zero |
| reset everything | tap **Reset ↺** in the lobby. Caution: This also deletes players, teams and all settings. |
| reset the XP | `Einstellungen → Legal & Konto` (settings → legal & account) → `Gefahrzone` ("danger zone") → `XP zurücksetzen` ("Reset XP") |

**If the lobby is empty after a reload:** Then either a different browser or an
incognito window was used, or the browser data was deleted. The game state exists
locally only — there is no server copy, and that is intentional: Phomu is a
zero-telemetry project.

---

## 4. A cover is missing or does not fit

**Symptom:** In the library (`Browse`) an image is empty, shows a placeholder or
does not fit the song.

**Solution:**

1. **Empty cover:** The song has no image URL in the data. The game works
   nevertheless — the cover download is only needed for the cards.
2. **Wrong cover:** In the browse area switch on `🔓 Admin an` ("Admin on") at
   the top, open the song via `Bearbeiten` ("Edit") and choose a suitable image
   in the cover tab. You can search via iTunes and Deezer.
3. **Fetch all covers again:** Via the admin interface under
   `/Phomu/admin/review` (delta export: only the changed songs) or
   `/Phomu/admin/songs` (full export of a pack).
4. **Remember the changes:** Changes in admin mode only remain in that browser.
   Only the export makes them permanent.

**For printed cards:** See the
[printing guide](PRINTING-GUIDE.md) — it states which resolution and which
material are needed so that a QR code stays reliably scannable.

---

## 5. A song is missing from the catalogue

**Symptom:** A certain song does not appear in the library, or it is never drawn
in the game.

**Solution, in this order:**

1. **Reset the filters.** In the library tap `ALLES ZURÜCKSETZEN ↺` ("RESET
   EVERYTHING ↺"). Every filter that is set hides songs: decade, mood, genre,
   difficulty, `QR-Kompatibel` ("QR compatible"), `One-Hit Wonders` ("one-hit
   wonders") and `Mit Songtexten` ("with lyrics").
2. **Check the pack.** The draw searches **exclusively** in the packs that were
   selected in step 3 of the lobby. Open step 3 and select the pack in which the
   song is.
3. **Check the mode.** Every song names the modes it supports. A song without
   lyrics is not drawn in **Lyrics Labyrinth** — there the bonus mode applies, in
   which the song is named out loud.
4. **Difficulty and QR filter.** Both are ignored when they lead to nothing —
   unless the mode "Lyrics" mandatorily requires a song with lyrics.
5. **Already played?** Already played songs are preferably avoided. If all songs
   of the pack have already been played, one of them is drawn again — but then
   from the most recently played.
6. **Is the song really missing?** Then it is not in the catalogue. Under
   `/Phomu/admin/review` you can check whether an entry exists, and under
   `/Phomu/admin/songs` it can be created.

**Additional note:** If the lobby shows `Keine Songs verfügbar. Bitte prüfe dein
Song-Pack.` ("No songs available. Please check your song pack."), the pack
selection does not match the catalogue. This happens when an old pack identifier
from an earlier version is stored. Remedy: in step 3 deselect and reselect all
packs, or tap **Reset ↺** in the lobby.

---

## 6. The page shows "404"

**Symptom:** After opening the address an error page appears.

**Cause:** The address is wrong. Phomu is shipped with a base path.

| Correct | Wrong |
|---|---|
| `…/Phomu` | `…/` |
| `…/Phomu/lobby` | `…/lobby` |
| `…/Phomu/browse` | `…/browse` |
| `…/Phomu/projector` | `…/projector` |

**Note:** The button `📺 Projector-Modus öffnen` ("Open projector mode") in the
game menu currently opens the address **without** the base path and therefore
lands on an error page. For the projector, please call up the address by hand.

---

## 7. The game does not start

| Symptom | Cause and solution |
|---|---|
| `Bitte wählen...` instead of `Weiter` | In step 1 a player is missing, in step 2 a mode or in step 3 a pack. |
| The button `JETZT STARTEN!` is missing | No player has been created yet. The button appears in step 6. |
| The game jumps back to the lobby immediately | No game is running. The page `/Phomu/game` redirects to the lobby without a running game. |
| The song gets stuck | The draw found nothing suitable. See section 5. |
| `🎲 Video kaputt? Neu würfeln` does not help | Then the error is not in the video but in the internet connection. YouTube videos need a connection. |

---

## 8. If nothing helps at all

1. **Reload the page.** Sometimes that is enough — the state is restored
   correctly.
2. **Try another browser.** The game state lives in the browser's storage; a
   different browser does not bring it along.
3. **Do not work in an incognito window.** In incognito mode the storage is deleted
   when the window is closed.
4. **Check the admin pages.** Under `/Phomu/admin/review` you can see whether the
   catalogue was loaded completely.

Technical environment, server addresses and error pictures on the command line:
[Getting started](../GETTING-STARTED.md).
