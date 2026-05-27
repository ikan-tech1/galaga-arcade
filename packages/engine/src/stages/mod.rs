//! ROM-derived stage tables.
//!
//! Sub-modules transcribe Galaga ROM data structures from the MAME core
//! (`mame/src/mame/galaga/galaga.cpp`) and the publicly-available
//! disassembly at <https://github.com/hackbar/galaga> into deterministic
//! native Rust tables. They are pure data + tiny lookup helpers — no
//! state, no allocation.
//!
//! The module is intentionally re-exported flat so existing call-sites
//! (`crate::stages::is_challenge`, etc.) continue to work after the
//! `stages.rs` → `stages/mod.rs` migration.

pub mod entry_paths;
pub mod dive_paths;
pub mod attack_tables;
pub mod bonus_triggers;

pub use attack_tables::{
    attack_pattern_for, challenge_pattern, difficulty_rank, dive_period_frames,
    dive_shot_chance_256, is_challenge, max_concurrent_dives,
};
#[allow(unused_imports)]
pub use attack_tables::{formation_layout, PATTERN_NAMES};
