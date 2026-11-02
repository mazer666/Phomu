import { test, expect, type Page } from '@playwright/test';
import type { GameMode } from '../src/config/game-config';
import { DEFAULT_GAME_CONFIG } from '../src/config/default-game-config';

test.use({ hasTouch: true });

const devices = [
  { width: 360, height: 640 },
  { width: 640, height: 360 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1920, height: 1080 },
];

async function startPlayer(
  page: Page,
  baseURL: string | undefined,
  provider: string,
  mode: GameMode = 'timeline'
) {
  await page.addInitScript(
    ({ config, preferred }) => {
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem(
        'phomu-game-state',
        JSON.stringify({
          version: 0,
          state: {
            players: [
              {
                id: 'player',
                name: 'Alex',
                score: 0,
                isPilot: true,
                isEliminated: false,
                isSpectator: false,
              },
            ],
            teams: [],
            config,
            currentRound: 0,
            preferredMusicProvider: preferred,
            quickSongId: 'hiphop-tribe-ickit',
          },
        })
      );
    },
    {
      config: { ...DEFAULT_GAME_CONFIG, selectedModes: [mode] },
      preferred: provider,
    }
  );
  await page.goto(
    `${(baseURL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')}/lobby`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.addStyleTag({
    content: 'nextjs-portal { display:none !important; }',
  });
  await page.getByRole('button', { name: 'Quick setup →' }).click();
  await page.getByRole('button', { name: "LET'S GO!" }).click();
  await page.locator('[data-testid="draw-card"]').click();
  if (mode === 'vibe-check')
    await expect(
      page.getByRole('button', { name: 'Open music player', exact: true })
    ).toBeVisible();
  else await expect(page.getByTestId('music-swipe-handle')).toBeVisible();
}

async function swipe(page: Page, fraction: number) {
  // Wait for the real post-rotation layout, rather than measuring during a resize.
  await page.getByTestId('music-swipe-handle').hover();
  const knob = await page.getByTestId('music-swipe-handle').boundingBox();
  const rail = await page.locator('.music-swipe-rail').boundingBox();
  await page.mouse.move(knob!.x + knob!.width / 2, knob!.y + knob!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    knob!.x + knob!.width / 2 + (rail!.width - knob!.width) * fraction,
    knob!.y + knob!.height / 2,
    { steps: 12 }
  );
  await page.mouse.up();
}

for (const provider of [
  'spotify-premium',
  'amazon-music',
  'amazon-music-premium',
]) {
  test(`${provider}: swipe, responsive provider frame and hide across typical devices`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(devices[0]);
    await startPlayer(page, baseURL, provider);
    const frame = page.locator('.music-provider-iframe');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute(
      'src',
      provider === 'spotify-premium'
        ? /open\.spotify\.com\/embed/
        : /music\.amazon\.com\/embed/
    );
    const handle = await frame.elementHandle();
    for (const viewport of devices) {
      await page.setViewportSize(viewport);
      await expect(page.getByTestId('music-swipe-handle')).toBeVisible();
      await expect(page.locator('[data-provider-player]')).toHaveAttribute(
        'inert',
        ''
      );
      await swipe(page, 0.85);
      await expect(
        page.locator('dialog[open]'),
        `${provider}: ${viewport.width}x${viewport.height}`
      ).toBeVisible();
      await expect(page.locator('[data-provider-player]')).toHaveAttribute(
        'aria-hidden',
        'false'
      );
      const dialog = await page.getByRole('dialog').boundingBox();
      expect(dialog!.x).toBeGreaterThanOrEqual(0);
      expect(dialog!.y).toBeGreaterThanOrEqual(0);
      expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(
        viewport.height + 1
      );
      for (const theme of ['jackbox', 'spotify', 'youtube', 'musicwall']) {
        await page.evaluate(
          (name) => (document.documentElement.dataset.theme = name),
          theme
        );
        const contrast = await page
          .locator('.music-player-dialog-header button')
          .evaluate((node) => {
            const style = getComputedStyle(node);
            const luminance = (color: string) => {
              const channels = color
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number)
                .map((value) => {
                  const normalized = value / 255;
                  return normalized <= 0.04045
                    ? normalized / 12.92
                    : ((normalized + 0.055) / 1.055) ** 2.4;
                });
              return (
                channels[0] * 0.2126 +
                channels[1] * 0.7152 +
                channels[2] * 0.0722
              );
            };
            const foreground = luminance(style.color),
              background = luminance(style.backgroundColor);
            return (
              (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05)
            );
          });
        expect(contrast, `${provider}/${theme}`).toBeGreaterThanOrEqual(4.5);
      }
      await page.evaluate(
        () => (document.documentElement.dataset.theme = 'jackbox')
      );
      const close = page.getByRole('button', { name: 'Hide', exact: true });
      expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(
        await frame.evaluate((node, original) => node === original, handle)
      ).toBe(true);
      if (viewport.width === 390 || viewport.width === 844) {
        await page.screenshot({
          path: `/tmp/phomu-${provider}-${viewport.width}.png`,
        });
      }
      await close.click();
      if (viewport.width === 390)
        await page.screenshot({ path: `/tmp/phomu-${provider}-covered.png` });
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page.getByTestId('music-swipe-handle')).toBeVisible();
      await expect(page.locator('[data-provider-player]')).toHaveAttribute(
        'inert',
        ''
      );
    }
  });
}

test('a short swipe stays concealed; keyboard and Escape can open and hide the player', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startPlayer(page, baseURL, 'spotify-premium');
  await swipe(page, 0.2);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('[data-provider-player]')).toHaveAttribute(
    'inert',
    ''
  );
  await page.getByTestId('music-swipe-handle').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('touch swipe reveals the compact landscape player', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startPlayer(page, baseURL, 'amazon-music-premium');
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 1,
  });
  const handle = await page.getByTestId('music-swipe-handle').boundingBox();
  const rail = await page.locator('.music-swipe-rail').boundingBox();
  const x = handle!.x + handle!.width / 2;
  const y = handle!.y + handle!.height / 2;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 12; step++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: x + ((rail!.width - handle!.width) * 0.85 * step) / 12,
          y,
        },
      ],
    });
  }
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.getByRole('button', { name: 'Hide', exact: true }).tap();
  await expect(page.getByTestId('music-swipe-handle')).toBeVisible();
});

test('unconcealed modes retain a visible compact player and an accessible full-player action', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await startPlayer(page, baseURL, 'spotify-premium', 'vibe-check');
  const shell = page.locator('.music-player-shell');
  expect(
    Math.round((await shell.boundingBox())!.height)
  ).toBeGreaterThanOrEqual(64);
  await page
    .getByRole('button', { name: 'Open music player', exact: true })
    .click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open music player', exact: true })
  ).toBeFocused();
});
