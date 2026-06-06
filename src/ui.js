// DOM rendering: resource readouts, generator list, click fx, buttons.

import { state } from "./state.js";
import { GENERATORS } from "./data/generators.js";
import {
  costOf, canAfford, isUnlocked,
  epForReset, canPrestige, effectiveClickPower, pressureLevel,
  canSpeciate, genomeForSpeciate, equipSlots, activeBuffs,
  currentWeekly, dailyBestToday, todaySeed,
  canTranscend, transcendGain, helixNodeLevel, helixNodeCost,
  canSplice, spliceCooldownLeft, splicesFound,
  availableUpgrades, affordableUpgradeCount,
  REAGENTS, marketState, marketUnitValue, brokerFee, brokerCost, maxBuy,
  mutagenProgress, genLevel, genLevelCost,
} from "./economy.js";
import { HELIX_NODES } from "./data/helix.js";
import { PART_TYPES, PART_LABEL, HYBRID_LIST } from "./data/hybrids.js";
import { partCounts } from "./data/synergies.js";
import { formatNumber } from "./format.js";
import { getMutation, RARITY, MUTATIONS } from "./data/mutations.js";
import { GENOME_NODES, nodeCost, nodeLevel } from "./data/genomeNodes.js";
import { ACHIEVEMENTS } from "./data/achievements.js";
import { SYNERGIES, synergyProgress } from "./data/synergies.js";
import { SETS, setProgress } from "./data/sets.js";
import { CHALLENGES } from "./data/challenges.js";
import { SKINS } from "./data/skins.js";
import { MUSIC_THEMES } from "./music.js";
import { BACKGROUNDS } from "./background.js";
import { creatureName } from "./data/names.js";

const el = {};
let onBuy = null;
let sellMode = false;

