# Timeline mobile answer feedback — 2026-11-02

Scope: UI-014/UI-015. The reported missing correct/wrong overlays concerned
Timeline on mobile screens. The compact reveal bar remains Points / Continue /
Settings in one bottom row (UI-023).

## Reproduction and change

The immediate touch-submission checks rendered feedback in both tested mobile
orientations. A reproducible failure occurred when continuing quickly through
reveal into the next round: clearing `currentAnswers` changed the overlay input
to `null` and removed the banner before its original display timer expired.

`FeedbackOverlay` now retains the most recent scored answer event independently
of the current round's answer list. It keeps the original expiry timer and
manual dismissal; a phase change neither dismisses nor replays an event.
The next answer starts a new banner. Scoring and core commands are unchanged.

The banner is visible from its initial animation state rather than beginning
transparent at a tiny scale. Explicit German/English result labels also identify
correct and wrong answers, including a screen-reader status announcement.

## Evidence

- Before the change, `npx vitest run src/components/game/FeedbackOverlay.test.tsx`
  reported 4 failed / 2 passed. Both result types failed the initial-visibility
  and answer-clearing checks. After the change all 6 passed. The test mounts
  the real component with actual translations; animation frames are not needed
  for initial visibility. Fake timers verify the original expiry deadline.
- Before the change, `npx playwright test -c /tmp/phomu-playwright.config.ts e2e/feedback-mobile.spec.ts -g 'survives quick' --workers=1 --timeout=30000`
  failed because the banner disappeared when the next draw opened.
- After the change, `npx playwright test -c /tmp/phomu-playwright.config.ts e2e/feedback-mobile.spec.ts e2e/reveal-mobile.spec.ts e2e/game-table.spec.ts -g 'feedback|banners|reveal keeps|compact continuation' --workers=2`
  reported 11 passed. The temporary config extends the repository config with
  the checkout working directory and `/usr/bin/chromium --no-sandbox`.
- `npm run typecheck`, `npm run lint`, `npm run test` and `npm run check:all`
  passed: 298 tests in 34 files, and all 12 gates. Existing lint warnings remain.
- `npm run build -- --webpack` passed, including the catalogue and Rust/WASM
  build selected using the toolchain under `/tmp`. Existing static-export
  header warnings remain.

The browser regression uses real Timeline touch submissions and the WASM core.
It checks actual opacity, viewport bounds, hit-testing above the game content,
matching the result label to the Timeline judgement, tapping to dismiss and
quick continuation. Screenshots: `/tmp/phomu-feedback-timeline-360.png` and
`/tmp/phomu-feedback-timeline-780.png`.

These checks use Chromium mobile emulation, not a physical Galaxy S23. The
published Cloudflare site remains inaccessible from this environment's network.

Production verification: `E2E_CHROMIUM_PATH=/usr/bin/chromium npx playwright test -c playwright.production.config.ts e2e/feedback-mobile.spec.ts e2e/reveal-mobile.spec.ts e2e/game-table.spec.ts -g 'feedback|banners|reveal keeps|compact continuation' --workers=1 --timeout=30000` — 11 passed.
