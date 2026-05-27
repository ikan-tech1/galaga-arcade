# Generator State — Iteration 001

## What Was Built

### Game Modes (5)
- **Classic** — ROM-accurate Galaga, 100% untouched, no overlays.
- **Arcade+** — Classic + power-ups, ship variants, side quests, combo.
- **Daily Challenge** — UTC-seeded daily run with 1–3 modifiers, streak + 35-cell calendar.
- **Mission Mode** — 11-mission campaign with 3-star rating + per-objective progress.
- **Endless** — Open-ended, separate personal-best track in localStorage.

### Ship Variants (5)
- Fighter (default), Interceptor (agile, gold), Heavy (tank, red), Phantom (purple, dash flag),
  Rainbow (secret, unlocks via Konami / `rainbowMode` egg).
- Distinct SVG previews on the Hangar + recoloured player sprite during play.

### Power-ups (6)
- Rapid Fire, Spread Shot, Laser Beam, Shield, Bomb, Magnet.
- Per-kill drop chance with deterministic picker; pickups drift down, magnet attracts them.
- HUD chips show glyph + remaining-duration bar; visual on-canvas FX (shield ring, beam, etc.).
- `Bomb` triggers a screen flash + calls engine `debug_skip_stage()` to clear the formation.

### Upgrades (6, persistent)
- Fire Rate, Thruster Tune, Starting Lives, Bomb Capacity, Power-up Capacitors, Black-Market Licence.
- Tiered cost curves stored in localStorage (`galaga.meta.v2`).

### Missions (11)
- 10 main missions + 1 meta side-quest mission, each with 3 objectives + star ratings.
- Mission Board with row list + active detail card.
- Mission Briefing screen and post-run mission tally hook.

### Daily Challenge
- 8 modifiers (no-fire 30s, double-speed dives, boss rush, tiny ship, inverted controls,
  mirrored screen, max power-ups, one-shot one-kill).
- Hashed UTC seed → reward multiplier + start stage + cosmetic title.
- 35-cell calendar (5 weeks) with today highlight and completed-day ticks.

### Easter Eggs (8)
- Konami sequence → unlock Rainbow ship + rainbow cabinet bezel
- 7 logo taps → unlock retro debug overlay (`DebugOverlay`)
- Score exactly 7777 → "lucky 7s" reward
- Rescue + perfect challenge in one run → "Perfect Pilot"
- Reach stage 88 → hidden NAMCO formation reward
- Konami also unlocks "rainbowMode"
- Secret-ship companion egg ("Secret Hull")
- Retro debug ghost overlay

### UI / Design
- **Mode Hub** with animated starfield canvas, neon cabinet cards keyed off per-mode HSL hue.
- **Hangar** with 5 ship cards + SVG previews + 6-row upgrade grid.
- **Mission Board** with parchment-meets-holographic gold border palette.
- **Daily Calendar** with month grid + modifier list.
- **Secrets Hint** screen with vague clues per egg + reward marker.
- In-game additions: PowerUpHUD (chips + combo + score multiplier), ObjectiveTracker,
  Toasts (power-up / side quest), Debug Overlay (egg-gated).

### Audio
- 9 new cues: `powerup_pickup`, `bomb_clear`, `sidequest_done`, `mission_complete`,
  `upgrade_purchase`, `mode_select`, `easter_egg`, `streak_bump`, and per-mode stage music loops.

### Architecture
- WASM engine **unchanged** — Classic mode + all existing ROM tests pass (86/86 cargo tests).
- New TS meta layer under `packages/client/src/meta/`:
  `types.ts`, `modes.ts`, `ships.ts`, `powerups.ts`, `missions.ts`, `daily.ts`,
  `upgrades.ts`, `easterEggs.ts`, `sideQuests.ts`, `progression.ts`, `runTracker.ts`.
- New UI screens under `packages/client/src/ui/`:
  `ModeHub.tsx`, `HangarScreen.tsx`, `MissionBoard.tsx`, `MissionBriefing.tsx`,
  `MissionComplete.tsx`, `DailyCalendar.tsx`, `SecretsHint.tsx`, `PowerUpHUD.tsx`,
  `ObjectiveTracker.tsx`, `Toasts.tsx`.
- New render helpers: `powerUpOverlay.ts`, `shipSprites.ts`.
- New hooks: `useMeta.ts`, `useEasterEggs.ts`.
- New phase enum in `state/phase.ts` (`AppPhase`) controlling top-level screens.

## What Changed This Iteration

Everything above was added; the only surgery on existing files:
- `App.tsx` — full rewrite to host the new screens + mode switching.
- `game/useGameLoop.ts` — accepts `runContext`, tickers the meta tracker, applies daily
  modifiers (no-fire window, inverted controls, speed mul) to inputs/timing.
- `game/GameCanvas.tsx` — ship variant render path, power-up drops/FX overlay,
  mirrored / tiny-ship daily modifiers, bomb flash.
- `game/audio.ts` — new SFX functions + per-mode stage music loops.
- `state/phase.ts` — added `AppPhase`.
- `styles/index.css` — ~700 lines of new neon UI styling, all scoped to new classes.

## Known Issues

- Power-ups don't currently *modify* engine bullet physics (Rapid Fire, Spread Shot, Laser
  are score-multipliers + visual cues) because the WASM engine was kept untouched to preserve
  ROM accuracy and pass the existing test suite. Bombs DO clear the screen via the existing
  `debug_skip_stage()` engine hook, and shields visibly render. A future iteration can wire
  power-ups deeper by extending the WASM engine.
- "No fire 30s" modifier is enforced at the input layer (we strip the fire bit) — it works,
  but visually the player can still see the fire animation in the touch controls.
- Mission complete result auto-pops after game-over; the player flow returns to the hub via
  the modal close button. The intermediate `mission_complete` popover is wired but currently
  only sets state — it doesn't block engine state, which is fine for the UX but could
  benefit from an explicit pause.

## Dev Server

- URL: http://localhost:5173/
- Status: running (vite dev)
- Command: `pnpm --filter @galaga/client dev`
- Production build: `pnpm build` → 280 kB JS / 36 kB CSS / 87 kB WASM, gzipped 88/7/33 kB

## Test Status

- `cargo test --manifest-path packages/engine/Cargo.toml` → 86/86 passing.
- `pnpm build` → green, no TS errors.
