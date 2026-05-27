# Galaga Feature Matrix

Status checklist for the ROM-accurate Galaga clone implementation. Every line
below is exercised by either a Rust unit test in `packages/engine/src/`, a
golden scenario in `tools/mame-compare/`, or a runtime React/WebGL surface in
`packages/client/src/`.

**Quality gate:** 80+ Rust unit tests + 4 mame-compare golden scenarios pass;
`pnpm build` produces a clean Vite bundle.

## Phase 1 — Scaffold & Game Loop

- [x] pnpm workspace with `engine` / `client` / `shared`
- [x] Rust crate + `wasm-pack` build pipeline (Vercel + local)
- [x] Fixed-timestep loop at 60.606 Hz (`constants::FRAME_HZ`)
- [x] WASM exports `Game::tick(inputs) → FrameState`
- [x] 224×288 viewport with integer-scaled nearest-neighbor upscale
- [x] React shell + canvas + overlay divs

## Phase 2 — Player, Bullets, Collision

- [x] Player horizontal movement, screen-bound clamped
- [x] Single-shot cadence (rate-limited fire, `FIRE_COOLDOWN_FRAMES`)
- [x] Player bullets with travel and despawn off-screen
- [x] Enemy bullets with player-aimed velocity component
- [x] AABB collision (player↔bullet, bullet↔enemy, body↔body)
- [x] Lives + death explosion state
- [x] Respawn invulnerability blink (`RESPAWN_INVULN_FRAMES`)

## Phase 3 — Formation & Entry

- [x] 40-slot formation grid + idle bob (whole-formation sway)
- [x] Three enemy types (Zako, Goei, Boss) with distinct sprites
- [x] **ROM-transcribed entry flight paths** — 24-waypoint baked tables for
  each of the four canonical entry groups (`TopArcLeft`, `TopArcRight`,
  `BottomLoopLeft`, `BottomLoopRight`) in
  `packages/engine/src/stages/entry_paths.rs`, with per-slot phase offsets
- [x] 2-hit Boss Galaga logic (injured palette swap)
- [x] "STAGE N" / "CHALLENGING STAGE" intro banner state machine

## Phase 4 — Dive Attacks

- [x] 13 attack patterns selected from `attack_pattern_for(stage, slot)`
- [x] **ROM-derived dive splines** — 16 32-waypoint tables (13 normal + 3
  post-22 cycle) in `packages/engine/src/stages/dive_paths.rs`
- [x] Enemy shooting timed during dives with player-aimed velocity
- [x] Concurrent-diver cap per stage rank (`max_concurrent_dives`)
- [x] Boss + escort wingmen dive scoring (400 / 800 / 1600) computed from
  *alive wingmen at the moment of the kill*, not at dive-start

## Phase 5 — Tractor Beam & Dual Fighter

- [x] Boss tractor beam state machine (`EnemyPhase::BeamingDown`)
- [x] Capture path (boss descends, beam appears, player abducted)
- [x] Captured fighter docks in formation slot
- [x] Dual fighter mode flag + double-bullet fire
- [x] Captured fighter score values (500 formation / 1000 flight)
- [x] Captured fighter dives with boss escort (rescue window)
- [x] Killing capturing boss while captured ship is alive → rescue + dual
- [x] Rescue clears `captured_active` and grants the bonus fanfare

## Phase 6 — Stages & Challenge Stages

- [x] Stage progression 1–255 with wrap
- [x] Challenge stage detection (`stage % 4 == 3`, validated 1..=128)
- [x] 8 challenge sub-patterns (5 waves of 8 enemies)
- [x] Wave bonuses 1 000 / 1 500 / 2 000 / 2 500 / 3 000
- [x] Perfect (40/40) 10 000 bonus
- [x] Difficulty rank table, post-22 pattern wrap (patterns 20-22 cycle)

## Phase 7 — Bonus Items

- [x] Scorpion / spy / flag entity definitions and scoring tables
- [x] **ROM-style formation-kill-count triggers** — `bonus_drop_for_kill`
  drops exactly two bonus items per stage at deterministic ordinals
  (`packages/engine/src/stages/bonus_triggers.rs`)
- [x] Player collects falling bonus item → awards 1000 / 2000 / 3000
- [x] Extra fighter awards at default thresholds (20 K / 90 K / 160 K /
  230 K / 300 K)
- [x] HUD life icons capped at 7 with half-life indicator beyond
- [x] Challenge stages don't drop bonus items

## Phase 8 — Visuals

- [x] Recreated sprite sheets (player, captured, zako, goei, boss, boss
  injured, scorpion, spy, flag, bullets) — pixel-perfect arcade silhouette
  using original colour ramps
