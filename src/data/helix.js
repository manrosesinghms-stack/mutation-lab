// Helix — the 3rd prestige currency, earned by Transcending. Spent on a deep,
// PERMANENT meta-tree that persists across every Transcension: the endgame
// engine that makes the climb effectively endless (Cookie-Clicker's prestige
// tree). Most nodes are pure multipliers with high level caps + a couple of
// utility/automation nodes, so there is ALWAYS a next permanent thing to buy.
//
// `mod` (optional) feeds the central modifier stack generically in economy.js:
//   p = +prod per level · c = +click per level · e = +EP per level
// Nodes without `mod` are special (handled where their effect lives).

export const HELIX_NODES = [
  // ---- production lines (short → very long tail) ----
  { id: "memory",     name: "Primordial Memory",  desc: "+30% ALL production, per level.",  base: 1,   mult: 1.55, max: 25, mod: { p: 0.30 } },
  { id: "metabolism", name: "Eternal Metabolism",  desc: "+20% ALL production, per level.",  base: 3,   mult: 1.50, max: 30, mod: { p: 0.20 } },
  { id: "respiration",name: "Deep Respiration",    desc: "+12% ALL production, per level.",  base: 9,   mult: 1.45, max: 40, mod: { p: 0.12 } },
  { id: "celldiv",    name: "Endless Division",    desc: "+8% ALL production, per level.",   base: 30,  mult: 1.40, max: 50, mod: { p: 0.08 } },
  { id: "ancientdna", name: "Ancient DNA",         desc: "+6% ALL production, per level.",   base: 120, mult: 1.38, max: 60, mod: { p: 0.06 } },

  // ---- click lines ----
  { id: "touch",      name: "Eternal Touch",       desc: "+150% click power, per level.",   base: 1,   mult: 1.50, max: 20, mod: { c: 1.5 } },
  { id: "reflex",     name: "Predator Reflex",     desc: "+60% click power, per level.",     base: 4,   mult: 1.48, max: 25, mod: { c: 0.6 } },
  { id: "overclock",  name: "Neural Overclock",    desc: "+25% click power, per level.",     base: 18,  mult: 1.44, max: 35, mod: { c: 0.25 } },

  // ---- prestige-currency lines ----
  { id: "evodrive",   name: "Evolutionary Drive",  desc: "+25% Evolution Points, per level.",base: 4,   mult: 1.6,  max: 20, mod: { e: 0.25 } },
  { id: "selection",  name: "Natural Selection",   desc: "+15% Evolution Points, per level.",base: 14,  mult: 1.5,  max: 25, mod: { e: 0.15 } },

  // ---- compounding capstone ----
  { id: "singularity",name: "Primordial Singularity", desc: "ALL production ×(1 + 3% × every Helix level you own), per level. Rewards a full tree.", base: 250, mult: 2.0, max: 10 },

  // ---- utility / automation (unchanged behaviour) ----
  { id: "density",    name: "Helix Density",       desc: "+20% Helix gained on Transcend, per level.", base: 2,  mult: 1.8, max: 12, per: 0.20 },
  { id: "headstart",  name: "Deep Genome",         desc: "Start each Transcension with bonus Genome + biomass, per level.", base: 2, mult: 1.7, max: 12, per: 2 },
  { id: "autoevolve", name: "Auto-Evolve",         desc: "Automatically Evolve and draft a mutation for you. Idle-friendly.", base: 5,  mult: 1, max: 1 },
  { id: "autospec",   name: "Auto-Speciate",       desc: "Automatically Speciate the moment you hit the wall.", base: 14, mult: 1, max: 1 },
];

export const HELIX_BY_ID = Object.fromEntries(HELIX_NODES.map((n) => [n.id, n]));

export function helixLevel(state, id) { return (state.helixNodes && state.helixNodes[id]) || 0; }
export function helixCost(state, id) {
  const n = HELIX_BY_ID[id];
  if (!n) return Infinity;
  const lvl = helixLevel(state, id);
  if (lvl >= n.max) return Infinity;
  return Math.ceil(n.base * Math.pow(n.mult, lvl));
}
// Total Helix levels owned across the whole tree (drives the Singularity capstone).
export function helixTotalLevels(state) {
  let t = 0;
  for (const n of HELIX_NODES) t += helixLevel(state, id_(n));
  return t;
}
function id_(n) { return n.id; }
