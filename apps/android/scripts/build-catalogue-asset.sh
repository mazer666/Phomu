#!/usr/bin/env bash
# Builds the catalogue asset of the Android shell.
#
# WHAT: the catalogue artefact of the base (built by `catalog-tool`) and the
# pack table of the repository are merged into the single JSON document the
# bridge reads (`{"songs": [...], "packs": {...}}`), and the document is
# written into the assets of the application.
#
# WHY the merge happens here and not in the shell: the shell must not parse
# the catalogue and must not know the shape of the artefact
# (docs/design/BUILD-CONTRACT.md § 4.1). The merge is a step of the build
# that produces the artefact the shell hands over as bytes.
#
# WHY the pack table is needed: the artefact of `catalog-tool` carries the
# songs but not the packs, and the bridge reads the packs from the same
# document. The missing pack table in the artefact is an open point of the
# base — it is listed in the delivery report of the track.
#
# Usage:
#   apps/android/scripts/build-catalogue-asset.sh [output-directory]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT_DIR="${1:-$ROOT/apps/android/app/build/generated/assets}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "building the catalogue artefact of the base …"
cd "$ROOT"
cargo run --quiet --package catalog-tool -- build src/data/songs --out "$WORK_DIR/catalogue.json"

echo "merging the pack table …"
node "$SCRIPT_DIR/merge-catalogue.mjs" \
    --catalogue "$WORK_DIR/catalogue.json" \
    --packs "$ROOT/src/data/songs/packs.json" \
    --out "$OUT_DIR/catalogue.json"

echo "catalogue asset written to $OUT_DIR/catalogue.json"
