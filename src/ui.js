// DOM rendering: resource readouts, generator list, click fx, buttons.

import { state } from "./state.js";
import { GENERATORS } from "./data/generators.js";
import {
  costOf, canAfford, isUnlocked,
  epForReset, canPrestige, effectiveClickPower, pressureLevel,
  canSpeciate, genomeForSpeciate, equipSlots,
} from "./economy.js";
import { formatNumber } from "./format.js";
import { getMutation, RARITY, MUTATIONS } from "./data/mutations.js";
import { GENOME_NODES, nodeCost, nodeLevel } from "./data/genomeNodes.js";
import { ACHIEVEMENTS } from "./data/achievements.js";
import { MUSIC_THEMES } from "./music.js";

const el = {};
let onBuy = null;

export function initUI(handlers) {
  onBuy = handlers.onBuy;

  el.biomass = document.getElementById("biomass-value");
  el.rate = document.getElementById("biomass-rate");
  el.click = document.getElementById("click-power");
  el.genList = document.getElementById("generator-list");
  el.status = document.getElementById("status");
  el.fx = document.getElementById("fx-layer");
  // evolution
  el.ep = document.getElementById("ep-value");
  el.prestige = document.getElementById("prestige-count");
  el.evolveBtn = document.getElementById("evolve-btn");
  el.evolveGain = document.getElementById("evolve-gain");
  el.mutCollection = document.getElementById("mutation-collection");
  el.pressureWrap = document.getElementById("pressure");
  el.pressureFill = document.getElementById("pressure-fill");
  el.pressurePct = document.getElementById("pressure-pct");
  el.pressureWarn = document.getElementById("pressure-warn");
  // speciate + genome lab
  el.speciateBtn = document.getElementById("speciate-btn");
  el.speciateGain = document.getElementById("speciate-gain");
  el.genomeBtn = document.getElementById("genome-btn");
  el.genomeValue = document.getElementById("genome-value");
  el.genomeModal = document.getElementById("genome-modal");
  el.nodeList = document.getElementById("node-list");
  el.speciesList = document.getElementById("species-list");
  el.genomeValue2 = document.getElementById("genome-value2");
  el.speciesCount = document.getElementById("species-count");
  el.equipInfo = document.getElementById("equip-info");
  el.genomeStatus = document.getElementById("genome-status");
  // draft
  el.draftModal = document.getElementById("draft-modal");
  el.draftCards = document.getElementById("draft-cards");

  el.muteBtn = document.getElementById("mute-btn");

  document.getElementById("save-btn").addEventListener("click", handlers.onSave);
  document.getElementById("wipe-btn").addEventListener("click", handlers.onWipe);
  el.evolveBtn.addEventListener("click", handlers.onEvolve);
  el.muteBtn.addEventListener("click", handlers.onMute);
  el.speciateBtn.addEventListener("click", handlers.onSpeciate);
  el.genomeBtn.addEventListener("click", () => openGenomeLab());
  document.getElementById("genome-close").addEventListener("click", () => el.genomeModal.classList.add("hidden"));
  document.getElementById("export-btn").addEventListener("click", handlers.onExport);
  document.getElementById("import-btn").addEventListener("click", handlers.onImport);
  el.statsModal = document.getElementById("stats-modal");
  el.statsBody = document.getElementById("stats-body");
  document.getElementById("stats-btn").addEventListener("click", () => openStats());
  document.getElementById("stats-close").addEventListener("click", () => el.statsModal.classList.add("hidden"));
  // settings
  el.settingsModal = document.getElementById("settings-modal");
  el.setVolume = document.getElementById("set-volume");
  el.setThemes = document.getElementById("set-themes");
  el.setShake = document.getElementById("set-shake");
  el.setReduce = document.getElementById("set-reduce");
  el.setMute = document.getElementById("set-mute");
  document.getElementById("settings-btn").addEventListener("click", () => openSettings());
  document.getElementById("settings-close").addEventListener("click", () => el.settingsModal.classList.add("hidden"));
  el.setVolume.addEventListener("input", () => handlers.onSetVolume(el.setVolume.value / 100));
  el.setShake.addEventListener("click", (e) => { const v = e.target.dataset.v; if (v) { handlers.onSetShake(v); renderSettings(); } });
  el.setReduce.addEventListener("change", () => { handlers.onSetReduce(el.setReduce.checked); renderSettings(); });
  el.setMute.addEventListener("click", () => { handlers.onMute(); renderSettings(); });
  uiHandlers = handlers;

  buildGeneratorRows();
}

