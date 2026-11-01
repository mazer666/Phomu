// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FeedbackOverlay } from './FeedbackOverlay';
import { PHOMU_CONFIG } from '@/config/game-config';
import '@/i18n/config';
let element: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  element = document.createElement('div');
  document.body.append(element);
  root = createRoot(element);
});
afterEach(() => {
  act(() => root.unmount());
  element.remove();
  vi.useRealTimers();
});
it('shows the first correct answer again in later rounds after dismissal', () => {
  act(() =>
    root.render(
      createElement(FeedbackOverlay, { isCorrect: true, triggerKey: '1:1' })
    )
  );
  const button = document.body.querySelector('button')!;
  expect(button.textContent).not.toMatch(/10s|5s|Auto in|Automatisch/);
  act(() => button.click());
  act(() =>
    root.render(
      createElement(FeedbackOverlay, { isCorrect: null, triggerKey: '2:0' })
    )
  );
  act(() =>
    root.render(
      createElement(FeedbackOverlay, { isCorrect: true, triggerKey: '2:1' })
    )
  );
  expect(document.body.querySelector('button')).not.toBeNull();
});
it('dismisses after five seconds and does not reset the timer on a rerender', () => {
  const onComplete = vi.fn();
  const props = { isCorrect: true, triggerKey: '1:1', onComplete };
  act(() => root.render(createElement(FeedbackOverlay, props)));
  act(() => vi.advanceTimersByTime(PHOMU_CONFIG.FEEDBACK_AUTO_DISMISS_MS - 1));
  expect(onComplete).not.toHaveBeenCalled();
  act(() => root.render(createElement(FeedbackOverlay, { ...props })));
  act(() => vi.advanceTimersByTime(1));
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(document.body.querySelector('button')).toBeNull();
});
