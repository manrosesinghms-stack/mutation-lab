// Species Tiers — each Speciation ascends the creature to a grander BASE form,
// so a fresh lineage never looks like a restart. A tier sets the body palette +
// material finish AND an orbiting "ascension crown" (glowing shards + halo rings)
// that escalates in grandeur. Equipped cosmetic skins and rare run variants still
// take precedence over the tier palette (player choice / per-run flair).

export const SPECIES_TIERS = [
  { name: "Protocell",  skin: { h: 0.42, s: 0.62, l: 0.55, metal: 0.10, rough: 0.32, emi: 0.55 }, crown: 0,  rings: 0, color: 0x66ffcc },
  { name: "Luminark",   skin: { h: 0.50, s: 0.82, l: 0.52, metal: 0.20, rough: 0.30, emi: 1.30 }, crown: 3,  rings: 1, color: 0x39d0c6 },
  { name: "Crystalis",  skin: { h: 0.55, s: 0.45, l: 0.66, metal: 0.60, rough: 0.12, emi: 0.95 }, crown: 5,  rings: 1, color: 0x9fe8ff },
  { name: "Aurean",     skin: { h: 0.12, s: 0.85, l: 0.58, metal: 0.90, rough: 0.18, emi: 1.05 }, crown: 6,  rings: 2, color: 0xffd76b },
  { name: "Voidborn",   skin: { h: 0.74, s: 0.55, l: 0.32, metal: 0.40, rough: 0.30, emi: 1.45 }, crown: 8,  rings: 2, color: 0xb88cff },
  { name: "Celestial",  skin: { h: 0.62, s: 0.70, l: 0.62, metal: 0.50, rough: 0.16, emi: 1.85 }, crown: 11, rings: 3, color: 0xffffff },
];

export function speciesTier(n) {
  return SPECIES_TIERS[Math.min(Math.max(0, n | 0), SPECIES_TIERS.length - 1)];
}
export function speciesTierColor(n) { return speciesTier(n).color; }
