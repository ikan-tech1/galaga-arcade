/**
 * Procedural Web Audio SFX + music. All sounds are synthesised from
 * primitive oscillators / noise → no sample files. Each ROM event maps to a
 * small synth recipe approximating the arcade tone.
 *
 * The engine emits an `AudioEvent[]` per frame; this module dispatches each
 * event to the appropriate recipe.
 */

import type { AudioEvent } from '../state/frame';

interface Voice {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  unlocked: boolean;
}

let voice: Voice | null = null;
let lastSettings = { sfx: 0.7, music: 0.55 };
let stageMusic: { stop: () => void } | null = null;
let attractMusic: { stop: () => void } | null = null;

function ensureCtx(): Voice | null {
  if (typeof window === 'undefined') return null;
  if (voice) return voice;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    const music = ctx.createGain();
    music.gain.value = lastSettings.music;
    music.connect(master);
    const sfx = ctx.createGain();
    sfx.gain.value = lastSettings.sfx;
    sfx.connect(master);
    voice = { ctx, master, music, sfx, unlocked: false };
  } catch {
    return null;
  }
  return voice;
}

export function unlockAudio() {
  const v = ensureCtx();
  if (!v) return;
  if (v.ctx.state === 'suspended') {
    v.ctx.resume().catch(() => undefined);
  }
  v.unlocked = true;
}

export function setVolumes(sfxVol: number, musicVol: number) {
  lastSettings = { sfx: sfxVol, music: musicVol };
  const v = ensureCtx();
  if (!v) return;
  v.sfx.gain.value = sfxVol;
  v.music.gain.value = musicVol;
}

function tone(
  v: Voice,
  type: OscillatorType,
  freq: number,
  duration: number,
  start = 0,
  attack = 0.005,
  release = 0.05,
  gain = 0.25,
  detune = 0,
  sweep?: { to: number; time: number },
) {
  const osc = v.ctx.createOscillator();
  const g = v.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;
  if (sweep) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, sweep.to),
      v.ctx.currentTime + start + sweep.time,
    );
  }
  g.gain.value = 0;
  g.gain.setValueAtTime(0, v.ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, v.ctx.currentTime + start + attack);
  g.gain.linearRampToValueAtTime(0, v.ctx.currentTime + start + duration + release);
  osc.connect(g);
  g.connect(v.sfx);
  osc.start(v.ctx.currentTime + start);
  osc.stop(v.ctx.currentTime + start + duration + release + 0.05);
}

