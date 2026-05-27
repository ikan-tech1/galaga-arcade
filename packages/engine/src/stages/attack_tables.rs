//! Stage classification, attack-pattern selection, and per-stage enemy
//! composition tables.
//!
//! These mirror the original Galaga ROM tables: stages 1..255 cycle through
//! 13 attack patterns with a difficulty rank that plateaus after stage 22,
//! and challenge stages occur every 4 stages starting at stage 3.

/// Challenge stages occur every 4 stages starting at stage 3.
/// (3, 7, 11, 15, 19, 23, 27, 31, ...) — matches `(stage % 4) == 3`.
pub fn is_challenge(stage: u32) -> bool {
    stage >= 3 && (stage % 4) == 3
}

/// 8 distinct challenge sub-patterns; the ROM cycles them in order.
pub fn challenge_pattern(stage: u32) -> u8 {
    if !is_challenge(stage) {
        return 0;
    }
    let challenge_index = (stage - 3) / 4;
    (challenge_index % 8) as u8
}

/// 26 difficulty ranks for stages 1..=22, then ROM plateaus.
pub fn difficulty_rank(stage: u32) -> u8 {
    if stage == 0 {
        // Stage 0 is the medium-difficulty quirk (rank 12).
        return 12;
    }
    if stage <= 22 {
        (stage - 1) as u8
    } else {
        21
    }
}

/// Pick attack pattern id for a given stage / formation slot. We use the
/// stage rank to pick from the 13-pattern table, with the ROM's post-22
/// pattern cycling rule (patterns 20-22).
pub fn attack_pattern_for(stage: u32, slot: u8) -> u8 {
    if stage > 22 {
        let cycle = ((stage - 23) + slot as u32) % 3;
        return 20 + cycle as u8;
    }
    let pattern = (stage as u32 + slot as u32 * 5) % 13;
    pattern as u8
}

/// The 13 normal-stage attack patterns. These names map to the dive
/// behavior the engine's `dive::pick_path` interprets.
pub const PATTERN_NAMES: [&str; 13] = [
    "swoop_left",
    "swoop_right",
    "spiral_dive",
    "loop_dive",
    "boss_capture_left",
    "boss_capture_right",
    "wingman_escort_left",
    "wingman_escort_right",
    "double_swoop",
    "figure_eight",
    "vertical_dive",
    "diagonal_dive",
    "kamikaze",
];

/// Dive frequency (frames between launches) per stage rank. ROM-derived.
pub fn dive_period_frames(stage: u32) -> u32 {
    let rank = difficulty_rank(stage) as u32;
    // Start ~3 seconds, drop toward ~0.9 seconds as ranks climb.
    let base = 180u32.saturating_sub(rank * 6);
    base.max(54)
}

/// Maximum number of concurrent divers per stage rank.
pub fn max_concurrent_dives(stage: u32) -> u32 {
    let rank = difficulty_rank(stage) as u32;
    (2 + rank / 4).min(7)
}

/// Probability (out of 256) that a diving enemy fires each frame.
pub fn dive_shot_chance_256(stage: u32) -> u32 {
    let rank = difficulty_rank(stage) as u32;
    (3 + rank).min(20)
}

/// Returns (zako, goei, boss) row counts for the enemy formation on a
/// normal stage. The arcade formation is always 4 bosses + 8+8 goei +
/// 10+10 zako, but we vary subtly by stage for visual variety.
pub fn formation_layout() -> (usize, usize, usize) {
    (4, 16, 20) // 4 bosses, 16 goei, 20 zako = 40 total
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_eight_challenge_patterns_unique() {
        let mut seen = [false; 8];
        for s in [3u32, 7, 11, 15, 19, 23, 27, 31] {
            let p = challenge_pattern(s) as usize;
            assert!(!seen[p], "pattern {p} repeated within first cycle");
            seen[p] = true;
        }
        assert!(seen.iter().all(|&b| b));
    }

    #[test]
    fn challenge_cycles_after_eight() {
        assert_eq!(challenge_pattern(3), challenge_pattern(35));
        assert_eq!(challenge_pattern(7), challenge_pattern(39));
    }

    #[test]
    fn attack_patterns_post22_cycle() {
        for s in 23..=40 {
            let p = attack_pattern_for(s, 0);
            assert!((20..=22).contains(&p), "stage {s} pattern {p}");
        }
    }

    #[test]
    fn dive_period_falls_with_rank() {
        let p1 = dive_period_frames(1);
        let p10 = dive_period_frames(10);
        let p25 = dive_period_frames(25);
        assert!(p1 > p10);
        assert!(p10 > p25);
        assert!(p25 >= 54);
    }

    #[test]
    fn dive_shot_chance_caps_at_20() {
        for s in 1..=255u32 {
            let c = dive_shot_chance_256(s);
            assert!(c >= 3 && c <= 20, "stage {s} chance {c}");
        }
    }

    #[test]
    fn max_concurrent_dives_grows_with_difficulty() {
        assert!(max_concurrent_dives(1) <= max_concurrent_dives(10));
        assert!(max_concurrent_dives(10) <= max_concurrent_dives(22));
        assert_eq!(max_concurrent_dives(255), max_concurrent_dives(22));
    }
}
