// Boot + master game loop.

import { state, save, wipe } from "./state.js";
import {
  click,
  buy,
  productionPerSecond,
  addBiomass,
  applyOfflineProgress,
  canPrestige,
  doPrestige,
  rollDraft,
  acquireMutation,
  pressureLevel,
  doSpeciate,
  buyNode,
  toggleEquip,
  draftSize,
  hasNode,
  autoBuyGenerators,
  doDigest,
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
} from "./economy.js";
import { SKIN_BY_ID } from "./data/skins.js";
import { speciesTier, speciesTierColor } from "./data/tiers.js";
import {
  initCreature,
  renderCreature,
  setGrowthFromBiomass,
  resize as resizeCreature,
  onMutationGained,
  prestigeFlash,
  cinematicPulse,
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
  setBloomCallback,
  spawnBloom,
  hasBloom,
  engorgePop,
  exportPhoto,
} from "./creature.js";
import { creatureName } from "./data/names.js";
import { initUI, renderUI, spawnFloatNumber, flashStatus, showDraft, setMuteLabel,
         renderGenomeLab, genomeStatus, openHelp, showChoice, renderChallenges } from "./ui.js";
import { formatNumber } from "./format.js";
import { getMutation } from "./data/mutations.js";
import { GENERATORS } from "./data/generators.js";
import * as audio from "./audio.js";
import { startMusic, setMusicIntensity, setMusicVolume, setMusicTheme, hasTheme, setMusicStress, setMusicDanger } from "./music.js";
import { initCinematic, playCinematic } from "./cinematic.js";
import { initJuice, burst, shake, updateJuice, flash, setShakeScale, setJuiceReduceMotion, ripple, flyToCounter } from "./juice.js";
import { initBackground, renderBackground, setBackground, hasBackground, resizeBackground, setBackgroundReduceMotion } from "./background.js";

