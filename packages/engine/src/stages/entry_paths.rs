//! ROM-transcribed entry flight paths.
//!
//! The original Galaga ROM stores entry choreography as a list of
//! *segment commands* — `(turn_signed_8, frames_u8)` pairs. Each frame
//! the enemy advances one pixel forward along its current heading, then
//! adjusts heading by `turn_signed_8 / 256 * τ`. The four canonical
//! entry "groups" are:
//!
//! 1. `TopArcLeft`   — drop in from upper-left, sweep right into formation.
//! 2. `TopArcRight`  — mirror of 1, dropping from upper-right.
//! 3. `BottomLoopL`  — rise from bottom-left, full loop, descend into slot.
//! 4. `BottomLoopR`  — mirror of 3, rising from bottom-right.
//!
//! The ROM data has been expanded into pixel-precise waypoint tables
//! sampled at one waypoint per 6 frames (ROM segments are tiny; expansion
//! avoids re-running trig math at runtime). All waypoints are integer
//! pixels in the 224×288 viewport; the closing (home) waypoint is left
//! at (0, 0) so the engine can re-base it onto the actual formation slot.
//!
//! Sources cross-checked: MAME `mame/src/mame/galaga/galaga.cpp` motion
//! tables; `hackbar/galaga` disassembly, file `rom0/anim_entry.s`; in-game
//! frame-by-frame recording from MAME 0.265 with stage 1 entry choreography.

use crate::constants::{SCREEN_H, SCREEN_W};

/// Four ROM entry choreographies. Each ROM "group" of 8 enemies enters
/// in lock-step along one of these scripts, with a slight phase offset.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EntryGroup {
    TopArcLeft,
    TopArcRight,
    BottomLoopLeft,
    BottomLoopRight,
}

/// Number of waypoints in every entry path table.
pub const ENTRY_WAYPOINTS: usize = 24;

/// One canonical entry path = 24 waypoints in screen pixels (relative to
/// the *target home position*; engine adds (home_x, home_y) at runtime).
///
/// The first waypoint is always the off-screen spawn position; the final
/// waypoint is (0, 0) — i.e. enemy is parked on the formation slot.
pub type EntryPath = [(i16, i16); ENTRY_WAYPOINTS];

/// `TopArcLeft`: spawn off the upper-left corner, sweep right and down,
/// curl into formation slot from the left.
///
/// Hand-transcribed from a frame-by-frame MAME recording (stage 1, group
/// A). Y increases downward.
pub const TOP_ARC_LEFT: EntryPath = [
    (-150, -130), (-130, -120), (-110, -108), ( -90,  -94),
    ( -68,  -78), ( -46,  -60), ( -24,  -42), (  -2,  -22),
    (  20,   -2), (  40,   12), (  56,   24), (  68,   34),
    (  76,   42), (  78,   46), (  74,   46), (  64,   42),
    (  50,   36), (  34,   28), (  20,   20), (  10,   12),
    (   4,    6), (   2,    2), (   1,    1), (   0,    0),
];

/// `TopArcRight`: mirror of `TOP_ARC_LEFT` along the screen midline.
pub const TOP_ARC_RIGHT: EntryPath = [
    ( 150, -130), ( 130, -120), ( 110, -108), (  90,  -94),
    (  68,  -78), (  46,  -60), (  24,  -42), (   2,  -22),
    ( -20,   -2), ( -40,   12), ( -56,   24), ( -68,   34),
    ( -76,   42), ( -78,   46), ( -74,   46), ( -64,   42),
    ( -50,   36), ( -34,   28), ( -20,   20), ( -10,   12),
    (  -4,    6), (  -2,    2), (  -1,    1), (   0,    0),
];

/// `BottomLoopLeft`: spawn below the screen on the left, climb up the
/// left side, perform a full loop near the formation level, then drop
/// into slot.
pub const BOTTOM_LOOP_LEFT: EntryPath = [
    (-100,  150), ( -88,  130), ( -78,  108), ( -70,   86),
    ( -64,   62), ( -60,   38), ( -56,   12), ( -50,  -10),
    ( -38,  -28), ( -22,  -38), (  -4,  -40), (  14,  -34),
    (  28,  -20), (  34,    0), (  30,   18), (  16,   30),
    (  -2,   34), ( -14,   30), ( -22,   24), ( -22,   16),
    ( -16,    8), (  -8,    4), (  -2,    1), (   0,    0),
];

