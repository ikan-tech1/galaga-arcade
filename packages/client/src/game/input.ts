/** Keyboard + gamepad input → packed bitfield matching Rust `Inputs`. */

export const INPUT_LEFT = 1 << 0;
export const INPUT_RIGHT = 1 << 1;
export const INPUT_FIRE = 1 << 2;
export const INPUT_START = 1 << 3;
export const INPUT_COIN = 1 << 4;
export const INPUT_UP = 1 << 5;
export const INPUT_DOWN = 1 << 6;
export const INPUT_PAUSE = 1 << 7;

export interface InputDevices {
  bind(target: Window | HTMLElement): () => void;
  read(): number; // packed bits
}

const KEY_MAP: Record<string, number> = {
  ArrowLeft: INPUT_LEFT,
  KeyA: INPUT_LEFT,
  ArrowRight: INPUT_RIGHT,
  KeyD: INPUT_RIGHT,
  ArrowUp: INPUT_UP,
  KeyW: INPUT_UP,
  ArrowDown: INPUT_DOWN,
  KeyS: INPUT_DOWN,
  Space: INPUT_FIRE,
  KeyZ: INPUT_FIRE,
  KeyJ: INPUT_FIRE,
  Enter: INPUT_START,
  NumpadEnter: INPUT_START,
  Digit5: INPUT_COIN,
  KeyC: INPUT_COIN,
  KeyP: INPUT_PAUSE,
  Pause: INPUT_PAUSE,
  Escape: 0,
};

export function createInputDevices(): InputDevices {
  let bits = 0;

  const keydown = (e: KeyboardEvent) => {
    const flag = KEY_MAP[e.code];
    if (flag !== undefined) {
      bits |= flag;
      if (flag !== 0) e.preventDefault();
    }
  };
  const keyup = (e: KeyboardEvent) => {
    const flag = KEY_MAP[e.code];
    if (flag !== undefined) {
      bits &= ~flag;
      if (flag !== 0) e.preventDefault();
    }
  };
  const blur = () => { bits = 0; };

  return {
    bind(target) {
      const t = target as Window;
      t.addEventListener('keydown', keydown);
      t.addEventListener('keyup', keyup);
      t.addEventListener('blur', blur);
      return () => {
        t.removeEventListener('keydown', keydown);
        t.removeEventListener('keyup', keyup);
        t.removeEventListener('blur', blur);
      };
    },
    read() {
      let extra = 0;
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gps = navigator.getGamepads?.() ?? [];
        for (const gp of gps) {
          if (!gp) continue;
          const ax = gp.axes[0] ?? 0;
          if (ax < -0.4) extra |= INPUT_LEFT;
          if (ax > 0.4) extra |= INPUT_RIGHT;
          const ay = gp.axes[1] ?? 0;
          if (ay < -0.4) extra |= INPUT_UP;
          if (ay > 0.4) extra |= INPUT_DOWN;
          // Dpad
          if (gp.buttons[14]?.pressed) extra |= INPUT_LEFT;
          if (gp.buttons[15]?.pressed) extra |= INPUT_RIGHT;
          if (gp.buttons[12]?.pressed) extra |= INPUT_UP;
          if (gp.buttons[13]?.pressed) extra |= INPUT_DOWN;
          // Face buttons
          if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) extra |= INPUT_FIRE;
          if (gp.buttons[9]?.pressed) extra |= INPUT_START;
          if (gp.buttons[8]?.pressed) extra |= INPUT_COIN;
          if (gp.buttons[6]?.pressed) extra |= INPUT_PAUSE;
        }
      }
      return bits | extra;
    },
  };
}