let uiHandlers = {};

export function openGenomeLab() {
  renderGenomeLab();
  el.genomeModal.classList.remove("hidden");
}

export function genomeStatus(msg) {
  if (el.genomeStatus) {
    el.genomeStatus.textContent = msg;
    clearTimeout(el.genomeStatus._t);
    el.genomeStatus._t = setTimeout(() => (el.genomeStatus.textContent = ""), 2500);
  }
}

// ---- settings ----
export function openSettings() {
  renderSettings();
  el.settingsModal.classList.remove("hidden");
}

function renderSettings() {
  el.setVolume.value = Math.round((state.musicVolume == null ? 0.5 : state.musicVolume) * 100);
  el.setThemes.innerHTML = "";
  for (const t of MUSIC_THEMES) {
    const b = document.createElement("button");
    b.textContent = t.name;
    if ((state.musicTrack || "primordial") === t.id) b.classList.add("active");
    b.addEventListener("click", () => { uiHandlers.onSetTheme(t.id); renderSettings(); });
    el.setThemes.appendChild(b);
  }
  for (const b of el.setShake.querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.v === (state.shake || "subtle"));
  }
  el.setReduce.checked = !!state.reduceMotion;
  el.setMute.textContent = state.muted ? "🔇 Off" : "🔊 On";
}

// ---- stats & collection ----
export function openStats() {
  renderStats();
  el.statsModal.classList.remove("hidden");
}

function renderStats() {
  const s = state;
  const discovered = s.discovered || {};
  const discCount = Object.keys(discovered).length;
  const achCount = Object.keys(s.achievements || {}).length;

  const stat = (k, v) => `<div class="stat-box"><div class="v">${v}</div><div class="k">${k}</div></div>`;
  const stats = [
    stat("Lifetime biomass", formatNumber(s.lifetimeBiomass || 0)),
    stat("Evolutions", formatNumber(s.prestiges || 0)),
    stat("Speciations", formatNumber(s.speciations || 0)),
    stat("Genome", formatNumber(s.genome || 0)),
    stat("Species banked", (s.species || []).length),
    stat("Evolution Points", formatNumber(s.evolutionPoints || 0)),
  ].join("");

  const pills = MUTATIONS.map((m) => {
    const got = !!discovered[m.id];
    const color = RARITY[m.rarity].color;
    return got
      ? `<span class="mut-pill" style="border-color:${color};color:${color}" title="${m.desc}">${m.name}</span>`
      : `<span class="mut-pill locked">???</span>`;
  }).join("");

  const achs = ACHIEVEMENTS.map((a) => {
    const got = !!(s.achievements || {})[a.id];
    const bonus = a.prodMult ? `+${Math.round((a.prodMult - 1) * 100)}% prod`
      : a.clickMult ? `+${Math.round((a.clickMult - 1) * 100)}% click` : "";
    return `<div class="ach ${got ? "got" : ""}">
      <div class="an">${got ? "🏆 " : "🔒 "}${a.name}</div>
      <div class="ad">${a.desc}</div>
      <div class="ab">${bonus}</div></div>`;
  }).join("");

  el.statsBody.innerHTML = `
    <div class="stats-grid">${stats}</div>
    <h3>Mutations Discovered · ${discCount} / ${MUTATIONS.length}</h3>
    <div class="mut-grid">${pills}</div>
    <h3>Achievements · ${achCount} / ${ACHIEVEMENTS.length}</h3>
    <div class="ach-list">${achs}</div>`;
}

