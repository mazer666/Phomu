# Phomu - The Modular Music Party Platform

Phomu (Physical-Mobile-Music) is an open-source, hybrid party game platform that bridges the gap between physical collectible cards and a dynamic, digital music experience.

## 🌟 Core Philosophy
- **Human-Centric:** No rigid AI-checking. A "Pilot" (player) manually validates answers to keep the game flow natural and fair unless the questions are completely clear.
- **Privacy First:** No tracking, secure Google Auth via Supabase, and local-first data processing.
- **Hybrid Play:** Works with physical QR/NFC cards or as a purely digital web-app.
- **Open Standards:** Export cards as print-ready PNGs optimized for professional services (like meinspiel.de) or DIY home printing.

## 🎮 Game Mechanics
1. **Chronological Timeline:** Place songs correctly in time. Successfully added cards allow (or force) removal of duplicates to keep the board clean.
2. **Hint-Master:** Guess the artist/title using 5 levels of increasingly easy clues (from History to Audio).
3. **Lyrics Labyrinth:** Identify the AI-generated "fake" lyric line. Players must lock in their choice **before** the music starts for the reveal.
4. **Vibe-Check:** Match songs to specific moods and compare your taste with anonymous global community stats.
5. **Survivor:** Decide if an artist is a "One-Hit Wonder" or a "Long-term Survivor" (2+ Top 40 hits).

## 🛠 Tech Stack
- **Framework:** Next.js + TypeScript (Strict Mode).
- **Styling:** Tailwind CSS (Mobile-first, Responsive).
- **Backend:** Supabase (PostgreSQL, Auth, Real-time sync).
- **License:** GPL-3.0 (Copyleft).

## 📏 Development Standards (For Vibe/AI Coding)
- **Modular Code:** Maximum 400-600 lines of code per file to ensure readability.
- **Beginner-Friendly:** Every logic block must be explained in plain English for non-developers.
- **Centralized Config:** All game constants (scores, modes, packs) are stored in `src/config/game-config.ts`.
