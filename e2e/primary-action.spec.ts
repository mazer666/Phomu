import { test, expect } from '@playwright/test';
import { setupGame } from './support/game';

test.use({ isMobile: true, hasTouch: true });
test('the same bottom row owns draw, reveal and continuation actions', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await setupGame(page, baseURL, 'timeline', 'de');
  await page
    .getByRole('button', { name: 'Schnell-Setup →', exact: true })
    .tap();
  await page.getByRole('button', { name: 'JETZT STARTEN!', exact: true }).tap();
  const footer = page.locator('.game-utilities');
  await expect(footer.locator('button')).toHaveText([
    'Punkte',
    'Ziehen',
    'Settings',
  ]);
  await footer.getByRole('button', { name: 'Ziehen', exact: true }).tap();
  await expect(footer.locator('button')).toHaveText([
    'Punkte',
    'Auflösen',
    'Settings',
  ]);
  const resolve = footer.getByRole('button', { name: 'Auflösen', exact: true });
  await expect(resolve).toBeDisabled();
  await page.locator('[data-slot="0"]').tap();
  await expect(resolve).toBeEnabled();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(footer).toBeHidden();
  await expect(
    page.locator('.timeline-action .phomu-primary-action')
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(resolve).toBeEnabled();
  await resolve.tap();
  await page
    .getByRole('button', { name: 'Feedback schließen', exact: true })
    .tap();
  await expect(footer.locator('button')).toHaveText([
    'Punkte',
    'Weiter',
    'Settings',
  ]);
  await footer.getByRole('button', { name: 'Weiter', exact: true }).tap();
  await expect(page.locator('.reveal-phase')).toBeVisible();
  await expect(footer.locator('button')).toHaveText([
    'Punkte',
    'Weiter',
    'Settings',
  ]);
  await expect(footer.locator('.game-primary-action')).toHaveCount(1);
  await footer.getByRole('button', { name: 'Weiter', exact: true }).tap();
  await expect(footer.locator('button')).toHaveText([
    'Punkte',
    'Ziehen',
    'Settings',
  ]);
});