export function initUI(handlers) {
  onBuy = handlers.onBuy;

  el.biomass = document.getElementById("biomass-value");
  el.rate = document.getElementById("biomass-rate");
  el.click = document.getElementById("click-power");
  el.genList = document.getElementById("generator-list");
  el.status = document.getElementById("status");
  el.fx = document.getElementById("fx-layer");
  el.buffLine = document.getElementById("buff-line");
  el.creatureName = document.getElementById("creature-name");
  el.setNaming = document.getElementById("set-naming");
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
  el.transcendBtn = document.getElementById("transcend-btn");
  el.transcendGain = document.getElementById("transcend-gain");
  el.helixBtn = document.getElementById("helix-btn");
  el.helixValue = document.getElementById("helix-value");
  el.helixModal = document.getElementById("helix-modal");
  el.spliceModal = document.getElementById("splice-modal");
  el.upgradesBtn = document.getElementById("upgrades-btn");
  el.upgradesBadge = document.getElementById("upgrades-badge");
  el.upgradesModal = document.getElementById("upgrades-modal");
  el.marketModal = document.getElementById("market-modal");
  el.mutagenModal = document.getElementById("mutagen-modal");
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
  el.autobuyToggle = document.getElementById("autobuy-toggle");
  el.autobuyToggle.addEventListener("click", () => handlers.onToggleAutoBuy());
  el.buysellToggle = document.getElementById("buysell-toggle");
  el.buysellToggle.addEventListener("click", () => {
    sellMode = !sellMode;
    el.buysellToggle.textContent = sellMode ? "Mode: Sell" : "Mode: Buy";
    el.buysellToggle.classList.toggle("off", sellMode);
  });

  document.getElementById("save-btn").addEventListener("click", handlers.onSave);
  document.getElementById("wipe-btn").addEventListener("click", handlers.onWipe);
  el.evolveBtn.addEventListener("click", handlers.onEvolve);
  el.muteBtn.addEventListener("click", handlers.onMute);
  el.speciateBtn.addEventListener("click", handlers.onSpeciate);
  el.genomeBtn.addEventListener("click", () => openGenomeLab());
  document.getElementById("genome-close").addEventListener("click", () => el.genomeModal.classList.add("hidden"));
  el.transcendBtn.addEventListener("click", handlers.onTranscend);
  el.helixBtn.addEventListener("click", () => openHelix());
  document.getElementById("helix-close").addEventListener("click", () => el.helixModal.classList.add("hidden"));
  el.upgradesBtn.addEventListener("click", () => openUpgrades());
  document.getElementById("upgrades-close").addEventListener("click", () => el.upgradesModal.classList.add("hidden"));
  document.getElementById("splice-btn").addEventListener("click", () => openSplicer());
  document.getElementById("market-btn").addEventListener("click", () => openMarket());
  document.getElementById("market-close").addEventListener("click", () => el.marketModal.classList.add("hidden"));
  document.getElementById("broker-buy").addEventListener("click", () => uiHandlers.onBuyBroker());
  document.getElementById("mutagen-btn").addEventListener("click", () => openMutagen());
  document.getElementById("mutagen-close").addEventListener("click", () => el.mutagenModal.classList.add("hidden"));
  document.getElementById("splice-close").addEventListener("click", () => el.spliceModal.classList.add("hidden"));
  document.getElementById("splice-go").addEventListener("click", () => {
    if (spliceSelA && spliceSelB) uiHandlers.onSplice(spliceSelA, spliceSelB);
  });
  document.getElementById("export-btn").addEventListener("click", handlers.onExport);
  document.getElementById("import-btn").addEventListener("click", handlers.onImport);
  document.getElementById("fuse-btn").addEventListener("click", handlers.onFuse);
  el.statsModal = document.getElementById("stats-modal");
  el.statsBody = document.getElementById("stats-body");
  document.getElementById("stats-btn").addEventListener("click", () => openStats());
  document.getElementById("stats-close").addEventListener("click", () => el.statsModal.classList.add("hidden"));
  // settings
  el.settingsModal = document.getElementById("settings-modal");
  el.setVolume = document.getElementById("set-volume");
  el.setThemes = document.getElementById("set-themes");
  el.setShake = document.getElementById("set-shake");
  el.setGraphics = document.getElementById("set-graphics");
  el.setReduce = document.getElementById("set-reduce");
  el.setEyeTrack = document.getElementById("set-eyetrack");
  el.setMute = document.getElementById("set-mute");
  el.setBg = document.getElementById("set-bg");
  document.getElementById("settings-btn").addEventListener("click", () => openSettings());
  document.getElementById("settings-close").addEventListener("click", () => el.settingsModal.classList.add("hidden"));
  // help / how to play
  el.helpModal = document.getElementById("help-modal");
  document.getElementById("help-btn").addEventListener("click", () => el.helpModal.classList.remove("hidden"));
  document.getElementById("help-close").addEventListener("click", () => el.helpModal.classList.add("hidden"));
  // codex
  el.codexModal = document.getElementById("codex-modal");
  el.codexBody = document.getElementById("codex-body");
  document.getElementById("codex-btn").addEventListener("click", () => openCodex());
  document.getElementById("codex-close").addEventListener("click", () => el.codexModal.classList.add("hidden"));
  // challenges
  el.chalModal = document.getElementById("chal-modal");
  el.chalBody = document.getElementById("chal-body");
  document.getElementById("chal-btn").addEventListener("click", () => openChallenges());
  document.getElementById("chal-close").addEventListener("click", () => el.chalModal.classList.add("hidden"));
  el.setVolume.addEventListener("input", () => handlers.onSetVolume(el.setVolume.value / 100));
  el.setShake.addEventListener("click", (e) => { const v = e.target.dataset.v; if (v) { handlers.onSetShake(v); renderSettings(); } });
  el.setGraphics.addEventListener("click", (e) => { const v = e.target.dataset.v; if (v) { handlers.onSetGraphics(v); renderSettings(); } });
  el.setReduce.addEventListener("change", () => { handlers.onSetReduce(el.setReduce.checked); renderSettings(); });
  el.setEyeTrack.addEventListener("change", () => { handlers.onSetEyeTrack(el.setEyeTrack.checked); });
  el.setMute.addEventListener("click", () => { handlers.onMute(); renderSettings(); });
  el.setNaming.addEventListener("click", (e) => { const v = e.target.dataset.v; if (v) { handlers.onSetNaming(v); renderSettings(); el._mutSig = null; } });
  el.setBg.addEventListener("click", (e) => { const v = e.target.dataset.v; if (v) { handlers.onSetBackground(v); renderSettings(); } });
  uiHandlers = handlers;

  buildGeneratorRows();
}

