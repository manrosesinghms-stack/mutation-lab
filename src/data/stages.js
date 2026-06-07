// Six dramatic macro-stages the creature transforms through, driven by the
// PERMANENT Evolution Rank (never resets). Every prestige adds rank, so the
// creature keeps becoming something instead of dropping back to a blob.
//
// Each stage is a real silhouette / energy-structure jump — not a recolor.
// `minRank` is the permanent rank at which the stage begins. Scales are kept
// moderate (the camera frames the creature; grandeur comes from crown / rings /
// orbiters / aura / detail, not raw mesh size that would fill the screen).
export const EVO_STAGES = [
  {
    id: "cell", name: "Single Cell", minRank: 0, color: 0x66ffcc,
    scale: [0.82, 0.82, 0.82], detail: 3,
    profile: { a1: 0.16, f1: 4.0, a2: 0.10, f2: 6.0, a3: 0.07, f3: 8.0, lobe: 0, lobeF: 1.6, spike: 0 },
    crown: 0, rings: 0, auraColor: 0x66ffcc, auraI: 0.6, orbits: 0,
    blurb: "A tiny protoorganism — barely more than a living membrane.",
  },
  {
    id: "colony", name: "Colony Organism", minRank: 5, color: 0x6effa6,
    scale: [1.0, 0.98, 1.0], detail: 3,
    profile: { a1: 0.22, f1: 3.4, a2: 0.14, f2: 5.0, a3: 0.09, f3: 7.0, lobe: 0.3, lobeF: 1.6, spike: 0 },
    crown: 2, rings: 1, auraColor: 0x6effa6, auraI: 0.95, orbits: 0,
    blurb: "Cells cluster and specialize — lobes, organs, the first limbs.",
  },
  {
    id: "predator", name: "Predator", minRank: 15, color: 0xffae4d,
    scale: [1.18, 0.92, 1.05], detail: 2,
    profile: { a1: 0.18, f1: 3.0, a2: 0.12, f2: 5.0, a3: 0.08, f3: 7.0, lobe: 0.2, lobeF: 1.8, spike: 0.42 },
    crown: 5, rings: 2, auraColor: 0xff8a3d, auraI: 1.25, orbits: 0,
    blurb: "An aggressive, recognizable beast — spined, fast, and hunting.",
  },
  {
    id: "apex", name: "Apex Evolution", minRank: 30, color: 0xff5ad0,
    scale: [1.28, 1.12, 1.2], detail: 2,
    profile: { a1: 0.2, f1: 2.8, a2: 0.14, f2: 4.6, a3: 0.1, f3: 6.6, lobe: 0.36, lobeF: 2.0, spike: 0.5 },
    crown: 10, rings: 3, auraColor: 0xff5ad0, auraI: 1.6, orbits: 0,
    blurb: "Huge and complex — the dominant life-form of its world.",
  },
  {
    id: "planetary", name: "Planetary Organism", minRank: 60, color: 0xb88cff,
    scale: [1.4, 1.32, 1.4], detail: 2,
    profile: { a1: 0.24, f1: 3.0, a2: 0.16, f2: 5.0, a3: 0.12, f3: 7.0, lobe: 0.4, lobeF: 2.2, spike: 0.3 },
    crown: 16, rings: 4, auraColor: 0xb88cff, auraI: 2.0, orbits: 4,
    blurb: "Biology transcended — detached organs orbit a glowing core.",
  },
  {
    id: "cosmic", name: "Cosmic Entity", minRank: 120, color: 0xfff2c8,
    scale: [1.5, 1.5, 1.5], detail: 2,
    profile: { a1: 0.26, f1: 2.6, a2: 0.18, f2: 4.2, a3: 0.12, f3: 6.0, lobe: 0.44, lobeF: 2.4, spike: 0.36 },
    crown: 24, rings: 6, auraColor: 0xfff2c8, auraI: 2.6, orbits: 8,
    blurb: "A living god — stars orbit its body and space bends around it.",
  },
];

export const STAGE_COUNT = EVO_STAGES.length;

// Index of the stage for a given permanent rank.
export function stageForRank(rank) {
  let idx = 0;
  for (let i = 0; i < EVO_STAGES.length; i++) if ((rank || 0) >= EVO_STAGES[i].minRank) idx = i;
  return idx;
}
// The rank at which the NEXT stage unlocks (null if already at the final stage).
export function nextStageRank(rank) {
  const idx = stageForRank(rank);
  return idx + 1 < EVO_STAGES.length ? EVO_STAGES[idx + 1].minRank : null;
}
