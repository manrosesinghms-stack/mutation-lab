// Boot + master game loop.

import { state, save, wipe } from "./state.js";
import {
  click,
  buy,
  sellGenerator,
  productionPerSecond,
  effectiveClickPower,
  addBiomass,
  applyOfflineProgress,
  canPrestige,
  doPrestige,
  rollDraft,
  acquireMutation,
  pressureLevel,
  doSpeciate,
  canSpeciate,
  doSplice,
  buyUpgrade,
  marketTick,
  buyReagent,
  sellReagent,
  buyBroker,
  tickMutagen,
  levelUpOrganelle,
  tickCatalyst,
  spendCatalyst,
  setPantheonSlot,
  feedSymbiote,
  setSymbioteAura,
  plantSeed,
  harvestPlot,
  claimColonyNode,
  evolutionStage,
  researchTiers,
  researchName,
  masteriesComplete,
  chooseEvoPath,
  pathChoiceDue,
  buyMachine,
  buyAutomator,
  toggleAutomator,
  automatorOn,
  tickAutomation,
  doTranscend,
  canTranscend,
  buyHelixNode,
  hasHelix,
  buyNode,
  toggleEquip,
  draftSize,
  hasNode,
  autoBuyGenerators,
  doDigest,
  digestActive,
  pruneTempBuffs,
  addTempBuff,
  checkAchievements,
  checkTraits,
  rollVariant,
  grantReroll,
  useReroll,
  fuseMutations,
  rollBiome,
  startChallenge,
  abandonChallenge,
  checkChallenge,
  grantFossil,
  startDailyRun,
  endDailyRun,
  currentWeekly,
  buySkin,
  currentArchetype,
  buildScore,
} from "./economy.js";
import { SKIN_BY_ID } from "./data/skins.js";
import { speciesTier, speciesTierColor } from "./data/tiers.js";
import { PATH_BY_ID } from "./data/paths.js";
import {
  initCreature,
  renderCreature,
  setGrowthFromBiomass,
  resize as resizeCreature,
  onMutationGained,
  prestigeFlash,
  cinematicPulse,
  pulse,
  setStage,
  setSwarm,
  emitProductionMote,
  rebuildVisuals,
  setStress,
  resetParts,
  setEquippedGhosts,
  setReduceMotion,
  setVariant,
  setSkin,
  setAura,
  setHabitat,
  setSpeciesTier,
  setBodyShape,
  setQuality,
  setEyeTracking,
  setSkinShader,
  setBloomCallback,
  spawnBloom,
  collectBloom,
  hasBloom,
  engorgePop,
  exportPhoto,
  exportSpecimenCard,
} from "./creature.js";
import { creatureName } from "./data/names.js";
import { initUI, renderUI, spawnFloatNumber, flashStatus, showDraft, setMuteLabel,
         renderGenomeLab, genomeStatus, openHelp, showChoice, renderChallenges,
         renderHelix, renderSplicer, spliceResult, renderUpgrades, renderMarket,
         renderMutagen, renderReactor, renderPantheon, renderSymbiote, renderGarden,
         renderColony, renderMachines, renderPaths, openPaths } from "./ui.js";
import { SPELLS } from "./data/spells.js";
import { SEASON_BY_ID } from "./data/seasons.js";
import { formatNumber } from "./format.js";
import { getMutation } from "./data/mutations.js";
import { GENERATORS } from "./data/generators.js";
import * as audio from "./audio.js";
import { startMusic, setMusicIntensity, setMusicVolume, setMusicTheme, hasTheme, setMusicStress, setMusicDanger } from "./music.js";
import { initCinematic, playCinematic } from "./cinematic.js";
import { initJuice, burst, shake, updateJuice, flash, setShakeScale, setJuiceReduceMotion, ripple, flyToCounter } from "./juice.js";
import { initBackground, renderBackground, setBackground, setWorldStage, hasBackground, resizeBackground, setBackgroundReduceMotion, setDnaStorm } from "./background.js";

