import { test, expect } from '@playwright/test';
import { setupGame, startGame } from './support/game';
import { unreachableControls } from './support/reachability';

test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

// UI-023 / GAME-001: exercise the real WASM round, including the next draw.
for (const mode of [
  'timeline',
  'hint-master',
  'lyrics',
  'vibe-check',
  'survivor',
  'cover-confusion',
]) {
  test(`${mode} reveal keeps continuation reachable on Galaxy S23 viewports`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await setupGame(page, baseURL, mode, 'de');
    if (mode === 'timeline') {
      for (let index = 2; index <= 8; index++) {
        await page
          .getByRole('textbox', { name: 'Name eingeben …' })
          .fill(`Player ${index}`);
        await page.getByRole('button', { name: '+', exact: true }).tap();
      }
    }
    await startGame(page, 'de');
    const question = page.locator('.question-phase');
    await expect(question).toBeVisible();
    // Finish without an answer through the real core timeout/reveal route.
    // Modes with their own reveal controls require their actual answer flow.
    if (mode === 'timeline') {
      await question.locator('[data-slot="0"]').tap();
      await question.locator('.timeline-action .phomu-primary-action').tap();
      await question.locator('.timeline-action .phomu-primary-action').tap();
    } else if (mode === 'lyrics') {
      await question.locator('button.font-mono').first().tap();
      await question.getByRole('button', { name: /bestätigen/i }).tap();
    } else if (mode === 'cover-confusion') {
      const original = question.getByRole('button', {
        name: 'ORIGINAL',
        exact: true,
      });
      if (await original.count()) await original.tap();
      else {
        await question.getByRole('button', { name: /Ich kenne ihn/ }).tap();
        await question.getByRole('button', { name: 'JA', exact: true }).tap();
      }
      await question.getByRole('button', { name: /WEITER/ }).tap();
    } else {
      await question.getByRole('button', { name: /Reveal/i }).tap();
    }
    const feedback = page.getByRole('button', {
      name: 'Feedback schließen',
      exact: true,
    });
    if (await feedback.isVisible()) await feedback.tap();
    const reveal = page.locator('.reveal-phase');
    await expect(reveal).toBeVisible();
    for (const viewport of [
      { width: 360, height: 780 },
      { width: 360, height: 640 },
      { width: 780, height: 360 },
      { width: 320, height: 568 },
      { width: 568, height: 320 },
    ]) {
      await page.setViewportSize(viewport);
      const action = page.getByTestId('next-round');
      await expect
        .poll(async () => {
          const bounds = await action.boundingBox();
          return (
            !!bounds &&
            bounds.y >= 0 &&
            bounds.y + bounds.height <= viewport.height
          );
        })
        .toBe(true);
      const bounds = await action.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(43.99);
      await expect
        .poll(() => unreachableControls(page, '.reveal-phase'))
        .toEqual([]);
    }
    const content = page.locator('.reveal-content');
    expect(await content.evaluate((el) => el.clientHeight)).toBeGreaterThan(0);
    await page.screenshot({ path: `/tmp/phomu-reveal-${mode}.png` });
    await page.getByTestId('next-round').tap();
    await expect(page.locator('.drawing-phase')).toBeVisible();
    await page.locator('.drawing-phase button').tap();
    await expect(question).toBeVisible();
    await expect(reveal).toHaveCount(0);
  });
}
