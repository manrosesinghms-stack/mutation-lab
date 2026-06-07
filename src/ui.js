// DOM rendering: resource readouts, generator list, click fx, buttons.

import { state } from "./state.js";
import { GENERATORS } from "./data/generators.js";
import {
  costOf, canAfford, isUnlocked, costForN, maxAffordable, productionBreakdown,
  epForReset, canPrestige, effectiveClickPower, pressureLevel,
  canSpeciate, genomeForSpeciate, equipSlots, activeBuffs,
  currentWeekly, dailyBestToday, todaySeed, dailyScoreToday, dailyHistory,
  canTranscend, transcendGain, helixNodeLevel, helixNodeCost,
  canSplice, spliceCooldownLeft, splicesFound,
  availableUpgrades, affordableUpgradeCount,
  REAGENTS, marketState, marketUnitValue, brokerFee, brokerCost, maxBuy,
  mutagenProgress, genLevel, genLevelCost,
  catalyst, catalystMax, symbioteStage,
  gardenPlots, gardenMature, gardenProgress,
  colonyNodes, colonyCount,
  machineLevel, machineCost, dronesClicksPerSec, dronesPerSec,
  automatorOwned, automatorOn,
  evolutionStage, evoPathId,
  museumList, museumCount,
  researchName, researchTiers, nextResearch,
  atlasFamilies, masteriesComplete,
  cultureMult, cultureCount,
  digestActive,
  currentArchetype, buildScore, draftHint, lineageBonus,
} from "./economy.js";
import { RESEARCH_TIERS } from "./data/research.js";
import { COLONY_NODES } from "./data/colony.js";
import { DRONES, AUTOMATORS, FACTORY } from "./data/machines.js";
import { EVO_STAGES } from "./data/stages.js";
import { EVO_PATHS } from "./data/paths.js";
import { SEEDS, SEED_BY_ID } from "./data/garden.js";
import { HELIX_NODES } from "./data/helix.js";
import { SPELLS } from "./data/spells.js";
import { SEASONS } from "./data/seasons.js";
import { ANCESTRAL_GENES, GENE_BY_ID, PANTHEON_SLOTS, SYMBIOTE_STAGES, SYMBIOTE_THRESH, SYMBIOTE_AURAS } from "./data/genes.js";
import { PART_TYPES, PART_LABEL, HYBRID_LIST } from "./data/hybrids.js";
import { partCounts } from "./data/synergies.js";
import { formatNumber } from "./format.js";
import { getMutation, RARITY, MUTATIONS, EDITIONS } from "./data/mutations.js";
import { backendOn, fetchDailyLeaderboard } from "./net.js";
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
let buyAmt = 1; // bulk-buy amount: 1 | 10 | 100 | "max"
let _genHeavyAt = 0, _bdCache = null; // throttle the expensive cost-label/tooltip recompute
// resolve how many to buy from the selector + click modifiers (Shift=10, Ctrl=100)
function amountFor(e, genId) {
  let n = buyAmt;
  if (e && e.shiftKey) n = 10;
  if (e && (e.ctrlKey || e.metaKey)) n = 100;
  if (n === "max") return Math.max(1, maxAffordable(genId));
  return n;
}

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
  el.reactorModal = document.getElementById("reactor-modal");
  el.pantheonModal = document.getElementById("pantheon-modal");
  el.symbioteModal = document.getElementById("symbiote-modal");
  el.gardenModal = document.getElementById("garden-modal");
  el.colonyModal = document.getElementById("colony-modal");
  el.machinesModal = document.getElementById("machines-modal");
  el.pathsModal = document.getElementById("paths-modal");
  el.museumModal = document.getElementById("museum-modal");
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
  // bulk-buy amount selector (×1 / ×10 / ×100 / Max)
  const amtBox = document.getElementById("buy-amt");
  if (amtBox) amtBox.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    buyAmt = b.dataset.amt === "max" ? "max" : parseInt(b.dataset.amt, 10);
    amtBox.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    _genHeavyAt = 0; // refresh cost labels immediately, don't wait for the next throttle tick
  }));

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
  document.getElementById("tree-btn").addEventListener("click", () => openTreeOfLife());
  document.getElementById("tree-close").addEventListener("click", () => document.getElementById("tree-modal").classList.add("hidden"));
  document.getElementById("splice-btn").addEventListener("click", () => openSplicer());
  document.getElementById("market-btn").addEventListener("click", () => openMarket());
  document.getElementById("market-close").addEventListener("click", () => el.marketModal.classList.add("hidden"));
  document.getElementById("broker-buy").addEventListener("click", () => uiHandlers.onBuyBroker());
  document.getElementById("mutagen-btn").addEventListener("click", () => openMutagen());
  document.getElementById("mutagen-close").addEventListener("click", () => el.mutagenModal.classList.add("hidden"));
  document.getElementById("reactor-btn").addEventListener("click", () => openReactor());
  document.getElementById("reactor-close").addEventListener("click", () => el.reactorModal.classList.add("hidden"));
  document.getElementById("pantheon-btn").addEventListener("click", () => openPantheon());
  document.getElementById("pantheon-close").addEventListener("click", () => el.pantheonModal.classList.add("hidden"));
  document.getElementById("symbiote-btn").addEventListener("click", () => openSymbiote());
  document.getElementById("symbiote-close").addEventListener("click", () => el.symbioteModal.classList.add("hidden"));
  document.getElementById("symbiote-feed").addEventListener("click", () => uiHandlers.onFeedSymbiote());
  document.getElementById("garden-btn").addEventListener("click", () => openGarden());
  document.getElementById("garden-close").addEventListener("click", () => el.gardenModal.classList.add("hidden"));
  document.getElementById("colony-btn").addEventListener("click", () => openColony());
  document.getElementById("colony-close").addEventListener("click", () => el.colonyModal.classList.add("hidden"));
  document.getElementById("machines-btn").addEventListener("click", () => openMachines());
  document.getElementById("machines-close").addEventListener("click", () => el.machinesModal.classList.add("hidden"));
  document.getElementById("paths-btn").addEventListener("click", () => openPaths());
  document.getElementById("paths-close").addEventListener("click", () => el.pathsModal.classList.add("hidden"));
  document.getElementById("museum-btn").addEventListener("click", () => openMuseum());
  document.getElementById("museum-close").addEventListener("click", () => el.museumModal.classList.add("hidden"));
  document.getElementById("evo-rank").addEventListener("click", () => openPaths()); // rank strip opens the path picker
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
  el.setSeason = document.getElementById("set-season");
  el.setAberration = document.getElementById("set-aberration");
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
  el.setSeason.addEventListener("click", (e) => { const v = e.target.dataset.v; if (v) { handlers.onSetSeason(v); renderSettings(); } });
  el.setAberration.addEventListener("change", () => { handlers.onSetAberration(el.setAberration.checked); });
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
// Inline upgrade tray: compact clickable chips for everything you can afford
// RIGHT NOW. Only rebuilt when the affordable set changes (signature cache) so
// the chips stay stable and clickable — never recreated mid-click each frame.
let _trayKey = "";
function renderUpgradeTray(avail) {
  const tray = document.getElementById("upgrade-tray");
  if (!tray) return;
  const buyable = (avail || availableUpgrades())
    .filter((u) => (state.biomass || 0) >= u.cost)
    .sort((a, b) => a.cost - b.cost);
  const key = buyable.map((u) => u.id).join(",");
  if (key === _trayKey) return; // unchanged → leave the DOM (and click targets) alone
  _trayKey = key;
  tray.innerHTML = "";
  for (const u of buyable.slice(0, 30)) {
    const type = u.click ? "click" : u.prod ? "prod" : "gen";
    const glyph = u.click ? "✋" : u.prod ? "⚙" : "⬡";
    const chip = document.createElement("button");
    chip.className = "upg-chip " + type;
    chip.innerHTML = `<span class="ug">${glyph}</span><span class="uc">${formatNumber(u.cost)}</span>`;
    chip.title = `${u.name} — ${u.desc} · ${u.cond} · costs ${formatNumber(u.cost)}`;
    chip.addEventListener("click", () => { uiHandlers.onBuyUpgrade(u.id); _trayKey = ""; renderUpgradeTray(); });
    tray.appendChild(chip);
  }
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
      ${u.flavor ? `<div class="node-flavor">"${u.flavor}"</div>` : ""}
      <div class="node-lvl">${u.cond}</div>`;
    if (!broke) row.addEventListener("click", () => uiHandlers.onBuyUpgrade(u.id));
    list.appendChild(row);
  }
}

// ---- Colonization Map ----
export function openColony() { renderColony(); el.colonyModal.classList.remove("hidden"); }
export function renderColony() {
  document.getElementById("colony-count").textContent = colonyCount();
  document.getElementById("colony-total").textContent = COLONY_NODES.length;
  const list = document.getElementById("colony-list");
  list.innerHTML = "";
  // show claimed + the current frontier (unlocked, unclaimed); hide deep-locked
  for (const e of colonyNodes()) {
    if (!e.claimed && !e.unlocked) continue; // hidden beyond the frontier
    const { node: n } = e;
    const row = document.createElement("div");
    row.className = "node" + (e.claimed ? " maxed" : (e.affordable ? "" : " broke"));
    row.innerHTML = `<div class="node-top"><span>${e.claimed ? "✓ " : ""}${n.name}</span>
        <span class="node-cost">${e.claimed ? "CLAIMED" : formatNumber(n.cost)}</span></div>
      <div class="node-desc">${n.desc}</div>`;
    if (!e.claimed && e.unlocked && e.affordable) row.addEventListener("click", () => uiHandlers.onClaimColony(n.id));
    list.appendChild(row);
  }
}

// ---- Automation Bay (drones + automators + factory) ----
export function openMachines() { renderMachines(); el.machinesModal.classList.remove("hidden"); }
export function renderMachines() {
  // summary line
  const cps = dronesClicksPerSec();
  document.getElementById("mach-summary").textContent =
    cps > 0 ? `${cps.toFixed(1)} auto-clicks/sec → +${formatNumber(dronesPerSec())}/sec` : "No drones yet — buy one to auto-click.";

  // drones
  const dl = document.getElementById("mach-drones");
  dl.innerHTML = "";
  for (const d of DRONES) {
    const lvl = machineLevel(d.id);
    const cost = machineCost(d.id);
    const aff = (state.biomass || 0) >= cost;
    const row = document.createElement("div");
    row.className = "node" + (aff ? "" : " broke");
    row.innerHTML = `<div class="node-top"><span>${d.name}${lvl ? ` <b class="mk-lvl">Lv ${lvl}</b>` : ""}</span>
        <span class="node-cost">${formatNumber(cost)}</span></div>
      <div class="node-desc">${d.desc}${lvl ? ` — now +${(lvl * d.cps).toFixed(1)}/sec` : ""}</div>`;
    if (aff) row.addEventListener("click", () => uiHandlers.onBuyMachine(d.id));
    dl.appendChild(row);
  }

  // automators
  const al = document.getElementById("mach-autos");
  al.innerHTML = "";
  for (const a of AUTOMATORS) {
    const owned = automatorOwned(a.id);
    const on = automatorOn(a.id);
    const aff = (state.biomass || 0) >= a.cost;
    const row = document.createElement("div");
    row.className = "node" + (owned ? " maxed" : (aff ? "" : " broke"));
    row.innerHTML = `<div class="node-top"><span>${a.icon} ${a.name}</span>
        <span class="node-cost">${owned ? (on ? "● ON" : "○ OFF") : formatNumber(a.cost)}</span></div>
      <div class="node-desc">${a.desc}</div>`;
    if (!owned && aff) row.addEventListener("click", () => uiHandlers.onBuyAutomator(a.id));
    else if (owned) row.addEventListener("click", () => uiHandlers.onToggleAutomator(a.id));
    al.appendChild(row);
  }

  // factory
  const fl = document.getElementById("mach-factory");
  fl.innerHTML = "";
  for (const f of FACTORY) {
    const lvl = machineLevel(f.id);
    const cost = machineCost(f.id);
    const aff = (state.biomass || 0) >= cost;
    const row = document.createElement("div");
    row.className = "node" + (aff ? "" : " broke");
    row.innerHTML = `<div class="node-top"><span>${f.name}${lvl ? ` <b class="mk-lvl">Lv ${lvl}</b>` : ""}</span>
        <span class="node-cost">${formatNumber(cost)}</span></div>
      <div class="node-desc">${f.desc} <i>(${f.unit})</i></div>`;
    if (aff) row.addEventListener("click", () => uiHandlers.onBuyMachine(f.id));
    fl.appendChild(row);
  }
}

// ---- Evolution Paths (choose your lineage / build) ----
export function openPaths() { renderPaths(); el.pathsModal.classList.remove("hidden"); }
export function renderPaths() {
  const cur = evoPathId();
  const evo = evolutionStage();
  document.getElementById("paths-sub").textContent = cur
    ? `Current lineage: ${evo.pathData.icon} ${evo.pathData.name}. Pick another to re-specialize — your rank & creature carry over.`
    : "Choose your creature's lineage. This defines what it BECOMES at every stage, plus a build bonus that grows as you ascend.";
  const list = document.getElementById("paths-list");
  list.innerHTML = "";
  for (const p of EVO_PATHS) {
    const card = document.createElement("div");
    card.className = "path-card" + (cur === p.id ? " chosen" : "");
    const col = "#" + p.color.toString(16).padStart(6, "0");
    card.style.setProperty("--pc", col);
    card.innerHTML = `
      <div class="path-top"><span class="path-name">${p.icon} ${p.name}</span>
        ${cur === p.id ? '<span class="path-cur">● ACTIVE</span>' : ""}</div>
      <div class="path-blurb">${p.blurb}</div>
      <div class="path-bonus">⚡ ${p.bonusText}</div>
      <div class="path-stages">${p.stages.map((s, i) => `<span${i === evo.index ? ' class="now"' : ""}>${s}</span>`).join(" → ")}</div>`;
    card.addEventListener("click", () => uiHandlers.onChoosePath(p.id));
    list.appendChild(card);
  }
}

// ---- Species Museum (permanent lineage of every creature you've evolved) ----
const PART_EMOJI = { eye: "👁️", tentacle: "🌿", spike: "🔻", jaw: "🦷", frond: "🍃", cilia: "〰️", body: "⬡" };
export function openMuseum() { renderMuseum(); el.museumModal.classList.remove("hidden"); }
export function renderMuseum() {
  const list = museumList();
  document.getElementById("museum-count").textContent = list.length;
  const cur = evolutionStage();
  document.getElementById("museum-sub").textContent = list.length
    ? `Every creature you've ever evolved, preserved forever. Currently embodying Generation ${list.length + 1} — ${cur.pathData ? cur.pathData.icon + " " : ""}${cur.name}.`
    : "Your lineage is empty. Each time you Speciate, the creature you became is preserved here forever.";
  const wrap = document.getElementById("museum-list");
  wrap.innerHTML = "";
  if (!list.length) {
    wrap.innerHTML = `<div class="museum-empty">No specimens yet — reach the wall and <b>Speciate</b> to archive your first creature.</div>`;
    return;
  }
  // newest first so your latest evolutions are on top
  for (let i = list.length - 1; i >= 0; i--) {
    const sp = list[i];
    const col = "#" + (sp.color || 0x66ffcc).toString(16).padStart(6, "0");
    const parts = (sp.parts || []).map((p) => PART_EMOJI[p] || "•").join(" ");
    const card = document.createElement("div");
    card.className = "specimen";
    card.style.setProperty("--sc", col);
    card.innerHTML = `
      <div class="spec-emblem" style="background:${col}">${sp.pathIcon || "🧬"}</div>
      <div class="spec-body">
        <div class="spec-top"><span class="spec-gen">GEN ${sp.gen}</span> <span class="spec-name">${sp.name}</span></div>
        <div class="spec-stage">${sp.stage}${sp.path ? "" : " · base form"} · Rank ${sp.rank}</div>
        <div class="spec-parts">${parts || "<span class='spec-bald'>no mutations</span>"} <span class="spec-muts">${sp.muts} mutation${sp.muts === 1 ? "" : "s"}</span></div>
      </div>`;
    wrap.appendChild(card);
  }
}