// screen-center of the 3D stage, for big bursts
function stageCenter() {
  const r = document.getElementById("stage").getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ---- wire UI ----
initUI({
  onBuy: (genId, rect) => {
    const tiersBefore = researchTiers(genId);
    if (buy(genId)) {
      const tier = GENERATORS.findIndex((g) => g.id === genId); // 0..4
      audio.playBuy(tier);
      if (rect) burst(rect.left + rect.width / 2, rect.top + rect.height / 2,
                      { count: 12 + tier * 4, color: "#56e39f", spread: 80 + tier * 15 });
      pulse(0.5); // the cell reacts — a new organelle joins the colony on screen
      // research milestone crossed → a satisfying unlock moment
      if (researchTiers(genId) > tiersBefore) {
        audio.playMilestone(); cinematicPulse(); flash("rgba(120,220,255,.3)");
        const c = stageCenter();
        burst(c.x, c.y, { count: 40, color: "#7be3ff", spread: 160, life: 900 });
        flashStatus(`⚗ RESEARCH UNLOCKED — evolved into ${researchName(genId)}!`);
      } else {
        flashStatus("organelle acquired");
      }
    } else {
      flashStatus("not enough biomass");
    }
  },
  onSell: (genId) => {
    const refund = sellGenerator(genId);
    if (refund > 0) { audio.playClick(0); flashStatus(`sold 1 → +${formatNumber(refund)} biomass`); save(); }
    else flashStatus("none to sell");
  },
  onMarketBuy: (id, q) => {
    const c = buyReagent(id, q);
    if (c) { audio.playBuy(1); renderMarket(); save(); }
    else flashStatus("not enough biomass");
  },
  onMarketSell: (id, q) => {
    const g = sellReagent(id, q);
    if (g) { audio.playBuy(2); flashStatus(`sold → +${formatNumber(g)} biomass`); renderMarket(); save(); }
    else flashStatus("nothing to sell");
  },
  onBuyBroker: () => {
    if (buyBroker()) { audio.playMilestone(); renderMarket(); flashStatus("🤝 broker hired — lower fees"); save(); }
    else flashStatus("can't afford a broker");
  },
  onLevelOrganelle: (id) => {
    if (levelUpOrganelle(id)) { audio.playBuy(2); renderMutagen(); flashStatus("🧫 organelle leveled up!"); save(); }
    else flashStatus("not enough Mutagen");
  },
  onCastSpell: (id) => {
    const sp = SPELLS.find((s) => s.id === id);
    if (!sp || !spendCatalyst(sp.cost)) { flashStatus("not enough catalyst"); return; }
    if (Math.random() < 0.10) { flash("rgba(255,80,80,.3)"); flashStatus("🔬 the spell fizzled!"); renderReactor(); save(); return; }
    if (id === "bloom") spawnBloom();
    else if (id === "surge") addTempBuff({ id: "spellsurge", prodMult: 5, durationMs: 20000 });
    else if (id === "biome") { const b = rollBiome(); setBackground(b.background); setHabitat(b.id); }
    else if (id === "overcharge") addBiomass(productionPerSecond() * 300);
    else if (id === "forced") openDraft();
    audio.playMilestone(); cinematicPulse();
    flashStatus(`🔬 cast ${sp.name}`);
    renderReactor(); save();
  },
  onSetPantheon: (slot, gene) => { setPantheonSlot(slot, gene); audio.playBuy(1); renderPantheon(); save(); },
  onFeedSymbiote: () => {
    if (feedSymbiote()) { audio.playBuy(2); renderSymbiote(); flashStatus("🐛 symbiote fed"); save(); }
    else flashStatus("need more biomass to feed");
  },
  onSetAura: (id) => { setSymbioteAura(id); audio.playMilestone(); renderSymbiote(); flashStatus("aura attuned"); save(); },
  onPlant: (i, seedId) => { if (plantSeed(i, seedId)) { audio.playBuy(1); renderGarden(); save(); } },
  onHarvest: (i) => {
    const r = harvestPlot(i);
    if (r) { audio.playMilestone(); flashStatus(`🌱 harvested ${r.seed} → +${formatNumber(r.reward)}${r.mutagen ? " + 🧫" : ""}`); renderGarden(); save(); }
  },
  onClaimColony: (id) => {
    if (claimColonyNode(id)) { audio.playMilestone(); cinematicPulse(); flash("rgba(86,227,159,.4)"); renderColony(); flashStatus("🗺️ territory claimed — colony expands!"); save(); }
    else flashStatus("not enough biomass");
  },
  onBuyMachine: (id) => {
    if (buyMachine(id)) { audio.playBuy(2); renderMachines(); flashStatus("🤖 machine online"); save(); }
    else flashStatus("not enough biomass");
  },
  onBuyAutomator: (id) => {
    if (buyAutomator(id)) { audio.playMilestone(); cinematicPulse(); renderMachines(); flashStatus("⚙️ automator installed — it works for you now"); save(); }
    else flashStatus("not enough biomass");
  },
  onToggleAutomator: (id) => {
    const on = toggleAutomator(id);
    audio.playClick(0); renderMachines(); flashStatus(on ? "⚙️ automator ON" : "○ automator paused"); save();
  },
  onChoosePath: (id) => {
    if (!chooseEvoPath(id)) return;
    const ev = evolutionStage();
    setStage(ev.index, state.runShapeSeed, state.evoPath); // re-shape into the chosen lineage
    applyCreatureSkin(); // recolor the body to the path's palette
    const parts = state.mutations.map((mid) => getMutation(mid)).filter((d) => d && d.part).map((d) => d.part);
    rebuildVisuals(parts, state.mutations.length);
    const col = "#" + ev.color.toString(16).padStart(6, "0");
    audio.playEvolve(); cinematicPulse(); flash(col + "99"); shake(24);
    const c = stageCenter();
    burst(c.x, c.y, { count: 110, color: col, spread: 300, life: 1300 });
    playCinematic(`${ev.pathData.icon} ${ev.pathData.name.toUpperCase()} LINEAGE`, ev.pathData.blurb, col);
    flashStatus(`${ev.pathData.icon} Path chosen: ${ev.pathData.name} — ${ev.pathData.bonusText}`);
    renderPaths();
    save();
  },
  onSave: () => flashStatus(save() ? "saved" : "save failed"),
  onWipe: () => {
    if (confirm("Wipe all progress? This cannot be undone.")) {
      wipe();
      flashStatus("wiped");
      location.reload();
    }
  },
  onEvolve: () => {
    if (!canPrestige()) { flashStatus("not enough biomass to evolve"); return; }
    const prevStage = evolutionStage().index;
    const gained = doPrestige();
    // PRESTIGE EXPLOSION
    prestigeFlash();
    audio.playEvolve();
    flash("rgba(140,90,255,0.55)");
    shake(18);
    const c = stageCenter();
    burst(c.x, c.y, { count: 60, color: "#b88cff", spread: 200, up: 0, life: 900 });
    flashStatus(`evolved! +${formatNumber(gained)} EP · Evolution Rank ${evolutionStage().rank}`);
    openDraft();
    startNewRun();
    maybeStageUp(prevStage);
    save();
  },
  onMute: () => {
    const m = audio.toggleMuted();
    state.muted = m;
    setMuteLabel(m);
    save();
  },
  onToggleAutoBuy: () => {
    const on = state.autoBuyOn !== false;
    state.autoBuyOn = !on;
    flashStatus(`auto-buy ${state.autoBuyOn ? "ON" : "OFF — save up for what you want"}`);
    save();
  },
  onSetVolume: (v) => { state.musicVolume = v; setMusicVolume(v); startMusic(); save(); },
  onSetTheme: (id) => { state.musicTrack = id; setMusicTheme(id); startMusic(); save(); },
  onSetShake: (v) => { state.shake = v; applyShakeSetting(v); save(); },
  onSetReduce: (b) => { state.reduceMotion = b; setReduceMotion(b); setJuiceReduceMotion(b); setBackgroundReduceMotion(b); save(); },
  onSetEyeTrack: (b) => { state.eyeTrack = b; setEyeTracking(b); save(); },
  onSetSeason: (id) => {
    state.season = id;
    const se = SEASON_BY_ID[id];
    if (se && se.bg && hasBackground(se.bg)) { state.background = se.bg; setBackground(se.bg); }
    flashStatus(se && id !== "none" ? `${se.name} season active — +${Math.round(se.prod * 100)}% production` : "season ended");
    save();
  },
  onSetAberration: (b) => {
    state.aberration = b;
    flashStatus(b ? "☣️ ABERRATION — reality strains, but power surges (×2.5)" : "aberration calmed");
    save();
  },
  onSetGraphics: (v) => {
    state.graphics = v;
    setQuality(v);
    // re-seat parts so the new part-cap takes effect immediately
    resetParts();
    const parts = state.mutations.map((id) => getMutation(id)).filter((d) => d && d.part).map((d) => d.part);
    rebuildVisuals(parts, state.mutations.length);
    flashStatus(`graphics: ${v}`);
    save();
  },
  onSetNaming: (v) => { state.namingStyle = v; save(); },
  onSetBackground: (v) => { state.background = v; applyWorld(); save(); },
  onSpeciate: () => {
    const prevStage = evolutionStage().index;
    const res = doSpeciate();
    if (!res) { flashStatus("can't speciate yet — reach the wall first"); return; }
    resetParts();        // new lineage starts bald, re-grows as you draft
    applyCreatureSkin(); // ascend the BASE body to the new species tier
    const tier = speciesTier(state.speciations || 0);
    refreshGhosts();
    audio.playEvolve();
    const tcol = "#" + tier.color.toString(16).padStart(6, "0");
    flash("rgba(255,177,61,0.55)");
    shake(22);
    const c = stageCenter();
    burst(c.x, c.y, { count: 90, color: tcol, spread: 260, up: 0, life: 1100 });
    audio.playRoar();
    cinematicPulse();
    playCinematic(`◆ ${tier.name.toUpperCase()} ◆`, `${res.card.name} · Tier ${state.speciations}`, tcol);
    flashStatus(res.banked
      ? `ASCENDED → ${tier.name} form · banked ${res.card.name} · +${formatNumber(res.gain)} Genome`
      : `ASCENDED → ${tier.name} form · +${formatNumber(res.gain)} Genome (draft mutations to bank a Species card)`);
    grantReroll(1);
    startNewRun();
    maybeStageUp(prevStage);
    save();
  },
  onTranscend: () => {
    if (!canTranscend()) { flashStatus("can't Transcend yet — reach 8 Speciations first"); return; }
    const prevStage = evolutionStage().index;
    const res = doTranscend();
    if (!res) return;
    resetParts();
    applyCreatureSkin();
    // NOTE: do NOT reset the creature to a blob here. Evolution Rank is permanent,
    // so startNewRun()'s setStage() keeps the creature at its hard-earned stage —
    // Transcend rebuilds the run, not your monster.
    refreshGhosts();
    audio.playEvolve(); audio.playRoar();
    cinematicPulse();
    flash("rgba(200,160,255,0.6)"); shake(26);
    const c = stageCenter();
    burst(c.x, c.y, { count: 110, color: "#c8a0ff", spread: 300, up: 0, life: 1300 });
    playCinematic("✦ TRANSCENDENCE ✦", `+${formatNumber(res.gain)} Helix · everything reborn`, "#c8a0ff");
    flashStatus(`✦ TRANSCENDED — +${formatNumber(res.gain)} Helix. The Helix Tree awaits.`);
    startNewRun();
    maybeStageUp(prevStage);
    save();
  },
  onBuyUpgrade: (id) => {
    if (buyUpgrade(id)) { audio.playBuy(2); renderUpgrades(); flashStatus("upgrade purchased!"); save(); }
    else flashStatus("not enough biomass");
  },
  onSplice: (a, b) => {
    const res = doSplice(a, b);
    if (!res) { flashStatus("splicer is recharging…"); return; }
    audio.playMutation(res.isNew ? "legendary" : "rare");
    const c = stageCenter();
    burst(c.x, c.y, { count: res.isNew ? 60 : 36, color: "#39d0c6", spread: 200, life: 900 });
    if (res.isNew) { cinematicPulse(); playCinematic("🧬 " + res.hybrid.name, res.hybrid.flavor, "#39d0c6"); }
    spliceResult(`${res.isNew ? "✨ DISCOVERED " : "spliced "}<b>${res.hybrid.name}</b> — Hybrid Surge ×${res.power.toFixed(1)} for 30s!`);
    renderSplicer();
    save();
  },
  onBuyHelix: (id) => {
    if (buyHelixNode(id)) { audio.playBuy(2); renderHelix(); save(); }
    else flashStatus("not enough Helix");
  },
  onBuyNode: (id) => {
    if (buyNode(id)) { audio.playBuy(2); refreshGhosts(); renderGenomeLab(); genomeStatus("node upgraded"); save(); }
    else genomeStatus("not enough Genome");
  },
  onToggleEquip: (sid) => {
    if (toggleEquip(sid)) { refreshGhosts(); renderGenomeLab(); audio.playMutation("common"); save(); }
    else genomeStatus("Equip slots are full — unequip one, or upgrade “Lineage Slots” in Nodes for more.");
  },
  onExport: () => exportSave(),
  onImport: () => importSave(),
  onFuse: () => {
    const pick = fuseMutations();
    if (!pick) { genomeStatus("need 3 mutations + 2 Genome"); return; }
    resetParts();
    const parts = state.mutations.map((id) => getMutation(id)).filter((d) => d && d.part).map((d) => d.part);
    rebuildVisuals(parts, state.mutations.length);
    refreshGhosts();
    renderGenomeLab();
    audio.playMutation("legendary");
    genomeStatus(`fused → ${pick.name}!`);
    save();
  },
  onStartChallenge: (id) => {
    if (!startChallenge(id)) return;
    resetParts(); refreshGhosts();
    audio.playEvolve(); flash("rgba(255,107,107,.4)");
    flashStatus("⚔️ Challenge begun — your run is reset");
    renderChallenges();
    save();
  },
  onAbandonChallenge: () => {
    abandonChallenge(); resetParts(); refreshGhosts();
    flashStatus("challenge abandoned");
    renderChallenges();
    save();
  },
  onBuySkin: (id) => {
    const sk = buySkin(id);
    if (!sk) { genomeStatus("not enough Genome"); return; }
    applyCreatureSkin();
    audio.playBuy(2);
    renderGenomeLab();
    save();
  },
  onStartDaily: () => {
    startDailyRun(); resetParts(); refreshGhosts();
    audio.playEvolve();
    flashStatus("🎲 Daily run started — same seed for everyone today");
    renderChallenges();
    save();
  },
  onEndDaily: () => {
    endDailyRun();
    flashStatus("daily run finished — best score recorded");
    renderChallenges();
    save();
  },
});

// --- creature DNA sharing: copy your creature as a code, or view a shared one ---
function creatureDNACode() {
  return "MLAB1." + btoa(unescape(encodeURIComponent(JSON.stringify({
    n: creatureName(state.mutations, state.namingStyle || "scientific"),
    m: state.mutations, v: state.variant,
  }))));
}
function copyCreatureDNA() {
  if (navigator.clipboard) navigator.clipboard.writeText(creatureDNACode());
  flashStatus("🧬 creature DNA copied — share it!");
}
function viewSharedDNA() {
  const code = prompt("Paste a creature DNA code (MLAB1.…):");
  if (!code) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.replace(/^MLAB1\./, "").trim()))));
    resetParts();
    const parts = (data.m || []).map((id) => getMutation(id)).filter((d) => d && d.part).map((d) => d.part);
    rebuildVisuals(parts, (data.m || []).length);
    setVariant(data.v || null);
    document.getElementById("creature-name").textContent = data.n || "Unknown Specimen";
    genomeStatus(`viewing "${data.n}" (${(data.m || []).length} mutations) — reload to restore yours`);
  } catch (e) { genomeStatus("invalid DNA code"); }
}
document.getElementById("photo-dna").addEventListener("click", copyCreatureDNA);
document.getElementById("viewdna-btn").addEventListener("click", viewSharedDNA);

