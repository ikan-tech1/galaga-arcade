/**
 * Per-ship palette overrides applied to the baked player sprite. The base
 * sprite is recoloured by re-baking the player frame with the ship palette
 * blended in. We cache per-ship to avoid re-baking every frame.
 */

import { SPRITES, bakeSprite, type SpriteFrame } from './sprites';
import { shipPalette } from '../meta/ships';
import type { ShipId } from '../meta/types';

let cache: Map<string, HTMLCanvasElement> | null = null;

function ensureCache() {
  if (!cache) cache = new Map();
  return cache;
}

function blendPalette(
  base: SpriteFrame,
  overrides: Record<string, string>,
): SpriteFrame {
  return {
    ...base,
    palette: { ...base.palette, ...overrides },
  };
}

export function shipPlayerSprite(
  ship: ShipId,
  frameKind: 'idle' | 'thrust',
): HTMLCanvasElement {
  const c = ensureCache();
  const key = `${ship}-${frameKind}`;
  const existing = c.get(key);
  if (existing) return existing;
  const base = frameKind === 'thrust' ? SPRITES.playerThrust : SPRITES.player;
  const overrides = shipPalette(ship);
  // Rainbow: cycle colors at draw time (not here).
  const blended = Object.keys(overrides).length ? blendPalette(base, overrides) : base;
  const canvas = bakeSprite(blended);
  c.set(key, canvas);
  return canvas;
}

/** Per-frame rainbow tint — draws the player sprite with HSL rotation. */
export function drawRainbowPlayer(
  ctx: CanvasRenderingContext2D,
  base: HTMLCanvasElement,
  x: number,
  y: number,
  frame: number,
) {
  ctx.save();
  ctx.filter = `hue-rotate(${(frame * 8) % 360}deg) saturate(1.6)`;
  ctx.drawImage(base, x, y);
  ctx.filter = 'none';
  ctx.restore();
}

export function resetShipCache() {
  cache?.clear();
}
