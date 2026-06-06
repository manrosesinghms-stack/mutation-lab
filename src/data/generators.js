// Organelle (generator) definitions. Data-driven so balancing = editing this file.
// baseCost: first purchase price. costGrowth: multiplier per owned (classic ~1.15).
// baseProduction: biomass/sec each one adds.

export const GENERATORS = [
  {
    id: "ribosome",
    name: "Ribosome",
    desc: "Folds proteins. The humble starter.",
    baseCost: 15,
    costGrowth: 1.15,
    baseProduction: 0.2,
    unlockAt: 0,
  },
  {
    id: "mitochondria",
    name: "Mitochondria",
    desc: "The powerhouse of the cell.",
    baseCost: 120,
    costGrowth: 1.15,
    baseProduction: 1.5,
    unlockAt: 60,
  },
  {
    id: "nucleus",
    name: "Nucleus",
    desc: "Coordinates growth. Big output.",
    baseCost: 1300,
    costGrowth: 1.16,
    baseProduction: 9,
    unlockAt: 700,
  },
  {
    id: "flagellum",
    name: "Flagellum",
    desc: "Thrashing tail. Surprisingly productive.",
    baseCost: 14000,
    costGrowth: 1.17,
    baseProduction: 55,
    unlockAt: 8000,
  },
  {
    id: "vacuole",
    name: "Vacuole",
    desc: "Stores and digests. Industrial scale.",
    baseCost: 200000,
    costGrowth: 1.18,
    baseProduction: 400,
    unlockAt: 120000,
  },
];