// open the mutation draft with reroll support
function openDraft() {
  showDraft(rollDraft(draftSize()), pickMutation, () => {
    if (useReroll()) openDraft();
    else flashStatus("no reroll tokens");
  }, () => flashStatus("skipped — no mutation taken"));
}

// build-dependent aura: colour the creature's glow by its dominant body part
const AURA = { eye: 0x4aa3ff, spike: 0xff5a4a, tentacle: 0xb88cff, jaw: 0xff3355, frond: 0x5be36b, body: 0x39d0c6, cilia: 0x66ffcc };
function updateAura() {
  const counts = {};
  for (const id of state.mutations) { const d = getMutation(id); if (d && d.part) counts[d.part] = (counts[d.part] || 0) + 1; }
  const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  setAura(AURA[top] || 0x66ffcc, top ? 1.1 : 0.6);
}

// Metabolic-pressure spectacle: a red screen-edge vignette that fades in past 70%
// pressure and pulses like a heartbeat once you hit the wall.
// Endgame reality corruption: at 35+ mutations the screen starts to glitch,
// scaling to full at 60. Chromatic vignette + scanlines + periodic frame tears.
const corruptEl = document.getElementById("corruption");
let corruptGlitchAt = 0;
function updateCorruption(elapsed) {
  if (!corruptEl) return;
  const cr = Math.max(0, Math.min(1, ((state.mutations.length || 0) - 35) / 25));
  if (cr <= 0) {
    corruptEl.classList.remove("on");
    document.body.classList.remove("corrupted");
    return;
  }
  corruptEl.style.setProperty("--cr", cr.toFixed(3));
  corruptEl.classList.add("on");
  document.body.classList.add("corrupted");
  // periodic frame-tear glitch, more frequent as corruption deepens
  if (!state.reduceMotion && elapsed - corruptGlitchAt > (5 - cr * 3)) {
    corruptGlitchAt = elapsed;
    corruptEl.classList.remove("glitch");
    void corruptEl.offsetWidth;
    corruptEl.classList.add("glitch");
  }
}

// biomass "tank" fill: progress through the current order of magnitude (log10 %1),
// so the liquid rises then resets each x10 — visible physical growth.
const biomassFillEl = document.getElementById("biomass-fill");
function updateBiomassTank() {
  if (!biomassFillEl) return;
  const b = state.biomass || 0;
  const frac = b < 10 ? b / 10 : (Math.log10(b) % 1);
  biomassFillEl.style.height = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + "%";
}

const pVig = document.getElementById("pressure-vignette");
function updatePressureVignette(pressure) {
  if (!pVig) return;
  // Only a faint hint as you ramp into the wall (0.85 -> 1.0), capped low so it
  // never dominates. No constant heartbeat pulse — the "BODY MAXED" banner is
  // the real signal; this is just ambient reinforcement.
  const t = Math.max(0, Math.min(1, (pressure - 0.85) / 0.15));
  pVig.style.opacity = (t * 0.28).toFixed(3);
  pVig.classList.remove("crit");
}

// Choose the creature's base look: an equipped cosmetic skin wins; otherwise the
// body shows its current Species-Tier palette (so "Wild Type" still escalates
// visibly with each Speciation instead of always looking like the starting cell).
function applyCreatureSkin() {
  const id = state.skin || "default";
  const cosmetic = id !== "default" ? SKIN_BY_ID[id] : null;
  // base body colour: a cosmetic skin wins; otherwise the chosen Evolution Path
  // (so a Crystal creature is cyan, a Predator is molten) — falling back to the
  // species-tier skin only before a path is picked.
  const pathSkin = (!cosmetic && state.evoPath && PATH_BY_ID[state.evoPath]) ? PATH_BY_ID[state.evoPath].skin : null;
  setSkin(cosmetic || pathSkin || speciesTier(state.speciations || 0).skin);
  // premium GLSL shader transformation (Crystal refraction / Galaxy starfield)
  setSkinShader(cosmetic && cosmetic.shader ? cosmetic.shader : null, cosmetic ? hslHex(cosmetic.h, cosmetic.s, cosmetic.l) : 0xffffff);
}
// small HSL→hex for shader tint (matches the skin's palette)
function hslHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (k) => { const x = (k + h * 12) % 12; return l - a * Math.max(-1, Math.min(x - 3, Math.min(9 - x, 1))); };
  const to = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (to(f(0)) << 16) | (to(f(8)) << 8) | to(f(4));
}

function refreshGhosts() {
  setEquippedGhosts((state.equippedSpecies || [])
    .map((id) => (state.species || []).find((s) => s.id === id))
    .filter(Boolean));
}

function exportSave() {
  try {
    const str = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    if (navigator.clipboard) navigator.clipboard.writeText(str);
    genomeStatus("save copied to clipboard");
  } catch (e) { genomeStatus("export failed"); }
}

function importSave() {
  const str = prompt("Paste your exported save string:");
  if (!str) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    Object.assign(state, data);
    save();
    genomeStatus("imported — reloading");
    setTimeout(() => location.reload(), 600);
  } catch (e) { genomeStatus("invalid save string"); }
}

function pickMutation(id) {
  const masteriesBefore = masteriesComplete();
  acquireMutation(id);
  const def = getMutation(id);
  onMutationGained(def && def.part); // hue drift + squash + grow a part
  const rarity = def ? def.rarity : "common";
  audio.playMutation(rarity);
  if (def && def.part) audio.playPartSfx(def.part); // family SFX: hear what grew
  const c = stageCenter();
  if (def && def.alien && !state.seenFirstAlien) {
    // first-ever alien DNA — a memorable one-time beat
    state.seenFirstAlien = true;
    audio.playRoar(); cinematicPulse();
    flash("rgba(57,208,198,0.5)"); shake(16);
    burst(c.x, c.y, { count: 80, color: "#39d0c6", spread: 240, up: 0, life: 1100 });
    playCinematic("👽 ALIEN DNA", "Something not of this world…", "#39d0c6");
  } else if (rarity === "legendary") {
    audio.playMilestone();
    audio.playRoar();
    cinematicPulse();
    flash("rgba(255,177,61,0.5)");
    shake(14);
    burst(c.x, c.y, { count: 70, color: "#ffb13d", spread: 220, up: 0, life: 1000 });
    playCinematic("LEGENDARY EVOLUTION", def ? def.name : "", "#ffb13d");
  } else {
    const isRare = rarity === "rare";
    const color = isRare ? "#56a0ff" : "#9fb3c8";
    burst(c.x, c.y, { count: isRare ? 44 : 24, color, spread: isRare ? 180 : 130, up: 0, life: isRare ? 900 : 750 });
  }
  flashStatus(`mutation gained: ${def ? def.name : id}`);
  // Genome Atlas: completing a mastery family is a permanent, celebrated milestone
  if (masteriesComplete() > masteriesBefore) {
    audio.playMilestone(); audio.playRoar(); cinematicPulse();
    flash("rgba(120,220,255,.45)"); shake(20);
    burst(c.x, c.y, { count: 90, color: "#7be3ff", spread: 260, up: 0, life: 1200 });
    playCinematic("🧬 MASTERY UNLOCKED", "A Genome Atlas family is complete — permanent bonus!", "#7be3ff");
    flashStatus("🧬 GENOME MASTERY COMPLETE — permanent bonus unlocked! (see Codex)");
  }
  if (state.mutations.length >= 14 && !state.instabilityResolved) triggerInstability();
  save();
}

