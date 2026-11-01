# Card table and Mix-Tape validation

Date: 2026-11-01. Scope: [CR-0003](../cr/CR-0003-card-table-and-mix-tape.md), GAME-017, UI-011–013, UI-019–022 and the primary mode selection.

## Verified in this cloud environment

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with warnings, no errors |
| `npm run test` | 283 tests passed across 30 files |
| `cargo test --workspace --locked` | 335 tests passed; no failures |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | Passed |
| `npm run build` | Next.js static export and Rust/WASM build passed |
| `npm run check:all` | All 12 gates passed; existing legacy-size and rehydration warnings remain |
| `npm audit --omit=dev --audit-level=moderate` | No vulnerabilities reported |
| Android Kotlin compilation | Passed using the repository Gradle wrapper, full JDK and Android SDK 35 |
| Android `:app:testDebugUnitTest` | 18 JVM tests passed, including the real Rust host bridge |
| `e2e/game-table.spec.ts` | Nine Chromium browser tests passed against the static production export |

The browser checks cover Timeline placement and confirmation at 360×640, 640×360, 390×844, 844×390, 768×1024, 1024×768 and 1920×1080 under all four themes. They verify retained selection across rotation, visible confirmation, readable card-rail height, no horizontal document overflow and hidden native rail scrollbars. All six setup steps retain reachable navigation on portrait and landscape phones. Independent Hint-Master, Lyrics, Vibe-Check, Survivor and Cover Confusion rounds accept answers, reveal and continue; the Timeline check also submits and reveals. Mix-Tape plays Vibe-Check, Survivor and Cover Confusion as separate successive rounds.

The static test server resolves clean routes to the generated `.html` files before considering RSC directories. A plain `python -m http.server` does not implement that production routing behavior for exports without trailing slashes. The production base path and WASM/catalogue/artwork paths were checked together.

Android commands excluded `:app:cargoLibraryarm64_v8a`, `:app:cargoLibraryarmeabi_v7a` and `:app:cargoLibraryx86_64`; an Android NDK is not installed here. The JVM bridge uses the actual host `libphomu_ffi.so`. These are compilation and host-test results, not an APK or emulator acceptance.

## Regression coverage

- `timeline_packs.rs`: selected packs, combined selections, empty filter, legacy aliases, missing packs, tiny-pack adjacency and preservation of existing anchors.
- `mix_tape.rs`: one concrete mode per round, rotation, capped budget/award and preserved standalone scoring.
- `useCoreSession.test.ts`: public core years replace stale shell years without a second independent sampler.
- `TimelineSlots.test.ts`: public positions, accessible labels, locked positions and no song identity on an unrevealed sleeve.
- `TimelineMode.test.ts`: a rejected submission remains retryable, and repeated confirmation cannot submit twice.

## Still unverified

Physical devices and emulator screenshots, TalkBack/VoiceOver journeys, extreme font scaling/browser zoom, third-party playback reliability and real-party usability were not accepted by these checks. No claim of full accessibility or all-device certification is made. The next useful validation is an actual group playing through handoffs and reveals on Android and mobile browsers in both orientations.
