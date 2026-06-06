// Species Tiers — each Speciation ascends the creature to a grander BASE form,
// so a fresh lineage never looks like a restart. A tier sets the body palette +
// material finish AND an orbiting "ascension crown" (glowing shards + halo rings)
// that escalates in grandeur. Equipped cosmetic skins and rare run variants still
// take precedence over the tier palette (player choice / per-run flair).
//
// There are 14 NAMED tiers; beyond that, tiers are synthesized procedurally
// (rotating hue + ever-growing crown) so the look NEVER plateaus, no matter how
// many times you Speciate.

export const SPECIES_TIERS = [
  { name: "Protocell",   skin: { h: 0.42, s: 0.62, l: 0.55, metal: 0.10, rough: 0.32, emi: 0.55 }, crown: 0,  rings: 0, color: 0x66ffcc },
  { name: "Luminark",    skin: { h: 0.50, s: 0.82, l: 0.52, metal: 0.20, rough: 0.30, emi: 1.30 }, crown: 3,  rings: 1, color: 0x39d0c6 },
  { name: "Crystalis",   skin: { h: 0.55, s: 0.45, l: 0.66, metal: 0.60, rough: 0.12, emi: 0.95 }, crown: 5,  rings: 1, color: 0x9fe8ff },
  { name: "Aurean",      skin: { h: 0.12, s: 0.85, l: 0.58, metal: 0.90, rough: 0.18, emi: 1.05 }, crown: 6,  rings: 2, color: 0xffd76b },
  { name: "Voidborn",    skin: { h: 0.74, s: 0.55, l: 0.32, metal: 0.40, rough: 0.30, emi: 1.45 }, crown: 8,  rings: 2, color: 0xb88cff },
  { name: "Celestial",   skin: { h: 0.62, s: 0.70, l: 0.62, metal: 0.50, rough: 0.16, emi: 1.85 }, crown: 10, rings: 3, color: 0xeaf2ff },
  { name: "Plasmoid",    skin: { h: 0.92, s: 0.85, l: 0.55, metal: 0.35, rough: 0.22, emi: 1.7 },  crown: 12, rings: 3, color: 0xff5ad0 },
  { name: "Emberlord",   skin: { h: 0.035, s: 0.95, l: 0.5, metal: 0.45, rough: 0.28, emi: 1.9 },  crown: 13, rings: 3, color: 0xff7a2a },
  { name: "Verdant God", skin: { h: 0.34, s: 0.85, l: 0.55, metal: 0.25, rough: 0.30, emi: 1.6 },  crown: 14, rings: 4, color: 0x66ff8a },
  { name: "Abyssal",     skin: { h: 0.60, s: 0.80, l: 0.42, metal: 0.55, rough: 0.18, emi: 1.8 },  crown: 16, rings: 4, color: 0x2a8aff },
  { name: "Prismatic",   skin: { h: 0.80, s: 0.70, l: 0.62, metal: 0.65, rough: 0.10, emi: 2.0 },  crown: 17, rings: 4, color: 0xc08aff },
  { name: "Antimatter",  skin: { h: 0.78, s: 0.55, l: 0.74, metal: 0.7,  rough: 0.10, emi: 2.3 },  crown: 18, rings: 5, color: 0xe6c8ff },
  { name: "Singularity", skin: { h: 0.70, s: 0.60, l: 0.18, metal: 0.5,  rough: 0.25, emi: 2.4 },  crown: 20, rings: 5, color: 0x9d6bff },
  { name: "Transcendent",skin: { h: 0.14, s: 0.55, l: 0.78, metal: 0.6,  rough: 0.10, emi: 2.6 },  crown: 22, rings: 6, color: 0xfff2c8 },
];

const EPITHETS = ["Ascendant", "Eternal", "Infinite", "Omega", "Demiurge", "Cosmic Sovereign", "The Unbounded"];

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (k) => { const x = (k + h * 12) % 12; return l - a * Math.max(-1, Math.min(x - 3, Math.min(9 - x, 1))); };
  const to = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (to(f(0)) << 16) | (to(f(8)) << 8) | to(f(4));
}

export function speciesTier(n) {
  n = Math.max(0, n | 0);
  if (n < SPECIES_TIERS.length) return SPECIES_TIERS[n];
  // beyond the named list — keep evolving forever: rotate hue + grow the crown.
  const extra = n - (SPECIES_TIERS.length - 1); // 1, 2, 3, ...
  const h = (0.61 + 0.137 * extra) % 1;
  const name = EPITHETS[(extra - 1) % EPITHETS.length] +
    (extra > EPITHETS.length ? " " + (Math.floor((extra - 1) / EPITHETS.length) + 1) : "");
  const color = hslToHex(h, 0.7, 0.62);
  return {
    name,
    skin: { h, s: 0.7, l: 0.62, metal: 0.6, rough: 0.12, emi: 2.2 },
    crown: Math.min(30, 22 + extra),
    rings: Math.min(7, 6 + Math.floor(extra / 4)),
    color,
  };
}
export function speciesTierColor(n) { return speciesTier(n).color; }
export function tierCount() { return SPECIES_TIERS.length; }