// screen-center of the 3D stage, for big bursts
function stageCenter() {
  const r = document.getElementById("stage").getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ---- wire UI ----
initUI({
  onBuy: (genId, rect) => {
    if (buy(genId)) {
      const tier = GENERATORS.findIndex((g) => g.id === genId); // 0..4
      audio.playBuy(tier);
      if (rect) burst(rect.left + rect.width / 2, rect.top + rect.height / 2,
                      { count: 12 + tier * 4, color: "#56e39f", spread: 80 + tier * 15 });
      flashStatus("organelle acquired");
    } else {
      flashStatus("not enough biomass");
    }
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
    const gained = doPrestige();
    // PRESTIGE EXPLOSION
    prestigeFlash();
    audio.playEvolve();
    flash("rgba(140,90,255,0.55)");
    shake(18);
    const c = stageCenter();
    burst(c.x, c.y, { count: 60, color: "#b88cff", spread: 200, up: 0, life: 900 });
    flashStatus(`evolved! +${formatNumber(gained)} EP`);
    openDraft();
    startNewRun();
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
  onSetBackground: (v) => { state.background = v; setBackground(v); save(); },
  onSpeciate: () => {
    const res = doSpeciate();
    if (!res) { flashStatus("can't speciate yet — reach the wall first"); return; }
    resetParts();        // new lineage starts bald, re-grows as you draft
    applyCreatureSkin(); // ascend the BASE body to the new species tier
    const tier = speciesTier(state.speciations || 0);
    setSpeciesTier(state.speciations || 0); // grander orbiting ascension crown
    setAura(speciesTierColor(state.speciations || 0), 1.2);
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
    save();
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
function copyCreatureDNA() {
  const code = "MLAB1." + btoa(unescape(encodeURIComponent(JSON.stringify({
    n: creatureName(state.mutations, state.namingStyle || "scientific"),
    m: state.mutations, v: state.variant,
  }))));
  if (navigator.clipboard) navigator.clipboard.writeText(code);
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
  setSkin(cosmetic || speciesTier(state.speciations || 0).skin);
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
  if (state.mutations.length >= 14 && !state.instabilityResolved) triggerInstability();
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
  const gain = click();
  state.totalClicks = (state.totalClicks || 0) + 1;
  startMusic(); // first user gesture — kick off ambient music
  spawnFloatNumber(sx, sy, "+" + formatNumber(gain));
  audio.playClick(combo);
  const crit = combo >= 12; // chained-click "critical extraction"
  ripple(sx, sy, crit ? "#ffd76b" : "#7be3b0");
  flyToCounter(sx, sy, crit ? "#ffd76b" : "#7be3b0");
  burst(sx, sy, { count: 4 + Math.min(combo, 8), color: crit ? "#ffd76b" : "#56e39f", spread: 55, life: 600 });
  // (no per-click screen shake — the creature squash is the feedback; constant
  //  clicking made the whole screen jitter. Shake is reserved for big events.)
});

initJuice();
initBackground(document.getElementById("bg-canvas"));
initCinematic();

// restore creature parts from a saved game (visual mutations only)
if (state.runShapeSeed == null) state.runShapeSeed = 1;
setQuality(state.graphics || "medium"); // apply graphics quality (part cap, resolution, effects)
setBodyShape(state.speciations || 0, state.runShapeSeed); // shape the body BEFORE seating parts
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
if (!hasBackground(state.background)) state.background = "aurora";
setBackground(state.background);
setHabitat(state.biome); // theme the 3D habitat to the run's biome
setVariant(state.variant); // apply any rare run variant
applyCreatureSkin();       // base body = cosmetic skin, else current species tier
setSpeciesTier(state.speciations || 0); // restore the ascension crown

const BIOME_ICON = { ocean: "🌊", volcanic: "🌋", verdant: "🌿", glacial: "❄️", abyssal: "🌌", voidrift: "🕳️" };
function startNewRun() {
  // roll a biome → sets the backdrop + a build buff for this run
  const biome = rollBiome();
  setBackground(biome.background);
  setHabitat(biome.id);
  // re-roll the body silhouette so each run looks different, then re-seat parts
  state.runShapeSeed = Math.floor(Math.random() * 100000);
  setBodyShape(state.speciations || 0, state.runShapeSeed);
  const parts = state.mutations.map((id) => getMutation(id)).filter((d) => d && d.part).map((d) => d.part);
  rebuildVisuals(parts, state.mutations.length);
  flashStatus(`${BIOME_ICON[biome.id] || "🌍"} ${biome.name} — ${biome.desc}`);
  rollAndApplyVariant();
}

function rollAndApplyVariant() {
  const v = rollVariant();
  setVariant(state.variant);
  if (!v) return;
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
  addTempBuff({ id: "bloom", prodMult: 4, durationMs: 20000 });
  audio.playMilestone();
  cinematicPulse();
  flash("rgba(255,215,107,0.5)");
  burst(sx, sy, { count: 60, color: "#ffd76b", spread: 200, life: 1000 });
  playCinematic("⚡ MITOGEN FRENZY", "×4 production · 20s", "#ffd76b");
  flashStatus("MITOGEN BLOOM! ×4 production for 20s (temporary)");
});
// ~one bloom per minute when none is active; explain it the first time
setInterval(() => {
  if (hasBloom() || Math.random() >= 0.5) return;
  spawnBloom();
  if (!state.seenBloomHint) {
    state.seenBloomHint = true;
    flashStatus("✨ A golden Bloom grew on your cell — click it for a frenzy!");
    save();
  }
}, 30000);

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

// --- Digest button (opt-in biomass sink -> production surge) ---
document.getElementById("digest-btn").addEventListener("click", () => {
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
    flash("rgba(86,227,159,.45)"); shake(14);
    burst(c.x, c.y, { count: 60, color: "#56e39f", spread: 200, up: 0, life: 1000 });
    audio.playMilestone();
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

  // Mitosis Engine node: auto-buy organelles (only when toggled on)
  if (hasNode("auto_gen") && state.autoBuyOn !== false) autoBuyGenerators();
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
  renderCreature(visualDt, elapsed);
  updateJuice(visualDt);
  renderUI(rate, visualDt);

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
