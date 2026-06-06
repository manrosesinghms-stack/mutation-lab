// Achievements — each grants a small PERMANENT modifier when unlocked, so they
// feed the core loop (not just bragging rights). `check(state)` reads persisted
// fields; unlocked ids live in state.achievements.

import { MUT_BY_ID } from "./mutations.js";
import { GENERATORS } from "./generators.js";

const discCount = (s) => Object.keys(s.discovered || {}).length;
const hasLegendary = (s) =>
  Object.keys(s.discovered || {}).some((id) => MUT_BY_ID[id] && MUT_BY_ID[id].rarity === "legendary");
const ownsAllGens = (s) => GENERATORS.every((g) => (s.owned[g.id] || 0) >= 1);
const objCount = (o) => Object.keys(o || {}).length;
const maxOwned = (s) => Math.max(0, ...GENERATORS.map((g) => s.owned[g.id] || 0));

export const ACHIEVEMENTS = [
  { id: "sprout", name: "Sprout", desc: "Earn 1,000 biomass", prodMult: 1.05,
    check: (s) => s.lifetimeBiomass >= 1e3 },
  { id: "evolve1", name: "First Evolution", desc: "Evolve once", prodMult: 1.05,
    check: (s) => (s.prestiges || 0) >= 1 || (s.speciations || 0) >= 1 },
  { id: "allgens", name: "Full House", desc: "Own all 5 organelles at once", prodMult: 1.05,
    check: (s) => ownsAllGens(s) },
  { id: "wall", name: "Maxed Out", desc: "Hit the Metabolic Pressure wall", prodMult: 1.05,
    check: (s) => !!s.hitWall },
  { id: "legend", name: "Legendary", desc: "Draft a legendary mutation", prodMult: 1.1,
    check: (s) => hasLegendary(s) },
  { id: "disc10", name: "Curious", desc: "Discover 10 mutations", prodMult: 1.05,
    check: (s) => discCount(s) >= 10 },
  { id: "disc25", name: "Geneticist", desc: "Discover 25 mutations", prodMult: 1.1,
    check: (s) => discCount(s) >= 25 },
  { id: "disc50", name: "Completionist", desc: "Discover all 50 mutations", prodMult: 1.25,
    check: (s) => discCount(s) >= 50 },
  { id: "million", name: "Millionaire", desc: "Reach 1e6 lifetime biomass", prodMult: 1.05,
    check: (s) => s.lifetimeBiomass >= 1e6 },
  { id: "billion", name: "Billionaire", desc: "Reach 1e9 lifetime biomass", prodMult: 1.1,
    check: (s) => s.lifetimeBiomass >= 1e9 },
  { id: "speciate1", name: "New Species", desc: "Speciate once", prodMult: 1.1,
    check: (s) => (s.speciations || 0) >= 1 },
  { id: "speciate5", name: "Adaptive Radiation", desc: "Speciate 5 times", prodMult: 1.15,
    check: (s) => (s.speciations || 0) >= 5 },
  { id: "equip", name: "Lineage", desc: "Equip a Species", prodMult: 1.05,
    check: (s) => (s.equippedSpecies || []).length >= 1 },
  { id: "bloom", name: "Bloom Catcher", desc: "Catch a Mitogen Bloom", clickMult: 1.1,
    check: (s) => !!s.bloomCaught },
  { id: "genome50", name: "Gene Bank", desc: "Hold 50 Genome", prodMult: 1.05,
    check: (s) => (s.genome || 0) >= 50 },

  // ---- biomass milestones (long tail) ----
  { id: "bm12", name: "Trillionaire", desc: "Reach 1e12 lifetime biomass", prodMult: 1.08, check: (s) => s.lifetimeBiomass >= 1e12 },
  { id: "bm15", name: "Quadrillion", desc: "Reach 1e15 lifetime biomass", prodMult: 1.08, check: (s) => s.lifetimeBiomass >= 1e15 },
  { id: "bm18", name: "Quintillion", desc: "Reach 1e18 lifetime biomass", prodMult: 1.1, check: (s) => s.lifetimeBiomass >= 1e18 },
  { id: "bm21", name: "Sextillion", desc: "Reach 1e21 lifetime biomass", prodMult: 1.1, check: (s) => s.lifetimeBiomass >= 1e21 },
  { id: "bm24", name: "Septillion", desc: "Reach 1e24 lifetime biomass", prodMult: 1.12, check: (s) => s.lifetimeBiomass >= 1e24 },
  { id: "bm30", name: "Beyond Counting", desc: "Reach 1e30 lifetime biomass", prodMult: 1.15, check: (s) => s.lifetimeBiomass >= 1e30 },

  // ---- evolve / speciate / transcend ----
  { id: "evolve10", name: "Serial Evolver", desc: "Evolve 10 times (one lineage)", prodMult: 1.06, check: (s) => (s.prestiges || 0) >= 10 },
  { id: "evolve25", name: "Restless Genome", desc: "Evolve 25 times", prodMult: 1.08, check: (s) => (s.prestiges || 0) >= 25 },
  { id: "evolve50", name: "Mutation Machine", desc: "Evolve 50 times", prodMult: 1.1, check: (s) => (s.prestiges || 0) >= 50 },
  { id: "ep1k", name: "Brainpower", desc: "Hold 1,000 Evolution Points", prodMult: 1.08, check: (s) => (s.evolutionPoints || 0) >= 1e3 },
  { id: "ep100k", name: "Hivemind", desc: "Hold 100,000 Evolution Points", prodMult: 1.12, check: (s) => (s.evolutionPoints || 0) >= 1e5 },
  { id: "spec10", name: "Diversifier", desc: "Speciate 10 times", prodMult: 1.1, check: (s) => (s.speciations || 0) >= 10 },
  { id: "spec25", name: "Tree of Life", desc: "Speciate 25 times", prodMult: 1.12, check: (s) => (s.speciations || 0) >= 25 },
  { id: "tier5", name: "Celestial", desc: "Reach Species Tier 5", prodMult: 1.1, check: (s) => (s.speciations || 0) >= 5 },
  { id: "tier13", name: "Transcendent Form", desc: "Reach Species Tier 13", prodMult: 1.15, check: (s) => (s.speciations || 0) >= 13 },
  { id: "tr1", name: "Ascension", desc: "Transcend once", prodMult: 1.15, check: (s) => (s.transcensions || 0) >= 1 },
  { id: "tr5", name: "Eternal", desc: "Transcend 5 times", prodMult: 1.2, check: (s) => (s.transcensions || 0) >= 5 },
  { id: "helix50", name: "Double Helix", desc: "Hold 50 Helix", prodMult: 1.1, check: (s) => (s.helix || 0) >= 50 },
  { id: "genome1k", name: "Genome Vault", desc: "Hold 1,000 Genome", prodMult: 1.08, check: (s) => (s.genome || 0) >= 1e3 },

  // ---- clicking ----
  { id: "click100", name: "Tapper", desc: "Click 100 times", clickMult: 1.1, check: (s) => (s.totalClicks || 0) >= 100 },
  { id: "click1k", name: "Hyperactive", desc: "Click 1,000 times", clickMult: 1.1, check: (s) => (s.totalClicks || 0) >= 1e3 },
  { id: "click10k", name: "Carpal Tunnel", desc: "Click 10,000 times", clickMult: 1.15, check: (s) => (s.totalClicks || 0) >= 1e4 },

  // ---- playtime ----
  { id: "play1h", name: "Dedicated", desc: "Play for 1 hour", prodMult: 1.05, check: (s) => (s.playSeconds || 0) >= 3600 },
  { id: "play5h", name: "Cultivator", desc: "Play for 5 hours", prodMult: 1.1, check: (s) => (s.playSeconds || 0) >= 18000 },
  { id: "play24h", name: "Symbiote", desc: "Play for 24 hours total", prodMult: 1.2, check: (s) => (s.playSeconds || 0) >= 86400 },

  // ---- mutations / build ----
  { id: "mut10", name: "Mutant", desc: "Hold 10 mutations at once", prodMult: 1.06, check: (s) => (s.mutations || []).length >= 10 },
  { id: "mut25", name: "Abomination", desc: "Hold 25 mutations at once", prodMult: 1.1, check: (s) => (s.mutations || []).length >= 25 },
  { id: "mut50", name: "Eldritch Horror", desc: "Hold 50 mutations at once", prodMult: 1.15, check: (s) => (s.mutations || []).length >= 50 },
  { id: "gen100", name: "Colony", desc: "Own 100 of one organelle", prodMult: 1.08, check: (s) => maxOwned(s) >= 100 },
  { id: "gen250", name: "Megacolony", desc: "Own 250 of one organelle", prodMult: 1.12, check: (s) => maxOwned(s) >= 250 },
  { id: "alien", name: "Not From Here", desc: "Discover an Alien DNA mutation", prodMult: 1.12, check: (s) => !!s.seenFirstAlien },

  // ---- splicer ----
  { id: "splice1", name: "Splicer", desc: "Discover a Hybrid", prodMult: 1.05, check: (s) => objCount(s.splices) >= 1 },
  { id: "splice5", name: "Chimera Lab", desc: "Discover 5 Hybrids", prodMult: 1.08, check: (s) => objCount(s.splices) >= 5 },
  { id: "splice15", name: "Hybrid Codex", desc: "Discover all 15 Hybrids", prodMult: 1.2, check: (s) => objCount(s.splices) >= 15 },

  // ---- upgrades / shop ----
  { id: "upg5", name: "Optimizer", desc: "Buy 5 store upgrades", prodMult: 1.06, check: (s) => objCount(s.upgrades) >= 5 },
  { id: "upg15", name: "Min-Maxer", desc: "Buy 15 store upgrades", prodMult: 1.1, check: (s) => objCount(s.upgrades) >= 15 },

  // ---- skins / collection ----
  { id: "skin3", name: "Fashionista", desc: "Own 3 skins", clickMult: 1.05, check: (s) => objCount(s.skinsOwned) >= 3 },
  { id: "skinall", name: "Wardrobe", desc: "Own all 12 skins", prodMult: 1.15, check: (s) => objCount(s.skinsOwned) >= 12 },

  // ---- world / events ----
  { id: "boss1", name: "Predator", desc: "Slay a rival cell", prodMult: 1.08, check: (s) => !!s.seenFirstBoss },
  { id: "fossil1", name: "Archaeologist", desc: "Collect a fossil", prodMult: 1.05, check: (s) => (s.fossils || []).length >= 1 },
  { id: "fossil5", name: "Museum", desc: "Collect 5 fossils", prodMult: 1.1, check: (s) => (s.fossils || []).length >= 5 },
  { id: "chal1", name: "Challenger", desc: "Complete a challenge", prodMult: 1.1, check: (s) => objCount(s.challengesDone) >= 1 },
  { id: "trait5", name: "Synergist", desc: "Discover 5 traits/sets", prodMult: 1.1, check: (s) => objCount(s.discoveredTraits) >= 5 },
  { id: "variant", name: "Rare Specimen", desc: "Roll a rare variant (Golden/Crystal/Void)", prodMult: 1.1, check: (s) => objCount(s.variantsSeen) >= 1 },

  // ---- new systems (Roadmap 4) ----
  { id: "mut_first", name: "Curator", desc: "Hold 1 Mutagen", prodMult: 1.05, check: (s) => (s.mutagen || 0) >= 1 },
  { id: "mut_10", name: "Mutagen Hoard", desc: "Hold 10 Mutagen", prodMult: 1.08, check: (s) => (s.mutagen || 0) >= 10 },
  { id: "lvl_first", name: "Refined", desc: "Level an organelle", prodMult: 1.05, check: (s) => objCount(s.genLevels) >= 1 },
  { id: "lvl_all", name: "Fully Tuned", desc: "Level every organelle at least once", prodMult: 1.15, check: (s) => Object.values(s.genLevels || {}).filter((v) => v > 0).length >= 10 },
  { id: "broker", name: "Insider", desc: "Hire a Broker", prodMult: 1.05, check: (s) => (s.market && s.market.brokers) >= 1 },
  { id: "broker_max", name: "Wolf of Wall Cell", desc: "Hire 9 Brokers", prodMult: 1.15, check: (s) => (s.market && s.market.brokers) >= 9 },
  { id: "garden_plant", name: "Gardener", desc: "Plant a strain", prodMult: 1.05, check: (s) => s.garden && s.garden.plots && s.garden.plots.some(Boolean) },
  { id: "pantheon_full", name: "Ancestry", desc: "Fill all 3 Pantheon slots", prodMult: 1.12, check: (s) => s.pantheon && ["minor", "major", "apex"].every((k) => s.pantheon[k]) },
  { id: "symb_adult", name: "Caretaker", desc: "Grow your Symbiote to Adult", prodMult: 1.1, check: (s) => (s.symbiote && s.symbiote.fed || 0) >= 15 },
  { id: "symb_apex", name: "Apex Bond", desc: "Grow your Symbiote to Apex", prodMult: 1.15, check: (s) => (s.symbiote && s.symbiote.fed || 0) >= 30 },
  { id: "aura_set", name: "Attuned", desc: "Attune a Symbiote aura", prodMult: 1.05, check: (s) => !!(s.symbiote && s.symbiote.aura) },
  { id: "chal_all", name: "Tower Conqueror", desc: "Complete all 8 challenges", prodMult: 1.25, check: (s) => objCount(s.challengesDone) >= 8 },
  { id: "upg30", name: "Engineer", desc: "Buy 30 store upgrades", prodMult: 1.12, check: (s) => objCount(s.upgrades) >= 30 },
  { id: "spec50", name: "Phylogeny", desc: "Speciate 50 times", prodMult: 1.15, check: (s) => (s.speciations || 0) >= 50 },
  { id: "tr25", name: "Infinite Lineage", desc: "Transcend 25 times", prodMult: 1.3, check: (s) => (s.transcensions || 0) >= 25 },
  { id: "helix500", name: "Helix Sovereign", desc: "Hold 500 Helix", prodMult: 1.2, check: (s) => (s.helix || 0) >= 500 },
];

