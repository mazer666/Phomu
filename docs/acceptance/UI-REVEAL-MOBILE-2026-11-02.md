# Mobile reveal continuation — 2026-11-02

Scope: UI-023 and GAME-001. The reported stop at the German scoring heading
“Kassiert!” belongs to the web reveal screen; the heading is a translated variant.

## Cause and correction

The content-heavy question CSS also matched reveal containers, applying
`min-height: min-content` and disabling flex shrinking. This expanded the reveal
beyond the available viewport. Its nested scroll area contained touch scrolling,
while the continuation action could sit below the screen. Programmatic
`scrollIntoView()` in the older reachability checks concealed this condition.

`src/styles/interface.css` now limits those expansion rules to question and
locked-in phases. The reveal uses its existing bounded flex layout and inner
content scrollport. Its outer phase does not scroll; the action remains outside
the scrolling solution and scores. No scoring or core transition rule changes.

## Regression method

`e2e/reveal-mobile.spec.ts` starts real games through the lobby and uses the real
WASM core. It reveals each standalone mode, measures the continuation action
**before** calling any programmatic scroll helper, rotates/resizes the mobile
viewport, taps continuation and draws the next question. Timeline also exercises
a table of eight players added through the lobby UI.

The viewport matrix is defined in the test: Galaxy S23-sized portrait and
landscape, reduced portrait height for browser chrome, and smaller phones.
Touch input and mobile rendering are enabled. The test checks the action's
viewport bounds and minimum touch height, plus all reveal controls' ancestor
clipping. Screenshots are written under `/tmp/phomu-reveal-<mode>.png`.

This is Chromium mobile emulation, not a physical Samsung Galaxy S23 or a
Samsung Internet certification. Third-party playback is outside this check.

## Observed results

- Before the fix: the Hint-Master regression failed its viewport-bound assertion
  with the original `interface.css`, even after waiting for animations to settle.
  Command: `npx playwright test -c /tmp/phomu-playwright.config.ts e2e/reveal-mobile.spec.ts --workers=1 -g hint-master --timeout=30000`.
- After the fix: `npx playwright test -c /tmp/phomu-playwright.config.ts e2e/reveal-mobile.spec.ts e2e/mobile-clipping.spec.ts --workers=2`
  — **20 passed**. The temporary config extends `playwright.config.ts`, sets the
  web server working directory to this checkout, and overrides Chromium's
  `executablePath` with `/usr/bin/chromium` and `args: ['--no-sandbox']`.
- Production export, served locally with the `/Phomu` prefix and static RSC
  responses: `E2E_CHROMIUM_PATH=/usr/bin/chromium npx playwright test -c playwright.production.config.ts e2e/reveal-mobile.spec.ts --workers=1 --timeout=30000`
  — **6 passed**.
- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0; existing warnings remain.
- `npm run test` — **33 files / 292 tests passed**, with coverage enabled.
- `npm run check:all` — **12 gates passed**, including translations and doc links.
- `npm run build -- --webpack` — exit 0, including catalogue and WASM generation.
  Rust was installed under `/tmp`; `CARGO_HOME`, `RUSTUP_HOME` and `PATH` selected
  that toolchain. The existing static-export header warnings remain.

The standard Playwright browser download was denied by the environment's network
policy. Tests used the installed Chromium instead. The npm cache was placed
under `/tmp` because the default home cache was not writable.