let uiHandlers = {};

// ---- Upgrade Store ----
export function openUpgrades() {
  renderUpgrades();
  el.upgradesModal.classList.remove("hidden");
}
export function renderUpgrades() {
  const list = document.getElementById("upgrades-list");
  const avail = availableUpgrades().sort((a, b) => a.cost - b.cost);
  list.innerHTML = "";
  document.getElementById("upgrades-empty").classList.toggle("hidden", avail.length > 0);
  for (const u of avail) {
    const broke = state.biomass < u.cost;
    const row = document.createElement("div");
    row.className = "node" + (broke ? " broke" : "");
    row.innerHTML = `
      <div class="node-top"><span>${u.name}</span>
        <span class="node-cost">${formatNumber(u.cost)}</span></div>
      <div class="node-desc">${u.desc}</div>
      <div class="node-lvl">${u.cond}</div>`;
    if (!broke) row.addEventListener("click", () => uiHandlers.onBuyUpgrade(u.id));
    list.appendChild(row);
  }
}

// ---- Mutagen / organelle levels ----
export function openMutagen() { renderMutagen(); el.mutagenModal.classList.remove("hidden"); }
export function renderMutagen() {
  document.getElementById("mutagen-have").textContent = formatNumber(state.mutagen || 0);
  const prog = mutagenProgress();
  document.getElementById("mutagen-fill").style.width = (prog * 100).toFixed(1) + "%";
  const remSec = Math.ceil((1 - prog) * 20 * 60);
  document.getElementById("mutagen-next").textContent = remSec > 60 ? `${Math.ceil(remSec / 60)}m` : `${remSec}s`;
  const list = document.getElementById("mutagen-list");
  list.innerHTML = "";
  for (const g of GENERATORS) {
    const lvl = genLevel(g.id), cost = genLevelCost(g.id);
    const broke = (state.mutagen || 0) < cost;
    const row = document.createElement("div");
    row.className = "node" + (broke ? " broke" : "");
    row.innerHTML = `
      <div class="node-top"><span>${g.name}</span>
        <span class="node-cost">${cost} 🧫</span></div>
      <div class="node-desc">+5% ${g.name} output per level.</div>
      <div class="node-lvl">Lv ${lvl} → +${(lvl + 1) * 5}%</div>`;
    if (!broke) row.addEventListener("click", () => uiHandlers.onLevelOrganelle(g.id));
    list.appendChild(row);
  }
}

// ---- Biomass Exchange ----
export function openMarket() { renderMarket(); el.marketModal.classList.remove("hidden"); }
export function renderMarket() {
  const M = marketState();
  document.getElementById("market-fee").textContent = Math.round(brokerFee() * 100) + "%";
  document.getElementById("broker-cost").textContent = M.brokers >= 9 ? "MAX" : formatNumber(brokerCost());
  const uv = marketUnitValue();
  const list = document.getElementById("market-list");
  list.innerHTML = "";
  for (const x of REAGENTS) {
    const r = M.r[x.id], held = M.held[x.id] || 0;
    const up = r.price >= r.prev;
    const unit = r.price * uv;
    const row = document.createElement("div");
    row.className = "market-row";
    row.innerHTML = `
      <div class="mk-name">${x.name}<span class="mk-mode mk-${r.mode}">${r.mode}</span></div>
      <div class="mk-price ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${formatNumber(Math.round(unit))}</div>
      <div class="mk-held">held: <b>${held}</b> · worth ${formatNumber(Math.round(held * unit))}</div>
      <div class="mk-btns">
        <button data-act="buy" data-id="${x.id}" data-q="1">Buy 1</button>
        <button data-act="buy" data-id="${x.id}" data-q="10">Buy 10</button>
        <button data-act="buy" data-id="${x.id}" data-q="max">Buy Max</button>
        <button data-act="sell" data-id="${x.id}" data-q="1" ${held < 1 ? "disabled" : ""}>Sell 1</button>
        <button data-act="sell" data-id="${x.id}" data-q="10" ${held < 1 ? "disabled" : ""}>Sell 10</button>
        <button data-act="sell" data-id="${x.id}" data-q="all" ${held < 1 ? "disabled" : ""}>Sell All</button>
      </div>`;
    for (const b of row.querySelectorAll("button")) {
      b.addEventListener("click", () => {
        const id = b.dataset.id, act = b.dataset.act;
        let q = b.dataset.q;
        if (q === "max") q = maxBuy(id);
        else if (q === "all") q = M.held[id] || 0;
        else q = parseInt(q, 10);
        if (act === "buy") uiHandlers.onMarketBuy(id, q);
        else uiHandlers.onMarketSell(id, q);
      });
    }
    list.appendChild(row);
  }
}

