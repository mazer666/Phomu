# Release — Android beta

The runbook of the Android track: what a beta is, how it is built, how it is
signed and how it is published. The quality claim of a stage — Alpha, Beta,
Stable — is defined in
[`RELEASE-PLAN.md`](RELEASE-PLAN.md); this document is the *how* of the Beta
stage of the Android track.

---

## 1. What a beta of the Android track is

| | |
|---|---|
| **Artefact** | `phomu-beta.apk` — the shell of the Android track, signed with the key of the track |
| **Channel** | Google Play **internal testing**, then **closed testing** (`RELEASE-PLAN.md` § 2.2.2) |
| **Version** | `android-v<version>`, the version of the shell, e.g. `android-v0.2.0-beta.1` |
| **Record** | [`RELEASE-RECORD-ANDROID.md`](RELEASE-RECORD-ANDROID.md) — the known defects, the testers, the gates |
| **GitHub** | a **prerelease** of the repository — the artefact and the notes are attached to it |

The prerelease flag is not a label: a beta is the quality claim of
`RELEASE-PLAN.md` § 2.2, and the record has to show that the gates of the
stage are met.

---

## 2. What is built

The shell of the Android track against the shared base:

```text
core/phomu-core ──► platform/phomu-ffi ──► libphomu_ffi.so (three ABIs)
                                             │
                                             ▼
                                      apps/android ──► app-release.apk
```

The Gradle build performs the Rust build itself (the task `CargoLibraryTask`),
so the artefact carries the library of the commit that is built — a stale
library cannot travel into the APK.

| ABI | Rust target |
|---|---|
| `arm64-v8a` | `aarch64-linux-android` |
| `armeabi-v7a` | `armv7-linux-androideabi` |
| `x86_64` | `x86_64-linux-android` |

---

## 3. The build

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/workspace/toolchain/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/cmdline-tools/bin:$PATH

yes | sdkmanager --licenses
sdkmanager 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0' \
            'cmake;3.22.1' 'ndk;27.3.13750724'

rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android

cd apps/android
cp local.properties.example local.properties   # sdk.dir and ndk.dir
./gradlew --no-daemon :app:assembleRelease
```

The build needs **Node 22** on the `PATH`: two generators of the build read
the locale files and the constants of the base.

The artefact of the build is **unsigned** — that is the correct intermediate
state. The signing is the job of the release pipeline (§4).

---

## 4. The key of the track

A beta has to be installable **and updatable**: the next beta must be
signed with the same key, otherwise the tester cannot install it over the
old one. The key therefore lives outside the repository, in the secrets of
the repository:

| Secret | Meaning |
|---|---|
| `PHOMU_RELEASE_KEYSTORE` | the key store, base64 encoded |
| `PHOMU_RELEASE_KEYSTORE_PASSWORD` | the password of the key store |
| `PHOMU_RELEASE_KEY_ALIAS` | the alias of the key |
| `PHOMU_RELEASE_KEY_PASSWORD` | the password of the key |

**The key is created once** and never leaves the machine of the owner:

```bash
keytool -genkeypair -v \
  -keystore phomu-release.jks \
  -alias phomu \
  -keyalg RSA -keysize 4096 -validity 10000

base64 -w0 phomu-release.jks | gh secret set PHOMU_RELEASE_KEYSTORE
gh secret set PHOMU_RELEASE_KEYSTORE_PASSWORD --body '<the password>'
gh secret set PHOMU_RELEASE_KEY_ALIAS --body 'phomu'
gh secret set PHOMU_RELEASE_KEY_PASSWORD --body '<the password of the key>'
```

> **Why the base64:** the secret store of GitHub holds text. The key store
> is binary, and a binary that is written into a secret as text does not
> survive the round trip.

The file `phomu-release.jks` belongs to the owner and to nobody else. It is
**not** committed, and it does not go into a backup that leaves the
machine.

---

## 5. The publication

The workflow [`release.yml`](../../.github/workflows/release.yml) does the
whole thing:

1. **Actions → Release → Run workflow** — the track and the version are the
   inputs.
2. The workflow builds the unsigned artefact, signs it with the key of the
   track, checks the signature with `apksigner verify` and publishes a
   **prerelease** with the artefact and the notes attached.
3. The record ([`RELEASE-RECORD-ANDROID.md`](RELEASE-RECORD-ANDROID.md)) is
   updated: the version, the commit, the known defects, the testers.

```bash
gh release list                       # the releases of the track
gh release download android-v0.2.0-beta.1   # the artefact
```

---

## 6. What the beta still does not have

The known limits of the track are listed in the record. The two that shape
the experience of a tester:

1. **The Timeline mode and the Lyrics mode cannot be answered** — the
   question view model of the bridge carries the options as plain strings;
   the slots of the timeline and the flag that marks the invented line are
   not part of it. The shell shows the question and refuses to send a wrong
   answer.
2. **The catalogue screen shows the identifier of a song**, not its title:
   the summary of the bridge carries the identifier, the difficulty, the
   packs and two flags — no title, no artist, no year.

Both are limits of the **bridge**, not of the shell. They are closed by
the next milestone of the base, and the shell follows without a change.

---

## 7. The related documents

| Document | Relation |
|---|---|
| [`RELEASE-PLAN.md`](RELEASE-PLAN.md) | the stages, their gates and their channels |
| [`RELEASE-RECORD-ANDROID.md`](RELEASE-RECORD-ANDROID.md) | the record of the released versions |
| [`../../docs/design/PLATFORM-ARCHITECTURE.md`](../../docs/design/PLATFORM-ARCHITECTURE.md) | the architecture of the family of apps |
| [`../../apps/android/README.md`](../../apps/android/README.md) | the shell of the Android track |
