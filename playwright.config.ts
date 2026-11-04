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
  // WHY the expectation timeout is fifteen seconds: the default of five
  // seconds measures the *expectation*, not the application. A development
  // server that has to compile a route for the first time needs longer than
  // that — and a test that fails on a slow runner teaches people to ignore
  // the gate instead of fixing the application.
  expect: {
    timeout: 15_000,
  },
  // WHY two workers on the runner: the development server of the test needs
  // a core of its own, and the suite of the repository has seventy-four
  // tests. With one worker it needs about fifteen minutes. Two workers
  // halve that, and the runner has four cores. Locally the default of
  // Playwright applies, because a laptop that compiles the shell at the
  // same time is the slower machine.
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    // WHY the empty base path: the test walks through the pages of the
    // product — without the base path they stand at the root, and the
    // routes of the test are the routes of the product.
    env: { NEXT_PUBLIC_BASE_PATH: '' },
  },
};
