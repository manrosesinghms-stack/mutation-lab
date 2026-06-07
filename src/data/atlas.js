// Genome Atlas — permanent meta-progression. Built on state.discovered (every
// mutation ever drafted, which NO reset clears). Mutations group into FAMILIES;
// discover every member of a family to unlock a permanent Mastery bonus. The
// "play for months" completion layer — nothing here ever resets.

import { MUTATIONS } from "./mutations.js";

// Build member id lists from the live mutation library so families never drift.
const byRarity = (r) => MUTATIONS.filter((m) => m.rarity === r).map((m) => m.id);
const byPart = (p) => MUTATIONS.filter((m) => m.part === p).map((m) => m.id);

// Each family: id, name, flavor, member ids, and the permanent Mastery bonus.
// bonus.kind ∈ prod | click | ep ; mult is the multiplier when complete.
const RAW = [
  { id: "fam_common", name: "Common Codex", icon: "○", members: byRarity("common"), bonus: { kind: "prod", mult: 1.05 }, flavor: "Master the humble building blocks." },
  { id: "fam_rare", name: "Rare Codex", icon: "◆", members: byRarity("rare"), bonus: { kind: "prod", mult: 1.10 }, flavor: "Catalogue every uncommon adaptation." },
  { id: "fam_legendary", name: "Elder Genome", icon: "★", members: byRarity("legendary"), bonus: { kind: "prod", mult: 1.25 }, flavor: "Every legendary mutation, recorded forever." },
  { id: "fam_eye", name: "Ocular Mastery", icon: "👁️", members: byPart("eye"), bonus: { kind: "click", mult: 1.15 }, flavor: "See all. Discover every Eye mutation." },
  { id: "fam_spike", name: "Spine Mastery", icon: "🔻", members: byPart("spike"), bonus: { kind: "prod", mult: 1.10 }, flavor: "Every defensive spine." },
  { id: "fam_tentacle", name: "Tendril Mastery", icon: "🌿", members: byPart("tentacle"), bonus: { kind: "click", mult: 1.10 }, flavor: "Every grasping limb." },
  { id: "fam_jaw", name: "Maw Mastery", icon: "🦷", members: byPart("jaw"), bonus: { kind: "prod", mult: 1.10 }, flavor: "Every devouring jaw." },
  { id: "fam_frond", name: "Frond Mastery", icon: "🍃", members: byPart("frond"), bonus: { kind: "ep", mult: 1.15 }, flavor: "Every photosynthetic frond." },
  { id: "fam_cilia", name: "Cilia Mastery", icon: "〰️", members: byPart("cilia"), bonus: { kind: "prod", mult: 1.08 }, flavor: "Every beating cilium." },
  { id: "fam_body", name: "Soma Mastery", icon: "⬡", members: byPart("body"), bonus: { kind: "prod", mult: 1.08 }, flavor: "Every extra body." },
];

// The capstone: discover the ENTIRE library.
const ALL = MUTATIONS.map((m) => m.id);
RAW.push({ id: "fam_all", name: "Ancient Genome", icon: "🧬", members: ALL, bonus: { kind: "prod", mult: 1.5 }, flavor: "The complete genome — every mutation that has ever existed." });

// drop any family with no members (defensive)
export const ATLAS_FAMILIES = RAW.filter((f) => f.members.length > 0);
