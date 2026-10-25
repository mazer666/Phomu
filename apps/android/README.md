# Phomu — the Android shell

The Android phone and tablet shell of Phomu. The shell is a **renderer and an
input surface**: it draws what the shared Rust base decides and forwards the
actions of the players to it. It contains no rule of the game.

> **The invariant.** The base decides, the shell draws.
> ([`docs/design/PLATFORM-ARCHITECTURE.md`](../../docs/design/PLATFORM-ARCHITECTURE.md) § 1.1,
> [`docs/design/BUILD-CONTRACT.md`](../../docs/design/BUILD-CONTRACT.md) § 2.4.)

---

## 1. What this module is

| | |
|---|---|
| **Language** | Kotlin 2.2.21, Jetpack Compose (BOM 2026.03.01) |
| **Build** | Gradle 8.14.3, Android Gradle Plugin 8.11.2 |
| **Base** | `core/phomu-core` through the UniFFI bridge `platform/phomu-ffi` |
| **Native library** | `libphomu_ffi.so`, built by Cargo for three Android ABIs |
| **Package** | `de.phomu` |
| **Screens** | Lobby, Game, Catalogue, Game over, Settings |

### 1.1 The layers of the shell

```text
de.phomu.ui            the Compose screens, the theme, the navigation
        │
        ▼
de.phomu.game          the controller of a running session, the state of the round
de.phomu.lobby         the state of the lobby wizard
de.phomu.browse        the state of the catalogue screen
de.phomu.settings      the storage of the settings (DataStore, app-scoped)
        │
        ▼
de.phomu.bridge        the only place that talks to the generated bindings
de.phomu.config        the projection of the game constants (generated)
de.phomu.catalogue     the reader of the catalogue artefact
        │
        ▼
platform/phomu-ffi     the generated UniFFI bindings → libphomu_ffi.so
        │
        ▼
core/phomu-core        the rules of the game
```

**The rule that the layers express:** the shell may only reach the base
through the bridge, and the bridge may not contain a rule
(`docs/design/BUILD-CONTRACT.md` § 1.1). The `de.phomu.bridge` package is the
only place in the shell that imports `org.phomu.bridge.*`; a test in the
reviewer's eye can check that with one grep.

### 1.2 What the shell may not do

| Not allowed | Why |
|---|---|
| compute a phase, a score or a winner | the base decides it — `docs/design/PLATFORM-ARCHITECTURE.md` § 1.2 |
| define a game constant | rule K-2 of the build contract; the shell reads a *generated* projection (`de.phomu.config.GeneratedGameConfig`) |
| write a user-visible text that is not in the locale files of the repository | the texts live in `src/i18n/locales/*.json`; the shell **generates** its resources from them |
| decode the intent of a card | the format of a card is a rule of the base (`formats/phomu-qr`) and the bridge exports no entry point for it — see the findings |

---

## 2. The toolchain

Every version is pinned in [`gradle/libs.versions.toml`](gradle/libs.versions.toml).

| Tool | Version | Why this version |
|---|---|---|
| JDK | 17 | the requirement of the Android Gradle Plugin 8.x and of the Kotlin 2.x compiler |
| Gradle | 8.14.3 | the newest release of the 8.x line; the Android Gradle Plugin 8.11 requires Gradle 8.13 or newer |
| Android Gradle Plugin | 8.11.2 | the newest release of the 8.x line that supports `compileSdk 35` |
| Kotlin | 2.2.21 | the Compose compiler plugin is part of the Kotlin plugin since Kotlin 2.0, so the two versions can never drift apart |
| Compose BOM | 2026.03.01 | pins `compose ui 1.10.6`, whose `minCompileSdk` is 35. The BOMs 2026.08.00 and 2026.09.00 pull `compose ui 1.12.1` in, which declares `minCompileSdk 37` |
| `activity-compose` | 1.10.1 | the newest release with `minCompileSdk 35`; 1.11.0 declares 36 |
| `compileSdk` / `targetSdk` | 35 | the platform that is installed: `platforms;android-35` |
| `minSdk` | 24 | the NDK r27 refuses a target below API 21, the Compose libraries of the BOM require API 21, and API 24 is the level from which the behaviour the shell relies on is guaranteed. The `AudioFocusRequest` of API 26 and the immersive mode of API 30 are used conditionally |
| NDK | r27c (`27.3.13750724`) | the version the shell is built and tested with; the compiler wrappers of the NDK are used directly |
| Rust | 1.99.1 (edition 2024) | the toolchain of the Cargo workspace of the repository |
| JNA | 5.17.0 | the UniFFI 0.29 Kotlin bindings call JNA; the AAR carries `libjnidispatch.so` for the Android ABIs |