// ---- Idle automation (Helix nodes Auto-Evolve / Auto-Speciate) ----
let autoT = 0;
function autoTick(dt) {
  if (!hasHelix("autoevolve") && !hasHelix("autospec")) return;
  autoT += dt;
  if (autoT < 6) return;
  // never act while the player is mid-draft / mid-event
  if (!document.getElementById("draft-modal").classList.contains("hidden")) return;
  if (!document.getElementById("choice-modal").classList.contains("hidden")) return;
  autoT = 0;
  if (hasHelix("autospec") && canSpeciate()) { autoSpeciate(); return; }
  if (hasHelix("autoevolve") && canPrestige()) { autoEvolve(); }
}
function autoEvolve() {
  const gained = doPrestige();
  if (!gained) return;
  // auto-resolve Genetic Instability so the modal never blocks idle play
  if (state.mutations.length >= 14 && !state.instabilityResolved) {
    state.instabilityResolved = true;
    state.stabilizeBonus = Math.max(state.stabilizeBonus || 1, 1.5);
  }
  const ids = rollDraft(draftSize());
  if (ids.length) {
    const id = ids[(Math.random() * ids.length) | 0];
    acquireMutation(id);
    const d = getMutation(id);
    onMutationGained(d && d.part);
  }
  startNewRun(true);
  save();
}
function autoSpeciate() {
  const prevStage = evolutionStage().index;
  const res = doSpeciate();
  if (!res) return;
  resetParts();
  applyCreatureSkin();
  refreshGhosts();
  startNewRun(true);
  maybeStageUp(prevStage);
  save();
}

let instabilityOpen = false;
function triggerInstability() {
  if (instabilityOpen) return;
  instabilityOpen = true;
  showChoice("⚠ GENETIC INSTABILITY", "Your genome is fraying — choose your fate:", [
    { label: "🧬 Stabilize", desc: "+50% production this run. Safe.", color: "#56e39f" },
    { label: "☣ Embrace Chaos", desc: "3 random mutations erupt now. Risky & weird.", color: "#b88cff" },
  ], (choice) => {
    state.instabilityResolved = true;
    instabilityOpen = false;
    if (choice === 0) {
      state.stabilizeBonus = (state.stabilizeBonus || 1) * 1.5;
      flash("rgba(86,227,159,.4)");
      flashStatus("genome stabilized — +50% production this run");
    } else {
      state.embraceChaos = true;
      flash("rgba(184,140,255,.5)"); shake(14);
      for (let i = 0; i < 3; i++) { const ids = rollDraft(1); pickMutation(ids[0]); }
      flashStatus("☣ CHAOS EMBRACED — 3 mutations erupted!");
    }
    save();
  });
}

// ---- wire 3D creature ----
const canvas = document.getElementById("creature-canvas");
// click combo: rapid clicks raise pitch + bump particles
let combo = 0;
let lastClickAt = 0;
initCreature(canvas, (sx, sy) => {
  const now = performance.now();
  combo = now - lastClickAt < 600 ? combo + 1 : 0;
  lastClickAt = now;
  const crit = combo >= 12; // chained-click "critical extraction"
  const gain = click(crit ? 5 : 1); // crit multiplies the actual payout, not just the sparkle
  state.totalClicks = (state.totalClicks || 0) + 1;
  startMusic(); // first user gesture — kick off ambient music
  // escalating combo feedback: the heat ramps from green → gold → orange → magenta
  // as you chain clicks, so a long streak FEELS like it's building toward something.
  const tier = Math.min(4, Math.floor(combo / 12)); // 0..4
  const HEAT = ["#56e39f", "#ffd76b", "#ffae4d", "#ff7ac0", "#b88cff"];
  const RING = ["#7be3b0", "#ffd76b", "#ffae4d", "#ff7ac0", "#b88cff"];
  const color = crit ? HEAT[tier] : "#56e39f";
  const prefix = crit ? (tier >= 3 ? "🔥" : "⚡") : "+";
  spawnFloatNumber(sx, sy, prefix + formatNumber(gain));
  audio.playClick(combo);
  // each NEW crit tier (12/24/36/48) gets a bigger flourish + a banner — clear escalation
  if (combo > 0 && combo % 12 === 0) {
    const names = ["", "⚡ CRITICAL EXTRACTION ×5", "🔥 SUPERCRIT — combo ×24", "🔥 FRENZIED HARVEST — ×36", "💥 MUTAGENIC OVERLOAD — ×48!"];
    flashStatus(names[Math.min(4, combo / 12)] || names[4]);
    audio.playMilestone();
    flash(color + "33"); // hex8 ~20% alpha tint
    shake(4 + tier * 3);
    burst(sx, sy, { count: 18 + tier * 6, color, spread: 120 + tier * 20, life: 800 });
  }
  pulse(crit ? 0.6 : 0.4);
  ripple(sx, sy, RING[tier]);
  flyToCounter(sx, sy, crit ? color : "#7be3b0");
  burst(sx, sy, { count: 4 + Math.min(combo, 10), color, spread: 55 + tier * 12, life: 600 });
});

initJuice();
initBackground(document.getElementById("bg-canvas"));
initCinematic();

// restore creature parts from a saved game (visual mutations only)
if (state.runShapeSeed == null) state.runShapeSeed = 1;
setQuality(state.graphics || "medium"); // apply graphics quality (part cap, resolution, effects)
setStage(evolutionStage().index, state.runShapeSeed, state.evoPath); // permanent evolution stage (+ chosen path) drives the body BEFORE seating parts
const savedParts = state.mutations
  .map((id) => getMutation(id))
  .filter((d) => d && d.part)
  .map((d) => d.part);
rebuildVisuals(savedParts, state.mutations.length);
refreshGhosts(); // restore equipped-species ghost overlays

// apply persisted settings on boot
const SHAKE_SCALE = { off: 0, subtle: 0.4, full: 1 };
function applyShakeSetting(level) { setShakeScale(SHAKE_SCALE[level] != null ? SHAKE_SCALE[level] : 0.4); }

audio.setMuted(!!state.muted);
setMuteLabel(!!state.muted);
setMusicVolume(state.musicVolume == null ? 0.5 : state.musicVolume);
if (!hasTheme(state.musicTrack)) state.musicTrack = "lofi"; // migrate old/unknown
setMusicTheme(state.musicTrack);
applyShakeSetting(state.shake || "subtle");
setReduceMotion(!!state.reduceMotion);
setJuiceReduceMotion(!!state.reduceMotion);
setBackgroundReduceMotion(!!state.reduceMotion);
setEyeTracking(!!state.eyeTrack);
if (!hasBackground(state.background)) state.background = "world"; // default: backdrop escalates with evolution stage
// Apply the backdrop: "world" = stage-driven escalation, anything else = locked theme.
let _lastWorldStage = -1;
function applyWorld() {
  if ((state.background || "world") === "world") { _lastWorldStage = evolutionStage().index; setWorldStage(_lastWorldStage); }
  else setBackground(state.background);
}
applyWorld();
setHabitat(state.biome); // theme the 3D habitat to the run's biome
setVariant(state.variant); // apply any rare run variant
applyCreatureSkin();       // base body = cosmetic skin, else current species tier
// (crown/aura/orbiters already restored by setStage() above — driven by permanent rank)
if (pathChoiceDue() && !state.pathPrompted) { state.pathPrompted = true; setTimeout(() => openPaths(), 1500); }

const BIOME_ICON = { ocean: "🌊", volcanic: "🌋", verdant: "🌿", glacial: "❄️", abyssal: "🌌", voidrift: "🕳️" };
function startNewRun(silent) {
  // roll a biome → sets a build buff + 3D habitat for this run. In "world" mode the
  // 2D backdrop tracks your evolution stage (not the biome), so the world escalates.
  const biome = rollBiome();
  if ((state.background || "world") === "world") applyWorld(); else setBackground(biome.background);
  setHabitat(biome.id);
  // re-roll the per-run silhouette jitter, then apply the PERMANENT evolution
  // stage (drives body + crown + aura + orbiters). Rank never resets, so the
  // creature keeps its evolved form across every prestige instead of going blob.
  state.runShapeSeed = Math.floor(Math.random() * 100000);
  setStage(evolutionStage().index, state.runShapeSeed, state.evoPath);
  const parts = state.mutations.map((id) => getMutation(id)).filter((d) => d && d.part).map((d) => d.part);
  rebuildVisuals(parts, state.mutations.length);
  if (!silent) flashStatus(`${BIOME_ICON[biome.id] || "🌍"} ${biome.name} — ${biome.desc}`);
  rollAndApplyVariant(silent);
}

// Fire the big "NEW EVOLUTION STAGE" moment when a prestige pushes the permanent
// rank across a macro-stage boundary (Cell→Colony→Predator→Apex→Planetary→Cosmic).
// No-op when the stage didn't change, so it never spams on ordinary Evolves.
function maybeStageUp(prevStageIdx) {
  const ns = evolutionStage();
  if (ns.index <= prevStageIdx) return;
  const col = "#" + ns.color.toString(16).padStart(6, "0");
  cinematicPulse();
  flash(col + "99");
  shake(30);
  const c = stageCenter();
  burst(c.x, c.y, { count: 130, color: col, spread: 340, up: 0, life: 1500 });
  audio.playRoar();
  playCinematic(`✦ STAGE ${ns.index + 1}: ${ns.name.toUpperCase()} ✦`, ns.blurb, col);
  setTimeout(() => flashStatus(`✦ NEW STAGE — your creature is now a ${ns.name}! (Evolution Rank ${ns.rank})`), 30);
  maybePromptPath();
}

// First time the creature reaches the Colony stage with no lineage chosen, open
// the path picker — the moment the creature gets its identity. Shown once.
function maybePromptPath() {
  if (!pathChoiceDue() || state.pathPrompted) return;
  state.pathPrompted = true;
  save();
  setTimeout(() => openPaths(), 900); // let the stage cinematic land first
}

