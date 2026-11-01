import { test, expect } from '@playwright/test';
import { unreachableControls } from './support/reachability';

const routes = [
  '',
  '/guide',
  '/browse',
  '/lobby',
  '/settings',
  '/settings/profile',
  '/settings/game-rules',
  '/settings/audio',
  '/settings/account',
  '/settings/governance',
  '/privacy',
  '/terms',
  '/admin/songs',
  '/admin/review',
  '/projector',
  '/game-over',
];
for (const viewport of [
  { width: 360, height: 640 },
  { width: 640, height: 360 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`navigation and controls remain reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem(
        'phomu-game-state',
        JSON.stringify({
          version: 0,
          state: {
            players: [
              {
                id: 'layout',
                name: 'Alex',
                score: 8,
                isPilot: true,
                isEliminated: false,
                isSpectator: false,
              },
            ],
            currentRound: 3,
            winnerId: 'layout',
          },
        })
      );
    });
    const findings: string[] = [];
    for (const route of routes) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
      findings.push(
        ...(await unreachableControls(page)).map(
          (issue) => `${route || '/'}: ${issue}`
        )
      );
    }
    await page.goto(`${baseURL}/settings`);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    findings.push(
      ...(await unreachableControls(page)).map(
        (issue) => `navigation settings panel: ${issue}`
      )
    );
    expect(findings).toEqual([]);
  });
}

test('the clipping measurement distinguishes fixed overlays from truly clipped controls', async ({
  page,
}) => {
  await page.setContent(
    '<div style="height:10px;overflow:hidden"><div style="position:fixed;top:30px;left:30px"><button style="width:100px;height:48px">Fixed overlay</button></div><button style="width:100px;height:48px">Clipped action</button></div>'
  );
  const findings = await unreachableControls(page);
  expect(findings.some((issue) => issue.startsWith('Fixed overlay'))).toBe(
    false
  );
  expect(findings.some((issue) => issue.startsWith('Clipped action'))).toBe(
    true
  );
});
