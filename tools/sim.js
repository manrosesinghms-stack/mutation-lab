// Headless pacing simulation. Re-uses the REAL tunables, generators, and mutation
// effects to model an optimizing player, so we can tune the softcaps to hit the
// "wall" at the right time BEFORE building any UI. Run: `npm run sim`.

import { GENERATORS } from "../src/data/generators.js";
import { MUTATIONS, MUT_BY_ID } from "../src/data/mutations.js";
import { TUN, softknee } from "../src/data/tunables.js";

// --- replicate the game's economy (kept in lockstep with src/economy.js) ---
function epPayoffMult(ep) {
  const { breakpoint, headSlope, tailScale } = TUN.ep;
  if (ep <= breakpoint) return 1 + headSlope * ep;
  return 1 + headSlope * breakpoint + tailScale * Math.sqrt(ep - breakpoint);
}

function getModifiers(s) {
  const mods = { clickMult: 1, prodMult: 1, epMult: 1, genMult: {} };
  const counts = {};
  for (const id of s.mutations) counts[id] = (counts[id] || 0) + 1;
  const totalGenerators = GENERATORS.reduce((a, g) => a + (s.owned[g.id] || 0), 0);
  const info = { counts, totalMutations: s.mutations.length, totalGenerators };
  for (const id of s.mutations) {
    const d = MUT_BY_ID[id];
    if (d && d.effect) d.effect(mods, info);
  }
  mods.prodMult *= epPayoffMult(s.evolutionPoints || 0);
  return mods;
}

function softcapThreshold(s) {
  return TUN.prodSoftcap.base
    * Math.pow(TUN.prodSoftcap.growthPerPrestige, s.prestiges || 0)
    * (s.genomeCapBonus || 1);
}

function rawProduction(s, mods) {
  let total = 0;
  for (const g of GENERATORS) {
    let gen = (s.owned[g.id] || 0) * g.baseProduction * (mods.genMult[g.id] || 1);
    gen = softknee(gen, TUN.genSaturation.threshold, TUN.genSaturation.exp);
    total += gen;
  }
  return total * mods.prodMult;
}

function production(s, mods) {
  return softknee(rawProduction(s, mods), softcapThreshold(s), TUN.prodSoftcap.exp);
}

function costOf(s, g) {
  return Math.ceil(g.baseCost * Math.pow(g.costGrowth, s.owned[g.id] || 0));
}

function epForReset(s, mods) {
  return Math.max(0, Math.floor(Math.sqrt((s.runBiomass || 0) / 1e4) * mods.epMult));
}

// --- the simulated player ---
function fresh() {
  const owned = {};
  for (const g of GENERATORS) owned[g.id] = 0;
  return { biomass: 0, runBiomass: 0, lifetimeBiomass: 0, owned,
           evolutionPoints: 0, mutations: [], prestiges: 0, genomeCapBonus: 1, tempBuffs: [] };
}

// an optimizing player drafts the strongest production/utility mutations available
const DRAFT_PRIORITY = ["cancer", "mito_frenzy", "spines", "tendrils", "hivemind",
                        "membrane", "photosynth", "symbiosis", "twitch", "ribo_cluster",
                        "greedy_vacuole", "apex", "third_eye"];

function buyBestAffordable(s) {
  // greedily buy the generator with the best production-per-cost we can afford,
  // a bounded number of times per tick
  for (let i = 0; i < 500; i++) {
    let best = null, bestVal = 0;
    for (const g of GENERATORS) {
      const cost = costOf(s, g);
      if (cost > s.biomass) continue;
      const val = g.baseProduction / cost; // marginal production per biomass spent
      if (val > bestVal) { bestVal = val; best = g; }
    }
    if (!best) break;
    s.biomass -= costOf(s, best);
    s.owned[best.id] = (s.owned[best.id] || 0) + 1;
  }
}

