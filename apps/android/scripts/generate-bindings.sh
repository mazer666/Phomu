#!/usr/bin/env bash
# Regenerates the Kotlin bindings of the base and builds the native library
# for every Android ABI.
#
# WHAT: two things happen here.
#
#   1. The Kotlin bindings of the bridge are regenerated *in place* in
#      `platform/phomu-ffi/bindings/kotlin`. The bindings are a generated
#      artefact of the bridge; there is exactly one of them in the repository
#      and every shell reads it
#      (docs/design/BUILD-CONTRACT.md § 2.4, rule B-6). They are never
#      edited by hand and never copied into a shell.
#
#   2. The native library of the base is built for the three Android ABIs
#      and copied into the `jniLibs` directory of the application.
#
# WHY the build uses Cargo directly and not `cargo-ndk`: `cargo-ndk` is one
# more tool to install and to pin, and the configuration it performs is three
# environment variables per ABI. The Gradle build performs the same steps
# itself (`app/build.gradle.kts`), so that the artefact is a declared input
# of the packaging task.
#
# Usage:
#   apps/android/scripts/generate-bindings.sh [--release]
#
# Environment:
#   ANDROID_NDK_HOME  the root of the NDK (r27c is the version the shell is
#                     built with)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT"

PROFILE="debug"
CARGO_FLAG=""
if [ "${1:-}" = "--release" ]; then
    PROFILE="release"
    CARGO_FLAG="--release"
fi

NDK="${ANDROID_NDK_HOME:-${ANDROID_NDK_ROOT:-/workspace/toolchain/android-ndk}}"
TOOLCHAIN="$NDK/toolchains/llvm/prebuilt/linux-x86_64/bin"
if [ ! -d "$TOOLCHAIN" ]; then
    echo "the NDK is not at $NDK" >&2
    echo "set ANDROID_NDK_HOME to the root of the NDK" >&2
    exit 1
fi

API_LEVEL="${PHOMU_MIN_SDK:-24}"

echo "building the bridge for the host …"
cargo build --package phomu-ffi --lib

LIBRARY="target/debug/libphomu_ffi.so"
if [ ! -f "$LIBRARY" ]; then
    echo "the library $LIBRARY does not exist" >&2
    exit 1
fi

echo "generating the Kotlin bindings …"
cargo run --quiet --package phomu-ffi --bin uniffi-bindgen -- generate \
    --library "$LIBRARY" \
    --language kotlin \
    --out-dir platform/phomu-ffi/bindings/kotlin \
    --config platform/phomu-ffi/bindings/kotlin/uniffi.toml

# The ABI, the Rust target triple and the prefix of the NDK compiler wrapper.
# WHY three columns: the Rust triple of the 32-bit ARM target and the name of
# the compiler wrapper of the NDK differ ("armv7-linux-androideabi" against
# "armv7a-linux-androideabi").
ABIS=(
    "arm64-v8a:aarch64-linux-android:aarch64-linux-android"
    "armeabi-v7a:armv7-linux-androideabi:armv7a-linux-androideabi"
    "x86_64:x86_64-linux-android:x86_64-linux-android"
)

for entry in "${ABIS[@]}"; do
    IFS=":" read -r abi triple prefix <<<"$entry"
    linker="$TOOLCHAIN/${prefix}${API_LEVEL}-clang"
    if [ ! -x "$linker" ]; then
        echo "the compiler wrapper $linker does not exist" >&2
        exit 1
    fi
    echo "building the native library for $abi …"
    CARGO_TARGET="$(echo "$triple" | tr '[:lower:]-' '[:upper:]_')"
    CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="" \
    CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER="" \
    CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER="" \
    env \
        "CARGO_TARGET_${CARGO_TARGET}_LINKER=$linker" \
        "CC_${triple}=$linker" \
        "AR_${triple}=$TOOLCHAIN/llvm-ar" \
        "RANLIB_${triple}=$TOOLCHAIN/llvm-ranlib" \
        cargo build --package phomu-ffi --lib $CARGO_FLAG --target "$triple"
    mkdir -p "apps/android/app/build/rust/jniLibs/$abi"
    cp "target/$triple/$PROFILE/libphomu_ffi.so" \
        "apps/android/app/build/rust/jniLibs/$abi/libphomu_ffi.so"
done

echo "done."
echo "  the bindings are in platform/phomu-ffi/bindings/kotlin"
echo "  the native libraries are in apps/android/app/build/rust/jniLibs"
