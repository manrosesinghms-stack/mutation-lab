// Reactor spells (4B). Effects are applied in main.js by id; cost is in catalyst.
export const SPELLS = [
  { id: "bloom", name: "Conjure Bloom", desc: "Spawn a Mitogen Bloom right now.", cost: 25 },
  { id: "biome", name: "Shift Biome", desc: "Re-roll this run's biome.", cost: 20 },
  { id: "surge", name: "Flash Surge", desc: "×5 production for 20s.", cost: 40 },
  { id: "overcharge", name: "Overcharge", desc: "Instant biomass — ~5 minutes of income.", cost: 60 },
  { id: "forced", name: "Forced Evolution", desc: "Conjure a free mutation draft.", cost: 85 },
];
