// The Automation Bay — "machines that work for you" (Cookie-Clicker-style idle
// automation). Three tracks:
//   DRONES     : auto-click the cell at your full click power, forever
//   AUTOMATORS : one-time unlocks that run your OTHER systems hands-free
//   FACTORY    : a background production chain into rare currencies

// Drones & factory machines level up (cost grows per level).
export const DRONES = [
  { id: "mitobot",  name: "Mitobot",         baseCost: 1e3,  costMult: 1.17, cps: 0.5, desc: "A tiny arm that taps the cell. +0.5 auto-clicks/sec per level." },
  { id: "splitter", name: "Splitter Arm",    baseCost: 4e5,  costMult: 1.19, cps: 1.5, desc: "Twin servos tap faster. +1.5 auto-clicks/sec per level." },
  { id: "swarm",    name: "Swarm Node",      baseCost: 3e8,  costMult: 1.21, cps: 4,   desc: "Coordinates a nanobot cluster. +4 auto-clicks/sec per level." },
  { id: "overlord", name: "Cilia Overlord",  baseCost: 2e12, costMult: 1.24, cps: 12,  desc: "Industrial auto-tapper. +12 auto-clicks/sec per level." },
];

// Automators are one-time purchases; once owned a toggle controls whether they run.
export const AUTOMATORS = [
  { id: "harvester", name: "Auto-Harvester",   cost: 5e6,  icon: "🌱", desc: "Reaps ripe Petri Garden plots the moment they mature." },
  { id: "forager",   name: "Bloom Forager",    cost: 8e7,  icon: "✨", desc: "Snatches Mitogen Blooms the instant they appear." },
  { id: "catalyzer", name: "Auto-Catalyzer",   cost: 5e9,  icon: "🔬", desc: "Fires a Reactor surge (×3 prod, 15s) whenever the catalyst pool fills." },
  { id: "surveyor",  name: "Colony Surveyor",  cost: 5e11, icon: "🗺️", desc: "Claims the cheapest affordable frontier node. Toggle OFF to save up for a big one." },
];

// Factory machines convert biomass into rare currencies over time.
export const FACTORY = [
  { id: "extractor", name: "Reagent Extractor", baseCost: 1e7,  costMult: 1.20, out: "reagent",  rate: 0.06,   unit: "Enzymes/sec",  desc: "Refines biomass into market reagents (Enzymes)." },
  { id: "refinery",  name: "Catalyst Refinery", baseCost: 8e9,  costMult: 1.22, out: "catalyst", rate: 0.025,  unit: "catalyst/sec", desc: "Tops up your Reactor catalyst pool." },
  { id: "incubator", name: "Mutagen Incubator", baseCost: 8e11, costMult: 1.25, out: "mutagen",  rate: 0.0006, unit: "mutagen/hr·lvl", desc: "Cultures rare Mutagen continuously (counts offline)." },
];

export const DRONE_BY_ID = Object.fromEntries(DRONES.map((d) => [d.id, d]));
export const AUTOMATOR_BY_ID = Object.fromEntries(AUTOMATORS.map((a) => [a.id, a]));
export const FACTORY_BY_ID = Object.fromEntries(FACTORY.map((f) => [f.id, f]));
export const LEVELED_BY_ID = { ...DRONE_BY_ID, ...FACTORY_BY_ID };
