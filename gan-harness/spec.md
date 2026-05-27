# Galaga — Major Gameplay Expansion Spec

Source: user prompt, iteration-001.

## Vision

Take the existing ROM-accurate Galaga clone (Rust/WASM engine + React/TS client) to
the next level with new modes, easter eggs, missions, daily challenges, ships,
guns, power-ups, upgrades and an "amazing UI" — while keeping classic Galaga
intact as the "Classic" option.

## Sprint 1 — Must-Have

1. **Game Mode Hub** — new main menu before attract/classic with 5 modes:
   Classic, Arcade+, Daily Challenge, Mission Mode, Endless.
2. **Ship Variants** — Fighter (default), Interceptor, Heavy, Phantom; distinct
   palettes/silhouettes; selectable in Arcade+/Missions.
3. **Weapons & Power-ups** — Rapid Fire, Spread Shot, Laser Beam, Shield, Bomb,
   Magnet. Power-up timers in HUD.
4. **Upgrades** — Hangar screen with credit-spend persistent meta-progression.
5. **Easter Eggs** — at least 5 (Konami code, score 7777, click logo 7x,
   secret stage, NAMCO formation).
6. **Missions** — 10+ missions with objectives, star ratings, rewards. Mission
   board UI.
7. **Daily Challenges** — UTC seeded, streak counter, calendar UI.
8. **UI Overhaul** — animated starfield mode hub, neon cabinet cards, hangar
   previews, mission board with parchment/holographic aesthetic, HUD additions,
   polished transitions, mobile touch-friendly screens.
9. **Audio** — new SFX for power-ups, mode select, mission complete, upgrade
   purchase; mode-specific music.

## Architecture

- WASM engine **unchanged** — Classic mode is 100% identical. Maintains
  ROM accuracy and existing `cargo test` suite.
- New TS meta layer in `packages/client/src/meta/` for modes, missions,
  upgrades, ship variants, power-ups, daily challenges, easter eggs.
- New UI screens in `packages/client/src/ui/`.
- Power-ups & ship variants applied as TypeScript overlay on top of the WASM
  frame state: pickups, score multipliers, visual effects, screen-clear bombs
  (using existing `debug_skip_stage()` hook).
- Persistence via `localStorage` (credits, upgrades, mission progress, daily
  streak, easter egg discovery).

## Quality

- `cargo test --manifest-path packages/engine/Cargo.toml` passes (engine
  untouched, all existing tests stay green).
- `pnpm build` produces a successful client bundle.

## Ship

- Commit, push, `vercel deploy --prod`, verify https://galaga-arcade.vercel.app.
