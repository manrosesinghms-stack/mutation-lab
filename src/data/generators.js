// Organelle (generator) definitions. Data-driven so balancing = editing this file.
// baseCost: first purchase price. costGrowth: multiplier per owned.
// baseProduction: biomass/sec each one adds.
//
// costGrowth was steepened (was ~1.15–1.21) so the permanent multiplier stack
// can't trivially buy hundreds of organelles at once — each one climbs fast, so
// there's always a wall just ahead and "maxing a run" takes a real session, not
// seconds. Early game is barely affected (costs only diverge at high owned).

export const GENERATORS = [
  {
    id: "ribosome",
    name: "Ribosome",
    desc: "Folds proteins. The humble starter.",
    baseCost: 15,
    costGrowth: 1.21,
    baseProduction: 0.2,
    unlockAt: 0,
  },
  {
    id: "mitochondria",
    name: "Mitochondria",
    desc: "The powerhouse of the cell.",
    baseCost: 120,
    costGrowth: 1.21,
    baseProduction: 1.5,
    unlockAt: 60,
  },
  {
    id: "nucleus",
    name: "Nucleus",
    desc: "Coordinates growth. Big output.",
    baseCost: 1300,
    costGrowth: 1.22,
    baseProduction: 9,
    unlockAt: 700,
  },
  {
    id: "flagellum",
    name: "Flagellum",
    desc: "Thrashing tail. Surprisingly productive.",
    baseCost: 14000,
    costGrowth: 1.23,
    baseProduction: 55,
    unlockAt: 8000,
  },
  {
    id: "vacuole",
    name: "Vacuole",
    desc: "Stores and digests. Industrial scale.",
    baseCost: 200000,
    costGrowth: 1.24,
    baseProduction: 400,
    unlockAt: 120000,
  },
  {
    id: "lysosome",
    name: "Lysosome",
    desc: "Digests waste back into fuel.",
    baseCost: 3e6,
    costGrowth: 1.25,
    baseProduction: 5000,
    unlockAt: 2e6,
  },
  {
    id: "chloroplast",
    name: "Chloroplast",
    desc: "Harvests light into sugar.",
    baseCost: 5e7,
    costGrowth: 1.25,
    baseProduction: 80000,
    unlockAt: 3e7,
  },
  {
    id: "golgi",
    name: "Golgi Body",
    desc: "Packages proteins at scale.",
    baseCost: 8e8,
    costGrowth: 1.26,
    baseProduction: 1.2e6,
    unlockAt: 5e8,
  },
  {
    id: "centriole",
    name: "Centriole",
    desc: "Spins up rapid division.",
    baseCost: 1.5e10,
    costGrowth: 1.26,
    baseProduction: 2e7,
    unlockAt: 9e9,
  },
  {
    id: "nucleolus",
    name: "Nucleolus",
    desc: "Mass-produces ribosomes. The deep engine.",
    baseCost: 3e11,
    costGrowth: 1.27,
    baseProduction: 3.6e8,
    unlockAt: 2e11,
  },
];
