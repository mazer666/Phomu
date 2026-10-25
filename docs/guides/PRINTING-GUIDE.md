# Printing guide — your own Phomu cards

Phomu cards are **59 × 91 mm** in size (standard card format) with **3 mm bleed**
all round. On the back there is a QR code with which the card is scanned in the
lobby.

**What exists today:** the card dimensions, the QR contents that the scanner
understands — and a document. **What does not exist yet:** an export tool in the
app that generates finished card templates. Anyone who wants to print cards
creates the graphic themselves today, following the specifications below.

---

## 1. The format

| Specification | Value |
|---|---|
| Final size (trim) | **59 × 91 mm** |
| Bleed | **3 mm** all round |
| Total area with bleed | **65 × 97 mm** |
| Safe area | at least **3 mm** from the edge |
| Cards per set | at most **110** |

The values are in `src/config/game-config.ts`:

```ts
CARD_WIDTH_MM: 59,
CARD_HEIGHT_MM: 91,
CARD_BLEED_MM: 3,
MAX_CARDS_PER_SET: 110,
```

**Bleed** means: the graphic has to be laid out at 65 × 97 mm. The outer 3 mm are
cut away when cutting. That is the buffer so that the printer does not cut
exactly at the edge — without bleed, white margins appear.

**Safe area** means: everything that matters (text, QR code) has to lie at least
3 mm inside the cut line. Otherwise it is cut off.

---

## 2. Resolution (DPI)

For printing, **300 dpi** applies. That is the resolution at which text stays
sharp and a QR code is reliably scannable.

Calculation: at 300 dpi, 1 mm corresponds to roughly **11.81 pixels**
(300 / 25.4).

| Area | Size | Pixels at 300 dpi |
|---|---|---|
| Final size | 59 × 91 mm | **697 × 1075 px** |
| With bleed | 65 × 97 mm | **768 × 1146 px** |

**Recommendation:** Lay out the file at **1146 × 768 px** (that is, with bleed)
and set a cut mark at 59 × 91 mm. That way it fits into a 300 dpi print file.

**Not below 300 dpi.** 150 dpi (half resolution) delivers 349 × 537 px — that
still looks usable on the screen, but the QR code becomes unreliable in print.
The QR code also needs a **minimum contrast**: black on white, not light grey on
light grey.

---

## 3. What belongs on the card

Suggestion for the card layout — the specifications come from what the app can
actually process:

| Element | Content |
|---|---|
| **Title** | The song title, large. |
| **Artist** | The name of the artist. |
| **Cover** | The album cover, if available. In the browse area there is an admin view with cover search via iTunes and Deezer. |
| **QR code** | On the **back** (see section 4). |
| **Pack** | Which pack the card belongs to — as text, so that it can also be assigned without a camera. |
| **Mode hint** | Optional: a keyword for the game mode, e.g. "Timeline" or "Cover Confusion". |

The cover download via the admin interface (`/Phomu/admin/review` or
`/Phomu/admin/songs`) is the practical way to get album covers — the cover
images are in `public/covers/` afterwards.

---

## 4. Which QR code goes on the card

The scanner in the lobby understands exactly three formats. Everything else is
rejected.

| QR content | Effect when scanning | Suitable for the back of the card? |
|---|---|---|
| `@Anna` | Adds "Anna" as a player in the lobby. | no — these belong on **admission cards**, not on the song card |
| `…?pack=Rock Anthemes` | Selects the pack "Rock Anthems" in the lobby. | **yes** — that is how you mark a pack |
| `…?session=123456` | Is recognised but not yet executed: a session runs on one device only today. | no |
| `…?id=<Song-ID>` | Is explicitly **not** supported (`unsupported-song-link`). | **no** |

**Consequence for the design:** A QR code that is supposed to open the song
directly does **not** work today. The scanner cannot start the song. The QR code
on the song card therefore carries the **pack context** (`?pack=…`), and the song
itself is written as text on the card.

The base path of the application has to be contained in the address: the app is
shipped under `…/Phomu`. There is no link to `…/play?id=…` — that route does not
exist, and the parameter `id` is classified as unsupported by the scanner.

The pack key in the QR code must correspond **exactly** to the key from
`PHOMU_CONFIG.SONG_PACKS` (for example `Rock Anthems`, not `rock-anthem`). An
unknown key is rejected in the lobby with `Pack nicht gefunden` ("pack not
found"). Old short forms like `global-hits` are mapped via an alias, but for new
cards the current key should be used.

---

## 5. Printing

### Variant A — Professional

1. Export the card graphics with bleed as **PNG** (300 dpi, 1146 × 768 px).
2. Specify at the print service: final format 59 × 91 mm, bleed 3 mm all round,
   do **not** let the service add bleed (that would double it).
3. Print on card stock of **at least 300 g/m²**. Thinner paper absorbs the ink
   and the QR code loses contrast.
4. After cutting, **laminate** the cards or put them into sleeves. That protects
   the QR code from fingerprints.

### Variant B — At home

1. Print a **sheet** in A4 format, not individual cards. Most printers cannot
   print 59 × 91 mm borderless.
2. Place the graphics evenly on the sheet, printed with **3 mm** of bleed — that
   serves as the cut mark.
3. Print on 300 g/m² card stock. The QR code does work on normal paper, but it
   is considerably more sensitive to creases and moisture.
4. Cut along the marks. A guillotine cutter or a **cutting mat** with a fixed
   card grid saves trouble.

---

## 6. The test print — do not skip it

**Always print a single sheet first**, before ordering 110 cards. The test costs
a minute and saves 110 bad cards.

### Checklist for the test sheet

| # | Check | Expected result |
|---|---|---|
| 1 | **Scan the QR code** | The phone's camera recognises the code **immediately**, without having to zoom. |
| 2 | **Scan in the lobby** | The code is scanned and the expected effect occurs (e.g. the pack is selected). |
| 3 | **Contrast** | The QR code is clearly black on white, without grey edges. |
| 4 | **Cut edge** | After cutting, the bleed surrounds the motif completely — no white edge. |
| 5 | **Safe area** | Text and QR code lie at least 3 mm away from the cut line, nothing is cut off. |
| 6 | **Colour** | Cover and text look strong, not pale. |
| 7 | **Material** | The QR code is not smudged and cannot be wiped away with your thumb. |
| 8 | **Size** | A test card fits into a standard card sleeve (59 × 91 mm). |

**Test 2 is the most important one.** A QR code that the phone camera shows
beautifully sharp can still fail in the app — if it contains a format that the
application does not support.

---

## 7. Checklist for the print order

- [ ] Final size 59 × 91 mm, bleed 3 mm all round
- [ ] 300 dpi, PNG (lossless)
- [ ] Colour mode CMYK, if the service asks for it
- [ ] Card stock at least 300 g/m²
- [ ] QR code black on white, no greyscale logo
- [ ] No texts in the bleed area
- [ ] Test sheet checked (section 6)

---

## 8. Further reading

- How the camera is used in the lobby:
  [User guide, section 5](../user-guide/USER-GUIDE.en.md)
- If the scanner finds nothing:
  [Troubleshooting](TROUBLESHOOTING.md)
- Where the card dimensions are in the code: `src/config/game-config.ts`
- Where the QR contents are evaluated: `src/utils/qr-intent.ts`
