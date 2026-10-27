/**
 * The layout of the shell in the two orientations.
 *
 * WHAT: the pure decision of the shell — which orientation the viewport has
 * and which layout a page draws in it.
 *
 * WHY a pure function: the difference between the portrait and the landscape
 * is the difference between a one-column and a two-column interface. Hidden
 * in the JSX of a page it could only be proven with a browser; as a function
 * it is decided by a unit test, and the JSX only draws the result.
 *
 * WHY the game state is not part of the decision: the layout depends on the
 * shape of the viewport and on nothing else. The state of the session lives
 * in the store, so a rotation cannot lose it.
 *
 * EXAMPLE: `resolveGameLayout('landscape')` returns the two-column layout of
 * the game, `resolveLobbyLayout('portrait')` the one-column layout of the
 * lobby.
 */

/** The orientation of the viewport. */
export type ScreenOrientation = 'portrait' | 'landscape';

/** The layout variant a page draws. */
export type LayoutVariant = ScreenOrientation;

/** The signals the shell has to decide the orientation. */
export interface OrientationSignals {
  /** The width of the viewport in CSS pixels; unknown when the browser does not tell. */
  width?: number;
  /** The height of the viewport in CSS pixels; unknown when the browser does not tell. */
  height?: number;
  /** The result of the media query '(orientation: landscape)'. */
  mediaIsLandscape?: boolean;
}

/** How the scoreboard is shown on the game page. */
export type ScoreboardMode = 'overlay' | 'column';

/** The layout of the game page. */
export interface GameLayout {
  /** The variant the page draws. */
  variant: LayoutVariant;
  /** The number of columns of the page. */
  columns: 1 | 2;
  /** How the scoreboard is shown: as an overlay or as a permanent column. */
  scoreboardMode: ScoreboardMode;
  /** Whether the floating button of the scoreboard is drawn. */
  showScoreboardToggle: boolean;
  /** Whether the floating button of the in-game settings is drawn. */
  showSettingsToggle: boolean;
  /** Whether the in-game settings are drawn inside the side column. */
  showInlineSettings: boolean;
}

/** The layout of the lobby page. */
export interface LobbyLayout {
  /** The variant the page draws. */
  variant: LayoutVariant;
  /** The number of columns of the page. */
  columns: 1 | 2;
  /** Whether the preview of the session is drawn next to the steps. */
  showPreview: boolean;
}

/**
 * The orientation of a viewport.
 *
 * WHY the width decides and not the media query: the media query of the
 * orientation is defined by the aspect ratio of the viewport, but the
 * browser does not always know the viewport (a hidden tab, a server
 * render). The measurements are the direct expression of the rule "a narrow,
 * tall window is the portrait, a wide, flat one is the landscape".
 *
 * WHY the media query is the second choice: it is the signal that reports
 * the rotation of a device even when the measurements are not delivered.
 *
 * WHY the portrait is the answer when nothing is known: the one-column
 * layout fits everywhere, the two-column layout does not.
 *
 * @param signals The measurements and the media query of the viewport
 * @returns The orientation of the viewport
 */
export function resolveOrientation(
  signals: OrientationSignals
): ScreenOrientation {
  const { width, height, mediaIsLandscape } = signals;

  if (
    typeof width === 'number' &&
    typeof height === 'number' &&
    width > 0 &&
    height > 0
  ) {
    return width > height ? 'landscape' : 'portrait';
  }

  if (typeof mediaIsLandscape === 'boolean') {
    return mediaIsLandscape ? 'landscape' : 'portrait';
  }

  return 'portrait';
}

/**
 * The layout of the game page.
 *
 * WHY the scoreboard becomes a column: the landscape has twice the width and
 * half the height. The scoreboard as an overlay covers the phase of the
 * round; as a column it stands next to it and is readable at any time.
 *
 * WHY the two floating buttons disappear: the scoreboard is visible anyway
 * and the in-game settings move into the side column. Nothing of the
 * keyboard operation is lost — the buttons were the only way to reach the
 * two panels, and both panels are reachable in the landscape as well.
 *
 * @param orientation The orientation of the viewport
 * @returns The layout of the game page
 */
export function resolveGameLayout(orientation: ScreenOrientation): GameLayout {
  const isLandscape = orientation === 'landscape';

  return {
    variant: orientation,
    columns: isLandscape ? 2 : 1,
    scoreboardMode: isLandscape ? 'column' : 'overlay',
    showScoreboardToggle: !isLandscape,
    showSettingsToggle: !isLandscape,
    showInlineSettings: isLandscape,
  };
}

/**
 * The layout of the lobby page.
 *
 * WHY a preview: the steps of the wizard ask one question after the other,
 * and the other half of the screen stays empty in the landscape. The preview
 * shows what the choices add up to — the modes, the packs, the number of
 * players and the condition that ends the game.
 *
 * @param orientation The orientation of the viewport
 * @returns The layout of the lobby page
 */
export function resolveLobbyLayout(
  orientation: ScreenOrientation
): LobbyLayout {
  const isLandscape = orientation === 'landscape';

  return {
    variant: orientation,
    columns: isLandscape ? 2 : 1,
    showPreview: isLandscape,
  };
}
