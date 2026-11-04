import { unreachableControls } from './support/reachability';
import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

for (const viewport of [
  { width: 360, height: 640 },
  { width: 640, height: 360 },
  { width: 1920, height: 1080 },
]) {
  test(`library covers and scrolling at ${viewport.width}x${viewport.height}`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await page.goto(`${baseURL}/browse`);
    const results = page.locator('.browse-results');
    const image = results.locator('img').first();
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
    // WHY the prefix is not part of the expectation: the covers are served
    // from the directory of the public folder, and the prefix in front of
    // it belongs to the deployment — the development server has none, the
    // Pages deployment has `/Phomu`, the Cloudflare deployment none. What
    // matters is that the cover comes from the directory of the covers and
    // not from somewhere else.
    await expect(image).toHaveAttribute(
      'src',
      /\/covers\/[^/]+\.(jpg|jpeg|png|webp)$/
    );
    await expect
      .poll(() => results.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(50);
    await image.scrollIntoViewIfNeeded();
    await expect(page.locator('.song-card-actions').first()).toHaveCSS(
      'opacity',
      '1'
    );
    for (const theme of ['jackbox', 'spotify', 'youtube', 'musicwall']) {
      await page.evaluate(
        (name) => (document.documentElement.dataset.theme = name),
        theme
      );
      expect(
        await page
          .locator('.song-card-content')
          .first()
          .evaluate((el) => {
            const probe = document.createElement('div');
            probe.style.background = 'var(--color-bg-card)';
            document.body.append(probe);
            const expected = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return getComputedStyle(el).backgroundColor === expected;
          })
      ).toBe(true);
    }
    await page.evaluate(
      () => (document.documentElement.dataset.theme = 'jackbox')
    );
    await page.screenshot({
      path: `/tmp/phomu-library-covers-${viewport.width}.png`,
    });
    const filters = page.getByRole('button', {
      name: 'Filter options',
      exact: true,
    });
    if (await filters.isVisible()) {
      await filters.click();
      await expect(page.locator('.browse-sidebar')).toBeVisible();
      expect(await unreachableControls(page, '.browse-sidebar')).toEqual([]);
      await filters.click();
      await expect(page.locator('.browse-sidebar')).toBeHidden();
    }
    await results.focus();
    await page.keyboard.press('PageDown');
    await expect
      .poll(() => results.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await results.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const rect = await results.boundingBox();
    expect(rect!.height).toBeGreaterThan(80);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.screenshot({ path: `/tmp/phomu-library-${viewport.width}.png` });
  });
}
