// Petri Garden seeds (4A). Planted in plots; while MATURE they give a passive
// buff. Harvest for a biomass reward (+ a chance at Mutagen / rare strain).
export const SEEDS = [
  { id: "vine",  name: "Boost Vine", emoji: "🌿", growMs: 45000,  prod: 0.04, click: 0 },
  { id: "cap",   name: "Glow Cap",   emoji: "🍄", growMs: 75000,  prod: 0.07, click: 0 },
  { id: "bud",   name: "Spark Bud",  emoji: "✨", growMs: 60000,  prod: 0,    click: 0.10 },
  { id: "coral", name: "Bio-Coral",  emoji: "🪸", growMs: 120000, prod: 0.12, click: 0 },
];
export const SEED_BY_ID = Object.fromEntries(SEEDS.map((s) => [s.id, s]));
export const GARDEN_PLOTS = 9;
