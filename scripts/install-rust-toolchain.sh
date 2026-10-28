#!/usr/bin/env bash
# Installs the Rust toolchain and the WebAssembly target.
#
# WHY this exists: the web shell loads the shared Rust base as a WebAssembly
# module, and the module has to be built before the shell. The build images of
# the continuous-integration providers do not carry a Rust toolchain, so the
# build has to bring its own.
#
# WHERE it is used: the Cloudflare Pages build command
# (`wrangler.toml` → `[build].command`). The GitHub Actions workflows install
# the toolchain through `dtolnay/rust-toolchain` and do not need this script.
#
# The script is idempotent: a second run with an existing toolchain does
# nothing but check the target.
set -euo pipefail

RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"
CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
export RUSTUP_HOME CARGO_HOME

TARGET="wasm32-unknown-unknown"

# The toolchain has to be on the PATH of the build command, not only of this
# script — the build runs `cargo` in a later step.
export PATH="$CARGO_HOME/bin:$PATH"

# The check is whether the toolchain **works**, not whether a binary with the
# name cargo exists: a cargo of a different RUSTUP_HOME answers --version with
# an error, and the build would fail later in a place that is harder to read.
if ! cargo --version > /dev/null 2>&1; then
  echo "Installing the Rust toolchain (minimal profile) …"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --profile minimal --default-toolchain stable
else
  echo "Rust is already installed: $(cargo --version)"
fi

if ! rustup target list --installed 2> /dev/null | grep -qx "${TARGET}"; then
  echo "Adding the target ${TARGET} …"
  rustup target add "${TARGET}"
else
  echo "The target ${TARGET} is already installed."
fi

echo "Rust toolchain ready: $(cargo --version)"
