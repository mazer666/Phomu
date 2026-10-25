# Project Roadmap & Acceptance Criteria

## Phase 0: Project Scaffold
- Initialize Next.js 15 (App Router) + TypeScript Strict + Tailwind CSS.
- Install Framer Motion, i18next, Zustand.
- Set up 4 switchable themes (Jackbox, Spotify, YouTube, Music Wall).
- Create landing page with language toggle (DE/EN) and theme switcher.
- **Criteria:** App loads on localhost. Language and theme switching works. `npm run build` passes.

## Phase 1: Type System & Song Data
- Define all TypeScript interfaces (PhomuSong, Player, GameState, Session).
- Create 50 seed songs ("Global Hits 1950-2026") as JSON.
- Build song validation utility and song browser page.
- **Criteria:** `/browse` page displays all songs with search/filter. Validation script passes.

## Phase 2: Music Player & Anti-Spoiler
- Implement YouTube provider via IFrame API (Strategy Pattern).
- Build anti-spoiler overlay (no title/artist/cover visible).
- Click-to-play + countdown for autoplay workaround.
- **Criteria:** Music plays correctly on `/test-music`. Solutions remain hidden behind overlay. No metadata leaks in DOM.

## Phase 3: Lobby & Player Management
- Build Quick Start (3 clicks) and Customize (wizard) flows.
- Player management: add/remove/rename, anonymous by default.
- Team configuration: Individual / Fixed / Shifting.
- Session presets (localStorage).
- **Criteria:** Session can be started with configured players/teams. Quick Start works in 3 taps.

## Phase 4: Game Engine & First Mode (Survivor)
- Build game engine: turn management, scoring, round progression.
- Implement Survivor mode (binary choice, auto-validated).
- Build draw card animation, reveal screen, scoreboard, game over.
- Pass-Device screen for Pilot anti-cheat.
- **Criteria:** Complete game loop: Lobby -> Game -> Rounds -> Game Over. Scoring is correct.

## Phase 5: Remaining 4 Game Modes
- 5A: Vibe-Check (mood selection + community stats mock).
- 5B: Lyrics Labyrinth (lock-in before music, auto-validated).
- 5C: Chronological Timeline (drag & drop with `@dnd-kit`, duplicate rule).
- 5D: Hint-Master (5 hint levels, Pilot manual validation, Swipe-to-Unlock).
- **Criteria:** All 5 modes playable. Mode 3 locks input before music. Timeline drag & drop works on touch.

## Phase 6: Supabase Online Features
- Google Auth (optional login).
- Multi-device sessions via Supabase Realtime (session codes).
- Vibe-Check community stats (real data).
- Spectator mode for eliminated players.
- **Criteria:** Two browser tabs can join the same session. Game state stays in sync.

## Phase 7: Additional Music Providers
- Spotify Free (30s preview) + Premium (Web Playback SDK).
- Amazon Music (YouTube fallback).
- Provider fallback logic (broken link -> next provider).
- Apple Music: deferred (requires Apple Developer Account).
- Automatisierte YouTube-Playlist-Verarbeitung implementieren
- **Criteria:** Spotify preview plays. Fallback works when provider link is invalid.

## Phase 8: Projector/TV Mode
- Separate route `/projector` for big screen display.
- Spoiler-free: shows question, timer, scoreboard, join QR code.
- **Criteria:** Projector view syncs with game state. No spoilers visible.

## Phase 9: Physical Cards & QR System
- Card front generator (59x91mm + 3mm bleed, year, flag, abstract design).
- Card back generator (QR code + Phomu URL).
- PNG/PDF export for meinspiel.de and DIY printing.
- `/play?id=SONG_ID` route for QR scan entry.
- **Criteria:** High-res PNG export with correct bleed margins. QR code links to correct song.

## Phase 10: Polish & Launch
- Chips mechanic (optional betting).
- Host-Assist mode.
- PWA manifest (installable on home screen).
- Vercel deployment.
- Cross-browser testing (Chrome, Safari, Firefox, iOS Safari).
- How-to-Play guide.
- **Criteria:** App deployed on Vercel. Works across all target browsers. PWA installable.
