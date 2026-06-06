// Cosmetic creature skins — change the base body palette + material finish.
// Bought with Genome, equipped in the Genome Lab. Hue-drift from mutations still
// layers on top; rare run variants (Golden/Crystal/Void) override the skin.

export const SKINS = [
  { id: "default", name: "Wild Type", cost: 0, h: 0.42, s: 0.62, l: 0.55, metal: 0.1, rough: 0.32, emi: 0.55 },
  { id: "obsidian", name: "Obsidian", cost: 15, h: 0.72, s: 0.25, l: 0.18, metal: 0.75, rough: 0.2, emi: 0.3 },
  { id: "coral", name: "Coral Reef", cost: 15, h: 0.02, s: 0.7, l: 0.6, metal: 0.05, rough: 0.4, emi: 0.4 },
  { id: "chrome", name: "Chrome", cost: 25, h: 0.55, s: 0.05, l: 0.72, metal: 0.95, rough: 0.12, emi: 0.2 },
  { id: "biolume", name: "Bioluminescent", cost: 25, h: 0.5, s: 0.8, l: 0.5, metal: 0.2, rough: 0.3, emi: 1.5 },
  { id: "magma", name: "Magma", cost: 20, h: 0.04, s: 0.9, l: 0.45, metal: 0.3, rough: 0.45, emi: 1.1 },
  { id: "amethyst", name: "Amethyst", cost: 20, h: 0.78, s: 0.6, l: 0.55, metal: 0.4, rough: 0.2, emi: 0.6 },
];

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));
