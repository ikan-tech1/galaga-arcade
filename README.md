# Galaga — ROM-Accurate Web Clone

A web-deployable, ROM-accurate Galaga built from scratch.

- **Simulation:** Rust → WASM (`wasm-bindgen`), fixed-timestep at 60.606 Hz,
  integer coordinates
- **Renderer:** WebGL2 + TypeScript, integer-scaled 224×288 viewport
- **App shell:** React 19 + Vite (attract mode, HUD, settings — not gameplay)
- **Audio:** Web Audio API, frame-synced procedural SFX + music
- **Mobile:** Touch controls + PWA manifest + iOS safe-area
- **Monorepo:** pnpm workspaces (`engine`, `client`, `shared`)

> **Legal:** All sprites and audio are recreated original work. Behaviour,
> timing, ROM tables, and scoring match the arcade; no Namco-owned pixel or
> sample data is bundled.

**Live:** <https://galaga-arcade.vercel.app>

## Status

All 12 plan phases land in this drop. See
[`docs/feature-matrix.md`](docs/feature-matrix.md) for the per-feature
checklist.

What plays today:

- 224×288 viewport, crisp integer upscale, CRT scanline + bloom + vignette
- Fixed 60.606 Hz simulation driven by `requestAnimationFrame`
- Player ship: 3-step horizontal movement, rate-limited fire, respawn blink
- 40-slot formation with **ROM-transcribed entry waypoint paths** (four
  canonical entry groups in `packages/engine/src/stages/entry_paths.rs`)
- **13 attack patterns** with **ROM-derived 32-waypoint dive splines**
  (`packages/engine/src/stages/dive_paths.rs`) — swoop, spiral, loop, double
  swoop, figure-eight, vertical, diagonal, kamikaze, plus post-22 cycle
- Three enemy kinds (Zako 50/100, Goei 80/160, Boss 150/400 + 800/1600
  escort bonuses based on *alive wingmen at the kill moment*)
- Boss capture mechanic: tractor beam → captured fighter docks → escort
  dive → rescue → dual-fighter mode (synchronized double bullet fire)
- Challenge stages (every 4 from stage 3): 8 distinct waves, bonuses
  1000/1500/2000/2500/3000, 10 000 perfect bonus
- **ROM-style formation-kill-count bonus drops** (scorpion/spy/flag), set
  bonuses 1000/2000/3000 (`packages/engine/src/stages/bonus_triggers.rs`)
- Stages 1–255 with difficulty rank table (plateaus after stage 22)
- **Attract mode demo replays a recorded keystroke timeline**
  (`packages/engine/src/demo_track.rs`) — no RNG drift
- **Unified hi-score:** React top-10 pushes 10th place into the engine so
  hi-score qualification gates are byte-identical
- Procedural Web Audio: fire, explosion, capture, tractor, fanfares, music
- HUD: 1UP score, HIGH SCORE, STAGE, lives (capped at 7 + ½ icon), flags
- React UI: attract screen with top-10 hi-scores, settings panel, pause,
  3-letter hi-score entry, challenge result screen, pixel-sharp loader
- Input: keyboard, Gamepad API, **on-screen touch controls** (drag-pad +
  fire zone + START/PAUSE chips)
- **PWA installable** with portrait orientation + maskable app icons

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 11
- **Rust** stable + `wasm32-unknown-unknown` target
- **wasm-pack** ≥ 0.13

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

## Build & Run

```bash
pnpm install
pnpm build:engine        # builds WASM (writes to packages/engine/pkg)
pnpm dev:client          # Vite dev server at http://localhost:5173
```

Or in one shot:

```bash
pnpm dev
```

Production build:

```bash
pnpm build:full          # engine → shared → client
```

## Controls

| Surface         | Action                          |
| --------------- | ------------------------------- |
| `←` / `A`       | Move left                       |
| `→` / `D`       | Move right                      |
| `Space` / `Z`   | Fire                            |
| `Enter`         | Insert coin / start             |
| `P`             | Pause                           |
| `Esc`           | Open/close settings overlay     |
| Gamepad         | D-pad / left stick + A button   |
| Touch (mobile)  | Drag-pad LEFT half · FIRE RIGHT half · START/PAUSE chips |

## Repo Layout

```
Galaga/
├── packages/
│   ├── engine/                       # Rust crate → WASM
│   │   └── src/stages/
│   │       ├── entry_paths.rs        # ROM 24-waypoint entry tables
│   │       ├── dive_paths.rs         # ROM 32-waypoint dive tables
│   │       ├── attack_tables.rs      # 13-pattern + difficulty rank
│   │       └── bonus_triggers.rs     # formation-kill-count drops
│   ├── client/                       # Vite + React + WebGL2
│   └── shared/                       # TS types mirroring WASM exports
├── tools/
│   └── mame-compare/                 # Golden-frame harness (4 scenarios)
├── docs/
│   └── feature-matrix.md
└── pnpm-workspace.yaml
```

## Tests

```bash
# Rust unit tests (no browser needed)
cargo test --manifest-path packages/engine/Cargo.toml

# Golden-frame ROM-behaviour comparison
cargo run --manifest-path tools/mame-compare/Cargo.toml --release

# Vite production build
pnpm build
```

The Rust suite has 80+ tests covering the full scoring matrix, challenge
detection (1..=128), bonus-drop kinds for every (stage, ordinal) pair across
1..=255, attack-pattern range invariants, entry/dive path mirror symmetry,
RNG determinism, and attract-demo determinism.

## License

This codebase is released under the MIT license. **No Namco-owned content is
included.** Galaga is a trademark of Bandai Namco; this is an educational
re-implementation.
