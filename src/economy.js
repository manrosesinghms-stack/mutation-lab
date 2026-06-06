// All the number-crunching: costs, production, clicks, purchases, offline gains.

import { state, nowSeconds } from "./state.js";
import { GENERATORS } from "./data/generators.js";
import { MUTATIONS, MUT_BY_ID } from "./data/mutations.js";
import { TUN, softknee } from "./data/tunables.js";
import { NODE_BY_ID, nodeLevel, nodeCost } from "./data/genomeNodes.js";
import { ACHIEVEMENTS } from "./data/achievements.js";
import { activeSynergies } from "./data/synergies.js";
import { completedSets } from "./data/sets.js";

// EP payoff with a softcap: linear +10%/EP early, sqrt tail late (anti-runaway).
function epPayoffMult(ep) {
  const { breakpoint, headSlope, tailScale } = TUN.ep;
  if (ep <= breakpoint) return 1 + headSlope * ep;
  return 1 + headSlope * breakpoint + tailScale * Math.sqrt(ep - breakpoint);
}

const GEN_BY_ID = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));

// ---- mutation / prestige modifiers ----
// Run a list of mutation ids into a modifier bag (shared by the live build and
// by equipped Species which carry a frozen mutation list).
function applyMutationEffects(mods, mutList) {
  const counts = {};
  for (const id of mutList) counts[id] = (counts[id] || 0) + 1;
  const totalGenerators = GENERATORS.reduce((s, g) => s + (state.owned[g.id] || 0), 0);
  const info = { counts, totalMutations: mutList.length, totalGenerators };
  for (const id of mutList) {
    const def = MUT_BY_ID[id];
    if (def && def.effect) def.effect(mods, info);
  }
}

// Build the full modifier bag: live mutations + EP + equipped Species + temp buffs.
export function getModifiers() {
  const mods = { clickMult: 1, prodMult: 1, epMult: 1, genMult: {} };
  applyMutationEffects(mods, state.mutations);
  // Evolution Point payoff — softcapped so it can't run away (see tunables.js)
  mods.prodMult *= epPayoffMult(state.evolutionPoints || 0);
  // synergies (combo traits) + completed set bonuses
  for (const syn of activeSynergies(state.mutations)) if (syn.effect) syn.effect(mods);
  for (const set of completedSets(state.mutations)) if (set.bonus) set.bonus(mods);
  mods.prodMult *= variantBonus(); // rare Golden/Crystal/Void runs
  // equipped Species contribute their frozen build at reduced (sqrt) weight
  for (const sid of state.equippedSpecies || []) {
    const sp = (state.species || []).find((s) => s.id === sid);
    if (!sp) continue;
    const sm = { clickMult: 1, prodMult: 1, epMult: 1, genMult: {} };
    applyMutationEffects(sm, sp.mutations || []);
    mods.prodMult *= Math.sqrt(Math.max(1, sm.prodMult));
    mods.clickMult *= Math.sqrt(Math.max(1, sm.clickMult));
  }
  // temporary buffs (blooms / Digest) applied at ONE chokepoint, expiry-aware
  const now = Date.now();
  for (const b of state.tempBuffs || []) {
    if (b.expiresAt && b.expiresAt <= now) continue;
    if (b.prodMult) mods.prodMult *= b.prodMult;
    if (b.clickMult) mods.clickMult *= b.clickMult;
  }
  // permanent achievement bonuses
  const ach = state.achievements || {};
  for (const a of ACHIEVEMENTS) {
    if (!ach[a.id]) continue;
    if (a.prodMult) mods.prodMult *= a.prodMult;
    if (a.clickMult) mods.clickMult *= a.clickMult;
  }
  return mods;
}

// Unlock any newly-discovered synergy traits / completed sets; returns new ones.
export function checkTraits() {
  state.discoveredTraits = state.discoveredTraits || {};
  const found = [];
  for (const syn of activeSynergies(state.mutations)) {
    if (!state.discoveredTraits[syn.id]) {
      state.discoveredTraits[syn.id] = true;
      found.push({ kind: "trait", name: syn.name, flavor: syn.flavor });
    }
  }
  for (const set of completedSets(state.mutations)) {
    const key = "set_" + set.id;
    if (!state.discoveredTraits[key]) {
      state.discoveredTraits[key] = true;
      found.push({ kind: "set", name: set.form, flavor: `${set.name} set complete!` });
    }
  }
  return found;
}

// Unlock any newly-satisfied achievements; returns the list of new ones.
export function checkAchievements() {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.check(state)) {
      state.achievements[a.id] = true;
      unlocked.push(a);
    }
  }
  return unlocked;
}

// ---- temporary buffs (Phase 3: blooms + Digest) ----
export function addTempBuff(buff) {
  // buff: { id, prodMult?, clickMult?, durationMs }
  const now = Date.now();
  state.tempBuffs = (state.tempBuffs || []).filter((b) => b.id !== buff.id); // refresh same id
  state.tempBuffs.push({ ...buff, expiresAt: now + buff.durationMs });
}

export function pruneTempBuffs() {
  const now = Date.now();
  state.tempBuffs = (state.tempBuffs || []).filter((b) => !b.expiresAt || b.expiresAt > now);
}

export function activeBuffs() {
  const now = Date.now();
  return (state.tempBuffs || []).filter((b) => !b.expiresAt || b.expiresAt > now);
}