// ---- Petri Garden ----
let gardenSeed = "vine";
export function openGarden() { renderGarden(); el.gardenModal.classList.remove("hidden"); }
export function renderGarden() {
  const seeds = document.getElementById("garden-seeds");
  seeds.innerHTML = "";
  for (const s of SEEDS) {
    const b = document.createElement("button");
    b.textContent = `${s.emoji} ${s.name}`;
    if (s.id === gardenSeed) b.classList.add("active");
    b.addEventListener("click", () => { gardenSeed = s.id; renderGarden(); });
    seeds.appendChild(b);
  }
  const grid = document.getElementById("garden-grid");
  grid.innerHTML = "";
  const plots = gardenPlots();
  for (let i = 0; i < plots.length; i++) {
    const p = plots[i], cell = document.createElement("div");
    cell.className = "plot";
    if (!p) { cell.classList.add("empty"); cell.innerHTML = `<span class="plot-plus">+</span>`; }
    else {
      const s = SEED_BY_ID[p.seed], mature = gardenMature(i);
      cell.classList.add(mature ? "ripe" : "growing");
      cell.innerHTML = `<span class="plot-emoji">${s.emoji}</span>` +
        (mature ? `<span class="plot-tag">ripe ✓</span>` : `<span class="plot-bar"><span style="width:${(gardenProgress(i) * 100).toFixed(0)}%"></span></span>`);
    }
    cell.addEventListener("click", () => {
      if (!plots[i]) uiHandlers.onPlant(i, gardenSeed);
      else if (gardenMature(i)) uiHandlers.onHarvest(i);
    });
    grid.appendChild(cell);
  }
}

