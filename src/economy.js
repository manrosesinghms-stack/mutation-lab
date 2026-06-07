// All the number-crunching: costs, production, clicks, purchases, offline gains.

import { state, nowSeconds } from "./state.js";
import { GENERATORS } from "./data/generators.js";
import { MUTATIONS, MUT_BY_ID } from "./data/mutations.js";
import { TUN, softknee } from "./data/tunables.js";
import { NODE_BY_ID, nodeLevel, nodeCost } from "./data/genomeNodes.js";
import { ACHIEVEMENTS } from "./data/achievements.js";
import { activeSynergies, partCounts } from "./data/synergies.js";
import { completedSets } from "./data/sets.js";
import { BIOMES, BIOME_BY_ID } from "./data/biomes.js";
import { CHALLENGE_BY_ID } from "./data/challenges.js";
import { SKIN_BY_ID } from "./data/skins.js";
import { HELIX_NODES, HELIX_BY_ID, helixLevel as hLvl, helixCost as hCost } from "./data/helix.js";
import { HYBRID_BY_KEY, spliceKey } from "./data/hybrids.js";
import { UPGRADES, UPG_BY_ID } from "./data/upgrades.js";
import { GENE_BY_ID, PANTHEON_SLOTS, SYMBIOTE_THRESH, AURA_BY_ID } from "./data/genes.js";
import { SEED_BY_ID } from "./data/garden.js";
import { SEASON_BY_ID } from "./data/seasons.js";
import { COLONY_NODES, COLONY_BY_ID } from "./data/colony.js";
import { DRONES, AUTOMATORS, FACTORY, DRONE_BY_ID, AUTOMATOR_BY_ID, FACTORY_BY_ID, LEVELED_BY_ID } from "./data/machines.js";
import { EVO_STAGES, STAGE_COUNT, stageForRank, nextStageRank } from "./data/stages.js";
import { EVO_PATHS, PATH_BY_ID } from "./data/paths.js";
import { RESEARCH_TIERS, ORG_NAMES } from "./data/research.js";
import { ATLAS_FAMILIES } from "./data/atlas.js";

// buy (if needed) + equip a cosmetic skin; returns the skin or null
export function buySkin(id) {
  const s = SKIN_BY_ID[id];
  if (!s) return null;
  state.skinsOwned = state.skinsOwned || { default: true };
  if (!state.skinsOwned[id]) {
    if ((state.genome || 0) < s.cost) return null;
    state.genome -= s.cost;
    state.skinsOwned[id] = true;
  }
  state.skin = id;
  return s;
}

