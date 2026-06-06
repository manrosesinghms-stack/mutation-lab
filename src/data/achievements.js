// Achievements — each grants a small PERMANENT modifier when unlocked, so they
// feed the core loop (not just bragging rights). `check(state)` reads persisted
// fields; unlocked ids live in state.achievements.

import { MUT_BY_ID } from "./mutations.js";
import { GENERATORS } from "./generators.js";

const discCount = (s) => Object.keys(s.discovered || {}).length;
const hasLegendary = (s) =>
  Object.keys(s.discovered || {}).some((id) => MUT_BY_ID[id] && MUT_BY_ID[id].rarity === "legendary");
const ownsAllGens = (s) => GENERATORS.every((g) => (s.owned[g.id] || 0) >= 1);

export const ACHIEVEMENTS = [
  { id: "sprout", name: "Sprout", desc: "Earn 1,000 biomass", prodMult: 1.05,
    check: (s) => s.lifetimeBiomass >= 1e3 },
  { id: "evolve1", name: "First Evolution", desc: "Evolve once", prodMult: 1.05,
    check: (s) => (s.prestiges || 0) >= 1 || (s.speciations || 0) >= 1 },
  { id: "allgens", name: "Full House", desc: "Own all 5 organelles at once", prodMult: 1.05,
    check: (s) => ownsAllGens(s) },
  { id: "wall", name: "Maxed Out", desc: "Hit the Metabolic Pressure wall", prodMult: 1.05,
    check: (s) => !!s.hitWall },
  { id: "legend", name: "Legendary", desc: "Draft a legendary mutation", prodMult: 1.1,
    check: (s) => hasLegendary(s) },
  { id: "disc10", name: "Curious", desc: "Discover 10 mutations", prodMult: 1.05,
    check: (s) => discCount(s) >= 10 },
  { id: "disc25", name: "Geneticist", desc: "Discover 25 mutations", prodMult: 1.1,
    check: (s) => discCount(s) >= 25 },
  { id: "disc50", name: "Completionist", desc: "Discover all 50 mutations", prodMult: 1.25,
    check: (s) => discCount(s) >= 50 },
  { id: "million", name: "Millionaire", desc: "Reach 1e6 lifetime biomass", prodMult: 1.05,
    check: (s) => s.lifetimeBiomass >= 1e6 },
  { id: "billion", name: "Billionaire", desc: "Reach 1e9 lifetime biomass", prodMult: 1.1,
    check: (s) => s.lifetimeBiomass >= 1e9 },
  { id: "speciate1", name: "New Species", desc: "Speciate once", prodMult: 1.1,
    check: (s) => (s.speciations || 0) >= 1 },
  { id: "speciate5", name: "Adaptive Radiation", desc: "Speciate 5 times", prodMult: 1.15,
    check: (s) => (s.speciations || 0) >= 5 },
  { id: "equip", name: "Lineage", desc: "Equip a Species", prodMult: 1.05,
    check: (s) => (s.equippedSpecies || []).length >= 1 },
  { id: "bloom", name: "Bloom Catcher", desc: "Catch a Mitogen Bloom", clickMult: 1.1,
    check: (s) => !!s.bloomCaught },
  { id: "genome50", name: "Gene Bank", desc: "Hold 50 Genome", prodMult: 1.05,
    check: (s) => (s.genome || 0) >= 50 },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
