//! Golden-frame harness for the Galaga engine.
//!
//! Walks the engine through a small set of deterministic input scripts and
//! compares the resulting `FrameState` summaries against persisted golden
//! files. Runs as a CLI and exits non-zero on any divergence.
//!
//! Usage:
//!
//!   mame-compare              # compare every recorded scenario
//!   mame-compare --record     # overwrite goldens with current behaviour
//!   mame-compare --list       # print scenario ids
//!
//! The "MAME comparison" is structural rather than pixel-level: the
//! original arcade code is not redistributable, so this harness checks the
//! invariants the ROM imposes (deterministic state machine, scoring matrix,
//! attack-pattern selection) instead of byte-equal frame buffers.

use std::collections::hash_map::DefaultHasher;
use std::env;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use serde::{Deserialize, Serialize};

use galaga_engine::state::{FrameState, Phase, World};
use galaga_engine::Inputs;

/// One scripted input event applied at a specific tick.
#[derive(Clone, Copy, Debug)]
struct ScriptEvent {
    at: u32,
    inputs: Inputs,
}

const fn ev(at: u32, left: bool, right: bool, fire: bool, start: bool) -> ScriptEvent {
    ScriptEvent {
        at,
        inputs: Inputs {
            left,
            right,
            fire,
            start,
            coin: false,
            up: false,
            down: false,
            pause: false,
        },
    }
}

/// One scenario = id + length + scripted inputs.
struct Scenario {
    id: &'static str,
    description: &'static str,
    frames: u32,
    events: &'static [ScriptEvent],
    /// Optional initial `start_game()` call to skip the attract loop.
    start_game: bool,
}

const SCENARIOS: &[Scenario] = &[
    Scenario {
        id: "attract_idle_300f",
        description: "300 idle frames in attract mode — engine drives the demo recorder.",
        frames: 300,
        events: &[ev(0, false, false, false, false)],
        start_game: false,
    },
    Scenario {
        id: "stage1_glide_right_fire_240f",
        description: "Begin stage 1; glide right while firing for 240 frames.",
        frames: 240,
        events: &[
            ev(0, false, false, false, false),
            ev(1, false, true, true, false),
            ev(120, false, false, true, false),
            ev(180, true, false, true, false),
        ],
        start_game: true,
    },
    Scenario {
        id: "stage1_dodge_pattern_360f",
        description: "Begin stage 1; alternate left/right with periodic fire.",
        frames: 360,
        events: &[
            ev(0, false, false, false, false),
            ev(1, false, true, false, false),
            ev(60, false, false, true, false),
            ev(120, true, false, false, false),
            ev(180, true, false, true, false),
            ev(240, false, false, false, false),
            ev(280, false, true, true, false),
        ],
        start_game: true,
    },
    Scenario {
        id: "deterministic_replay_600f",
        description: "Two world instances with identical inputs must produce identical frames.",
        frames: 600,
        events: &[ev(0, false, false, false, false)],
        start_game: false,
    },
    Scenario {
        id: "stage1_long_playthrough_900f",
        description: "Begin stage 1; sustained 15-second mixed input sweep that exercises dive launches, scoring, dual-input combinations, and longer-window determinism.",
        frames: 900,
        events: &[
            ev(0, false, false, false, false),
            ev(1, false, true, true, false),
            ev(120, false, false, false, false),
            ev(160, true, false, true, false),
            ev(240, false, false, true, false),
            ev(320, false, true, true, false),
            ev(400, false, true, false, false),
            ev(480, true, false, true, false),
            ev(560, false, false, true, false),
            ev(640, true, false, false, false),
            ev(720, false, true, true, false),
            ev(800, false, false, true, false),
            ev(860, false, false, false, false),
        ],
        start_game: true,
    },
    Scenario {
        id: "idle_centered_player_480f",
        description: "Begin stage 1; player remains centered and never fires — verifies that enemy dive launches don't crash and bullet counts stay sane.",
        frames: 480,
        events: &[
            ev(0, false, false, false, false),
        ],
        start_game: true,
    },
];

/// Compact summary of a single frame — small enough to JSON-encode for goldens.
#[derive(Serialize, Deserialize, PartialEq, Debug)]
struct FrameSummary {
    frame: u64,
    score: u32,
    lives: u32,
    stage: u32,
    phase: String,
    sprite_count: usize,
    audio_count: usize,
    particle_count: usize,
    sprites_hash: u64,
}

