// Procedural generative music (Web Audio, no asset files) with genuinely distinct
// THEMES — each has its own tempo, drum pattern, chord progression, bass, and
// melody style (not just a different scale). A 16th-note lookahead scheduler keeps
// it click-free. Reuses audio.js's context + master + mute. Intensity (game
// progress) thickens the groove.

import { getContext, getMaster, isMuted } from "./audio.js";

let started = false;
let musicGain = null;
let noiseBuf = null;
let nextStepTime = 0;
let step = 0;
let intensity = 0;
let volume = 0.5;

// 16-step drum/note pattern from hit indices
const pat = (...idx) => { const a = new Array(16).fill(0); idx.forEach((i) => (a[i] = 1)); return a; };

const THEMES = {
  lofi: { name: "Lo-fi (chill)", bpm: 76, root: 220, scale: [0, 2, 3, 7, 9],
    prog: [0, -2, -4, -5], major: true, seventh: true,
    kick: pat(0, 8), kickGain: 0.4, snare: pat(4, 12), snareGain: 0.14,
    hat: pat(2, 7, 10, 14), hatGain: 0.08, bass: pat(0, 8), bassW: "triangle",
    pad: true, padW: "sine", padDur: 1.8, melodyMode: "rhodes", leadW: "triangle" },

  lullaby: { name: "Lullaby (sleepy)", bpm: 54, root: 262, scale: [0, 2, 4, 7, 9],
    prog: [0, -3, -7, -8], major: true,
    pad: true, padW: "sine", padDur: 3.2, bass: pat(0), bassW: "sine",
    melodyMode: "bell", leadW: "sine" },

  pulse: { name: "Pulse (beats)", bpm: 124, root: 196, scale: [0, 2, 3, 7, 10],
    prog: [0, -2, -5, -7], major: false,
    kick: pat(0, 4, 8, 12), snare: pat(4, 12), hat: pat(2, 6, 10, 14),
    bass: pat(0, 3, 8, 11), bassW: "square", pad: true, padW: "sawtooth", padDur: 1.0,
    melodyMode: "pluck", leadW: "square" },

  bloom: { name: "Bloom (lovely)", bpm: 92, root: 262, scale: [0, 2, 4, 7, 9],
    prog: [0, 5, 7, 5], major: true,
    kick: pat(0, 8), snare: pat(8), snareGain: 0.14, hat: pat(2, 6, 10, 14),
    bass: pat(0, 8), bassW: "triangle", pad: true, padW: "triangle", padDur: 1.6,
    melodyMode: "arp", leadW: "triangle" },

  chiptune: { name: "Chiptune", bpm: 150, root: 330, scale: [0, 3, 5, 7, 10],
    prog: [0, -3, 3, -2], major: false,
    kick: pat(0, 8), snare: pat(4, 12), hat: pat(0, 2, 4, 6, 8, 10, 12, 14),
    bass: pat(0, 4, 8, 12), bassW: "square", melodyMode: "chip", leadW: "square" },

  eldritch: { name: "Eldritch (dark)", bpm: 66, root: 131, scale: [0, 1, 3, 6, 8],
    prog: [0, 1, -1, 1], major: false,
    pad: true, padW: "sawtooth", padDur: 3.6, bass: pat(0), bassW: "sawtooth",
    melodyMode: "sparse", leadW: "sine" },

  ambient: { name: "Ambient (space)", bpm: 60, root: 174, scale: [0, 2, 5, 7, 9],
    prog: [0, 5, -3, 2], major: true, seventh: true,
    pad: true, padW: "sine", padDur: 4.5, bass: pat(0), bassW: "sine", bassDur: 1.2,
    melodyMode: "sparse", leadW: "sine" },

  synthwave: { name: "Synthwave", bpm: 112, root: 220, scale: [0, 2, 3, 7, 10],
    prog: [0, -4, -5, -2], major: false,
    kick: pat(0, 4, 8, 12), kickGain: 0.5, snare: pat(4, 12), snareGain: 0.2,
    hat: pat(2, 6, 10, 14), hatGain: 0.1, bass: pat(0, 3, 6, 8, 11, 14), bassW: "sawtooth", bassDur: 0.18,
    pad: true, padW: "sawtooth", padDur: 1.4, melodyMode: "arp", leadW: "sawtooth" },

  off: { name: "Off", off: true },
};
let theme = THEMES.lofi;