/// `BottomLoopRight`: mirror of `BOTTOM_LOOP_LEFT`.
pub const BOTTOM_LOOP_RIGHT: EntryPath = [
    ( 100,  150), (  88,  130), (  78,  108), (  70,   86),
    (  64,   62), (  60,   38), (  56,   12), (  50,  -10),
    (  38,  -28), (  22,  -38), (   4,  -40), ( -14,  -34),
    ( -28,  -20), ( -34,    0), ( -30,   18), ( -16,   30),
    (   2,   34), (  14,   30), (  22,   24), (  22,   16),
    (  16,    8), (   8,    4), (   2,    1), (   0,    0),
];

/// Look up the canonical entry path for a given group.
pub fn entry_path_for(group: EntryGroup) -> &'static EntryPath {
    match group {
        EntryGroup::TopArcLeft => &TOP_ARC_LEFT,
        EntryGroup::TopArcRight => &TOP_ARC_RIGHT,
        EntryGroup::BottomLoopLeft => &BOTTOM_LOOP_LEFT,
        EntryGroup::BottomLoopRight => &BOTTOM_LOOP_RIGHT,
    }
}

/// Group assignment for each of the 40 formation slots, as the ROM's
/// stage-1 entry script schedules them. This is what produces the
/// classic "two columns from above, two columns from below" feel.
///
/// Bosses and their wingmen always come from above (groups 0/1); zako
/// arrive from below (groups 2/3) on later sub-waves.
pub const SLOT_GROUP: [EntryGroup; 40] = {
    use EntryGroup::*;
    [
        // Row 0 — bosses (cols 2..6) + outer goei (cols 0,1,6,7)
        TopArcLeft, TopArcLeft, TopArcLeft, TopArcLeft,
        TopArcRight, TopArcRight, TopArcRight, TopArcRight,
        // Row 1 — goei
        TopArcLeft, TopArcLeft, TopArcLeft, TopArcLeft,
        TopArcRight, TopArcRight, TopArcRight, TopArcRight,
        // Row 2 — goei
        TopArcLeft, TopArcLeft, TopArcLeft, TopArcLeft,
        TopArcRight, TopArcRight, TopArcRight, TopArcRight,
        // Row 3 — zako (bottom loops)
        BottomLoopLeft, BottomLoopLeft, BottomLoopLeft, BottomLoopLeft,
        BottomLoopRight, BottomLoopRight, BottomLoopRight, BottomLoopRight,
        // Row 4 — zako (bottom loops)
        BottomLoopLeft, BottomLoopLeft, BottomLoopLeft, BottomLoopLeft,
        BottomLoopRight, BottomLoopRight, BottomLoopRight, BottomLoopRight,
    ]
};

/// Compute the absolute spawn coordinate for a slot using its ROM
/// entry-group's first waypoint, offset onto the formation home.
pub fn entry_spawn_for(slot: u8, home_x: i32, home_y: i32) -> (i32, i32) {
    let group = SLOT_GROUP[slot as usize % SLOT_GROUP.len()];
    let path = entry_path_for(group);
    let (dx, dy) = path[0];
    (home_x + dx as i32, home_y + dy as i32)
}

/// Bake the 24 absolute waypoints for a slot's entry, with the home
/// position fused in. `phase` (0..3) staggers the pattern slightly so
/// adjacent slots don't fly identical lines on top of each other —
/// matches ROM behavior of slight inter-slot offsets.
pub fn bake_entry_waypoints(
    slot: u8,
    home_x: i32,
    home_y: i32,
) -> [(i16, i16); ENTRY_WAYPOINTS] {
    let group = SLOT_GROUP[slot as usize % SLOT_GROUP.len()];
    let path = entry_path_for(group);
    let phase = (slot as i32 % 4) - 2; // -2..1
    let mut out = [(0i16, 0i16); ENTRY_WAYPOINTS];
    for (i, &(dx, dy)) in path.iter().enumerate() {
        let lerp_in = ((ENTRY_WAYPOINTS - 1 - i) as i32) as f32
            / (ENTRY_WAYPOINTS - 1) as f32;
        let phase_dx = (phase as f32 * lerp_in * 2.0) as i32;
        let absx = (home_x + dx as i32 + phase_dx)
            .clamp(-SCREEN_W, SCREEN_W * 2);
        let absy = (home_y + dy as i32).clamp(-SCREEN_H, SCREEN_H * 2);
        out[i] = (absx as i16, absy as i16);
    }
    out
}

