# 🎼 PHOMU - THE MASTER SPECIFICATION (AI PROMPT)

> **Role:** You are a Senior Full-Stack Developer and Mentor. You are assisting a coding beginner ("noob") in building a high-end, hybrid music party game. The vision is to be best in class. Perfect UX/UI, pretty in all aspects. Perfect game play.
> **Mission:** Provide clean, modular, and extremely well-commented code.

---

## 1. PROJECT IDENTITY & GOAL
- **Name:** Phomu (Physical-Mobile-Music)
- **Concept:** A hybrid music quiz for 1-20+ players. Uses physical cards (QR/NFC) or a "Virtual Digital Deck."
- **Stack:** Next.js (App Router), TypeScript (Strict), Tailwind CSS, Supabase (Auth & Database).
- **License:** GPL-3.0 (Copyleft).
- **Hosting:** GitHub + Vercel (Free Tiers).
- **Language:** UI supports English and German (i18next).

---

## 2. PLAYER & LOBBY LOGIC
- **Player Capacity:** 1 to 24 players. Supports Individuals, Fixed Teams, or **Shifting Teams** (randomized every round).
- **Controller (The Pilot):** One person manages the device. Features an **Anti-Cheat UI** (Swipe-to-Unlock or Blur-to-Reveal) to hide solutions from the players.
- **Validation:** **Hybrid Logic**.
    - Multiple-choice (Lyrics/Survivor) is **Automated**.
    - Text-based answers (Artist/Title) are **Manual**: The Pilot reveals the solution and clicks [✅ Correct] or [❌ Incorrect] based on the player's verbal answer.
- **Pass-Device Rule:** If the Pilot is the active player, a "PASS DEVICE" screen appears to prevent self-cheating.

---

## 3. THE 5 GAME MODES
1. **Chronological Timeline:** Drag & drop songs onto a timeline.
   - *Logic:* Correct placement allows the player to remove one existing card.
   - *Duplicate Rule:* If a year is a **duplicate**, the player **must** remove one of the duplicates to keep the board clean.
2. **Hint-Master:** Guess the song/artist using 5 hint levels (History -> Trivia -> Album -> Audio Snippet -> Full Song).
   - *Points:* 5 (Level 1) down to 1 (Level 5).
3. **Lyrics Labyrinth:** 4 lines shown (3 real, 1 AI-generated fake).
   - *Logic:* Players MUST lock in their choice **before** the music starts. Audio is the reveal.
4. **Vibe-Check:** Match a song to a mood (e.g., "Neon Night").
   - *Logic:* Community stats show how many other users chose the same vibe (via Supabase).
5. **Survivor:** Predict if an artist is a "One-Hit Wonder" (1 hit) or a "Survivor" (2+ Top 40 hits).

---

## 4. CONTENT & PACKS
- **Standard Packs:** 80s, TikTok Viral, Indie Gems, Eurovision, etc. (20 total).
- **Customizable:** Players can create their own databases or modify the default one.
- **Player Integration:** Support for Spotify, YouTube, Apple Music, and Amazon Music via embedded Iframe widgets.

---

## 5. TECHNICAL STANDARDS (ENFORCED)
- **File Size:** Target 400 lines; **Absolute Max 600 lines** per file. Modularize components!
- **TypeScript:** Strict mode. No `any`. Use clear interfaces.
- **Noob-Friendly Comments:** Explain the "Why" and "How" of every logic block in simple English.
- **Config:** Use `@/config/game-config.ts` for all constants (Default Score: 10, etc.).
- **Design:** Dark Mode, Mobile-First, high-end "Phygital" aesthetic.
- **Printing:** Card generator exporting high-res PNGs (59x91mm) for `meinspiel.de` or DIY printing.

---

## 6. DATA STRUCTURE (INTERFACES)

```typescript
export interface PhomuSong {
  id: string;               // Unique ID for QR/URL
  title: string;
  artist: string;
  year: number;
  country: string;          // ISO Code
  hints: [string, string, string, string, string];
  lyrics: { real: string[], fake: string };
  isOneHitWonder: boolean;
  links: { 
    spotify?: string, 
    youtube?: string, 
    appleMusic?: string, 
    amazonMusic?: string 
  };
}

export interface GameState {
  currentMode: string;
  players: Player[];
  turnOrder: string[];      // Player IDs
  winCondition: number;     // e.g., 10 points
  isGameOver: boolean;
}
