# Phomu - The Modular Music Party Platform

Phomu (Physical-Mobile-Music) is an open-source, hybrid party game platform that bridges the gap between physical collectible cards and a dynamic, digital music experience.

## Core Philosophy
- **Human-Centric:** No rigid AI-checking. A "Pilot" (player) manually validates answers to keep the game flow natural and fair unless the questions are completely clear.
- **Privacy First:** No tracking, secure Google Auth via Supabase, and local-first data processing.
- **Hybrid Play:** Works with physical QR cards or as a purely digital web-app.
- **Open Standards:** Export cards as print-ready PNGs optimized for professional services (like meinspiel.de) or DIY home printing.

## Game Modes (5 Total)
1. **Chronological Timeline:** Place songs correctly in time via drag & drop. Successfully added cards allow (or force) removal of duplicates to keep the board clean. Auto-validated.
2. **Hint-Master:** Guess the artist/title using 5 levels of increasingly easy clues (History -> Trivia -> Album -> Audio Snippet -> Full Song). Points: 5 down to 1. Pilot validates manually.
3. **Lyrics Labyrinth:** Identify the AI-generated "fake" lyric line among 3 real ones. Players must lock in their choice **before** the music starts for the reveal. Auto-validated.
4. **Vibe-Check:** Match songs to specific moods and compare your taste with anonymous global community stats. Auto-validated.
5. **Survivor:** Decide if an artist is a "One-Hit Wonder" or a "Long-term Survivor" (2+ Top 40 hits). Auto-validated.

## Music Playback & Anti-Spoiler
- **Providers:** YouTube (primary/free), Spotify Free (30s preview) + Premium (SDK), Amazon Music (YouTube fallback). Apple Music planned later (requires Apple Developer Account).
- Provider is chosen once in Settings, changeable during game.
- User click + countdown required (browser autoplay restriction).
- **Anti-Spoiler Overlay:** Music plays behind a custom overlay -- no title, artist, or cover visible.
  - Singleplayer: Reveal after own lock-in.
  - Multiplayer: Reveal only after ALL lock-ins.
- **Projector Mode (TV):** Separate route (`/projector`), also spoiler-free.

## Players & Sessions
- **Anonymous play** by default, Google Login optional (for saves/community features).
- **1-24 players**, default: single player.
- **Teams:** Individual / Fixed Teams / Shifting Teams (randomized every round).
- **Eliminated players** become spectators (can play along without scoring).
- **Device Model:** Pass-the-Phone (default) + Multi-Device optional (session code via Supabase Realtime).
- **Host-Assist:** Configurable level of host control.

## Configuration (Pre-Game)
- Time limit (optional), difficulty, modes, scoring, teams.
- Players can join/leave before and during setup.
- **Session Presets** saveable and loadable.
- **UX:** Progressive Disclosure -- "Quick Start" (3 clicks) vs "Customize" (step-by-step wizard).
- **Chips Mechanic:** Optional betting system (planned).

## 4 Themes (Switchable In-App)
1. **Jackbox Games** (Default) -- Colorful, bold, party arcade.
2. **Spotify** -- Dark, minimal, clean.
3. **YouTube** -- Dark/red, modern.
4. **Music Wall / TikTok Vibe** -- White, tiles, album covers dominant.

## Physical Cards (59x91mm + 3mm Bleed)
- **Front:** Year displayed large, optional country flag, abstract musical design. **No** artist/title/hints on the card.
- **Back:** Only QR code + Phomu URL (Session-/Pack-Intent, **kein** direkter Song-Link).
- Everything else runs through the app.
- Max 110 cards per set (for meinspiel.de).

## Song Database
- **Minimum 50 songs** for development, target 1,000+ for launch.
- **First Pack:** "Global Hits 1950-2026" (globally popular songs across all decades).
- Each song includes: title, artist, year, country, genre, difficulty, mood tags, 5 hints, 3 real + 1 fake lyric, one-hit-wonder flag, streaming links (YouTube + Spotify + Apple + Amazon).
- AI-assisted creation (hints, fake lyrics), manually verified.

## Tech Stack
- **Framework:** Next.js 16 (App Router) + TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Mobile-first, Responsive) + Framer Motion (Animations)
- **State Management:** Zustand
- **Backend:** Supabase (PostgreSQL, Auth, Real-time sync)
- **Internationalization:** i18next (DE primary, EN)
- **Hosting:** Vercel (Free Tier)
- **License:** GPL-3.0 (Copyleft)


## Quality & Trust
- Multi-layer quality gates: Typecheck, Lint, Unit Tests, Data Validation, Build, Dependency Audit.
- Privacy-first and data minimization: only store what is required for game functionality.
- Security and contribution guidelines: `SECURITY.md` and `CONTRIBUTING.md`.

## Development Standards
- **Modular Code:** Maximum 400-600 lines per file.
- **TypeScript Strict:** No `any`. Clear interfaces for everything.
- **Beginner-Friendly:** Every logic block explained in plain English/German for non-developers.
- **Centralized Config:** All game constants in `src/config/game-config.ts`.


## Aktueller Projektstand (Dokumentation)
- **Contributing Guide:** `CONTRIBUTING.md`
- **Security & Privacy Policy:** `SECURITY.md`
- **Statusbericht:** `specifications/current_status_2026-04-01.md`
- **Verbesserungsplan (Mobile UX + Security + Phasen):** `specifications/improvement_plan_mobile_ux_security.md`
- **Roadmap (historisch/ursprünglich):** `specifications/project_roadmap.md`
- **Strategie & PM-Vorschläge (5.000 Songs, Scoring, UX/UI, Admin-Security):** `specifications/product_strategy_2026-03-31.md`

> Hinweis: Der Statusbericht vom **1. April 2026** ist die führende Quelle für den aktuellen Ist-Zustand und offene Qualitätslücken.
