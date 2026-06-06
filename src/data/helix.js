// Helix — the 3rd prestige currency, earned by Transcending (resetting the whole
// Genome/Species layer). Spent on a permanent meta-tree that persists across every
// Transcension: flat boosts to all layers + idle automation. This is the endgame
// ladder that gives resets meaning again once you've maxed the Genome Lab.

export const HELIX_NODES = [
  { id: "memory",    name: "Primordial Memory", desc: "+30% ALL production, permanently, per level.", base: 1,  mult: 1.55, max: 25, per: 0.30 },
  { id: "touch",     name: "Eternal Touch",     desc: "+150% click power, permanently, per level.",   base: 1,  mult: 1.5,  max: 20, per: 1.5 },
  { id: "density",   name: "Helix Density",     desc: "+20% Helix gained on Transcend, per level.",    base: 2,  mult: 1.8,  max: 12, per: 0.20 },
  { id: "headstart", name: "Deep Genome",       desc: "Start each Transcension with bonus Genome + biomass, per level.", base: 2, mult: 1.7, max: 12, per: 2 },
  { id: "autoevolve",name: "Auto-Evolve",       desc: "Automatically Evolve and draft a mutation for you. Idle-friendly.", base: 5,  mult: 1, max: 1 },
  { id: "autospec",  name: "Auto-Speciate",     desc: "Automatically Speciate the moment you hit the wall.", base: 14, mult: 1, max: 1 },
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
