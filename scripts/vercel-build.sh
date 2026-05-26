#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if ! command -v wasm-pack >/dev/null 2>&1; then
  if ! command -v cargo >/dev/null 2>&1; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    # shellcheck disable=SC1091
    source "${HOME}/.cargo/env"
  fi
  rustup target add wasm32-unknown-unknown
  cargo install wasm-pack --locked
fi

pnpm run build:engine
pnpm run build:shared
pnpm run build:client