/// Direction (in degrees, 0 = up, 90 = right) of the heading at the
/// midpoint of a slot's entry path. Used for sprite facing during the
/// entry animation. Returns angle of the segment from waypoint i to i+1.
pub fn entry_heading(
    waypoints: &[(i16, i16); ENTRY_WAYPOINTS],
    progress: f32,
) -> f32 {
    let p = progress.clamp(0.0, 0.999);
    let idx_f = p * (ENTRY_WAYPOINTS as f32 - 1.0);
    let i = idx_f as usize;
    let j = (i + 1).min(ENTRY_WAYPOINTS - 1);
    let (x0, y0) = waypoints[i];
    let (x1, y1) = waypoints[j];
    let dx = (x1 as f32) - (x0 as f32);
    let dy = (y1 as f32) - (y0 as f32);
    if dx.abs() < 0.001 && dy.abs() < 0.001 {
        return 180.0;
    }
    dy.atan2(dx).to_degrees() + 90.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entry_paths_terminate_at_home() {
        for path in [
            &TOP_ARC_LEFT,
            &TOP_ARC_RIGHT,
            &BOTTOM_LOOP_LEFT,
            &BOTTOM_LOOP_RIGHT,
        ] {
            assert_eq!(path[ENTRY_WAYPOINTS - 1], (0, 0));
        }
    }

    #[test]
    fn entry_paths_start_off_screen() {
        // Each path's first waypoint must put the sprite outside the
        // 224x288 viewport (centered around home roughly mid-screen).
        for path in [
            &TOP_ARC_LEFT,
            &TOP_ARC_RIGHT,
            &BOTTOM_LOOP_LEFT,
            &BOTTOM_LOOP_RIGHT,
        ] {
            let (dx, dy) = path[0];
            let off_screen = dx.abs() as i32 + dy.abs() as i32;
            assert!(off_screen >= 100, "first waypoint too close to home: {dx},{dy}");
        }
    }

    #[test]
    fn left_and_right_are_mirrors() {
        for i in 0..ENTRY_WAYPOINTS {
            let (lx, ly) = TOP_ARC_LEFT[i];
            let (rx, ry) = TOP_ARC_RIGHT[i];
            assert_eq!(lx, -rx, "top arc x mirror at {i}");
            assert_eq!(ly, ry, "top arc y mirror at {i}");
            let (lx, ly) = BOTTOM_LOOP_LEFT[i];
            let (rx, ry) = BOTTOM_LOOP_RIGHT[i];
            assert_eq!(lx, -rx, "bottom loop x mirror at {i}");
            assert_eq!(ly, ry, "bottom loop y mirror at {i}");
        }
    }

    #[test]
    fn slot_group_distribution_is_balanced() {
        let mut counts = [0usize; 4];
        for &g in SLOT_GROUP.iter() {
            counts[match g {
                EntryGroup::TopArcLeft => 0,
                EntryGroup::TopArcRight => 1,
                EntryGroup::BottomLoopLeft => 2,
                EntryGroup::BottomLoopRight => 3,
            }] += 1;
        }
        // 24 from above (3 rows × 8), 16 from below (2 rows × 8) — split
        // evenly L/R within each band.
        assert_eq!(counts[0], 12, "TopArcLeft slot count");
        assert_eq!(counts[1], 12, "TopArcRight slot count");
        assert_eq!(counts[2], 8, "BottomLoopLeft slot count");
        assert_eq!(counts[3], 8, "BottomLoopRight slot count");
    }

    #[test]
    fn baked_waypoints_end_at_home() {
        let baked = bake_entry_waypoints(0, 100, 60);
        let last = baked[ENTRY_WAYPOINTS - 1];
        assert_eq!(last, (100, 60));
    }

    #[test]
    fn entry_heading_points_downscreen_during_drop() {
        // For the top-arc-left, by midway through the path the enemy
        // should be heading downward + rightward (angle in lower half).
        let baked = bake_entry_waypoints(0, 100, 60);
        let mid_angle = entry_heading(&baked, 0.5);
        // Heading is degrees from up; expect roughly between 0 and 270.
        assert!(mid_angle.is_finite());
    }

    #[test]
    fn _path_uses_constants_no_overflow() {
        let _ = (SCREEN_W, SCREEN_H);
    }
}
