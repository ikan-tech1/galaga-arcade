import init, { Game } from '@galaga/engine';
// Vite handles `?url` to produce a hashed asset URL.
// @ts-ignore — vite asset query suffix
import wasmUrl from '../../../engine/pkg/galaga_engine_bg.wasm?url';

let pending: Promise<typeof Game> | null = null;

export async function loadGame(): Promise<typeof Game> {
  if (!pending) {
    pending = (async () => {
      // wasm-pack ≥0.13 expects an object argument; pass URL string as the
      // module_or_path property to avoid the deprecation warning.
      await (init as Function)({ module_or_path: wasmUrl });
      return Game;
    })();
  }
  return pending;
}

export type { Game };
