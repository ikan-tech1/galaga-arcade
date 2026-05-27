import { useState } from 'react';
import { MISSIONS } from '../meta/missions';
import type { MetaProgression } from '../meta/types';

interface Props {
  meta: MetaProgression;
  onStart: (missionId: string) => void;
  onClose: () => void;
}

export function MissionBoard({ meta, onStart, onClose }: Props) {
  const [selected, setSelected] = useState<string>(MISSIONS[0].id);
  const sel = MISSIONS.find((m) => m.id === selected) ?? MISSIONS[0];
  const stars = meta.missionStars[sel.id] ?? 0;
  const locked = sel.requires && !meta.completedMissions.includes(sel.requires);

  return (
    <div className="overlay overlay--interactive mission-board">
      <header className="mission-board__header">
        <h2 className="mission-board__title">MISSION BOARD</h2>
        <div className="mission-board__counter">
          {meta.completedMissions.length}/{MISSIONS.length} COMPLETED
        </div>
      </header>

      <div className="mission-board__layout">
        <ul className="mission-board__list">
          {MISSIONS.map((m) => {
            const cleared = meta.completedMissions.includes(m.id);
            const locked = m.requires && !meta.completedMissions.includes(m.requires);
            const s = meta.missionStars[m.id] ?? 0;
            return (
              <li
                key={m.id}
                className={`mission-board__row${
                  m.id === selected ? ' mission-board__row--active' : ''
                }${locked ? ' mission-board__row--locked' : ''}${
                  cleared ? ' mission-board__row--cleared' : ''
                }`}
                onClick={() => setSelected(m.id)}
              >
                <div className="mission-board__rank">
                  <Stars count={s} dim={!cleared && !s} />
                </div>
                <div className="mission-board__row-body">
                  <div className="mission-board__row-name">
                    {locked ? '— LOCKED —' : m.name}
                  </div>
                  <div className="mission-board__row-brief">{m.brief}</div>
                </div>
                {locked && <div className="mission-board__lock">🔒</div>}
              </li>
            );
          })}
        </ul>

        <div className="mission-board__detail">
          <div className="mission-board__detail-head">
            <div className="mission-board__detail-name">{locked ? 'LOCKED' : sel.name}</div>
            <Stars count={stars} />
          </div>
          <div className="mission-board__detail-brief">{sel.brief}</div>
          <div className="mission-board__detail-objectives">
            {sel.objectives.map((o, i) => (
              <div key={o.id} className="mission-board__objective">
                <span className="mission-board__objective-idx">{i + 1}.</span>
                <span>{o.text}</span>
              </div>
            ))}
          </div>
          <div className="mission-board__reward">
            REWARD · {sel.rewardCredits} CR
          </div>
          <button
            className="neon-btn neon-btn--start"
            onClick={() => !locked && onStart(sel.id)}
            disabled={!!locked}
          >
            {locked ? 'COMPLETE PREVIOUS MISSION' : 'LAUNCH'}
          </button>
        </div>
      </div>

      <footer className="mission-board__footer">
        <button className="neon-btn" onClick={onClose}>← BACK</button>
      </footer>
    </div>
  );
}

function Stars({ count, dim = false }: { count: number; dim?: boolean }) {
  return (
    <div className={`stars${dim ? ' stars--dim' : ''}`} aria-label={`${count} stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`stars__star${i < count ? ' stars__star--on' : ''}`}>★</span>
      ))}
    </div>
  );
}
