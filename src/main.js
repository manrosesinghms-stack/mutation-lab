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
} from "./economy.js";
import {
  initCreature,
  renderCreature,
  setGrowthFromBiomass,
  resize as resizeCreature,
  onMutationGained,
  prestigeFlash,
  rebuildVisuals,
  setStress,
  resetParts,
  setEquippedGhosts,
  setReduceMotion,
  setBloomCallback,
  spawnBloom,
  hasBloom,
  engorgePop,
} from "./creature.js";
import { initUI, renderUI, spawnFloatNumber, flashStatus, showDraft, setMuteLabel,
         renderGenomeLab, genomeStatus } from "./ui.js";
import { formatNumber } from "./format.js";
import { getMutation } from "./data/mutations.js";
import { GENERATORS } from "./data/generators.js";
import * as audio from "./audio.js";
import { startMusic, setMusicIntensity, setMusicVolume, setMusicTheme } from "./music.js";
import { initJuice, burst, shake, updateJuice, flash, setShakeScale } from "./juice.js";

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
    showDraft(rollDraft(draftSize()), pickMutation);
    save();
  },
  onMute: () => {
    const m = audio.toggleMuted();
    state.muted = m;
    setMuteLabel(m);
    save();
  },
  onSetVolume: (v) => { state.musicVolume = v; setMusicVolume(v); startMusic(); save(); },
  onSetTheme: (id) => { state.musicTrack = id; setMusicTheme(id); startMusic(); save(); },
  onSetShake: (v) => { state.shake = v; applyShakeSetting(v); save(); },
  onSetReduce: (b) => { state.reduceMotion = b; setReduceMotion(b); save(); },
  onSpeciate: () => {
    const res = doSpeciate();
    if (!res) { flashStatus("can't speciate yet — reach the wall first"); return; }
    resetParts();        // new lineage starts bald, re-grows as you draft
    refreshGhosts();
    audio.playEvolve();
    flash("rgba(255,177,61,0.55)");
    shake(22);
    const c = stageCenter();
    burst(c.x, c.y, { count: 80, color: "#ffd76b", spread: 240, up: 0, life: 1000 });
    flashStatus(`SPECIATED: ${res.card.name} · +${formatNumber(res.gain)} Genome`);
    save();
  },
  onBuyNode: (id) => {
    if (buyNode(id)) { audio.playBuy(2); refreshGhosts(); renderGenomeLab(); genomeStatus("node upgraded"); save(); }
    else genomeStatus("not enough Genome");
  },
  onToggleEquip: (sid) => {
    if (toggleEquip(sid)) { refreshGhosts(); renderGenomeLab(); audio.playMutation("common"); save(); }
    else genomeStatus("all equip slots full (buy Lineage Slots)");
  },
  onExport: () => exportSave(),
  onImport: () => importSave(),
});

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
  const c = stageCenter();
  if (rarity === "legendary") {
    audio.playMilestone();
    flash("rgba(255,177,61,0.5)");
    shake(14);
    burst(c.x, c.y, { count: 70, color: "#ffb13d", spread: 220, up: 0, life: 1000 });
  } else {
    const isRare = rarity === "rare";
    const color = isRare ? "#56a0ff" : "#9fb3c8";
    burst(c.x, c.y, { count: isRare ? 44 : 24, color, spread: isRare ? 180 : 130, up: 0, life: isRare ? 900 : 750 });
  }
  flashStatus(`mutation gained: ${def ? def.name : id}`);
  save();
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
  startMusic(); // first user gesture — kick off ambient music
  spawnFloatNumber(sx, sy, "+" + formatNumber(gain));
  audio.playClick(combo);
  burst(sx, sy, { count: 4 + Math.min(combo, 8), color: "#56e39f", spread: 55, life: 600 });
  // (no per-click screen shake — the creature squash is the feedback; constant
  //  clicking made the whole screen jitter. Shake is reserved for big events.)
});

initJuice();

// restore creature parts from a saved game (visual mutations only)
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
setMusicTheme(state.musicTrack || "primordial");
applyShakeSetting(state.shake || "subtle");
setReduceMotion(!!state.reduceMotion);

// --- Mitogen Bloom: golden clickable spawn -> frenzy buff (active-play upside) ---
setBloomCallback((sx, sy) => {
  state.bloomCaught = true;
  addTempBuff({ id: "bloom", prodMult: 7, durationMs: 20000 });
  audio.playMilestone();
  flash("rgba(255,215,107,0.4)");
  burst(sx, sy, { count: 40, color: "#ffd76b", spread: 160, life: 900 });
  flashStatus("MITOGEN BLOOM! ×7 production for 20s");
});
// ~one bloom per minute when none is active
setInterval(() => { if (!hasBloom() && Math.random() < 0.5) spawnBloom(); }, 30000);

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

  // passive production (full dt so background ticks accrue correctly)
  const rate = productionPerSecond();
  if (rate > 0) addBiomass(rate * dt);

  // Mitosis Engine node: auto-buy organelles
  if (hasNode("auto_gen")) autoBuyGenerators();
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
  setGrowthFromBiomass(state.biomass);
  // metabolic stress ramps in from pressure 0.6 -> 1.2 (creature strains red)
  const pressure = pressureLevel();
  setStress((pressure - 0.6) / 0.6);
  if (pressure >= 1) state.hitWall = true;
  // achievement unlocks
  for (const a of checkAchievements()) {
    audio.playMilestone();
    flash("rgba(86,227,159,0.35)");
    flashStatus(`🏆 ${a.name} — ${a.desc}`);
  }
  // music intensity grows with total progress
  setMusicIntensity(Math.min(1, Math.log10((state.lifetimeBiomass || 0) + 10) / 16));
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
setTimeout(resizeCreature, 60);

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