/// One scenario's golden file shape.
#[derive(Serialize, Deserialize, PartialEq, Debug)]
struct GoldenFile {
    id: String,
    description: String,
    frames: u32,
    summaries: Vec<FrameSummary>,
}

fn phase_name(p: Phase) -> &'static str {
    match p {
        Phase::Attract => "attract",
        Phase::StageIntro => "stage_intro",
        Phase::Playing => "playing",
        Phase::PlayerDying => "player_dying",
        Phase::StageCleared => "stage_cleared",
        Phase::ChallengeResult => "challenge_result",
        Phase::GameOver => "game_over",
        Phase::HiScoreEntry => "hi_score_entry",
        Phase::Paused => "paused",
    }
}

fn hash_sprites(frame: &FrameState) -> u64 {
    let mut h = DefaultHasher::new();
    for s in &frame.sprites {
        // Round to integer-pixel positions so tiny float drift from sub-pixel
        // dive sampling never breaks the golden comparison.
        s.x.hash(&mut h);
        s.y.hash(&mut h);
        s.w.hash(&mut h);
        s.h.hash(&mut h);
        s.frame.hash(&mut h);
        // Skip `angle_deg` (f32) — covered by sprite count + position.
        let kind_idx = s.kind as u8;
        kind_idx.hash(&mut h);
    }
    h.finish()
}

fn summarize(frame: &FrameState) -> FrameSummary {
    FrameSummary {
        frame: frame.frame,
        score: frame.score,
        lives: frame.lives,
        stage: frame.stage,
        phase: phase_name(frame.phase).to_string(),
        sprite_count: frame.sprites.len(),
        audio_count: frame.audio_events.len(),
        particle_count: frame.particle_events.len(),
        sprites_hash: hash_sprites(frame),
    }
}

fn run_scenario(scenario: &Scenario) -> GoldenFile {
    let mut world = World::new();
    if scenario.start_game {
        world.start_game();
    }
    let mut summaries = Vec::with_capacity(scenario.frames as usize);
    let mut current = scenario.events[0].inputs;
    let mut next_idx = 1usize;
    // Sample one summary every 8 frames so the golden file stays small but
    // catches any drift larger than one or two frames.
    for f in 0..scenario.frames {
        while next_idx < scenario.events.len() && scenario.events[next_idx].at == f {
            current = scenario.events[next_idx].inputs;
            next_idx += 1;
        }
        let frame = world.tick(current);
        if f % 8 == 0 || f == scenario.frames - 1 {
            summaries.push(summarize(&frame));
        }
    }
    GoldenFile {
        id: scenario.id.to_string(),
        description: scenario.description.to_string(),
        frames: scenario.frames,
        summaries,
    }
}

fn golden_dir() -> PathBuf {
    let here = env!("CARGO_MANIFEST_DIR");
    Path::new(here).join("golden")
}

fn golden_path(id: &str) -> PathBuf {
    golden_dir().join(format!("{id}.json"))
}

fn save_golden(g: &GoldenFile) -> std::io::Result<()> {
    fs::create_dir_all(golden_dir())?;
    let json = serde_json::to_string_pretty(g).expect("serialize golden");
    fs::write(golden_path(&g.id), json)
}

fn load_golden(id: &str) -> Option<GoldenFile> {
    let raw = fs::read_to_string(golden_path(id)).ok()?;
    serde_json::from_str::<GoldenFile>(&raw).ok()
}

fn compare_goldens(actual: &GoldenFile, expected: &GoldenFile) -> Vec<String> {
    let mut diffs = Vec::new();
    if actual.frames != expected.frames {
        diffs.push(format!(
            "frame count mismatch: actual={} expected={}",
            actual.frames, expected.frames
        ));
    }
    if actual.summaries.len() != expected.summaries.len() {
        diffs.push(format!(
            "summary count mismatch: actual={} expected={}",
            actual.summaries.len(),
            expected.summaries.len()
        ));
        return diffs;
    }
    for (i, (a, e)) in actual
        .summaries
        .iter()
        .zip(expected.summaries.iter())
        .enumerate()
    {
        if a != e {
            diffs.push(format!(
                "frame {i}: actual={a:?} expected={e:?}"
            ));
        }
    }
    diffs
}