function challengeRule() {
  return state.challenge ? (CHALLENGE_BY_ID[state.challenge] || {}).rule : null;
}

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
  const biome = BIOME_BY_ID[state.biome]; // per-run world buff
  if (biome) biome.buff(mods, partCounts(state.mutations));
  mods.prodMult *= state.stabilizeBonus || 1; // genetic-instability stabilize choice
  if (challengeRule() === "hyper") { mods.prodMult *= 4; mods.clickMult *= 4; }
  const wk = currentWeekly(); // weekly event modifier
  if (wk.prod) mods.prodMult *= wk.prod;
  if (wk.click) mods.clickMult *= wk.click;
  if (wk.ep) mods.epMult *= wk.ep;
  // equipped Species contribute their frozen build at reduced (sqrt) weight
  for (const sid of state.equippedSpecies || []) {
    const sp = (state.species || []).find((s) => s.id === sid);
    if (!sp) continue;
    const sm = { clickMult: 1, prodMult: 1, epMult: 1, genMult: {} };
    applyMutationEffects(sm, sp.mutations || []);
    mods.prodMult *= Math.sqrt(Math.max(1, sm.prodMult));
    mods.clickMult *= Math.sqrt(Math.max(1, sm.clickMult));
  }
  // temporary buffs (blooms / Digest): collect now, but APPLY at the very end so
  // they burst ON TOP of the soft-capped permanent multiplier (a Frenzy should
  // still feel like a real ×4, not get swallowed by the cap).
  const now = Date.now();
  let tempProd = 1, tempClick = 1;
  for (const b of state.tempBuffs || []) {
    if (b.expiresAt && b.expiresAt <= now) continue;
    if (b.prodMult) tempProd *= b.prodMult;
    if (b.clickMult) tempClick *= b.clickMult;
  }
  // permanent achievement bonuses
  const ach = state.achievements || {};
  for (const a of ACHIEVEMENTS) {
    if (!ach[a.id]) continue;
    if (a.prodMult) mods.prodMult *= a.prodMult;
    if (a.clickMult) mods.clickMult *= a.clickMult;
  }
  // Helix meta-tree (3rd prestige) — permanent multipliers across every Transcension
  let helixTotal = 0;
  for (const n of HELIX_NODES) {
    const lv = hLvl(state, n.id);
    if (!lv) continue;
    helixTotal += lv;
    if (n.mod) {
      if (n.mod.p) mods.prodMult *= 1 + n.mod.p * lv;
      if (n.mod.c) mods.clickMult *= 1 + n.mod.c * lv;
      if (n.mod.e) mods.epMult *= 1 + n.mod.e * lv;
    }
  }
  // Primordial Singularity capstone: production scales with your TOTAL Helix investment
  const sing = hLvl(state, "singularity");
  if (sing) mods.prodMult *= 1 + 0.03 * sing * helixTotal;
  // Biomass Culture: every achievement permanently boosts production (Cookie-Clicker's "milk")
  mods.prodMult *= cultureMult();
  // Gene Splicer — each discovered Hybrid is a small permanent production bonus
  mods.prodMult *= 1 + 0.02 * Object.keys(state.splices || {}).length;
  // Challenge Tower — each cleared challenge is a permanent +8% production
  mods.prodMult *= 1 + 0.08 * Object.keys(state.challengesDone || {}).length;
  // Mutagen organelle levels — +5% to that organelle per level
  if (state.genLevels) for (const id in state.genLevels) {
    mods.genMult[id] = (mods.genMult[id] || 1) * (1 + 0.05 * state.genLevels[id]);
  }
  // Genome Pantheon — slotted genes apply their delta × slot weight
  if (state.pantheon) for (const slot of PANTHEON_SLOTS) {
    const g = GENE_BY_ID[state.pantheon[slot.id]];
    if (g) { mods.prodMult *= 1 + g.prod * slot.weight; mods.clickMult *= 1 + g.click * slot.weight; }
  }
  // Symbiote — per-stage growth bonus + the chosen aura
  if (state.symbiote) {
    mods.prodMult *= 1 + 0.05 * symbioteStage();
    const a = AURA_BY_ID[state.symbiote.aura];
    if (a) { mods.prodMult *= 1 + a.prod; mods.clickMult *= 1 + a.click; }
  }
  // Seasonal event bonus
  const se = SEASON_BY_ID[state.season];
  if (se && se.prod) mods.prodMult *= 1 + se.prod;
  // Aberration mode (grandmapocalypse) — big risk/reward production boost
  if (state.aberration) { mods.prodMult *= 2.5; mods.clickMult *= 2.5; }
  // Colonization Map — every claimed node is a permanent bonus
  if (state.colony) for (const id in state.colony) {
    const n = COLONY_BY_ID[id];
    if (n) { mods.prodMult *= 1 + n.prod; mods.clickMult *= 1 + n.click; }
  }
  // Evolution Path — your chosen lineage's build bonus, scaling with macro-stage
  if (state.evoPath && PATH_BY_ID[state.evoPath]) {
    const p = PATH_BY_ID[state.evoPath];
    const st = stageForRank(state.evolutionRank || 0);
    const b = 1 + p.bonus.per * st;
    if (p.bonus.kind === "click") mods.clickMult *= b;
    else if (p.bonus.kind === "prod") mods.prodMult *= b;
    else if (p.bonus.kind === "ep") mods.epMult *= b;
    else if (p.bonus.kind === "prodclick") { mods.prodMult *= b; mods.clickMult *= b; }
  }
  // Petri Garden — mature plots give passive buffs
  if (state.garden && state.garden.plots) {
    const now = Date.now();
    for (const p of state.garden.plots) {
      if (!p) continue;
      const seed = SEED_BY_ID[p.seed];
      if (seed && now - p.at >= seed.growMs) { mods.prodMult *= 1 + seed.prod; mods.clickMult *= 1 + seed.click; }
    }
  }
  // Upgrade Store — purchased upgrades (persist across Evolve, reset on Speciate)
  const up = state.upgrades || {};
  for (const id in up) {
    if (!up[id]) continue;
    const u = UPG_BY_ID[id];
    if (!u) continue;
    if (u.gen) mods.genMult[u.gen] = (mods.genMult[u.gen] || 1) * u.mult;
    if (u.click) mods.clickMult *= u.click;
    if (u.prod) mods.prodMult *= u.prod;
  }
  // Organelle Research — ownership-milestone tiers multiply each organelle
  for (const g of GENERATORS) {
    const rm = researchMult(g.id);
    if (rm > 1) mods.genMult[g.id] = (mods.genMult[g.id] || 1) * rm;
  }
  // Genome Atlas — permanent Mastery bonuses from completed mutation families
  const atlas = atlasMods();
  mods.prodMult *= atlas.prod;
  mods.clickMult *= atlas.click;
  mods.epMult *= atlas.ep;

  // ---- Global soft-cap on the PERMANENT multiplier stack ----
  // Every system above multiplies together, so they compound to ×10^8+ within a
  // handful of Evolves (mutations alone hit ×87k from 10), which makes any
  // organelle purchase explode to billions instantly. Soft-knee the combined
  // permanent multiplier: untouched below the threshold (early game feels normal),
  // gentle power-curve above it so stacking always helps but never runs away.
  mods.prodMult = softknee(mods.prodMult, TUN.multSoftcap.base, TUN.multSoftcap.exp);
  mods.clickMult = softknee(mods.clickMult, TUN.multSoftcap.base, TUN.multSoftcap.exp);
  // temp buffs (Frenzy / Digest) burst ON TOP of the capped permanent base
  mods.prodMult *= tempProd;
  mods.clickMult *= tempClick;
  return mods;
}

// ---- Upgrade Store ----
export function upgradeUnlocked(u) {
  if (u.unlock.gen) return (state.owned[u.unlock.gen] || 0) >= u.unlock.n;
  if (u.unlock.lifetime) return (state.lifetimeBiomass || 0) >= u.unlock.lifetime;
  return false;
}
export function upgradeOwned(id) { return !!(state.upgrades || {})[id]; }
// upgrades the player can see RIGHT NOW: unlocked + not yet bought
export function availableUpgrades() {
  return UPGRADES.filter((u) => !upgradeOwned(u.id) && upgradeUnlocked(u));
}
export function affordableUpgradeCount() {
  return availableUpgrades().filter((u) => state.biomass >= u.cost).length;
}
export function buyUpgrade(id) {
  const u = UPG_BY_ID[id];
  if (!u || upgradeOwned(id) || !upgradeUnlocked(u) || state.biomass < u.cost) return false;
  state.biomass -= u.cost;
  state.upgrades = state.upgrades || {};
  state.upgrades[id] = true;
  return true;
}

