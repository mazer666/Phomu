#!/usr/bin/env bash
# Generates the Kotlin and the Swift bindings of the bridge.
#
# WHY a script and not a build step: the bindings are generated artefacts
# that are read by the shells; they are regenerated when the surface changes
# and the difference is reviewed (docs/design/BUILD-CONTRACT.md § 2.4, rule
# B-6).
#
# The two profiles are separate: the Kotlin and the Swift shell have
# different package structures.
#
# Usage:
#   platform/phomu-ffi/bindings/generate-bindings.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

echo "building the library of the bridge …"
cargo build -p phomu-ffi --lib

LIBRARY="target/debug/libphomu_ffi.so"
if [ ! -f "$LIBRARY" ]; then
    echo "the library $LIBRARY does not exist" >&2
    exit 1
fi

echo "generating the Kotlin bindings …"
cargo run -p phomu-ffi --bin uniffi-bindgen -- generate \
    --library "$LIBRARY" \
    --language kotlin \
    --out-dir platform/phomu-ffi/bindings/kotlin \
    --config platform/phomu-ffi/bindings/kotlin/uniffi.toml

echo "generating the Swift bindings …"
cargo run -p phomu-ffi --bin uniffi-bindgen -- generate \
    --library "$LIBRARY" \
    --language swift \
    --out-dir platform/phomu-ffi/bindings/swift \
    --config platform/phomu-ffi/bindings/swift/uniffi.toml

echo "done."
