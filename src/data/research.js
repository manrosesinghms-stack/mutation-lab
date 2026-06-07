// Organelle Research — Cookie-Clicker-style depth so every organelle stays
// relevant for the whole run. Tiers AUTO-UNLOCK at ownership milestones (no new
// currency), each granting a permanent ×mult to that organelle AND renaming it,
// so the same building keeps escalating: Ribosome → Molecular Forge → Reality
// Compiler. Tiers are per-run (tied to owned count) like Cookie Clicker buildings.

// Shared milestone ladder: own N → unlock the next research tier (compounding).
// Tamed from the original 2/2/2/3/3/4/5 (=1440×, which made production explode to
// billions as you bought a few organelles each run) to gentle 1.5× steps. Total
// ~17× fully maxed — a real boost that stays in step with the exponential cost
// curve instead of outrunning it, so the run is a climb, not an instant max.
export const RESEARCH_TIERS = [
  { at: 10,  mult: 1.5 },
  { at: 25,  mult: 1.5 },
  { at: 50,  mult: 1.5 },
  { at: 100, mult: 1.5 },
  { at: 200, mult: 1.5 },
  { at: 350, mult: 1.5 },
  { at: 600, mult: 1.5 },
];
// total multiplier if all 7 tiers unlocked: 1.5^7 ≈ 17×

// Per-organelle escalating names. Index 0 = base; one extra name per unlocked tier
// (8 entries = base + 7 tiers). The organelle's row shows the highest unlocked name.
export const ORG_NAMES = {
  ribosome:     ["Ribosome", "Protein Folder", "Synthetic Translator", "Molecular Forge", "Peptide Engine", "Quantum Protein Printer", "Reality Compiler", "Genesis Loom"],
  mitochondria: ["Mitochondria", "Enhanced Mitochondria", "Bioreactor", "Fusion Core", "Plasma Furnace", "Stellar Engine", "Singularity Reactor", "Heart of a Sun"],
  nucleus:      ["Nucleus", "Command Nucleus", "Gene Director", "Master Genome", "Sovereign Core", "Architect Mind", "Worldseed Nucleus", "The First Cell"],
  flagellum:    ["Flagellum", "Twin Flagella", "Propulsion Array", "Hyperdrive Tail", "Warp Cilia", "Slipstream Engine", "Dimensional Oar", "Tideturner"],
  vacuole:      ["Vacuole", "Storage Vacuole", "Industrial Vault", "Mega-Cistern", "Abyssal Reservoir", "Bottomless Maw", "Pocket Dimension", "Hungering Void"],
  lysosome:     ["Lysosome", "Acid Lysosome", "Recycler", "Digestion Plant", "Matter Reclaimer", "Entropy Furnace", "Unmaker", "Worldgut"],
  chloroplast:  ["Chloroplast", "Solar Chloroplast", "Photofarm", "Light Reactor", "Photon Loom", "Starlight Harvester", "Dyson Bloom", "Galaxy Garden"],
  golgi:        ["Golgi Body", "Refined Golgi", "Packaging Plant", "Logistics Hub", "Quantum Courier", "Omni-Assembler", "Fabrication Spire", "Maker of Worlds"],
  centriole:    ["Centriole", "Spindle Centriole", "Mitotic Engine", "Division Core", "Cloning Forge", "Self-Replicator", "Swarm Womb", "Legion Nexus"],
  nucleolus:    ["Nucleolus", "Dense Nucleolus", "Ribogenesis Core", "Transcription Sun", "Codex Engine", "Living Library", "Akashic Core", "Source Code"],
};
