/**
 * The layout decision of the two orientations.
 *
 * WHAT: the unit test of the pure decision — which orientation a viewport
 * has and which layout the game and the lobby draw in it.
 *
 * WHY the test is without a browser: the decision is a pure function, so it
 * can be proven without a DOM. The JSX of the pages only draws the result.
 */
import { describe, expect, it } from 'vitest';
import {
  resolveGameLayout,
  resolveLobbyLayout,
  resolveOrientation,
} from './orientation-layout';

describe('resolveOrientation', () => {
  it('reports the portrait for a narrow, tall viewport', () => {
    expect(resolveOrientation({ width: 400, height: 800 })).toBe('portrait');
  });

  it('reports the landscape for a wide, flat viewport', () => {
    expect(resolveOrientation({ width: 800, height: 400 })).toBe('landscape');
  });

  it('reports the portrait for a square viewport', () => {
    // The square is no landscape — the one-column layout fits everywhere.
    expect(resolveOrientation({ width: 600, height: 600 })).toBe('portrait');
  });

  it('falls back to the media query when the browser does not deliver a viewport', () => {
    expect(resolveOrientation({ mediaIsLandscape: true })).toBe('landscape');
    expect(resolveOrientation({ mediaIsLandscape: false })).toBe('portrait');
  });

  it('reports the portrait when nothing is known', () => {
    // The server render knows neither the viewport nor the media query.
    expect(resolveOrientation({})).toBe('portrait');
    expect(resolveOrientation({ width: 0, height: 0 })).toBe('portrait');
  });
});

describe('resolveGameLayout', () => {
  it('draws one column and the scoreboard as an overlay in the portrait', () => {
    const layout = resolveGameLayout('portrait');

    expect(layout.variant).toBe('portrait');
    expect(layout.columns).toBe(1);
    expect(layout.scoreboardMode).toBe('overlay');
    expect(layout.showScoreboardToggle).toBe(true);
    expect(layout.showSettingsToggle).toBe(true);
    expect(layout.showInlineSettings).toBe(false);
  });

  it('draws two columns and the scoreboard as a column in the landscape', () => {
    const layout = resolveGameLayout('landscape');

    expect(layout.variant).toBe('landscape');
    expect(layout.columns).toBe(2);
    expect(layout.scoreboardMode).toBe('column');
    expect(layout.showScoreboardToggle).toBe(false);
    expect(layout.showSettingsToggle).toBe(false);
    expect(layout.showInlineSettings).toBe(true);
  });
});

describe('resolveLobbyLayout', () => {
  it('draws one column without a preview in the portrait', () => {
    const layout = resolveLobbyLayout('portrait');

    expect(layout.variant).toBe('portrait');
    expect(layout.columns).toBe(1);
    expect(layout.showPreview).toBe(false);
  });

  it('draws two columns with a preview in the landscape', () => {
    const layout = resolveLobbyLayout('landscape');

    expect(layout.variant).toBe('landscape');
    expect(layout.columns).toBe(2);
    expect(layout.showPreview).toBe(true);
  });
});