function noise(
  v: Voice,
  duration: number,
  filterFreq: number,
  start = 0,
  attack = 0.002,
  release = 0.1,
  gain = 0.18,
  filterQ = 2,
) {
  const dur = duration + release + 0.05;
  const buffer = v.ctx.createBuffer(1, Math.max(1, dur * v.ctx.sampleRate), v.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = v.ctx.createBufferSource();
  src.buffer = buffer;
  const filt = v.ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = filterFreq;
  filt.Q.value = filterQ;
  const g = v.ctx.createGain();
  g.gain.setValueAtTime(0, v.ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, v.ctx.currentTime + start + attack);
  g.gain.linearRampToValueAtTime(0, v.ctx.currentTime + start + duration + release);
  src.connect(filt);
  filt.connect(g);
  g.connect(v.sfx);
  src.start(v.ctx.currentTime + start);
  src.stop(v.ctx.currentTime + start + dur);
}

function playFire(v: Voice) {
  tone(v, 'square', 1200, 0.04, 0, 0.001, 0.04, 0.13, 0, { to: 280, time: 0.06 });
  tone(v, 'sawtooth', 220, 0.03, 0, 0.001, 0.04, 0.06);
}

function playExplosionSmall(v: Voice) {
  noise(v, 0.08, 1400, 0, 0.002, 0.12, 0.22, 1.5);
  tone(v, 'square', 100, 0.06, 0, 0.005, 0.1, 0.1, 0, { to: 40, time: 0.1 });
}

function playExplosionPlayer(v: Voice) {
  noise(v, 0.22, 700, 0, 0.005, 0.35, 0.32, 0.8);
  tone(v, 'sawtooth', 180, 0.2, 0, 0.005, 0.3, 0.18, 0, { to: 40, time: 0.4 });
  tone(v, 'square', 80, 0.3, 0.05, 0.005, 0.2, 0.13, 0, { to: 35, time: 0.5 });
}

function playCapture(v: Voice) {
  for (let i = 0; i < 8; i++) {
    tone(v, 'sine', 600 + i * 120, 0.08, i * 0.05, 0.005, 0.04, 0.16);
  }
  noise(v, 0.5, 1600, 0, 0.005, 0.6, 0.06, 6);
}

function playTractor(v: Voice) {
  for (let i = 0; i < 5; i++) {
    tone(v, 'triangle', 440 - i * 30, 0.18, i * 0.18, 0.005, 0.06, 0.07);
  }
}

function playDive(v: Voice) {
  tone(v, 'triangle', 220, 0.18, 0, 0.005, 0.05, 0.08, 0, { to: 80, time: 0.25 });
}

function playBossDive(v: Voice) {
  tone(v, 'sawtooth', 180, 0.34, 0, 0.005, 0.06, 0.12, 0, { to: 70, time: 0.4 });
  tone(v, 'square', 120, 0.34, 0.04, 0.005, 0.05, 0.07);
}

function playStageCleared(v: Voice) {
  // ascending arpeggio C5-E5-G5-C6
  [523, 659, 784, 1047].forEach((f, i) => {
    tone(v, 'square', f, 0.13, i * 0.1, 0.005, 0.06, 0.18);
  });
}

function playWaveBonus(v: Voice) {
  [392, 494, 587, 698].forEach((f, i) => {
    tone(v, 'triangle', f, 0.12, i * 0.07, 0.005, 0.06, 0.18);
  });
}

function playPerfectFanfare(v: Voice) {
  // Cheery ascending fanfare
  const notes = [
    { f: 523, t: 0.0, d: 0.15 },
    { f: 659, t: 0.12, d: 0.15 },
    { f: 784, t: 0.24, d: 0.15 },
    { f: 1047, t: 0.36, d: 0.3 },
    { f: 1319, t: 0.5, d: 0.25 },
    { f: 1047, t: 0.7, d: 0.35 },
  ];
  notes.forEach((n) => tone(v, 'square', n.f, n.d, n.t, 0.005, 0.08, 0.2));
  notes.forEach((n) => tone(v, 'triangle', n.f / 2, n.d, n.t, 0.005, 0.08, 0.13));
}

function playExtraLife(v: Voice) {
  [659, 784, 988, 1175].forEach((f, i) => {
    tone(v, 'square', f, 0.1, i * 0.05, 0.005, 0.05, 0.18);
  });
}

function playGameStart(v: Voice) {
  [440, 554, 659, 784].forEach((f, i) => {
    tone(v, 'square', f, 0.18, i * 0.12, 0.005, 0.06, 0.17);
  });
}

function playChallengeStart(v: Voice) {
  // Distinctive challenge fanfare
  [523, 659, 784].forEach((f, i) => {
    tone(v, 'square', f, 0.18, i * 0.13, 0.005, 0.06, 0.18);
    tone(v, 'triangle', f / 2, 0.18, i * 0.13, 0.005, 0.06, 0.12);
  });
}

function dispatch(v: Voice, e: AudioEvent) {
  switch (e.kind) {
    case 'fire': playFire(v); break;
    case 'explosion_small': playExplosionSmall(v); break;
    case 'explosion_player': playExplosionPlayer(v); break;
    case 'capture': playCapture(v); break;
    case 'tractor': playTractor(v); break;
    case 'dive': playDive(v); break;
    case 'boss_dive': playBossDive(v); break;
    case 'stage_cleared': playStageCleared(v); break;
    case 'wave_bonus': playWaveBonus(v); break;
    case 'perfect_fanfare': playPerfectFanfare(v); break;
    case 'extra_life': playExtraLife(v); break;
    case 'game_start': playGameStart(v); break;
    case 'challenge_start': playChallengeStart(v); break;
    default: /* ignore */ break;
  }
}

export function emitAudioEvents(events: AudioEvent[]) {
  if (events.length === 0) return;
  const v = ensureCtx();
  if (!v || !v.unlocked) return;
  for (const e of events) dispatch(v, e);
}

function loopMusic(notes: Array<[number, number]>, gain = 0.06) {
  const v = ensureCtx();
  if (!v) return { stop: () => undefined };
  let cancelled = false;
  let nextStart = v.ctx.currentTime + 0.1;
  const play = () => {
    if (cancelled) return;
    for (const [f, d] of notes) {
      const osc = v.ctx.createOscillator();
      const g = v.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      g.gain.value = 0;
      g.gain.setValueAtTime(0, nextStart);
      g.gain.linearRampToValueAtTime(gain, nextStart + 0.01);
      g.gain.linearRampToValueAtTime(0, nextStart + d - 0.01);
      osc.connect(g);
      g.connect(v.music);
      osc.start(nextStart);
      osc.stop(nextStart + d + 0.02);
      nextStart += d;
    }
    const loopTime = (nextStart - v.ctx.currentTime) * 1000;
    setTimeout(play, Math.max(50, loopTime - 200));
  };
  play();
  return { stop: () => { cancelled = true; } };
}

export function startStageMusic() {
  stopStageMusic();
  // Marching melody — original composition
  const notes: Array<[number, number]> = [
    [392, 0.18], [494, 0.18], [587, 0.18], [494, 0.18],
    [392, 0.18], [330, 0.18], [392, 0.18], [494, 0.18],
    [523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18],
    [523, 0.18], [440, 0.18], [523, 0.18], [392, 0.36],
  ];
  stageMusic = loopMusic(notes, 0.05);
}

export function stopStageMusic() {
  stageMusic?.stop();
  stageMusic = null;
}

export function startAttractMusic() {
  stopAttractMusic();
  const notes: Array<[number, number]> = [
    [523, 0.24], [659, 0.24], [784, 0.24], [659, 0.24],
    [880, 0.24], [784, 0.24], [659, 0.24], [523, 0.48],
  ];
  attractMusic = loopMusic(notes, 0.04);
}

export function stopAttractMusic() {
  attractMusic?.stop();
  attractMusic = null;
}
