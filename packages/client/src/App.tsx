import { useEffect, useState } from 'react';
import { CabinetFrame } from './ui/CabinetFrame';
import { useGameLoop } from './game/useGameLoop';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './ui/HUD';
import { AttractScreen } from './ui/AttractScreen';
import { StageBanner } from './ui/StageBanner';
import { GameOverScreen } from './ui/GameOverScreen';
import { HiScoreEntryScreen } from './ui/HiScoreEntryScreen';
import { SettingsPanel } from './ui/SettingsPanel';
import { PauseScreen } from './ui/PauseScreen';
import { ChallengeResultScreen } from './ui/ChallengeResultScreen';
import { CRTOverlay } from './ui/CRTOverlay';
import { useSettings } from './state/useSettings';
import { useHiScores } from './state/useHiScores';
import type { Phase } from './state/phase';

export function App() {
  const settings = useSettings();
  const hiscores = useHiScores();
  const [showSettings, setShowSettings] = useState(false);

  const game = useGameLoop({ settings, hiscores });

  const handleStart = () => {
    game.api.startGame();
  };

  const handleSubmitInitials = (initials: string) => {
    hiscores.add({
      initials,
      score: game.frame?.score ?? 0,
      stage: game.frame?.stage ?? 1,
      date: Date.now(),
    });
    game.api.submitHiScore(initials);
  };

  const phase: Phase = game.frame?.phase ?? 'attract';

  // Wire global keys for menu (ESC = settings/exit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setShowSettings((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="cabinet">
      <span className="cab-trim cab-trim--top" />
      <div className="cabinet__frame">
        <CabinetFrame title="GALAGA" />

        <GameCanvas
          frame={game.frame}
          settings={settings.settings}
          attract={phase === 'attract' || phase === 'demo'}
        />

        <HUD
          frame={game.frame}
          hiscores={hiscores.list}
          showFlags={true}
        />

        {phase === 'attract' && (
          <AttractScreen
            hiScores={hiscores.list}
            onStart={handleStart}
            onSettings={() => setShowSettings(true)}
          />
        )}

        {phase === 'stage_intro' && game.frame && (
          <StageBanner stage={game.frame.stage} challenge={game.frame.challenge} />
        )}

        {phase === 'game_over' && <GameOverScreen score={game.frame?.score ?? 0} />}

        {phase === 'hi_score_entry' && (
          <HiScoreEntryScreen
            score={game.frame?.score ?? 0}
            stage={game.frame?.stage ?? 1}
            onSubmit={handleSubmitInitials}
          />
        )}

        {phase === 'challenge_result' && game.frame && (
          <ChallengeResultScreen
            hits={game.frame.challenge_hits}
            total={game.frame.challenge_total}
            perfect={game.frame.challenge_perfect}
            bonus={game.frame.challenge_bonus}
          />
        )}

        {phase === 'paused' && <PauseScreen />}

        {showSettings && (
          <SettingsPanel
            settings={settings.settings}
            update={settings.update}
            onClose={() => setShowSettings(false)}
            onClearHiScores={hiscores.reset}
          />
        )}

        {settings.settings.crt && <CRTOverlay scanlines={settings.settings.scanlines} bloom={settings.settings.bloom} />}
      </div>
      <span className="cab-trim cab-trim--bottom" />
    </div>
  );
}
