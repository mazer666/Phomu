# PHOMU - THE MASTER SPECIFICATION (AI PROMPT)

> **Role:** You are a Senior Full-Stack Developer and Mentor. You are assisting a coding beginner ("noob") in building a high-end, hybrid music party game. The vision is to be best in class. Perfect UX/UI, pretty in all aspects. Perfect game play.
> **Mission:** Provide clean, modular, and extremely well-commented code. Explain every logic block so a beginner can understand it.

---

## 1. PROJECT IDENTITY & GOAL
- **Name:** Phomu (Physical-Mobile-Music)
- **Concept:** A hybrid music quiz for 1-24 players. Uses physical cards (QR) or a "Virtual Digital Deck."
- **Stack:** Next.js 15 (App Router), TypeScript (Strict), Tailwind CSS, Framer Motion, Zustand, Supabase (Auth & Database & Realtime).
- **License:** GPL-3.0 (Copyleft).
- **Hosting:** GitHub + Vercel (Free Tiers).
- **Language:** UI supports German (primary) and English (i18next).

---

## 2. PLAYER & LOBBY LOGIC
- **Player Capacity:** 1 to 24 players. Supports Individuals, Fixed Teams, or **Shifting Teams** (randomized every round).
- **Anonymous by Default:** No login required. Google Login optional (for saves, community stats, presets).
- **Controller (The Pilot):** One person manages the device. Features an **Anti-Cheat UI** (Swipe-to-Unlock or Blur-to-Reveal) to hide solutions from the players.
- **Validation:** **Hybrid Logic**.
    - Multiple-choice (Lyrics/Survivor/Vibe-Check/Timeline) is **Automated**.
    - Text-based answers (Artist/Title in Hint-Master) are **Manual**: The Pilot reveals the solution and clicks [Correct] or [Incorrect] based on the player's verbal answer.
- **Pass-Device Rule:** If the Pilot is the active player, a "PASS DEVICE" screen appears to prevent self-cheating.
- **Spectator Mode:** Eliminated players can continue playing along (for fun) without affecting scores.
- **Device Models:**
    - **Pass-the-Phone** (Default): One device shared by all players.
    - **Multi-Device** (Optional): Host creates a session code (6 digits). Other devices join via `/join?code=XXXXXX`. Synced via Supabase Realtime.

---

## 3. GAME CONFIGURATION (PRE-START)
- **Progressive Disclosure UX:**
    - "Quick Start" -- 3 clicks: pick player count, pick pack, go.
    - "Customize" -- Step-by-step wizard: players, teams, modes, packs, scoring, time limits, difficulty.
- **Configurable:** Time limit (optional), difficulty, game modes, win condition (points), team mode.
- **Session Presets:** Save and load favorite configurations (localStorage first, Supabase for logged-in users).
- **Chips Mechanic:** Optional betting system (planned, not MVP).

---

## 4. THE 5 GAME MODES
1. **Chronological Timeline:** Drag & drop songs onto a timeline.
   - *Logic:* Correct placement allows the player to remove one existing card.
   - *Duplicate Rule:* If a year is a **duplicate**, the player **must** remove one of the duplicates to keep the board clean.
   - *Validation:* Automated.
2. **Hint-Master:** Guess the song/artist using 5 hint levels (History -> Trivia -> Album -> Audio Snippet -> Full Song).
   - *Points:* 5 (Level 1) down to 1 (Level 5).
   - *Validation:* Manual (Pilot). Pilot sees the solution behind Swipe-to-Unlock, then clicks Correct/Incorrect.
3. **Lyrics Labyrinth:** 4 lines shown (3 real, 1 AI-generated fake).
   - *Logic:* Players MUST lock in their choice **before** the music starts. Audio is the reveal.
   - *Validation:* Automated.
4. **Vibe-Check:** Match a song to a mood (e.g., "Neon Night", "Rainy Day", "Road Trip").
   - *Logic:* Community stats show how many other users chose the same vibe (via Supabase).
   - *Validation:* Automated (no wrong answer, points for matching majority).
5. **Survivor:** Predict if an artist is a "One-Hit Wonder" (1 hit) or a "Survivor" (2+ Top 40 hits).
   - *Validation:* Automated.

---

## 5. MUSIC PLAYBACK & ANTI-SPOILER