// ---- Gene Splicer minigame ----
let spliceSelA = null, spliceSelB = null;
export function openSplicer() {
  renderSplicer();
  el.spliceModal.classList.remove("hidden");
}
export function spliceResult(text) {
  const r = document.getElementById("splice-result");
  if (r) r.innerHTML = text;
}
function pickSplicePart(p) {
  if (!spliceSelA) spliceSelA = p;
  else if (!spliceSelB) spliceSelB = p;
  else { spliceSelA = p; spliceSelB = null; }
  renderSplicer();
}
export function renderSplicer() {
  document.getElementById("splice-found").textContent = splicesFound();
  document.getElementById("splice-a").textContent = spliceSelA ? PART_LABEL[spliceSelA] : "Part A";
  document.getElementById("splice-b").textContent = spliceSelB ? PART_LABEL[spliceSelB] : "Part B";
  // selectable parts — only those the creature actually has grown
  const counts = partCounts(state.mutations);
  const owned = PART_TYPES.filter((p) => (counts[p] || 0) > 0);
  const wrap = document.getElementById("splice-parts");
  wrap.innerHTML = owned.length ? "" : `<span class="genome-hint">Draft some mutations first — you need at least 2 body-part types to splice.</span>`;
  for (const p of owned) {
    const b = document.createElement("button");
    b.textContent = `${PART_LABEL[p]} ×${counts[p]}`;
    if (p === spliceSelA || p === spliceSelB) b.classList.add("active");
    b.addEventListener("click", () => pickSplicePart(p));
    wrap.appendChild(b);
  }
  refreshSpliceGo();
  // codex grid
  const grid = document.getElementById("splice-codex");
  grid.innerHTML = "";
  for (const h of HYBRID_LIST) {
    const found = !!(state.splices || {})[h.key];
    const cell = document.createElement("div");
    cell.className = "mut-pill" + (found ? " owned" : "");
    cell.title = found ? h.flavor : "Undiscovered hybrid";
    cell.textContent = found ? h.name : "???";
    grid.appendChild(cell);
  }
}
function refreshSpliceGo() {
  const go = document.getElementById("splice-go");
  if (!go) return;
  const cd = spliceCooldownLeft();
  const ready = cd <= 0 && spliceSelA && spliceSelB;
  go.disabled = !ready;
  go.textContent = cd > 0 ? `⏳ ${Math.ceil(cd / 1000)}s` : "🧬 SPLICE";
}

export function openHelix() {
  renderHelix();
  el.helixModal.classList.remove("hidden");
}
export function renderHelix() {
  document.getElementById("helix-avail").textContent = formatNumber(state.helix || 0);
  document.getElementById("transcensions-n").textContent = state.transcensions || 0;
  const list = document.getElementById("helix-list");
  list.innerHTML = "";
  for (const n of HELIX_NODES) {
    const lvl = helixNodeLevel(n.id);
    const cost = helixNodeCost(n.id);
    const maxed = !isFinite(cost);
    const broke = !maxed && (state.helix || 0) < cost;
    const row = document.createElement("div");
    row.className = "node" + (maxed ? " maxed" : broke ? " broke" : "");
    row.innerHTML = `
      <div class="node-top"><span>${n.name}</span>
        <span class="node-cost">${maxed ? (n.max > 1 ? "MAX" : "OWNED") : formatNumber(cost) + " 🌀"}</span></div>
      <div class="node-desc">${n.desc}</div>
      <div class="node-lvl">${n.max > 1 ? "Lv " + lvl + " / " + n.max : (lvl ? "active" : "locked")}</div>`;
    if (!maxed && !broke) row.addEventListener("click", () => uiHandlers.onBuyHelix(n.id));
    list.appendChild(row);
  }
}

