import { test, expect, type Page } from '@playwright/test';
import { DEFAULT_GAME_CONFIG } from '../src/config/default-game-config';

async function setup(
  page: Page,
  baseURL: string | undefined,
  mode = 'timeline'
) {
  await page.addInitScript(
    ({ config, selectedMode }) => {
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem(
        'phomu-game-state',
        JSON.stringify({
          state: {
            players: [
              {
                id: 'layout-player',
                name: 'Alex',
                score: 0,
                isPilot: true,
                isEliminated: false,
                isSpectator: false,
                avatar: 'note',
              },
            ],
            teams: [],
            config: { ...config, selectedModes: [selectedMode] },
            currentRound: 0,
          },
          version: 0,
        })
      );
    },
    { config: DEFAULT_GAME_CONFIG, selectedMode: mode }
  );
  await page.goto(
    `${(baseURL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')}/lobby`
  );
  // The development toolbar is not part of the product under test.
  await page.addStyleTag({
    content: 'nextjs-portal { display:none !important; }',
  });
}

async function start(page: Page) {
  await page.getByRole('button', { name: 'Quick setup →' }).click();
  await page.getByRole('button', { name: "LET'S GO!" }).click();
  await page.locator('.drawing-phase button').click();
}

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
  if (['survivor', 'vibe-check', 'hint-master'].includes(mode)) {
    await question.getByRole('button', { name: /reveal/i }).click();
  }
  await expect(page.getByTestId('next-round')).toBeVisible();
  await page.getByTestId('next-round').click();
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

test('all setup steps keep navigation reachable on portrait and landscape phones', async ({ page, baseURL }) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 640, height: 360 }]) {
    await page.setViewportSize(viewport);
    await setup(page, baseURL);
    for (let step = 1; step <= 6; step++) {
      const footer = await page.locator('.lobby-wizard-footer').boundingBox();
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(await page.locator('.lobby-wizard-content').evaluate((el) => el.clientHeight)).toBeGreaterThan(60);
      if (step < 6) await page.getByRole('button', { name: 'Next →', exact: true }).click();
      else await expect(page.getByRole('button', { name: "LET'S GO!" })).toBeVisible();
    }
  }
});
