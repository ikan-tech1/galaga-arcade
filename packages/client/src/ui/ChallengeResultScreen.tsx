interface Props {
  hits: number;
  total: number;
  perfect: boolean;
  bonus: number;
}

function pad(n: number, w: number) {
  return n.toString().padStart(w, '0');
}

export function ChallengeResultScreen({ hits, total, perfect, bonus }: Props) {
  return (
    <div className="overlay overlay__center">
      <div className="hientry">
        <div className="hientry__title" style={{ color: perfect ? '#ffd166' : '#22d3ee' }}>
          {perfect ? 'PERFECT!' : 'CHALLENGE OVER'}
        </div>
        <div className="gameover__line">
          NUMBER OF HITS · {hits}/{total}
        </div>
        <div className="hientry__score">BONUS {pad(bonus, 6)}</div>
        <div className="menu__hint blink">NEXT STAGE…</div>
      </div>
    </div>
  );
}
