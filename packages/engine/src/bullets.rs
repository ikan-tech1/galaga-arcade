//! Bullet entity definitions. Bullets are dumb position holders; their
//! velocity and despawn rules live in [`crate::state::World::advance_bullets`].

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BulletKind {
    Player,
    Enemy,
}

#[derive(Clone, Copy, Debug)]
pub struct Bullet {
    pub x: i32,
    pub y: i32,
    pub kind: BulletKind,
    pub alive: bool,
    pub vx: f32,
}

impl Bullet {
    pub fn vx_int(&self) -> i32 {
        self.vx as i32
    }
}

impl Default for Bullet {
    fn default() -> Self {
        Self {
            x: 0,
            y: 0,
            kind: BulletKind::Player,
            alive: true,
            vx: 0.0,
        }
    }
}
