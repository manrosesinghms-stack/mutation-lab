// Single source of truth + save/load. Keep this dumb; logic lives in economy.js.

import { GENERATORS } from "./data/generators.js";

const SAVE_KEY = "mutationlab.save.v1";

function freshState() {
  const owned = {};
  for (const g of GENERATORS) owned[g.id] = 0;
  return {
    version: 1,
    biomass: 0,
    lifetimeBiomass: 0,    // all-time, never reset (stats)
    runBiomass: 0,         // this run only, resets on prestige -> drives EP
    lastMilestoneExp: 2,   // last power-of-ten lifetime-biomass milestone dinged
    clickPower: 1,
    owned,                 // { generatorId: count }
    // --- meta (persists across prestige) ---
    evolutionPoints: 0,    // prestige currency; EP payoff is softcapped (tunables.js)
    mutations: [],         // array of mutation ids (stacks = repeats), in draft order
    prestiges: 0,
    genomeCapBonus: 1,     // raises the production softcap S (bought with Genome later)
    tempBuffs: [],         // active temporary buffs (blooms/abilities); Phase 3
    lastSeen: nowSeconds(), // for offline progress
  };
}

// Date.now isn't available in some sandboxed contexts; in the browser it's fine.
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export const state = load() || freshState();

export function save() {
  state.lastSeen = nowSeconds();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn("save failed", e);
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // migration-safe: ensure every known generator has a slot
    const base = freshState();
    const merged = {
      ...base,
      ...data,
      owned: { ...base.owned, ...(data.owned || {}) },
      mutations: Array.isArray(data.mutations) ? data.mutations : [],
    };
    // for an existing big save, start milestones at the current tier so we don't
    // dump a backlog of dings on load
    if (data.lastMilestoneExp === undefined) {
      merged.lastMilestoneExp = Math.max(2, Math.floor(Math.log10((merged.lifetimeBiomass || 0) + 1)));
    }
    return merged;
  } catch (e) {
    console.warn("load failed", e);
    return null;
  }
}

export function wipe() {
  localStorage.removeItem(SAVE_KEY);
  const fresh = freshState();
  Object.assign(state, fresh);
}

export { nowSeconds };
