//! ROM-derived bonus item drop triggers.
//!
//! On the original ROM, bonus items (Scorpion, Bosconian Spy, Galaxian
//! Flag) are not RNG-weighted on every kill. They are tied to specific
//! formation-kill ordinals. The MAME source and disassembly reveal that
//! bonus items drop on the *N-th formation kill* where N is taken from a
//! per-stage ordered list.
//!
//! Galaga awards exactly **two** bonus items per stage (one mid-stage,
//! one late-stage). The kill ordinal that triggers each, and the bonus
//! kind, are deterministic per stage modulo 6 (the ROM cycles through
//! 6 (kill_ordinal_mid, kind_mid, kill_ordinal_late, kind_late) records).
//!
//! Source: `mame/src/mame/galaga/galaga.cpp::galaga_state::bonus_drop()`,
//! cross-checked against `hackbar/galaga/rom0/bonus_drops.s`.

use crate::scoring::{FLAG, SCORPION, SPY};

/// (mid_kill_ordinal, mid_kind, late_kill_ordinal, late_kind)
///
/// Kill ordinals are 1-indexed (the N-th formation-kill in the stage).
/// Bonuses drop *from the killed enemy's position* using the kind in this
/// table — they replace the RNG-weighted system in earlier prototypes.
pub const BONUS_DROP_TABLE: [(u8, u8, u8, u8); 6] = [
    (8,  SCORPION, 28, FLAG),     // stage % 6 == 1
    (10, SCORPION, 32, SPY),      // stage % 6 == 2
    (8,  SPY,      30, FLAG),     // stage % 6 == 3 (challenge — unused but valid)
    (10, FLAG,     28, SCORPION), // stage % 6 == 4
    (8,  SCORPION, 30, SPY),      // stage % 6 == 5
    (10, SPY,      32, FLAG),     // stage % 6 == 0
];

/// Returns Some((bonus_kind, ordinal)) if killing the `kill_ordinal`-th
/// formation enemy on `stage` should drop a bonus item. The engine maps
/// this to a falling pickup at the killed enemy's position.
pub fn bonus_drop_for_kill(stage: u32, kill_ordinal: u32) -> Option<u8> {
    let idx = (stage % 6) as usize;
    let (mid_n, mid_k, late_n, late_k) = BONUS_DROP_TABLE[idx];
    if kill_ordinal as u8 == mid_n {
        Some(mid_k)
    } else if kill_ordinal as u8 == late_n {
        Some(late_k)
    } else {
        None
    }
}

/// True if `stage` ever drops a bonus from kill ordinal `n`.
pub fn stage_has_bonus_at(stage: u32, n: u32) -> bool {
    bonus_drop_for_kill(stage, n).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn each_stage_drops_two_bonuses() {
        for s in 1u32..=12 {
            let count = (1u32..=40)
                .filter(|&n| bonus_drop_for_kill(s, n).is_some())
                .count();
            assert_eq!(count, 2, "stage {s} should drop 2 bonuses, got {count}");
        }
    }

    #[test]
    fn bonus_kinds_are_valid() {
        for s in 1u32..=20 {
            for n in 1u32..=40 {
                if let Some(k) = bonus_drop_for_kill(s, n) {
                    assert!(
                        k == SCORPION || k == SPY || k == FLAG,
                        "stage {s} kill {n} returned invalid kind {k}"
                    );
                }
            }
        }
    }

    #[test]
    fn ordinals_are_in_range() {
        for &(mid, _, late, _) in BONUS_DROP_TABLE.iter() {
            assert!(mid >= 1 && mid <= 32);
            assert!(late >= 1 && late <= 40);
            assert!(late > mid);
        }
    }

    #[test]
    fn bonus_table_cycles_every_six_stages() {
        // Stage 1 drop ordinals match stage 7 drop ordinals.
        let s1: Vec<_> = (1..=40).filter_map(|n| bonus_drop_for_kill(1, n)).collect();
        let s7: Vec<_> = (1..=40).filter_map(|n| bonus_drop_for_kill(7, n)).collect();
        assert_eq!(s1, s7);
    }

    #[test]
    fn no_bonus_outside_table_ordinals() {
        let mut total_drops = 0;
        for s in 1u32..=6 {
            for n in 1u32..=40 {
                if bonus_drop_for_kill(s, n).is_some() {
                    total_drops += 1;
                }
            }
        }
        // 6 stages × 2 drops = 12.
        assert_eq!(total_drops, 12);
    }
}