// ---- Reactor (spells) ----
export function openReactor() { renderReactor(); el.reactorModal.classList.remove("hidden"); }
export function renderReactor() {
  const c = catalyst();
  document.getElementById("catalyst-have").textContent = c;
  document.getElementById("catalyst-max").textContent = catalystMax();
  document.getElementById("catalyst-fill").style.width = (c / catalystMax() * 100).toFixed(1) + "%";
  const list = document.getElementById("reactor-list");
  list.innerHTML = "";
  for (const sp of SPELLS) {
    const broke = c < sp.cost;
    const row = document.createElement("div");
    row.className = "node" + (broke ? " broke" : "");
    row.innerHTML = `<div class="node-top"><span>${sp.name}</span><span class="node-cost">${sp.cost} ⚗</span></div>
      <div class="node-desc">${sp.desc}</div>`;
    if (!broke) row.addEventListener("click", () => uiHandlers.onCastSpell(sp.id));
    list.appendChild(row);
  }
}

// ---- Genome Pantheon ----
export function openPantheon() { renderPantheon(); el.pantheonModal.classList.remove("hidden"); }
export function renderPantheon() {
  const wrap = document.getElementById("pantheon-slots");
  wrap.innerHTML = "";
  const cycle = [null, ...ANCESTRAL_GENES.map((g) => g.id)];
  for (const slot of PANTHEON_SLOTS) {
    const cur = (state.pantheon || {})[slot.id] || null;
    const g = GENE_BY_ID[cur];
    const row = document.createElement("div");
    row.className = "node" + (g ? " maxed" : "");
    row.innerHTML = `<div class="node-top"><span>${slot.name} slot</span><span class="node-cost">×${slot.weight}</span></div>
      <div class="node-desc">${g ? `<b>${g.name}</b> — ${g.desc}` : "empty — click to slot a gene"}</div>`;
    row.addEventListener("click", () => {
      const i = cycle.indexOf(cur);
      uiHandlers.onSetPantheon(slot.id, cycle[(i + 1) % cycle.length]);
    });
    wrap.appendChild(row);
  }
}

