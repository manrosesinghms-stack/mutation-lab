// Biomes: each run rolls a world that sets the background and buffs a build type.
// buff(mods, partCounts) applies on top of the modifier bag.

export const BIOMES = [
  { id: "ocean", name: "Ocean", background: "abyss", weight: 20,
    desc: "Tentacles thrive — +25% production per tentacle part",
    buff: (m, p) => { m.prodMult *= 1 + 0.25 * (p.tentacle || 0); } },
  { id: "volcanic", name: "Volcanic", background: "ember", weight: 20,
    desc: "Spikes sharpen — +40% click per spike part",
    buff: (m, p) => { m.clickMult *= 1 + 0.4 * (p.spike || 0); } },
  { id: "verdant", name: "Verdant", background: "meadow", weight: 20,
    desc: "Fronds flourish — +30% production per frond part",
    buff: (m, p) => { m.prodMult *= 1 + 0.3 * (p.frond || 0); } },
  { id: "glacial", name: "Glacial", background: "aurora", weight: 20,
    desc: "Slow but rich — +60% Evolution Points",
    buff: (m) => { m.epMult *= 1.6; } },
  { id: "abyssal", name: "Abyssal Trench", background: "cosmos", weight: 15,
    desc: "Eyes awaken — +30% production per eye part",
    buff: (m, p) => { m.prodMult *= 1 + 0.3 * (p.eye || 0); } },
  { id: "voidrift", name: "Void Rift", background: "voidd", weight: 5, rare: true,
    desc: "Reality thins — ×2 ALL production",
    buff: (m) => { m.prodMult *= 2; } },
];

export const BIOME_BY_ID = Object.fromEntries(BIOMES.map((b) => [b.id, b]));