// Digest: spend 40% of biomass for a temporary production surge (an opt-in sink).
export function doDigest() {
  const spend = (state.biomass || 0) * 0.4;
  if (spend < 10) return null;
  state.biomass -= spend;
  const mult = 2 + Math.min(8, Math.log10(spend + 10)); // ~2x .. 10x by amount spent
  addTempBuff({ id: "digest", prodMult: mult, durationMs: 15000 });
  return { spend, mult };
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

// The current Metabolic Pressure cap S — raised ONLY by the Genome "wall_up" node
// (never by prestige count; the sim proved that defeats the wall).
export function productionSoftcapThreshold() {
  const wall = 1 + 1.5 * nodeLevel(state, "wall_up");
  return TUN.prodSoftcap.base * wall;
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
// EP you'd gain by evolving right now: sqrt curve on this run's biomass,
// boosted by the Catalyst genome node.
export function epForReset() {
  const mods = getModifiers();
  const epNode = 1 + 0.25 * nodeLevel(state, "ep_boost");
  const raw = Math.sqrt((state.runBiomass || 0) / 1e4) * mods.epMult * epNode;
  return Math.max(0, Math.floor(raw));
}

// Biomass each new run starts with (Yolk Reserve node).
export function startBoostBiomass() {
  const lvl = nodeLevel(state, "start_boost");
  return lvl > 0 ? Math.pow(10, lvl) : 0;
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
  // wipe the run; keep all meta (EP, mutations). Yolk Reserve gives a head start.
  state.biomass = startBoostBiomass();
  state.runBiomass = state.biomass;
  for (const g of GENERATORS) state.owned[g.id] = 0;
  return gain;
}

// ---- Speciate (2nd prestige layer): snapshot build -> Species card + Genome ----
export function draftSize() {
  return 3 + nodeLevel(state, "draft_4");
}

function speciesStrength(mutList) {
  const m = { clickMult: 1, prodMult: 1, epMult: 1, genMult: {} };
  applyMutationEffects(m, mutList);
  return m.prodMult * m.clickMult;
}

function generateSpeciesName(mutList) {
  const names = [...new Set(mutList)]
    .map((id) => (MUT_BY_ID[id] ? MUT_BY_ID[id].name.split(" ")[0] : null))
    .filter(Boolean);
  const a = names[0] || "Primordial";
  const b = names[1] ? " " + names[1] : "";
  const suffix = ["Strain", "Lineage", "Clade", "Form"][mutList.length % 4];
  return `${a}${b} ${suffix}`;
}

// Genome granted by Speciating now: log2(runBiomass) + 2 per distinct mutation
// (a slow, bounded faucet a runaway can't inflate — it's log of biomass).
export function genomeForSpeciate() {
  const distinct = new Set(state.mutations).size;
  const lb = Math.max(2, state.runBiomass || 0);
  return Math.floor(Math.log2(lb)) + 2 * distinct;
}

// Speciate unlocks once you hit the wall (pressure ~maxed) and it'd grant >=1 Genome.
export function canSpeciate() {
  return pressureLevel() >= 0.9 && genomeForSpeciate() >= 1;
}

export function doSpeciate() {
  if (!canSpeciate()) return null;
  const gain = genomeForSpeciate();
  const card = {
    id: "sp_" + (state.speciations + 1) + "_" + Math.floor(Math.random() * 1e6),
    name: generateSpeciesName(state.mutations),
    mutations: state.mutations.slice(),
    parts: state.mutations
      .map((id) => MUT_BY_ID[id])
      .filter((d) => d && d.part)
      .map((d) => d.part),
    strength: speciesStrength(state.mutations),
  };
  state.species.push(card);
  state.genome = (state.genome || 0) + gain;
  state.speciations = (state.speciations || 0) + 1;
  // wipe the entire Evolve layer (EP + mutations + generators); Species cards persist
  state.evolutionPoints = 0;
  state.mutations = [];
  state.prestiges = 0;
  state.lastMilestoneExp = 2;
  state.biomass = startBoostBiomass();
  state.runBiomass = state.biomass;
  for (const g of GENERATORS) state.owned[g.id] = 0;
  return { card, gain };
}

// ---- Genome node grid ----
export function buyNode(id) {
  const cost = nodeCost(state, id);
  if (!isFinite(cost) || state.genome < cost) return false;
  state.genome -= cost;
  state.genomeNodes[id] = (state.genomeNodes[id] || 0) + 1;
  return true;
}

export function equipSlots() {
  return 1 + nodeLevel(state, "equip_slot");
}

export function toggleEquip(sid) {
  const i = state.equippedSpecies.indexOf(sid);
  if (i >= 0) { state.equippedSpecies.splice(i, 1); return true; }
  if (state.equippedSpecies.length >= equipSlots()) return false;
  state.equippedSpecies.push(sid);
  return true;
}

export function hasNode(id) {
  return nodeLevel(state, id) > 0;
}

// ---- rare run variants (Golden / Crystal / Void) ----
const VARIANT_BONUS = { golden: 2, crystal: 1.5, void: 3 };
export function variantBonus() { return VARIANT_BONUS[state.variant] || 1; }
export function rollVariant() {
  const r = Math.random();
  let v = null;
  if (r < 0.002) v = "void";
  else if (r < 0.008) v = "crystal";
  else if (r < 0.022) v = "golden";
  state.variant = v;
  if (v) { state.variantsSeen = state.variantsSeen || {}; state.variantsSeen[v] = true; }
  return v;
}

// Mitosis Engine node: greedily buy the best-value affordable organelles.
export function autoBuyGenerators(maxBuys = 60) {
  for (let i = 0; i < maxBuys; i++) {
    let best = null, bestVal = 0;
    for (const g of GENERATORS) {
      const c = costOf(g.id);
      if (c > state.biomass) continue;
      const v = g.baseProduction / c;
      if (v > bestVal) { bestVal = v; best = g; }
    }
    if (!best) break;
    buy(best.id);
  }
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
  if (MUT_BY_ID[id]) {
    state.mutations.push(id);
    state.discovered = state.discovered || {};
    state.discovered[id] = true; // for the collection / completionist achievement
  }
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