// ---- Gene Splicer minigame ----
export function spliceCooldownLeft() { return Math.max(0, (state.spliceReadyAt || 0) - Date.now()); }
export function canSplice() { return spliceCooldownLeft() <= 0; }
export function splicesFound() { return Object.keys(state.splices || {}).length; }
export function doSplice(a, b) {
  if (!a || !b || !canSplice()) return null;
  const key = spliceKey(a, b);
  const hy = HYBRID_BY_KEY[key] || { name: "Unstable Hybrid", flavor: "It should not exist… and yet." };
  state.splices = state.splices || {};
  const isNew = !state.splices[key];
  state.splices[key] = true;
  // temporary "Hybrid Surge" buff, stronger the more of those parts you've grown
  const counts = partCounts(state.mutations);
  const power = 1 + Math.min(10, (counts[a] || 0) + (counts[b] || 0)) * 0.6;
  addTempBuff({ id: "splice", prodMult: power, durationMs: 30000 });
  state.spliceReadyAt = Date.now() + 40000;
  return { hybrid: hy, key, isNew, power };
}

// ---- Biomass Exchange (buy low / sell high reagent trading) ----
export const REAGENTS = [
  { id: "enzyme", name: "Enzymes" }, { id: "protein", name: "Proteins" },
  { id: "lipid", name: "Lipids" }, { id: "atp", name: "ATP" }, { id: "rna", name: "RNA" },
];
function initMarket() {
  if (!state.market || !state.market.r) state.market = { r: {}, held: {}, brokers: 0 };
  for (const x of REAGENTS) {
    if (!state.market.r[x.id]) state.market.r[x.id] = { price: 100, prev: 100, mode: "stable", t: 6 };
    if (state.market.held[x.id] == null) state.market.held[x.id] = 0;
  }
  return state.market;
}
// biomass value per price-point — pegged to income so a trade is "minutes of
// production" (affordable + always relevant). One unit at base price 100 costs
// ~100 * uv; with uv = prod*0.04 that's ~4s of income per unit.
export function marketUnitValue() {
  return Math.max(50, productionPerSecond() * 0.04);
}
export function brokerFee() { return Math.max(0.01, 0.20 - (state.market ? state.market.brokers : 0) * 0.02); }
export function marketState() { return initMarket(); }
export function marketTick() {
  const M = initMarket();
  for (const x of REAGENTS) {
    const r = M.r[x.id];
    r.prev = r.price;
    if (--r.t <= 0) {
      r.mode = ["stable", "rise", "rise", "fall", "fall", "volatile"][(Math.random() * 6) | 0];
      r.t = 4 + ((Math.random() * 9) | 0);
    }
    let d = (Math.random() - 0.5) * 5;
    if (r.mode === "rise") d = 2 + Math.random() * 5;
    else if (r.mode === "fall") d = -(2 + Math.random() * 5);
    else if (r.mode === "volatile") d = (Math.random() - 0.5) * 26;
    r.price = Math.max(8, Math.min(330, r.price + d));
  }
}
export function buyReagent(id, qty) {
  const M = initMarket(); const r = M.r[id]; if (!r || qty <= 0) return false;
  const cost = Math.ceil(qty * r.price * marketUnitValue() * (1 + brokerFee()));
  if (state.biomass < cost) return false;
  state.biomass -= cost; M.held[id] += qty; return cost;
}
export function maxBuy(id) {
  const M = initMarket(); const r = M.r[id]; if (!r) return 0;
  return Math.floor(state.biomass / (r.price * marketUnitValue() * (1 + brokerFee())));
}
export function sellReagent(id, qty) {
  const M = initMarket(); const have = M.held[id] || 0; qty = Math.min(qty, have);
  if (qty <= 0) return false;
  const gain = Math.floor(qty * M.r[id].price * marketUnitValue());
  M.held[id] = have - qty; state.biomass += gain; return gain;
}
export function buyBroker() {
  const M = initMarket();
  const cost = marketUnitValue() * 2000 * (M.brokers + 1);
  if (M.brokers >= 9 || state.biomass < cost) return false;
  state.biomass -= cost; M.brokers++; return true;
}
export function brokerCost() { const M = initMarket(); return marketUnitValue() * 2000 * (M.brokers + 1); }

// ---- Colonization Map ----
export function colonyClaimed(id) { return !!(state.colony && state.colony[id]); }
export function colonyUnlocked(node) { return node.requires.every((r) => colonyClaimed(r)); }
// nodes the frontier can claim now (unlocked + unclaimed) + claimed (for display)
export function colonyNodes() {
  return COLONY_NODES.map((n) => ({
    node: n,
    claimed: colonyClaimed(n.id),
    unlocked: colonyUnlocked(n),
    affordable: (state.biomass || 0) >= n.cost,
  }));
}
export function claimColonyNode(id) {
  const n = COLONY_BY_ID[id];
  if (!n || colonyClaimed(id) || !colonyUnlocked(n) || (state.biomass || 0) < n.cost) return false;
  state.biomass -= n.cost;
  state.colony = state.colony || {};
  state.colony[id] = true;
  return true;
}
export function colonyCount() { return Object.keys(state.colony || {}).length; }

