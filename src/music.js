// Procedural generative music (Web Audio, no asset files) with selectable THEMES.
// A lookahead scheduler keeps notes sample-accurate; each theme is just a set of
// scale / waveform / tempo params, so adding moods is cheap. Density + tempo also
// ramp with game progress (intensity). Reuses audio.js's context + master + mute.

import { getContext, getMaster, isMuted } from "./audio.js";

let started = false;
let musicGain = null;
let nextNoteTime = 0;
let beat = 0;
let intensity = 0;
let volume = 0.5;

// each theme: root freq, scale (semitones), pad chord, beat length, note density,
// and oscillator waveforms for bass / arp / pad.
const THEMES = {
  primordial: { name: "Primordial", root: 196, scale: [0, 3, 5, 7, 10], pad: [0, 3, 7], beat: 0.50, density: 1.0, bass: "triangle", arp: "sine", padW: "sawtooth" },
  frenzy:     { name: "Frenzy",     root: 262, scale: [0, 2, 4, 7, 9],  pad: [0, 4, 7], beat: 0.30, density: 1.5, bass: "square",   arp: "triangle", padW: "sawtooth" },
  eldritch:   { name: "Eldritch",   root: 131, scale: [0, 1, 5, 6, 8],  pad: [0, 1, 6], beat: 0.70, density: 0.7, bass: "sawtooth", arp: "sine", padW: "sawtooth" },
  chiptune:   { name: "Chiptune",   root: 330, scale: [0, 3, 5, 7, 10], pad: [0, 3, 7], beat: 0.26, density: 1.7, bass: "square",   arp: "square", padW: "square" },
  lofi:       { name: "Lo-fi",      root: 175, scale: [0, 2, 3, 7, 9],  pad: [0, 3, 10],beat: 0.55, density: 0.9, bass: "triangle", arp: "triangle", padW: "sine" },
  off:        { name: "Off", off: true },
};
let theme = THEMES.primordial;

export const MUSIC_THEMES = Object.keys(THEMES).map((id) => ({ id, name: THEMES[id].name }));
export function setMusicTheme(id) { if (THEMES[id]) theme = THEMES[id]; }
export function getMusicTheme() { return Object.keys(THEMES).find((k) => THEMES[k] === theme); }

export function setMusicIntensity(t) { intensity = Math.max(0, Math.min(1, t || 0)); }
export function setMusicVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (musicGain) musicGain.gain.value = volume * 0.22;
}
export function getMusicVolume() { return volume; }

export function startMusic() {
  if (started) return;
  const ctx = getContext();
  if (!ctx) return;
  started = true;
  musicGain = ctx.createGain();
  musicGain.gain.value = volume * 0.22;
  musicGain.connect(getMaster());
  nextNoteTime = ctx.currentTime + 0.15;
  setInterval(scheduler, 60);
}

const freqFor = (root, semi) => root * Math.pow(2, semi / 12);

function scheduler() {
  const ctx = getContext();
  if (!ctx || !musicGain) return;
  const base = theme.beat || 0.5;
  const beatLen = base - intensity * 0.12 * base; // a touch faster with intensity
  while (nextNoteTime < ctx.currentTime + 0.3) {
    playBeat(nextNoteTime);
    nextNoteTime += beatLen;
    beat++;
  }
}

function playBeat(t) {
  if (isMuted() || theme.off) return;
  const sc = theme.scale, root = theme.root;
  if (beat % 4 === 0) voiceAt(t, freqFor(root, sc[0] - 12), theme.bass, 0.16, 0.7);
  if (Math.sin(beat * 1.7) > 0.2 - intensity * 0.9 * theme.density) {
    const semi = sc[(beat * 3) % sc.length] + (beat % 8 < 4 ? 0 : 12);
    voiceAt(t, freqFor(root, semi), theme.arp, 0.07 + intensity * 0.05, 0.45);
  }
  if (beat % 16 === 0) theme.pad.forEach((s) => voiceAt(t, freqFor(root, s), theme.padW, 0.035, 2.6));
}

function voiceAt(t, freq, type, gain, dur) {
  const ctx = getContext();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}
