// Procedural creature naming — a "taxonomy" that evolves as parts are added.
// Genus from the dominant body part, species epithet from the second, and a
// rank epithet that escalates with how mutated the creature is. Three styles.

import { MUT_BY_ID } from "./mutations.js";

const GENUS = { eye: "Oculo", spike: "Chitino", tentacle: "Tentaculo", jaw: "Voro", frond: "Phyto", cilia: "Cilio", body: "Gemino" };
const SPECIES = { eye: "oculus", spike: "spinus", tentacle: "brachia", jaw: "vorax", frond: "viridis", cilia: "pilus", body: "geminus" };
const RANK = ["", "Minor", "Ferox", "Prime", "Rex", "Apex", "Ultima", "Omega"];

const CUTE_ADJ = ["Wiggly", "Squishy", "Lil'", "Derpy", "Bouncy", "Smol", "Chonky", "Goopy"];
const CUTE_NOUN = { eye: "Peeper", spike: "Spike", tentacle: "Wiggles", jaw: "Chompy", frond: "Sprout", cilia: "Fuzz", body: "Buddy", _: "Blobbert" };

const ELD_SYL = ["Xhal", "Kor", "Zog", "Vex", "Nyl", "Ulth", "Mor", "Qa", "Threx", "Vohl", "Ssra", "Gix"];

function partCounts(mutations) {
  const parts = {};
  for (const id of mutations) {
    const d = MUT_BY_ID[id];
    if (d && d.part) parts[d.part] = (parts[d.part] || 0) + 1;
  }
  return parts;
}

export function creatureName(mutations, style = "scientific") {
  const parts = partCounts(mutations || []);
  const sorted = Object.keys(parts).sort((a, b) => parts[b] - parts[a]);
  const n = (mutations || []).length;
  const rank = RANK[Math.min(RANK.length - 1, Math.floor(n / 3))];

  if (style === "cute") {
    const adj = CUTE_ADJ[n % CUTE_ADJ.length];
    const noun = CUTE_NOUN[sorted[0]] || CUTE_NOUN._;
    return `${adj} ${noun}`.trim();
  }
  if (style === "eldritch") {
    const count = Math.min(3, 1 + Math.floor(sorted.length));
    let name = "";
    for (let i = 0; i < count; i++) name += (i ? "'" : "") + ELD_SYL[(n * 3 + i * 5 + (sorted.length || 0)) % ELD_SYL.length];
    return name || "Th'Ul";
  }
  // scientific (default)
  if (!sorted.length) return `Protocell${rank ? " " + rank : ""}`;
  const genus = GENUS[sorted[0]] || "Proto";
  const sp = sorted[1] ? SPECIES[sorted[1]] : "morph";
  const base = `${genus}${sp}`;
  return `${base.charAt(0).toUpperCase() + base.slice(1)}${rank ? " " + rank : ""}`;
}