function rollAndApplyVariant(silent) {
  const v = rollVariant();
  setVariant(state.variant);
  if (!v || silent) return; // skip the fanfare during automation
  const col = v === "golden" ? "#ffd76b" : v === "crystal" ? "#9fe8ff" : "#7a2aff";
  flash(v === "golden" ? "rgba(255,215,107,.5)" : v === "crystal" ? "rgba(159,232,255,.5)" : "rgba(122,42,255,.55)");
  shake(16);
  const c = stageCenter();
  burst(c.x, c.y, { count: 80, color: col, spread: 250, up: 0, life: 1200 });
  audio.playMilestone();
  const mult = v === "void" ? 3 : v === "crystal" ? 1.5 : 2;
  flashStatus(`✨ ${v.toUpperCase()} ORGANISM! ×${mult} production this run`);
}

// first-ever launch: pop the How-to-Play so players aren't lost
if (!state.seenHelp) {
  state.seenHelp = true;
  setTimeout(openHelp, 500);
  save();
}

// announce this week's event
{
  const wk = currentWeekly();
  setTimeout(() => flashStatus(`📅 ${wk.name}: ${wk.desc}`), state.seenHelp ? 1400 : 4000);
}

// --- Mitogen Bloom: golden clickable spawn -> frenzy buff (active-play upside) ---
setBloomCallback((sx, sy) => {
  state.bloomCaught = true;
  const prod = productionPerSecond();
  const r = Math.random();
  let label, sub, color = "#ffd76b";
  if (r < 0.42) {                       // Frenzy
    addTempBuff({ id: "bloom", prodMult: 4, durationMs: 20000 });
    label = "⚡ MITOGEN FRENZY"; sub = "×4 production · 20s";
  } else if (r < 0.66) {                // Lucky — instant biomass lump
    const lump = Math.max(50, Math.floor(prod * 600 + state.biomass * 0.10));
    addBiomass(lump); color = "#56e39f";
    label = "🍀 LUCKY!"; sub = `+${formatNumber(lump)} biomass`;
  } else if (r < 0.84) {                // Click Frenzy
    addTempBuff({ id: "clickfrenzy", clickMult: 7, durationMs: 15000 }); color = "#9fe8ff";
    label = "👆 CLICK FRENZY"; sub = "×7 click power · 15s";
  } else if (r < 0.95) {                // Cosmic (rare big)
    addTempBuff({ id: "cosmic", prodMult: 7, durationMs: 25000 }); color = "#b88cff";
    label = "🌌 COSMIC BLOOM"; sub = "×7 production · 25s";
  } else {                              // Wrath — risky 60/40
    if (Math.random() < 0.6) {
      const jackpot = Math.max(100, Math.floor(prod * 1800 + state.biomass * 0.25));
      addBiomass(jackpot); color = "#ff6b6b";
      label = "💀 WRATH → JACKPOT"; sub = `+${formatNumber(jackpot)} biomass`;
    } else {
      state.biomass = Math.floor(state.biomass * 0.75);
      addTempBuff({ id: "wrath", prodMult: 0.5, durationMs: 12000 }); color = "#ff3344";
      label = "💀 WRATH"; sub = "backfired — production halved 12s";
    }
  }
  audio.playMilestone();
  cinematicPulse();
  flash(color + "88"); // hex8: ~53% alpha tint
  burst(sx, sy, { count: 60, color, spread: 200, life: 1000 });
  playCinematic(label, sub, color);
  flashStatus(`${label} — ${sub}`);
});
// ---- Leeches (parasites that drain production; pop for a refund + interest) ----
const leechStage = document.getElementById("stage");
let leeches = [];
function spawnLeech() {
  const w = leechStage.clientWidth, h = leechStage.clientHeight;
  if (w < 80 || leeches.length >= 3) return;
  const el = document.createElement("div");
  el.className = "leech";
  const L = { el, eaten: 0, x: w * 0.3 + Math.random() * w * 0.4, y: h * 0.3 + Math.random() * h * 0.4 };
  el.style.left = (L.x - 18) + "px"; el.style.top = (L.y - 18) + "px";
  el.addEventListener("pointerdown", (e) => { e.stopPropagation(); popLeech(L, e); });
  leechStage.appendChild(el);
  leeches.push(L);
  flashStatus("🪱 A leech latched on — pop it to reclaim what it eats!");
}
function popLeech(L, e) {
  const refund = Math.floor(L.eaten * 1.15);
  addBiomass(refund);
  burst(e ? e.clientX : leechStage.clientWidth / 2, e ? e.clientY : 200, { count: 26, color: "#b06bff", spread: 130, life: 700 });
  audio.playMilestone();
  flashStatus(`🪱 leech popped — reclaimed +${formatNumber(refund)} (×1.15)`);
  L.el.remove();
  leeches = leeches.filter((x) => x !== L);
}
function drainLeeches(rate, dt) {
  for (const L of leeches) {
    const eat = rate * 0.02 * dt;
    state.biomass = Math.max(0, state.biomass - eat);
    L.eaten += eat;
  }
}
setInterval(() => {
  const chance = state.aberration ? 0.95 : 0.5; // Aberration mode = far more leeches
  if (((state.prestiges || 0) >= 1 || (state.speciations || 0) >= 1) && leeches.length < 3 && Math.random() < chance) spawnLeech();
}, state.aberration ? 18000 : 45000);

// ~one bloom per minute when none is active; explain it the first time
setInterval(() => {
  if (hasBloom() || Math.random() >= 0.5) return;
  spawnBloom();
  if (!state.seenBloomHint) {
    state.seenBloomHint = true;
    flashStatus("✨ A golden Bloom grew on your cell — click it for a frenzy!");
    save();
  }
  // Bloom Forager automator: auto-collect shortly after it appears
  if (automatorOn("forager")) setTimeout(() => { if (hasBloom()) collectBloom(); }, 1500);
}, 30000);

// ---- Drifters: ambient clickable visitors that float across the pond so there's
// always something happening (Cookie-Clicker golden-cookie energy). Each drifts
// edge-to-edge; click it for a reward, miss it and it swims away. ----
const DRIFTERS = [
  { id: "microbe", emoji: "🦠", w: 30, color: "#9be36b",
    act() { const g = Math.max(80, productionPerSecond() * 45 + effectiveClickPower() * 15); addBiomass(g); return ["🦠 devoured a rival cell", "+" + formatNumber(g) + " biomass"]; } },
  { id: "prey", emoji: "🦐", w: 28, color: "#6fd6ff",
    act() { const g = Math.max(60, productionPerSecond() * 28 + effectiveClickPower() * 10); addBiomass(g); return ["🦐 caught drifting prey", "+" + formatNumber(g) + " biomass"]; } },
  { id: "spore", emoji: "✨", w: 24, color: "#ffd76b",
    act() { addTempBuff({ id: "spore", prodMult: 4, durationMs: 15000 }); return ["✨ golden spore", "×4 production · 15s"]; } },
  { id: "dna", emoji: "🧬", w: 12, color: "#39d0c6",
    act() { openDraft(); return ["🧬 stray DNA strand", "a free mutation draft!"]; } },
  { id: "wisp", emoji: "🔆", w: 6, color: "#b88cff",
    act() { const g = Math.max(200, productionPerSecond() * 360 + (state.biomass || 0) * 0.05); addBiomass(g); return ["🔆 mitogen wisp — JACKPOT", "+" + formatNumber(g) + " biomass"]; } },
];
function pickDrifter() { const tot = DRIFTERS.reduce((s, d) => s + d.w, 0); let r = Math.random() * tot; for (const d of DRIFTERS) { if ((r -= d.w) <= 0) return d; } return DRIFTERS[0]; }
let drifters = [];
// the visible pond = the creature canvas, NOT the full stage (which sits behind
// the right UI panel) — so drifters never float over your menus.
function pondWidth() {
  const c = document.getElementById("creature-canvas");
  return (c && c.clientWidth) || leechStage.clientWidth;
}
function spawnDrifter() {
  const w = pondWidth(), h = leechStage.clientHeight;
  if (w < 140 || drifters.length >= 3) return;
  const d = pickDrifter();
  const el = document.createElement("div");
  el.className = "drifter";
  el.textContent = d.emoji;
  el.style.setProperty("--dc", d.color);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const D = { el, d, dir, x: dir > 0 ? -40 : w + 40, baseY: h * (0.22 + Math.random() * 0.45), vx: dir * (26 + Math.random() * 20), t: Math.random() * 6 };
  el.style.left = D.x + "px"; el.style.top = D.baseY + "px";
  el.addEventListener("pointerdown", (e) => { e.stopPropagation(); catchDrifter(D, e); });
  leechStage.appendChild(el);
  drifters.push(D);
}
function catchDrifter(D, e) {
  if (D._caught) return; D._caught = true;
  const [label, sub] = D.d.act();
  const x = e ? e.clientX : leechStage.clientWidth / 2, y = e ? e.clientY : 200;
  burst(x, y, { count: 30, color: D.d.color, spread: 150, life: 800 });
  audio.playMilestone(); ripple(x, y, D.d.color); flyToCounter(x, y, D.d.color);
  flashStatus(`${label} — ${sub}`);
  D.el.remove(); drifters = drifters.filter((z) => z !== D); save();
}
function updateDrifters(dt) {
  if (!drifters.length) return;
  const w = pondWidth();
  for (const D of [...drifters]) {
    D.t += dt; D.x += D.vx * dt;
    D.el.style.left = D.x.toFixed(0) + "px";
    if (!state.reduceMotion) D.el.style.top = (D.baseY + Math.sin(D.t * 1.5) * 14).toFixed(0) + "px";
    if (D.x < -70 || D.x > w + 70) { D.el.remove(); drifters = drifters.filter((z) => z !== D); } // swam away (missed)
  }
}
let seenDrifter = false;
setInterval(() => {
  if (state.biomass > 500 || (state.prestiges || 0) >= 1 || (state.speciations || 0) >= 1) {
    const before = drifters.length;
    spawnDrifter();
    if (drifters.length > before && !seenDrifter) { seenDrifter = true; flashStatus("👀 Something's drifting through the pond — click it!"); }
  }
}, 14000);

