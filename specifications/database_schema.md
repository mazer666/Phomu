/**
 * Phomu Song Object Definition
 * Every entry represents one card/song in the database.
 */
export interface PhomuSong {
  id: string;               // Unique ID (used in QR-Code URL)
  title: string;
  artist: string;
  year: number;
  country: string;          // ISO Code (e.g., 'US', 'DE')
  
  // Mode-Specific Data
  hints: [string, string, string, string, string]; // 5 Levels for Mode 2
  lyrics: {
    real: string[];         // 3 Authentic lines
    fake: string;           // 1 AI-generated fake line for Mode 3
  };
  isOneHitWonder: boolean;  // Boolean for Mode 5 logic
  
  // Streaming Embed Links
  links: {
    spotify?: string;
    youtube?: string;
    appleMusic?: string;
    amazonMusic?: string;
  };
}