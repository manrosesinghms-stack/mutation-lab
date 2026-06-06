// Procedural sound via the Web Audio API — no asset files, no dependencies.
// Every sound is synthesized from oscillators + gain envelopes. The AudioContext
// is created lazily and resumed on the first user gesture (browsers block audio
// until then), so call any play* from a click handler the first time.

let ctx = null;
let muted = false;
let master = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// One enveloped oscillator voice.
function voice({ freq = 440, dur = 0.08, type = "sine", gain = 0.2,
                 attack = 0.005, release = 0.06, slideTo = null, delay = 0 }) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + release + 0.02);
}

// ---- the sound set ----

// Click: a wet organic "pop" — a downward sine blip + a tiny filtered noise
// squish, so it reads as poking a living cell, not a UI beep. Pitch lifts a bit
// with a combo (chained clicks).
export function playClick(combo = 0) {
  const base = 300 + Math.min(combo, 30) * 10 + Math.random() * 40;
  voice({ freq: base, slideTo: base * 0.6, type: "sine", dur: 0.06, gain: 0.11, attack: 0.002, release: 0.05 });
  voice({ freq: base * 0.5, slideTo: base * 0.32, type: "triangle", dur: 0.05, gain: 0.05, delay: 0.005 });
}

// Buy: a soft organic "bloop" — two rounded sine notes up (membrane absorbing),
// no harsh square beeps. Pitch lifts with the generator tier.
export function playBuy(tier = 0) {
  const lift = 1 + Math.min(tier, 4) * 0.12;
  voice({ freq: 300 * lift, slideTo: 360 * lift, type: "sine", dur: 0.06, gain: 0.09, release: 0.05 });
  voice({ freq: 480 * lift, slideTo: 540 * lift, type: "triangle", dur: 0.08, gain: 0.07, delay: 0.05, release: 0.06 });
}

// Evolve / prestige: a rising sweep + a low sub boom.
export function playEvolve() {
  voice({ freq: 120, slideTo: 720, type: "sawtooth", dur: 0.5, gain: 0.14, release: 0.2 });
  voice({ freq: 60, slideTo: 110, type: "sine", dur: 0.6, gain: 0.22, release: 0.3 });
}

// Mutation draw — flavor scales with rarity.
export function playMutation(rarity = "common") {
  if (rarity === "legendary") {
    // bright major triad + sparkle
    [523, 659, 784, 1046].forEach((f, i) =>
      voice({ freq: f, type: "triangle", dur: 0.25, gain: 0.12, release: 0.25, delay: i * 0.06 }));
    voice({ freq: 1568, type: "sine", dur: 0.4, gain: 0.06, delay: 0.2 });
  } else if (rarity === "rare") {
    voice({ freq: 523, type: "triangle", dur: 0.12, gain: 0.11 });
    voice({ freq: 784, type: "triangle", dur: 0.16, gain: 0.11, delay: 0.1 });
  } else {
    voice({ freq: 523, type: "triangle", dur: 0.12, gain: 0.1 });
  }
}

// Milestone fanfare (achievements, big thresholds).
export function playMilestone() {
  [392, 523, 659, 784].forEach((f, i) =>
    voice({ freq: f, type: "square", dur: 0.18, gain: 0.09, delay: i * 0.07 }));
}

// Creature roar — for cinematic moments (legendary evolution, speciation, bosses).
export function playRoar() {
  voice({ freq: 240, slideTo: 55, type: "sawtooth", dur: 0.7, gain: 0.2, release: 0.35 });
  voice({ freq: 95, slideTo: 38, type: "square", dur: 0.85, gain: 0.16, release: 0.35 });
  voice({ freq: 400, slideTo: 120, type: "triangle", dur: 0.5, gain: 0.08, release: 0.25, delay: 0.05 });
}

// Mutation-family SFX — each body part type erupts with its own organic texture,
// so you *hear* what grew (eyes squish, spikes crack, tentacles stretch…).
const noiseBurst = (dur, gain, hp = 800) => {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0); src.stop(t0 + dur + 0.02);
};

export function playPartSfx(part) {
  switch (part) {
    case "eye": // wet squish
      voice({ freq: 600, slideTo: 220, type: "sine", dur: 0.16, gain: 0.12, release: 0.1 });
      voice({ freq: 1200, slideTo: 500, type: "sine", dur: 0.1, gain: 0.05, delay: 0.02 });
      break;
    case "spike": // bony crack
      noiseBurst(0.09, 0.18, 1800);
      voice({ freq: 180, slideTo: 90, type: "square", dur: 0.06, gain: 0.1 });
      break;
    case "tentacle": // rubbery stretch
      voice({ freq: 140, slideTo: 380, type: "sawtooth", dur: 0.28, gain: 0.09, release: 0.15 });
      break;
    case "jaw": // gnashing chomp
      voice({ freq: 90, slideTo: 45, type: "square", dur: 0.14, gain: 0.16, release: 0.1 });
      noiseBurst(0.06, 0.1, 600);
      break;
    case "frond": // soft leafy rustle
      noiseBurst(0.22, 0.05, 3000);
      voice({ freq: 520, type: "triangle", dur: 0.12, gain: 0.05 });
      break;
    case "cilia": // shimmer
      [880, 1320, 1760].forEach((f, i) => voice({ freq: f, type: "sine", dur: 0.1, gain: 0.04, delay: i * 0.03 }));
      break;
    default: // generic organ bloom
      voice({ freq: 320, slideTo: 480, type: "triangle", dur: 0.14, gain: 0.08, release: 0.1 });
  }
}

export function setMuted(v) { muted = !!v; }
export function isMuted() { return muted; }
export function toggleMuted() { muted = !muted; return muted; }

// shared context + bus so the music module can reuse them (and respect mute)
export function getContext() { return ac(); }
export function getMaster() { ac(); return master; }
