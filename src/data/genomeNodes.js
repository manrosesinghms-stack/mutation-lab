// Genome node grid — bought with Genome (the Speciate currency). Each node has a
// level; cost scales with level. Effects are read in economy.js / main.js.

export const GENOME_NODES = [
  {
    id: "wall_up",
    name: "Thicker Membrane",
    desc: "+150% production wall (S) per level — the main way past the wall.",
    baseCost: 3,
    costGrowth: 1.8,
    maxLevel: 50,
  },
  {
    id: "equip_slot",
    name: "Lineage Slots",
    desc: "+1 equipped Species slot per level.",
    baseCost: 8,
    costGrowth: 3,
    maxLevel: 4,
  },
  {
    id: "ep_boost",
    name: "Catalyst",
    desc: "+25% Evolution Point gain per level.",
    baseCost: 5,
    costGrowth: 2,
    maxLevel: 20,
  },
  {
    id: "draft_4",
    name: "Wider Draft",
    desc: "Mutation draft shows 4 cards instead of 3.",
    baseCost: 12,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: "auto_gen",
    name: "Mitosis Engine",
    desc: "Auto-buys affordable organelles for you.",
    baseCost: 15,
    costGrowth: 1,
    maxLevel: 1,
  },
  {
    id: "start_boost",
    name: "Yolk Reserve",
    desc: "Start each run with more biomass per level (×10 each).",
    baseCost: 4,
    costGrowth: 2.2,
    maxLevel: 15,
  },
];

export const NODE_BY_ID = Object.fromEntries(GENOME_NODES.map((n) => [n.id, n]));

export function nodeLevel(state, id) {
  return (state.genomeNodes && state.genomeNodes[id]) || 0;
}

export function nodeCost(state, id) {
  const n = NODE_BY_ID[id];
  if (!n) return Infinity;
  const lvl = nodeLevel(state, id);
  if (lvl >= n.maxLevel) return Infinity;
  return Math.ceil(n.baseCost * Math.pow(n.costGrowth, lvl));
}
