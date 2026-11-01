import base from './playwright.config';

/** Test a static production build served separately, including its deployment prefix. */
const config = {
  ...base,
  webServer: undefined,
  use: {
    ...base.use,
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3102/Phomu',
    launchOptions: process.env.E2E_CHROMIUM_PATH
      ? {
          executablePath: process.env.E2E_CHROMIUM_PATH,
          args: ['--no-sandbox'],
        }
      : undefined,
  },
};
export default config;
