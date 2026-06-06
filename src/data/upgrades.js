// Upgrade Store — the Cookie Clicker engine. A steady stream of one-time
// purchasable upgrades that UNLOCK as you grow (own N of an organelle, or pass a
// lifetime-biomass milestone), each giving a permanent multiplier. They persist
// across Evolve (your lineage toolkit) and reset only on Speciate — so there's
// always a visible "next thing to save up for", which is what makes the buy loop
// feel like a game instead of mindless spamming.

import { GENERATORS } from "./generators.js";

const ROMAN = ["I", "II", "III", "IV", "V"];
// at: own this many of the organelle to unlock · c: cost = baseCost x this
const GEN_TIERS = [
  { n: 10, c: 60 },
  { n: 25, c: 1200 },
  { n: 50, c: 30000 },
  { n: 100, c: 900000 },
  { n: 175, c: 3.5e7 },
];

export const UPGRADES = [];
GENERATORS.forEach((g) => {
  GEN_TIERS.forEach((t, i) => {
    UPGRADES.push({
      id: `${g.id}_x2_${t.n}`,
      name: `${g.name} ${ROMAN[i]}`,
      desc: `${g.name} output ×2.`,
      cond: `Own ${t.n} ${g.name}`,
      cost: Math.ceil(g.baseCost * t.c),
      unlock: { gen: g.id, n: t.n },
      gen: g.id, mult: 2,
    });
  });
});

// click + global upgrades, unlocked by lifetime biomass milestones
UPGRADES.push(
  { id: "click_a", name: "Sharpened Touch", desc: "Click power ×3.", cond: "1K lifetime biomass", cost: 800, unlock: { lifetime: 1e3 }, click: 3 },
  { id: "click_b", name: "Barbed Touch", desc: "Click power ×3.", cond: "1M lifetime biomass", cost: 2e5, unlock: { lifetime: 1e6 }, click: 3 },
  { id: "click_c", name: "Cataclysmic Touch", desc: "Click power ×4.", cond: "1B lifetime biomass", cost: 5e8, unlock: { lifetime: 1e9 }, click: 4 },
  { id: "prod_a", name: "Mitotic Tuning", desc: "ALL production ×2.", cond: "100K lifetime biomass", cost: 5e4, unlock: { lifetime: 1e5 }, prod: 2 },
  { id: "prod_b", name: "Metabolic Overdrive", desc: "ALL production ×2.", cond: "100M lifetime biomass", cost: 5e7, unlock: { lifetime: 1e8 }, prod: 2 },
  { id: "prod_c", name: "Hypermetabolism", desc: "ALL production ×3.", cond: "10B lifetime biomass", cost: 5e9, unlock: { lifetime: 1e10 }, prod: 3 },
);

export const UPG_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
