/**
 * Playwright configuration
 *
 * WHY the timeout is 120 seconds and not the usual 30: the smoke test boots
 * the Next.js development server, which on a slow or network-backed file
 * system needs considerably longer than a warmed-up production build. With
 * 30 seconds the test failed intermittently although the application was
 * fine — a flaky gate teaches people to ignore gates. The value is measured
 * in `docs/acceptance/M0-ACCEPTANCE.md`, limitation L5.
 */
export default {
  testDir: './e2e',
  timeout: 120_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
};
