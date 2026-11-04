import { test, expect } from '@playwright/test';
import { setupGame, startGame } from './support/game';

test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

for (const viewport of [
  { width: 360, height: 780 },
  { width: 780, height: 360 },
]) {
  // WHY two tests and not one: the overlay dismisses itself after five
  // seconds. A test that measures the overlay *and* then dismisses it by
  // tapping has to do both within that window — and a screenshot of the
  // whole page needs seconds on a slow file system. The two tests each do
  // their part quickly, and neither waits for the other.
  test(`Timeline answer feedback is visible after a touch submission at ${viewport.width}x${viewport.height}`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    await setupGame(page, baseURL, 'timeline', 'de');
    await startGame(page, 'de');
    const question = page.locator('.question-phase');
    await question.locator('[data-slot="0"]').tap();
    await page.locator('.phomu-primary-action').tap();
    const feedback = page.getByRole('button', {
      name: 'Feedback schließen',
      exact: true,
    });
    await expect(feedback).toBeVisible();
    await expect
      .poll(() =>
        feedback.evaluate((el) => Number(getComputedStyle(el).opacity))
      )
      .toBeGreaterThan(0.95);
    await expect
      .poll(() =>
        feedback.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2
            )
          );
        })
      )
      .toBe(true);
    const box = await feedback.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    // WHY the element and not the page: the screenshot of the whole page
    // takes seconds, and the overlay only lives five seconds. The element
    // shows the same thing and costs a fraction of the time.
    await feedback.screenshot({
      path: `/tmp/phomu-feedback-timeline-${viewport.width}.png`,
    });
  });

  test(`the Timeline feedback can be dismissed by a tap at ${viewport.width}x${viewport.height}`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    await setupGame(page, baseURL, 'timeline', 'de');
    await startGame(page, 'de');
    const question = page.locator('.question-phase');
    await question.locator('[data-slot="0"]').tap();
    await page.locator('.phomu-primary-action').tap();
    const feedback = page.getByRole('button', {
      name: 'Feedback schließen',
      exact: true,
    });
    await expect(feedback).toBeVisible();
    await feedback.tap();
    await expect(feedback).toBeHidden();
  });
}

test('Timeline feedback survives quick continuation into the next round', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await setupGame(page, baseURL, 'timeline', 'de');
  await startGame(page, 'de');
  const action = page.locator('.phomu-primary-action');
  await page.locator('[data-slot="0"]').tap();
  await action.tap();
  const feedback = page.getByRole('button', {
    name: 'Feedback schließen',
    exact: true,
  });
  await expect(feedback).toBeVisible();
  await action.tap();
  await page.locator('.game-utilities [data-testid="next-round"]').tap();
  await expect(page.locator('.drawing-phase')).toBeVisible();
  await expect(feedback).toBeVisible();
  await feedback.tap();
  await expect(feedback).toBeHidden();
});
