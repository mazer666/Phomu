/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import de from '@/i18n/locales/de.json';
import { PHOMU_CONFIG } from '@/config/game-config';
import { FeedbackOverlay } from './FeedbackOverlay';

const i18n = createInstance();
await i18n.init({
  lng: 'de',
  resources: { de: { translation: de } },
  initAsync: false,
});

describe('UI-015 answer feedback', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });
  function render(isCorrect: boolean | null, triggerKey = '1:1') {
    act(() =>
      root.render(
        <I18nextProvider i18n={i18n}>
          <FeedbackOverlay isCorrect={isCorrect} triggerKey={triggerKey} />
        </I18nextProvider>
      )
    );
  }
  function banner() {
    return document.body.querySelector<HTMLButtonElement>('button');
  }

  for (const correct of [true, false]) {
    it(`renders ${correct ? 'correct' : 'wrong'} feedback visibly before animation frames run`, () => {
      render(correct);
      expect(banner()).not.toBeNull();
      expect(banner()!.querySelector('[role="status"]')?.textContent).toBe(
        correct ? 'Richtig!' : 'Falsch!'
      );
      expect(Number(banner()!.style.opacity)).toBe(1);
    });
    it(`retains ${correct ? 'correct' : 'wrong'} feedback when the next round clears the answers`, () => {
      render(correct);
      const text = banner()!.textContent;
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      render(null, '2:0');
      expect(banner()?.textContent).toBe(text);
      act(() => {
        vi.advanceTimersByTime(PHOMU_CONFIG.FEEDBACK_AUTO_DISMISS_MS - 1000);
      });
      expect(banner()).toBeNull();
    });
  }
  it('does not replay dismissed feedback after a phase change; the next answer appears', () => {
    render(true);
    act(() => {
      banner()!.click();
    });
    render(null, '2:0');
    expect(banner()).toBeNull();
    render(false, '2:1');
    expect(banner()).not.toBeNull();
  });
  it('shows no feedback before an answer', () => {
    render(null, '1:0');
    expect(banner()).toBeNull();
  });
});