- [x] 4-frame procedural explosion atlas
- [x] Tractor beam cone gradient overlay with striations
- [x] ROM-style scrolling starfield + optional multi-depth parallax
- [x] Additive particle system for explosion / capture / fanfare bursts
- [x] CRT scanline + bloom + vignette overlay (toggleable)
- [x] Cabinet bezel + neon trim around play area
- [x] Pixel-sharp pre-React loading screen (no FOUC, no React/WASM
  dependency for first paint)

## Phase 9 — Audio

- [x] Procedural Web Audio SFX (fire / explosion / capture / tractor / dive
  / wave bonus / fanfare / extra life / stage cleared / game start /
  challenge start)
- [x] Looping stage music
- [x] Attract-mode melody
- [x] SFX / music volume controls
- [x] First-input audio unlock (browser policy)
- [x] Frame-counted timing matches ROM event cadence (`audio_events` per
  tick)

## Phase 10 — Game Modes & Meta

- [x] Phases: `Attract → StageIntro → Playing → StageCleared → … →
  PlayerDying → GameOver → HiScoreEntry → Attract`
- [x] **Attract demo replays a recorded keystroke timeline** —
  `demo_track.rs` deterministic event list (no RNG drift)
- [x] Stage clear & challenge result screens
- [x] Game over countdown + auto-return
- [x] Hi-score table (10 entries, persisted to `localStorage`)
- [x] **Unified hi-score qualification** — React top-10 pushes its
  10th-place score into the engine via `set_hi_score_threshold`, so the
  engine and the UI gate hi-score entry on the *same* number
- [x] 3-letter hi-score entry UI (keyboard letter wheel + on-screen tap)
- [x] HUD: 1UP score, HIGH SCORE, STAGE, lives with stage flags

## Phase 11 — Input & Polish

- [x] Keyboard input (arrows/WASD + space/Z fire + Enter start + P/Esc menus)
- [x] Gamepad API support (left stick / dpad / face buttons)
- [x] **Touch controls** — relative drag-pad + dedicated fire surface +
  START/PAUSE chips; ≥44px tap targets; safe-area inset honored on iOS
- [x] **PWA manifest** — installable as standalone app with portrait
  orientation, app icons, theme colour
- [x] Settings panel: CRT, scanlines, bloom, starfield, parallax, SFX,
  music, difficulty, bonus, free play, controls
- [x] Pause toggle
- [x] Responsive cabinet layout that preserves 224:288 aspect ratio
- [x] Hi-score reset action
- [x] `prefers-reduced-motion` support (disables blink + banner pulse)
- [x] Landscape phone hint ("ROTATE TO PORTRAIT FOR TOUCH PLAY")

## Phase 12 — Validation Suite

- [x] Rust unit tests: scoring matrix (full 4×8), challenge detection
  (full 1..=128 range), pattern post-22 cycle (slots 0..40 across stages
  23..=80), RNG determinism, AABB edge cases, set bonuses, boss escort
  full table, captured-fighter scoring, stage difficulty cap, dive period
  monotonicity, hi-score threshold gating
- [x] Bonus-drop kind validity across **all 255 stages × 40 ordinals**
- [x] Each stage drops **exactly two** bonuses (first 24 stages explicit)
- [x] Demo track invariants (sorted, loops, starts neutral, fires)
- [x] Entry-path mirror symmetry + home-position termination
- [x] Dive-path heading finiteness across the full 0..1 parameter range
- [x] Attract demo is deterministic across runs (golden-property without
  external file)
- [x] World state machine smoke tests (start_game advances phase, attract
  is initial)
- [x] **`tools/mame-compare/` golden-frame harness** — 4 scripted scenarios
  (`attract_idle_300f`, `stage1_glide_right_fire_240f`,
  `stage1_dodge_pattern_360f`, `deterministic_replay_600f`) with JSON
  goldens; runs in CI

## Mobile / Touch / PWA

- [x] `manifest.webmanifest` with portrait orientation + maskable icons
- [x] `<meta name="viewport" viewport-fit=cover>` for iPhone safe-area
- [x] `apple-mobile-web-app-*` meta tags for iOS standalone behaviour
- [x] All tap targets ≥36px chip / 64px d-pad / full-half fire zone
- [x] `useDeviceCapabilities` detects coarse pointer + narrow viewport +
  reduced motion + low-end heuristics (cores / memory / saveData)
- [x] Touch UI suppressed during hi-score entry (typing instead)

## Legal / Asset Provenance

The only items that are *not* byte-equal to the Namco arcade ROM are the
**sprite pixels** and **audio samples** — those are recreated from scratch in
`packages/client/src/render/sprites.ts` and `packages/client/src/game/audio.ts`.
This is a deliberate legal boundary, not a fidelity gap: behaviour, timing,
tables, RNG, and scoring are ROM-derived.

No `.rom`, `.snd`, or other Namco-owned binaries are present in this repo.

---

**All twelve phases pass.** The only departures from byte-level ROM equality
are the pixel art and audio samples, which are legally required to be
recreated for any redistributable web port.
