import type { MissionDef } from './types';

export const MISSIONS: MissionDef[] = [
  {
    id: 'maiden_voyage',
    name: 'M01 · MAIDEN VOYAGE',
    brief: 'Clear stages 1–3 and survive the first dive wave.',
    objectives: [
      { id: 'clear_stages', text: 'CLEAR 3 STAGES', target: 3 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
      { id: 'kill_count', text: 'DESTROY 60 ENEMIES', target: 60 },
    ],
    stageRange: { start: 1, end: 3 },
    rewardCredits: 200,
  },
  {
    id: 'hive_mind',
    name: 'M02 · HIVE MIND',
    brief: 'Push through the early formations. Boss kills count double.',
    objectives: [
      { id: 'boss_kills', text: 'TAKE DOWN 5 BOSSES', target: 5 },
      { id: 'diving_kills', text: '15 DIVING KILLS', target: 15 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
    ],
    stageRange: { start: 1, end: 4 },
    rewardCredits: 300,
    requires: 'maiden_voyage',
  },
  {
    id: 'rescue_op',
    name: 'M03 · RESCUE OP',
    brief: 'Rescue at least 2 captured ships. Dual fighter scoring required.',
    objectives: [
      { id: 'rescue', text: 'RESCUE 2 SHIPS', target: 2 },
      { id: 'clear_stages', text: 'CLEAR 5 STAGES', target: 5 },
      { id: 'score', text: 'SCORE 40,000', target: 40000 },
    ],
    stageRange: { start: 1, end: 6 },
    rewardCredits: 400,
    requires: 'hive_mind',
  },
  {
    id: 'challenge_master',
    name: 'M04 · CHALLENGE MASTER',
    brief: 'Land a perfect on the challenge stage.',
    objectives: [
      { id: 'perfect_challenge', text: 'PERFECT CHALLENGE ★', target: 1 },
      { id: 'clear_stages', text: 'REACH STAGE 3', target: 3 },
      { id: 'score', text: 'SCORE 60,000', target: 60000 },
    ],
    stageRange: { start: 1, end: 4 },
    rewardCredits: 500,
    requires: 'rescue_op',
  },
  {
    id: 'untouchable',
    name: 'M05 · UNTOUCHABLE',
    brief: 'Score 50K without dying.',
    objectives: [
      { id: 'score', text: 'SCORE 50,000', target: 50000 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
      { id: 'kill_count', text: '120 KILLS', target: 120 },
    ],
    stageRange: { start: 1, end: 6 },
    rewardCredits: 600,
    requires: 'challenge_master',
  },
  {
    id: 'power_surge',
    name: 'M06 · POWER SURGE',
    brief: 'Collect 5 power-ups in one run. Power-ups drop more often in missions.',
    objectives: [
      { id: 'powerup_count', text: 'COLLECT 5 POWER-UPS', target: 5 },
      { id: 'kill_count', text: '80 KILLS', target: 80 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
    ],
    stageRange: { start: 1, end: 5 },
    rewardCredits: 500,
    requires: 'rescue_op',
  },
  {
    id: 'deep_space',
    name: 'M07 · DEEP SPACE',
    brief: 'Push deep — clear stage 8 to plant the flag.',
    objectives: [
      { id: 'reach_stage', text: 'REACH STAGE 8', target: 8 },
      { id: 'score', text: 'SCORE 80,000', target: 80000 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
    ],
    stageRange: { start: 1, end: 8 },
    rewardCredits: 800,
    requires: 'untouchable',
  },
  {
    id: 'boss_rush',
    name: 'M08 · BOSS RUSH',
    brief: 'Boss-rush modifier active. Score Boss + escorts to maximise points.',
    objectives: [
      { id: 'boss_kills', text: 'TAKE DOWN 12 BOSSES', target: 12 },
      { id: 'score', text: 'SCORE 100,000', target: 100000 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
    ],
    stageRange: { start: 1, end: 6 },
    rewardCredits: 900,
    requires: 'deep_space',
  },
  {
    id: 'lightspeed',
    name: 'M09 · LIGHTSPEED',
    brief: 'Survive 90 seconds in the speed-of-light dive storm.',
    objectives: [
      { id: 'survive_frames', text: 'SURVIVE 90 SECONDS', target: 90 * 60 },
      { id: 'kill_count', text: '160 KILLS', target: 160 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
    ],
    stageRange: { start: 1, end: 10 },
    rewardCredits: 1000,
    requires: 'boss_rush',
  },
  {
    id: 'galaga_legend',
    name: 'M10 · GALAGA LEGEND',
    brief: 'Score 200K. Earn three stars to unlock the secret rainbow ship.',
    objectives: [
      { id: 'score', text: 'SCORE 200,000', target: 200000 },
      { id: 'perfect_challenge', text: 'PERFECT CHALLENGE ★', target: 1 },
      { id: 'no_death', text: 'NO DEATHS ★', target: 1 },
    ],
    stageRange: { start: 1, end: 12 },
    rewardCredits: 1500,
    requires: 'lightspeed',
  },
  {
    id: 'side_quest_specialist',
    name: 'M11 · SIDE-QUEST SPECIALIST',
    brief: 'Complete 8 side quests across Arcade+ runs.',
    objectives: [
      { id: 'side_quests', text: 'CLEAR 8 SIDE QUESTS', target: 8 },
    ],
    stageRange: { start: 1, end: 99 },
    rewardCredits: 1200,
    requires: 'galaga_legend',
  },
];

export function missionById(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}
