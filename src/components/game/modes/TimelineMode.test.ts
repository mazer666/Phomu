// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TimelineMode } from './TimelineMode';
import { useGameStore } from '@/stores/game-store';
import { DEFAULT_GAME_CONFIG } from '@/config/default-game-config';
import type { RoundQuestion } from '@/core/types';
import '@/i18n/config';
const service = vi.hoisted(() => ({
  submit: vi.fn(),
  applyCheat: vi.fn(),
  dropTimelineYear: vi.fn(),
}));
vi.mock('@/core/session-service', () => service);
const question: RoundQuestion = {
  phase: 'question',
  roundNumber: 1,
  mode: 'timeline',
  hints: [],
  options: [],
  identity: null,
  pointsPossible: 4,
  answersLocked: false,
  songId: 'example',
  media: {
    youtube: '',
    youtubeAlternatives: [],
    spotify: null,
    spotifyFreePreview: null,
    amazonMusic: null,
    amazonPrimePreview: null,
    coverLink: null,
    startSeconds: 0,
    endSeconds: 0,
  },
  context: { timelineYears: [1970, 1980, 1990], genre: '', pack: null },
};

describe('Timeline submission', () => {
  let element: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    useGameStore.setState({
      timelineYears: question.context.timelineYears,
      config: { ...DEFAULT_GAME_CONFIG, noCheatMode: true },
    });
    element = document.createElement('div');
    document.body.appendChild(element);
    root = createRoot(element);
    await act(async () => {
      root.render(createElement(TimelineMode, { question, onAnswer: vi.fn() }));
    });
    act(() => {
      element.querySelector<HTMLButtonElement>('[data-slot="0"]')!.click();
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    element.remove();
  });

  it('keeps the card and confirmation usable after a rejected submission', async () => {
    service.submit.mockRejectedValueOnce(new Error('temporarily unavailable'));
    await act(async () => {
      element
        .querySelector<HTMLButtonElement>('.phomu-primary-action')!
        .click();
    });
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      element.querySelector<HTMLButtonElement>('.phomu-primary-action')!
        .disabled
    ).toBe(false);
    expect(
      element.querySelector('[data-slot="0"]')!.getAttribute('aria-pressed')
    ).toBe('true');
    expect(element.querySelector('.phomu-card-back')).not.toBeNull();
    expect(element.querySelector('.timeline-answer-card')).toBeNull();
  });

  it('submits only once when confirmation is pressed twice before the render', async () => {
    service.submit.mockImplementation(() => new Promise(() => undefined));
    await act(async () => {
      const confirm = element.querySelector<HTMLButtonElement>(
        '.phomu-primary-action'
      )!;
      confirm.click();
      confirm.click();
    });
    expect(service.submit).toHaveBeenCalledTimes(1);
    expect(
      element.querySelector<HTMLButtonElement>('.phomu-primary-action')!
        .disabled
    ).toBe(true);
  });
});
