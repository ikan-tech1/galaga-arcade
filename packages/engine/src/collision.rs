//! Pixel-aligned AABB collision used by both Rust unit tests and the
//! TypeScript runtime via `aabb_overlap`.

#[inline]
pub fn aabb(
    ax: i32, ay: i32, aw: i32, ah: i32,
    bx: i32, by: i32, bw: i32, bh: i32,
) -> bool {
    ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah
}
