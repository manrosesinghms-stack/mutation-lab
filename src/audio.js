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

// Click: a short blip whose pitch rises slightly with a combo (chained clicks).
export function playClick(combo = 0) {
  const base = 240 + Math.min(combo, 30) * 8 + Math.random() * 30;
  voice({ freq: base, slideTo: base * 1.6, type: "triangle", dur: 0.05, gain: 0.10 });
}

// Buy: a quick two-note "ka-ching" up; pitch lifts with the generator tier.
export function playBuy(tier = 0) {
  const lift = 1 + Math.min(tier, 4) * 0.12;
  voice({ freq: 420 * lift, type: "square", dur: 0.05, gain: 0.08 });
  voice({ freq: 640 * lift, type: "square", dur: 0.07, gain: 0.08, delay: 0.05 });
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

export function setMuted(v) { muted = !!v; }
export function isMuted() { return muted; }
export function toggleMuted() { muted = !muted; return muted; }

// shared context + bus so the music module can reuse them (and respect mute)
export function getContext() { return ac(); }
export function getMaster() { ac(); return master; }