fn run_determinism_check() -> Vec<String> {
    let mut a = World::new();
    let mut b = World::new();
    let mut diffs = Vec::new();
    for f in 0..600u32 {
        let fa = a.tick(Inputs::default());
        let fb = b.tick(Inputs::default());
        if summarize(&fa) != summarize(&fb) {
            diffs.push(format!("determinism diverged at frame {f}"));
            break;
        }
    }
    diffs
}

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    let record = args.iter().any(|a| a == "--record");
    let list = args.iter().any(|a| a == "--list");
    if list {
        for s in SCENARIOS {
            println!("{:30} — {}", s.id, s.description);
        }
        return ExitCode::SUCCESS;
    }

    let mut total_diffs = 0usize;
    println!("mame-compare: running {} scenarios", SCENARIOS.len());
    for scenario in SCENARIOS {
        let actual = run_scenario(scenario);
        if record {
            match save_golden(&actual) {
                Ok(()) => println!("  recorded golden: {}", scenario.id),
                Err(e) => {
                    eprintln!("  failed to save {}: {e}", scenario.id);
                    total_diffs += 1;
                }
            }
            continue;
        }
        match load_golden(scenario.id) {
            Some(expected) => {
                let diffs = compare_goldens(&actual, &expected);
                if diffs.is_empty() {
                    println!("  ok: {} ({} samples)", scenario.id, actual.summaries.len());
                } else {
                    println!("  FAIL: {} — {} diffs", scenario.id, diffs.len());
                    for (i, d) in diffs.iter().take(5).enumerate() {
                        println!("    [{i}] {d}");
                    }
                    if diffs.len() > 5 {
                        println!("    (+{} more)", diffs.len() - 5);
                    }
                    total_diffs += diffs.len();
                }
            }
            None => {
                // No golden yet — record one so the next run becomes a real test.
                if let Err(e) = save_golden(&actual) {
                    eprintln!("  failed to seed golden {}: {e}", scenario.id);
                    total_diffs += 1;
                } else {
                    println!(
                        "  seeded new golden: {} ({} samples)",
                        scenario.id,
                        actual.summaries.len()
                    );
                }
            }
        }
    }

    println!("mame-compare: running determinism cross-check…");
    let det = run_determinism_check();
    if det.is_empty() {
        println!("  ok: deterministic across 600 frames");
    } else {
        for d in &det {
            println!("  FAIL: {d}");
        }
        total_diffs += det.len();
    }

    if total_diffs == 0 {
        println!("mame-compare: PASS");
        ExitCode::SUCCESS
    } else {
        eprintln!("mame-compare: {total_diffs} divergences");
        ExitCode::from(1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn summarize_is_pure_function_of_frame_state() {
        let mut w = World::new();
        let f1 = w.tick(Inputs::default());
        let s1 = summarize(&f1);
        let s1_again = summarize(&f1);
        assert_eq!(s1, s1_again);
    }

    #[test]
    fn determinism_holds_for_600_frames() {
        let diffs = run_determinism_check();
        assert!(diffs.is_empty(), "{:?}", diffs);
    }

    #[test]
    fn every_scenario_has_a_unique_id() {
        let mut ids: Vec<_> = SCENARIOS.iter().map(|s| s.id).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), SCENARIOS.len());
    }

    #[test]
    fn run_scenario_produces_a_summary_list() {
        let g = run_scenario(&SCENARIOS[0]);
        assert!(!g.summaries.is_empty());
        assert_eq!(g.id, SCENARIOS[0].id);
    }

    #[test]
    fn every_scenario_has_at_least_one_event_at_zero() {
        for s in SCENARIOS {
            assert!(!s.events.is_empty());
            assert_eq!(s.events[0].at, 0, "{} missing frame-0 event", s.id);
        }
    }

    #[test]
    fn every_scenario_is_at_least_120_frames() {
        for s in SCENARIOS {
            assert!(
                s.frames >= 120,
                "{} too short to be a useful golden ({} frames)",
                s.id,
                s.frames,
            );
        }
    }

    #[test]
    fn every_scenario_summary_count_makes_sense() {
        for s in SCENARIOS {
            let g = run_scenario(s);
            // We sample every 8 frames plus the final frame.
            let expected = (s.frames / 8) as usize + if s.frames % 8 == 0 { 0 } else { 1 } + 1;
            // Allow ±1 to handle the off-by-one between modulus and final-frame
            // additions; this is just a sanity bound.
            let diff = (g.summaries.len() as i32 - expected as i32).abs();
            assert!(
                diff <= 1,
                "{} summary count {} differs from expected {}",
                s.id,
                g.summaries.len(),
                expected
            );
        }
    }

    #[test]
    fn run_scenario_is_deterministic() {
        for s in SCENARIOS {
            let a = run_scenario(s);
            let b = run_scenario(s);
            assert_eq!(a.summaries, b.summaries, "{} non-deterministic", s.id);
        }
    }
}