// Build the Genome Lab contents (nodes + species). Call after any change.
export function renderGenomeLab() {
  el.genomeValue2.textContent = formatNumber(state.genome || 0);
  el.speciesCount.textContent = (state.species || []).length;
  el.equipInfo.textContent = `${(state.equippedSpecies || []).length}/${equipSlots()} equipped`;

  // nodes
  el.nodeList.innerHTML = "";
  for (const n of GENOME_NODES) {
    const lvl = nodeLevel(state, n.id);
    const cost = nodeCost(state, n.id);
    const maxed = lvl >= n.maxLevel;
    const broke = !maxed && state.genome < cost;
    const row = document.createElement("div");
    row.className = "node" + (maxed ? " maxed" : broke ? " broke" : "");
    row.innerHTML = `
      <div class="node-top"><span>${n.name}</span>
        <span class="node-cost">${maxed ? "MAX" : formatNumber(cost) + " ◆"}</span></div>
      <div class="node-desc">${n.desc}</div>
      <div class="node-lvl">Lv ${lvl}${n.maxLevel > 1 ? " / " + n.maxLevel : ""}</div>`;
    if (!maxed && !broke) row.addEventListener("click", () => uiHandlers.onBuyNode(n.id));
    el.nodeList.appendChild(row);
  }

  // species
  el.speciesList.innerHTML = "";
  const species = state.species || [];
  if (!species.length) {
    el.speciesList.innerHTML = `<div class="empty">No species yet — hit the wall and Speciate to bank your first.</div>`;
  }
  for (const sp of species) {
    const equipped = (state.equippedSpecies || []).includes(sp.id);
    const card = document.createElement("div");
    card.className = "species-card" + (equipped ? " equipped" : "");
    card.innerHTML = `
      <div>
        <div class="sp-name">${sp.name}</div>
        <div class="sp-meta">${(sp.mutations || []).length} mutations · ×${formatNumber(Math.sqrt(Math.max(1, sp.strength || 1)))} when equipped</div>
      </div>
      <div class="sp-equip">${equipped ? "✓ EQUIPPED" : "equip"}</div>`;
    card.addEventListener("click", () => uiHandlers.onToggleEquip(sp.id));
    el.speciesList.appendChild(card);
  }
}

export function setMuteLabel(muted) {
  if (el.muteBtn) el.muteBtn.textContent = muted ? "🔇" : "🔊";
}

function buildGeneratorRows() {
  el.genList.innerHTML = "";
  el.genRows = {};
  for (const g of GENERATORS) {
    const row = document.createElement("div");
    row.className = "gen locked";
    row.innerHTML = `
      <div class="name">${g.name}</div>
      <div class="desc">${g.desc}</div>
      <div class="cost">${formatNumber(g.baseCost)}</div>
      <div class="owned">0</div>`;
    row.addEventListener("click", () => onBuy && onBuy(g.id, row.getBoundingClientRect()));
    el.genList.appendChild(row);
    el.genRows[g.id] = row;
  }
}