// --- Photo Mode (hide UI, free-orbit, save a screenshot of your creature) ---
const appEl = document.getElementById("app");
const photoBar = document.getElementById("photo-bar");
const relayout = () => { resizeCreature(); resizeBackground(); };
// "OMG screenshot" scale tool: cycle a size-class reference for that viral
// "look how big my creature got" comparison. off → mouse → … → galaxy.
const SCALE_REFS = [
  null,
  { e: "🦠", b: "Microbe-class", s: "~10 µm" },
  { e: "🐁", b: "Mouse-class", s: "~7 cm" },
  { e: "🧍", b: "Human-class", s: "~1.8 m" },
  { e: "🏠", b: "House-class", s: "~8 m" },
  { e: "🐋", b: "Whale-class", s: "~30 m" },
  { e: "🗼", b: "Tower-class", s: "~300 m" },
  { e: "🏔️", b: "Mountain-class", s: "~4 km" },
  { e: "🌍", b: "Planet-class", s: "~12,700 km" },
  { e: "🌌", b: "Galaxy-class", s: "~100,000 ly" },
];
let scaleIdx = 0;
const scaleBadge = document.getElementById("scale-badge");
function renderScaleBadge() {
  const r = SCALE_REFS[scaleIdx];
  const btn = document.getElementById("photo-scale");
  if (!r) {
    scaleBadge.classList.add("hidden");
    if (btn) btn.textContent = "📏 Scale: off";
    return;
  }
  scaleBadge.classList.remove("hidden");
  scaleBadge.innerHTML = `<span class="se">${r.e}</span><span class="st"><b>${r.b}</b><span>specimen size · ${r.s}</span></span>`;
  if (btn) btn.textContent = `📏 Scale: ${r.b}`;
}
document.getElementById("photo-scale").addEventListener("click", () => {
  scaleIdx = (scaleIdx + 1) % SCALE_REFS.length;
  renderScaleBadge();
});
document.getElementById("photo-btn").addEventListener("click", () => {
  appEl.classList.add("photo-mode");
  photoBar.classList.remove("hidden");
  renderScaleBadge();
  setTimeout(relayout, 60);
});
document.getElementById("photo-exit").addEventListener("click", () => {
  appEl.classList.remove("photo-mode");
  photoBar.classList.add("hidden");
  scaleBadge.classList.add("hidden");
  setTimeout(relayout, 60);
});
document.getElementById("photo-shot").addEventListener("click", () => {
  const name = creatureName(state.mutations, state.namingStyle || "scientific");
  const sub = `${state.mutations.length} mutations · evolution ${state.prestiges || 0} · Mutation Lab`;
  const url = exportPhoto(name, sub, SCALE_REFS[scaleIdx]);
  if (!url) { flashStatus("screenshot failed"); return; }
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[^a-z0-9]+/gi, "_") + ".png";
  a.click();
  flashStatus("📸 screenshot saved");
});

// --- Specimen Card: shareable portrait of the monster + its build stats ---
let _cardURL = null;
function specimenLines() {
  const st = evolutionStage();
  return [
    `${st.name} · Day ${(state.prestiges || 0) + 1}`,
    `${formatNumber(productionPerSecond())} biomass/sec`,
    `${new Set(state.mutations).size} mutations · ${state.prestiges || 0} evolutions · ${state.speciations || 0} species`,
  ];
}
function topMutations(n = 6) {
  const order = { legendary: 0, rare: 1, common: 2 };
  const seen = new Set(), out = [];
  const list = state.mutations.map(getMutation).filter(Boolean)
    .sort((a, b) => (order[a.rarity] ?? 3) - (order[b.rarity] ?? 3));
  for (const d of list) { if (seen.has(d.id)) continue; seen.add(d.id); out.push({ name: d.name, rarity: d.rarity }); if (out.length >= n) break; }
  return out;
}
function openSpecimenCard() {
  const url = exportSpecimenCard({
    name: creatureName(state.mutations, state.namingStyle || "scientific"),
    archetype: currentArchetype(),
    score: buildScore(),
    lines: specimenLines(),
    muts: topMutations(6),
    dna: creatureDNACode(),
    scaleRef: SCALE_REFS[scaleIdx],
  });
  if (!url) { flashStatus("card render failed"); return; }
  _cardURL = url;
  document.getElementById("card-img").src = url;
  document.getElementById("card-modal").classList.remove("hidden");
}
async function copyCardImage() {
  try {
    const blob = await (await fetch(_cardURL)).blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    flashStatus("📋 card image copied — paste it anywhere!");
  } catch (e) { flashStatus("copy not supported — use Download instead"); }
}
async function shareCard() {
  try {
    const blob = await (await fetch(_cardURL)).blob();
    const file = new File([blob], "mutation-lab-specimen.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "My Mutation Lab specimen", text: "Look what I grew in Mutation Lab 🧬" });
    } else { flashStatus("share not supported here"); }
  } catch (e) { /* user cancelled */ }
}
document.getElementById("photo-card").addEventListener("click", openSpecimenCard);
document.getElementById("card-close").addEventListener("click", () => document.getElementById("card-modal").classList.add("hidden"));
document.getElementById("card-copy").addEventListener("click", copyCardImage);
document.getElementById("card-download").addEventListener("click", () => {
  if (!_cardURL) return;
  const a = document.createElement("a");
  a.href = _cardURL;
  a.download = creatureName(state.mutations, state.namingStyle || "scientific").replace(/[^a-z0-9]+/gi, "_") + "_card.png";
  a.click();
  flashStatus("⬇ card downloaded");
});
document.getElementById("card-dna").addEventListener("click", copyCreatureDNA);
{
  const shareBtn = document.getElementById("card-share");
  if (navigator.share) { shareBtn.classList.remove("hidden"); shareBtn.addEventListener("click", shareCard); }
}
// expose so milestone moments (new stage / Speciate) can offer the card
window.__openSpecimenCard = openSpecimenCard;

// --- Digest button (opt-in biomass sink -> production surge) ---
document.getElementById("digest-btn").addEventListener("click", () => {
  if (digestActive()) { flashStatus("🍴 still digesting — wait for the surge to finish"); return; }
  const res = doDigest();
  if (!res) { flashStatus("not enough biomass to digest"); return; }
  engorgePop();
  audio.playBuy(3);
  const c = stageCenter();
  burst(c.x, c.y, { count: 24, color: "#b88cff", spread: 120 });
  flashStatus(`digested → ×${res.mult.toFixed(1)} production for 15s`);
  save();
});

// --- Boss Organisms: a rival cell appears; click to destroy it for Genome + a free draft ---
const bossEl = document.getElementById("boss");
const bossNameEl = document.getElementById("boss-name");
const bossTimerEl = document.getElementById("boss-timer");
const bossHpFill = document.getElementById("boss-hp-fill");
const BOSS_NAMES = ["Viral Queen", "Ancient Amoeba", "Genome Eater", "Titan Cell", "Parasite Prime", "Rogue Mitochondrion"];
let boss = null;

