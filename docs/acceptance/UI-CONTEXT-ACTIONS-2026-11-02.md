# Contextual mobile actions and Timeline helpers — 2026-11-02

Scope: UI-023, GAME-021 and GAME-022. The footer has one row: Points, the
current primary action, Settings. Draw, Reveal, Continue and Results use that
middle position. Choices, hints and corrections stay with the content.

## Presentation

`GameAction` moves the real button to `GameActionSlot` using a React portal when
the utility bar is displayed. The mode retains its handler, availability and
disabled state. Desktop renders the same control inline. The active-phase guard
removes actions from the question that remains mounted under the reveal.
A new question is not mounted merely because the viewport rotates.

Coverage includes drawing, Timeline submission and its intermediate continuation,
generic reveal, Lyrics confirmation, Cover Confusion continuation, final reveal
continuation and the results action. Short labels come from both locale files.

## Timeline helpers

The short-screen selector `.timeline-heading p:last-child` unintentionally hid
the decade hint's paragraph. The existing real-WASM browser test failed its
visibility assertion with that rule. The selector now targets only the result
subtitle, and the compact hint row reserves room for its helper controls.

A second reproducible failure occurred when combining the decade hint and joker:
the core rejected the second helper because one shared `cheat_used` flag guarded
both. GAME-021 and GAME-022 each allow their respective helper once per round.
Separate internal Timeline usage flags now enforce those independent limits;
the general flag remains available for existing scoring logic. No constant,
wire format or persisted state changes. The WASM artefact is rebuilt alongside
the core change.

`timeline_helpers_each_work_once_in_either_order` in the core session tests
failed before the fix. It checks both orders, the configured combined penalty,
duplicate rejection without an extra charge, removal of a wrong slot and
availability again in the next round. `e2e/timeline-hint.spec.ts` exercises the
same combination through actual touch controls and the WASM core, retaining
readable hint text across rotation.

## Verification method

- `e2e/primary-action.spec.ts` checks the exact footer order through drawing,
  disabled/enabled Timeline Reveal, intermediate Continue, reveal Continue and
  the next draw. It checks desktop fallback and preservation of a selected slot.
- `e2e/reveal-mobile.spec.ts` exercises all standalone modes, the longer score
  list, English labels and every theme. `e2e/feedback-mobile.spec.ts` retains the
  overlay regression coverage while actions move between their content/footer.
- Typecheck, lint, the complete Vitest suite and all quality gates are required.
- `cargo test --workspace` validates the shared core and both bridges.
- The production export is built with `npm run build -- --webpack` and served
  locally with its `/Phomu` prefix and static RSC responses. Browser tests use
  the repository production config with `E2E_CHROMIUM_PATH=/usr/bin/chromium`.

Chromium mobile emulation does not certify a physical Samsung Galaxy S23 or
Samsung Internet. Existing development CSP warnings can create a developer
dialog that interferes with generic dialog selectors; those dialog checks are
therefore also verified against the production export.

## Final observed results

- `E2E_CHROMIUM_PATH=/usr/bin/chromium npx playwright test -c playwright.production.config.ts e2e/primary-action.spec.ts e2e/timeline-hint.spec.ts e2e/reveal-mobile.spec.ts e2e/feedback-mobile.spec.ts e2e/game-table.spec.ts e2e/music-player.spec.ts --workers=2 --timeout=60000`
  — 43 passed against the production export. Both previously affected generic
  dialog checks pass here without the development error dialog.
- `cargo test --workspace` — exit 0. Summing the passed counts in the command's
  `test result: ok` summaries gives 338 passed entries, including doctests.
- `npm run typecheck`, `npm run lint`, `npm run test` and `npm run check:all`
  — exit 0; 298 Vitest tests in 34 files and all 12 quality gates passed.
- `npm run build -- --webpack` — exit 0, including the rebuilt real WASM core.
  Existing lint, whole-repository formatting and static-export header warnings
  remain; the push hook treats the formatting check as non-blocking.
