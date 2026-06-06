# 🧬 Mutation Lab — ROADMAP 3 (Presentation & Premium Feel)

> v1 = the engine. v2 = retention systems. **v3 = make it look/feel like a $15 Steam game, not a $3 browser idle.**
> Zero new mechanics. Pure **visual feedback density** + **spectacle**. The goal: a player should recognize a build from a *screenshot alone*, and feel premium in the first 10 seconds.

## Guiding principle
Every resource, threat, and reward should have a **physical, animated, audible** representation — not a number or a text toast. Effects are cheap vs. systems and convert wishlists harder than +50 mutations.

## Build order (impact × feasibility, tied to our code)

| # | Upgrade | Where it hooks | Effort | Status |
|---|---|---|---|---|
| 1 | **Adaptive music** (layers ramp w/ progress · **wall heartbeat** · boss danger layer) | `music.js` | M | ✅ batch 1 |
| 2 | **Cinematic moments** (legendary evolution, Speciation, boss intro/death — slow-mo + zoom + vignette + big text + roar) | new `cinematic.js` + `creature.js` camera | M | ✅ batch 1 |
| 3 | **Build-dependent auras** (predator=blood aura, neural=blue sparks, void=distortion…) — recognize a build from a screenshot | `creature.js` (particle/aura per dominant part/synergy) | M | ✅ batch 1 |
| 4 | **Living creature** (breathing/twitch · periodic blink) | `creature.js` | S | ✅ batch 2 |
| 5 | **Metabolic-pressure spectacle** (red screen-edge vignette → heartbeat pulse at the wall) | `creature.js` + DOM vignette + `music.js` | M | ✅ batch 2 |
| 6 | **Creature Habitat** (the #1 call-out: floor + specimen pad + depth fog + drifting biome motes) | `creature.js` scene | L | ✅ batch 2 |
| 7 | **Living backgrounds** — covered by habitat motes (batch 2) layered over the existing 7 animated backgrounds | `background.js` | M | ✅ (via habitat) |
| 8 | **Draft presentation** (staggered card reveal + rarity-coloured pulsing glow on epic/legendary/alien) | `ui.js` draft | L | ✅ batch 3 |
| 9 | **Premium juice** (click ripple + biomass particles flying to the counter · critical extraction at combo ≥12) | `juice.js` + `main.js` | M | ✅ batch 3 |
| 10 | **Mutation family SFX** (eyes=wet squish, spikes=crack, tentacles=stretch, jaw=chomp, frond=rustle, cilia=shimmer) | `audio.js` | S | ✅ batch 3 |
| 11 | **Premium skins** (full transformations: Crystal refraction, Machine cyborg, Void disembodied, Celestial galaxy-flesh) | `creature.js` materials/shaders | L | later |
| 12 | **Organic material shader** (fresnel subsurface-glow membrane shell; over-glows with metabolic stress; aura-tinted) | `creature.js` material | L | ✅ batch 4 |
| 13 | **Endgame reality corruption** (35+ mutations: chromatic/scanline overlay, RGB title fracture, periodic frame tears — scales to full at 60) | global CSS/JS | M | ✅ batch 4 |
| 14 | **Resource physicality** (biomass tank fills, Genome = DNA strands, pressure = glowing veins, EP = neural nodes) | `ui.js` | M | later |
| 15 | **Mutation evolution stages** (Eye L1→L2→Compound→Cosmic — one mutation visually levels up) | data + `creature.js` | L | batch 5 |
| 16 | **AAA UI re-skin** (glass-lab/holographic theme — Subnautica/Control vibe) | `style.css` | L | batch 5 |
| 17 | **"OMG screenshot" tools** (scale slider: mouse→human→mountain · museum specimen showcase) | Photo Mode | M | batch 5 |

## ChatGPT's top-7 (the priority spine) → maps to: 2, 6, 8, cinematics(2), 12, 1, 6.
The single biggest: **#6 Creature Habitat** — the mutant in a believable environment instead of floating in a void is what instantly reads as "real commercial game."

## Tech notes / constraints
- True subsurface-scattering/custom shaders need GLSL (`material.onBeforeCompile` or `ShaderMaterial`) — feasible but the heaviest items (12, 11). We approximate first (fresnel rim, emissive pulse, wetness via envMap-ish specular).
- Keep it performant: particles via instanced/pooled meshes or the existing DOM `#fx-layer`; respect the existing **Reduce Motion** setting for all new motion.
- Everything stays vanilla JS + Three.js, offline (vendored).

## Definition of done for v3
A new player's first 30 seconds look premium; legendary/Speciation moments are *memorable*; the creature is *alive* in a *place*; and a screenshot of an endgame build is unmistakably "a real Steam game."
