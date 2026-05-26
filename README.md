# Galaga — ROM-Accurate Web Clone

A web-deployable, ROM-accurate Galaga built from scratch:

- **Simulation:** Rust → WASM (`wasm-bindgen`), fixed-timestep at 60.606 Hz, integer coordinates
- **Renderer:** WebGL2 + TypeScript, integer-scaled 224×288 viewport
- **App shell:** React 19 + Vite (attract mode, HUD, settings — not gameplay)
- **Audio:** Web Audio API, frame-synced (Phase 9)
- **Monorepo:** pnpm workspaces (`engine`, `client`, `shared`)

> **Legal:** All sprites and audio are recreated original work. Behavior, timing,
> and tables match the arcade ROM, but no Namco assets are bundled.

## Status

All 12 plan phases land in this drop. See
[`docs/feature-matrix.md`](docs/feature-matrix.md) for the per-feature checklist.

Playable now:

- 224×288 viewport with crisp integer upscaling, CRT scanline + bloom + vignette
- Fixed 60.606 Hz simulation loop driven by `requestAnimationFrame`
- Player ship: 3-step horizontal movement, rate-limited fire, respawn invuln blink
- Full 40-slot formation with Bezier entry flights, idle bob, 13 attack patterns
- Three enemy kinds (Zako 50/100, Goei 80/160, Boss 150/400/800/1600 escort)
- Boss capture mechanic: tractor beam → captured fighter docks → escort dive →
  rescue → dual-fighter mode (synchronized double bullet fire)
- Challenge stages (every 4 from stage 3): 8 distinct waves, wave bonuses
  1000/1500/2000/2500/3000, 10 000 perfect bonus
- Bonus item drops (scorpion/spy/flag) collected for 1000/2000/3000 set bonuses
- Stages 1–255 with difficulty rank table (plateaus after stage 22)
- Procedural Web Audio: fire, explosion, capture, tractor, fanfares, music loops
- HUD: 1UP score, HIGH SCORE, STAGE, lives (capped at 7 + ½ icon), stage flags
- React UI: attract screen with top-10 hi-scores, settings panel
  (CRT / scanlines / bloom / starfield / parallax / SFX / music / difficulty /
  bonus / free play / controls), pause, hi-score initial entry, challenge result
- Input: keyboard (arrows + WASD + Space/Z + Enter + P/Esc) and Gamepad API

## Prerequisites

- **Node.js** ≥ 20 (developed against v25)
- **pnpm** ≥ 9 (developed against 11)
- **Rust** stable + `wasm32-unknown-unknown` target
- **wasm-pack** ≥ 0.13

```bash
# one-time setup
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

## Build & Run

```bash
# install JS deps
pnpm install

# build the WASM engine (writes to packages/engine/pkg)
pnpm build:engine

# run the client dev server (Vite)
pnpm dev:client
# → open http://localhost:5173
```

Or, in one shot:

```bash
pnpm dev
```

## Controls

| Key             | Action                          |
| --------------- | ------------------------------- |
| `←` / `A`       | Move left                       |
| `→` / `D`       | Move right                      |
| `Space` / `Z`   | Fire                            |
| `Enter`         | Insert coin / start             |
| `P`             | Pause                           |
| `Esc`           | Open/close settings overlay     |
| Gamepad         | D-pad / left stick + A button   |

## Repo Layout

```
Galaga/
├── packages/
│   ├── engine/     # Rust crate → WASM
│   ├── client/     # Vite + React + WebGL2
│   └── shared/     # TS types mirroring WASM exports
├── assets/
│   ├── sprites/    # recreated 16×16 sheets
│   ├── audio/      # recreated SFX (Phase 9)
│   └── data/       # JSON ROM tables (source of truth)
├── docs/
│   └── feature-matrix.md
└── pnpm-workspace.yaml
```

## Tests

```bash
# native Rust unit tests (no browser)
pnpm test
# or directly
cargo test --manifest-path packages/engine/Cargo.toml
```

## License

This codebase is released under the MIT license. **No Namco-owned content is
included.** Galaga is a trademark of Bandai Namco; this is an educational
re-implementation.
