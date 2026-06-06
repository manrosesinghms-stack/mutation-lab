// Mutation library. Each mutation has a declarative `effect(mods, info)` that
// mutates a modifier bag. Functions live here in code (never serialized);
// state only stores mutation IDs. `part` (optional) = the 3D body part it grows.
//
// mods = { clickMult, prodMult, epMult, genMult:{genId:mult} }
// info = { counts:{id:n}, totalMutations, totalGenerators }

export const RARITY = {
  common:    { weight: 60, color: "#9fb3c8", label: "Common" },
  rare:      { weight: 30, color: "#56a0ff", label: "Rare" },
  legendary: { weight: 10, color: "#ffb13d", label: "Legendary" },
};

export const MUTATIONS = [
  // ---- common ----
  { id: "hyperactive", name: "Hyperactive Cytoplasm", rarity: "common",
    desc: "×2 click power",
    effect: (m) => { m.clickMult *= 2; } },
  { id: "membrane", name: "Efficient Membrane", rarity: "common",
    desc: "×1.5 all production",
    effect: (m) => { m.prodMult *= 1.5; } },
  { id: "ribo_cluster", name: "Ribosome Cluster", rarity: "common",
    desc: "Ribosomes ×3",
    effect: (m) => { m.genMult.ribosome = (m.genMult.ribosome || 1) * 3; } },
  { id: "twitch", name: "Twitch Fibers", rarity: "common",
    desc: "×1.4 click power & ×1.2 production",
    effect: (m) => { m.clickMult *= 1.4; m.prodMult *= 1.2; } },

  // ---- rare ----
  { id: "mito_frenzy", name: "Mitotic Frenzy", rarity: "rare",
    desc: "×2 all production",
    effect: (m) => { m.prodMult *= 2; } },
  { id: "symbiosis", name: "Symbiosis", rarity: "rare",
    desc: "+8% production per mutation owned",
    effect: (m, i) => { m.prodMult *= 1 + 0.08 * i.totalMutations; } },
  { id: "greedy_vacuole", name: "Greedy Vacuoles", rarity: "rare",
    desc: "Vacuoles ×6, but click ×0.5",
    effect: (m) => { m.genMult.vacuole = (m.genMult.vacuole || 1) * 6; m.clickMult *= 0.5; } },
  { id: "photosynth", name: "Photosynthetic", rarity: "rare", part: "frond",
    desc: "×1.75 production & +25% Evolution Points",
    effect: (m) => { m.prodMult *= 1.75; m.epMult *= 1.25; } },
  { id: "spines", name: "Defensive Spines", rarity: "rare", part: "spike",
    desc: "×2.5 production",
    effect: (m) => { m.prodMult *= 2.5; } },
  { id: "tendrils", name: "Grasping Tendrils", rarity: "rare", part: "tentacle",
    desc: "×2 production & ×1.5 click",
    effect: (m) => { m.prodMult *= 2; m.clickMult *= 1.5; } },

  // ---- legendary ----
  { id: "third_eye", name: "The Third Eye", rarity: "legendary", part: "eye",
    desc: "×5 click power",
    effect: (m) => { m.clickMult *= 5; } },
  { id: "cancer", name: "Cancerous Growth", rarity: "legendary",
    desc: "×4 all production",
    effect: (m) => { m.prodMult *= 4; } },
  { id: "hivemind", name: "Hivemind", rarity: "legendary",
    desc: "+10% production per organelle owned",
    effect: (m, i) => { m.prodMult *= 1 + 0.10 * i.totalGenerators; } },
  { id: "apex", name: "Apex Organism", rarity: "legendary", part: "jaw",
    desc: "×3 production & ×3 click power",
    effect: (m) => { m.prodMult *= 3; m.clickMult *= 3; } },
];

export const MUT_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));

export function getMutation(id) {
  return MUT_BY_ID[id];
}
