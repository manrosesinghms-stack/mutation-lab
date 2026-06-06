// Colonization Map — your colony spreads across a node-map of the world. Each
// node costs (escalating) biomass to claim and grants a PERMANENT bonus; claiming
// reveals the nodes it connects to (the frontier). A huge biomass sink + visible
// progression + an endless "next node to push toward". Bonuses persist forever.

// N(id, name, cost, requires[], prod, click, desc)
const N = (id, name, cost, requires, prod, click, desc) => ({ id, name, cost, requires, prod: prod || 0, click: click || 0, desc });

export const COLONY_NODES = [
  N("origin",    "Origin Pool",         1e5,   [],            0.10, 0,    "+10% production"),
  N("shallows",  "Sunlit Shallows",     4e6,   ["origin"],    0.15, 0,    "+15% production"),
  N("reef",      "Coral Reef",          4e6,   ["origin"],    0,    0.40, "+40% click power"),
  N("kelp",      "Kelp Forest",         1e8,   ["shallows"],  0.20, 0,    "+20% production"),
  N("reefcity",  "Reef Metropolis",     1.5e8, ["reef"],      0,    0.70, "+70% click power"),
  N("shelf",     "Continental Shelf",   3e9,   ["kelp"],      0.25, 0,    "+25% production"),
  N("lagoon",    "Tidal Lagoon",        4e9,   ["reefcity"],  0.20, 0.30, "+20% prod & +30% click"),
  N("twilight",  "Twilight Zone",       6e10,  ["shelf"],     0.30, 0,    "+30% production"),
  N("current",   "Deep Current",        8e10,  ["shelf", "lagoon"], 0, 1.0, "+100% click power"),
  N("midnight",  "Midnight Zone",       1.2e12,["twilight"],  0.40, 0,    "+40% production"),
  N("vent",      "Hydrothermal Vent",   2e13,  ["midnight"],  0.60, 0,    "+60% production"),
  N("ventfield", "Vent Megafield",      2.5e13,["midnight", "current"], 0.35, 0.50, "+35% prod & +50% click"),
  N("trench",    "The Trench",          5e14,  ["vent"],      0.75, 0,    "+75% production"),
  N("abyss",     "Abyssal Plain",       1e16,  ["trench"],    1.0,  0,    "×2 production"),
  N("hadal",     "Hadal Depths",        2e16,  ["trench", "ventfield"], 0, 2.0, "×3 click power"),
  N("rift",      "Tectonic Rift",       4e17,  ["abyss"],     1.25, 0,    "+125% production"),
  N("core",      "Mantle Bloom",        9e18,  ["abyss", "hadal"], 1.5, 0, "×2.5 production"),
  N("crust",     "Living Crust",        2e20,  ["rift"],      1.5,  0,    "×2.5 production"),
  N("stratos",   "Stratosphere Spore",  5e21,  ["core"],      0,    3.0,  "×4 click power"),
  N("orbit",     "Orbital Colony",      1.2e23,["crust", "stratos"], 2.0, 0, "×3 production"),
  N("lunar",     "Lunar Mycelium",      3e24,  ["orbit"],     2.5,  0,    "+250% production"),
  N("belt",      "Asteroid Bloom",      8e25,  ["orbit"],     0,    5.0,  "×6 click power"),
  N("nebula",    "Nebula Spread",       2e27,  ["lunar", "belt"], 3.0, 0,  "×4 production"),
  N("galactic",  "Galactic Biosphere",  6e28,  ["nebula"],    5.0,  0,    "×6 production"),
];
export const COLONY_BY_ID = Object.fromEntries(COLONY_NODES.map((n) => [n.id, n]));
