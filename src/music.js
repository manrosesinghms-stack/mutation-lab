// Procedural generative ambient music (Web Audio, no asset files). A slow minor
// pentatonic bed whose density + tempo ramp up with progress. Uses a lookahead
// scheduler so notes are sample-accurate and click-free. Reuses audio.js's
// context + master bus, and respects its mute.

import { getContext, getMaster, isMuted } from "./audio.js";

let started = false;
let musicGain = null;
let schedulerTimer = null;
let nextNoteTime = 0;
let beat = 0;
let intensity = 0; // 0..1, set from game progress
let volume = 0.5;

const SCALE = [0, 3, 5, 7, 10]; // minor pentatonic
const ROOT = 196;               // G3

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
  schedulerTimer = setInterval(scheduler, 60);
}

const freqFor = (semi) => ROOT * Math.pow(2, semi / 12);

function scheduler() {
  const ctx = getContext();
  if (!ctx || !musicGain) return;
  const beatLen = 0.5 - intensity * 0.18; // faster with intensity
  while (nextNoteTime < ctx.currentTime + 0.3) {
    playBeat(nextNoteTime);
    nextNoteTime += beatLen;
    beat++;
  }
}

function playBeat(t) {
  if (isMuted()) return;
  // bass on the downbeat
  if (beat % 4 === 0) voiceAt(t, freqFor(SCALE[0] - 12), "triangle", 0.16, 0.7);
  // arpeggio — density grows with intensity
  if (Math.sin(beat * 1.7) > 0.2 - intensity * 0.9) {
    const semi = SCALE[(beat * 3) % SCALE.length] + (beat % 8 < 4 ? 0 : 12);
    voiceAt(t, freqFor(semi), "sine", 0.07 + intensity * 0.05, 0.45);
  }
  // pad chord swell every 4 bars
  if (beat % 16 === 0) [0, 3, 7].forEach((s) => voiceAt(t, freqFor(s), "sawtooth", 0.035, 2.6));
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
