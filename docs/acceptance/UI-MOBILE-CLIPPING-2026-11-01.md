# Mobile clipping follow-up

Date: 2026-11-01. Requirements: UI-011, UI-022 and UI-023.

The added browser checks use Chromium's mobile context with touch enabled and
pixel ratio 3, rather than only changing a desktop viewport's dimensions.
They exercise 320 × 568, 568 × 320, 375 × 667 and 667 × 375 CSS pixels,
plus the game utilities at 1024 × 450. Both portrait and landscape are covered.

## Reproduced problems and changes

- At 320 pixels wide, the German landing-page footer links extended beyond
  the left edge. The footer now respects the available width and wraps links.
- The exiting drawing animation could still occupy a flex row while the
  Timeline question was already mounted, reducing the card table's height.
  The phase container now hides that outgoing row as soon as drawing ends.
  The persistent music player and question/reveal behavior remain unchanged.
- At 568 × 320, Timeline insertion targets were clipped at the bottom.
  The compact-header selector also affected the 3-pixel progress strip,
  adding unwanted vertical padding. It now targets only the header's content
  row. Compact cards no longer spend their limited height on vertical padding.
  Insertion targets retain their full touch size.
- Wide, short screens could hide both the side panel and the game utility
  buttons through competing media queries. Utilities remain visible whenever
  that compact layout hides the side panel.

## Checks

`e2e/mobile-clipping.spec.ts` checks German page navigation and text clipping,
all six concrete question layouts, visible game headers, all six lobby steps,
text staying inside the mode/pack cards and settings with a running game. It checks the real built app and
its catalogue. `e2e/game-table.spec.ts`, `e2e/music-player.spec.ts`,
`e2e/library.spec.ts` and `e2e/reachability.spec.ts` remain the broader baseline.

Production build: `npm run build -- --webpack`.

```sh
E2E_CHROMIUM_PATH=/usr/bin/chromium \
npx playwright test --config playwright.production.config.ts \
  e2e/mobile-clipping.spec.ts e2e/game-table.spec.ts \
  e2e/music-player.spec.ts e2e/library.spec.ts e2e/reachability.spec.ts
```

Results: all 14 additional mobile tests pass. Typecheck, lint (zero errors),
292 Vitest tests and all 12 quality gates pass. The existing 42 browser regression tests pass.

The browser tests use the static production server described in the
[previous responsive verification](UI-RESPONSIVE-2026-11-01.md).
Mobile emulation does not establish physical-device, Safari, browser-toolbar
or software-keyboard acceptance. Device/browser-specific reports still need
those exact conditions reproduced.