function spawnBoss() {
  if (boss) return;
  const stage = document.getElementById("stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  if (w < 80) return;
  const maxHp = 12 + Math.min((state.prestiges || 0) * 2 + (state.speciations || 0) * 6, 40);
  boss = { hp: maxHp, maxHp, name: BOSS_NAMES[(Math.random() * BOSS_NAMES.length) | 0], timeLeft: 16,
    x: w * 0.3 + Math.random() * w * 0.4, y: h * 0.25 + Math.random() * h * 0.4,
    vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60 };
  bossNameEl.textContent = boss.name;
  bossEl.classList.remove("hidden");
  // arrival spectacle: red flash + alarm roar + cinematic intro
  flash("rgba(255,40,48,0.4)"); shake(12);
  audio.playRoar();
  cinematicPulse();
  const sub = state.seenFirstBoss ? "It's draining your biomass — destroy it!" : "A rival cell! Click it down before it drains you.";
  if (!state.seenFirstBoss) { state.seenFirstBoss = true; save(); }
  playCinematic("⚠ " + boss.name, sub, "#ff5a4a");
  flashStatus(`⚠ ${boss.name} appeared — it's draining your biomass! Click it down fast!`);
  audio.playMutation("rare");
}

const bossCellEl = document.getElementById("boss-cell");
bossCellEl.addEventListener("pointerdown", (e) => {
  if (!boss) return;
  boss.hp -= 1;
  // punchy hit feedback: recoil, damage number, spark burst, tiny shake
  bossCellEl.classList.remove("boss-hit"); void bossCellEl.offsetWidth; bossCellEl.classList.add("boss-hit");
  spawnFloatNumber(e.clientX, e.clientY, "-1");
  burst(e.clientX, e.clientY, { count: 12, color: "#ff6b6b", spread: 80, life: 500 });
  shake(4);
  audio.playClick(0);
  if (boss.hp <= 0) {
    const reward = 4 + (state.prestiges || 0) + (state.speciations || 0) * 3;
    state.genome = (state.genome || 0) + reward;
    const c = stageCenter();
    const bx = boss.x, by = boss.y; // explode AT the boss
    flash("rgba(86,227,159,.45)"); shake(18);
    // death spectacle: the rival bursts into DNA shards + biomass + a reward shower
    burst(bx, by, { count: 50, color: "#ff6b6b", spread: 260, up: 0, life: 700 });   // it ruptures
    burst(bx, by, { count: 40, color: "#56e39f", spread: 200, up: 0, life: 1100 });  // DNA shards
    burst(bx, by, { count: 30, color: "#9fe8ff", spread: 150, up: 0, life: 1300 });  // genetic mist
    setTimeout(() => burst(c.x, c.y, { count: 50, color: "#ffd76b", spread: 90, up: 90, life: 1400 }), 160); // reward shower rises
    audio.playMilestone();
    audio.playRoar();
    cinematicPulse();
    playCinematic(boss.name + " SLAIN", `+${reward} Genome`, "#56e39f");
    grantReroll(1);
    const fossil = Math.random() < 0.4 ? grantFossil() : null;
    flashStatus(`💥 ${boss.name} destroyed! +${reward} Genome${fossil ? ` + 🦴 ${fossil}` : ""} + a free mutation`);
    boss = null;
    bossEl.classList.add("hidden");
    openDraft();
    save();
  }
});

setInterval(() => {
  if (!boss) return;
  const stage = document.getElementById("stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  boss.timeLeft -= 0.1;
  if (boss.timeLeft <= 0) { flashStatus(`${boss.name} escaped...`); boss = null; bossEl.classList.add("hidden"); return; }
  boss.x += boss.vx * 0.1; boss.y += boss.vy * 0.1;
  if (boss.x < 70 || boss.x > w - 70) boss.vx *= -1;
  if (boss.y < 70 || boss.y > h - 130) boss.vy *= -1;
  boss.x = Math.max(70, Math.min(w - 70, boss.x));
  boss.y = Math.max(70, Math.min(h - 130, boss.y));
  bossEl.style.left = (boss.x - 65) + "px";
  bossEl.style.top = (boss.y - 60) + "px";
  bossTimerEl.textContent = Math.ceil(boss.timeLeft);
  bossHpFill.style.width = (boss.hp / boss.maxHp * 100) + "%";
  // THREAT: while it lives, the rival cell leeches your biomass — scaled to your
  // INCOME (it eats ~70% of your production) so it stays a real threat at any
  // stage, with a floor of 1.5%/sec of biomass for idle/low-income moments.
  if (state.biomass > 0) {
    const incomeDrain = productionPerSecond() * 0.07; // 70%/sec over 10 ticks
    const drain = Math.min(state.biomass, Math.max(state.biomass * 0.0015, incomeDrain));
    state.biomass = Math.max(0, state.biomass - drain);
    boss._leech = (boss._leech || 0) + drain;
    boss._leechT = (boss._leechT || 0) + 0.1;
    if (boss._leechT >= 1) { // "−X" feedback once a second
      spawnFloatNumber(boss.x, boss.y - 36, "-" + formatNumber(boss._leech));
      boss._leech = 0; boss._leechT = 0;
    }
  }
  // the cell visibly shrinks as you damage it (satisfying progress)
  bossCellEl.style.transform = `scale(${(0.55 + 0.45 * (boss.hp / boss.maxHp)).toFixed(3)})`;
}, 100);

// spawn a boss every ~75s once you've evolved at least once
setInterval(() => {
  if (!boss && (state.prestiges || 0) >= 1 && Math.random() < 0.4) spawnBoss();
}, 30000);
window.__spawnBoss = spawnBoss; // for testing

// Biomass Exchange: prices random-walk every 4s; refresh the modal if it's open
setInterval(() => {
  marketTick();
  const mm = document.getElementById("market-modal");
  if (mm && !mm.classList.contains("hidden")) renderMarket();
}, 4000);

// ---- Progressive disclosure: deeper systems stay hidden until they're relevant,
// so a new player's first minutes are clean (click → organelle → Evolve → draft)
// instead of a wall of 16 buttons. Unlocks are STICKY (once shown, always shown —
// they don't re-lock after a Speciate wipe) and fire a one-time "unlocked!" toast.
const FEATURE_UNLOCKS = [
  { id: "digest-btn",   when: (s) => (s.lifetimeBiomass || 0) >= 150,  label: "Digest" },
  { id: "codex-btn",    when: (s) => (s.prestiges || 0) >= 1 || new Set(s.mutations).size >= 1, label: "Codex" },
  { id: "paths-btn",    when: (s) => (s.evolutionRank || 0) >= 1,      label: "Evolution Paths" },
  { id: "museum-btn",   when: (s) => (s.prestiges || 0) >= 1,          label: "Species Museum" },
  { id: "mutagen-btn",  when: (s) => (s.lifetimeBiomass || 0) >= 3e3,  label: "Mutagen" },
  { id: "market-btn",   when: (s) => (s.lifetimeBiomass || 0) >= 5e4,  label: "Biomass Market" },
  { id: "splice-btn",   when: (s) => new Set(s.mutations).size >= 4,   label: "Gene Splicer" },
  { id: "garden-btn",   when: (s) => (s.lifetimeBiomass || 0) >= 1e5,  label: "Petri Garden" },
  { id: "reactor-btn",  when: (s) => (s.lifetimeBiomass || 0) >= 5e5,  label: "Reactor" },
  { id: "machines-btn", when: (s) => (s.lifetimeBiomass || 0) >= 1e6,  label: "Automation Bay" },
  { id: "chal-btn",     when: (s) => (s.speciations || 0) >= 1 || (s.prestiges || 0) >= 4, label: "Challenges" },
  { id: "genome-btn",   when: (s) => (s.speciations || 0) >= 1,        label: "Genome Lab" },
  { id: "pantheon-btn", when: (s) => (s.speciations || 0) >= 1,        label: "Genome Pantheon" },
  { id: "symbiote-btn", when: (s) => (s.speciations || 0) >= 1,        label: "Symbiote" },
  { id: "colony-btn",   when: (s) => (s.speciations || 0) >= 1,        label: "Colonization Map" },
];
// ---- First-session coach: a single gentle, dismissible next-step nudge that
// advances with the player (tap → buy → Evolve) and then retires itself forever.
// Only ever shows for a brand-new player; never nags after the first Evolve.
const coachEl = document.getElementById("coach");
const coachTextEl = coachEl ? coachEl.querySelector(".coach-text") : null;
function coachMessage() {
  if (state.coachDone || (state.prestiges || 0) > 0) return null; // graduated
  const owned = state.owned || {};
  const totalOwned = Object.values(owned).reduce((a, b) => a + b, 0);
  if (totalOwned === 0 && (state.biomass || 0) < 15) return "👆 Tap the cell to grow biomass";
  if (totalOwned === 0) return "Nice! Now buy your first organelle on the right → it earns biomass for you";
  const evolveBtn = document.getElementById("evolve-btn");
  if (evolveBtn && !evolveBtn.disabled) return "✦ Evolve is ready — Evolve to mutate your creature!";
  return "Keep growing — buy organelles until you can Evolve";
}
function updateCoach() {
  if (!coachEl) return;
  const msg = coachMessage();
  if (!msg) { coachEl.classList.add("hidden"); if ((state.prestiges || 0) > 0) state.coachDone = true; return; }
  if (coachTextEl.textContent !== msg) coachTextEl.textContent = msg;
  coachEl.classList.remove("hidden");
}
if (coachEl) document.getElementById("coach-dismiss").addEventListener("click", () => {
  state.coachDone = true; coachEl.classList.add("hidden"); save();
});

let _unlockAt = 0;
function updateUnlocks() {
  state.unlocked = state.unlocked || {};
  const firstPass = !state.unlockInit; // existing saves migrate silently (no toast spam)
  for (const u of FEATURE_UNLOCKS) {
    const btn = document.getElementById(u.id);
    if (!btn) continue;
    if (!state.unlocked[u.id] && u.when(state)) {
      state.unlocked[u.id] = true;
      if (!firstPass) { flashStatus(`🔓 ${u.label} unlocked!`); audio.playMilestone(); }
    }
    btn.classList.toggle("locked-feature", !state.unlocked[u.id]);
  }
  if (firstPass) state.unlockInit = true;
}
updateUnlocks(); // apply gating immediately on boot

// ---- offline progress welcome ----
const offline = applyOfflineProgress();
if (offline.earned > 1 && offline.seconds > 5) {
  const mins = Math.round(offline.seconds / 60);
  flashStatus(`welcome back: +${formatNumber(offline.earned)} (${mins}m away)`);
}

// ---- master loop (delta-time based, not frame-count based) ----
// Driven by BOTH requestAnimationFrame (smooth when foreground) AND a setInterval
// fallback (keeps simulating when the tab is backgrounded, since browsers pause
// rAF). Both call update(), which derives dt from a shared timestamp, so there is
// no double-counting regardless of which one fires.
let last = performance.now();
let elapsed = 0;
let sinceSave = 0;
// drone idle-FX throttle: accumulate auto-click gain, emit one tidy pulse ~2×/sec
let droneFxAccum = 0;
let droneFxGain = 0;
// working-producer throttle: organelles emit biomass motes toward the counter,
// at a rate scaled by production/sec (so the screen SHOWS the economy running)
let prodMoteAccum = 0;
let prodFloatAccum = 0; // throttle for the readable "+N/s" passive-income float

function update() {
  const now = performance.now();
  let dt = (now - last) / 1000;
  last = now;
  if (dt < 0) dt = 0;
  dt = Math.min(dt, 60); // allow catch-up after a throttled gap, cap runaway
  elapsed += dt;
  state.playSeconds = (state.playSeconds || 0) + dt;

  // passive production (full dt so background ticks accrue correctly)
  const rate = productionPerSecond();
  if (rate > 0) addBiomass(rate * dt);
  drainLeeches(rate, dt); // parasites skim production into themselves
  updateDrifters(dt); // ambient clickable visitors floating across the pond
  // "Living World": the backdrop escalates the moment your evolution stage changes
  // (micro pond → ocean → planet → cosmos), so the world grows around the creature.
  if ((state.background || "world") === "world") {
    const sIdx = evolutionStage().index;
    if (sIdx !== _lastWorldStage) { _lastWorldStage = sIdx; setWorldStage(sIdx); }
  }
  // working producers: organelles fire biomass motes into the counter, denser as
  // /sec grows — so you SEE production happening (Cookie-Clicker cookies-flowing).
  if (rate > 0 && !state.reduceMotion && !document.hidden) {
    prodMoteAccum += dt * Math.min(7, Math.max(0.6, Math.log10(rate + 10)));
    let guard = 0;
    while (prodMoteAccum >= 1 && guard++ < 8) {
      prodMoteAccum -= 1;
      const m = emitProductionMote();
      if (m) flyToCounter(m.sx, m.sy, m.color);
    }
    if (prodMoteAccum > 8) prodMoteAccum = 0; // never bank a backlog
    // readable passive-income float: every ~2.4s a "+N" rises off the creature so
    // passive /sec is legible as an actual NUMBER, not just flowing motes.
    prodFloatAccum += dt;
    if (prodFloatAccum >= 2.4) {
      const c = stageCenter();
      spawnFloatNumber(c.x + (Math.random() * 70 - 35), c.y - 64, "+" + formatNumber(rate) + "/s", "passive");
      prodFloatAccum = 0;
    }
  }

  // Mitosis Engine node: auto-buy organelles (only when toggled on)
  if (hasNode("auto_gen") && state.autoBuyOn !== false) autoBuyGenerators();
  const ripened = tickMutagen();
  if (ripened > 0) {
    flashStatus(`🧫 Mutagen ripened! +${ripened} — spend it to level organelles`);
    const mm = document.getElementById("mutagen-modal");
    if (mm && !mm.classList.contains("hidden")) renderMutagen();
  }
  tickCatalyst();
  // Automation Bay: drones auto-click, factory converts, automators run systems
  const autoEv = tickAutomation(dt);
  if (autoEv) {
    if (autoEv.surged) { audio.playMilestone(); flash("rgba(150,120,255,.28)"); const c = stageCenter(); burst(c.x, c.y, { count: 28, color: "#b88cff", spread: 150, life: 800 }); flashStatus("🔬 Auto-Catalyzer fired a surge! ×3 production"); }
    if (autoEv.claimed.length) { cinematicPulse(); flash("rgba(86,227,159,.3)"); flashStatus("🗺️ Surveyor claimed new territory"); }
    if (autoEv.harvested > 0) { const c = stageCenter(); burst(c.x, c.y - 40, { count: 10, color: "#9fe87b", spread: 80, up: 30, life: 650 }); }
    // drone idle FX: show the swarm working without spamming a number per click
    if (autoEv.drone > 0 && !state.reduceMotion) {
      droneFxGain += autoEv.drone;
      droneFxAccum += dt;
      if (droneFxAccum >= 0.5 && !document.hidden) {
        const c = stageCenter();
        const jx = c.x + (Math.random() * 2 - 1) * 90;
        const jy = c.y + (Math.random() * 2 - 1) * 70;
        pulse(0.35);
        ripple(jx, jy, "#7be3b0");
        spawnFloatNumber(jx, jy, "+" + formatNumber(droneFxGain));
        burst(jx, jy, { count: 3, color: "#56e39f", spread: 36, life: 520 });
        droneFxAccum = 0; droneFxGain = 0;
      }
    }
  }
  const rm = document.getElementById("reactor-modal");
  if (rm && !rm.classList.contains("hidden")) renderReactor();
  const gm = document.getElementById("garden-modal");
  if (gm && !gm.classList.contains("hidden")) renderGarden();
  const cm = document.getElementById("colony-modal");
  if (cm && !cm.classList.contains("hidden")) renderColony();
  const mac = document.getElementById("machines-modal");
  if (mac && !mac.classList.contains("hidden")) renderMachines();
  setSwarm(state.owned); // organelles you own manifest as a living orbiting swarm (cached; only rebuilds when visible counts change)
  autoTick(dt); // Helix auto-evolve / auto-speciate
  pruneTempBuffs(); // drop expired blooms/Digest buffs

  // milestone ding on each new power-of-ten of lifetime biomass
  if (state.lifetimeBiomass >= 1000) {
    const exp = Math.floor(Math.log10(state.lifetimeBiomass));
    if (exp > (state.lastMilestoneExp || 2)) {
      state.lastMilestoneExp = exp;
      audio.playMilestone();
      const mc = stageCenter();
      burst(mc.x, mc.y, { count: 24, color: "#ffd76b", spread: 140, up: 0, life: 700 });
      flashStatus(`milestone: ${formatNumber(Math.pow(10, exp))} biomass`);
    }
  }

  // visuals (clamp the animation dt so squash/pop stay sane after long gaps)
  const visualDt = Math.min(dt, 0.1);
  renderBackground(visualDt);
  setGrowthFromBiomass(state.biomass);
  // metabolic stress ramps in from pressure 0.6 -> 1.2 (creature strains red)
  const pressure = pressureLevel();
  setStress((pressure - 0.6) / 0.6);
  updatePressureVignette(pressure);
  updateBiomassTank();
  updateCorruption(elapsed);
  if (pressure >= 1) state.hitWall = true;
  // achievement unlocks
  for (const a of checkAchievements()) {
    audio.playMilestone();
    flash("rgba(86,227,159,0.35)");
    flashStatus(`🏆 ${a.name} — ${a.desc}`);
  }
  // challenge completion
  const cc = checkChallenge();
  if (cc) {
    audio.playMilestone(); flash("rgba(86,227,159,.5)"); shake(16);
    const c = stageCenter();
    burst(c.x, c.y, { count: 70, color: "#56e39f", spread: 220, up: 0, life: 1100 });
    flashStatus(`🏆 CHALLENGE COMPLETE — ${cc.name}! +${cc.reward} 🎲 rerolls`);
  }
  // species-trait / synergy discoveries — the big cinematic beat
  for (const tr of checkTraits()) {
    audio.playMutation("legendary");
    audio.playRoar();
    cinematicPulse();
    playCinematic(tr.name, tr.flavor || "NEW SPECIES TRAIT", "#b88cff");
    flash("rgba(184,140,255,0.55)");
    shake(12);
    const c = stageCenter();
    burst(c.x, c.y, { count: 70, color: "#b88cff", spread: 220, up: 0, life: 1100 });
  }
  // music intensity grows with total progress; stress = wall heartbeat; danger = boss
  setMusicIntensity(Math.min(1, Math.log10((state.lifetimeBiomass || 0) + 10) / 16));
  setMusicStress((pressure - 0.6) / 0.5);
  setMusicDanger(!!boss);
  if (state._auraN !== state.mutations.length) { state._auraN = state.mutations.length; updateAura(); }
  setDnaStorm((state.transcensions || 0) > 0 || state.mutations.length >= 40); // late-game ambient (guards internally)
  renderCreature(visualDt, elapsed);
  updateJuice(visualDt);
  renderUI(rate, visualDt);
  if (now - _unlockAt > 750) { _unlockAt = now; updateUnlocks(); updateCoach(); } // reveal systems + coach as milestones hit

  // autosave every 15s
  sinceSave += dt;
  if (sinceSave >= 15) {
    sinceSave = 0;
    save();
  }
}

function rafLoop() {
  update();
  requestAnimationFrame(rafLoop);
}
requestAnimationFrame(rafLoop);
setInterval(update, 250); // background fallback so the organism keeps living

// keep canvas crisp when the panel/layout changes
window.addEventListener("resize", resizeCreature);
// nudge a resize after first paint (canvas sizing can lag the layout)
setTimeout(() => { resizeCreature(); resizeBackground(); }, 60);

// save on exit
window.addEventListener("beforeunload", save);

// dev handle — ONLY when explicitly requested via ?debug, so the public build
// has no console cheat surface. Add ?debug=1 to the URL to enable it for testing.
if (typeof window !== "undefined" &&
    new URLSearchParams(location.search).has("debug")) {
  window.ML = { state, save, productionPerSecond };
  console.log("[debug] window.ML enabled (cheat handle).");
}

console.log("Mutation Lab prototype booted.");
