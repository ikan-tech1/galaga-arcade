import type { FrameState } from '../state/frame';
import type { HiScoreEntry } from '@galaga/shared';

interface Props {
  frame: FrameState | null;
  hiscores: HiScoreEntry[];
  showFlags?: boolean;
}

function pad(n: number, w: number) {
  return n.toString().padStart(w, '0');
}

export function HUD({ frame, hiscores }: Props) {
  const score = frame?.score ?? 0;
  const hi = Math.max(frame?.hi_score ?? 0, hiscores[0]?.score ?? 0);
  const stage = frame?.stage ?? 1;
  const lives = frame?.lives ?? 3;
  const flags = stageFlags(stage);
  return (
    <div className="hud" role="status" aria-live="polite">
      <div className="hud__top">
        <div className="hud__player">
          <div>1UP</div>
          <div className="hud__score">{pad(score, 6)}</div>
        </div>
        <div className="hud__hi">
          <div>HIGH SCORE</div>
          <div className="hud__score">{pad(hi, 6)}</div>
        </div>
        <div className="hud__stage">
          <div>STAGE</div>
          <div className="hud__score">{pad(stage, 3)}</div>
        </div>
      </div>
      <div className="hud__bottom">
        <div className="hud__lives" aria-label={`${lives} lives`}>
          {Array.from({ length: Math.min(lives, 7) }).map((_, i) => (
            <LifeIcon key={i} />
          ))}
          {lives > 7 && <HalfLifeIcon />}
        </div>
        <div className="hud__flags" aria-label="stage flags">
          {flags.map((f, i) => (
            <FlagIcon key={i} type={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

function stageFlags(stage: number): Array<'red' | 'blue' | 'green' | 'yellow' | 'silver' | 'gold'> {
  // ROM-style flag count by stage range — capped at 10 visible.
  const out: Array<'red' | 'blue' | 'green' | 'yellow' | 'silver' | 'gold'> = [];
  let s = stage;
  while (s > 0 && out.length < 10) {
    if (s >= 50) { out.push('gold'); s -= 50; }
    else if (s >= 30) { out.push('silver'); s -= 30; }
    else if (s >= 20) { out.push('yellow'); s -= 20; }
    else if (s >= 10) { out.push('green'); s -= 10; }
    else if (s >= 5) { out.push('blue'); s -= 5; }
    else { out.push('red'); s -= 1; }
  }
  return out;
}

function LifeIcon() {
  return (
    <svg className="hud__life" viewBox="0 0 16 16" aria-hidden="true">
      <g>
        <rect x="7" y="2" width="2" height="2" fill="#ffffff" />
        <rect x="6" y="4" width="4" height="3" fill="#22d3ee" />
        <rect x="5" y="7" width="6" height="2" fill="#fde047" />
        <rect x="3" y="9" width="10" height="3" fill="#1d4ed8" />
        <rect x="2" y="12" width="12" height="2" fill="#1d4ed8" />
        <rect x="6" y="14" width="4" height="1" fill="#fde047" />
      </g>
    </svg>
  );
}

function HalfLifeIcon() {
  return (
    <svg className="hud__life" viewBox="0 0 16 16" aria-hidden="true">
      <g>
        <rect x="7" y="2" width="2" height="2" fill="#ffffff" />
        <rect x="6" y="4" width="4" height="3" fill="#22d3ee" opacity="0.5" />
        <rect x="5" y="7" width="6" height="2" fill="#fde047" opacity="0.5" />
        <rect x="3" y="9" width="10" height="3" fill="#1d4ed8" opacity="0.5" />
        <rect x="2" y="12" width="12" height="2" fill="#1d4ed8" opacity="0.5" />
      </g>
    </svg>
  );
}

function FlagIcon({ type }: { type: 'red' | 'blue' | 'green' | 'yellow' | 'silver' | 'gold' }) {
  const color = {
    red: '#ef4444',
    blue: '#1d4ed8',
    green: '#10b981',
    yellow: '#fde047',
    silver: '#cbd5f5',
    gold: '#f59e0b',
  }[type];
  return (
    <svg className="hud__flag" viewBox="0 0 18 14" aria-hidden="true">
      <rect x="2" y="0" width="14" height="9" fill={color} stroke="#ffffff" strokeWidth="1" />
      <rect x="2" y="9" width="2" height="5" fill="#ffffff" />
    </svg>
  );
}
