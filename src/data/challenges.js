// Challenge runs — start one to reset your run under special rules; hit the goal
// (run biomass) for a reward. Meta (species/genome/achievements) is untouched.
// rule is read by economy.js / main.js to change how the game plays.

export const CHALLENGES = [
  { id: "parasite", name: "Parasite", rule: "noGenerators", goal: 5e5, reward: 2,
    desc: "No organelles — survive on clicks alone." },
  { id: "pacifist", name: "Pacifist", rule: "noClick", goal: 5e5, reward: 2,
    desc: "Clicking does nothing — pure idle." },
  { id: "hyper", name: "Hypermutation", rule: "hyper", goal: 5e7, reward: 3,
    desc: "Every mutation is ×4. The creature becomes absurd." },
  { id: "fragile", name: "Fragile Genome", rule: "fastWall", goal: 3e5, reward: 3,
    desc: "The Metabolic wall arrives 60% sooner." },
];

export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
