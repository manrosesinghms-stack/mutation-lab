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
    genomeCapBonus: 1,     // raises the production softcap S (bought with Genome)
    tempBuffs: [],         // active temporary buffs (blooms/abilities); Phase 3
    // --- Speciate layer (2nd prestige; persists across Evolve AND Speciate) ---
    genome: 0,             // spendable meta-currency from Speciate
    species: [],           // banked Species cards: {id,name,mutations,parts,strength}
    equippedSpecies: [],   // ids of currently-equipped species (capped by nodes)
    genomeNodes: {},       // { nodeId: level } purchased node grid
    speciations: 0,        // how many times Speciated
    // --- Transcend layer (3rd prestige; persists across everything) ---
    helix: 0,              // Helix meta-currency from Transcending
    transcensions: 0,      // how many times Transcended
    helixNodes: {},        // { nodeId: level } purchased Helix meta-tree
    catalyst: 60,          // Reactor spell pool (regenerates over time)
    catalystAt: 0,         // ms timestamp basis for catalyst regen
    pantheon: {},          // { slot: geneId } slotted ancestral genes
    symbiote: { fed: 0, aura: null }, // companion: total fed + chosen aura
    season: "none",        // active seasonal event id
    aberration: false,     // Aberration mode (grandmapocalypse) — risk/reward toggle
    colony: {},            // { nodeId: true } claimed Colonization Map nodes
    machines: {},          // { machineId: level } Automation Bay drones + factory
    automators: {},        // { automatorId: true } owned automation modules
    autoToggles: {},       // { automatorId: bool } per-automator on/off
    factoryBuf: { reagent: 0, catalyst: 0, mutagen: 0 }, // fractional factory output carry
    autoClicks: 0,         // lifetime auto-clicks performed by drones (stats)
    garden: { plots: [null, null, null, null, null, null, null, null, null] }, // Petri Garden
    gardenStrains: {},     // discovered rare garden strains (collection)
    mutagen: 0,            // slow-growing rare currency (Sugar-Lump analog)
    mutagenStart: 0,       // ms timestamp the current Mutagen began ripening
    genLevels: {},         // { genId: level } organelle levels bought with Mutagen
    upgrades: {},          // { upgradeId: true } purchased store upgrades (reset on Speciate)
    splices: {},           // { hybridKey: true } discovered Gene Splicer hybrids
    spliceReadyAt: 0,      // timestamp the Gene Splicer is next usable
    rerolls: 0,            // draft reroll tokens
    challenge: null,       // active challenge id
    challengesDone: {},    // completed challenges
    fossils: [],           // collected ancient fossils (museum)
    dailyActive: false,    // currently in a daily seed run
    dailyBest: {},         // { daySeed: bestRunBiomass }
    // --- local analytics ---
    playSeconds: 0,        // total time played
    totalClicks: 0,        // lifetime clicks
    skin: "default",       // equipped cosmetic skin
    autoBuyOn: true,       // Mitosis Engine auto-buy toggle (pause to save up)
    skinsOwned: { default: true }, // purchased skins
    musicVolume: 0.5,      // 0..1 ambient music volume
    musicTrack: "lofi",    // selected music theme
    background: "aurora",  // selected animated background
    variant: null,         // rare run variant: golden | crystal | void
    variantsSeen: {},      // which rare variants you've ever rolled
    biome: null,           // per-run biome id
    instabilityResolved: false, // resolved the genetic-instability event this run
    embraceChaos: false,   // chose chaos (random mutations keep coming)
    stabilizeBonus: 1,     // production bonus from stabilizing instability (per run)
    shake: "subtle",       // screen shake: off | subtle | full
    reduceMotion: false,   // disable creature tremble + extra motion
    namingStyle: "scientific", // creature name style: scientific | cute | eldritch
    seenHelp: false,       // shown the How-to-Play once
    seenBloomHint: false,  // shown the first-bloom hint once
    achievements: {},      // { achievementId: true } unlocked set
    discovered: {},        // { mutationId: true } every mutation ever drafted
    discoveredTraits: {},  // { synergyId / set_setId: true } unlocked species traits
    hitWall: false,        // ever reached the production wall (achievement)
    bloomCaught: false,    // ever clicked a Mitogen Bloom (achievement)
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
      species: Array.isArray(data.species) ? data.species : [],
      equippedSpecies: Array.isArray(data.equippedSpecies) ? data.equippedSpecies : [],
      genomeNodes: (data.genomeNodes && typeof data.genomeNodes === "object") ? data.genomeNodes : {},
      genLevels: (data.genLevels && typeof data.genLevels === "object") ? data.genLevels : {},
      helixNodes: (data.helixNodes && typeof data.helixNodes === "object") ? data.helixNodes : {},
      upgrades: (data.upgrades && typeof data.upgrades === "object") ? data.upgrades : {},
      splices: (data.splices && typeof data.splices === "object") ? data.splices : {},
      achievements: (data.achievements && typeof data.achievements === "object") ? data.achievements : {},
      discovered: (data.discovered && typeof data.discovered === "object") ? data.discovered : {},
      discoveredTraits: (data.discoveredTraits && typeof data.discoveredTraits === "object") ? data.discoveredTraits : {},
      challengesDone: (data.challengesDone && typeof data.challengesDone === "object") ? data.challengesDone : {},
      fossils: Array.isArray(data.fossils) ? data.fossils : [],
      skinsOwned: (data.skinsOwned && typeof data.skinsOwned === "object") ? data.skinsOwned : { default: true },
      machines: (data.machines && typeof data.machines === "object") ? data.machines : {},
      automators: (data.automators && typeof data.automators === "object") ? data.automators : {},
      autoToggles: (data.autoToggles && typeof data.autoToggles === "object") ? data.autoToggles : {},
      factoryBuf: (data.factoryBuf && typeof data.factoryBuf === "object") ? data.factoryBuf : { reagent: 0, catalyst: 0, mutagen: 0 },
    };
    // for an existing big save, start milestones at the current tier so we don't
    // dump a backlog of dings on load
    if (data.lastMilestoneExp === undefined) {
      merged.lastMilestoneExp = Math.max(2, Math.floor(Math.log10((merged.lifetimeBiomass || 0) + 1)));
    }
    // declutter: drop worthless empty Species cards (0 mutations, not equipped)
    // that pile up from rushing the wall on generators alone, then cap the list.
    const eq = new Set(merged.equippedSpecies);
    merged.species = merged.species.filter((s) => s && ((s.mutations || []).length >= 1 || eq.has(s.id)));
    if (merged.species.length > 30) {
      merged.species.sort((a, b) => (eq.has(b.id) - eq.has(a.id)) || ((b.strength || 1) - (a.strength || 1)));
      merged.species = merged.species.slice(0, 30);
      merged.equippedSpecies = merged.equippedSpecies.filter((id) => merged.species.some((s) => s.id === id));
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
