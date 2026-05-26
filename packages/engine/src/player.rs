//! Player ship state machine.
//!
//! Handles horizontal movement, death, respawn invuln blink, and the
//! dual-fighter "rescued ship" augmentation.

use crate::constants::*;
use crate::Inputs;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PlayerState {
    Alive,
    Dying { frames_left: u32 },
    WaitingRespawn { frames_left: u32 },
    GameOver,
}

pub struct Player {
    pub x: i32,
    pub y: i32,
    pub state: PlayerState,
    pub lives: u32,
    pub last_fire_frame: Option<u64>,
    pub invuln_remaining: u32,
    /// When true, the rescued ship is docked to the right of the main ship
    /// and fires synchronized double shots.
    pub dual: bool,
}

impl Player {
    pub fn new() -> Self {
        let x = (SCREEN_W - PLAYER_W) / 2;
        Self {
            x,
            y: PLAYER_Y,
            state: PlayerState::Alive,
            lives: START_LIVES,
            last_fire_frame: None,
            invuln_remaining: RESPAWN_INVULN_FRAMES,
            dual: false,
        }
    }

    pub fn is_invulnerable(&self) -> bool {
        self.invuln_remaining > 0
    }

    pub fn is_done_dying(&self) -> bool {
        matches!(self.state, PlayerState::WaitingRespawn { frames_left: 0 } | PlayerState::GameOver)
    }

    pub fn tick(&mut self, inputs: Inputs, _frame: u64) {
        if self.invuln_remaining > 0 {
            self.invuln_remaining -= 1;
        }

        match self.state {
            PlayerState::Alive => self.move_alive(inputs),
            PlayerState::Dying { frames_left } => {
                let frames_left = frames_left.saturating_sub(1);
                if frames_left == 0 {
                    if self.lives == 0 {
                        self.state = PlayerState::GameOver;
                    } else {
                        self.state =
                            PlayerState::WaitingRespawn { frames_left: 30 };
                    }
                } else {
                    self.state = PlayerState::Dying { frames_left };
                }
            }
            PlayerState::WaitingRespawn { frames_left } => {
                let frames_left = frames_left.saturating_sub(1);
                if frames_left == 0 {
                    // Caller (`tick_player_dying`) will call `respawn()`.
                    self.state = PlayerState::WaitingRespawn { frames_left: 0 };
                } else {
                    self.state = PlayerState::WaitingRespawn { frames_left };
                }
            }
            PlayerState::GameOver => { /* held until World resets */ }
        }
    }

    fn move_alive(&mut self, inputs: Inputs) {
        let mut dx = 0;
        if inputs.left {
            dx -= PLAYER_MAX_SPEED;
        }
        if inputs.right {
            dx += PLAYER_MAX_SPEED;
        }
        let width = if self.dual { PLAYER_W * 2 + 4 } else { PLAYER_W };
        self.x = (self.x + dx).clamp(0, SCREEN_W - width);
    }

    pub fn kill(&mut self) {
        if !matches!(self.state, PlayerState::Alive) {
            return;
        }
        self.state = PlayerState::Dying {
            frames_left: DEATH_EXPLODE_FRAMES,
        };
        self.lives = self.lives.saturating_sub(1);
    }

    pub fn respawn(&mut self) {
        self.x = (SCREEN_W - PLAYER_W) / 2;
        self.y = PLAYER_Y;
        self.invuln_remaining = RESPAWN_INVULN_FRAMES;
        self.state = PlayerState::Alive;
    }
}