// ---- Symbiote ----
export function openSymbiote() { renderSymbiote(); el.symbioteModal.classList.remove("hidden"); }
export function renderSymbiote() {
  const st = symbioteStage();
  const fed = (state.symbiote && state.symbiote.fed) || 0;
  document.getElementById("symbiote-stage").textContent = SYMBIOTE_STAGES[st];
  document.getElementById("symbiote-fed").textContent = fed;
  const next = SYMBIOTE_THRESH[st + 1];
  const prevT = SYMBIOTE_THRESH[st] || 0;
  const prog = next ? Math.min(1, (fed - prevT) / (next - prevT)) : 1;
  document.getElementById("symbiote-fill").style.width = (prog * 100).toFixed(1) + "%";
  const wrap = document.getElementById("symbiote-auras");
  wrap.innerHTML = "";
  for (const a of SYMBIOTE_AURAS) {
    const locked = st < a.minStage;
    const active = (state.symbiote || {}).aura === a.id;
    const row = document.createElement("div");
    row.className = "node" + (active ? " maxed" : locked ? " broke" : "");
    row.innerHTML = `<div class="node-top"><span>${a.name}${active ? " ✓" : ""}</span><span class="node-cost">${locked ? "🔒 " + SYMBIOTE_STAGES[a.minStage] : "aura"}</span></div>
      <div class="node-desc">${a.desc}</div>`;
    if (!locked) row.addEventListener("click", () => uiHandlers.onSetAura(a.id));
    wrap.appendChild(row);
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
  const todayScore = dailyScoreToday();
  const hist = dailyHistory(6);
  el.chalBody.innerHTML = `
    <div class="trait"><div class="tn">📅 Weekly Event — ${wk.name}</div><div class="tf">${wk.desc} · active for everyone this week</div></div>
    <div class="trait ${daily ? "got" : ""}">
      <div class="tn">🎲 Daily Monster · Seed #${todaySeed()}</div>
      <div class="tf">Everyone gets the same draws today — grow the best monster you can, then share your Build Score. ${todayScore ? `Today's best: <b>BUILD ${todayScore.score}</b> (${formatNumber(todayScore.biomass)} biomass)` : "Not attempted yet today."}</div>
      ${daily ? `<button class="ghost" id="daily-end">Finish &amp; share monster</button>` : `<button class="ghost" id="daily-start">Start daily run (resets run)</button>`}
      ${hist.length ? `<div class="daily-ladder"><div class="dl-h">Your recent dailies</div>${hist.map((h) => `<div class="dl-row"><span>#${h.seed}</span><span>BUILD <b>${h.score}</b></span><span>${formatNumber(h.biomass)}</span></div>`).join("")}</div>` : ""}
      ${backendOn() ? `<div id="global-board" class="daily-ladder"></div>` : ""}
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
  if (backendOn()) fillGlobalBoard(todaySeed());
}

// Async-fill the online daily leaderboard (degrades silently if the backend is
// unreachable; the local ladder above always shows regardless).
async function fillGlobalBoard(seed) {
  const box = document.getElementById("global-board");
  if (!box) return;
  box.innerHTML = `<div class="dl-h">🌐 Global top — loading…</div>`;
  const rows = await fetchDailyLeaderboard(seed, 10);
  const b = document.getElementById("global-board");
  if (!b) return; // modal closed / re-rendered while awaiting
  if (!rows || !rows.length) { b.innerHTML = `<div class="dl-h">🌐 Global top — no scores yet today</div>`; return; }
  b.innerHTML = `<div class="dl-h">🌐 Global top today</div>` +
    rows.map((r, i) => `<div class="dl-row"><span>${i + 1}. ${tlEsc(r.name || "Anon")}</span><span>BUILD <b>${r.score | 0}</b></span><span>${formatNumber(r.biomass || 0)}</span></div>`).join("");
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

  // Genome Atlas — permanent Masteries (completed mutation families)
  const fams = atlasFamilies();
  const bonusLabel = (b) => `${b.kind === "click" ? "click" : b.kind === "ep" ? "EP" : "production"} ×${b.mult}`;
  const atlasHtml = fams.map((f) => `
    <div class="trait ${f.complete ? "got" : ""}">
      <div class="tn">${f.complete ? "⭐ " : ""}${f.icon} ${f.name} ${f.complete ? `— ${bonusLabel(f.bonus)}` : ""}</div>
      <div class="tf">${f.flavor}</div>
      <div class="tp">${f.found} / ${f.total}${f.complete ? " ✓" : ` · unlocks ${bonusLabel(f.bonus)}`}</div>
    </div>`).join("");

  const tCount = SYNERGIES.filter((s) => dt[s.id]).length;
  const fossils = state.fossils || [];
  const fossilHtml = fossils.length
    ? fossils.map((f) => `<span class="mut-pill" style="border-color:#caa46a;color:#caa46a">🦴 ${f}</span>`).join("")
    : `<span class="mut-pill locked">no fossils yet — beat bosses to find them</span>`;
  const culturePct = Math.round((cultureMult() - 1) * 100);
  el.codexBody.innerHTML = `
    <h3>🥛 Biomass Culture · permanent global boost</h3>
    <div class="trait got"><div class="tn">🥛 +${culturePct}% ALL production</div>
      <div class="tf">Every achievement you unlock permanently boosts production, forever — it never resets.</div>
      <div class="tp">${cultureCount()} achievements fed</div></div>
    <h3>🧬 Genome Atlas · ${masteriesComplete()} / ${fams.length} masteries · <span style="color:var(--muted)">permanent — never resets</span></h3>
    ${atlasHtml}
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
  if (el.setAberration) el.setAberration.checked = !!state.aberration;
  if (el.setSeason) {
    el.setSeason.innerHTML = "";
    for (const s of SEASONS) {
      const b = document.createElement("button");
      b.textContent = s.name; b.dataset.v = s.id;
      if ((state.season || "none") === s.id) b.classList.add("active");
      el.setSeason.appendChild(b);
    }
  }
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

// ---- Tree of Life: render banked species as an evolutionary dynasty (SVG) ----
function tlEsc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function layoutTree(species) {
  const byId = Object.fromEntries(species.map((s) => [s.id, s]));
  const children = {}, roots = [];
  for (const s of species) {
    const pid = (s.parentId && byId[s.parentId]) ? s.parentId : null;
    if (pid) (children[pid] = children[pid] || []).push(s); else roots.push(s);
  }
  const byStr = (a, b) => (b.strength || 1) - (a.strength || 1);
  roots.sort(byStr); for (const k in children) children[k].sort(byStr);
  const pos = {}; let row = 0;
  const seen = new Set(); // guard against parentId cycles in corrupt/imported saves
  const dfs = (node, depth) => {
    if (pos[node.id]) return pos[node.id].y; // already placed (cycle / diamond)
    if (seen.has(node.id)) { pos[node.id] = { x: depth, y: row++ }; return pos[node.id].y; }
    seen.add(node.id);
    const kids = children[node.id] || [];
    if (!kids.length) { pos[node.id] = { x: depth, y: row++ }; return pos[node.id].y; }
    const ys = kids.map((k) => dfs(k, depth + 1));
    pos[node.id] = { x: depth, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    return pos[node.id].y;
  };
  for (const r of roots) dfs(r, 0);
  // place any species not reachable from a root (orphans / parentId cycles) so the
  // renderer always has a position for every node and can't deref undefined
  for (const s of species) if (!pos[s.id]) dfs(s, 0);
  return { pos, rows: Math.max(1, row) };
}
export function renderTreeOfLife() {
  const svg = document.getElementById("tree-svg");
  const species = state.species || [];
  const bonusPct = Math.round((lineageBonus() - 1) * 100);
  const hint = document.getElementById("tree-hint");
  if (hint) hint.textContent = `${species.length} species across your dynasty · lineage bonus: +${bonusPct}% production. Tap a node to equip it.`;
  if (!species.length) {
    svg.setAttribute("width", 460); svg.setAttribute("height", 90);
    svg.innerHTML = `<text x="24" y="48" class="tl-sub">No species yet — hit the wall and Speciate to grow your first branch.</text>`;
    return;
  }
  const { pos, rows } = layoutTree(species);
  const colW = 220, rowH = 64, padX = 70, padY = 38;
  const maxDepth = species.reduce((m, s) => Math.max(m, pos[s.id].x), 0);
  const W = padX * 2 + maxDepth * colW + 170;
  const H = padY * 2 + rows * rowH;
  const X = (d) => padX + d * colW, Y = (r) => padY + r * rowH;
  const equipped = new Set(state.equippedSpecies || []);
  let out = "";
  for (const s of species) { // links first (behind nodes)
    if (s.parentId && pos[s.parentId]) {
      const x1 = X(pos[s.parentId].x) + 20, y1 = Y(pos[s.parentId].y);
      const x2 = X(pos[s.id].x) - 20, y2 = Y(pos[s.id].y), mx = (x1 + x2) / 2;
      out += `<path class="tl-link" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
    }
  }
  for (const s of species) {
    const cx = X(pos[s.id].x), cy = Y(pos[s.id].y), eq = equipped.has(s.id);
    const mult = formatNumber(Math.sqrt(Math.max(1, s.strength || 1)));
    out += `<g class="tl-node${eq ? " equipped" : ""}" data-id="${s.id}">
      <circle cx="${cx}" cy="${cy}" r="20"/>
      ${eq ? `<text class="tl-eq" x="${cx}" y="${cy + 4}" text-anchor="middle">✓</text>` : ""}
      <text class="tl-label" x="${cx + 30}" y="${cy - 2}">${tlEsc(s.name)}</text>
      <text class="tl-sub" x="${cx + 30}" y="${cy + 14}">${(s.mutations || []).length} mut · ×${mult} equipped</text>
    </g>`;
  }
  svg.setAttribute("width", W); svg.setAttribute("height", H);
  svg.innerHTML = out;
  svg.querySelectorAll(".tl-node").forEach((n) =>
    n.addEventListener("click", () => { uiHandlers.onToggleEquip(n.dataset.id); renderTreeOfLife(); }));
}
export function openTreeOfLife() { renderTreeOfLife(); document.getElementById("tree-modal").classList.remove("hidden"); }

