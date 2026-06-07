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
  { n: 300, c: 2e9 },
  { n: 500, c: 1.5e11 },
];

const GEN_BY_ID = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));

// Cookie Clicker's real signature isn't the math — it's the WIT. Every upgrade
// has a one-liner. Ours escalate from "harmless lab note" to "the thing is awake
// now", which fits the mutating-monster theme and makes upgrades fun to READ and
// screenshot (a free virality lever). Building-tier flavor is indexed by tier.
const TIER_FLAVOR = [
  "It does the thing, but more. We're calling that science.",       // I  (own 10)
  "Turns out you can just… add more of them. Who knew.",            // II (own 25)
  "The other organelles are starting to feel a little replaceable.", // III (own 50)
  "This is fine. This is completely sustainable. Probably.",        // IV (own 100)
  "Peer review status: the reviewers have stopped responding.",     // V  (own 175)
  "It has begun naming itself. We did not teach it that.",          // VI (own 300)
  "Do not feed it after midnight. Do not make eye contact.",        // VII (own 500)
];

export const UPGRADES = [];
GENERATORS.forEach((g) => {
  GEN_TIERS.forEach((t, i) => {
    UPGRADES.push({
      id: `${g.id}_x2_${t.n}`,
      name: `${g.name} ${ROMAN[i] || "V" + (i - 4)}`,
      desc: `${g.name} output ×2.`,
      flavor: TIER_FLAVOR[i] || TIER_FLAVOR[TIER_FLAVOR.length - 1],
      cond: `Own ${t.n} ${g.name}`,
      cost: Math.ceil(g.baseCost * t.c),
      unlock: { gen: g.id, n: t.n },
      gen: g.id, mult: 2,
    });
  });
});

// click + global upgrades, unlocked by lifetime biomass milestones
UPGRADES.push(
  { id: "click_a", name: "Sharpened Touch", desc: "Click power ×3.", flavor: "You've learned to poke it in exactly the right spot.", cond: "1K lifetime biomass", cost: 800, unlock: { lifetime: 1e3 }, click: 3 },
  { id: "click_b", name: "Barbed Touch", desc: "Click power ×3.", flavor: "Now with hooks. The cell didn't consent to this.", cond: "1M lifetime biomass", cost: 2e5, unlock: { lifetime: 1e6 }, click: 3 },
  { id: "click_c", name: "Cataclysmic Touch", desc: "Click power ×4.", flavor: "Each tap is a small, localized extinction event.", cond: "1B lifetime biomass", cost: 5e8, unlock: { lifetime: 1e9 }, click: 4 },
  { id: "prod_a", name: "Mitotic Tuning", desc: "ALL production ×2.", flavor: "We oiled the mitosis. It splits like butter now.", cond: "100K lifetime biomass", cost: 5e4, unlock: { lifetime: 1e5 }, prod: 2 },
  { id: "prod_b", name: "Metabolic Overdrive", desc: "ALL production ×2.", flavor: "The cell skipped breakfast and went straight to feasting.", cond: "100M lifetime biomass", cost: 5e7, unlock: { lifetime: 1e8 }, prod: 2 },
  { id: "prod_c", name: "Hypermetabolism", desc: "ALL production ×3.", flavor: "It burns biomass faster than we can write the safety memo.", cond: "10B lifetime biomass", cost: 5e9, unlock: { lifetime: 1e10 }, prod: 3 },
  { id: "prod_d", name: "Cellular Singularity", desc: "ALL production ×3.", flavor: "Production has folded in on itself. Don't look directly at the graph.", cond: "1e13 lifetime biomass", cost: 5e12, unlock: { lifetime: 1e13 }, prod: 3 },
  { id: "prod_e", name: "Apex Metabolism", desc: "ALL production ×4.", flavor: "Nothing on this planet metabolizes harder. We checked.", cond: "1e16 lifetime biomass", cost: 5e15, unlock: { lifetime: 1e16 }, prod: 4 },
  { id: "prod_f", name: "Cosmic Metabolism", desc: "ALL production ×5.", flavor: "It now eats starlight as a light snack between meals.", cond: "1e20 lifetime biomass", cost: 5e19, unlock: { lifetime: 1e20 }, prod: 5 },
  { id: "click_d", name: "Annihilating Touch", desc: "Click power ×5.", flavor: "Reality flinches a little every time you click.", cond: "1e12 lifetime biomass", cost: 5e11, unlock: { lifetime: 1e12 }, click: 5 },
  { id: "click_e", name: "Godhand", desc: "Click power ×6.", flavor: "Somewhere, a finger of unimaginable power. It is yours.", cond: "1e16 lifetime biomass", cost: 5e15, unlock: { lifetime: 1e16 }, click: 6 },
);

// ---- Symbiosis upgrades: Cookie-Clicker's signature combinatorial depth, but
// between ORGANELLES. Each grants the "to" organelle a bonus that scales with how
// many of the "from" organelle you own (per × ownedFrom), so spreading across the
// whole cell unlocks compounding payoffs instead of mono-buying one. Bonuses are
// small (the global mult softcap keeps the combinatorics from exploding).
const SYNERGIES = [
  { id: "syn_endosymbiosis",  name: "Endosymbiosis",        to: "mitochondria", from: "chloroplast", per: 0.002, fromName: "Chloroplast", toName: "Mitochondria",
    flavor: "A billion years ago this was a hostile takeover. Now they're family.", cost: 4e7, unlock: { gen: "chloroplast", n: 25 } },
  { id: "syn_command_relay",  name: "Command Relay",        to: "ribosome",     from: "nucleus",     per: 0.003, fromName: "Nucleus", toName: "Ribosome",
    flavor: "The nucleus barks orders; the ribosomes pretend to listen, then comply.", cost: 5e6, unlock: { gen: "nucleus", n: 25 } },
  { id: "syn_spindle_sync",   name: "Spindle Sync",         to: "flagellum",    from: "centriole",   per: 0.004, fromName: "Centriole", toName: "Flagellum",
    flavor: "Everything thrashes faster once the spindles agree on a beat.", cost: 6e10, unlock: { gen: "centriole", n: 25 } },
  { id: "syn_waste_loop",     name: "Closed Waste Loop",    to: "vacuole",      from: "lysosome",    per: 0.003, fromName: "Lysosome", toName: "Vacuole",
    flavor: "One organelle's garbage is another organelle's packed lunch.", cost: 1.2e7, unlock: { gen: "lysosome", n: 50 } },
  { id: "syn_solar_logistics",name: "Solar Logistics",      to: "chloroplast",  from: "golgi",       per: 0.0025, fromName: "Golgi Body", toName: "Chloroplast",
    flavor: "Sunlight, harvested and gift-wrapped for same-day delivery.", cost: 3.2e9, unlock: { gen: "golgi", n: 50 } },
  { id: "syn_transcription",  name: "Transcription Overdrive", to: "nucleolus", from: "nucleus",    per: 0.0015, fromName: "Nucleus", toName: "Nucleolus",
    flavor: "The library never closes. The head librarian never blinks.", cost: 1.5e12, unlock: { gen: "nucleus", n: 100 } },
];
SYNERGIES.forEach((s) => UPGRADES.push({
  id: s.id, name: s.name, desc: `${s.toName} gain +${(s.per * 100).toFixed(2)}% per ${s.fromName} owned.`,
  flavor: s.flavor, cond: `Own ${s.unlock.n} ${s.fromName}`, cost: s.cost, unlock: s.unlock,
  synergy: { to: s.to, from: s.from, per: s.per },
}));

export const UPG_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export { GEN_BY_ID as UPG_GEN_BY_ID };
