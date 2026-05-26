# Galaga Feature Matrix

Status checklist for the ROM-accurate Galaga clone implementation.

## Phase 1 — Scaffold & Game Loop

- [x] pnpm workspace with `engine` / `client` / `shared`
- [x] Rust crate + `wasm-pack` build pipeline
- [x] Fixed-timestep loop at 60.606 Hz
- [x] WASM exports `Game::tick(inputs) → FrameState`
- [x] 224×288 viewport with integer-scaled nearest-neighbor upscale
- [x] React shell + canvas + overlay divs

## Phase 2 — Player, Bullets, Collision

- [x] Player horizontal movement, screen-bound clamped
- [x] Single-shot cadence (rate-limited fire)
- [x] Player bullets with travel and despawn off-screen
- [x] Enemy bullets with player-aimed velocity component
- [x] AABB collision (player↔bullet, bullet↔enemy, body↔body)
- [x] Lives + death explosion state
- [x] Respawn invulnerability blink

## Phase 3 — Formation & Entry

- [x] 40-slot formation grid + idle bob (whole-formation sway)
- [x] Three enemy types (Zako, Goei, Boss) with distinct sprites
- [x] Procedural Bezier entry flight paths (alternating top-left / top-right / bottom)
- [x] 2-hit Boss Galaga logic (injured palette swap)
- [x] "STAGE N" / "CHALLENGING STAGE" intro banner state machine

## Phase 4 — Dive Attacks

- [x] 13 attack patterns selected from `attack_pattern_for(stage, slot)`
- [x] Dive path splines per pattern (swoop / spiral / loop / figure-eight / vertical / diagonal / kamikaze)
- [x] Enemy shooting timed during dives with player-aimed velocity
- [x] Concurrent-diver cap per stage rank
- [x] Boss + escort wingmen dive scoring (400 / 800 / 1600)

## Phase 5 — Tractor Beam & Dual Fighter

- [x] Boss tractor beam state machine
- [x] Capture path (boss descends, beam appears, player abducted)
- [x] Captured fighter docks in formation slot
- [x] Dual fighter mode flag + double-bullet fire
- [x] Captured fighter score values (500 formation / 1000 flight)
- [x] Captured fighter dives with boss escort (rescue window)
- [x] Killing capturing boss while captured ship is alive → rescue + dual
- [x] Rescue clears `captured_active` and grants the bonus fanfare

## Phase 6 — Stages & Challenge Stages

- [x] Stage progression 1–255 with wrap
- [x] Challenge stage detection (`stage % 4 == 3`)
- [x] 8 challenge sub-patterns (5 waves of 8 enemies)
- [x] Wave bonuses 1 000 / 1 500 / 2 000 / 2 500 / 3 000
- [x] Perfect (40/40) 10 000 bonus
- [x] Difficulty rank table, post-22 pattern wrap (patterns 20-22 cycle)

## Phase 7 — Bonus Items

- [x] Scorpion / spy / flag entity definitions and scoring tables
- [x] Bonus item drop with kind weighting (scorpion 60% / spy 28% / flag 12%)
- [x] Boss kills drop bonus items more often than zako
- [x] Player collects falling bonus item → awards 1000 / 2000 / 3000
- [x] Extra fighter awards at default thresholds (20 K / 90 K / 160 K / 230 K / 300 K)
- [x] HUD life icons capped at 7 with half-life indicator beyond

## Phase 8 — Visuals

- [x] Recreated sprite sheets (player, captured, zako, goei, boss, boss injured, scorpion, spy, flag, bullets)
- [x] 4-frame procedural explosion atlas
- [x] Tractor beam cone gradient overlay with striations
- [x] ROM-style scrolling starfield (~64 stars) + optional multi-depth parallax
- [x] Additive particle system for explosion / capture / fanfare bursts
- [x] CRT scanline + bloom + vignette overlay (toggleable)
- [x] Cabinet bezel + neon trim around play area

## Phase 9 — Audio

- [x] Procedural Web Audio SFX (fire / explosion / capture / tractor / dive / wave bonus / fanfare / extra life / stage cleared / game start / challenge start)
- [x] Looping stage music
- [x] Attract-mode melody
- [x] SFX / music volume controls
- [x] First-input audio unlock (browser policy)

## Phase 10 — Game Modes & Meta

- [x] Phases: `Attract → StageIntro → Playing → StageCleared → … → PlayerDying → GameOver → HiScoreEntry → Attract`
- [x] Attract demo with auto-cycling stages and procedural inputs
- [x] Stage clear & challenge result screens
- [x] Game over countdown + auto-return
- [x] Hi-score table (10 entries, persisted to `localStorage`)
- [x] Hi-score entry UI (keyboard letter wheel)
- [x] HUD: 1UP score, HIGH SCORE, STAGE, lives with stage flags

## Phase 11 — Input & Polish

- [x] Keyboard input (arrows/WASD + space/Z fire + Enter start + P/Esc menus)
- [x] Gamepad API support (left stick / dpad / face buttons)
- [x] Settings panel: CRT, scanlines, bloom, starfield, parallax, SFX, music, difficulty, bonus, free play, controls
- [x] Pause toggle
- [x] Responsive cabinet layout that preserves 224:288 aspect ratio
- [x] Hi-score reset action
- [x] `prefers-reduced-motion` support (disables blink + banner pulse animations)

## Phase 12 — Validation Suite

- [x] Rust unit tests: scoring, challenge detection, pattern post-22 cycle, RNG determinism, AABB, set bonuses, boss escort progression, captured-fighter scoring, stage difficulty cap
- [x] World state machine smoke tests (start_game advances phase, attract is initial)
- [x] Dive period falls with rank test
- [x] Deterministic RNG cross-seed test (same seed = same stream)
- [ ] Optional MAME INP playback comparison harness (out of scope for v1 deploy)

## Known Departures from ROM

The following are deliberately simplified for a maintainable web port:

1. **Entry paths** — original ROM uses hand-coded trig tables; we use cubic Bezier curves that match the silhouette but not exact frame-by-frame waypoints.
2. **Dive splines** — pattern shapes match the original *vibes* (swoop / loop / figure-eight / kamikaze) but the exact pixel paths are procedural rather than ROM-table transcribed.
3. **Hi-score qualification** — engine admits any score above 25% of the displayed HI; the React app stores the full top-10 in `localStorage`.
4. **Bonus-item triggers** — enemy deaths now have an RNG-weighted drop chance (boss 24/256, goei 10/256, zako 6/256). Original ROM ties drops to specific formation kill counts.
5. **Demo recording** — attract uses procedural inputs instead of an embedded recorded demo run.
6. **Recreated sprites + audio** — pixel-perfect arcade silhouette / palette without using any Namco-owned assets.

Closing the gap to byte-level ROM accuracy is the Phase 12 follow-up.