// ---- Evolution Rank (permanent macro-progression) ----
// Every prestige ADDS rank; nothing ever subtracts it. Rank drives the 6
// dramatic creature stages, so your monster keeps evolving across resets.
// Returns { gainedStage: true } when the add crossed into a new stage.
export function addEvolutionRank(n) {
  const before = stageForRank(state.evolutionRank || 0);
  state.evolutionRank = (state.evolutionRank || 0) + n;
  state.peakRank = Math.max(state.peakRank || 0, state.evolutionRank);
  const after = stageForRank(state.evolutionRank);
  return { rank: state.evolutionRank, stageIndex: after, gainedStage: after > before };
}
// Everything the UI / creature need about the current stage in one call.
// Path-aware: once a path is chosen, the stage NAME / COLOR come from the path.
export function evolutionStage() {
  const rank = state.evolutionRank || 0;
  const index = stageForRank(rank);
  const stage = EVO_STAGES[index];
  const next = nextStageRank(rank);
  const curMin = stage.minRank;
  const progress = next == null ? 1 : Math.max(0, Math.min(1, (rank - curMin) / (next - curMin)));
  const p = state.evoPath ? PATH_BY_ID[state.evoPath] : null;
  const name = p ? p.stages[index] : stage.name;
  const color = p ? p.color : stage.color;
  return { rank, index, stage, name, blurb: stage.blurb, color, nextRank: next, progress, isMax: next == null, path: state.evoPath || null, pathData: p };
}

// ---- Genome Atlas (permanent mutation-mastery collection) ----
// A family is complete when every member is in state.discovered. Completed
// families grant permanent multipliers. Cached by discovered-count so the
// hot getModifiers() path stays cheap.
let _atlasCache = { n: -1, prod: 1, click: 1, ep: 1 };
export function atlasMods() {
  const n = Object.keys(state.discovered || {}).length;
  if (n === _atlasCache.n) return _atlasCache;
  let prod = 1, click = 1, ep = 1;
  const disc = state.discovered || {};
  for (const f of ATLAS_FAMILIES) {
    if (f.members.every((id) => disc[id])) {
      if (f.bonus.kind === "prod") prod *= f.bonus.mult;
      else if (f.bonus.kind === "click") click *= f.bonus.mult;
      else if (f.bonus.kind === "ep") ep *= f.bonus.mult;
    }
  }
  _atlasCache = { n, prod, click, ep };
  return _atlasCache;
}
// For the Codex UI: each family with its discovered/total + complete flag.
export function atlasFamilies() {
  const disc = state.discovered || {};
  return ATLAS_FAMILIES.map((f) => {
    const found = f.members.filter((id) => disc[id]).length;
    return { id: f.id, name: f.name, icon: f.icon, flavor: f.flavor, bonus: f.bonus, found, total: f.members.length, complete: found >= f.members.length };
  });
}
export function masteriesComplete() { return atlasFamilies().filter((f) => f.complete).length; }

// ---- Biomass Culture (Cookie-Clicker "milk"): every achievement permanently
// boosts ALL production, forever. Achievements never reset, so this only grows. ----
const CULTURE_PER_ACH = 0.012; // +1.2% production per achievement unlocked
export function cultureCount() { return Object.keys(state.achievements || {}).length; }
export function cultureMult() { return 1 + CULTURE_PER_ACH * cultureCount(); }

// ---- Organelle Research (auto-unlocked ownership-milestone tiers) ----
// How many research tiers an organelle has unlocked (by current owned count).
export function researchTiers(genId) {
  const o = state.owned[genId] || 0;
  let n = 0;
  for (const t of RESEARCH_TIERS) if (o >= t.at) n++;
  return n;
}
// Compounding ×multiplier from all unlocked tiers.
export function researchMult(genId) {
  const o = state.owned[genId] || 0;
  let m = 1;
  for (const t of RESEARCH_TIERS) if (o >= t.at) m *= t.mult;
  return m;
}
// Current escalating name (Ribosome → Molecular Forge → …).
export function researchName(genId) {
  const names = ORG_NAMES[genId];
  if (!names) return null;
  return names[Math.min(researchTiers(genId), names.length - 1)];
}
// Next milestone {at, mult} or null if maxed.
export function nextResearch(genId) {
  const o = state.owned[genId] || 0;
  for (const t of RESEARCH_TIERS) if (o < t.at) return t;
  return null;
}

// ---- Species Museum (permanent lineage archive) ----
// A specimen is recorded every Speciation and NEVER reset. The museum is your
// growing family tree — resets become collecting.
export function museumList() { return state.museum || []; }
export function museumCount() { return (state.museum || []).length; }
function archiveSpecimen(card) {
  state.museum = state.museum || [];
  const evo = evolutionStage();
  state.museum.push({
    gen: state.museum.length + 1,
    name: card.name,
    stage: evo.name,
    stageIndex: evo.index,
    path: evo.path || null,
    pathIcon: evo.pathData ? evo.pathData.icon : "",
    color: evo.color,
    muts: (card.mutations || []).length,
    parts: (card.parts || []).slice(0, 10),
    strength: card.strength || 1,
    rank: evo.rank,
    lifetime: Math.floor(state.lifetimeBiomass || 0),
  });
  if (state.museum.length > 500) state.museum = state.museum.slice(-500); // safety cap
}

// ---- Evolution Paths (chosen lineage / build) ----
export function evoPathId() { return state.evoPath || null; }
export function evoPathData() { return state.evoPath ? PATH_BY_ID[state.evoPath] : null; }
export function chooseEvoPath(id) {
  if (!PATH_BY_ID[id]) return false;
  state.evoPath = id;
  state.pathPrompted = true;
  return true;
}
// Should we prompt the player to pick a path? (reached the Colony stage, none chosen)
export function pathChoiceDue() {
  return !state.evoPath && stageForRank(state.evolutionRank || 0) >= 1;
}

