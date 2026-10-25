/**
 * @vitest-environment jsdom
 *
 * Component test for the Tooltip.
 *
 * Why this file exists: the coverage denominator now spans the whole
 * `src/**` tree (QA-TST-001), which includes React components. Component
 * tests need a DOM, so `jsdom` is a devDependency and a test file opts into
 * the DOM with the `@vitest-environment` docblock above. This file is the
 * proof that the environment is installed and wired: it mounts a real
 * component from the application.
 *
 * The Tooltip is the subject because it depends on neither the game store
 * nor the i18n layer — it is a pure view component.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Tooltip } from '@/components/ui/Tooltip';

// The texts are constants and not inline JSX text: the i18n gate
// (scripts/check-i18n-completeness.mjs) reports every literal text in a
// TSX file, and these are test fixtures, not interface texts.
const TRIGGER_TEXT = 'Ausloeser';
const TOOLTIP_TEXT = 'Der Hinweis';

describe('Tooltip', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // React 19 only allows act() outside a test renderer when this flag is set.
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderTooltip() {
    act(() => {
      root.render(
        <Tooltip content={TOOLTIP_TEXT}>
          <button type="button">{TRIGGER_TEXT}</button>
        </Tooltip>
      );
    });
  }

  it('renders the trigger and keeps the content hidden before the interaction', () => {
    renderTooltip();

    expect(container.textContent).toContain(TRIGGER_TEXT);
    expect(container.textContent).not.toContain(TOOLTIP_TEXT);
  });

  it('shows the content while the trigger has the focus', () => {
    renderTooltip();

    const trigger = container.querySelector('button');
    expect(trigger).not.toBeNull();

    act(() => {
      trigger!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });

    expect(container.textContent).toContain(TOOLTIP_TEXT);
  });

  it('removes the content again after the focus is lost', async () => {
    renderTooltip();

    const trigger = container.querySelector('button')!;

    act(() => {
      trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    expect(container.textContent).toContain(TOOLTIP_TEXT);

    act(() => {
      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });

    // The exit animation of framer-motion has to run out before the element
    // leaves the tree. The spring settles well inside this window.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });

    expect(container.textContent).not.toContain(TOOLTIP_TEXT);
  });
});
