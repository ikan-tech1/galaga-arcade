function pad(n: number, w: number) {
  return n.toString().padStart(w, '0');
}

interface Props {
  score: number;
}

export function GameOverScreen({ score }: Props) {
  return (
    <div className="overlay overlay__center">
      <div className="gameover">
        <div className="gameover__title">GAME OVER</div>
        <div className="gameover__line">FINAL SCORE</div>
        <div className="hientry__score">{pad(score, 6)}</div>
        <div className="gameover__line blink">RETURNING TO ATTRACT...</div>
      </div>
    </div>
  );
}