// ---- Automation Bay (drones + automators + factory) ----
export function machineLevel(id) { return (state.machines && state.machines[id]) || 0; }
export function machineCost(id) {
  const m = LEVELED_BY_ID[id];
  if (!m) return Infinity;
  return Math.ceil(m.baseCost * Math.pow(m.costMult, machineLevel(id)));
}
export function buyMachine(id) {
  const cost = machineCost(id);
  if (!isFinite(cost) || (state.biomass || 0) < cost) return false;
  state.biomass -= cost;
  state.machines = state.machines || {};
  state.machines[id] = machineLevel(id) + 1;
  return true;
}
// total auto-clicks/sec from all drones
export function dronesClicksPerSec() {
  let cps = 0;
  for (const d of DRONES) cps += machineLevel(d.id) * d.cps;
  return cps;
}
// biomass/sec the drones generate (auto-clicks × current click power)
export function dronesPerSec() { return dronesClicksPerSec() * effectiveClickPower(); }

// automators (one-time unlock + on/off toggle)
export function automatorOwned(id) { return !!(state.automators && state.automators[id]); }
export function automatorOn(id) {
  return automatorOwned(id) && (state.autoToggles ? state.autoToggles[id] !== false : true);
}
export function buyAutomator(id) {
  const a = AUTOMATOR_BY_ID[id];
  if (!a || automatorOwned(id) || (state.biomass || 0) < a.cost) return false;
  state.biomass -= a.cost;
  state.automators = state.automators || {};
  state.automators[id] = true;
  state.autoToggles = state.autoToggles || {};
  state.autoToggles[id] = true;
  return true;
}
export function toggleAutomator(id) {
  if (!automatorOwned(id)) return false;
  state.autoToggles = state.autoToggles || {};
  state.autoToggles[id] = !automatorOn(id);
  return state.autoToggles[id];
}

// Run every automated machine for `dt` seconds. Returns a small event summary so
// the UI can react (refresh modals / occasional toast). Forager (blooms) is wired
// in main.js where the bloom elements live.
export function tickAutomation(dt) {
  if (!dt || dt <= 0) return null;
  state.machines = state.machines || {};
  const ev = { drone: 0, harvested: 0, claimed: [], surged: false, factory: false };

  // --- drones: auto-click at full click power ---
  const cps = dronesClicksPerSec();
  if (cps > 0) {
    const gain = effectiveClickPower() * cps * dt;
    addBiomass(gain);
    state.autoClicks = (state.autoClicks || 0) + cps * dt;
    ev.drone = gain;
  }

  // --- factory: accumulate fractional output, flush whole units ---
  if (!state.factoryBuf) state.factoryBuf = { reagent: 0, catalyst: 0, mutagen: 0 };
  const buf = state.factoryBuf;
  for (const f of FACTORY) {
    const lvl = machineLevel(f.id);
    if (lvl > 0) buf[f.out] += lvl * f.rate * dt;
  }
  if (buf.reagent >= 1) {
    const n = Math.floor(buf.reagent); buf.reagent -= n;
    const M = initMarket(); M.held.enzyme = (M.held.enzyme || 0) + n; ev.factory = true;
  }
  if (buf.catalyst >= 1) {
    const n = Math.floor(buf.catalyst); buf.catalyst -= n;
    state.catalyst = Math.min(CATALYST_MAX, (state.catalyst || 0) + n); ev.factory = true;
  }
  if (buf.mutagen >= 1) {
    const n = Math.floor(buf.mutagen); buf.mutagen -= n;
    state.mutagen = (state.mutagen || 0) + n; ev.factory = true;
  }

  // --- automators ---
  if (automatorOn("harvester")) {
    const plots = gardenPlots();
    for (let i = 0; i < plots.length; i++) {
      if (gardenMature(i) && harvestPlot(i)) ev.harvested++;
    }
  }
  if (automatorOn("surveyor")) {
    const cands = colonyNodes()
      .filter((n) => n.unlocked && !n.claimed && n.affordable)
      .sort((a, b) => a.node.cost - b.node.cost);
    if (cands.length && claimColonyNode(cands[0].node.id)) ev.claimed.push(cands[0].node.id);
  }
  if (automatorOn("catalyzer") && (state.catalyst || 0) >= CATALYST_MAX) {
    state.catalyst -= CATALYST_MAX;
    addTempBuff({ id: "autosurge", prodMult: 3, durationMs: 15000 });
    ev.surged = true;
  }
  return ev;
}

// ---- Petri Garden (4A) ----
function initGarden() {
  if (!state.garden || !Array.isArray(state.garden.plots)) state.garden = { plots: Array(9).fill(null) };
  return state.garden;
}
export function gardenPlots() { return initGarden().plots; }
export function gardenMature(i) {
  const p = initGarden().plots[i]; if (!p) return false;
  const s = SEED_BY_ID[p.seed]; return s && (Date.now() - p.at) >= s.growMs;
}
export function gardenProgress(i) {
  const p = initGarden().plots[i]; if (!p) return 0;
  const s = SEED_BY_ID[p.seed]; if (!s) return 0;
  return Math.max(0, Math.min(1, (Date.now() - p.at) / s.growMs));
}
export function plantSeed(i, seedId) {
  const g = initGarden();
  if (g.plots[i] || !SEED_BY_ID[seedId]) return false;
  g.plots[i] = { seed: seedId, at: Date.now() };
  return true;
}
export function harvestPlot(i) {
  const g = initGarden();
  if (!gardenMature(i)) return null;
  const seed = SEED_BY_ID[g.plots[i].seed];
  g.plots[i] = null;
  const reward = Math.max(50, Math.floor(productionPerSecond() * 120));
  let mutagen = 0;
  if (Math.random() < 0.2) { state.mutagen = (state.mutagen || 0) + 1; mutagen = 1; }
  state.biomass += reward;
  return { reward, mutagen, seed: seed.name };
}

