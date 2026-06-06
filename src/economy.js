// All the number-crunching: costs, production, clicks, purchases, offline gains.

import { state, nowSeconds } from "./state.js";
import { GENERATORS } from "./data/generators.js";
import { MUTATIONS, MUT_BY_ID } from "./data/mutations.js";
import { TUN, softknee } from "./data/tunables.js";

// EP payoff with a softcap: linear +10%/EP early, sqrt tail late (anti-runaway).
function epPayoffMult(ep) {
  const { breakpoint, headSlope, tailScale } = TUN.ep;
  if (ep <= breakpoint) return 1 + headSlope * ep;
  return 1 + headSlope * breakpoint + tailScale * Math.sqrt(ep - breakpoint);
}

const GEN_BY_ID = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));

// ---- mutation / prestige modifiers ----
// Build the modifier bag by running every owned mutation's effect.
export function getModifiers() {
  const mods = { clickMult: 1, prodMult: 1, epMult: 1, genMult: {} };
  const counts = {};
  for (const id of state.mutations) counts[id] = (counts[id] || 0) + 1;
  const totalGenerators = GENERATORS.reduce(
    (s, g) => s + (state.owned[g.id] || 0), 0);
  const info = { counts, totalMutations: state.mutations.length, totalGenerators };
  for (const id of state.mutations) {
    const def = MUT_BY_ID[id];
    if (def && def.effect) def.effect(mods, info);
  }
  // Evolution Point payoff — softcapped so it can't run away (see tunables.js)
  mods.prodMult *= epPayoffMult(state.evolutionPoints || 0);
  // temporary buffs (blooms / abilities) applied at ONE point — empty for now,
  // this is the single chokepoint so a stray buff can't re-leak the runaway
  for (const b of state.tempBuffs || []) {
    if (b.prodMult) mods.prodMult *= b.prodMult;
    if (b.clickMult) mods.clickMult *= b.clickMult;
  }
  return mods;
}

// Cost of the NEXT unit of a generator (exponential scaling).
export function costOf(genId) {
  const g = GEN_BY_ID[genId];
  const owned = state.owned[genId] || 0;
  return Math.ceil(g.baseCost * Math.pow(g.costGrowth, owned));
}

export function canAfford(genId) {
  return state.biomass >= costOf(genId);
}

export function buy(genId) {
  const cost = costOf(genId);
  if (state.biomass < cost) return false;
  state.biomass -= cost;
  state.owned[genId] = (state.owned[genId] || 0) + 1;
  return true;
}

// Raw biomass/sec BEFORE the global production softcap (per-generator saturation
// already applied). Shared by productionPerSecond + pressureLevel.
function rawProduction() {
  const mods = getModifiers();
  let total = 0;
  for (const g of GENERATORS) {
    let gen = (state.owned[g.id] || 0) * g.baseProduction * (mods.genMult[g.id] || 1);
    // per-generator saturation: spreading across organelles beats mono-buying one
    gen = softknee(gen, TUN.genSaturation.threshold, TUN.genSaturation.exp);
    total += gen;
  }
  return total * mods.prodMult;
}

// The current Metabolic Pressure cap S (raised by prestige; Genome later).
export function productionSoftcapThreshold() {
  return TUN.prodSoftcap.base
    * Math.pow(TUN.prodSoftcap.growthPerPrestige, state.prestiges || 0)
    * (state.genomeCapBonus || 1);
}

// 0..1+ : how close production is to the wall (drives the Phase-1 Pressure meter).
export function pressureLevel() {
  return rawProduction() / productionSoftcapThreshold();
}

// Total passive biomass/sec, with the global production softcap (the wall) applied.
export function productionPerSecond() {
  return softknee(rawProduction(), productionSoftcapThreshold(), TUN.prodSoftcap.exp);
}

// Click power after mutation modifiers.
export function effectiveClickPower() {
  return state.clickPower * getModifiers().clickMult;
}

// A manual click.
export function click() {
  const gain = effectiveClickPower();
  addBiomass(gain);
  return gain;
}

export function addBiomass(amount) {
  state.biomass += amount;
  state.lifetimeBiomass += amount;
  state.runBiomass += amount;
}

// Whether a generator should be visible yet (soft unlock by lifetime biomass).
export function isUnlocked(genId) {
  const g = GEN_BY_ID[genId];
  return state.lifetimeBiomass >= g.unlockAt || (state.owned[genId] || 0) > 0;
}

// ---- Prestige (Evolve) ----
// EP you'd gain by evolving right now: sqrt curve on this run's biomass.
export function epForReset() {
  const mods = getModifiers();
  const raw = Math.sqrt((state.runBiomass || 0) / 1e4) * mods.epMult;
  return Math.max(0, Math.floor(raw));
}

export function canPrestige() {
  return epForReset() >= 1;
}

// Perform the reset. Returns EP gained (0 if not worthwhile).
export function doPrestige() {
  const gain = epForReset();
  if (gain < 1) return 0;
  state.evolutionPoints = (state.evolutionPoints || 0) + gain;
  state.prestiges = (state.prestiges || 0) + 1;
  // wipe the run; keep all meta (EP, mutations)
  state.biomass = 0;
  state.runBiomass = 0;
  for (const g of GENERATORS) state.owned[g.id] = 0;
  return gain;
}

// ---- Mutation draft ----
// Roll N distinct mutations, weighted by rarity.
export function rollDraft(n = 3) {
  const weights = { common: 60, rare: 30, legendary: 10 };
  const pool = [...MUTATIONS];
  const picks = [];
  while (picks.length < n && pool.length > 0) {
    const total = pool.reduce((s, m) => s + weights[m.rarity], 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[pool[i].rarity];
      if (r <= 0) { idx = i; break; }
    }
    picks.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return picks;
}

export function acquireMutation(id) {
  if (MUT_BY_ID[id]) state.mutations.push(id);
}

// Apply offline progress on load. Returns biomass earned while away.
export function applyOfflineProgress() {
  const now = nowSeconds();
  const elapsed = Math.max(0, now - (state.lastSeen || now));
  // cap at 8 hours so it stays a treat, not a runaway
  const capped = Math.min(elapsed, 8 * 3600);
  const earned = productionPerSecond() * capped;
  if (earned > 0) addBiomass(earned);
  state.lastSeen = now;
  return { earned, seconds: capped };
}