export function openGenomeLab() {
  renderGenomeLab();
  el.genomeModal.classList.remove("hidden");
}

export function openHelp() {
  el.helpModal.classList.remove("hidden");
}

// ---- challenges ----
export function openChallenges() { renderChallenges(); el.chalModal.classList.remove("hidden"); }
export function renderChallenges() {
  const done = state.challengesDone || {};
  const active = state.challenge;
  const wk = currentWeekly();
  const daily = state.dailyActive;
  el.chalBody.innerHTML = `
    <div class="trait"><div class="tn">📅 Weekly Event — ${wk.name}</div><div class="tf">${wk.desc} · active for everyone this week</div></div>
    <div class="trait ${daily ? "got" : ""}">
      <div class="tn">🎲 Daily Seed #${todaySeed()}</div>
      <div class="tf">Same mutation draws for everyone today. Today's best: ${formatNumber(dailyBestToday())} biomass</div>
      ${daily ? `<button class="ghost" id="daily-end">Finish daily run</button>` : `<button class="ghost" id="daily-start">Start daily run (resets run)</button>`}
    </div>
    <h3>Challenge Runs</h3>
    ${active && active !== "daily" ? `<div class="trait got"><div class="tn">⚔️ Active challenge</div><div class="tf">Reach the goal — or abandon below.</div></div>` : `<p class="help-tip" style="margin-bottom:10px">Starting a challenge resets your current run (your Species, Genome &amp; achievements are kept).</p>`}
    ${CHALLENGES.map((c) => `
      <div class="trait ${done[c.id] ? "got" : ""}">
        <div class="tn">${done[c.id] ? "✓ " : ""}${c.name}</div>
        <div class="tf">${c.desc}</div>
        <div class="tp">goal ${formatNumber(c.goal)} biomass · reward ${c.reward} 🎲</div>
        <button class="ghost chal-start" data-id="${c.id}" ${active ? "disabled" : ""}>${active === c.id ? "in progress" : "Start"}</button>
      </div>`).join("")}
    ${active ? `<button id="chal-abandon" class="ghost danger">Abandon challenge</button>` : ""}`;
  el.chalBody.querySelectorAll(".chal-start").forEach((b) => b.addEventListener("click", () => uiHandlers.onStartChallenge(b.dataset.id)));
  const ab = document.getElementById("chal-abandon");
  if (ab) ab.addEventListener("click", () => uiHandlers.onAbandonChallenge());
  const ds = document.getElementById("daily-start");
  if (ds) ds.addEventListener("click", () => uiHandlers.onStartDaily());
  const de = document.getElementById("daily-end");
  if (de) de.addEventListener("click", () => uiHandlers.onEndDaily());
}

// ---- codex: species traits + set forms + mutation encyclopedia + museum ----
export function openCodex() {
  renderCodex();
  el.codexModal.classList.remove("hidden");
}

