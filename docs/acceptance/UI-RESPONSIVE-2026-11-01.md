# Responsive controls, library art and answer feedback

Date: 2026-11-01. Requirements: UI-011, UI-013, UI-015, UI-022, UI-023,
MEDIA-011, MEDIA-012 and MEDIA-015.

## Changes and regression causes

- The root viewport is fixed. Settings and administration still used
  `min-h-screen`, so their lower controls were clipped by the root. These routes,
  the final-score summary and the library now own bounded scrolling areas.
- Content-heavy question layouts could shrink and center above the scrollable
  area, making the Vibe player and other controls unreachable. Those layouts
  retain their natural content height. Vibe mood choices have explicit gaps,
  and answer highlighting no longer scales a choice over its neighbour.
- The player-name input now draws its focus outline inside its own border,
  preserving the full rounded outline at the lobby scrollport edge.
- Both Rust catalogue readers looked for `coverUrl` only under `links`, although
  the generated catalogue stores it at the root. The root field now wins, with
  the legacy nested fallback retained. Local image paths respect the export
  prefix. Library actions remain visible on touch devices and keyboard focus.
- Feedback dismissal was keyed only by the answer count, which resets each
  round. A round-and-answer identity restores banners in later rounds. The
  configured lifetime is five seconds; the caption only offers dismissal.
  Entrance motion remains, and dismissal removes the banner directly instead
  of depending on an exit animation finishing.
- Spotify, Amazon Prime and Unlimited embeds use the swipe-to-show overlay in
  concealed modes. The reveal threshold adapts to rail width; keyboard and touch
  are covered. The responsive native dialog preserves the same iframe when
  hiding and reopening it. Provider links offer an external playback fallback.

## Automated evidence

- `PHOMU_BUILD_BUNDLER=webpack npm run local-ci`: PASS. Includes typecheck,
  lint, 292 Vitest tests in 33 files, catalogue validation, production export,
  dependency audit, all 12 quality gates and link-matcher tests. Production audit:
  zero vulnerabilities. Whole-repository formatting remains a non-blocking
  warning; existing ESLint warnings are not errors.
- `cargo test --workspace`: PASS, 337 passed test entries including doctests.
  The two bridge cover regressions exercise root precedence, legacy fallback,
  empty root fallback and absent art. The bridges were also rerun after the
  catalogue helper cleanup.
- `cargo clippy --workspace --all-targets -- -D warnings`: PASS.
- Browser final result: PASS, 42 tests.

The production browser command is:

```sh
E2E_BASE_URL=http://127.0.0.1:3102/Phomu \
E2E_CHROMIUM_PATH=/usr/bin/chromium \
npx playwright test --config playwright.production.config.ts \
  e2e/game-table.spec.ts e2e/music-player.spec.ts \
  e2e/library.spec.ts e2e/reachability.spec.ts --workers=2 --timeout=30000
```

Serve the exported `out/` directory separately, mapping `/Phomu` to that root
and extensionless page URLs to their exported `.html` files. Omit
`E2E_CHROMIUM_PATH` to use Playwright's installed Chromium. The separate production
configuration does not start a development server.

The browser tests cover these viewport dimensions:

| Portrait | Landscape |
|---|---|
| 360 × 640 | 640 × 360 |
| 390 × 844 | 844 × 390 |
| 768 × 1024 | 1024 × 768 |
| — | 1920 × 1080 |

The reachability sweep covers 16 non-game routes at each size, including the
seeded final-score view and opened navigation settings. It scrolls real controls
into view and measures viewport and ancestor clipping. Six concrete game modes
are checked in German and English at all seven sizes, including button rectangle
intersection checks. Separate tests play full rounds and the Mix-Tape sequence,
check lobby steps, input focus in four themes, player gestures, provider-frame
identity, dialog bounds, close-button contrast, keyboard dismissal, QR cancel,
settings and scoreboard overlays. Library tests load actual bundled covers and
exercise keyboard scrolling, touch actions and mobile filters.

## Limits and follow-up

These are Chromium browser viewport tests, not physical-device certification.
Safari, a real soft keyboard, native Android/iOS rendering, camera scanning and
provider account playback were not verified by this run. The provider sites are
not available for authenticated playback verification in this cloud environment;
frame routing and Phomu's overlay geometry do not prove full-song playback.

Next useful acceptance work is a short session on a real iPhone and Android
phone, with the intended Spotify/Amazon accounts: open, sign in, play, hide,
rotate, resume and return to the game. Also check the player-name field while
the real soft keyboard is open.

Turbopack's internal worker port is denied by this cloud sandbox even when the
outer command can bind locally. Next's supported Webpack compiler completes the
production build. `PHOMU_BUILD_BUNDLER=webpack` selects that compiler for the
complete local CI and pre-push hook; none of their checks are skipped.
