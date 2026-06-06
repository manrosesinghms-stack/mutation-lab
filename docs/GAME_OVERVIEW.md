# Mutation Lab — Game Overview (briefing for an AI assistant)

> Paste this whole document to give an AI full context on the game.

## What it is
**Mutation Lab** is a browser-based **incremental / idle "clicker" game crossed with a roguelike**. You grow a single cell into an absurd, ever-mutating 3D creature. Numbers go up; the creature visibly transforms; every run looks different. It's a solo-developed indie game intended for a free web release and then a paid Steam release (~$3–7).

**One-line pitch:** *Cookie Clicker's comfort + Balatro's "broken build" discovery + a creature that visibly mutates into a screenshot-worthy monstrosity.*

**Inspirations / comparables:** Cookie Clicker, Antimatter Dimensions, Universal Paperclips (incrementals); Balatro, Luck be a Landlord (roguelike synergy); Vampire Survivors / Brotato (cheap viral indie); Spore's creature creator (the "look what I made" sharing hook).

## The core loop
1. **Click** the 3D organism → earn **biomass** (the main currency).
2. **Buy organelles** (5 types: Ribosome, Mitochondria, Nucleus, Flagellum, Vacuole) that auto-produce biomass/second. Costs scale exponentially. Spreading across all five beats spamming one (per-generator diminishing returns).
3. **Evolve** (1st prestige): reset the run in exchange for **Evolution Points** (a permanent production multiplier) and a **3-card mutation draft**.
4. **Draft a mutation**: pick 1 of 3 random mutations (rarity-weighted: common/rare/legendary). Mutations are **permanent, stack multiplicatively**, and **physically grow parts on the 3D creature** (eyes, spikes, tentacles, a toothed maw, fronds, cilia, extra body-buds). There are **50 mutations**.
5. Repeat, building toward bigger numbers and weirder creatures.

## The progression spine (what stops it ending in an hour)
Pure multiplicative stacking would make the game trivial fast, so there's an anti-runaway system shaped like a **sawtooth**:

- **The Wall (Metabolic Pressure):** production has a soft cap. As you approach it, a "Metabolic Pressure" meter fills and the creature **strains red / desaturates ("about to pop")**. Past the wall, more upgrades barely help.
- **Speciate** (2nd prestige): at the wall, Speciate to bank your entire build as a permanent **Species card**, earn **Genome** (a spendable meta-currency), and reset deeper. This is the way *past* the wall.
- **Genome Lab:** spend Genome on a node grid — raise the wall, auto-buy organelles, +1 draft card, more equip slots, faster start, etc. You can also **equip banked Species** for permanent bonuses; equipped species layer as translucent "ghost-chimera" overlays on the creature.
- Net effect: sprint → hit the wall (~15–20 min) → Speciate (reset, gain Genome) → raise the wall → repeat, each lap faster but the ceiling much higher.

## Active-play layer (keeps it engaging moment-to-moment)
- **Mitogen Blooms:** golden orbs periodically grow on the creature. Click one for a **temporary ×4 production frenzy (20s)**.
- **Digest:** a button that spends 40% of your biomass for a **temporary** production surge.
- Temporary buffs are clearly shown (the /sec readout turns gold with a ⚡ and a countdown) so the swings aren't confused for bugs. Idle players still reach the ceiling; active play just gets there faster.

## Retention / meta
- **15 achievements**, each granting a small permanent production/click bonus.
- **Stats & Collection screen:** "Mutations Discovered X/50", "Achievements X/15".
- **Save system:** localStorage autosave + export/import save string.
- **Settings:** music theme, music volume, screen-shake (Off/Subtle/Full), reduce-motion, sound mute.
- **How-to-Play guide** that auto-opens for new players and is reachable any time.

## Audio / feel ("juice")
- All sound is **procedurally synthesized** via the Web Audio API (no asset files): clicks, buys, evolve, mutation draws, milestones.
- **Generative music engine** with 7 selectable themes (Lo-fi, Lullaby/sleepy, Pulse/beats, Bloom/lovely, Chiptune, Eldritch/dark, Off) — real drums, basslines, chord progressions; intensity ramps with progress.
- Particles, screen shake (on big events, user-controllable), count-up number tweening, a prestige "explosion."

## The viral hook
The **3D creature is the marketing**. Every mutation build produces a visibly different, ugly-charming monster you want to screenshot/clip. Procedural low-poly 3D (Three.js), "Megabonk/Spore" energy — intentionally weird, not photorealistic.

## Tech
- **Vanilla HTML/CSS/JavaScript**, no framework. ES modules.
- **Three.js** (WebGL) for the 3D creature; DOM for the UI.
- Big numbers handled in code (scientific notation past 1e308 if needed).
- localStorage saves. Runs in any modern browser.
- Planned: wrap the web build in **Electron** for a Steam desktop release.
- Code is organized as: `state.js` (save), `economy.js` (all the math/softcaps), `data/` (mutations, generators, genome nodes, achievements, tunables), `creature.js` (Three.js), `ui.js` (DOM), `audio.js` + `music.js`, `juice.js` (particles/shake), `main.js` (game loop). A headless `tools/sim.js` simulates pacing to tune balance.

## Current status
- **Gameplay is feature-complete.** Core loop, mutation draft (50 mutations), the full 2-layer prestige (Evolve + Speciate), Genome Lab, blooms/Digest, achievements, stats, settings, music, the anti-runaway pacing system, and an in-game tutorial are all built and working.
- **Not yet done (requires the human owner):** real-human playtesting, a Steam store page (needs a $100 Steamworks account), capsule art / trailer / wishlist campaign, and the actual launch upload (itch.io + Steam).

## Good questions to ask an AI about this game
- How to tune the pacing curve / numbers for long-term retention.
- Marketing & Steam-page strategy for an incremental indie; how to drive wishlists.
- Ideas for more mutations, build archetypes, or a 3rd prestige layer.
- Naming/branding (current title "Mutation Lab" is a working title and is SEO-weak; a unique coined name is preferred).
- Monetization (free web → paid Steam, cosmetic creature skins, possible mobile port).
