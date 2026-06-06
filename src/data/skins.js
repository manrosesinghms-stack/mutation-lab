// Cosmetic creature skins — change the base body palette + material finish.
// Bought with Genome, equipped in the Genome Lab. Hue-drift from mutations still
// layers on top; rare run variants (Golden/Crystal/Void) override the skin.

export const SKINS = [
  { id: "default", name: "Wild Type", cost: 0, h: 0.42, s: 0.62, l: 0.55, metal: 0.1, rough: 0.32, emi: 0.55 },
  { id: "obsidian", name: "Obsidian", cost: 15, h: 0.72, s: 0.25, l: 0.18, metal: 0.75, rough: 0.2, emi: 0.3 },
  { id: "coral", name: "Coral Reef", cost: 15, h: 0.02, s: 0.7, l: 0.6, metal: 0.05, rough: 0.4, emi: 0.4 },
  { id: "chrome", name: "Chrome", cost: 25, h: 0.55, s: 0.05, l: 0.72, metal: 0.95, rough: 0.12, emi: 0.2 },
  { id: "biolume", name: "Bioluminescent", cost: 25, h: 0.5, s: 0.8, l: 0.5, metal: 0.2, rough: 0.3, emi: 1.5, anim: "pulse" },
  { id: "magma", name: "Magma", cost: 20, h: 0.04, s: 0.9, l: 0.45, metal: 0.3, rough: 0.45, emi: 1.1 },
  { id: "amethyst", name: "Amethyst", cost: 20, h: 0.78, s: 0.6, l: 0.55, metal: 0.4, rough: 0.2, emi: 0.6 },
  { id: "crystal", name: "Crystal", cost: 30, h: 0.54, s: 0.5, l: 0.7, metal: 0.55, rough: 0.07, emi: 0.7, anim: "shimmer" },
  { id: "molten", name: "Molten", cost: 30, h: 0.035, s: 0.95, l: 0.42, metal: 0.2, rough: 0.5, emi: 1.7, anim: "molten" },
  { id: "galaxy", name: "Galaxy", cost: 40, h: 0.72, s: 0.7, l: 0.42, metal: 0.45, rough: 0.22, emi: 1.3, anim: "galaxy" },
  { id: "toxic", name: "Toxic", cost: 25, h: 0.28, s: 0.95, l: 0.5, metal: 0.15, rough: 0.35, emi: 1.5, anim: "pulse" },
  { id: "gold", name: "Gold", cost: 35, h: 0.13, s: 0.85, l: 0.6, metal: 0.95, rough: 0.15, emi: 0.4 },
];

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));
