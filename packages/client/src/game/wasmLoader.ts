import init, { Game } from '@galaga/engine';
// Vite handles `?url` to produce a hashed asset URL.
// @ts-ignore — vite asset query suffix
import wasmUrl from '../../../engine/pkg/galaga_engine_bg.wasm?url';

let pending: Promise<typeof Game> | null = null;

export async function loadGame(): Promise<typeof Game> {
  if (!pending) {
    pending = (async () => {
      await init(wasmUrl);
      return Game;
    })();
  }
  return pending;
}

export type { Game };
