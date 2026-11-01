import type { Page } from '@playwright/test';
import en from '../../src/i18n/locales/en.json';
import de from '../../src/i18n/locales/de.json';
import { DEFAULT_GAME_CONFIG } from '../../src/config/default-game-config';

export async function setupGame(
  page: Page,
  baseURL: string | undefined,
  mode = 'timeline',
  language: 'de' | 'en' = 'en'
) {
  await page.addInitScript(
    ({ config, selectedMode, language }) => {
      localStorage.setItem('i18nextLng', language);
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
    { config: DEFAULT_GAME_CONFIG, selectedMode: mode, language }
  );
  await page.goto(
    `${(baseURL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')}/lobby`
  );
  // The development toolbar is not part of the product under test.
  await page.addStyleTag({
    content: 'nextjs-portal { display:none !important; }',
  });
}

export async function startGame(page: Page, language: 'de' | 'en' = 'en') {
  const copy = language === 'de' ? de : en;
  await page.getByRole('button', { name: copy.lobby.quickSetup }).click();
  await page.getByRole('button', { name: copy.lobby.startNow }).click();
  await page.locator('.drawing-phase button').click();
}
