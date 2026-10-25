# Privacy Policy

**Project:** Phomu — hybrid music party game
**Repository:** <https://github.com/mazer666/Phomu>
**As of:** 2026-10-25
**Applies to:** the web app under `/Phomu` (version 0.1.0, `package.json`)

This policy describes which data Phomu **actually** processes. Every statement is
proven by the code. What could not be proven is listed in section 8 ("What could
not be proven in this policy").

---

## 1. The short version

Phomu is a **browser application without a server**. There is:

- **no** user accounts,
- **no** analytics, **no** tracking, **no** telemetry,
- **no** server sessions, **no** cookies, **no** central game state,
- **no** Phomu server that data could be sent to.

The game state lives in the browser's `localStorage`. The only network connections
the browser opens go to **third parties** (YouTube, Spotify, Amazon Music) — not
to Phomu.

---

## 2. Zero telemetry — verified, not claimed

The promise of "no telemetry" is only worth something if it can be checked. The
following checks were run on 2026-10-25 against the state of the repository:

| Check | Command | Result |
|---|---|---|
| No analytics/tracking SDK in the dependencies | `grep -nE "analytics\|sentry\|posthog\|mixpanel\|amplitude\|hotjar\|gtag" package.json` | **0 hits** |
| No analytics/tracking code in the source | `grep -rniE "google-analytics\|gtag\|googletagmanager\|sentry\|datadog\|hotjar\|matomo\|plausible\|mixpanel\|segment\.io\|posthog\|amplitude\|clarity\.ms\|fbq" src/` | **0 hits** in code (the only hits are song texts in `src/data/songs/J1.json` and `src/data/songs/W2.json`, which mention "Facebook" and "Twitter" respectively in the lyrics) |
| No external requests from the browser code | `grep -rn "fetch(" src --include='*.ts' --include='*.tsx'` | **0 hits** outside `src/admin-api/**` (server side) |
| No external fonts | `grep -rn "next/font\|fonts.googleapis\|fonts.gstatic" src/` | **0 hits**; `src/app/globals.css` contains only `@import "tailwindcss"` — the font ships with the app |
| No external `<script>` tags in the JSX | `grep -rn "<script" src --include='*.tsx'` | **0 hits**; the only external script is loaded by the app itself at runtime: the YouTube IFrame API script (`src/components/game/MusicPlayer.tsx`, `loadApi()`) |
| No cookies | `grep -rn "document.cookie\|setCookie\|sendBeacon" src/` | **0 hits** |
| No `sessionStorage` | `grep -rn "sessionStorage" src/` | **0 hits** |
| No service worker | `grep -rn "serviceWorker" src/` | **0 hits** |
| No `dangerouslySetInnerHTML` | `grep -rn "dangerouslySetInnerHTML" src/` | **0 hits** |

**What follows from this:** The app sends nothing to a Phomu server on its own.
There is no such server that would accept anything. What the browser does on its
own is described in section 3.

---

## 3. Which data flows

### 3.1 Music playback — the requests go to the third parties

Phomu provides **no** music files. Playback runs through the official embeds of
the streaming providers. The request goes from the browser **directly to the
provider**; Phomu is neither the recipient nor does Phomu see this data.

| Provider | What is loaded | Location | What the provider sees |
|---|---|---|---|
| **YouTube** | IFrame API script `https://www.youtube.com/iframe_api` | `src/components/game/MusicPlayer.tsx`, `loadApi()` | IP address, cookies, and the Google/YouTube account if you are logged in |
| **YouTube** | Embed frame `https://www.youtube.com/embed/<id>` | `src/components/game/MusicPlayer.tsx`, `new window.YT.Player(…, { playerVars: { host: https://${activeDomain} } })`; `src/components/browse/SongCard.tsx`, `src={`https://www.youtube.com/embed/${song.links.youtube}…`}` | same, plus the playback behaviour |
| **YouTube Music** | alternative player frame `https://music.youtube.com/embed/<id>` | `src/components/game/MusicPlayer.tsx`, state `activeDomain` + `toggleDomain()` | same |
| **Spotify** | Embed frame `https://open.spotify.com/embed/track/<id>` | `src/components/game/MusicPlayer.tsx`, `src={`https://open.spotify.com/embed/track/${spotifyTrackId}…`}` | IP address, cookies, and the Spotify account if you are logged in |
| **Spotify** | Preview audio `https://p.scdn.co/mp3-preview/…` (7 entries in the catalogue) | `src/components/game/MusicPlayer.tsx`, `<audio src={spotifyFreePreview}>`; catalogue e.g. `src/data/songs/E4.json` | IP address, cookies |
| **Amazon Music** | Embed frame `https://music.amazon.com/embed/track/<id>` | `src/components/game/MusicPlayer.tsx`, `src={`https://music.amazon.com/embed/track/${amazonTrackId}…`}` | IP address, cookies, and the Amazon account if you are logged in |
| **Amazon Prime** | Preview audio (`<audio src=…>`), host variable | `src/components/game/MusicPlayer.tsx`, `<audio src={amazonPrimePreview}>` | IP address, cookies |
| **Apple Music** | **only a link**, no embed | `src/types/song.ts` (`links.appleMusic`), `src/config/game-config.ts` (`'apple-music'` with the comment "Future: requires Apple Developer Account") | On click: a normal visit to the Apple Music page |

These data flows are limited by the **Content Security Policy** in
`next.config.ts:35-42` to exactly these origins (see `SECURITY.md`, section 6).
Limitation: the headers are currently **not** delivered with the static export
(`SECURITY.md`, section 4.6).

The privacy policies of the providers apply to these flows, not to Phomu:
<https://policies.google.com/privacy> (YouTube),
<https://www.spotify.com/privacy/> (Spotify),
<https://www.amazon.com/privacy> (Amazon).

### 3.2 Local data (`localStorage`)

Everything Phomu stores is in the browser's `localStorage`. It does not leave the
device unless the user transfers it themselves (export in the admin tool, section
3.4).

| Key | What is in it | Location |
|---|---|---|
| `phomu-game-state` | Player names and scores, teams, game configuration, session ID, XP, preferred player type and music provider, audio and SFX settings, round number, timeline years, start time | `src/stores/game-store.ts:618-637` |
| `phomu-admin-songs` | Song records edited in the admin tool (title, artist, year, links, hints, lyrics) | `src/app/admin/songs/page.tsx` and `src/app/browse/page.tsx`, constant `STORAGE_KEY` |
| `phomu-review-edits` | Review changes to song records | `src/app/admin/review/page.tsx`, constant `STORAGE_KEY` |
| `phomu-theme` | the selected design (jackbox, spotify, youtube, musicwall) | `src/contexts/ThemeContext.tsx`, constant `STORAGE_KEY` |
| `phomu-device-id` | a random UUID that is generated only for the report function | `src/components/game/MusicPlayer.tsx`, constant `DEVICE_KEY` |
| `phomu-missing-report-state-v1` | Timestamps and song IDs of links already reported (max. 5 reports per hour and device) | `src/components/game/MusicPlayer.tsx`, constant `REPORT_KEY` |
| `i18nextLng` | the selected language (`de` or `en`) | `src/i18n/config.ts`, `detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }`; default key of the language detector `i18next-browser-languagedetector` |

**Not** stored: `currentSong`, `currentAnswers` and `roundHistory` — they are not
part of `partialize` (`src/stores/game-store.ts`). The anti-spoiler protection
therefore cannot be circumvented by restarting.

### 3.3 Admin API

The admin API (`src/admin-api/**`) is the only place where Phomu processes data on
a server — and it currently has **no consumer** and no reachable endpoint (see
`SECURITY.md`, section 5, item 1). In case it is enabled later:

- It only answers requests with a valid token (`x-admin-token`).
- For the cover search it calls `https://itunes.apple.com/search` and
  `https://api.deezer.com/search` (`src/admin-api/admin/covers/search/route.ts`,
  `itunesUrl` / `deezerUrl`). The **artist and title of the searched song** are
  sent to Apple and Deezer — to no Phomu server.
- It downloads a cover from a fixed allowlist
  (`mzstatic.com`, `is1-ssl.mzstatic.com`, `cdn-images.dzcdn.net`,
  `dzcdn.net`, constant `ALLOWED_IMAGE_HOSTS` in
  `src/admin-api/admin/covers/save/route.ts`) and stores it under
  `public/covers/`.
- The admin token itself is a server environment variable and is **never**
  delivered to the browser.

### 3.4 `Fehlenden Link melden` ("report missing link") — a user action that sends data out

If a song cannot be played, the interface offers the button `Report Missing`. The
user triggers this **deliberately**. The app builds a JSON payload (`issuePayload`
in `src/components/game/MusicPlayer.tsx`) with:

- song ID, title, artist, pack,
- the selected provider and the boolean information about which links exist,
- **time zone**, **locale** and **region** (from `navigator.language`),
- a **device ID** (`phomu-device-id`, a random UUID),
- a timestamp.

This payload does **not** go to a Phomu server. If `NEXT_PUBLIC_GITHUB_ISSUE_URL`
is set (`src/components/game/MusicPlayer.tsx`), the app opens a pre-filled GitHub
issue in a new tab (`window.open(issueUrl…)`) — the user has to submit it there.
If the variable is not set, the payload ends up in the clipboard
(`navigator.clipboard.writeText(…)`).

This is the only place where **game data** leaves the device. The media embeds
transmit IP address and cookies to their providers anyway (section 3.1) — that
cannot be switched off by the user.

### 3.5 Export of your own data

In the admin tool (`/admin/songs`) there is a JSON export of the edited songs
(`handleExport()` in `src/app/admin/songs/page.tsx`). The export is created in the
browser via a `Blob` and a download — nothing is uploaded.

---

## 4. What does **not** flow

| Not present | Evidence |
|---|---|
| No user accounts, no sign-in, no registration | `grep -rniE "signIn\|signUp\|logIn\|login" src/` → no sign-in function; the only hits are the comment "Players are anonymous by default — no login required" (`src/types/player.ts`) and a test fixture. The only authentication in the project is the admin token (`src/admin-api/_lib/security.ts:61`). |
| No analytics, no tracking, no telemetry | Section 2 |
| No server sessions, no cookies, no `sessionStorage` | Section 2 |
| No central game state, no server database | The store is a pure browser store (`src/stores/game-store.ts`) |
| No advertising, no third-party tracking | `package.json` contains no advertising or tracking dependency |
| No geolocation | The app does not use geolocation; `Permissions-Policy` switches it off (`next.config.ts:55-57`). The only hit for "geolocation" in `src/` is the header's own test (`src/admin-api/security-headers.test.ts:58`). |
| No microphone recording | `Permissions-Policy: microphone=()` (`next.config.ts:56`) |
| No push notifications, no service worker | `grep -rn "serviceWorker\|PushManager" src/` → 0 hits |
| No contact by the operator | There is no server, no mailing list, no newsletter |
| No personal evaluation of game histories | There is no evaluation; there is no data that could be evaluated |

---

## 5. How to delete the local data

Phomu has **no** server, so there is no "delete account" either. The data lives in
the browser and is deleted there.

| What to delete | How |
|---|---|
| **Everything** (game state, theme, language, admin edits, device ID, report history) | In the browser settings, delete the **site data** for the origin. Alternatively, in the browser console: `localStorage.clear()` and reload the page. |
| **Only the game state** | `localStorage.removeItem('phomu-game-state')` and reload the page. |
| **Only the admin state** | In the admin tool `/admin/songs` use the reset button (`handleReset` in `src/app/admin/songs/page.tsx`) — that removes `phomu-admin-songs`. |
| **Only the XP** | In the settings under `Legal & Konto` ("legal & account") use the reset button (`resetProgress()` in `src/app/settings/account/page.tsx`). **Caution:** This resets **only** the XP counter, not the entire game state. |
| **Only theme and language** | `localStorage.removeItem('phomu-theme')` or `localStorage.removeItem('i18nextLng')`. |

After the deletion, the next start is a fresh session: no players, no points, no
XP.

**Legal situation:** Since Phomu does not store personal data on a server, there
is no data that the operator could delete. The deletion under Art. 17 GDPR is a
matter for the device — and therefore a matter for you. Because the data exists
locally only, this policy is at the same time the complete answer to a request
for information: the data that is stored about you is on your device.

---

## 6. Cards — what the app stores from a physical card

Phomu cards are 59 × 91 mm with 3 mm bleed (`src/config/game-config.ts`,
`docs/guides/PRINTING-GUIDE.md`). On the **back** there is a QR code. The scanner
understands exactly three formats (`src/utils/qr-intent.ts`):

| QR content | What the app does with it | What is stored |
|---|---|---|
| `@Anna` | adds "Anna" as a player in the lobby | the **player name** in the game state (`phomu-game-state` → `players[].name`) |
| `…?pack=Rock Anthemes` | selects the pack in the lobby | the **pack ID** (a catalogue identifier, no personal data) in `config.selectedPacks` |
| `…?session=123456` | is recognised but **not** executed (a session runs on one device only today) | nothing |
| `…?id=<Song-ID>` | is explicitly rejected as **not supported** | nothing |

The card content itself — song title, artist, cover, pack assignment — is **print
data**, not user data. The QR code contains the pack context, not the song
(`docs/guides/PRINTING-GUIDE.md`, section 4).

**Important:** A QR code can contain any text. If a foreign card is scanned, any
name can be entered into the lobby as a player name. The name then ends up in the
local game state — it leaves the device only if the user exports it themselves.

---

## 7. The admin token

`ADMIN_API_TOKEN` is a **server secret**, not user data.

- It is an environment variable of the operator, not a `NEXT_PUBLIC_*` variable
  (`grep -rn "NEXT_PUBLIC" src` → only the issue URL in
  `src/components/game/MusicPlayer.tsx`).
- It is never delivered to the browser, never logged and never written into an
  error message (`src/admin-api/_lib/security.ts:84-100`; test:
  `src/admin-api/admin-token-guard.test.ts` →
  `keeps the token value out of responses and logs`).
- It must be at least 32 characters long, otherwise the API answers with 503
  (`src/admin-api/_lib/security.ts:66-68`).
- Generate: `npm run security:rotate-admin-token`
  (`scripts/generate-admin-token.js`) — the token is printed to the console and
  then belongs in the operator's secret store, **not** in the repository.
- The token belongs to the operator, not to the player. It is never collected,
  never passed on to third parties and never stored in the local data.

Details on the hardening of the admin API are in `SECURITY.md`.

---

## 8. Contact for privacy requests

Phomu is maintained by a single maintainer. For a privacy request there are two
ways:

1. **Issue in the repository** — <https://github.com/mazer666/Phomu/issues>.
   Public, transparent, for everything that is not confidential. For privacy
   requests this is the normal way.
2. **Private message to the owner** via the repository
   (<https://github.com/mazer666/Phomu>) — for requests that should not be public.

For reports with a security context, the disclosure channel from `SECURITY.md`,
section 7 applies in addition.

---

## 9. What could **not** be proven in this policy

An honest list of the limits of this policy:

1. **The third-party data flows are not controllable.** What YouTube, Spotify
   and Amazon do with IP address and cookies is outside the project. Only *that*
   Phomu calls these providers, and whom it calls, can be proven.
2. **The actual delivery of the security headers cannot be proven.** The headers
   are configured in `next.config.ts`, but they are not delivered with the static
   export (`SECURITY.md`, section 4.6). That is why section 3.1 says "limited"
   with a reference to the limitation, and not "blocked".
3. **There is no data about the past of the project.** This policy describes the
   state as of 2026-10-25. Whether there was a phase with server operation in the
   past cannot be proven from the repository — there is no database, no migration
   and no user directory in the repository.
4. **The GitHub issues contain user content.** A reported missing link ends up in
   a public repository issue. Anyone who uses `Fehlenden Link melden` ("report
   missing link") publishes the information listed in section 3.4 with it —
   including time zone, locale, region and device ID. That is a deliberate
   decision by the user, but it cannot be undone once the issue exists.
5. **The accesses of the third parties are not measurable.** How many users use
   Phomu, how long they play and which songs they choose is **not** measurable —
   precisely because there is no telemetry. That is not a defect but the chosen
   state.

---

## 10. Changes to this policy

Every change to this policy is a change to the repository, with the date in the
header of this file. The version in the browser (`/privacy`) and the version in
the repository can diverge for a short time; **the file `PRIVACY.md` in the
repository is authoritative**, because the browser version is only an extract.

## 11. Further documents

- `SECURITY.md` — threat model, hardening status, disclosure channel.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — the version the user
  reads in the browser.
- `docs/guides/PRINTING-GUIDE.md` — the format of the QR codes on the cards.
