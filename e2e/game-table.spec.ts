import { test, expect, type Page } from '@playwright/test';
import {
  unreachableControls,
  overlappingButtons,
} from './support/reachability';
import { setupGame as setup, startGame as start } from './support/game';

test('the card table keeps its placement and action visible across themes and rotation', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, baseURL);
  await start(page);
  const table = page.locator('.timeline-table');
  await expect(table).toBeVisible();
  await page.locator('[data-slot="0"]').click();
  for (const [width, height] of [
    [360, 640],
    [640, 360],
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    for (const theme of ['jackbox', 'spotify', 'youtube', 'musicwall']) {
      await page.evaluate(
        (name) => (document.documentElement.dataset.theme = name),
        theme
      );
      await expect(page.locator('[data-slot="0"]')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      const action = page.locator('.timeline-action .phomu-primary-action');
      await expect(action).toBeVisible();
      const bounds = await action.boundingBox();
      expect(bounds, `${width}x${height}/${theme}`).not.toBeNull();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(
        (await page.locator('.timeline-rail').boundingBox())!.height
      ).toBeGreaterThanOrEqual(48);
      expect(
        await page
          .locator('.timeline-rail')
          .evaluate((el) => getComputedStyle(el).scrollbarWidth)
      ).toBe('none');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
      if (width === 390 && theme === 'jackbox')
        await page.screenshot({ path: '/tmp/phomu-timeline-portrait.png' });
      if (width === 844 && theme === 'musicwall')
        await page.screenshot({ path: '/tmp/phomu-timeline-landscape.png' });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.timeline-action .phomu-primary-action').click();
  await expect(
    page.locator('.timeline-action .phomu-primary-action')
  ).toHaveText(/continue/i);
  await page.locator('.timeline-action .phomu-primary-action').click();
  await expect(table).toBeHidden();
  await expect(page.locator('.game-phase-area')).not.toContainText(
    'Something went wrong'
  );
});

test('setup navigation stays on screen and exposes the standalone modes only when requested', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await setup(page, baseURL);
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  const selector = page.locator('.mode-more-button');
  await expect(selector).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Three modes. One question at a time./ })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /One-Hit-Wonder\?/ })
  ).toHaveCount(0);
  await selector.click();
  await expect(selector).toHaveAttribute('aria-expanded', 'true');
  const footer = await page.locator('.lobby-wizard-footer').boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(360);
});

async function answerMode(page: Page, mode: string) {
  const question = page.locator('.question-phase');
  await expect(question).toHaveAttribute('data-mode', mode);
  if (mode === 'survivor') {
    await question.getByRole('button', { name: /^yes$/i }).click();
  } else if (mode === 'vibe-check') {
    await question.locator('button.py-4.px-2').first().click();
  } else if (mode === 'hint-master') {
    await question
      .getByRole('button', { name: 'SHOW ANSWER', exact: true })
      .click();
    await question.getByRole('button', { name: /^Both/ }).click();
  } else if (mode === 'lyrics') {
    await question.locator('button.font-mono').first().click();
    await question
      .getByRole('button', { name: 'Confirm & reveal', exact: true })
      .click();
  } else if (mode === 'cover-confusion') {
    const original = question.getByRole('button', {
      name: 'ORIGINAL',
      exact: true,
    });
    if (await original.count()) await original.click();
    else {
      await question.getByRole('button', { name: /^I know it!/ }).click();
      await question.getByRole('button', { name: 'YES', exact: true }).click();
    }
    await question.getByRole('button', { name: /CONTINUE/ }).click();
  }
  const feedback = page.getByRole('button', {
    name: 'Close feedback',
    exact: true,
  });
  if (await feedback.isVisible()) await feedback.click();
  if (['survivor', 'vibe-check', 'hint-master'].includes(mode)) {
    await question.getByRole('button', { name: /reveal/i }).click();
  }
  await expect(page.locator('[data-testid="next-round"]:visible')).toBeVisible();
  await page.locator('[data-testid="next-round"]:visible').click();
  await expect(page.locator('.drawing-phase')).toBeVisible();
}

for (const mode of [
  'hint-master',
  'lyrics',
  'vibe-check',
  'survivor',
  'cover-confusion',
]) {
  test(`a real ${mode} round accepts an answer, reveals and continues`, async ({
    page,
    baseURL,
  }) => {
    await setup(page, baseURL, mode);
    await start(page);
    await answerMode(page, mode);
  });
}

test('Mix-Tape takes turns across separate Vibe, Survivor and Cover rounds', async ({
  page,
  baseURL,
}) => {
  await setup(page, baseURL, 'mix-tape');
  await start(page);
  for (const mode of ['vibe-check', 'survivor', 'cover-confusion']) {
    await answerMode(page, mode);
    if (mode !== 'cover-confusion')
      await page.locator('.drawing-phase button').click();
  }
});