The `minCompileSdk` values above were read out of the
`META-INF/com/android/build/gradle/aar-metadata.properties` of the published
artefacts — they are measured, not estimated.

### 2.1 Cargo instead of `cargo-ndk`

The build of the native library uses **Cargo directly** and not `cargo-ndk`.

**WHY:** `cargo-ndk` is one more tool to install, to pin and to keep alive,
and the configuration it performs is three environment variables per ABI
(`CARGO_TARGET_<TRIPLE>_LINKER`, `CC_<triple>`, `AR_<triple>`). The Gradle
build performs the same steps itself, so that the artefact is a *declared
input* of the packaging task and a stale library cannot travel into the APK.

The steps are in [`app/build.gradle.kts`](app/build.gradle.kts) (class
`CargoLibraryTask`) and, for the manual path, in
[`scripts/generate-bindings.sh`](scripts/generate-bindings.sh).

---

## 3. The build

### 3.1 Prerequisites

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/workspace/toolchain/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/cmdline-tools/bin:$PATH

# the packages of the SDK
yes | sdkmanager --licenses
sdkmanager 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0' \
            'cmake;3.22.1' 'ndk;27.3.13750724'

# the targets of Rust
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
```

The local configuration of the machine lives in `local.properties`, which is
**not** committed. Copy the example:

```bash
cp local.properties.example local.properties
# adjust sdk.dir and ndk.dir
```

### 3.2 The commands

```bash
cd apps/android

./gradlew --no-daemon :app:assembleDebug        # the APK
./gradlew --no-daemon :app:testDebugUnitTest    # the unit tests of the shell
./gradlew --no-daemon :app:connectedDebugAndroidTest  # the instrumented tests (a device)
```

The build needs **Node 22** on the `PATH`: two generators of the build read
the locale files and the constants of the base
([`scripts/generate-strings.mjs`](scripts/generate-strings.mjs),
[`scripts/generate-config-projection.mjs`](scripts/generate-config-projection.mjs)).

### 3.3 A trap of the Kotlin DSL

> The `plugins { }` block of [`app/build.gradle.kts`](app/build.gradle.kts)
> stands **before** the `import` statements. With the imports first, the
> Kotlin DSL of Gradle fails to extract the plugin block, and the Android
> Gradle Plugin answers with the misleading message
> `does not specify compileSdk` — although the script sets it. The error is
> reproducible: it appears as soon as the import of `javax.inject.Inject`
> stands above the `plugins { }` block.

---

## 4. The bridge

### 4.1 The bindings

The Kotlin bindings of the base are **generated** by the bridge
(`platform/phomu-ffi`) and live in the repository at
`platform/phomu-ffi/bindings/kotlin`. There is exactly one copy of them in
the repository, every shell reads it, and they are never edited by hand
(`docs/design/BUILD-CONTRACT.md` § 2.4, rule B-6).

The module of the shell adds that directory as a source directory:

```kotlin
android.sourceSets.getByName("main").kotlin.srcDir(bridgeBindings)
```

**Decision:** the bindings are **not** copied into `apps/android`. A second
copy would be a second artefact that drifts. The task
`verifyBridgeSurface` compares the functions the bridge declares
(`platform/phomu-ffi/src/surface.rs`) with the functions the bindings contain
and fails the build when one is missing.

### 4.2 The generation of the bindings

```bash
apps/android/scripts/generate-bindings.sh            # debug build
apps/android/scripts/generate-bindings.sh --release  # release build
```

The script

1. builds the bridge for the host,
2. regenerates the Kotlin bindings **in place** in
   `platform/phomu-ffi/bindings/kotlin` through the canonical generator of the
   bridge,
3. builds the native library for the three Android ABIs and copies it into
   `apps/android/app/build/rust/jniLibs/<abi>/libphomu_ffi.so`.

The environment variable `ANDROID_NDK_HOME` points at the NDK; the API level
of the compiler wrappers is taken from `PHOMU_MIN_SDK` (default 24).

### 4.3 The native library

| ABI | Rust target | Directory in the APK |
|---|---|---|
| `arm64-v8a` | `aarch64-linux-android` | `lib/arm64-v8a/libphomu_ffi.so` |
| `armeabi-v7a` | `armv7-linux-androideabi` | `lib/armeabi-v7a/libphomu_ffi.so` |
| `x86_64` | `x86_64-linux-android` | `lib/x86_64/libphomu_ffi.so` |

The library is loaded by JNA, which is why the AAR of JNA is a dependency and
why the rules of the shrinker keep the whole `com.sun.jna` package
([`app/proguard-rules.pro`](app/proguard-rules.pro)).

---

## 5. The resources

### 5.1 The texts

The texts of the shell are **generated** from the locale files of the web
shell:

```text
src/i18n/locales/de.json ─┐
                          ├─► scripts/generate-strings.mjs ─► app/build/generated/res/phomu/