// ---- Genome Pantheon (4C) ----
export function setPantheonSlot(slotId, geneId) {
  state.pantheon = state.pantheon || {};
  state.pantheon[slotId] = geneId || null;
}

// ---- Symbiote (4D) ----
export function symbioteStage() {
  const fed = (state.symbiote && state.symbiote.fed) || 0;
  let st = 0;
  for (let i = 0; i < SYMBIOTE_THRESH.length; i++) if (fed >= SYMBIOTE_THRESH[i]) st = i;
  return st;
}
export function feedSymbiote() {
  if (!state.symbiote) state.symbiote = { fed: 0, aura: null };
  const cost = Math.floor((state.biomass || 0) * 0.10);
  if (cost < 1) return false;
  state.biomass -= cost;
  state.symbiote.fed = (state.symbiote.fed || 0) + 1;
  return true;
}
export function setSymbioteAura(id) { if (!state.symbiote) state.symbiote = { fed: 0, aura: null }; state.symbiote.aura = id; }

// ---- Reactor (spell pool) ----
const CATALYST_MAX = 100, CATALYST_REGEN_MS = 7000; // +1 per 7s → full ~12 min
export function tickCatalyst() {
  const now = nowSeconds() * 1000;
  if (!state.catalystAt) { state.catalystAt = now; return; }
  const gained = Math.floor((now - state.catalystAt) / CATALYST_REGEN_MS);
  if (gained > 0) {
    state.catalyst = Math.min(CATALYST_MAX, (state.catalyst || 0) + gained);
    state.catalystAt += gained * CATALYST_REGEN_MS;
  }
}
export function catalyst() { return Math.floor(state.catalyst || 0); }
export function catalystMax() { return CATALYST_MAX; }
export function spendCatalyst(n) {
  if ((state.catalyst || 0) < n) return false;
  state.catalyst -= n; return true;
}

// ---- Mutagen (slow currency) + organelle levels ----
const MUTAGEN_GROW_MS = 20 * 60 * 1000; // one ripens every ~20 min (counts offline)
export function tickMutagen() {
  const now = nowSeconds() * 1000;
  if (!state.mutagenStart) { state.mutagenStart = now; return 0; }
  const ripe = Math.floor((now - state.mutagenStart) / MUTAGEN_GROW_MS);
  if (ripe > 0) { state.mutagen = (state.mutagen || 0) + ripe; state.mutagenStart += ripe * MUTAGEN_GROW_MS; return ripe; }
  return 0;
}
export function mutagenProgress() {
  const now = nowSeconds() * 1000;
  if (!state.mutagenStart) return 0;
  return Math.max(0, Math.min(1, ((now - state.mutagenStart) % MUTAGEN_GROW_MS) / MUTAGEN_GROW_MS));
}
export function genLevel(id) { return (state.genLevels && state.genLevels[id]) || 0; }
export function genLevelCost(id) { return genLevel(id) + 1; } // Mutagen to reach the next level
export function levelUpOrganelle(id) {
  const cost = genLevelCost(id);
  if ((state.mutagen || 0) < cost) return false;
  state.mutagen -= cost;
  state.genLevels = state.genLevels || {};
  state.genLevels[id] = genLevel(id) + 1;
  return true;
}

