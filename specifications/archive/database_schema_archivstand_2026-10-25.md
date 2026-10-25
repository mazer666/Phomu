/**
 * Phomu Song Object Definition
 * Every entry represents one card/song in the database.
 * Used across all 5 game modes.
 */

```typescript
export interface PhomuSong {
  id: string;               // Unique ID (used in QR-Code URL, e.g., "global-001")
  title: string;            // Song title
  artist: string;           // Artist or band name
  year: number;             // Release year (used in Timeline mode)
  country: string;          // ISO Code (e.g., 'US', 'DE', 'GB')

  // Categorization
  genre: string;            // e.g., 'Pop', 'Rock', 'Hip-Hop', 'Electronic'
  difficulty: 'easy' | 'medium' | 'hard'; // How well-known the song is
  mood: string[];           // Mood tags for Vibe-Check mode (e.g., ['Neon Night', 'Road Trip'])
  pack: string;             // Content pack name (e.g., 'Global Hits 1950-2026')

  // Mode-Specific Data
  hints: [string, string, string, string, string]; // 5 Levels for Hint-Master mode
    // Level 1: Historical context (hardest, 5 points)
    // Level 2: Musical trivia
    // Level 3: Album/era info
    // Level 4: Audio snippet description
    // Level 5: Nearly a giveaway (easiest, 1 point)

  lyrics: {
    real: string[];         // 3 Authentic lyric lines for Lyrics Labyrinth
    fake: string;           // 1 AI-generated fake lyric line
  };

  isOneHitWonder: boolean;  // For Survivor mode: true = only 1 major hit

  // Playback Control
  previewTimestamp?: {      // Optional: which part of the song to play
    start: number;          // Start time in seconds
    end: number;            // End time in seconds
  };

  // Streaming Embed Links (at least YouTube required)
  links: {
    youtube?: string;       // YouTube video ID or URL (primary provider)
    spotify?: string;       // Spotify track URI or URL
    appleMusic?: string;    // Apple Music URL (future)
    amazonMusic?: string;   // Amazon Music URL (falls back to YouTube)
  };
}
```

## Database Tables (Supabase - Phase 6)

| Table | Purpose |
|-------|---------|
| `songs` | All song data (migrated from JSON seed files) |
| `sessions` | Active game sessions (session code, host, settings) |
| `session_players` | Players in a session (name, score, team, device) |
| `game_rounds` | Round history (mode, song, answers, scores) |
| `vibe_votes` | Anonymous mood votes for Vibe-Check community stats |
| `user_profiles` | Optional: for logged-in users (Google Auth) |
| `saved_presets` | Session configuration presets (per user or localStorage) |