### Providers (Priority Order)
1. **YouTube** (Primary, free, everyone has access) -- YouTube IFrame API
2. **Spotify Free** -- 30-second preview via Web API
3. **Spotify Premium** -- Full playback via Web Playback SDK
4. **Amazon Music** -- Falls back to YouTube
5. **Apple Music** (Later) -- Requires Apple Developer Account (MusicKit JS). Not in MVP.

### Provider Architecture
- **Strategy Pattern:** A single `MusicPlayer` component delegates to provider-specific adapters.
- Provider is chosen once in Settings, changeable during game.
- **Fallback Logic:** If a provider link is broken, automatically try the next available provider.

### Anti-Spoiler System
- Music plays behind a **custom overlay** at all times during play.
- The overlay shows ONLY: waveform animation, play/pause button, countdown timer.
- **No title, artist, album art, or provider chrome visible** -- not even in the DOM.
- **Reveal Trigger:**
    - Singleplayer: After the player locks in their answer.
    - Multiplayer: After ALL players have locked in.
- **Projector Mode:** Separate route (`/projector`), also fully spoiler-free. Shows question, timer, scoreboard on a big screen.

### Autoplay Workaround
- Browsers block autoplay. Solution: User must click a "Play" button, followed by a countdown (3-2-1), then music starts.

---

## 6. THEMES (4 Options, Switchable In-App)
1. **Jackbox Games** (Default) -- Colorful, bold, fun typography, party arcade feel.
2. **Spotify** -- Dark background, green accents, minimal, clean.
3. **YouTube** -- Dark with red accents, modern card layouts.
4. **Music Wall / TikTok Vibe** -- White/light background, tile grid, album covers dominant.

Each theme is implemented as CSS custom properties, switchable via ThemeContext.

---

## 7. CONTENT & PACKS
- **Standard Packs:** 80s, TikTok Viral, Indie Gems, Eurovision, Rock Anthems, etc. (20 total).
- **First Pack:** "Global Hits 1950-2026" (50 songs for development, scaling to 1,000+).
- **Customizable:** Players can create their own databases or modify the default one.
- **AI-Assisted Content Creation:** Use LLMs to generate hints and fake lyrics, manually verify accuracy.

---

## 8. TECHNICAL STANDARDS (ENFORCED)
- **File Size:** Target 400 lines; **Absolute Max 600 lines** per file. Modularize components!
- **TypeScript:** Strict mode. No `any`. Use clear interfaces for everything.
- **Noob-Friendly Comments:** Explain the "Why" and "How" of every logic block in simple language.
- **Config:** Use `@/config/game-config.ts` for all constants (Default Score: 10, etc.).
- **Design:** Mobile-First, responsive (360px, 768px, 1920px). Themes switchable.
- **State Management:** Zustand for client-side state. Supabase Realtime for multi-device sync.
- **Internationalization:** i18next with DE (primary) and EN.
- **Printing:** Card generator exporting high-res PNGs (59x91mm + 3mm bleed) for `meinspiel.de` or DIY printing.

---

## 9. DATA STRUCTURE (INTERFACES)

```typescript
export interface PhomuSong {
  id: string;               // Unique ID for QR/URL
  title: string;
  artist: string;
  year: number;
  country: string;          // ISO Code (e.g., 'US', 'DE')
  genre: string;            // e.g., 'Pop', 'Rock', 'Hip-Hop'
  difficulty: 'easy' | 'medium' | 'hard';
  mood: string[];           // e.g., ['Neon Night', 'Road Trip'] for Vibe-Check mode
  pack: string;             // e.g., 'Global Hits 1950-2026'
  hints: [string, string, string, string, string]; // 5 Levels for Hint-Master
  lyrics: {
    real: string[];         // 3 Authentic lines
    fake: string;           // 1 AI-generated fake line for Lyrics Labyrinth
  };
  isOneHitWonder: boolean;  // Boolean for Survivor mode
  previewTimestamp?: {      // Optional: which part of the song to play
    start: number;          // Start time in seconds
    end: number;            // End time in seconds
  };
  links: {
    spotify?: string;
    youtube?: string;
    appleMusic?: string;
    amazonMusic?: string;
  };
}

export interface Player {
  id: string;
  name: string;
  score: number;
  teamId?: string;
  isEliminated: boolean;
  isSpectator: boolean;
}

export interface GameState {
  currentMode: string;
  players: Player[];
  turnOrder: string[];      // Player IDs
  winCondition: number;     // e.g., 10 points
  isGameOver: boolean;
  currentRound: number;
  selectedPacks: string[];
  selectedModes: string[];
}
```
