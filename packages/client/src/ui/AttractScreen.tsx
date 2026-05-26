import type { HiScoreEntry } from '@galaga/shared';

interface Props {
  hiScores: HiScoreEntry[];
  onStart: () => void;
  onSettings: () => void;
}

function pad(n: number, w: number) {
  return n.toString().padStart(w, '0');
}

export function AttractScreen({ hiScores, onStart, onSettings }: Props) {
  return (
    <div className="overlay overlay--interactive">
      <div className="menu">
        <div className="menu__top">
          <h1 className="title-logo">
            GALAGA
            <span className="title-logo__sub">ARCADE CLONE</span>
          </h1>
          <div className="menu__hint">© 2026 NO RIGHTS RESERVED · ORIGINAL ASSETS</div>
        </div>

        <div className="menu__center">
          <HiScoreList list={hiScores.slice(0, 5)} />
          <div style={{ height: 8 }} />
          <button className="neon-btn" onClick={onStart}>
            INSERT COIN · PRESS START
          </button>
          <button className="neon-btn neon-btn--mag" onClick={onSettings}>
            SETTINGS
          </button>
        </div>

        <div className="menu__bottom">
          <div>← → MOVE · SPACE/Z FIRE · ENTER START</div>
          <div className="blink">PRESS START</div>
        </div>
      </div>
    </div>
  );
}

function HiScoreList({ list }: { list: HiScoreEntry[] }) {
  return (
    <div className="hiscore-list">
      <div className="hiscore-list__title">HIGH SCORES</div>
      {list.map((e, i) => (
        <Row key={i} idx={i + 1} entry={e} />
      ))}
    </div>
  );
}

function Row({ idx, entry }: { idx: number; entry: HiScoreEntry }) {
  return (
    <>
      <span className="hiscore-list__rank">{idx}.</span>
      <span className="hiscore-list__inits">{entry.initials}</span>
      <span className="hiscore-list__score">{pad(entry.score, 6)}</span>
      <span className="hiscore-list__stage">ST{pad(entry.stage, 3)}</span>
    </>
  );
}