function renderCodex() {
  const dt = state.discoveredTraits || {};
  const muts = state.mutations || [];

  const traits = SYNERGIES.map((s) => {
    const got = !!dt[s.id];
    if (got) return `<div class="trait got"><div class="tn">⭐ ${s.name}</div><div class="tf">"${s.flavor}"</div></div>`;
    if (s.hidden) return `<div class="trait hidden-trait"><div class="tn">??? — Hidden Evolution</div><div class="tf">A secret combination awaits.</div></div>`;
    const p = synergyProgress(s, muts);
    return `<div class="trait"><div class="tn">${s.name}</div><div class="tf">${s.hint || ""}</div><div class="tp">${p.have} / ${p.need}</div></div>`;
  }).join("");

  const sets = SETS.map((s) => {
    const p = setProgress(s, muts);
    const done = p.have >= p.need;
    const owned = new Set(muts);
    const members = s.members.map((id) => {
      const d = getMutation(id);
      const has = owned.has(id);
      return `<span class="mut-pill ${has ? "" : "locked"}" ${has ? `style="border-color:${RARITY[d.rarity].color}"` : ""}>${has ? d.name : "???"}</span>`;
    }).join("");
    return `<div class="trait ${done ? "got" : ""}">
      <div class="tn">${done ? "⭐ " : ""}${s.name} Set → <i>${s.form}</i></div>
      <div class="tp">${p.have} / ${p.need}</div>
      <div class="mut-grid" style="margin-top:6px">${members}</div></div>`;
  }).join("");

  const discovered = state.discovered || {};
  const pills = MUTATIONS.map((m) => {
    const found = !!discovered[m.id];
    const color = RARITY[m.rarity].color;
    return found
      ? `<span class="mut-pill" style="border-color:${color};color:${color}" title="${m.desc}">${m.name}</span>`
      : `<span class="mut-pill locked">???</span>`;
  }).join("");

  const tCount = SYNERGIES.filter((s) => dt[s.id]).length;
  const fossils = state.fossils || [];
  const fossilHtml = fossils.length
    ? fossils.map((f) => `<span class="mut-pill" style="border-color:#caa46a;color:#caa46a">🦴 ${f}</span>`).join("")
    : `<span class="mut-pill locked">no fossils yet — beat bosses to find them</span>`;
  el.codexBody.innerHTML = `
    <h3>⭐ Species Traits · ${tCount} / ${SYNERGIES.length} discovered</h3>
    ${traits}
    <h3>🧩 Set Forms</h3>
    ${sets}
    <h3>🏛️ Museum · ${fossils.length} / 10 fossils</h3>
    <div class="mut-grid">${fossilHtml}</div>
    <h3>🦠 Mutation Encyclopedia · ${Object.keys(discovered).length} / ${MUTATIONS.length}</h3>
    <div class="mut-grid">${pills}</div>`;
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
    if ((state.musicTrack || "lofi") === t.id) b.classList.add("active");
    b.addEventListener("click", () => { uiHandlers.onSetTheme(t.id); renderSettings(); });
    el.setThemes.appendChild(b);
  }
  el.setBg.innerHTML = "";
  for (const bg of BACKGROUNDS) {
    const b = document.createElement("button");
    b.textContent = bg.name;
    if ((state.background || "aurora") === bg.id) b.classList.add("active");
    b.addEventListener("click", () => { uiHandlers.onSetBackground(bg.id); renderSettings(); });
    el.setBg.appendChild(b);
  }
  for (const b of el.setShake.querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.v === (state.shake || "subtle"));
  }
  for (const b of el.setGraphics.querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.v === (state.graphics || "medium"));
  }
  for (const b of el.setNaming.querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.v === (state.namingStyle || "scientific"));
  }
  el.setReduce.checked = !!state.reduceMotion;
  if (el.setEyeTrack) el.setEyeTrack.checked = !!state.eyeTrack;
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
  const secs = Math.floor(s.playSeconds || 0);
  const playtime = secs >= 3600 ? `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const stats = [
    stat("Lifetime biomass", formatNumber(s.lifetimeBiomass || 0)),
    stat("Evolutions", formatNumber(s.prestiges || 0)),
    stat("Speciations", formatNumber(s.speciations || 0)),
    stat("Genome", formatNumber(s.genome || 0)),
    stat("Species banked", (s.species || []).length),
    stat("Evolution Points", formatNumber(s.evolutionPoints || 0)),
    stat("Time played", playtime),
    stat("Total clicks", formatNumber(s.totalClicks || 0)),
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

  // Species history (your evolutionary lineage)
  const species = s.species || [];
  const history = species.length
    ? species.map((sp, i) => `<div class="hist-row">
        <span class="hist-n">${i + 1}</span>
        <span class="hist-name">${sp.name}</span>
        <span class="hist-meta">${(sp.mutations || []).length} mutations · ×${formatNumber(Math.sqrt(Math.max(1, sp.strength || 1)))}</span>
      </div>`).join("")
    : `<div class="empty">No species yet — reach the wall and Speciate to start your lineage.</div>`;

  el.statsBody.innerHTML = `
    <div class="stats-grid">${stats}</div>
    <h3>🧬 Species History · ${species.length} banked</h3>
    <div class="hist-list">${history}</div>
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

  // skins
  const skinList = document.getElementById("skin-list");
  if (skinList) {
    skinList.innerHTML = "";
    const owned = state.skinsOwned || { default: true };
    for (const sk of SKINS) {
      const b = document.createElement("button");
      const isOwned = !!owned[sk.id];
      const equipped = (state.skin || "default") === sk.id;
      b.className = equipped ? "active" : "";
      b.textContent = equipped ? `${sk.name} ✓` : isOwned ? sk.name : `${sk.name} · ${sk.cost}◆`;
      b.addEventListener("click", () => uiHandlers.onBuySkin(sk.id));
      skinList.appendChild(b);
    }
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
    row.addEventListener("click", () => {
      if (sellMode) uiHandlers.onSell(g.id);
      else if (onBuy) onBuy(g.id, row.getBoundingClientRect());
    });
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

  // active temporary buffs (explains why /sec swings up then drops)
  const buffs = activeBuffs();
  el.rate.classList.toggle("boosted", buffs.length > 0);
  if (buffs.length) {
    const now = Date.now();
    el.buffLine.classList.remove("hidden");
    el.buffLine.innerHTML = buffs.map((b) => {
      const left = Math.max(0, Math.ceil((b.expiresAt - now) / 1000));
      const label = b.id === "bloom" ? "Frenzy" : b.id === "digest" ? "Digest" : b.id;
      const mult = b.prodMult ? `×${formatNumber(b.prodMult)}` : "";
      return `⚡ ${label} ${mult} · ${left}s left (temporary)`;
    }).join("&nbsp;&nbsp;");
  } else {
    el.buffLine.classList.add("hidden");
  }

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
  if (maxed) {
    // gentle, optional nudge — never an alarm. Production keeps growing past here.
    el.pressureWarn.textContent = "Production is leveling off — Evolve or Speciate for a fresh multiplier";
  }

  // speciate availability + genome readout
  const canSpec = canSpeciate();
  el.speciateBtn.classList.toggle("hidden", !canSpec);
  if (canSpec) el.speciateGain.textContent = `+${formatNumber(genomeForSpeciate())} Genome`;
  el.genomeValue.textContent = formatNumber(state.genome || 0);

  // Transcend (3rd prestige) — show as a LOCKED TEASER once you're a few
  // Speciations in, so players can SEE the next layer coming (with progress),
  // not just hit an invisible wall. Unlocks for real at 8 Speciations.
  const spec = state.speciations || 0;
  const everTr = (state.transcensions || 0) > 0;
  const showTr = spec >= 3 || everTr;
  el.transcendBtn.classList.toggle("hidden", !showTr);
  if (showTr) {
    const canTr = canTranscend();
    el.transcendBtn.classList.toggle("locked", !canTr);
    el.transcendBtn.disabled = !canTr;
    el.transcendGain.textContent = canTr ? `+${formatNumber(transcendGain())} Helix` : `🔒 ${spec}/8 Speciations`;
  }
  const showHelix = everTr || (state.helix || 0) > 0;
  el.helixBtn.classList.toggle("hidden", !showHelix);
  if (showHelix) el.helixValue.textContent = formatNumber(state.helix || 0);
  // live Gene Splicer cooldown while its modal is open
  if (el.spliceModal && !el.spliceModal.classList.contains("hidden")) refreshSpliceGo();
  // Upgrade Store button: show with a badge of how many you can afford right now
  const avail = availableUpgrades();
  el.upgradesBtn.classList.toggle("hidden", avail.length === 0);
  const aff = affordableUpgradeCount();
  el.upgradesBadge.textContent = aff > 0 ? `${aff} ⚡` : `${avail.length}`;
  el.upgradesBtn.classList.toggle("ready", aff > 0);
  if (el.upgradesModal && !el.upgradesModal.classList.contains("hidden")) renderUpgrades();

  // auto-buy toggle (only shown once the Mitosis Engine node is owned)
  if (nodeLevel(state, "auto_gen") > 0) {
    el.autobuyToggle.classList.remove("hidden");
    const on = state.autoBuyOn !== false;
    el.autobuyToggle.textContent = on ? "Auto-buy: ON" : "Auto-buy: OFF";
    el.autobuyToggle.classList.toggle("off", !on);
  } else {
    el.autobuyToggle.classList.add("hidden");
  }

  // mutation chips + creature name (rebuild only when the set changes)
  if (el._mutSig !== state.mutations.join(",")) {
    el._mutSig = state.mutations.join(",");
    renderMutationChips();
    el.creatureName.textContent = creatureName(state.mutations, state.namingStyle || "scientific");
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

const DRAFT_GLYPH = { eye: "👁️", spike: "🦴", tentacle: "🐙", jaw: "🦷", frond: "🌿", cilia: "✨", body: "🦠" };
// Show the mutation draft. onPick(id) when chosen; onReroll() if a reroll token is spent.
export function showDraft(ids, onPick, onReroll, onSkip) {
  el.draftCards.innerHTML = "";
  let di = 0;
  for (const id of ids) {
    const def = getMutation(id);
    if (!def) continue;
    const r = RARITY[def.rarity];
    const high = def.alien || def.rarity === "legendary" || def.rarity === "epic";
    const card = document.createElement("div");
    card.className = "draft-card reveal" + (high ? " glow" : "") + (def.defect ? " defect" : "") + (def.alien ? " alien" : "");
    card.style.animationDelay = (di++ * 0.1).toFixed(2) + "s";
    card.style.setProperty("--rarity", def.alien ? "#39d0c6" : def.defect ? "#ff6b6b" : r.color);
    const glyph = def.alien ? "👽" : (DRAFT_GLYPH[def.part] || "🧬");
    card.innerHTML = `
      <div class="rarity">${def.alien ? "👽 ALIEN DNA" : def.defect ? "⚠ CURSED" : r.label}</div>
      <div class="draft-spin"><span>${glyph}</span></div>
      <div class="mname">${def.name}</div>
      ${def.part ? `<div class="part-tag">＋ grows a ${def.part}</div>` : ""}
      <div class="mdesc">${def.desc}</div>`;
    card.addEventListener("click", () => { el.draftModal.classList.add("hidden"); onPick(id); });
    el.draftCards.appendChild(card);
  }
  // reroll button (spends a token)
  let rr = document.getElementById("draft-reroll");
  if (!rr) {
    rr = document.createElement("button");
    rr.id = "draft-reroll";
    rr.className = "ghost";
    document.querySelector(".draft-inner").appendChild(rr);
  }
  if (onReroll && (state.rerolls || 0) > 0) {
    rr.style.display = "";
    rr.textContent = `🎲 Reroll (${state.rerolls})`;
    rr.onclick = () => onReroll();
  } else {
    rr.style.display = "none";
  }
  // skip button — you don't have to take a mutation
  let sk = document.getElementById("draft-skip");
  if (!sk) {
    sk = document.createElement("button");
    sk.id = "draft-skip";
    sk.className = "ghost";
    document.querySelector(".draft-inner").appendChild(sk);
  }
  sk.textContent = "Skip — keep my current form";
  sk.onclick = () => { el.draftModal.classList.add("hidden"); if (onSkip) onSkip(); };
  el.draftModal.classList.remove("hidden");
}

// Generic 2+ option choice modal (events). options: [{label, desc, color}].
export function showChoice(title, sub, options, onPick) {
  const modal = document.getElementById("choice-modal");
  document.getElementById("choice-title").textContent = title;
  document.getElementById("choice-sub").textContent = sub;
  const cards = document.getElementById("choice-cards");
  cards.innerHTML = "";
  options.forEach((o, i) => {
    const card = document.createElement("div");
    card.className = "draft-card";
    card.style.setProperty("--rarity", o.color || "#56e39f");
    card.innerHTML = `<div class="mname">${o.label}</div><div class="mdesc">${o.desc}</div>`;
    card.addEventListener("click", () => { modal.classList.add("hidden"); onPick(i); });
    cards.appendChild(card);
  });
  modal.classList.remove("hidden");
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
