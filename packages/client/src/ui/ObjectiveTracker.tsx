import type { MissionDef, MissionRunState, SideQuestDef } from '../meta/types';
import type { SideQuestProgress } from '../meta/runTracker';

interface Props {
  mission?: MissionRunState | undefined;
  missionDef?: MissionDef | undefined;
  sideQuests: SideQuestProgress[];
}

export function ObjectiveTracker({ mission, missionDef, sideQuests }: Props) {
  const visibleSide = sideQuests.filter((q) => q.toasted);
  if (!mission && visibleSide.length === 0) return null;
  return (
    <div className="objective-tracker">
      {mission && missionDef && (
        <div className="objective-tracker__group">
          <div className="objective-tracker__group-title">MISSION</div>
          {missionDef.objectives.map((o) => {
            const got = mission.progress[o.id] ?? 0;
            const pct = Math.min(100, (got / Math.max(1, o.target)) * 100);
            const done = got >= o.target;
            return (
              <div
                key={o.id}
                className={`objective-tracker__obj${done ? ' objective-tracker__obj--done' : ''}`}
              >
                <span className="objective-tracker__text">{o.text}</span>
                <span className="objective-tracker__bar">
                  <span
                    className="objective-tracker__bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="objective-tracker__count">
                  {done ? '✓' : `${Math.min(got, o.target)}/${o.target}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {visibleSide.length > 0 && (
        <div className="objective-tracker__group">
          <div className="objective-tracker__group-title">SIDE QUESTS</div>
          {visibleSide.map((q) => {
            const pct = Math.min(100, (q.progress / Math.max(1, q.def.target)) * 100);
            return (
              <div
                key={q.def.id}
                className={`objective-tracker__obj${q.done ? ' objective-tracker__obj--done' : ''}`}
              >
                <span className="objective-tracker__text">{q.def.text}</span>
                <span className="objective-tracker__bar">
                  <span
                    className="objective-tracker__bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="objective-tracker__count">
                  {q.done ? '✓' : `${Math.min(q.progress, q.def.target)}/${q.def.target}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  void SideQuestDef; // type-only side-effect
}