src/i18n/locales/en.json ─┘                              values/strings.xml    (German, default)
                                                          values-en/strings.xml (English)
                                                          …/de/phomu/config/GeneratedStrings.kt
```

* the key `game.feedback.correct` becomes the resource `game_feedback_correct`;
* the plural pair `common.points_one` / `common.points_other` becomes the
  plural `common_points`;
* the placeholder `{{count}}` becomes the format specifier `%1$s` of Android;
* `GeneratedStrings.kt` maps every key onto its resource, so that the shell
  can resolve the keys that arrive at run time — the message key of a
  failure, the tagline key of a pack, the key of a game event.

The generator **fails** when the two locale files do not have the same key
set or when two keys map onto the same resource name.

### 5.2 The catalogue

The catalogue asset is built by the toolchain of the base:

```bash
apps/android/scripts/build-catalogue-asset.sh
```

which runs `cargo run -p catalog-tool -- build src/data/songs --out …` and
merges the pack table into the artefact. The result is
`app/build/generated/assets/catalogue.json` — 1 615 songs, 27 packs,
2.9 MB.

The catalogue is **bundled**, not downloaded: a fresh installation has to
reach the lobby and start a round without a network
(`docs/spec/REQUIREMENTS-PLATFORM.md`, SHELL-116).

### 5.3 The constants

The constants of the game live in `core/phomu-config` and reach the shell as
a **generated projection**
([`scripts/generate-config-projection.mjs`](scripts/generate-config-projection.mjs)),
which rule K-3 of the build contract allows. The projection reads the
constants of the base and, for the values the base has not ported yet, the
reference implementation `src/config/game-config.ts` — the section of the
generated file that carries those values says so.

---

## 6. The platform integration

| Topic | Implementation | File |
|---|---|---|
| Audio focus | `AudioFocusRequest` with `USAGE_MEDIA` / `CONTENT_TYPE_MUSIC`; the music of one provider stops when the next one starts | `platform/AudioFocusController.kt`, `platform/MusicPlayer.kt` |
| Screen awake | `FLAG_KEEP_SCREEN_ON`, only while a round runs | `platform/ScreenPolicy.kt` |
| Immersive mode | the system bars are hidden during the round and come back with a swipe | `platform/ImmersiveModeController.kt` |
| Back button | a confirmation before a running game is left | `game/LeaveGameGuard.kt`, `ui/screens/GameScreen.kt` |
| Orientation | the game is locked to the portrait, the settings lie in both | `platform/ScreenPolicy.kt`, `MainActivity.kt` |
| Reduced motion | `Settings.Global.ANIMATOR_DURATION_SCALE` | `platform/ScreenPolicy.kt` |
| Touch targets | at least 48 dp on every control | `ui/components/PhomuComponents.kt` |
| Screen reader | every icon button carries a `contentDescription` | `ui/components/PhomuComponents.kt` |
| Colour | the state of a round is carried by text as well, never by a colour alone | `ui/screens/GameScreen.kt` |

---

## 7. The tests

| Test | What it proves | Where |
|---|---|---|
| `RoundJourneyTest` | the shell sequences the commands of the base correctly and never carries the solution in the question phase | `src/test/kotlin/de/phomu/RoundJourneyTest.kt` |
| `BridgeRoundTripTest` | a round runs through the **real** `libphomu_ffi.so` | `src/test/kotlin/de/phomu/BridgeRoundTripTest.kt` |
| `BackNavigationTest` | the back button asks before the game ends | `src/test/kotlin/de/phomu/BackNavigationTest.kt` |
| `ReducedMotionTest` | the animations are switched off when the system asks for it | `src/test/kotlin/de/phomu/ReducedMotionTest.kt` |
| `PermissionRequestTest` | the manifest declares no permission beyond the network | `src/test/kotlin/de/phomu/PermissionRequestTest.kt` |
| `QrScannerTest` | the shell never asks the base for the card source and carries no card decoder | `src/test/kotlin/de/phomu/QrScannerTest.kt` |
| `ResponsivenessTest` | the catalogue is read in the background | `src/test/kotlin/de/phomu/ResponsivenessTest.kt` |
| `I18nParityTest` | the key space of the shell equals the key space of the web shell | `src/test/kotlin/de/phomu/I18nParityTest.kt` |
| `BridgeInstrumentedTest` | a round runs on a device with the packaged library | `src/androidTest/kotlin/de/phomu/bridge/BridgeInstrumentedTest.kt` |

**NOT RUN in the sandbox:** the instrumented test. The sandbox has no
emulator and no device; `connectedDebugAndroidTest` needs one. The same
journey is covered by `BridgeRoundTripTest` against the host build of the
same crate.

---

## 8. Known limits of this milestone

1. **The catalogue screen shows the identifier of a song, not its title.**
   The song summary of the bridge carries the identifier, the difficulty, the
   packs and two flags — no title, no artist, no year
   (`platform/phomu-ffi/src/dto.rs`, `PhomuSongSummary`). The web shell shows
   the title; the native shell cannot until the base exports a browse view.
2. **The Timeline mode and the Lyrics mode cannot be answered.** The
   question view model of the bridge carries the options as plain strings.
   The slots of the Timeline mode are not part of it, and the flag that marks
   the invented line of the Lyrics mode is dropped on the way. The shell
   shows the question and refuses to send a wrong answer.
3. **The scan of a card is off.** The bridge exports no entry point for the
   intent of a card, and the format of the card is a rule of the base. The
   lobby offers the random draw; the camera permission is therefore not
   declared at all.
4. **The fallback chain of the media does not run.** The bridge exports the
   plan of the base but no way to report the outcome of a source, so the
   shell cannot ask the base for the next candidate.
5. **A session does not survive a restart.** The bridge exports no
   serialisation of a session and no list of the fields that may be
   persisted, so the shell cannot rehydrate a running game.
6. **The performance budgets are not measured.** The budgets of
   `PERF-101` … `PERF-112` need a reference device; the sandbox has none.

The findings against the base are listed in the delivery report of the
track.

---

## 9. The related documents

| Document | Relation |
|---|---|
| [`docs/design/PLATFORM-ARCHITECTURE.md`](../../docs/design/PLATFORM-ARCHITECTURE.md) | the architecture of the family of apps |
| [`docs/design/BUILD-CONTRACT.md`](../../docs/design/BUILD-CONTRACT.md) | the binding contract between the base and the shells |
| [`docs/spec/REQUIREMENTS-PLATFORM.md`](../../docs/spec/REQUIREMENTS-PLATFORM.md) | the requirements `SHELL-103`, `PLAT-105` … `PLAT-122`, `A11Y-105`, `A11Y-106`, `PERF-109` |
| [`docs/adr/ADR-0005-shared-rust-core-with-platform-frontends.md`](../../docs/adr/ADR-0005-shared-rust-core-with-platform-frontends.md) | the decision this shell implements |
| [`docs/adr/ADR-0008-abi-version-and-the-exported-surface.md`](../../docs/adr/ADR-0008-abi-version-and-the-exported-surface.md) | the exported surface and the bracket of the shell |
