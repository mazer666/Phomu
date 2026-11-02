import { test, expect } from '@playwright/test';
import { setupGame, startGame } from './support/game';
test.use({ isMobile: true, hasTouch: true });
test('Timeline decade hint stays readable on a short mobile screen and after rotation', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 780, height: 360 });
  await setupGame(page, baseURL, 'timeline', 'de');
  await startGame(page, 'de');
  await page
    .getByRole('button', { name: 'Dekade (−2 Pkt)', exact: true })
    .tap();
  const hint = page.locator('.timeline-heading .max-w-xs p');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText(/\S/);
  for (const viewport of [
    { width: 360, height: 780 },
    { width: 568, height: 320 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(hint).toBeVisible();
    await expect
      .poll(() =>
        hint.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          );
        })
      )
      .toBe(true);
    await page.screenshot({
      path: `/tmp/phomu-decade-hint-${viewport.width}.png`,
    });
  }
  await page.getByRole('button', { name: 'Joker (−1 Pkt)', exact: true }).tap();
  await expect(page.locator('[data-kind="joker"]')).toBeDisabled();
  await expect(
    page.getByText('Joker eingesetzt — 1 Slot weg', { exact: true })
  ).toBeVisible();
  await expect(hint).toBeVisible();
});
