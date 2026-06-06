# 🧬 Mutation Lab — ROADMAP 2.0 (Retention, Stories & Shareability)

> v1 built the engine (core loop, 50 mutations, 2-layer prestige, juice, pacing, tutorial).
> **v2 makes people play for 8 hours and then tell their friends.** Every feature here must create at least one of:
>
> **🔍 Discovery** ("wait, that can happen?!") · **📚 Collection** ("I need them all") · **⚙️ Optimization** ("I can make this build better") · **🪪 Identity** ("this is MY creature") · **💎 Rarity** ("holy crap, I found one")
>
> The strongest marketing asset is NOT the idle math — it's **players creating bizarre creatures nobody else has.** Every system below leans into that.

---

## What we already have to build on (don't rebuild these)
- `data/mutations.js` — 50 mutations w/ declarative `effect(mods,info)` → **synergies, sets, fusion, encyclopedia, alien pool** all extend this.
- `state.species[]` — banked Species cards `{name, mutations, parts, strength}` → **Species History, museum, sharing** are mostly UI on top of this.
- Save **export/import string** (base64 JSON) → **creature DNA sharing codes** are a reskin of this.
- `creature.js` part builders + `onMutationGained()` → **mutation animations, naming visuals, rare skins, biome lighting** hook here.
- `data/tunables.js` → **biome modifiers, defects, challenge rules** plug in as multiplier sets.
- Modal system (Genome Lab / Stats / Settings / Help) → **Photo Mode, Encyclopedia, Museum, Synergy Codex** reuse it.
- `data/genomeNodes.js` + currencies pattern → **rerolls, fossils, alien DNA** are new currencies.
- `tools/sim.js` → re-tune pacing whenever a system changes the economy.

---

# 🎯 BUILD ORDER (by leverage × dependency, not just impact)

| # | Feature | Release | Driver | Effort | Why this slot |
|---|---|---|---|---|---|
| 1 | **Procedural Naming** | A | Identity | S | Tiny; unlocks Photo Mode, History, sharing |
| 2 | **Mutation grow-in animations** | A | Identity | S | Pure satisfaction; hooks existing part pop-in |
| 3 | **Photo Mode + Creature Cards** | A | Identity/Rarity | M | The wishlist machine |
| 4 | **Species History timeline** | A | Collection/Identity | S | We already store species cards |
| 5 | **Mutation Synergies + Evolution Paths** | B | Discovery/Optimization | L | The gameplay depth — the "main game" |
| 6 | **Mutation Sets / Families** | B | Collection | M | Completion hook; pairs with synergies |
| 7 | **Mutation Encyclopedia** | B | Collection | M | Cheap content multiplier |
| 8 | **Boss Organisms** | C | Discovery/Rarity | L | Active excitement, events |
| 9 | **Rare Variant runs (Golden/Crystal/Void)** | C | Rarity | M | Screenshot gold; near-free visually |
| 10 | **Mutation Fusion / Reactor** | D | Optimization | M | Build-crafting + RNG dopamine |
| 11 | **Mutation Rerolls** | D | Optimization | S | Balatro RNG control |
| 12 | **Genetic Defects** | D | Optimization | S | Interesting decisions |
| 13 | **Biomes / Environmental Adaptation** | E | Discovery | M | Run variety + cheap big visuals |
| 14 | **Mutation Instability** | E | Rarity/Optimization | M | Risk/reward drama |
| 15 | **Alien DNA pool** | E | Rarity/Discovery | M | Rare alternate content |
| 16 | **Challenge Runs** | F | Optimization | L | Hundreds of hours of replay |
| 17 | **Ancient Fossils + Museum** | F | Collection | M | Completionism tail |
| 18 | **Creature DNA Sharing codes** | G | Identity/Rarity | S | Reuses save export |
| 19 | **Daily Mutation Seed** | G | Optimization | M | Competitive return loop |
| 20 | **Weekly Evolution Event** | G | Collection | M | Reasons to come back |

**If preparing for a Steam page:** ship **Release A (Identity)** first — it's the cheapest and produces the trailer/screenshots that *sell* the game. Then B (Synergy) for depth, C (Bosses) for the trailer's "moments."

---

# RELEASE A — "Identity Update" 🪪 — ✅ SHIPPED (2026-06-05)
*The marketing release. Cheap, high shareability, builds the Steam-page assets.*

