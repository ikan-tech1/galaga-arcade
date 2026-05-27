import { MISSIONS } from '../meta/missions';
import { SHIPS } from '../meta/ships';

interface Props {
  missionId: string;
  ship: string;
  onLaunch: () => void;
  onAbort: () => void;
}

export function MissionBriefing({ missionId, ship, onLaunch, onAbort }: Props) {
  const m = MISSIONS.find((x) => x.id === missionId);
  if (!m) return null;
  const s = SHIPS[ship as keyof typeof SHIPS] ?? SHIPS.fighter;
  return (
    <div className="overlay overlay--interactive briefing">
      <div className="briefing__panel">
        <div className="briefing__tag">MISSION BRIEFING</div>
        <h2 className="briefing__name">{m.name}</h2>
        <p className="briefing__brief">{m.brief}</p>
        <div className="briefing__meta">
          <div>
            <span className="briefing__lbl">SHIP</span>
            <span className="briefing__val" style={{ color: s.accent }}>
              {s.name}
            </span>
          </div>
          <div>
            <span className="briefing__lbl">STAGES</span>
            <span className="briefing__val">
              {m.stageRange.start}–{m.stageRange.end}
            </span>
          </div>
          <div>
            <span className="briefing__lbl">REWARD</span>
            <span className="briefing__val">{m.rewardCredits} CR</span>
          </div>
        </div>
        <div className="briefing__objectives">
          <div className="briefing__lbl">OBJECTIVES</div>
          {m.objectives.map((o, i) => (
            <div key={o.id} className="briefing__objective">
              <span className="briefing__obj-num">0{i + 1}</span>
              <span>{o.text}</span>
            </div>
          ))}
        </div>
        <div className="briefing__actions">
          <button className="neon-btn" onClick={onAbort}>ABORT</button>
          <button className="neon-btn neon-btn--start" onClick={onLaunch}>
            LAUNCH SORTIE
          </button>
        </div>
      </div>
    </div>
  );
}