// programmatic long-tail: biomass orders of magnitude (1e33 → 1e90) + click +
// prestige tiers — endless escalating goals, each a small permanent bonus.
for (let exp = 33; exp <= 159; exp += 2) {
  ACHIEVEMENTS.push({ id: "bmx" + exp, name: `1e${exp} Biomass`, desc: `Reach 1e${exp} lifetime biomass`, prodMult: 1.03, check: (s) => (s.lifetimeBiomass || 0) >= Math.pow(10, exp) });
}
for (const hr of [2, 3, 10, 48, 168]) {
  ACHIEVEMENTS.push({ id: "play" + hr + "h", name: `${hr}h Symbiosis`, desc: `Play for ${hr} hours total`, prodMult: 1.05, check: (s) => (s.playSeconds || 0) >= hr * 3600 });
}
for (const c of [1e5, 1e6, 5e6]) {
  ACHIEVEMENTS.push({ id: "clk" + c, name: `${c >= 1e6 ? c / 1e6 + "M" : c / 1e3 + "K"} Clicks`, desc: `Click ${c >= 1e6 ? c / 1e6 + " million" : c / 1e3 + "K"} times`, clickMult: 1.08, check: (s) => (s.totalClicks || 0) >= c });
}
for (const p of [75, 100, 150, 200]) {
  ACHIEVEMENTS.push({ id: "evo" + p, name: `${p} Evolutions`, desc: `Evolve ${p} times (one lineage)`, prodMult: 1.08, check: (s) => (s.prestiges || 0) >= p });
}

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
