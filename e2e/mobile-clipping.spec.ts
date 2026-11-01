import { test, expect, type Page } from '@playwright/test';
import { setupGame, startGame } from './support/game';
import { unreachableControls } from './support/reachability';

test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const phones = [
  { width: 320, height: 568 },
  { width: 568, height: 320 },
  { width: 375, height: 667 },
  { width: 667, height: 375 },
];

async function clippedLabels(page: Page): Promise<string[]> {
  return page.locator('body').evaluate((root) =>
    Array.from(root.querySelectorAll<HTMLElement>('button,h1,h2,h3,p,label'))
      .filter((el) => {
        if (
          !el.checkVisibility({ checkVisibilityCSS: true }) ||
          el.closest('[inert]')
        )
          return false;
        const css = getComputedStyle(el);
        return (
          ((el.scrollWidth > el.clientWidth + 2 &&
            /(hidden|clip)/.test(css.overflowX)) ||
            (el.scrollHeight > el.clientHeight + 2 &&
              /(hidden|clip)/.test(css.overflowY))) &&
          css.textOverflow !== 'ellipsis' &&
          css.webkitLineClamp === 'none'
        );
      })
      .map(
        (el) =>
          `${el.tagName}: ${el.textContent?.trim().slice(0, 70)} (${el.clientWidth}x${el.clientHeight}, content ${el.scrollWidth}x${el.scrollHeight})`
      )
  );
}

for (const viewport of phones) {
  test(`mobile pages fit at ${viewport.width}x${viewport.height}`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'de'));
    const findings: string[] = [];
    for (const route of [
      '',
      '/guide',
      '/browse',
      '/lobby',
      '/settings',
      '/settings/audio',
      '/settings/profile',
      '/settings/governance',
      '/settings/game-rules',
      '/settings/account',
      '/privacy',
      '/terms',
    ]) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
      findings.push(
        ...(await unreachableControls(page)).map(
          (issue) => `${route}: ${issue}`
        )
      );
      findings.push(
        ...(await clippedLabels(page)).map((issue) => `${route}: ${issue}`)
      );
      if (route === '/settings') {
        await page
          .getByRole('button', { name: 'Einstellungen', exact: true })
          .click();
        findings.push(
          ...(await unreachableControls(page)).map((issue) => `menu: ${issue}`)
        );
      }
    }
    expect(findings).toEqual([]);
  });
}
for (const mode of [
  'timeline',
  'hint-master',
  'lyrics',
  'vibe-check',
  'survivor',
  'cover-confusion',
]) {
  test(`mobile ${mode} remains readable on short and narrow phones`, async ({
    page,
    baseURL,
  }) => {
    await setupGame(page, baseURL, mode, 'de');
    await startGame(page, 'de');
    await expect(page.locator('.question-phase')).toBeVisible();
    await expect(page.locator('.drawing-phase')).toBeHidden();
    const findings: string[] = [];
    for (const viewport of phones) {
      await page.setViewportSize(viewport);
      await page.locator('header button').first().hover();
      findings.push(
        ...(await unreachableControls(page)).map(
          (issue) => `${viewport.width}x${viewport.height}: ${issue}`
        )
      );
      findings.push(
        ...(await clippedLabels(page)).map(
          (issue) => `${viewport.width}x${viewport.height}: ${issue}`
        )
      );
      const header = await page.locator('.phomu-game > header').boundingBox();
      expect(
        header!.y,
        `${mode} ${viewport.width}: header stays on screen`
      ).toBeGreaterThanOrEqual(0);
      await page.screenshot({
        path: `/tmp/phomu-mobile-${mode}-${viewport.width}.png`,
      });
    }
    expect(findings).toEqual([]);
  });
}

test('wide but short mobile screens retain scoreboard and settings actions', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1024, height: 450 });
  await setupGame(page, baseURL, 'timeline', 'de');
  await startGame(page, 'de');
  await expect(page.locator('.question-phase')).toBeVisible();
  await expect(page.locator('.game-utilities')).toBeVisible();
  expect(await unreachableControls(page, '.game-utilities')).toEqual([]);
});

async function clippedButtonText(page: Page): Promise<string[]> {
  return page.locator('.lobby-wizard-content').evaluate((root) => {
    const findings: string[] = [];
    for (const button of root.querySelectorAll('button')) {
      if (!button.checkVisibility({ checkVisibilityCSS: true })) continue;
      button.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'instant',
      });
      const border = button.getBoundingClientRect();
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (
          !node.textContent?.trim() ||
          node.parentElement?.closest('.truncate,[class*="line-clamp"]')
        )
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if (
          Array.from(range.getClientRects()).some(
            (rect) =>
              rect.left < border.left - 1 ||
              rect.right > border.right + 1 ||
              rect.top < border.top - 1 ||
              rect.bottom > border.bottom + 1
          )
        )
          findings.push(node.textContent.trim());
      }
    }
    return findings;
  });
}
for (const viewport of phones.slice(0, 2)) {
  test(`all lobby steps keep their text inside cards at ${viewport.width}x${viewport.height}`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    await setupGame(page, baseURL, 'timeline', 'de');
    for (let step = 1; step <= 6; step++) {
      await expect.poll(() => clippedButtonText(page)).toEqual([]);
      await expect
        .poll(() => unreachableControls(page, '.lobby-wizard'))
        .toEqual([]);
      if (step < 6)
        await page
          .getByRole('button', { name: 'Weiter →', exact: true })
          .click();
    }
  });
}

test('settings remain fully reachable on small phones during an active game', async ({
  page,
  baseURL,
}) => {
  await setupGame(page, baseURL, 'timeline', 'de');
  await startGame(page, 'de');
  await expect(page.locator('.question-phase')).toBeVisible();
  const settingsPage = await page.context().newPage();
  const findings: string[] = [];
  for (const viewport of phones.slice(0, 2)) {
    await settingsPage.setViewportSize(viewport);
    for (const route of [
      '/settings/audio',
      '/settings/game-rules',
      '/settings/profile',
      '/settings/governance',
      '/settings/account',
    ]) {
      await settingsPage.goto(`${baseURL}${route}`, {
        waitUntil: 'networkidle',
      });
      await expect(
        settingsPage.getByRole('button', { name: /Zum Spiel/ })
      ).toBeVisible();
      findings.push(
        ...(await unreachableControls(settingsPage)).map(
          (issue) => `${viewport.width} ${route}: ${issue}`
        )
      );
    }
  }
  await settingsPage.close();
  expect(findings).toEqual([]);
});
