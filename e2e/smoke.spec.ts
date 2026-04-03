import { test, expect } from '@playwright/test';

test('smoke flow: home -> lobby -> game -> game-over -> browse -> settings', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/lobby');
  await expect(page).toHaveURL(/\/lobby$/);

  await page.goto('/game');
  await expect(page).toHaveURL(/\/game$/);

  await page.goto('/game-over');
  await expect(page).toHaveURL(/\/game-over$/);

  await page.goto('/browse');
  await expect(page).toHaveURL(/\/browse$/);

  await page.goto('/settings');
  await expect(page).toHaveURL(/\/settings$/);
});