> **Done:** procedural naming (`data/names.js`, 3 styles, evolves with parts, shown above the creature); parts now **emerge from the skin** (grow-in animation); **Photo Mode** (📸 — hides UI, free-orbit, saves a PNG with name caption); **Species History** timeline in the Stats modal. Verified live in Chrome.

## A1 · Procedural Naming  `S`
A taxonomy that **evolves as parts are added**, not a one-shot random name.
- Base genus from the dominant part: eyes→*Oculo-*, tentacles→*Tentaculo-*, maw→*Mawspawn*, spikes→*Chitino-*, fronds→*Photo-*, body-buds→*Gemino-*.
- Species suffix from 2nd-most part; **escalating epithets** as the build deepens: `Oculothrix` → `Oculothrix Ferox` → `Oculothrix Ferox Prime`.
- **Naming style toggle** in settings: *Scientific* (Neurovora Rex) / *Cute* (Blobbert, Squiggles) / *Eldritch* (Xhal'Kor).
- **Hidden evolutions get a unique legendary name** (e.g. *Deep Sea Horror*) overriding the procedural one.
- ✨ *Add:* let players **rename** their current creature once per run (identity); store the player name on the Species card.
- **Builds on:** rename the existing `generateSpeciesName()` in `economy.js`; show the live name above the creature.

## A2 · Mutation grow-in animations  `S`
Parts currently pop in with a squash. Upgrade to **emergence animations**: eye *blinks open* from the skin, tentacle *bursts and uncoils*, spikes *push through* the surface, maw *tears open*. 0.5–1.2s each.
- ✨ *Add:* a brief **slow-mo + zoom + ripple on the body** when a part emerges; the creature recoils. This is the per-mutation dopamine beat.
- **Builds on:** `creature.js` part pop-in (`easeOutBack`); animate position/scale-from-surface + a shader-free vertex ripple via temporary scale pulse.

## A3 · Photo Mode + Creature Cards  `M` — *the wishlist machine*
- **Photo Mode:** hide UI, free-orbit camera (we have drag-orbit), zoom, a few backdrops, **screenshot button** (canvas → PNG download).
- **Auto-generated Creature Card** (Pokémon-card layout): species name, mutation list, evolution #, biomass, genome, a rarity frame, + the 3D snapshot. One-click export PNG.
- ✨ *Add:* **auto-capture a card the instant a hidden evolution / rare variant unlocks** ("share this moment") — the game hands them shareable content at the peak.
- ✨ *Add:* **Size-scale gag** (creature next to mouse → human → house → mountain) and a **"my abomination vs yours" side-by-side** compositor.
- **Builds on:** Three.js `renderer.domElement.toDataURL()` (set `preserveDrawingBuffer:true`); a DOM card overlaid for export via html-to-canvas or a styled canvas draw.

## A4 · Species History Timeline  `S`
A **"Show Species History"** screen — we already store every Species card.
- An **Evolution Documentary**: auto-generated timeline ("Speciation 1: Simple Cell → 4: Developed Eyes → 12: Apex Organism"), each entry showing the creature thumbnail + key trait gained.
- **Greatest Ancestor** stats: most biomass / longest run / most mutations.
- **Extinct/retired species** kept forever (feeds the Museum later).
- **Builds on:** `state.species[]`; add a thumbnail capture at each Speciate.

---

# RELEASE B — "Synergy Update" 🔍 (turn mutations into the main game)
*This is where theorycrafting and "I need all of them" live.*

## B1 · Mutation Synergies + Hidden Evolution Paths  `L` — *the core v2 feature*
Mutations stop being standalone stats; **owning the right combo unlocks a named Trait/Evolution** with effects AND a unique visual.
- **Data:** a `synergies.js` list — `{id, name, requires:[mutationIds or part-counts], effect(mods), visual, hidden:bool, flavor}`.
  - *Visible* synergies (shown as "2/3 toward Poison Spikes") teach the system.
  - *Hidden* legendary evolutions (≈15) are **secret** — community hunts them.
- **Examples** (from your list + new): Extra Eyes + Neural Cluster → *Hivemind* (biomass echoes each second, eyes glow, a brain grows); Tentacles + Maw + Digest → *Deep Sea Horror* (auto-Digest, creature enlarges); Chitin + Toxic → *Poison Spikes*; Eye×3 + Neural → *Hivemind*; secret legendaries: *Cosmic Organism, Living Virus, Bio-Titan, Flesh Singularity, Neural God*.
- **Discovery screen:** big "⭐ NEW SPECIES TRAIT UNLOCKED — DEEP SEA HORROR" reveal + auto-card (ties to A3). Show a **(local, later-global) discovery counter** ("Global discoveries: 4,217" — fake locally now, real with a backend later — *flag this clearly*).
- ✨ *Add:* a **Synergy Codex** with **silhouette/blurred entries** for undiscovered combos and cryptic hints ("favors those with many eyes…") — discovery bait without spoilers.
- **Builds on:** `getModifiers()` already aggregates owned mutations — add a synergy pass that checks combos and applies bonus effects + flags `state.discoveredTraits`.

## B2 · Mutation Sets / Themed Families  `M`
Collectible families with a **set-completion payoff**.
- e.g. **Predator Set** {Maw, Fangs, Claws, Hunting Eyes} → 4/4 = **Apex Predator Form** (unique creature evolution + bonus). Other sets: *Psychic, Photosynthetic, Toxic, Crystalline, Swarm.*
- Progress UI ("3/4 Predator") in the Stats/Encyclopedia. **People love completion bars.**
- ✨ *Add:* set bonuses **light up the creature** (full Predator → goes spiky-red + a roar animation) — on-creature reward = clip.
- **Builds on:** tag mutations with `set:` in `data/mutations.js`; check completion in `getModifiers()`.

## B3 · Mutation Encyclopedia  `M`
Every mutation gets a page: **lore, rarity, your discovery date, personal stats** (times drafted, builds used in), and which **sets/synergies** it feeds.
- Cheap content multiplier — players unexpectedly love filling these.
- ✨ *Add:* "**Field notes**" that unlock as you use a mutation more (XP per mutation), and a **% of players who've found it** (local/fake then real).
- **Builds on:** `state.discovered{}` already tracks discovery; add `lore` to `data/mutations.js`.

---

# RELEASE C — "Threats Update" 👹 (active excitement + events)

## C1 · Boss Organisms  `L`
Rival cells that appear every few minutes — **not enemies, moments.**
- **Click to damage** before it escapes; rewards: Evolution Points / Genome / a **rare mutation draft**.
- **Multi-phase bosses that evolve mid-fight** (Tiny Parasite → Predator → Titan → Final Form), each phase changing appearance.
- **Mutation Theft:** a boss steals one of your mutations; beat it in time or lose it until next run (tension).
- **Consume choice on victory:** *Genome* vs *Absorb Traits* (gain a random mutation) — interesting decision.
- **Named bosses:** Viral Queen, Ancient Amoeba, Genome Eater, Titan Cell.
- ✨ *Add:* the boss **visually infects your creature** during the fight (creeping discoloration) that recedes as you win.
- **Builds on:** a second Three.js mesh + a click/HP system; reuse particle/juice + draft modal.

## C2 · Rare Variant Runs (Golden / Crystal / Void)  `M` — *near-free, huge shareability*
Tiny chance (e.g. 0.5%) a run's creature is **special**: Golden, Crystalline, Void (black-stars), Albino.
- Entire creature reskins (material/lighting/particles), a **permanent badge**, a small bonus, and **massive screenshot value**.
- ✨ *Add:* an **ULTRA-rare 0.1% "ANCIENT ORGANISM DETECTED"** full-screen announcement (world-boss vibe) people screenshot.
- **Builds on:** `creature.js` material/light swaps + `applyHue`; a rarity roll on run start. Cheapest "rarity" feature in the game.

---

# RELEASE D — "Build-Craft Update" ⚙️ (optimization + RNG mastery)

## D1 · Mutation Fusion / Reactor  `M`
- **Controlled fusion:** sacrifice e.g. Eye + Tentacle → preview possible results (*Watcher Tentacle / Mind Probe / Ocular Whip*) → pick or gamble.
- **Mutation Ascension chains** for legendaries: Eye → Enhanced Eye → Hyper Eye → **Singularity Eye** (endless chase).
- **Mutation Reactor (gambling):** insert 3 → better / worse / **explosive failure**. Slot-machine "one more try." *(Gate it so it can't trivialize balance — failures cost, jackpots are rare.)*
- **Builds on:** new fusion recipes in data; reuse the draft/Genome modal UI.

## D2 · Mutation Rerolls  `S`
A rare currency to **reroll a mutation draft**. Balatro players love manipulating RNG.
- Earn from bosses / achievements / fossils. Show "🎲 ×3" on the draft.
- **Builds on:** `rollDraft()` already exists; add a reroll button + currency.

## D3 · Genetic Defects  `S`
Optional **challenge mutations** with sharp trade-offs: *Blind* (−80% click, +500% passive), *Fragile* (faster pressure, huge production). Creates real decisions.
- ✨ *Add:* defects offered in the draft as a **high-risk gold-bordered card** ("CURSED").
- **Builds on:** just more entries in `data/mutations.js` with downside effects (we already have ×0.5-click tradeoff mutations).

---

# RELEASE E — "World Update" 🌎 (every run feels different)

## E1 · Biomes / Environmental Adaptation  `M` — *cheap, big visual payoff*
Each run rolls a **world** that buffs a build type + reskins the scene:
- **Ocean** (tentacles stronger, blue light, bubbles) · **Volcanic** (heat mutations, red light, ash) · **Frozen** (slow then huge) · **Toxic** (poison) · **Void** (rare, black-stars, weird-only pool).
- Players **adapt builds each run** → variety + replay.
- **Builds on:** scene background/fog/light color swaps in `creature.js` (very cheap) + a per-biome multiplier set in `tunables.js`.

## E2 · Mutation Instability  `M`
Too many mutations → the creature **twitches/glitches/grows extra limbs** → **GENETIC INSTABILITY** event: choose **Stabilize** (safe bonus) or **Embrace Chaos** (random mutations forever). Risk/reward drama you can see on the creature.
- **Builds on:** a mutation-count threshold + the creature jiggle/tremble system + a choice modal.

## E3 · Alien DNA Pool  `M`
Very rare drops unlock an **alien mutation pool** with completely different visuals (floating eyes, energy limbs, crystal/gravity organs). Makes players hunt rare content.
- **Builds on:** a second mutation pool + new part builders in `creature.js`.

---

# RELEASE F — "Endless Update" ⚔️ (hundreds of hours)

## F1 · Challenge Runs  `L`
Challenges that **change the game**, not just harder: *Blind Evolution* (pick from appearance only, no text), *Parasite* (no organelles — steal biomass), *Hypermutation* (everything doubled, creature absurd), *Unstable Genome* (random add/remove every 60s), *Iron Cell* (no Evolves, one life, huge reward).
- Rewards: **exclusive mutations, cosmetics, achievements.**
- **Builds on:** challenge = a `tunables` override set + rule flags read in `economy.js`/`main.js`; gate behind a few Speciations.

## F2 · Ancient Fossils + Museum  `M`
Rare drops (from bosses/biomes/challenges) you **collect**; a **Museum** screen shows every fossil discovered. Pure completionism.
- **Builds on:** new collectible array + a museum modal (reuse Stats layout).

---

# RELEASE G — "Community Update" 📈 (social + the wishlist tail)

## G1 · Creature DNA Sharing Codes  `S`
**Export creature DNA** → a shareable code; import to view/spawn someone's creature. "Look what I evolved."
- **Builds on:** we already export/import the save string — make a creature-only variant (mutations + species).

## G2 · Daily Mutation Seed  `M`
Everyone gets the **same seeded mutation pool/run** that day; compete for the best species / score. Seeded RNG + a local (later online) leaderboard.
- **Builds on:** a seeded PRNG feeding `rollDraft()`; a daily date seed.

## G3 · Weekly Evolution Event  `M`
A rotating **special mutation set / modifier** available for a week — reasons to return + fresh builds.
- **Builds on:** a date-gated content flag.

---

# 👑 The Endgame Dream (the north star)
A late creature isn't "a blob with tentacles." It's a **galaxy-sized neural horror of eyes, crystal spines, floating organs, parasitic moons, glowing ancestor-ghosts, and legendary mutations collected over months** — with a name it earned, a documented history, and a shareable card. That **cell → unforgettable monstrosity** arc is the hook and the Steam-screenshot engine. Every system above feeds it.

---

# Suggested milestone cadence (for a Steam wishlist campaign)
1. **Release A (Identity)** → take the screenshots/trailer → **put up the Steam page** (wishlists start compounding).
2. **Release B (Synergy)** → the "depth" beat; devlog/Shorts on hidden evolutions.
3. **Release C (Threats)** → the trailer's "moments"; demo-worthy.
4. **D/E** → build-crafting + world variety for the demo build.
5. **F/G** → post-launch updates that re-trigger Steam visibility (challenges, events, daily).

> Re-run `tools/sim.js` after any system that touches the economy (synergies, defects, bosses, biomes) so the wall/Speciate pacing stays in the ~10–20 min sweet spot.
