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

// Mutation EDITIONS (Balatro-style): a drafted card can roll a rare edition that
// amplifies its whole effect by `power`. Cursed is the risk/reward card — a big
// amplification with a real drawback (halves click power). Editions are the
// "broken build" chase: a Prismatic or Cursed legendary is a screenshot moment.
export const EDITIONS = {
  foil:      { id: "foil",      name: "Foil",      power: 1.5, weight: 14, color: "#7fd8ff", tag: "✦ FOIL" },
  prismatic: { id: "prismatic", name: "Prismatic", power: 2.2, weight: 5,  color: "#c89bff", tag: "✦✦ PRISMATIC" },
  cursed:    { id: "cursed",    name: "Cursed",    power: 3.0, weight: 4,  color: "#ff5a7a", tag: "☠ CURSED", clickPenalty: 0.5 },
};
// Roll an edition for a drafted card (or null = normal). `rnd` lets the daily
// seed make editions deterministic. ~77% normal, 14% foil, 5% prismatic, 4% cursed.
export function rollEdition(rnd = Math.random) {
  const r = rnd() * 100;
  if (r < 14) return "foil";
  if (r < 19) return "prismatic";
  if (r < 23) return "cursed";
  return null;
}

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

  // ---- expanded pool (Phase 5 content) ----
  // common
  { id: "osmosis", name: "Osmotic Skin", rarity: "common",
    desc: "×1.25 production & ×1.25 click",
    effect: (m) => { m.prodMult *= 1.25; m.clickMult *= 1.25; } },
  { id: "enzyme", name: "Enzyme Boost", rarity: "common",
    desc: "Mitochondria ×3",
    effect: (m) => { m.genMult.mitochondria = (m.genMult.mitochondria || 1) * 3; } },
  { id: "turgor", name: "Turgor Pressure", rarity: "common",
    desc: "×1.4 production",
    effect: (m) => { m.prodMult *= 1.4; } },
  { id: "cilia", name: "Beating Cilia", rarity: "common",
    desc: "×1.6 click power",
    effect: (m) => { m.clickMult *= 1.6; } },

  // rare
  { id: "chloroplast", name: "Chloroplasts", rarity: "rare", part: "frond",
    desc: "×2 production & +20% EP",
    effect: (m) => { m.prodMult *= 2; m.epMult *= 1.2; } },
  { id: "nucleolus", name: "Nucleolus", rarity: "rare",
    desc: "Nucleus ×4",
    effect: (m) => { m.genMult.nucleus = (m.genMult.nucleus || 1) * 4; } },
  { id: "cytoskeleton", name: "Cytoskeleton", rarity: "rare",
    desc: "×1.5 production & ×2 click",
    effect: (m) => { m.prodMult *= 1.5; m.clickMult *= 2; } },
  { id: "parasite", name: "Parasitic Load", rarity: "rare",
    desc: "×3 production, but ×0.7 EP gain",
    effect: (m) => { m.prodMult *= 3; m.epMult *= 0.7; } },
  { id: "biolume", name: "Bioluminescence", rarity: "rare", part: "eye",
    desc: "×2.2 production",
    effect: (m) => { m.prodMult *= 2.2; } },
  { id: "pseudopod", name: "Pseudopods", rarity: "rare", part: "tentacle",
    desc: "×2 production & ×1.4 click",
    effect: (m) => { m.prodMult *= 2; m.clickMult *= 1.4; } },
  { id: "flagella_storm", name: "Flagella Storm", rarity: "rare",
    desc: "Flagella ×5",
    effect: (m) => { m.genMult.flagellum = (m.genMult.flagellum || 1) * 5; } },

  // legendary
  { id: "mito_eve", name: "Mitochondrial Eve", rarity: "legendary",
    desc: "×5 production",
    effect: (m) => { m.prodMult *= 5; } },
  { id: "crystalline", name: "Crystalline Lattice", rarity: "legendary", part: "spike",
    desc: "×4 production & ×2 click",
    effect: (m) => { m.prodMult *= 4; m.clickMult *= 2; } },
  { id: "devourer", name: "The Devourer", rarity: "legendary", part: "jaw",
    desc: "×6 production, but ×0.5 click",
    effect: (m) => { m.prodMult *= 6; m.clickMult *= 0.5; } },
  { id: "eldritch", name: "Eldritch Bloom", rarity: "legendary", part: "eye",
    desc: "×3 production & ×3 click",
    effect: (m) => { m.prodMult *= 3; m.clickMult *= 3; } },
  { id: "hive_queen", name: "Hive Queen", rarity: "legendary",
    desc: "+12% production per organelle owned",
    effect: (m, i) => { m.prodMult *= 1 + 0.12 * i.totalGenerators; } },

  // ---- expanded pool II (30 -> 50) ----
  // common
  { id: "vesicle", name: "Vesicles", rarity: "common", desc: "×1.3 production",
    effect: (m) => { m.prodMult *= 1.3; } },
  { id: "pilus", name: "Pili", rarity: "common", part: "cilia", desc: "×1.5 click power",
    effect: (m) => { m.clickMult *= 1.5; } },
  { id: "glycogen", name: "Glycogen Stores", rarity: "common", desc: "×1.35 production",
    effect: (m) => { m.prodMult *= 1.35; } },
  { id: "antenna", name: "Sensory Antenna", rarity: "common", desc: "×1.4 click power",
    effect: (m) => { m.clickMult *= 1.4; } },
  { id: "ribozyme", name: "Ribozymes", rarity: "common", desc: "Ribosomes ×2",
    effect: (m) => { m.genMult.ribosome = (m.genMult.ribosome || 1) * 2; } },
  { id: "plasmid", name: "Plasmid Swap", rarity: "common", desc: "×1.25 production & ×1.25 click",
    effect: (m) => { m.prodMult *= 1.25; m.clickMult *= 1.25; } },
  { id: "spore", name: "Spore Coat", rarity: "common", desc: "×1.45 production",
    effect: (m) => { m.prodMult *= 1.45; } },

  // rare
  { id: "mitosis", name: "Mitosis", rarity: "rare", part: "body", desc: "×2 production (it splits)",
    effect: (m) => { m.prodMult *= 2; } },
  { id: "chemotaxis", name: "Chemotaxis", rarity: "rare", part: "cilia",
    desc: "×1.8 production & ×1.5 click",
    effect: (m) => { m.prodMult *= 1.8; m.clickMult *= 1.5; } },
  { id: "capsid", name: "Viral Capsid", rarity: "rare", desc: "×2.5 production",
    effect: (m) => { m.prodMult *= 2.5; } },
  { id: "symbiont", name: "Symbiont", rarity: "rare", desc: "+6% production per mutation owned",
    effect: (m, i) => { m.prodMult *= 1 + 0.06 * i.totalMutations; } },
  { id: "electrocyte", name: "Electrocytes", rarity: "rare", desc: "×2 click & ×1.5 production",
    effect: (m) => { m.clickMult *= 2; m.prodMult *= 1.5; } },
  { id: "venom", name: "Venom Glands", rarity: "rare", desc: "×2.8 production, but ×0.8 click",
    effect: (m) => { m.prodMult *= 2.8; m.clickMult *= 0.8; } },
  { id: "gigantism", name: "Gigantism", rarity: "rare", part: "body", desc: "×2.2 production",
    effect: (m) => { m.prodMult *= 2.2; } },

  // legendary
  { id: "twin", name: "Conjoined Twin", rarity: "legendary", part: "body", desc: "×4 production",
    effect: (m) => { m.prodMult *= 4; } },
  { id: "overmind", name: "Overmind", rarity: "legendary", desc: "+15% production per mutation owned",
    effect: (m, i) => { m.prodMult *= 1 + 0.15 * i.totalMutations; } },
  { id: "photophore", name: "Photophores", rarity: "legendary", part: "eye", desc: "×5 production",
    effect: (m) => { m.prodMult *= 5; } },
  { id: "titan", name: "Titan Physiology", rarity: "legendary", desc: "×5 production & ×2 click",
    effect: (m) => { m.prodMult *= 5; m.clickMult *= 2; } },
  { id: "swarm_lord", name: "Swarm Lord", rarity: "legendary", part: "cilia",
    desc: "+9% production per organelle owned",
    effect: (m, i) => { m.prodMult *= 1 + 0.09 * i.totalGenerators; } },
  { id: "omega", name: "Omega Cell", rarity: "legendary", desc: "×4 production & ×4 click",
    effect: (m) => { m.prodMult *= 4; m.clickMult *= 4; } },

  // ---- HABITAT-GATED (chapter content) — each batch only enters the draft pool
  // once you REACH that Journey location, so arriving somewhere makes new cards
  // literally appear. `habitat` = the journey index required. ----
  // 💧 Aquarium (1) — aquatic
  { id: "gill_bloom", name: "Gill Bloom", rarity: "common", part: "frond", habitat: 1,
    desc: "×1.6 production", effect: (m) => { m.prodMult *= 1.6; } },
  { id: "tidal_meta", name: "Tidal Metabolism", rarity: "rare", habitat: 1,
    desc: "×1.5 production & ×1.3 click", effect: (m) => { m.prodMult *= 1.5; m.clickMult *= 1.3; } },
  // 🔬 Laboratory (2) — experimental
  { id: "growth_serum", name: "Growth Serum", rarity: "common", habitat: 2,
    desc: "×1.9 click power", effect: (m) => { m.clickMult *= 1.9; } },
  { id: "gene_splice", name: "Spliced Genome", rarity: "rare", part: "spike", habitat: 2,
    desc: "×2.2 production", effect: (m) => { m.prodMult *= 2.2; } },
  // 🏛️ Research Facility (3) — gene sequencing / specimens
  { id: "dna_sequence", name: "Sequenced DNA", rarity: "rare", habitat: 3,
    desc: "+7% Evolution Points per mutation owned", effect: (m, i) => { m.epMult *= 1 + 0.07 * i.totalMutations; } },
  { id: "specimen_x", name: "Specimen X", rarity: "legendary", part: "eye", habitat: 3,
    desc: "×4 production & ×2 click", effect: (m) => { m.prodMult *= 4; m.clickMult *= 2; } },
  // 🌐 Bio Dome (4) — symbiosis / plants
  { id: "symbiont_root", name: "Symbiont Roots", rarity: "rare", part: "frond", habitat: 4,
    desc: "+8% production per organelle owned", effect: (m, i) => { m.prodMult *= 1 + 0.08 * i.totalGenerators; } },
  { id: "canopy", name: "Photosynthetic Canopy", rarity: "rare", habitat: 4,
    desc: "×2.6 production", effect: (m) => { m.prodMult *= 2.6; } },
  // 🌋 Planetary Ecosystem (5) — geological mega
  { id: "tectonic", name: "Tectonic Core", rarity: "legendary", habitat: 5,
    desc: "×6 production", effect: (m) => { m.prodMult *= 6; } },
  { id: "biosphere", name: "Living Biosphere", rarity: "rare", part: "body", habitat: 5,
    desc: "+10% production per mutation owned", effect: (m, i) => { m.prodMult *= 1 + 0.10 * i.totalMutations; } },
  // 🪐 Living Planet (6) — planet-scale
  { id: "planet_will", name: "Planetary Will", rarity: "legendary", habitat: 6,
    desc: "×7 production & ×3 click", effect: (m) => { m.prodMult *= 7; m.clickMult *= 3; } },
  { id: "storm_meta", name: "Storm Metabolism", rarity: "rare", habitat: 6,
    desc: "×3 production", effect: (m) => { m.prodMult *= 3; } },
  // 🌌 Cosmic Organism (7) — reality distortion
  { id: "reality_fold", name: "Reality Fold", rarity: "legendary", part: "spike", habitat: 7,
    desc: "×9 production", effect: (m) => { m.prodMult *= 9; } },
  { id: "entropy_engine", name: "Entropy Engine", rarity: "legendary", habitat: 7,
    desc: "+30% production per organelle owned", effect: (m, i) => { m.prodMult *= 1 + 0.30 * i.totalGenerators; } },

  // ---- genetic defects (high-risk "cursed" cards) ----
  { id: "blind", name: "Blind", rarity: "rare", defect: true,
    desc: "−90% click power, but ×6 production",
    effect: (m) => { m.clickMult *= 0.1; m.prodMult *= 6; } },
  { id: "glass_cell", name: "Glass Cell", rarity: "rare", defect: true,
    desc: "×6 click power, but −70% production",
    effect: (m) => { m.clickMult *= 6; m.prodMult *= 0.3; } },
  { id: "savant", name: "Idiot Savant", rarity: "legendary", defect: true,
    desc: "×9 production, but −60% Evolution Points",
    effect: (m) => { m.prodMult *= 9; m.epMult *= 0.4; } },
  { id: "tumor", name: "Runaway Tumor", rarity: "legendary", defect: true, part: "body",
    desc: "+20% production per mutation owned, but ×0.3 click",
    effect: (m, i) => { m.prodMult *= 1 + 0.20 * i.totalMutations; m.clickMult *= 0.3; } },

  // ---- ALIEN DNA (rare otherworldly mutations; only appear ~7% of drafts) ----
  { id: "alien_eye", name: "Floating Ocular", rarity: "legendary", alien: true, part: "eye",
    desc: "×6 production & ×2 click", effect: (m) => { m.prodMult *= 6; m.clickMult *= 2; } },
  { id: "alien_core", name: "Gravity Organ", rarity: "legendary", alien: true,
    desc: "×8 production", effect: (m) => { m.prodMult *= 8; } },
  { id: "alien_lattice", name: "Crystal Lattice", rarity: "legendary", alien: true, part: "spike",
    desc: "×5 production & ×5 click", effect: (m) => { m.prodMult *= 5; m.clickMult *= 5; } },
  { id: "alien_swarm", name: "Energy Limbs", rarity: "legendary", alien: true, part: "tentacle",
    desc: "+25% production per organelle owned", effect: (m, i) => { m.prodMult *= 1 + 0.25 * i.totalGenerators; } },
];

export const MUT_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));

export function getMutation(id) {
  return MUT_BY_ID[id];
}
