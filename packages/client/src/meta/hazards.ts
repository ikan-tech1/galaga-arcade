/**
 * Environmental hazards — purely cosmetic-but-noticeable layers drawn over
 * the engine canvas in Endless mode (and as a rare daily modifier flavor).
 * They never modify the WASM engine state — instead they decorate the
 * playfield with asteroid fields, cosmic storms (chromatic aberration),
 * and meteor showers that the player perceives as gameplay pressure.
 */

import { SCREEN_W, SCREEN_H } from '@galaga/shared';

export type HazardKind = 'asteroids' | 'storm' | 'meteors' | 'nebula';

export interface HazardState {
  kind: HazardKind;
  framesLeft: number;
  intensity: number; // 0..1
  asteroids: Asteroid[];
  meteors: Meteor[];
  /** Counts of each hazard the player has weathered (for achievement track). */
  weathered: number;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vRot: number;
  shape: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number }>;
}

export function newHazardField(): HazardState {
  return {
    kind: 'nebula',
    framesLeft: 0,
    intensity: 0,
    asteroids: [],
    meteors: [],
    weathered: 0,
  };
}

const RNG_PRIME = 2654435761;
function fastRandom(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + RNG_PRIME) >>> 0;
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    return (s >>> 0) / 0xffffffff;
  };
}

export function spawnHazard(
  state: HazardState,
  kind: HazardKind,
  intensity: number,
  durationFrames: number,
  seed: number,
) {
  state.kind = kind;
  state.framesLeft = durationFrames;
  state.intensity = Math.min(1, Math.max(0, intensity));
  const rand = fastRandom(seed);
  state.asteroids.length = 0;
  state.meteors.length = 0;
  if (kind === 'asteroids') {
    const n = Math.round(6 + intensity * 12);
    for (let i = 0; i < n; i++) {
      state.asteroids.push({
        x: rand() * SCREEN_W,
        y: rand() * SCREEN_H,
        vx: (rand() - 0.5) * 0.3,
        vy: 0.3 + rand() * 0.7 * intensity,
        r: 4 + rand() * 6,
        rot: rand() * Math.PI * 2,
        vRot: (rand() - 0.5) * 0.05,
        shape: (rand() * 4) | 0,
      });
    }
  } else if (kind === 'meteors') {
    const n = Math.round(2 + intensity * 4);
    for (let i = 0; i < n; i++) {
      state.meteors.push({
        x: rand() * SCREEN_W,
        y: -10,
        vx: (rand() - 0.3) * 1.4,
        vy: 1.6 + rand() * 1.2,
        trail: [],
      });
    }
  }
}

export function tickHazard(state: HazardState) {
  if (state.framesLeft <= 0) return;
  state.framesLeft -= 1;
  if (state.framesLeft <= 0) {
    if (state.kind !== 'nebula') state.weathered += 1;
    state.intensity = 0;
    state.asteroids.length = 0;
    state.meteors.length = 0;
    return;
  }
  if (state.kind === 'asteroids') {
    for (const a of state.asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.vRot;
      if (a.y > SCREEN_H + 12) {
        a.y = -12;
        a.x = Math.random() * SCREEN_W;
      }
      if (a.x < -12) a.x = SCREEN_W + 12;
      if (a.x > SCREEN_W + 12) a.x = -12;
    }
  } else if (state.kind === 'meteors') {
    for (const m of state.meteors) {
      m.x += m.vx;
      m.y += m.vy;
      m.trail.unshift({ x: m.x, y: m.y });
      if (m.trail.length > 12) m.trail.pop();
      if (m.y > SCREEN_H + 8) {
        m.x = Math.random() * SCREEN_W;
        m.y = -8;
        m.trail.length = 0;
      }
    }
  }
}

export function drawHazard(
  ctx: CanvasRenderingContext2D,
  state: HazardState,
  frame: number,
) {
  if (state.framesLeft <= 0) return;
  const fade =
    Math.min(state.framesLeft, 60) / 60 *
    Math.min(1, (state.framesLeft + 60) / 120);
  ctx.save();

  if (state.kind === 'storm') {
    // Cosmic storm: chromatic aberration tint sweep.
    const t = frame * 0.05;
    const a = 0.12 * state.intensity * fade;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255, 58, 166, ${a})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = `rgba(34, 211, 238, ${a})`;
    ctx.fillRect(2 * Math.sin(t), 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = `rgba(110, 231, 183, ${a * 0.7})`;
    ctx.fillRect(-2 * Math.cos(t), 0, SCREEN_W, SCREEN_H);
    // Lightning streaks every ~30 frames.
    if (frame % 32 < 4) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * fade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let x = (frame * 7) % SCREEN_W;
      ctx.moveTo(x, 0);
      for (let y = 4; y < SCREEN_H; y += 10) {
        x += (Math.random() - 0.5) * 16;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (state.kind === 'nebula') {
    // Soft purple wash.
    const a = 0.08 * fade;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(124, 58, 237, ${a})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  } else if (state.kind === 'asteroids') {
    ctx.globalCompositeOperation = 'source-over';
    for (const a of state.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.fillStyle = '#5b4f73';
      ctx.beginPath();
      const verts = 6;
      for (let i = 0; i < verts; i++) {
        const ang = (i / verts) * Math.PI * 2;
        const r = a.r * (0.7 + ((a.shape * (i + 1)) & 7) / 14);
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7c6c91';
      ctx.fillRect(-a.r * 0.3, -a.r * 0.3, 1.5, 1.5);
      ctx.fillRect(a.r * 0.2, a.r * 0.1, 1.5, 1.5);
      ctx.strokeStyle = '#2a1f3d';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    }
  } else if (state.kind === 'meteors') {
    ctx.globalCompositeOperation = 'lighter';
    for (const m of state.meteors) {
      const trail = m.trail;
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        const a = (1 - i / trail.length) * 0.7 * fade;
        ctx.fillStyle = `rgba(255, 209, 102, ${a})`;
        ctx.fillRect(t.x | 0, t.y | 0, 2, 2);
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * fade})`;
      ctx.fillRect(m.x | 0, m.y | 0, 3, 3);
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 6;
      ctx.fillRect(m.x | 0, m.y | 0, 3, 3);
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}
