# Mutation Lab — Project Status Briefing (paste this to an AI for help)

## What it is
**Mutation Lab** is a **browser-based incremental/idle "clicker" crossed with a roguelike**. You grow a single cell into an absurd, ever-mutating low-poly 3D creature. Numbers go up, the creature visibly transforms, and every run looks different. Solo dev project, aimed at a **free web release → paid Steam release (~$3–7)**.

**Pitch:** *Cookie Clicker's comfort + Balatro's "broken build" discovery + a creature that visibly mutates into a screenshot-worthy monstrosity.*
**Comparables:** Cookie Clicker, Antimatter Dimensions, Balatro, Vampire Survivors/Brotato, Spore's creature creator.

## Current status: FEATURE-COMPLETE & PACKAGEABLE
The entire game is built, verified, and committed to git. It runs in any browser **and** as a desktop app (Electron). Three.js is vendored locally so it works fully **offline**. What's left is *launch logistics* (needs a human) and *online features* (need a backend) — see the end.

---

## The full game loop
1. **Click** the 3D organism → **biomass** (currency). Drag to orbit the creature.
2. Buy **5 organelles** that auto-produce biomass/sec (exponential costs; spreading across all 5 beats spamming one — per-generator diminishing returns).
3. **Evolve** (1st prestige): reset the run for **Evolution Points** (permanent production multiplier, softcapped) + a **3-card mutation draft**.
4. **Draft mutations**: pick 1 of 3 (rarity-weighted). **58 mutations** total — permanent, stack, and **grow 3D parts on the creature** (eyes, maw, tentacles, spikes, fronds, cilia, extra-bodies). Includes tradeoff "defects" and rare "alien DNA".

## The anti-runaway spine (the key design)
- **Metabolic Pressure wall:** production soft-caps; as you near it the creature strains red. Past it, upgrades barely help. (Tuned via a headless sim in `tools/sim.js` — wall hits ~18 min.)
- **Speciate (2nd prestige):** at the wall, bank your build as a permanent **Species card**, earn **Genome**, reset deeper.
- **Genome Lab:** spend Genome on a node grid (raise the wall, auto-buy, +draft cards, etc.), **equip Species** for bonuses (they appear as translucent "ghost-chimera" overlays), and **fuse** mutations (sacrifice 3 → 1 rarer).
- Result: a sawtooth — sprint → wall → Speciate → raise wall → repeat.

## Everything that's built
**Content & systems:**
- 58 mutations; **10 synergy "traits"** (5 hidden legendaries like *Deep Sea Horror* — owning the right part-combo unlocks a named evolution with a big reveal); **5 themed sets** with set-form bonuses.
- **Boss organisms** (rival cell appears, click to destroy for Genome + free draft + fossil drops).
- **Rare run variants** (Golden ×2 / Crystal ×1.5 / Void ×3 — full creature reskin).
- **Reroll tokens** (re-roll the draft), **genetic defects** (cursed high-risk cards), **mutation fusion/reactor**.
- **6 biomes** (each run: a world that sets the background + buffs a build type), **Genetic Instability** event (Stabilize vs Embrace Chaos at 14+ mutations), **alien DNA** pool.
- **4 challenge runs** (Parasite/Pacifist/Hypermutation/Fragile — change the rules for rewards), **ancient fossils** + a Museum.
- **Daily Seed** (everyone gets the same draws that day; local best score), **Weekly Event** (rotating global modifier).
- **15 achievements** (permanent bonuses), full **Stats & Collection** screen, **Codex** (traits/sets/encyclopedia/museum).

**Identity / shareability (the viral hook):**
- Procedural **creature naming** that evolves with parts (3 styles: Scientific/Cute/Eldritch).
- **Photo Mode** (hide UI, free-orbit, save a PNG with name caption).
- **Creature DNA sharing codes** (copy/import).
- **Species History** timeline.
- 7 cosmetic **skins**, 7 animated **backgrounds**, 7 procedural **music themes**.

**Feel & UX:**
- Procedural Web Audio SFX + generative music (no asset files), particles, screen shake (toggleable), count-up numbers, prestige explosion, mutation grow-in animations.
- Auto-opening **How-to-Play** guide + first-time hints; full **Settings** (sound, music theme, background, name style, screen shake, reduce-motion).
- Hardened save (localStorage autosave + export/import string).

## Tech
- **Vanilla HTML/CSS/JavaScript**, ES modules, no framework. **Three.js** (vendored locally) for the creature; DOM for UI.
- **Electron** desktop wrapper (`npm run electron`); `npm run dist` builds a Windows installer + portable `.exe`. Runs offline.
- File map: `state.js` (save), `economy.js` (all the math/softcaps/systems), `data/` (mutations, generators, genome-nodes, achievements, synergies, sets, biomes, challenges, skins, names, tunables), `creature.js` (Three.js), `background.js`, `ui.js`, `audio.js` + `music.js`, `juice.js`, `main.js` (loop). `tools/sim.js` = headless pacing sim.

## What's NOT done (and why)
- **🔒 Launch logistics (needs a human):** Steam page, capsule art, trailer, wishlists, the $100 Steamworks account, store upload, real playtesters. (Checklist in `docs/BUILD.md`.)
- **🌐 Needs a backend (no server yet):** online leaderboards for Daily/Weekly; global "X players discovered this" counters.
- **Optional/not-yet:** Steamworks achievement+cloud-save integration (scaffoldable but needs a real App ID to test), a mobile/touch port, more content packs.

## Good questions to ask an AI
- Is the progression/number pacing tuned well for long-term retention? Any obvious balance exploits?
- Steam marketing strategy for an incremental indie — how to drive wishlists before launch; capsule-art & trailer direction.
- Ideas for more synergies / a 3rd prestige layer / endgame.
- A real (coined, SEO-strong) **name** to replace the working title "Mutation Lab".
- Monetization: free web → paid Steam, cosmetic skin DLC, possible mobile IAP.
- Should daily/weekly get a real backend + leaderboards, and what's the cheapest way (e.g., Supabase)?
