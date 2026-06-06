// Themed mutation families. Own every member at once to unlock a Set Form (a
// named evolution + a bonus). Drives collection ("3/4 Predator...").

export const SETS = [
  { id: "predator", name: "Predator", form: "Apex Predator",
    members: ["apex", "devourer", "spines", "venom"],
    bonus: (m) => { m.prodMult *= 2; m.clickMult *= 2; } },
  { id: "flora", name: "Flora", form: "Verdant Colossus",
    members: ["photosynth", "chloroplast", "spore", "glycogen"],
    bonus: (m) => { m.prodMult *= 2.4; m.epMult *= 1.3; } },
  { id: "swarm", name: "Swarm", form: "Living Tide",
    members: ["mitosis", "gigantism", "twin", "symbiont"],
    bonus: (m) => { m.prodMult *= 2.6; } },
  { id: "psychic", name: "Psychic", form: "Oversoul",
    members: ["third_eye", "biolume", "eldritch", "photophore"],
    bonus: (m) => { m.prodMult *= 2; m.clickMult *= 3; } },
  { id: "titan", name: "Titan", form: "World-Eater",
    members: ["titan", "mito_eve", "cancer", "omega"],
    bonus: (m) => { m.prodMult *= 3; } },
];

export const SET_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s]));

export function setProgress(s, mutations) {
  const owned = new Set(mutations);
  const have = s.members.filter((id) => owned.has(id)).length;
  return { have, need: s.members.length };
}

export function completedSets(mutations) {
  const owned = new Set(mutations);
  return SETS.filter((s) => s.members.every((id) => owned.has(id)));
}
