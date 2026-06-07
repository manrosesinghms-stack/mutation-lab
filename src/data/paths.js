// Evolution Paths — at Rank 5 (the Colony stage) the player CHOOSES a lineage.
// The path defines the creature's IDENTITY: its surface character, colour,
// signature part, per-stage names, and a build-defining bonus that scales with
// the macro-stage. The same 6 grandeur levels (from stages.js) are reskinned by
// the path, so a Crystal creature and a Predator creature look like different
// species at every stage — not recolors of one blob.
//
// `profile` is the surface CHARACTER (spiky / lobed / faceted / writhing); it's
// combined with the stage's grandeur (scale/crown/rings/orbiters) in setStage().
// `bonus.kind` maps onto the central modifier stack; `per` is the multiplier
// added per macro-stage reached (so the build gets stronger as you ascend).
export const EVO_PATHS = [
  {
    id: "predator", name: "Predator", icon: "☠",
    color: 0xff7a3d, detail: 2, part: "spike",
    skin: { h: 0.045, s: 0.9, l: 0.55, metal: 0.3, rough: 0.45, emi: 0.45 }, // molten orange flesh

    profile: { a1: 0.16, f1: 3.0, a2: 0.12, f2: 5.0, a3: 0.08, f3: 7.0, lobe: 0.12, lobeF: 1.8, spike: 0.5 },
    bonus: { kind: "click", per: 0.5 }, // clickMult ×(1 + 0.5·stage)
    sigParts: ["jaw", "claw", "spike"], // signature anatomy grown by stage
    blurb: "Spined and aggressive — built around the kill. Your clicks hit far harder.",
    bonusText: "+50% click power per stage reached",
    stages: ["Feral Cell", "Pack Colony", "Hunter", "Apex Hunter", "Titan Predator", "Devourer God"],
  },
  {
    id: "neural", name: "Neural", icon: "🧠",
    color: 0x6fd6ff, detail: 3, part: "eye",
    skin: { h: 0.56, s: 0.85, l: 0.66, metal: 0.2, rough: 0.5, emi: 0.55 }, // luminous blue tissue

    profile: { a1: 0.2, f1: 4.0, a2: 0.16, f2: 6.5, a3: 0.1, f3: 9.0, lobe: 0.42, lobeF: 2.2, spike: 0 },
    bonus: { kind: "prod", per: 0.4 }, // prodMult ×(1 + 0.4·stage)
    sigParts: ["eye", "neuron"],
    blurb: "A swelling hive-mind — lobed, eyed, and thinking. Passive production swells.",
    bonusText: "+40% production per stage reached",
    stages: ["Sensory Cell", "Ganglion Colony", "Thinker", "Hive Mind", "Neural Vastness", "Neural God"],
  },
  {
    id: "crystal", name: "Crystal", icon: "🔮",
    color: 0x9fe8ff, detail: 1, part: "spike",
    skin: { h: 0.55, s: 0.7, l: 0.74, metal: 0.85, rough: 0.12, emi: 0.6 }, // shiny faceted crystal

    profile: { a1: 0.08, f1: 3.0, a2: 0.06, f2: 4.0, a3: 0.05, f3: 6.0, lobe: 0, lobeF: 1.4, spike: 0.18 },
    bonus: { kind: "ep", per: 0.45 }, // epMult ×(1 + 0.45·stage)
    sigParts: ["shard"],
    blurb: "Faceted, geometric, ever-growing. Prestige currencies crystallize faster.",
    bonusText: "+45% Evolution Point gain per stage reached",
    stages: ["Seed Crystal", "Crystal Cluster", "Crystal Growth", "Crystal Entity", "Crystal Colossus", "Crystal Singularity"],
  },
  {
    id: "parasite", name: "Parasite", icon: "🦠",
    color: 0x9be36b, detail: 3, part: "tentacle",
    skin: { h: 0.27, s: 0.66, l: 0.6, metal: 0.15, rough: 0.55, emi: 0.45 }, // sickly green flesh

    profile: { a1: 0.26, f1: 3.4, a2: 0.18, f2: 5.4, a3: 0.12, f3: 7.4, lobe: 0.44, lobeF: 2.4, spike: 0.24 },
    bonus: { kind: "prodclick", per: 0.24 }, // both prod & click ×(1 + 0.24·stage)
    sigParts: ["tentacle", "eggsac"],
    blurb: "Writhing and ravenous — a relentless generalist that consumes everything.",
    bonusText: "+24% production AND click power per stage reached",
    stages: ["Spore", "Infestation", "Leech", "Infestor", "World-Eater", "Planet Eater"],
  },
];

export const PATH_BY_ID = Object.fromEntries(EVO_PATHS.map((p) => [p.id, p]));
