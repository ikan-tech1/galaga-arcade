import { MISSIONS } from '../meta/missions';

interface Props {
  missionId: string;
  stars: 0 | 1 | 2 | 3;
  earnedCredits: number;
  score: number;
  onReturn: () => void;
}

export function MissionComplete({
  missionId,
  stars,
  earnedCredits,
  score,
  onReturn,
}: Props) {
  const m = MISSIONS.find((x) => x.id === missionId);
  return (
    <div className="overlay overlay--interactive mission-complete">
      <div className="mission-complete__panel">
        <div className="mission-complete__banner">
          {stars > 0 ? 'MISSION COMPLETE' : 'MISSION ENDED'}
        </div>
        <div className="mission-complete__name">{m?.name ?? 'MISSION'}</div>
        <div className="mission-complete__stars" aria-label={`${stars} stars`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`mission-complete__star${i < stars ? ' mission-complete__star--on' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        <div className="mission-complete__stats">
          <div>
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <div>
            <span>CREDITS</span>
            <strong>+{earnedCredits}</strong>
          </div>
        </div>
        <button className="neon-btn neon-btn--start" onClick={onReturn}>
          RETURN TO HUB
        </button>
      </div>
    </div>
  );
}
