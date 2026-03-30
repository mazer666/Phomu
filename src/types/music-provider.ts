/**
 * Music Provider Types
 *
 * Defines the interface that every music provider must implement.
 * This is the Strategy Pattern — the MusicPlayer component uses
 * this interface without knowing which provider is active.
 *
 * Implemented by:
 * - YouTubeProvider   (Phase 2, primary)
 * - SpotifyFreeProvider  (Phase 7)
 * - SpotifyPremiumProvider (Phase 7)
 * - AmazonMusicProvider  (Phase 7, YouTube fallback)
 * - AppleMusicProvider   (Future — needs Apple Developer Account)
 */
import type { PhomuSong } from './song';

/** Current state of the music player */
export type PlayerState =
  | 'idle'      // No song loaded
  | 'loading'   // Loading song from provider
  | 'ready'     // Song loaded, waiting for user to press play
  | 'playing'   // Music is playing
  | 'paused'    // Music is paused
  | 'ended'     // Song finished playing
  | 'error';    // Something went wrong

/** Callback function called when player state changes */
export type StateChangeCallback = (state: PlayerState) => void;

/**
 * The contract every music provider must fulfill.
 * Implemented as an abstract class or plain object following this shape.
 */
export interface MusicProviderInterface {
  /**
   * The provider's identifier — matches the MusicProvider type in game-config.ts.
   * Used to display the provider name in settings.
   */
  readonly name: string;

  /**
   * Set up the provider (load SDKs, authenticate, etc.).
   * Called once when the provider is first activated.
   * Returns true if initialization succeeded.
   */
  initialize(): Promise<boolean>;

  /**
   * Returns true if this provider can currently play music.
   * E.g., Spotify Premium returns false if user isn't logged in.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Start playing the given song.
   * The audio must remain hidden behind the anti-spoiler overlay —
   * the provider should NOT show any UI that reveals song metadata.
   */
  play(song: PhomuSong): Promise<void>;

  /** Pause playback */
  pause(): void;

  /** Stop playback and reset to beginning */
  stop(): void;

  /**
   * Seek to a specific position in seconds.
   * Used to jump to previewTimestamp.start if defined.
   */
  seek(seconds: number): void;

  /** Get the current playback state */
  getState(): PlayerState;

  /**
   * Register a callback to be notified when the player state changes.
   * This is how the UI knows to update (show/hide play button, etc.)
   */
  onStateChange(callback: StateChangeCallback): void;

  /**
   * Render the provider's embed element (e.g., YouTube IFrame).
   * This element is hidden inside the anti-spoiler overlay container.
   * The overlay covers it completely — players never see it directly.
   *
   * Returns null if the provider doesn't need a visible embed (e.g., audio-only).
   */
  renderEmbed(): React.ReactNode | null;

  /** Clean up resources when switching providers or unmounting */
  destroy(): void;
}

/**
 * Result of checking which providers are available for a given song.
 * Used to show/hide provider options in the settings UI.
 */
export interface ProviderAvailability {
  youtube: boolean;
  'spotify-free': boolean;
  'spotify-premium': boolean;
  'amazon-music': boolean;
  'apple-music': boolean;
}
