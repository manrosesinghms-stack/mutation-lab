# 🧬 Mutation Lab — ROADMAP 4 (Cookie-Clicker-style depth & economy)

> Goal: take the systems that make Cookie Clicker (and AdCap / Clicker Heroes /
> NGU / Melvor) deep and *expansive* — especially **buy/sell economy** and
> **unlockable minigames** — and build Mutation-Lab versions. Research-driven.
> **This is a plan only.** We build it phase by phase, one at a time.

## What the genre actually does (research summary)
Cookie Clicker's longevity comes from **layered systems unlocked over time**, not
bigger numbers:

| Cookie Clicker | What it is | Mutation Lab today |
|---|---|---|
| **Buildings** (20 types) | scaling auto-producers; can be **sold back** | 5 organelles (no sell) |
| **Upgrades** (100s) | one-time buys that unlock at milestones | ✅ Upgrade Store (small) |
| **Golden Cookies** | random clickables → Frenzy / Lucky / Click Frenzy | ✅ Mitogen Bloom (one type) |
| **Sugar Lumps** | slow 2nd currency → **level up buildings** (+1%/lvl) + unlock minigames | ❌ none |
| **Ascension → Heavenly Chips → prestige tree** | reset for a permanent tree | ✅ Speciate + Transcend/Helix |
| **Stock Market** (Bank) | **buy low / sell high** goods for profit, brokers cut fees, loans | ❌ none ← *the buy/sell the user wants* |
| **Garden** (Farm) | grow + **crossbreed** plants for buffs & new unlocks | ◑ Gene Splicer (seed of this) |
| **Grimoire** (Wizard) | a **magic pool** → cast spells (force events) | ❌ none |
| **Pantheon** (Temple) | **slot spirits** for passive bonuses | ◑ equipped Species (seed) |
| **Dragon (Krumblor)** | raise a pet → choose **auras** | ❌ none |
| **Wrinklers** | parasites that drain, **pop for bonus** | ◑ boss cells (seed) |
| **Grandmapocalypse** | toggle a risk/reward escalation | ◑ Genetic Instability (seed) |
| **Seasons** | Halloween/Xmas/etc. → themed collectibles + switcher | ❌ none |
| **Achievements** (600+) | endless long-tail goals | ✅ 59 |

Sources: Cookie Clicker Wiki (Buildings, Sugar Lumps, Stock Market, Minigames,
Seasons, Ascension), Wikipedia, idle-design guides.

---

## THE ROADMAP (phased; build one at a time)

### Phase 1 — Economy: buy & sell ⭐ (the headline ask)
- **1A · Sell organelles back.** Right-click / "sell" returns a % of spent biomass
  (CC sells back ~25%). Lets you re-spec. *(S)*
- **1B · The Biomass Exchange** (≙ Stock Market). A market of ~5 fluctuating
  "reagents" (Enzymes, Proteins, Lipids, ATP, RNA). Prices tick on cycles
  (stable / rising / falling / volatile). **Buy low, sell high** for biomass.
  Unlock **Brokers** (cut the trade fee) and **Loans** (instant biomass now,
  repaid over time). A real trading minigame. *(L)*

### Phase 2 — Secondary currency + building depth
- **2A · Mutagen** (≙ Sugar Lumps): a single rare unit that slowly *grows and
  ripens* over real time (even offline), harvested when ripe. *(M)*
- **2B · Organelle levels.** Spend Mutagen to level each organelle (+5%/level);
  level 1 of certain organelles **unlocks a minigame** (gates Phase 4). *(M)*
- **2C · More organelles.** Expand 5 → ~10 (e.g. Lysosome, Chloroplast, Golgi,
  Centriole, Nucleolus) for a much longer build ramp. *(M)*

### Phase 3 — Active-play variety (golden-cookie analog)
- **3A · Bloom types.** Today one Bloom = Frenzy. Add **Lucky** (instant biomass
  lump), **Click Frenzy** (×N click for 15s), **Cosmic** (×big, rare), and a
  risky **Wrath** bloom (chance of a penalty or jackpot). *(M)*
- **3B · Leeches** (≙ Wrinklers): parasites latch on and slowly drain production,
  but **pop them** to reclaim everything they ate + interest. *(M)*

### Phase 4 — Unlockable minigames (the deep content)
- **4A · Petri Garden** (≙ Garden). A grid you plant strains in; they grow over
  time, give passive buffs, and **crossbreed** into rare new strains/mutations.
  *(Evolve the Gene Splicer into this.)* *(L)*
- **4B · The Reactor** (≙ Grimoire). A **catalyst pool** that refills over time;
  spend it to cast: *Force Bloom*, *Double Next Mutation*, *Flash Surge*,
  *Reroll Biome* — with a small backfire chance. *(M)*
- **4C · Genome Pantheon** (≙ Pantheon). 3 slots (minor/major/apex) you drop
  **ancestral genes** into for stacking passive bonuses; swap freely.
  *(Builds on equipped Species.)* *(M)*
- **4D · Symbiote** (≙ Dragon). Raise a companion creature by feeding it biomass;
  it levels through forms and grants a chosen **aura** (×prod, ×click, +luck). *(L)*

### Phase 5 — Content, events & retention
- **5A · Seasons & events** (≙ Seasons). Themed limited mutations/skins
  (Halloween eldritch, Cosmic event, etc.) + a **Season Switcher** unlock. *(M)*
- **5B · Upgrade Store expansion.** Many more upgrades + categories ("Research"):
  synergy upgrades, minigame upgrades, milestone "kitten"-style boosts. *(M)*
- **5C · Achievements → 150+** with their small permanent bonuses. *(S)*
- **5D · Grandmapocalypse mode** — expand Genetic Instability into a togg-able
  endgame escalation (harder + richer, spawns leeches, big rewards). *(M)*

---

## Suggested build order (value × independence)
1. **1A Sell-back** (quick win) → **1B Biomass Exchange** (the headline buy/sell)
2. **2A Mutagen + 2B Organelle levels** (gives the minigame-unlock spine)
3. **3A Bloom types + 3B Leeches** (active-play juice)
4. **4A Petri Garden** → **4B Reactor** → **4C Pantheon** → **4D Symbiote**
5. **5A Seasons** → **5B Upgrades** → **5C Achievements** → **5D Grandmapocalypse**

Every system stays vanilla JS, offline, and **performance-gated**. Each phase is
independently shippable and verifiable. We do them one at a time.


---
## STATUS: ALL PHASES SHIPPED ✅
Phase 1 (1A sell-back, 1B Biomass Exchange) · Phase 2 (2A Mutagen, 2B organelle levels, 2C +5 organelles) · Phase 3 (3A Bloom types, 3B Leeches) · Phase 4 (4A Petri Garden, 4B Reactor, 4C Pantheon, 4D Symbiote) · Phase 5 (5A Seasons, 5B Upgrade expansion, 5C Achievements 151, 5D Aberration mode). All verified, performance-gated, offline-safe.