// Called every frame (cheap DOM writes only). dt (seconds) drives count-up tween.
export function renderUI(rate, dt = 0.016) {
  // smooth count-up: ease the displayed biomass toward the real value
  if (el._dispBiomass === undefined) el._dispBiomass = state.biomass;
  el._dispBiomass += (state.biomass - el._dispBiomass) * Math.min(1, dt * 8);
  if (Math.abs(state.biomass - el._dispBiomass) < 0.5) el._dispBiomass = state.biomass;
  el.biomass.textContent = formatNumber(el._dispBiomass);
  el.rate.textContent = formatNumber(rate);
  el.click.textContent = formatNumber(effectiveClickPower());

  // evolution readouts
  el.ep.textContent = formatNumber(state.evolutionPoints || 0);
  el.prestige.textContent = formatNumber(state.prestiges || 0);
  const gain = epForReset();
  const ready = canPrestige();
  el.evolveBtn.disabled = !ready;
  el.evolveBtn.classList.toggle("ready", ready);
  el.evolveGain.textContent = `+${formatNumber(gain)} EP`;

  // metabolic pressure meter (the legible wall)
  const pressure = pressureLevel();
  el.pressureFill.style.width = Math.min(100, pressure * 100).toFixed(1) + "%";
  el.pressurePct.textContent = Math.round(Math.min(999, pressure * 100)) + "%";
  const maxed = pressure >= 1;
  el.pressureWrap.classList.toggle("maxed", maxed);
  el.pressureWarn.classList.toggle("hidden", !maxed);

  // speciate availability + genome readout
  const canSpec = canSpeciate();
  el.speciateBtn.classList.toggle("hidden", !canSpec);
  if (canSpec) el.speciateGain.textContent = `+${formatNumber(genomeForSpeciate())} Genome`;
  el.genomeValue.textContent = formatNumber(state.genome || 0);

  // mutation chips (rebuild only when the set changes)
  if (el._mutSig !== state.mutations.join(",")) {
    el._mutSig = state.mutations.join(",");
    renderMutationChips();
  }

  for (const g of GENERATORS) {
    const row = el.genRows[g.id];
    const unlocked = isUnlocked(g.id);
    if (!unlocked) {
      if (!row.classList.contains("locked")) row.classList.add("locked");
      continue;
    }
    row.classList.remove("locked");
    const cost = costOf(g.id);
    const affordable = canAfford(g.id);
    row.classList.toggle("affordable", affordable);
    row.querySelector(".cost").textContent = formatNumber(cost);
    row.querySelector(".owned").textContent = `×${state.owned[g.id] || 0}`;
  }
}

function renderMutationChips() {
  const counts = {};
  for (const id of state.mutations) counts[id] = (counts[id] || 0) + 1;
  el.mutCollection.innerHTML = "";
  for (const id of Object.keys(counts)) {
    const def = getMutation(id);
    if (!def) continue;
    const chip = document.createElement("span");
    chip.className = "mut-chip";
    chip.style.borderColor = RARITY[def.rarity].color;
    chip.title = def.desc;
    chip.innerHTML = `${def.name}${counts[id] > 1 ? `<span class="x">×${counts[id]}</span>` : ""}`;
    el.mutCollection.appendChild(chip);
  }
}

// Show the 3-card mutation draft. Calls onPick(id) when a card is chosen.
export function showDraft(ids, onPick) {
  el.draftCards.innerHTML = "";
  for (const id of ids) {
    const def = getMutation(id);
    if (!def) continue;
    const r = RARITY[def.rarity];
    const card = document.createElement("div");
    card.className = "draft-card";
    card.style.setProperty("--rarity", r.color);
    card.innerHTML = `
      <div class="rarity">${r.label}</div>
      <div class="mname">${def.name}</div>
      ${def.part ? `<div class="part-tag">＋ grows a ${def.part}</div>` : ""}
      <div class="mdesc">${def.desc}</div>`;
    card.addEventListener("click", () => {
      el.draftModal.classList.add("hidden");
      onPick(id);
    });
    el.draftCards.appendChild(card);
  }
  el.draftModal.classList.remove("hidden");
}

// Floating "+N" number at a screen position.
export function spawnFloatNumber(x, y, text) {
  const node = document.createElement("div");
  node.className = "float-num";
  node.textContent = text;
  node.style.left = x + "px";
  node.style.top = y + "px";
  // small horizontal jitter so rapid clicks fan out
  node.style.transform = `translateX(${(Math.random() * 24 - 12) | 0}px)`;
  el.fx.appendChild(node);
  setTimeout(() => node.remove(), 900);
}

export function flashStatus(msg) {
  if (!el.status) return;
  el.status.textContent = msg;
  clearTimeout(el.status._t);
  el.status._t = setTimeout(() => (el.status.textContent = ""), 1600);
}
