// Ancestral genes for the Genome Pantheon (4C) + Symbiote auras (4D).
// Each gene/aura is a passive multiplier delta (prod / click as fractions).

export const ANCESTRAL_GENES = [
  { id: "forebear",  name: "Forebear",  desc: "+25% production",            prod: 0.25, click: 0 },
  { id: "predator",  name: "Predator",  desc: "+60% click power",           prod: 0,    click: 0.60 },
  { id: "symbiont",  name: "Symbiont",  desc: "+15% production & click",     prod: 0.15, click: 0.15 },
  { id: "mutator",   name: "Mutator",   desc: "+30% production",             prod: 0.30, click: 0 },
  { id: "ancient",   name: "Ancient",   desc: "+45% production, −10% click", prod: 0.45, click: -0.10 },
  { id: "swift",     name: "Swift",     desc: "+90% click power",            prod: 0,    click: 0.90 },
];
export const GENE_BY_ID = Object.fromEntries(ANCESTRAL_GENES.map((g) => [g.id, g]));
// three slots, increasing potency (multiplies the gene's delta)
export const PANTHEON_SLOTS = [
  { id: "minor", name: "Minor", weight: 0.5 },
  { id: "major", name: "Major", weight: 1.0 },
  { id: "apex",  name: "Apex",  weight: 1.6 },
];

export const SYMBIOTE_STAGES = ["Larva", "Juvenile", "Adult", "Apex", "Eternal"];
// fed-count thresholds for each stage index
export const SYMBIOTE_THRESH = [0, 5, 15, 30, 60];
export const SYMBIOTE_AURAS = [
  { id: "voracious", name: "Voracious", desc: "+25% production",  prod: 0.25, click: 0,    minStage: 1 },
  { id: "sharp",     name: "Sharp",     desc: "+75% click power", prod: 0,    click: 0.75, minStage: 1 },
  { id: "radiant",   name: "Radiant",   desc: "+50% production",  prod: 0.50, click: 0,    minStage: 3 },
  { id: "ascendant", name: "Ascendant", desc: "+40% prod & click",prod: 0.40, click: 0.40, minStage: 4 },
];
export const AURA_BY_ID = Object.fromEntries(SYMBIOTE_AURAS.map((a) => [a.id, a]));