export function setMuteLabel(muted) {
  if (!el.muteBtn) return;
  const ico = el.muteBtn.querySelector(".ico");
  if (ico) ico.textContent = muted ? "🔇" : "🔊";
  else el.muteBtn.textContent = muted ? "🔇" : "🔊"; // fallback if structure changes
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
      <div class="owned">0</div>
      <div class="research"></div>`;
    row.addEventListener("click", (e) => {
      if (sellMode) uiHandlers.onSell(g.id);
      else if (onBuy) onBuy(g.id, row.getBoundingClientRect(), amountFor(e, g.id));
    });
    el.genList.appendChild(row);
    el.genRows[g.id] = row;
  }
}

// ---- Progressive unlock: don't dump 25 buttons on a new player. Start with the
// core loop only; reveal one system at a time as it's earned. The weakest /
// most-confusing "list-in-a-modal" systems are cut entirely. ----
const CUT_BTNS = ["splice-btn", "market-btn", "reactor-btn", "pantheon-btn", "symbiote-btn", "garden-btn"];
const GATED_BTNS = [
  { id: "stats-btn",    name: "Stats",            when: (s) => (s.lifetimeBiomass || 0) >= 500 },
  { id: "codex-btn",    name: "Codex",            when: (s) => (s.prestiges || 0) >= 1 || Object.keys(s.discovered || {}).length >= 1 },
  { id: "photo-btn",    name: "Photo Mode",       when: (s) => (s.prestiges || 0) >= 1 },
  { id: "paths-btn",    name: "Evolution Path",   when: (s) => (s.evolutionRank || 0) >= 5 },
  { id: "machines-btn", name: "Automation Bay",   when: (s) => (s.prestiges || 0) >= 3 || (s.speciations || 0) >= 1 },
  { id: "mutagen-btn",  name: "Mutagen",          when: (s) => (s.speciations || 0) >= 1 },
  { id: "colony-btn",   name: "Colonization Map", when: (s) => (s.speciations || 0) >= 1 },
  { id: "museum-btn",   name: "Species Museum",   when: (s) => ((s.museum || []).length) >= 1 },
  { id: "genome-btn",   name: "Genome Lab",       when: (s) => (s.speciations || 0) >= 1 },
  { id: "chal-btn",     name: "Challenges & Daily Monster", when: (s) => (s.speciations || 0) >= 1 || (s.prestiges || 0) >= 3 },
];
let _unlockInit = false;
const _announced = new Set();
function updateUnlocks() {
  if (!_unlockInit) {
    _unlockInit = true;
    for (const id of CUT_BTNS) { const el = document.getElementById(id); if (el) el.style.display = "none"; }
    for (const g of GATED_BTNS) if (g.when(state)) _announced.add(g.id); // already-earned: don't toast on load
  }
  for (const g of GATED_BTNS) {
    const el = document.getElementById(g.id);
    if (!el) continue;
    const on = g.when(state);
    el.style.display = on ? "" : "none";
    if (on && !_announced.has(g.id)) {
      _announced.add(g.id);
      flashStatus(`🔓 Unlocked: ${g.name}! (see the menu below)`);
    }
  }
}

// Called every frame (cheap DOM writes only). dt (seconds) drives count-up tween.
export function renderUI(rate, dt = 0.016) {
  updateUnlocks();
  // Digest button: grey out + relabel while a surge is active (can't re-spam)
  const digestBtn = document.getElementById("digest-btn");
  if (digestBtn) {
    const da = digestActive();
    digestBtn.classList.toggle("cooling", da);
    digestBtn.textContent = da ? "🍴 Digesting… (surge active)" : "🍴 Digest — spend 40% for a surge";
  }
  // smooth count-up: ease the displayed biomass toward the real value
  if (el._dispBiomass === undefined) el._dispBiomass = state.biomass;
  el._dispBiomass += (state.biomass - el._dispBiomass) * Math.min(1, dt * 8);
  if (Math.abs(state.biomass - el._dispBiomass) < 0.5) el._dispBiomass = state.biomass;
  el.biomass.textContent = formatNumber(el._dispBiomass);
  el.rate.textContent = formatNumber(rate);
  el.click.textContent = formatNumber(effectiveClickPower());

  // permanent Evolution Rank + macro-stage (the long-term "what will it become?")
  const evo = evolutionStage();
  const rn = document.getElementById("evo-rank-num");
  if (rn) {
    rn.textContent = "RANK " + formatNumber(evo.rank);
    const sn = document.getElementById("evo-stage-name");
    if (sn) sn.textContent = (evo.pathData ? evo.pathData.icon + " " : "") + evo.name;
    const nx = document.getElementById("evo-rank-next");
    if (nx) nx.textContent = evo.isMax ? "FINAL STAGE — apex of evolution" : `next: ${EVO_STAGES[evo.index + 1].name} at Rank ${evo.nextRank}`;
    const f = document.getElementById("evo-rank-fill");
    if (f) {
      f.style.width = (evo.progress * 100).toFixed(1) + "%";
      f.style.background = "#" + evo.color.toString(16).padStart(6, "0");
    }
  }

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

  // metabolic pressure meter — fills toward the soft-cap, then reads SATURATED
  // (calm, not an alarm: production keeps growing past here, just diminished).
  const pressure = pressureLevel();
  el.pressureFill.style.width = Math.min(100, pressure * 100).toFixed(1) + "%";
  const maxed = pressure >= 1;
  el.pressurePct.textContent = maxed ? "SATURATED" : Math.round(pressure * 100) + "%";
  el.pressureWrap.classList.toggle("maxed", maxed);
  el.pressureWarn.classList.toggle("hidden", !maxed);
  if (maxed) {
    // honest, optional nudge — explains WHY and what the two choices give you
    el.pressureWarn.textContent = canSpeciate()
      ? "Past the soft-cap — extra production is diminished. SPECIATE for a permanent multiplier."
      : "Past the soft-cap — extra production is diminished. EVOLVE to bank EP and grow faster.";
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
  // Upgrade Store: an inline tray of buyable chips (always visible on the page,
  // Cookie-Clicker style) + a "see all" modal for the full/locked list.
  const avail = availableUpgrades();
  const aff = affordableUpgradeCount();
  const wrap = document.getElementById("upgrade-tray-wrap");
  if (wrap) wrap.classList.toggle("hidden", avail.length === 0);
  el.upgradesBadge.textContent = aff > 0 ? `${aff} ⚡` : `${avail.length}`;
  renderUpgradeTray(avail);
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

  // live archetype + build-score badge under the creature name (throttled ~2/s)
  const badge = el.archetypeBadge || (el.archetypeBadge = document.getElementById("archetype-badge"));
  if (badge) {
    const nowMs = Date.now();
    if (nowMs - (el._badgeAt || 0) > 500) {
      el._badgeAt = nowMs;
      if (state.mutations.length === 0) badge.classList.add("hidden");
      else {
        const a = currentArchetype();
        badge.classList.remove("hidden");
        badge.dataset.kind = a.kind;
        badge.innerHTML = `<span class="arche-name">${a.kind === "legendary" ? "★ " : ""}${a.name}</span>` +
          `<span class="arche-score">BUILD ${buildScore()}</span>`;
      }
    }
  }

  // The cost labels + tooltips need a full production breakdown + (in Max mode)
  // an affordability scan per organelle — too heavy for 60fps, so recompute them
  // at ~5Hz. Cheap per-frame work (locked/affordable highlight, owned count) stays.
  const heavy = Date.now() - _genHeavyAt > 200;
  if (heavy) { _genHeavyAt = Date.now(); _bdCache = productionBreakdown(); }
  const _bd = _bdCache || { per: {}, each: {}, total: 0 };
  for (const g of GENERATORS) {
    const row = el.genRows[g.id];
    const unlocked = isUnlocked(g.id);
    if (!unlocked) {
      if (!row.classList.contains("locked")) row.classList.add("locked");
      continue;
    }
    row.classList.remove("locked");
    row.classList.toggle("affordable", canAfford(g.id)); // can buy at least one (cheap, per-frame)
    row.querySelector(".owned").textContent = `×${state.owned[g.id] || 0}`;
    if (heavy) {
      // cost label reflects the bulk-buy amount (×1 / ×10 / ×100 / Max)
      let costLabel;
      if (buyAmt === "max") {
        const m = maxAffordable(g.id);
        costLabel = m >= 1 ? `Max ${m} · ${formatNumber(costForN(g.id, m))}` : formatNumber(costOf(g.id));
      } else if (buyAmt === 1) {
        costLabel = formatNumber(costOf(g.id));
      } else {
        costLabel = `×${buyAmt} · ${formatNumber(costForN(g.id, buyAmt))}`;
      }
      row.querySelector(".cost").textContent = costLabel;
      // hover tooltip: exact /sec each + share of total production (CC-style detail)
      const share = _bd.total > 0 ? (_bd.per[g.id] / _bd.total * 100) : 0;
      row.title = `${researchName(g.id) || g.name}\n+${formatNumber(_bd.each[g.id] || 0)}/sec each` +
        (state.owned[g.id] ? ` · ${share.toFixed(share < 10 ? 1 : 0)}% of production` : " (none owned yet)");
    }
    // research: rename the organelle to its current tier + show next milestone
    const rName = researchName(g.id);
    if (rName) {
      const nameEl = row.querySelector(".name");
      if (nameEl.textContent !== rName) nameEl.textContent = rName;
      const tiers = researchTiers(g.id);
      const next = nextResearch(g.id);
      const rEl = row.querySelector(".research");
      rEl.textContent = next
        ? `⚗ research ${tiers}/${RESEARCH_TIERS.length} · next ×${next.mult} at ${next.at}`
        : `⚗ research MAXED ${tiers}/${RESEARCH_TIERS.length}`;
      rEl.classList.toggle("ready", !!next && (state.owned[g.id] || 0) >= next.at);
    }
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
// Show the mutation draft. onPick(id, edition) when chosen; onReroll() if a reroll
// token is spent. `editions` maps id -> edition (Foil/Prismatic/Cursed) or null.
export function showDraft(ids, onPick, onReroll, onSkip, editions) {
  el.draftCards.innerHTML = "";
  let di = 0;
  for (const id of ids) {
    const def = getMutation(id);
    if (!def) continue;
    const r = RARITY[def.rarity];
    const ed = editions && editions[id] ? EDITIONS[editions[id]] : null;
    const high = def.alien || def.rarity === "legendary" || def.rarity === "epic" || !!ed;
    const card = document.createElement("div");
    card.className = "draft-card reveal" + (high ? " glow" : "") + (def.defect ? " defect" : "") + (def.alien ? " alien" : "") + (ed ? " editioned" : "");
    card.style.animationDelay = (di++ * 0.1).toFixed(2) + "s";
    card.style.setProperty("--rarity", ed ? ed.color : def.alien ? "#39d0c6" : def.defect ? "#ff6b6b" : r.color);
    const glyph = def.alien ? "👽" : (DRAFT_GLYPH[def.part] || "🧬");
    const hint = draftHint(id);
    card.innerHTML = `
      <div class="rarity">${def.alien ? "👽 ALIEN DNA" : def.defect ? "⚠ CURSED" : r.label}</div>
      ${ed ? `<div class="edition-tag" style="color:${ed.color};border-color:${ed.color}">${ed.tag} ×${ed.power}${ed.clickPenalty ? " · ½ click" : ""}</div>` : ""}
      <div class="draft-spin"><span>${glyph}</span></div>
      <div class="mname">${def.name}</div>
      ${def.part ? `<div class="part-tag">＋ grows a ${def.part}</div>` : ""}
      <div class="mdesc">${def.desc}</div>
      ${hint ? `<div class="draft-synergy">${hint.text}</div>` : ""}`;
    card.addEventListener("click", () => { el.draftModal.classList.add("hidden"); onPick(id, editions ? editions[id] : null); });
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
export function spawnFloatNumber(x, y, text, variant) {
  const node = document.createElement("div");
  node.className = variant ? "float-num float-num--" + variant : "float-num";
  node.textContent = text;
  node.style.left = x + "px";
  node.style.top = y + "px";
  // small horizontal jitter so rapid clicks fan out
  node.style.transform = `translateX(${(Math.random() * 24 - 12) | 0}px)`;
  el.fx.appendChild(node);
  setTimeout(() => node.remove(), variant === "passive" ? 1700 : 900);
}

export function flashStatus(msg) {
  if (!el.status) return;
  el.status.textContent = msg;
  clearTimeout(el.status._t);
  el.status._t = setTimeout(() => (el.status.textContent = ""), 1600);
}
