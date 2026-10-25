# Getting started — from the clone to a playable state

This document leads from an empty directory to a game that runs on the phone. All
commands can be copied, all outputs are proven in the repository.

If you want to **change** something and not only play, read
[`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) first.

---

## 1. Prerequisites

| What | Version | Evidence |
|---|---|---|
| Node.js | **20** | pinned in `.github/workflows/deploy.yml` as `node-version: "20"` |
| npm | shipped with Node 20 (≥ 10) | `package-lock.json` is lockfile version 3 |
| Git | any current version | `package-lock.json`, `.git/` |
| Browser | Chromium for the E2E test | `playwright.config.ts`, `npm run test:e2e:install` |

`package.json` contains **no** `engines` field. Version 20 is therefore derived
from the CI workflow file, not from a package declaration.

Check:

```bash
node --version
npm --version
```

---

## 2. Clone and install the dependencies

```bash
git clone https://github.com/mazer666/Phomu.git
cd Phomu
npm ci
```

`npm ci` installs exactly the versions from `package-lock.json` — unlike
`npm install` it does not modify the lock file. That is the reason why the CI
uses `npm ci`.

**Side effect:** `npm ci` calls `postinstall`. The script
`scripts/setup-git-hooks.js` installs a **git hook `pre-push`** that runs
`npm run local-ci` before every push. In the repository directory the hook is
therefore installed silently; it can be removed with `rm .git/hooks/pre-push`.
Without a `.git` directory (for example in a container) the script skips the
installation with a warning.

---

## 3. Start

```bash
npm run dev
```

Output:

```text
▲ Next.js 16.4.3 (Turbopack)
- Local:         http://localhost:3000
✓ Ready in 1632ms
```

**Important:** The app is **not** on `http://localhost:3000`, but on
**`http://localhost:3000/Phomu`**. The reason is the line `basePath: '/Phomu'` in
`next.config.ts`. The root `/` returns a **404** — that is not an error, that is
the base path.

| URL | Result |
|---|---|
| `http://localhost:3000/Phomu` | Start page, HTTP 200 |
| `http://localhost:3000/Phomu/lobby` | Lobby, HTTP 200 |
| `http://localhost:3000/` | HTTP 404 |
| `http://localhost:3000/lobby` | HTTP 404 |

The dev server additionally binds to the network address of the machine
(`http://<LAN-IP>:3000/Phomu`) — that way a second device on the same WLAN can
join in.

---

## 4. Start the game

1. Open `http://localhost:3000/Phomu`.
2. **Lobby** → step 1 `Wer spielt mit?` ("Who's playing?") → create at least one
   player.
3. Step 2 `Wie wird gespielt?` ("How do we play?") → choose at least one mode.
4. Step 3 `Was hören wir?` ("What do we hear?") → choose at least one pack.
5. Step 4 `Wann ist Schluss?` ("When is it over?") → winning condition and
   target value.
6. Step 5 `Feintuning` ("fine tuning") → optional: difficulty, time limit, QR
   card mode, time decay, no-cheat mode.
7. Step 6 `Wer gegen wen?` ("Who against whom?") → team mode.
8. **`🚀 JETZT STARTEN!`** ("LET'S GO!") → the game begins.

The complete flow is in the user guide:
[`user-guide/USER-GUIDE.en.md`](user-guide/USER-GUIDE.en.md) and
[`user-guide/USER-GUIDE.en.md`](user-guide/USER-GUIDE.en.md) (English).

---

## 5. Environment variables: `.env.local` and `ADMIN_API_TOKEN`

The admin API (`/admin/covers/search`, `/admin/covers/save`) is protected with a
token. For **playing** the token is **not** needed — only for catalogue
maintenance.

```bash
cp .env.example .env.local
```

`.env.example` contains exactly one line:

```text
ADMIN_API_TOKEN=replace-with-long-random-token
```

Then generate a real token:

```bash
npm run security:rotate-admin-token
```

Output:

```text
New ADMIN_API_TOKEN (store securely, do not commit):
<64 hex characters>
```

**The script does not write the token into the file** — it prints it to the
console. You have to enter it in `.env.local` yourself:

```text
ADMIN_API_TOKEN=<the hex string that was printed>
```

Alternatively by hand:

```bash
openssl rand -hex 32
```

Rules:

- The token must be **at least 32 characters** long
  (`MIN_ADMIN_TOKEN_LENGTH` in `src/admin-api/_lib/security.ts`). Shorter →
  the API answers with **503**.
- `.env.local` is excluded from version control via `.gitignore` (`*.env*.local`).
  **A token never belongs into the repository.**
- Without `ADMIN_API_TOKEN` the admin API answers with **503** ("Admin API not
  configured"), with a wrong token with **401**.

---

## 6. Checks

### Quick

```bash
npm run typecheck          # TypeScript strict, without emit
npm run lint               # ESLint
npm run test               # Vitest with coverage
```

### Catalogue

```bash
npm run validate-songs     # schema and required fields — checks src/data/songs/A1.json by default
npm run validate-catalog   # catalogue gate over all files
```

`npm run validate-songs` checks **one** file. For another one:

```bash
npx tsx src/utils/validate-song-data.ts src/data/songs/B1.json
```

Measured output of `npm run validate-catalog` (state at the time of this
documentation):

```text
Packs: 135
Songs: 1615
Schema-Fehler: 0
Schema-Warnungen: 126
Duplicate-Gruppen: 0
Erlaubte Dubletten (Allowlist): 4
Ignorierte Secondary-Dubletten: 0
Fehlende Jahre (1950-2026): 0
```

### Build

```bash
npm run build
```

The build is a **static export** (`output: 'export'` in `next.config.ts`). The
result is in `out/` and is generated with the base path `/Phomu`.

### E2E

```bash
npm run test:e2e:install          # Chromium for Playwright (once)
npm run test:e2e:install:linux    # Linux only: missing system libraries
npm run test:e2e:smoke            # the smoke test
```

The Playwright runner starts a dev server itself (`playwright.config.ts`,
`webServer.command = 'npm run dev'`, port 3000) and stops it afterwards. If
something is already running on port 3000, set `E2E_BASE_URL` to the existing
instance:

```bash
E2E_BASE_URL=http://127.0.0.1:3000/Phomu npm run test:e2e:smoke
```

### Structure gates

```bash
npm run check:all          # i18n completeness, doc link check, file size
npm run check:i18n         # DE/EN in parallel, no literal text in the JSX
npm run check:doc-links    # every relative markdown link resolves
npm run check:file-size    # no source file over 550 lines
```

### Everything together

```bash
npm run local-ci
```

`scripts/local-ci.sh` runs in this order: typecheck → lint → unit tests → format
check (non-blocking) → `validate-songs` → `validate-catalog` → build →
`npm audit --omit=dev --audit-level=moderate`. The YouTube link audit only runs
if `YOUTUBE_API_KEY` is set.

---

## 7. Troubleshooting

### "Port 3000 is already in use"

```text
Error: listen EADDRINUSE: address already in use :::3000
```

Either a dev server is already running, or another process is holding the port.

```bash
# find the process that holds the port
lsof -i :3000

# use a different port
npm run dev -- --port 3001     # then the app is on http://localhost:3001/Phomu
```

For the E2E test the base URL then has to follow:

```bash
E2E_BASE_URL=http://127.0.0.1:3001/Phomu npm run test:e2e:smoke
```

### "Executable doesn't exist at …/chrome-linux/chrome"

```text
Error: browserType.launch: Executable doesn't exist at …
```

The Playwright browsers are missing. Install them once:

```bash
npm run test:e2e:install
```

### "Host system is missing dependencies to run browsers" (Linux only)

```text
Error: ║ Host system is missing dependencies to run browsers. ║
```

The system libraries are missing. There is a separate command for that, and it
needs **root**:

```bash
sudo npm run test:e2e:install:linux
```

### "Admin API not configured" (HTTP 503)

The admin API was called without `ADMIN_API_TOKEN`. The token is missing in the
environment or is shorter than 32 characters.

```bash
# check whether the token is set (print the length only, not the value)
node -e "console.log((process.env.ADMIN_API_TOKEN||'').length)"

# generate a new token and enter it in .env.local
npm run security:rotate-admin-token
```

After entering it, **restart the dev server** — the environment is read at
startup, not on every request.

### "Unauthorized" (HTTP 401)

The token does not match `ADMIN_API_TOKEN`. Most common cause: the token was
entered with quotation marks or with a trailing space. The comparison is
time-constant and case-sensitive.

### `Der Ton wird vom Browser blockiert` ("Audio is blocked by the browser")

Browsers only start audio playback after a user gesture. For this Phomu uses the
countdown of `PHOMU_CONFIG.COUNTDOWN_SECONDS` (3 seconds) before the player
starts. If there is still nothing to hear:

1. **Check whether the page has sound at all.** In the settings
   (`/Phomu/settings/audio`) check the `Hintergrundmusik` (background music) and
   `Soundeffekte` (sound effects) switches — both switches are on by default.
2. **Check whether another program is occupying the sound** (fullscreen video,
   another tab, Bluetooth headset). The browser mixes with the system mixer.
3. **Allow autoplay in the browser.** In Chrome and Safari set the permission for
   automatic playback for the site. In Firefox: `about:config` →
   `media.autoplay.default` → `0`.
4. **Click once.** The first click on any button of the page is enough; after
   that, audio playback is released.
5. **Check the provider.** YouTube is the default and needs no credentials.
   Spotify Free and Amazon Music use a 30-second preview that can be restricted
   regionally — in that case switch to YouTube (`/Phomu/settings/audio`).
6. **Check the YouTube playback.** Videos that are blocked regionally deliver no
   sound. There is a fallback chain to alternative IDs; if it does not help,
   skip the song in the browse area (`/Phomu/settings/game-rules` → in the game:
   `🎲 Video kaputt? Neu würfeln` ("Video broken? Roll again")).

### `Keine Songs verfügbar. Bitte prüfe dein Song-Pack.` ("No songs available. Please check your song pack.")

The pack filter found nothing. The cause is almost always an outdated pack ID
from an older version of the game state. The old IDs are mapped to the current
keys in `PHOMU_CONFIG.PACK_ALIASES`. Remedy: open **step 3** in the lobby,
deselect and reselect all packs, or press **"Reset ↺"** in the lobby.

### The page is empty or shows "404"

Almost always the missing base path. The app is under `/Phomu`:

```text
correct:   http://localhost:3000/Phomu
wrong:     http://localhost:3000
```

### "Cannot find module" or "Module not found" after the clone

`node_modules` is incomplete. Install it again:

```bash
rm -rf node_modules
npm ci
```

### "npm ci" aborts with a lockfile error

```text
npm ci can only install packages when your package.json and package-lock.json … are in sync
```

`package.json` and `package-lock.json` were edited apart. Correct it with:

```bash
npm install
git diff package-lock.json      # review the change and commit it
```

---

## 8. Next steps

| I want to … | Then read |
|---|---|
| understand the game | [`user-guide/USER-GUIDE.en.md`](user-guide/USER-GUIDE.en.md) |
| change something | [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) |
| know the rules | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) |
| understand the architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| look up a term | [`../GLOSSARY.md`](../GLOSSARY.md) |
| contribute | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| problems while playing | [`guides/TROUBLESHOOTING.md`](guides/TROUBLESHOOTING.md) |
