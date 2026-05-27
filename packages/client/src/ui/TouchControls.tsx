import { useCallback, useEffect, useRef } from 'react';
import {
  INPUT_FIRE,
  INPUT_LEFT,
  INPUT_PAUSE,
  INPUT_RIGHT,
  INPUT_START,
  clearTouchBits,
  pulseTouchBit,
  setTouchBit,
} from '../game/input';

interface Props {
  /** When true the dev-pad/fire-button surface is rendered. */
  active: boolean;
  /** Called when the player taps START on attract / between phases. */
  onStart?: () => void;
  /** Current game phase — controls what the touch UI is allowed to do. */
  phase: string;
}

const DEAD_ZONE_PX = 8;

/**
 * Bottom-of-screen virtual controls for phones/tablets.
 *
 * Layout:
 *   [ drag-pad LEFT half ]  [ FIRE button RIGHT half ]
 *   small PAUSE / START chip top-right of pad strip
 *
 * The drag-pad treats the whole left half as a relative track-pad: the touch
 * down sets the origin and any horizontal delta past the dead-zone fires
 * LEFT / RIGHT bits. This is more forgiving than fixed buttons because the
 * player never has to look at their thumb.
 *
 * The right half is a single huge fire-zone (every tap = INPUT_FIRE held for
 * its lifetime) plus a visible round button as a hit-target hint.
 */
export function TouchControls({ active, onStart, phase }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const padOriginX = useRef<number | null>(null);
  const padPointerId = useRef<number | null>(null);
  const lastDir = useRef<number>(0);

  const fireRef = useRef<HTMLDivElement>(null);
  const firePointers = useRef<Set<number>>(new Set());

  const releaseDir = useCallback(() => {
    if (lastDir.current & INPUT_LEFT) setTouchBit(INPUT_LEFT, false);
    if (lastDir.current & INPUT_RIGHT) setTouchBit(INPUT_RIGHT, false);
    lastDir.current = 0;
    padOriginX.current = null;
    padPointerId.current = null;
  }, []);

  const releaseFire = useCallback((id: number) => {
    firePointers.current.delete(id);
    if (firePointers.current.size === 0) setTouchBit(INPUT_FIRE, false);
  }, []);

  // Clear bits if disabled.
  useEffect(() => {
    if (!active) {
      clearTouchBits();
      padOriginX.current = null;
      padPointerId.current = null;
      firePointers.current.clear();
      lastDir.current = 0;
    }
  }, [active]);

  // Lock the page from scrolling/zooming inside the controls when active.
  useEffect(() => {
    if (!active) return;
    const block = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault(); // pinch
    };
    document.addEventListener('gesturestart', preventDefault, { passive: false });
    document.addEventListener('touchmove', block, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', preventDefault);
      document.removeEventListener('touchmove', block);
    };
  }, [active]);

  if (!active) return null;

  // Pad pointer handlers — relative drag.
  const onPadDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (padPointerId.current != null) return;
    padPointerId.current = e.pointerId;
    padOriginX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPadMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (padPointerId.current !== e.pointerId || padOriginX.current == null) return;
    const dx = e.clientX - padOriginX.current;
    let dir = 0;
    if (dx < -DEAD_ZONE_PX) dir = INPUT_LEFT;
    else if (dx > DEAD_ZONE_PX) dir = INPUT_RIGHT;
    if (dir !== lastDir.current) {
      if (lastDir.current === INPUT_LEFT && dir !== INPUT_LEFT) setTouchBit(INPUT_LEFT, false);
      if (lastDir.current === INPUT_RIGHT && dir !== INPUT_RIGHT) setTouchBit(INPUT_RIGHT, false);
      if (dir === INPUT_LEFT) setTouchBit(INPUT_LEFT, true);
      if (dir === INPUT_RIGHT) setTouchBit(INPUT_RIGHT, true);
      lastDir.current = dir;
    }
  };
  const onPadUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (padPointerId.current === e.pointerId) releaseDir();
  };

  // Discrete D-pad button helpers (tap-and-hold left/right corners).
  const holdBit = (bit: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setTouchBit(bit, true);
  };
  const releaseBit = (bit: number) => () => setTouchBit(bit, false);

  // Fire-zone handlers — every tracked pointer = held fire.
  const onFireDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    firePointers.current.add(e.pointerId);
    setTouchBit(INPUT_FIRE, true);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (phase === 'attract' && onStart) onStart();
  };
  const onFireUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    releaseFire(e.pointerId);
  };

  // START / PAUSE chip
  const onStartTap = () => {
    if (phase === 'attract' && onStart) onStart();
    pulseTouchBit(INPUT_START, 6);
  };
  const onPauseTap = () => pulseTouchBit(INPUT_PAUSE, 6);

  return (
    <div className="touch" role="group" aria-label="On-screen game controls">
      <div className="touch__chips">
        <button
          type="button"
          className="touch__chip"
          onPointerDown={onStartTap}
          aria-label={phase === 'attract' ? 'Start game' : 'Send start'}
        >
          {phase === 'attract' ? 'START' : '1P'}
        </button>
        <button
          type="button"
          className="touch__chip touch__chip--mag"
          onPointerDown={onPauseTap}
          aria-label="Pause"
        >
          ❚❚
        </button>
      </div>

      <div
        className="touch__pad"
        ref={padRef}
        onPointerDown={onPadDown}
        onPointerMove={onPadMove}
        onPointerUp={onPadUp}
        onPointerCancel={onPadUp}
        onLostPointerCapture={() => releaseDir()}
        aria-label="Drag left or right to move"
      >
        <button
          type="button"
          className="touch__dbtn touch__dbtn--l"
          aria-label="Move left"
          onPointerDown={holdBit(INPUT_LEFT)}
          onPointerUp={releaseBit(INPUT_LEFT)}
          onPointerCancel={releaseBit(INPUT_LEFT)}
          onLostPointerCapture={releaseBit(INPUT_LEFT)}
        >
          ◀
        </button>
        <span className="touch__pad-hint">DRAG · TAP</span>
        <button
          type="button"
          className="touch__dbtn touch__dbtn--r"
          aria-label="Move right"
          onPointerDown={holdBit(INPUT_RIGHT)}
          onPointerUp={releaseBit(INPUT_RIGHT)}
          onPointerCancel={releaseBit(INPUT_RIGHT)}
          onLostPointerCapture={releaseBit(INPUT_RIGHT)}
        >
          ▶
        </button>
      </div>

      <div
        className="touch__fire"
        ref={fireRef}
        onPointerDown={onFireDown}
        onPointerUp={onFireUp}
        onPointerCancel={onFireUp}
        onLostPointerCapture={(e) => releaseFire(e.pointerId)}
        aria-label="Fire"
      >
        <span className="touch__fire-ring" aria-hidden="true" />
        <span className="touch__fire-label">FIRE</span>
      </div>
    </div>
  );
}

function preventDefault(e: Event) {
  e.preventDefault();
}