function run({ minutes = 60, dt = 1, clicksPerSec = 6, label = "" } = {}) {
  const s = fresh();
  const steps = Math.round((minutes * 60) / dt);
  const sampleAt = new Set([60, 120, 300, 600, 900, 1200, 1800, 2400, 3000, 3600]);
  const rows = [];
  const milestones = {}; // lifetimeBiomass OOM -> time(s)
  let firstSpeciate = null; // first time any RUN hits 1e9
  let runStart = 0;

  for (let step = 1; step <= steps; step++) {
    const t = step * dt;
    let mods = getModifiers(s);
    const prod = production(s, mods);
    const clickInc = clicksPerSec * mods.clickMult; // base click power = 1
    const gain = (prod + clickInc) * dt;
    s.biomass += gain; s.runBiomass += gain; s.lifetimeBiomass += gain;

    buyBestAffordable(s);

    // record lifetime OOM milestones
    const oom = Math.floor(Math.log10(Math.max(1, s.lifetimeBiomass)));
    if (oom >= 3 && milestones[oom] === undefined) milestones[oom] = t;
    // Speciate unlocks when you HIT THE WALL (pressure >= 1 = body maxed), not a
    // fixed biomass — the wall is the gate.
    const pressureNow = rawProduction(s, mods) / softcapThreshold(s);
    if (firstSpeciate === null && pressureNow >= 1) firstSpeciate = t;

    // prestige when the EP gain is a meaningful bump (>=50% more EP) and run matured
    mods = getModifiers(s);
    const ep = epForReset(s, mods);
    if (ep >= 1 && ep >= 0.5 * (s.evolutionPoints || 1) && (t - runStart) >= 15) {
      s.evolutionPoints += ep;
      s.prestiges += 1;
      const pick = DRAFT_PRIORITY[s.prestiges % DRAFT_PRIORITY.length];
      s.mutations.push(pick);
      s.biomass = 0; s.runBiomass = 0;
      for (const g of GENERATORS) s.owned[g.id] = 0;
      runStart = t;
    }

    if (sampleAt.has(t)) {
      const m2 = getModifiers(s);
      rows.push({
        t, lifetime: s.lifetimeBiomass, prodSec: production(s, m2),
        prestiges: s.prestiges, ep: s.evolutionPoints,
        pressure: rawProduction(s, m2) / softcapThreshold(s),
      });
    }
  }
  return { label, rows, milestones, firstSpeciate, final: s };
}

// --- reporting ---
const fmt = (n) => {
  if (n < 1000) return n.toFixed(1);
  const t = Math.floor(Math.log10(n) / 3);
  const suf = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"][t] || `e${t * 3}`;
  return (n / Math.pow(10, t * 3)).toFixed(2) + suf;
};
const mmss = (s) => `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;

const r = run({ minutes: 60, dt: 1, clicksPerSec: 6 });

console.log("\n=== MUTATION LAB — pacing sim (60 min, optimizing player) ===\n");
console.log("time    lifetime    prod/sec    prestiges  EP     pressure(raw/S)");
for (const row of r.rows) {
  console.log(
    `${mmss(row.t).padEnd(7)} ${fmt(row.lifetime).padStart(9)}  ${fmt(row.prodSec).padStart(9)}  ` +
    `${String(row.prestiges).padStart(8)}  ${String(row.ep).padStart(5)}  ${row.pressure.toFixed(2)}`
  );
}

console.log("\n--- lifetime-biomass order-of-magnitude pacing (key signal) ---");
const ooms = Object.keys(r.milestones).map(Number).sort((a, b) => a - b);
let prev = 0;
for (const oom of ooms) {
  const t = r.milestones[oom];
  console.log(`  1e${oom}  reached at ${mmss(t).padStart(7)}   (+${mmss(t - prev)} since prev OOM)`);
  prev = t;
}

console.log(`\n  First Speciate unlock (pressure hits the wall): ${r.firstSpeciate ? mmss(r.firstSpeciate) : "NOT in 60 min"}`);
console.log(`  After 60 min: lifetime=${fmt(r.final.lifetimeBiomass)}  prestiges=${r.final.prestiges}  EP=${r.final.evolutionPoints}`);
console.log("\n  TARGET: first Speciate ~10-15 min; OOM gaps should GROW (curve bending), not shrink.\n");