// ---- Transcend (3rd prestige layer): reset Genome/Species -> Helix ----
export function helixNodeLevel(id) { return hLvl(state, id); }
export function helixNodeCost(id) { return hCost(state, id); }
export function hasHelix(id) { return hLvl(state, id) > 0; }
export function buyHelixNode(id) {
  const c = hCost(state, id);
  if (!isFinite(c) || (state.helix || 0) < c) return false;
  state.helix -= c;
  state.helixNodes = state.helixNodes || {};
  state.helixNodes[id] = (state.helixNodes[id] || 0) + 1;
  return true;
}
export function transcendGain() {
  const base = Math.floor((state.speciations || 0) / 2) + Math.floor(Math.log10((state.genome || 0) + 1));
  return Math.max(0, Math.floor(base * (1 + 0.20 * hLvl(state, "density"))));
}
export function canTranscend() { return (state.speciations || 0) >= 8 && transcendGain() >= 1; }
export function doTranscend() {
  if (!canTranscend()) return null;
  const gain = transcendGain();
  state.helix = (state.helix || 0) + gain;
  state.transcensions = (state.transcensions || 0) + 1;
  addEvolutionRank(10); // permanent — the biggest leap of all
  // wipe the two layers below (Helix + helixNodes + cosmetics/achievements persist)
  const hs = hLvl(state, "headstart");
  state.genome = 2 * hs;
  state.species = []; state.equippedSpecies = [];
  state.genomeNodes = {};
  state.speciations = 0;
  state.evolutionPoints = 0; state.mutations = []; state.prestiges = 0;
  state.lastMilestoneExp = 2;
  for (const g of GENERATORS) state.owned[g.id] = 0;
  state.biomass = startBoostBiomass() + (hs > 0 ? Math.pow(10, hs) : 0);
  state.runBiomass = state.biomass;
  state.instabilityResolved = false; state.embraceChaos = false; state.stabilizeBonus = 1;
  state.upgrades = {};
  if (state.market) state.market.held = {};
  return { gain };
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

// Is a Digest surge currently running? (used to block re-spamming it)
export function digestActive() {
  const now = Date.now();
  return (state.tempBuffs || []).some((b) => b.id === "digest" && b.expiresAt > now);
}
// Digest: spend 40% of biomass for a temporary production surge (an opt-in sink).
// CANNOT be re-triggered while a surge is active — otherwise stacking it with a
// Mitogen Frenzy lets production out-earn the 40% cost instantly and you spam it
// forever. One surge at a time; wait for it to finish.
export function doDigest() {
  if (digestActive()) return null;
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

// Sell one back for 50% of what the last one cost (re-spec / fix mistakes).
export function sellGenerator(genId) {
  const owned = state.owned[genId] || 0;
  if (owned <= 0) return 0;
  const g = GEN_BY_ID[genId];
  const refund = Math.floor(0.5 * g.baseCost * Math.pow(g.costGrowth, owned - 1));
  state.owned[genId] = owned - 1;
  state.biomass += refund;
  return refund;
}

export function buy(genId) {
  if (challengeRule() === "noGenerators") return false; // Parasite challenge
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
  const fragile = challengeRule() === "fastWall" ? 0.4 : 1; // Fragile Genome challenge
  return TUN.prodSoftcap.base * wall * fragile;
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
// A click yields a flat base PLUS a share of current production/sec, so tapping
// the cell stays meaningful at every scale (passive multipliers can't drown it
// out). Both halves scale with clickMult, so click upgrades/frenzies still bite.
export function effectiveClickPower() {
  const share = (TUN.click && TUN.click.prodShare) || 0;
  // clickMult amplifies only the FLAT base click. The production-share is a flat
  // % of /sec NOT multiplied by clickMult — otherwise a huge click multiplier
  // makes a single click (and every auto-click) worth many seconds of production,
  // and auto-clickers end up out-earning passive production by orders of magnitude.
  return state.clickPower * getModifiers().clickMult + productionPerSecond() * share;
}

// A manual click. critMult multiplies the payout (combo "critical extraction").
export function click(critMult = 1) {
  if (challengeRule() === "noClick") return 0; // Pacifist challenge
  const gain = effectiveClickPower() * critMult;
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
  addEvolutionRank(1); // permanent — each Evolve pushes the creature forward
  // wipe the run; keep all meta (EP, mutations). Yolk Reserve gives a head start.
  state.biomass = startBoostBiomass();
  state.runBiomass = state.biomass;
  for (const g of GENERATORS) state.owned[g.id] = 0;
  state.instabilityResolved = false; state.embraceChaos = false; state.stabilizeBonus = 1;
  return gain;
}

// ---- Speciate (2nd prestige layer): snapshot build -> Species card + Genome ----
export function draftSize() {
  return 3 + nodeLevel(state, "draft_4") + (currentWeekly().draft || 0);
}

// ---- weekly event (rotating global modifier, deterministic by week) ----
const WEEKLY = [
  { id: "bounty", name: "Bountiful Week", desc: "+50% Evolution Points", ep: 1.5 },
  { id: "frenzy", name: "Frenzy Week", desc: "×1.5 production", prod: 1.5 },
  { id: "mutagenic", name: "Mutagenic Week", desc: "+1 mutation draft card", draft: 1 },
  { id: "feral", name: "Feral Week", desc: "×2 click power", click: 2 },
];
export function currentWeekly() {
  const wk = Math.floor(Date.now() / (7 * 864e5));
  return WEEKLY[wk % WEEKLY.length];
}

// ---- daily seed run (everyone gets the same drafts that day) ----
export function startDailyRun() {
  setDraftSeed(todaySeed());
  state.dailyActive = true;
  state.evolutionPoints = 0; state.mutations = []; state.prestiges = 0;
  state.biomass = 0; state.runBiomass = 0; state.lastMilestoneExp = 2;
  state.instabilityResolved = false; state.embraceChaos = false; state.stabilizeBonus = 1;
  for (const g of GENERATORS) state.owned[g.id] = 0;
}
export function endDailyRun() {
  state.dailyBest = state.dailyBest || {};
  const seed = String(todaySeed());
  state.dailyBest[seed] = Math.max(state.dailyBest[seed] || 0, state.runBiomass || 0);
  setDraftSeed(null);
  state.dailyActive = false;
}
export function dailyBestToday() {
  state.dailyBest = state.dailyBest || {};
  return state.dailyBest[String(todaySeed())] || 0;
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
  // Speciate is a CHOICE you unlock by evolving — never forced by a production cap.
  // Available once you've Evolved enough this lineage and it'd bank real Genome.
  return (state.prestiges || 0) >= 5 && genomeForSpeciate() >= 1;
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
  // declutter: drop worthless empty cards (0 mutations, not equipped) — these
  // come from rushing the wall on generators alone and just flood the lab.
  state.species = (state.species || []).filter(
    (s) => (s.mutations || []).length >= 1 || (state.equippedSpecies || []).includes(s.id));
  // Only BANK a card if the run actually had mutations (otherwise it's a ×1 dud);
  // the card is still returned for the ascension cinematic display.
  const banked = card.mutations.length >= 1;
  if (banked) {
    state.species.push(card);
    // keep only the strongest 30 so the list never becomes unmanageable
    const MAX_SPECIES = 30;
    if (state.species.length > MAX_SPECIES) {
      const equipped = new Set(state.equippedSpecies || []);
      state.species.sort((a, b) => (equipped.has(b.id) - equipped.has(a.id)) || ((b.strength || 1) - (a.strength || 1)));
      state.species = state.species.slice(0, MAX_SPECIES);
      state.equippedSpecies = (state.equippedSpecies || []).filter((id) => state.species.some((s) => s.id === id));
    }
  }
  state.genome = (state.genome || 0) + gain;
  state.speciations = (state.speciations || 0) + 1;
  addEvolutionRank(3); // permanent — a Speciation is a bigger leap than an Evolve
  archiveSpecimen(card); // record this generation in the permanent Museum (after the rank bump)
  // wipe the entire Evolve layer (EP + mutations + generators); Species cards persist
  state.evolutionPoints = 0;
  state.mutations = [];
  state.prestiges = 0;
  state.lastMilestoneExp = 2;
  state.biomass = startBoostBiomass();
  state.runBiomass = state.biomass;
  for (const g of GENERATORS) state.owned[g.id] = 0;
  state.instabilityResolved = false; state.embraceChaos = false; state.stabilizeBonus = 1;
  state.upgrades = {}; // upgrade-store toolkit resets on the big reset
  if (state.market) state.market.held = {}; // market positions don't carry over
  return { card, gain, banked };
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

// ---- challenge runs ----
export function startChallenge(id) {
  if (!CHALLENGE_BY_ID[id]) return false;
  state.challenge = id;
  state.evolutionPoints = 0; state.mutations = []; state.prestiges = 0;
  state.biomass = 0; state.runBiomass = 0; state.lastMilestoneExp = 2;
  state.instabilityResolved = false; state.embraceChaos = false; state.stabilizeBonus = 1;
  for (const g of GENERATORS) state.owned[g.id] = 0;
  return true;
}
export function abandonChallenge() {
  state.challenge = null;
  state.biomass = 0; state.runBiomass = 0; state.mutations = []; state.evolutionPoints = 0;
  for (const g of GENERATORS) state.owned[g.id] = 0;
}
export function checkChallenge() {
  if (!state.challenge) return null;
  const c = CHALLENGE_BY_ID[state.challenge];
  if (!c) { state.challenge = null; return null; }
  if (state.runBiomass >= c.goal) {
    state.challengesDone = state.challengesDone || {};
    state.challengesDone[c.id] = true;
    grantReroll(c.reward);
    state.challenge = null;
    return c;
  }
  return null;
}
export function currentChallenge() { return state.challenge ? CHALLENGE_BY_ID[state.challenge] : null; }

// ---- ancient fossils (collectibles / museum) ----
const FOSSIL_NAMES = ["Trilobite Husk", "Ammonite Spiral", "Primordial Tooth", "Amber Drop",
  "Stromatolite", "Ancient Spore", "Petrified Eye", "Crystal Vertebra", "Fossil Egg", "Tar-Black Claw"];
export function grantFossil() {
  state.fossils = state.fossils || [];
  const name = FOSSIL_NAMES[(Math.random() * FOSSIL_NAMES.length) | 0];
  if (!state.fossils.includes(name)) { state.fossils.push(name); return name; }
  return null;
}

// ---- biomes (per-run world) ----
export function rollBiome() {
  const total = BIOMES.reduce((s, b) => s + b.weight, 0);
  let r = Math.random() * total;
  let chosen = BIOMES[0];
  for (const b of BIOMES) { r -= b.weight; if (r <= 0) { chosen = b; break; } }
  state.biome = chosen.id;
  return chosen;
}
export function currentBiome() { return BIOME_BY_ID[state.biome] || null; }

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
// seedable RNG so Daily runs draw the same pool for everyone
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let seededRand = null;
export function setDraftSeed(seed) { seededRand = seed != null ? mulberry32(seed | 0) : null; }
export function todaySeed() { return Math.floor(Date.now() / 864e5); } // day number

export function rollDraft(n = 3) {
  const rnd = seededRand || Math.random;
  const weights = { common: 60, rare: 30, legendary: 10 };
  const pool = MUTATIONS.filter((m) => !m.alien);
  const picks = [];
  while (picks.length < n && pool.length > 0) {
    const total = pool.reduce((s, m) => s + weights[m.rarity], 0);
    let r = rnd() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[pool[i].rarity];
      if (r <= 0) { idx = i; break; }
    }
    picks.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  if (rnd() < 0.07 && picks.length) {
    const aliens = MUTATIONS.filter((m) => m.alien);
    const a = aliens[(rnd() * aliens.length) | 0];
    if (a) picks[(rnd() * picks.length) | 0] = a.id;
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

// ---- rerolls + fusion (build-crafting) ----
export function grantReroll(n = 1) { state.rerolls = (state.rerolls || 0) + n; }
export function useReroll() {
  if ((state.rerolls || 0) <= 0) return false;
  state.rerolls -= 1;
  return true;
}

const RW = { common: 1, rare: 2, legendary: 3 };
// Reactor: sacrifice your 3 lowest-rarity mutations for 1 random rarer one (costs Genome).
export function fuseMutations() {
  if (state.mutations.length < 3 || (state.genome || 0) < 2) return null;
  const sorted = [...state.mutations].sort((a, b) => (RW[MUT_BY_ID[a] && MUT_BY_ID[a].rarity] || 1) - (RW[MUT_BY_ID[b] && MUT_BY_ID[b].rarity] || 1));
  for (const id of sorted.slice(0, 3)) {
    const i = state.mutations.indexOf(id);
    if (i >= 0) state.mutations.splice(i, 1);
  }
  state.genome -= 2;
  const pool = MUTATIONS.filter((m) => m.rarity !== "common" && !m.defect);
  const pick = pool[(Math.random() * pool.length) | 0];
  state.mutations.push(pick.id);
  state.discovered[pick.id] = true;
  return pick;
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
