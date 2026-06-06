// Mutation synergies: owning the right COMBO of parts unlocks a named "Species
// Trait" with bonus effects. Visible ones teach the system (show progress);
// hidden legendaries are secret for the community to hunt.
// requires: { parts: {partType: minCount}, has: [mutationId,...] }

import { MUT_BY_ID } from "./mutations.js";

export const SYNERGIES = [
  // --- visible (players see progress toward them) ---
  { id: "hivemind", name: "Hivemind", flavor: "A thousand eyes, one will.", hidden: false,
    requires: { parts: { eye: 3 } }, hint: "Grow many eyes.",
    effect: (m) => { m.prodMult *= 2.5; m.clickMult *= 1.5; } },
  { id: "leviathan", name: "Leviathan", flavor: "The deep stirs.", hidden: false,
    requires: { parts: { tentacle: 3 } }, hint: "Many grasping tendrils.",
    effect: (m) => { m.prodMult *= 3; } },
  { id: "thornlord", name: "Thornlord", flavor: "Do not touch.", hidden: false,
    requires: { parts: { spike: 3 } }, hint: "Cover yourself in spikes.",
    effect: (m) => { m.clickMult *= 4; } },
  { id: "verdant", name: "Verdant Engine", flavor: "It drinks the sun.", hidden: false,
    requires: { parts: { frond: 2 } }, hint: "Sprout fronds.",
    effect: (m) => { m.prodMult *= 2; m.epMult *= 1.5; } },
  { id: "broodmother", name: "Broodmother", flavor: "It is not one. It is legion.", hidden: false,
    requires: { parts: { body: 2 } }, hint: "Split into many bodies.",
    effect: (m) => { m.prodMult *= 3; } },

  // --- hidden legendary evolutions (secret combos) ---
  { id: "deep_sea_horror", name: "Deep Sea Horror", flavor: "It should not be.", hidden: true,
    requires: { parts: { tentacle: 2, jaw: 1 } },
    effect: (m) => { m.prodMult *= 6; } },
  { id: "neural_god", name: "Neural God", flavor: "It knows you.", hidden: true,
    requires: { parts: { eye: 4 } },
    effect: (m) => { m.prodMult *= 5; m.clickMult *= 5; } },
  { id: "bio_titan", name: "Bio-Titan", flavor: "Bigger. Always bigger.", hidden: true,
    requires: { parts: { body: 3 } },
    effect: (m) => { m.prodMult *= 10; } },
  { id: "cosmic_organism", name: "Cosmic Organism", flavor: "It contains multitudes.", hidden: true,
    requires: { parts: { eye: 2, body: 1, frond: 1 } },
    effect: (m) => { m.prodMult *= 8; m.epMult *= 1.5; } },
  { id: "flesh_singularity", name: "Flesh Singularity", flavor: "All becomes one.", hidden: true,
    requires: { parts: { jaw: 1, spike: 2, tentacle: 1 } },
    effect: (m) => { m.prodMult *= 7; m.clickMult *= 3; } },
];

export const SYN_BY_ID = Object.fromEntries(SYNERGIES.map((s) => [s.id, s]));

export function partCounts(mutations) {
  const p = {};
  for (const id of mutations) {
    const d = MUT_BY_ID[id];
    if (d && d.part) p[d.part] = (p[d.part] || 0) + 1;
  }
  return p;
}

function met(s, parts, owned) {
  if (s.requires.parts) for (const k in s.requires.parts) if ((parts[k] || 0) < s.requires.parts[k]) return false;
  if (s.requires.has) for (const id of s.requires.has) if (!owned.has(id)) return false;
  return true;
}

// Synergies currently satisfied by the given mutation list.
export function activeSynergies(mutations) {
  const parts = partCounts(mutations);
  const owned = new Set(mutations);
  return SYNERGIES.filter((s) => met(s, parts, owned));
}

// For the codex: how close to a (visible) synergy, as "have/need" across reqs.
export function synergyProgress(s, mutations) {
  const parts = partCounts(mutations);
  let have = 0, need = 0;
  if (s.requires.parts) for (const k in s.requires.parts) { need += s.requires.parts[k]; have += Math.min(parts[k] || 0, s.requires.parts[k]); }
  return { have, need };
}
