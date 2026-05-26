interface Props {
  stage: number;
  challenge: boolean;
}

export function StageBanner({ stage, challenge }: Props) {
  return (
    <div className="stage-banner">
      <div className="stage-banner__text" style={challenge ? { color: '#ff3aa6' } : undefined}>
        {challenge ? 'CHALLENGING STAGE' : `STAGE ${stage}`}
      </div>
    </div>
  );
}
