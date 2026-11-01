// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicPlayer } from '../MusicPlayer';
import { useGameStore } from '@/stores/game-store';
import type { MusicProvider } from '@/config/game-config';
import { isRevealSwipe } from './SwipeToShow';
import '@/i18n/config';

describe('responsive reveal gesture', () => {
  it('works on a compact rail where the old 150px gesture could never finish', () => {
    expect(isRevealSwipe(62, 132, 44)).toBe(true);
  });
  it('keeps short, leftward and unmeasurable gestures concealed', () => {
    expect(isRevealSwipe(20, 132, 44)).toBe(false);
    expect(isRevealSwipe(-200, 320, 44)).toBe(false);
    expect(isRevealSwipe(0, 0, 0)).toBe(false);
  });
});

describe.each<MusicProvider>([
  'spotify-premium',
  'amazon-music',
  'amazon-music-premium',
])('%s provider overlay', (provider) => {
  let element: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('YT', { Player: vi.fn() });
    useGameStore.setState({ preferredMusicProvider: provider });
    element = document.createElement('div');
    document.body.appendChild(element);
    root = createRoot(element);
    await act(async () => {
      root.render(
        createElement(MusicPlayer, {
          youtubeLink: 'https://www.youtube.com/watch?v=O3pyCGnZzYA',
          spotifyLink: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
          amazonMusicLink: 'https://music.amazon.com/tracks/B073M9NBFP',
          blurred: true,
        })
      );
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    element.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('conceals controls until deliberate reveal, then hides the same iframe again', async () => {
    expect(window.YT?.Player).not.toHaveBeenCalled();
    const frame = element.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(
      element
        .querySelector('[data-provider-player]')!
        .getAttribute('aria-hidden')
    ).toBe('true');
    expect(
      element.querySelector('[data-provider-player]')!.hasAttribute('inert')
    ).toBe(true);
    await act(async () => {
      element
        .querySelector<HTMLButtonElement>('[data-testid="music-swipe-handle"]')!
        .click();
    });
    expect(
      element
        .querySelector('[data-provider-player]')!
        .getAttribute('aria-hidden')
    ).toBe('false');
    expect(element.querySelector('iframe')).toBe(frame);
    expect(
      element.querySelector<HTMLAnchorElement>('.music-player-dialog-note a')
        ?.href
    ).toBe(
      provider === 'spotify-premium'
        ? 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
        : 'https://music.amazon.com/tracks/B073M9NBFP'
    );
    await act(async () => {
      element
        .querySelector<HTMLButtonElement>('.music-player-dialog-header button')!
        .click();
    });
    expect(
      element.querySelector('[data-provider-player]')!.hasAttribute('inert')
    ).toBe(true);
    expect(element.querySelector('iframe')).toBe(frame);
  });
});
