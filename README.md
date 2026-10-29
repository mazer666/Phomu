# Phomu

**Hybrid music party game: physical QR cards meet a dynamic web app.**

Phomu is an open-source party game that combines a music quiz, social gaming and
physical QR cards in a single game. A round runs on **one** device (or on several,
when a session code is shared), and the cards come from the printer or from the
phone screen.

- **License:** AGPL-3.0-or-later
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Zustand · i18next
- **Languages:** German (primary) and English (complete)

---

## What Phomu is

Phomu is neither a streaming client nor a music database. It is a **game**: a mix
of ordering, deduction and music-knowledge rounds, played with physical or virtual
cards.

https://phomu.pages.dev

Three things set it apart from the classic music quiz:

1. **The card is the way in.** A printed QR card leads straight into the matching
   game mode. Whoever holds the card can play — no account needed.
2. **One device, one role.** One person holds the device and leads the round
   (the "pilot"). The players answer without touching the device. That prevents
   spoilers and turns a phone into a full party setup.
3. **The mode determines the mechanic.** There is no single "quiz" but six
   different thinking tasks — from ordering to deduction.

---

## Quick start

```bash
git clone https://github.com/mazer666/Phomu.git
cd Phomu
npm ci
npm run dev
```

The app then runs on `http://localhost:3000`.

The admin interface runs entirely in the browser: it edits songs in
`localStorage` and exports them as JSON. It needs **no** token and no server.

The server-side admin API (`src/admin-api/**`) — the hardened endpoints for
cover search and cover save — is **not registered in the published build**: the
project is a static export and the handlers live outside the app directory.
Whether it will be wired up to a server or removed is an open decision of the
owner, recorded in
[`docs/cr/CR-0002-admin-api-entscheidung.md`](docs/cr/CR-0002-admin-api-entscheidung.md).
Until that decision falls, no document claims that it is reachable.

Detailed instructions including troubleshooting:
[`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md).

---

## The six game modes

| Mode | Task | Validation |
|---|---|---|
| **Timeline** | place songs in the right chronological order | automatic |
| **Hint-Master** | guess the song from up to five hint levels | manual, by the pilot |
| **Lyrics Labyrinth** | find the faked line among real lines | automatic |
| **Vibe-Check** | assign the song to a mood | automatic |
| **Survivor** | one-hit wonder or career act? | automatic |
| **Cover Confusion** | find the original behind the cover version | automatic |

**Anti-spoiler:** during the game the interface never shows title, artist or album
cover. The solution appears only once all answers are locked. For the projector
there is a separate, equally spoiler-free projector mode.

**Scoring:** base points, an optional time decay and a configurable point cap. All
values live centrally in
[`src/config/game-config.ts`](src/config/game-config.ts) — that is where the truth
is, not in some component.

---

## Features

- **Lobby:** 1–24 players, solo play, fixed teams or teams reshuffled every
  round; session code for multiple devices
- **Game flow:** Draw → Question → Lock → Reveal → Points, then the next round
- **Catalogue:** 135 packs with 1,615 songs, with schema gate and duplicate policy
- **Printing:** card layout 59 × 91 mm plus 3 mm bleed, QR code on every card
- **Themes:** Jackbox, Spotify, YouTube, Music Wall
- **Languages:** German and English, switchable, persistent
- **Accessibility:** tooltips on every control, keyboard operation, focus rings,
  `prefers-reduced-motion`

---

## Quality and gates

The quality bar is set in [`QUALITY.md`](QUALITY.md). Every essential feature is
accepted across eight dimensions — functional, technical, performance, usability,
security/privacy, internationalisation, interoperability, documentation.

The checks run locally and in CI:

| Command | Checks |
|---|---|
| `npm run typecheck` | TypeScript strict, without emit |
| `npm run lint` | ESLint |
| `npm run test` | Vitest with coverage |
| `npm run test:e2e:smoke` | Playwright smoke test over the complete flow |
| `npm run validate-songs` | schema and required fields of every song |
| `npm run validate-catalog` | catalogue gate: packs, songs, duplicates, missing years |
| `npm run check:i18n` | parity and completeness of DE and EN |
| `npm run check:doc-links` | every relative link in the repo resolves |
| `npm run build` | production build |

`npm run local-ci` runs the checks in the order the CI runs them.

---

## Documentation

The full navigation is in [`docs/README.md`](docs/README.md).

| Document | Content |
|---|---|
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | the binding requirements with IDs |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | module boundaries and dependency direction |
| [`ROADMAP.md`](ROADMAP.md) | milestones, gates and status |
| [`QUALITY.md`](QUALITY.md) | the acceptance model |
| [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) | where to change what |
| [`GLOSSARY.md`](GLOSSARY.md) | the domain terms |
| [`AGENTS.md`](AGENTS.md) | how agents work in this project |
| [`SECURITY.md`](SECURITY.md) | threat model and disclosure channel |
| [`PRIVACY.md`](PRIVACY.md) | data minimisation |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | contributing |
| [`docs/user-guide/`](docs/user-guide/) | guide for players, German and English |

The machine-readable truth about the project state is in
[`project/project.yaml`](project/project.yaml).

---

## Deployment

The web shell is a **static export**. It is deployed to **Cloudflare Pages** —
the decision and the reasons are in
[`docs/adr/ADR-0010-hosting-on-cloudflare-pages.md`](docs/adr/ADR-0010-hosting-on-cloudflare-pages.md),
the runbook is in
[`docs/deployment/CLOUDFLARE.md`](docs/deployment/CLOUDFLARE.md).

The nine security headers have **one** source
([`config/security-headers.mjs`](config/security-headers.mjs)); the Cloudflare
deployment writes them into `public/_headers`, and the CI compares the two, so
the hosts cannot drift apart. GitHub Pages stays as the fallback host.

The native shells need no server at all: the game rules live in the shared
Rust core and run on the device.

## Contributing

```bash
git clone https://github.com/mazer666/Phomu.git
cd Phomu
npm ci
npm run local-ci
```

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`AGENTS.md`](AGENTS.md) first. Contributions follow the house style: clear names,
one responsibility per file, tests with every behaviour change, documentation in
the same commit, no invented numbers.

---

## License

AGPL-3.0-or-later. See [`LICENSE`](LICENSE).

The music tracks, cover images and video links referenced in the catalogue belong
to third parties; the project provides the software under AGPL-3.0-or-later, not the
content. See [`PRIVACY.md`](PRIVACY.md) and [`SECURITY.md`](SECURITY.md).
