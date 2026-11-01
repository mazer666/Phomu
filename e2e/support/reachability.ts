import type { Page } from '@playwright/test';

/** Scroll every real control into view and measure clipping by the viewport and its ancestors. */
export async function unreachableControls(
  page: Page,
  scope = 'body'
): Promise<string[]> {
  return page.locator(scope).evaluate((root) => {
    const findings: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type=hidden]), select, textarea'
    )) {
      if (
        el.closest('[inert],nextjs-portal') ||
        !el.checkVisibility({ checkVisibilityCSS: true })
      )
        continue;
      el.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'instant',
      });
      const box = el.getBoundingClientRect();
      let left = Math.max(0, box.left),
        right = Math.min(innerWidth, box.right);
      let top = Math.max(0, box.top),
        bottom = Math.min(innerHeight, box.bottom);
      for (
        let parent = el.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const css = getComputedStyle(parent),
          rect = parent.getBoundingClientRect();
        if (/(hidden|clip|auto|scroll)/.test(css.overflowX)) {
          left = Math.max(left, rect.left);
          right = Math.min(right, rect.right);
        }
        if (/(hidden|clip|auto|scroll)/.test(css.overflowY)) {
          top = Math.max(top, rect.top);
          bottom = Math.min(bottom, rect.bottom);
        }
        // Viewport-fixed overlays escape ordinary ancestor overflow clipping.
        // A transformed/filtered ancestor would instead establish their containing block.
        if (css.position === 'fixed') {
          let containingBlock = false;
          for (
            let ancestor = parent.parentElement;
            ancestor;
            ancestor = ancestor.parentElement
          ) {
            const style = getComputedStyle(ancestor);
            if (
              style.transform !== 'none' ||
              style.filter !== 'none' ||
              style.perspective !== 'none' ||
              /(paint|layout|strict|content)/.test(style.contain)
            )
              containingBlock = true;
          }
          if (!containingBlock) break;
        }
      }
      const name =
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.textContent?.trim().slice(0, 70) ||
        el.tagName;
      if (
        right - left < Math.min(box.width, innerWidth - 16) - 1 ||
        bottom - top < Math.min(box.height, innerHeight - 60) - 1
      )
        findings.push(
          `${name} (${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}x${Math.round(box.height)}, visible ${Math.round(right - left)}x${Math.round(bottom - top)})`
        );
    }
    return findings;
  });
}

/** Compare actual button rectangles, including controls below the current scroll position. */
export async function overlappingButtons(
  page: Page,
  scope: string
): Promise<string[]> {
  return page.locator(scope).evaluate((root) => {
    const buttons = Array.from(
      root.querySelectorAll<HTMLButtonElement>('button')
    ).filter(
      (el) =>
        !el.closest('[inert]') &&
        el.checkVisibility({ checkVisibilityCSS: true })
    );
    const findings: string[] = [];
    for (let first = 0; first < buttons.length; first++) {
      const a = buttons[first].getBoundingClientRect();
      for (let second = first + 1; second < buttons.length; second++) {
        const b = buttons[second].getBoundingClientRect();
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        )
          findings.push(
            `${buttons[first].textContent?.trim()} overlaps ${buttons[second].textContent?.trim()}`
          );
      }
    }
    return findings;
  });
}