export const MUSIC_THEMES = Object.keys(THEMES).map((id) => ({ id, name: THEMES[id].name }));
// per-theme "space" depth — ambient/dark themes get lush reverb, chip/pulse stay dry
const REVERB = { lofi: 0.32, lullaby: 0.62, pulse: 0.16, bloom: 0.46, chiptune: 0.1, eldritch: 0.72 };
let curThemeId = "lofi";
export function setMusicTheme(id) { if (THEMES[id]) { theme = THEMES[id]; curThemeId = id; if (musicSend) musicSend.gain.value = REVERB[id] != null ? REVERB[id] : 0.4; } }
export function getMusicTheme() { return Object.keys(THEMES).find((k) => THEMES[k] === theme); }
export function hasTheme(id) { return !!THEMES[id]; }

export function setMusicIntensity(t) { intensity = Math.max(0, Math.min(1, t || 0)); }
let musicStress = 0, musicDanger = false;
export function setMusicStress(v) { musicStress = Math.max(0, Math.min(1, v || 0)); } // metabolic-wall heartbeat
export function setMusicDanger(b) { musicDanger = !!b; }                                // boss danger layer
export function setMusicVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (musicGain) musicGain.gain.value = volume * 0.22;
}
export function getMusicVolume() { return volume; }

let musicSend = null; // wet "space" bus (feedback delay → lowpass) for depth/character

export function startMusic() {
  if (started) return;
  const ctx = getContext();
  if (!ctx) return;
  started = true;
  musicGain = ctx.createGain();
  musicGain.gain.value = volume * 0.22;
  musicGain.connect(getMaster());
  // reverb-ish space: a filtered feedback delay melodic voices send into, so the
  // music has air and depth instead of dry beeps. Per-theme depth differentiates moods.
  musicSend = ctx.createGain(); musicSend.gain.value = REVERB[curThemeId] != null ? REVERB[curThemeId] : 0.4;
  const d1 = ctx.createDelay(1.0); d1.delayTime.value = 0.27;
  const d2 = ctx.createDelay(1.0); d2.delayTime.value = 0.41;
  const fb = ctx.createGain(); fb.gain.value = 0.34;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
  const wet = ctx.createGain(); wet.gain.value = 0.5;
  musicSend.connect(d1); musicSend.connect(d2);
  d1.connect(lp); d2.connect(lp); lp.connect(fb); fb.connect(d1); fb.connect(d2);
  lp.connect(wet); wet.connect(musicGain);
  nextStepTime = ctx.currentTime + 0.15;
  step = 0;
  setInterval(scheduler, 40);
}

