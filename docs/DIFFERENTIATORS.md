# 🧬 Mutation Lab — Differentiator Features (our identity, not a CC clone)

> Design doc for the three features that make us *beat* Cookie Clicker in our own
> style instead of copying it. Written after a side-by-side system-map comparison.
> **Status: design only — not yet implemented.** Priority order below.

## Strategic framing

The system-map comparison showed our game already has CC's entire spine **plus**
things CC structurally cannot have: a 3D mutating creature, a roguelike mutation
draft, and three prestige layers. So the goal is **not more systems** — it's to
double down on the moat:

> **The game where you grow — and show off — a different monster every run.**

These three features turn that pitch into mechanics. They lean on assets we
already have, so each is mostly *surfacing + polish*, not greenfield.

---

## ⭐ Feature 1 — Specimen Card (the viral hook) · PRIORITY 1

**Goal.** One tap produces a beautiful, shareable card of your current monster +
its build, designed to be screenshotted/clipped. This is the single highest-ROI
feature because CC has no creature to show — it is our marketing running itself.

**Why it's ours, not a copy.** CC's "share" is a save string. Ours is a *portrait
of a creature you made* (Spore's proven "look what I made" hook).

**What already exists (build on, don't rebuild):**
- `creature.js → exportPhoto(name, subtitle, scaleRef)` renders the creature to a
  PNG via `toDataURL`.
- `main.js → copyCreatureDNA()` ("🧬 creature DNA copied — share it!"),
  `viewSharedDNA()`, `#photo-dna` / `#viewdna-btn`, and a `#photo-bar`.

**Design (the gap to fill):**
1. **Composite a stats panel onto the photo** instead of bare creature + title:
   - Creature name + lineage (e.g. *"Voidmaw — Day 14 · Apex · Swarm lineage"*).
   - Build chips: top 3–4 mutations (with rarity color/edition), Build Score (see
     Feature 2), prestige counts, biomass/sec.
   - A small "Mutation Lab" wordmark + the share/DNA code so a viewer can *load*
     the exact build → growth loop.
2. **Card layouts:** portrait (mobile/Stories) + landscape (Discord/Twitter). Pick
   layout by aspect; render onto an offscreen canvas over the `exportPhoto` image.
3. **One-tap actions:** Copy Image, Download PNG, Copy Build Code. (Native share
   sheet on mobile via `navigator.share` when available.)
4. **Auto-prompt at milestones:** offer the card on each new evolution stage and
   on Speciate (the screenshot-worthy moments) — never nag, one dismissible toast.

**Code touchpoints:** `creature.js` (reuse `exportPhoto`, add a `composeCard()`
helper), `ui.js` (card modal + buttons), `main.js` (milestone hooks, share/DNA
already present), `styles/style.css` (card modal). No economy changes.

**Risks:** `toDataURL` needs `preserveDrawingBuffer:true` on the renderer (verify;
may already be set for the existing photo). Font loading for canvas text — use a
web-safe stack. Min-spec: cap card resolution.

**Phased build:** (a) compose stats onto existing photo → modal with Copy/Download;
(b) two layouts + native share; (c) milestone auto-prompt.

---

## ⭐ Feature 2 — Build Archetypes + Build Score (the Balatro layer) · PRIORITY 2

**Goal.** Make the roguelike draft *legible and chase-able*: name the build the
player is assembling, and give a per-run **Build Score** so wild seeds and broken
combos become the thing people screenshot and compete on.

**Why it's ours, not a copy.** CC has no build variety — every save converges. Our
draft means every run is different; we just don't *celebrate* it yet.

**What already exists (surface it, don't invent):**
- `data/synergies.js` — 10 named combos (Hivemind, Leviathan, Thornlord, Verdant
  Engine, Broodmother + 5 hidden like Flesh Singularity).
- `data/sets.js` — 5 set "forms" (Predator/Flora/Swarm/Psychic/Titan).
- `data/paths.js` — chosen lineages (Predator/Neural/Crystal/Parasite).
- `partCounts()` already classifies the body parts you've grown.

**Design (the gap to fill):**
1. **Archetype detection.** From active synergies + dominant part counts + set
   progress + chosen path, derive a single headline **Archetype** label per run
   (e.g. *"Swarm"*, *"Photosynthetic"*, *"Parasite"*) shown near the creature and
   on the Specimen Card. Reuse the existing synergy/set definitions as the source
   of truth; pick the strongest active one.
2. **Build Score.** A single number summarizing run power/spice, e.g.
   `score = log10(bestProdPerSec) + 2·distinctMutations + 5·activeSynergies +
   10·completedSets + editionBonuses`. Tunable; lives in `economy.js` next to the
   other derived stats. Surface it in the HUD + card + stats screen.
3. **Archetype goals / "you're 1 mutation from Leviathan".** Show the nearest
   uncompleted synergy/set as a soft objective in the draft ("this card completes
   Thornlord") — turns drafting into deliberate build-crafting.
4. **(Stretch) Draft reroll/banish.** Spend a small currency (Mutagen?) to reroll
   or banish a draft card — agency over the roguelike, Balatro-shop style.

**Code touchpoints:** `economy.js` (`buildScore()`, `currentArchetype()` helpers —
read `activeSynergies`, `completedSets`, `partCounts`, `state.evoPath`),
`ui.js` (HUD archetype badge, draft "completes X" hints, stats row), `data/*`
unchanged (reused). Mostly read-only over existing systems → low risk.

**Risks:** Score must be **monotonic and legible** (don't let it explode like the
old production runaway). Keep it log-scaled. Don't add a new currency for reroll
unless playtesting wants it (Mutagen already exists — reuse).

**Phased build:** (a) `currentArchetype()` + HUD badge + put it on the card;
(b) `buildScore()` + HUD/stats/card; (c) draft "completes X" hints; (d) reroll.

---

## ⭐ Feature 3 — The Tree of Life (our prestige identity) · PRIORITY 3

**Goal.** Replace the abstract Helix grid's *framing* with a visible **evolutionary
tree**: every species you Speciate becomes a branch; related lineages grant
cross-bonuses. It's a prestige tree + a collection + a screenshot, all on-theme.

**Why it's ours, not a copy.** CC's Heavenly tree is a generic node grid. A
*phylogenetic tree of monsters you personally bred* is unmistakably ours, and it
makes the Speciate layer feel like building a dynasty, not just spending currency.

**What already exists (build on):**
- `state.species` (banked Species cards), `state.equippedSpecies`, `doSpeciate()`,
  `MAX_SPECIES`, per-species `mutations`/`strength`.
- `data/helix.js` (current 3rd-prestige meta-tree) — the bonus/cost machinery.

**Design (the gap to fill):**
1. **Tree data model.** When you Speciate, the new species records a `parent`
   (the currently-equipped/most-recent species or "Primordial root"). Species +
   parent links = a tree. Store on the species card (`parentId`, `branch`).
2. **Lineage cross-bonuses.** Species on the same branch (shared ancestor) grant a
   small **diversity/lineage bonus** that scales with branch depth and breadth —
   rewarding *building a family*, not just one strong species. Applied at the one
   `getModifiers()` chokepoint (so the softcap still contains it).
3. **Visual tree screen.** A pannable node graph (reuse the SVG/DOM approach; or a
   simple radial layout) where each node is a species portrait (mini `exportPhoto`
   thumbnail) — branches glow by strength. Equip from the tree. This screen is
   itself shareable ("my whole evolutionary tree").
4. **Migrate, don't break.** Keep Helix's *bonuses* intact; the Tree is a new lens
   over Species + an added lineage-bonus layer. Existing saves: species without a
   `parentId` attach to the Primordial root.

**Code touchpoints:** `economy.js` (`doSpeciate()` set `parentId`; lineage bonus in
`getModifiers()`), `data/helix.js` (unchanged bonuses), new `ui.js` tree render +
`state` fields, `creature.js` (thumbnail render per species — reuse `exportPhoto`).
**Highest complexity of the three.**

**Risks:** Layout/perf of many species nodes (cap visible, lazy thumbnails). Save
migration must be additive (default `parentId = root`). Lineage bonus must route
through the existing mult softcap — no new uncapped multiplier path.

**Phased build:** (a) record `parentId` on Speciate + a flat lineage-diversity
bonus (no UI) → sim/playtest; (b) the tree screen with portraits + equip;
(c) richer branch bonuses + share-the-tree image.

---

## Recommended build order

1. **Specimen Card** — biggest ROI, lowest risk, ~70% already built. Ship first.
2. **Build Archetypes + Score** — read-only over existing data; feeds the card.
3. **Tree of Life** — most code; do last, after the share loop is proven.

Sequencing rationale: Features 1 and 2 reinforce each other (the card *shows* the
archetype + score), creating the viral share loop before we invest in the heavier
prestige rework.

## Explicitly NOT doing (avoid copying / scope traps)
- No new Golden-Cookie / Milk / Grandmapocalypse / Heavenly-grid clones — we have
  equivalents (Blooms / Culture / Aberration / Helix+Genome Lab).
- No new currency unless playtesting demands it (reuse Mutagen/Genome).
- Don't widen the "permanent multiplier" stack further — the priority is making the
  existing depth *legible*, not adding more multipliers.