test('all setup steps keep navigation reachable on portrait and landscape phones', async ({
  page,
  baseURL,
}) => {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 640, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await setup(page, baseURL);
    for (let step = 1; step <= 6; step++) {
      const footer = await page.locator('.lobby-wizard-footer').boundingBox();
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(
        viewport.height + 1
      );
      expect(
        await page
          .locator('.lobby-wizard-content')
          .evaluate((el) => el.clientHeight)
      ).toBeGreaterThan(60);
      if (step < 6)
        await page.getByRole('button', { name: 'Next →', exact: true }).click();
      else
        await expect(
          page.getByRole('button', { name: "LET'S GO!" })
        ).toBeVisible();
    }
  }
});

test('correct-answer banners return in the next round and disappear after five seconds without a countdown', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await setup(page, baseURL, 'hint-master');
  await start(page);
  for (let round = 0; round < 2; round++) {
    const question = page.locator('.question-phase');
    await question
      .getByRole('button', { name: 'SHOW ANSWER', exact: true })
      .click();
    await question.getByRole('button', { name: /^Both/ }).click();
    const banner = page.getByRole('button', {
      name: 'Close feedback',
      exact: true,
    });
    await expect(banner).toBeVisible();
    await expect(banner).not.toContainText(/Auto in|10s|5s/);
    const box = await banner.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(360);
    if (round === 0) {
      await banner.click();
      await question.getByRole('button', { name: /reveal/i }).click();
      await page.locator('[data-testid="next-round"]:visible').click();
      await page.locator('.drawing-phase button').click();
    } else {
      await expect(banner).toBeVisible();
      await expect(banner).toBeHidden({ timeout: 6500 });
    }
  }
});

for (const language of ['en', 'de'] as const) {
  for (const mode of [
    'timeline',
    'hint-master',
    'lyrics',
    'vibe-check',
    'survivor',
    'cover-confusion',
  ]) {
    test(`every ${language} ${mode} question control remains reachable across rotation`, async ({
      page,
      baseURL,
    }) => {
      await setup(page, baseURL, mode, language);
      await start(page, language);
      for (const [width, height] of [
        [360, 640],
        [640, 360],
        [390, 844],
        [844, 390],
        [768, 1024],
        [1024, 768],
        [1920, 1080],
      ]) {
        await page.setViewportSize({ width, height });
        // Wait for the layout transition after rotation using a real stable control.
        await page.locator('header button').first().hover();
        await expect
          .poll(() => overlappingButtons(page, '.question-phase'))
          .toEqual([]);
        expect(
          await unreachableControls(page, '.question-phase'),
          `${mode} ${width}x${height}`
        ).toEqual([]);
      }
    });
  }
}

test('the player-name focus outline stays within the lobby input in every theme', async ({
  page,
  baseURL,
}) => {
  await setup(page, baseURL);
  for (const [width, height] of [
    [360, 640],
    [640, 360],
    [768, 1024],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    const input = page.locator('.lobby-name-input');
    for (const theme of ['jackbox', 'spotify', 'youtube', 'musicwall']) {
      await page.evaluate(
        (name) => (document.documentElement.dataset.theme = name),
        theme
      );
      await input.click();
      await expect(input).toBeFocused();
      await expect
        .poll(() => input.evaluate((el) => getComputedStyle(el).outlineOffset))
        .toBe('-3px');
      expect(
        await input.evaluate((el) => getComputedStyle(el).outlineStyle)
      ).toBe('solid');
      expect(await unreachableControls(page, '.lobby-wizard-content')).toEqual(
        []
      );
    }
  }
  await page.screenshot({ path: '/tmp/phomu-lobby-name-focus.png' });
});

test('scoreboard and game-settings dialogs remain usable on short and tall screens', async ({
  page,
  baseURL,
}) => {
  await setup(page, baseURL);
  await start(page);
  for (const [width, height] of [
    [360, 640],
    [640, 360],
    [844, 390],
    [768, 1024],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    for (const opener of ['Show scoreboard', 'Open game settings']) {
      const action = page.getByRole('button', { name: opener, exact: true });
      if (!(await action.isVisible())) {
        await expect(page.locator('.game-side-panel')).toBeVisible();
        expect(await unreachableControls(page, '.game-side-panel')).toEqual([]);
        continue;
      }
      await action.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Close', exact: true }).hover();
      expect(await unreachableControls(page, '[role="dialog"]')).toEqual([]);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(dialog).toBeHidden();
    }
  }
});

test('the QR scanner can always be cancelled without granting camera access', async ({
  page,
  baseURL,
}) => {
  await setup(page, baseURL);
  for (const [width, height] of [
    [360, 640],
    [640, 360],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: 'Scan Phomu card' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await unreachableControls(page, '[role="dialog"]')).toEqual([]);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
});
