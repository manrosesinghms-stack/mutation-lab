// Gene Splicer minigame — combine two body-part types to discover a named Hybrid.
// Discovering one is permanent (a collection goal) and grants a small permanent
// production bonus; every splice also fires a temporary "Hybrid Surge" buff.
// Key = the two part ids sorted + joined with "+".

export const PART_TYPES = ["eye", "spike", "tentacle", "jaw", "frond", "cilia"];
export const PART_LABEL = {
  eye: "👁 Eye", spike: "🦴 Spike", tentacle: "🐙 Tentacle",
  jaw: "🦷 Jaw", frond: "🌿 Frond", cilia: "✨ Cilia",
};

const H = (a, b, name, flavor) => ({ key: [a, b].sort().join("+"), name, flavor });

export const HYBRID_LIST = [
  H("eye", "spike", "Gorgon", "Eyes on every thorn — it watches as it wounds."),
  H("eye", "tentacle", "Beholder", "A drifting orb of staring limbs."),
  H("eye", "jaw", "Maweye", "It sees only what it will devour."),
  H("eye", "frond", "Bloomsight", "Petals that blink toward the light."),
  H("eye", "cilia", "Lashgaze", "A thousand twitching, watchful hairs."),
  H("spike", "tentacle", "Lasher", "Whips tipped in bone."),
  H("spike", "jaw", "Gnasher", "All teeth, inside and out."),
  H("spike", "frond", "Thornbloom", "Beautiful. Do not touch."),
  H("spike", "cilia", "Bristlecoat", "A pelt that cuts."),
  H("tentacle", "jaw", "Devourer", "It reaches, then it feeds."),
  H("tentacle", "frond", "Kelpid", "Half-beast, half-garden, all hunger."),
  H("tentacle", "cilia", "Drifter", "It rows through the dark on a million oars."),
  H("jaw", "frond", "Venus", "The garden bites back."),
  H("jaw", "cilia", "Filterer", "It strains the broth for the living."),
  H("frond", "cilia", "Mossback", "A slow, soft, ancient thing."),
];

export const HYBRID_BY_KEY = Object.fromEntries(HYBRID_LIST.map((h) => [h.key, h]));
export function spliceKey(a, b) { return [a, b].sort().join("+"); }