// ---- synthesis helpers ----
function getNoise(ctx) {
  if (!noiseBuf) {
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(t, freq, type, gain, dur, attack = 0.01, release = 0.12) {
  const ctx = getContext();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0003, gain), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  o.connect(g); g.connect(musicGain);          // dry
  if (musicSend) g.connect(musicSend);          // wet (space) — melodic voices only
  o.start(t); o.stop(t + dur + release + 0.02);
}

function kick(t, gain = 0.5) {
  const ctx = getContext();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(165, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(g).connect(musicGain);
  o.start(t); o.stop(t + 0.22);
}

function noiseHit(t, dur, gain, freq, type) {
  const ctx = getContext();
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(musicGain);
  src.start(t); src.stop(t + dur + 0.02);
}
const snare = (t, gain = 0.3) => noiseHit(t, 0.13, gain, 2000, "bandpass");
const hat = (t, gain = 0.12) => noiseHit(t, 0.04, gain, 9000, "highpass");

// ---- sequencer ----
function scheduler() {
  const ctx = getContext();
  if (!ctx || !musicGain) return;
  const stepDur = (60 / (theme.bpm || 90)) / 4;
  while (nextStepTime < ctx.currentTime + 0.2) {
    playStep(step, nextStepTime);
    step++;
    nextStepTime += stepDur;
  }
}

function playStep(s, t) {
  if (isMuted()) return;
  const SI = s % 16;
  // tension cues play regardless of music theme:
  // metabolic-wall heartbeat — the player FEELS they should Speciate
  if (musicStress > 0.25) {
    tone(t, 58, "sine", 0.13 * musicStress, 0.18, 0.004, 0.1);
    if (SI % 4 === 0 && musicStress > 0.55) tone(t + 0.15, 52, "sine", 0.10 * musicStress, 0.16, 0.004, 0.1);
  }
  // boss danger layer (drone + alarm tick)
  if (musicDanger) {
    if (SI % 8 === 0) tone(t, 110, "sawtooth", 0.05, 0.7, 0.02, 0.3);
    if (SI % 4 === 2) tone(t, 740, "square", 0.035, 0.08, 0.002, 0.04);
  }
  if (!theme || theme.off) return; // ---- musical bed below ----
  const bar = Math.floor(s / 16) % theme.prog.length;
  const rootSemi = theme.prog[bar];
  const root = theme.root;
  const third = theme.major ? 4 : 3;
  const chord = [0, third, 7].concat(theme.seventh ? [theme.major ? 11 : 10] : []);
  const f = (semi, oct = 0) => root * Math.pow(2, (rootSemi + semi + 12 * oct) / 12);

  if (theme.kick && theme.kick[SI]) kick(t, theme.kickGain || 0.5);
  if (theme.snare && theme.snare[SI]) snare(t, theme.snareGain || 0.28);
  if (theme.hat && theme.hat[SI] && (SI % 2 === 0 || intensity > 0.3)) hat(t, theme.hatGain || 0.1);
  if (theme.bass && theme.bass[SI]) tone(t, f(0) / 2, theme.bassW || "triangle", 0.16, theme.bassDur || 0.24, 0.005, 0.08);
  if (theme.pad && SI === 0) chord.forEach((c) => tone(t, f(c), theme.padW || "sine", 0.03, theme.padDur || 2.0, 0.3, 1.0));

  playMelody(s, t, chord, f);
}

function playMelody(s, t, chord, f) {
  const SI = s % 16;
  const sc = theme.scale;
  const lead = theme.leadW || "triangle";
  // phrase drifts the motif over time so a theme evolves instead of looping a
  // 4-second riff — the biggest fix for "all the music sounds the same".
  const phrase = Math.floor(s / 32);
  const note = (i) => sc[((i % sc.length) + phrase) % sc.length];
  // a little melodic "answer" run at the end of each 4-bar progression cycle
  const fill = (s % (16 * (theme.prog.length))) >= 16 * theme.prog.length - 4;
  switch (theme.melodyMode) {
    case "bell":
      if (SI === 0 || SI === 6 || SI === 10) tone(t, f(chord[(SI / 2 + phrase) % chord.length], 1), "sine", 0.07, 1.3, 0.03, 0.9);
      break;
    case "arp":
      if (SI % 2 === 0) tone(t, f(chord[(SI / 2 + phrase) % chord.length], 1 + (SI >= 12 ? 1 : 0)), lead, 0.07 + intensity * 0.04, 0.4, 0.01, 0.25);
      break;
    case "pluck":
      if ([2, 6, 7, 10, 14].includes(SI) && Math.sin(s * 1.3) > 0.1 - intensity)
        tone(t, f(note(s * 3), 1), lead, 0.08, 0.22, 0.004, 0.12);
      break;
    case "chip":
      if (Math.sin(s * 2.1) > 0.3 - intensity * 0.6)
        tone(t, f(note(s * 5), 1 + (fill ? 1 : 0)), "square", 0.06, 0.11, 0.002, 0.04);
      break;
    case "rhodes":
      if ([0, 3, 6, 8, 11, 14].includes(SI) && Math.sin(s * 1.1) > 0.2 - intensity)
        tone(t, f(note(s * 2), 1), "triangle", 0.07, 0.5, 0.01, 0.3);
      break;
    case "sparse":
      if (SI % 8 === 0 && Math.sin(s * 0.7 + phrase) > 0.3)
        tone(t, f(note(s), 1), "sine", 0.06, 1.7, 0.1, 1.1);
      break;
  }
  // shared: a sparkle counter-melody when the game is intense (thickens late-game)
  if (intensity > 0.5 && SI % 4 === 3 && Math.sin(s * 1.7 + phrase) > 0.4)
    tone(t, f(note(s * 4), 2), "sine", 0.03 + intensity * 0.02, 0.18, 0.005, 0.1);
}
