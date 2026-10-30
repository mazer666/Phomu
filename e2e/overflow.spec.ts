import { test, expect } from '@playwright/test';

/**
 * The screens of the game fit on the screen.
 *
 * WHAT: the test of the overflow — no screen of the product may scroll the
 * page itself. The content that is too long for the screen (the list of the
 * songs, the text of the guide) scrolls in its own area.
 *
 * WHY the test exists: the layout of the game is the difference between a
 * game that works with one thumb and a game that does not. A page that
 * scrolls pushes the buttons out of the reach of the thumb, and the player
 * loses the round.
 *
 * WHY the sizes: the small phone is the narrowest screen of the product, the
 * phone in the landscape is the shortest one, and the desktop is the
 * reference.
 */
const GROESSEN = [
  { name: 'Telefon hoch', width: 390, height: 844 },
  { name: 'Telefon quer', width: 844, height: 390 },
  { name: 'Desktop', width: 1440, height: 900 },
];

const SEITEN = ['/', '/lobby', '/browse', '/settings', '/guide', '/game-over'];

for (const groesse of GROESSEN) {
  test(`the pages fit on the screen — ${groesse.name}`, async ({ page }) => {
    await page.setViewportSize({ width: groesse.width, height: groesse.height });

    for (const pfad of SEITEN) {
      await page.goto(pfad);
      await page.waitForTimeout(600);

      const ueberhang = await page.evaluate(() => {
        const dokument = document.documentElement;
        return dokument.scrollHeight - dokument.clientHeight;
      });

      expect(
        ueberhang,
        `${pfad} scrolls the page by ${ueberhang}px at ${groesse.width}x${groesse.height}`
      ).toBeLessThanOrEqual(4);
    }
  });
}
