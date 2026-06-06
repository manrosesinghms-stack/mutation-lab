# 🧬 Mutation Lab — Progression Architecture (the "ends in <1hr" fix)

> Output of a 5-design / 3-judge / 1-synthesis design pass. Recommended architecture:
> **"Speciate + Legible Pressures"** — a two-prestige core where every anti-runaway nerf
> is surfaced as a visible creature/UI system, never a silent math change.

## The problem (root causes in current code)
1. **Unbounded linear EP** — `mods.prodMult *= 1 + EP*0.10` makes every EP free permanent power.
2. **Multiplicative stacking, no opposing force** — mutations multiply forever, persist through prestige.
3. **No hard gates / no walls** — nothing ever forces a strategy change; the screen looks identical at 12.9K and 12.9B.
4. **Thin content** — 14 mutations, 5 generators, one prestige layer.

## The architecture (what we build)
1. **Keep Evolve exactly as-is** — the proven 0–15min hook. Don't touch the early curve.
2. **Bend the runaway at the single `getModifiers()`/`productionPerSecond()` chokepoint** with two softcaps (below).
3. **Surface the softcap as a diegetic "Metabolic Pressure" meter** — as you near the cap the creature desaturates / trembles / over-saturates ("about to pop"); a banner reads **"BODY MAXED — Speciate to grow further."** Turns an invisible nerf into a screenshot-able objective. Reuses existing `applyHue`/material/punch — zero new geometry.
4. **Add ONE prestige layer above Evolve — SPECIATE** (gated at a *visible* 1e9 run-biomass). Speciating snapshots your build into a permanent **Species card**, wipes EP/mutations/generators, and grants **Genome** (a *spendable* meta-currency = the anti-runaway sink). Genome buys a small node grid AND raises the Pressure cap — so the wall is the invitation to reset. Equipped Species stamp a faint **ghost-chimera overlay** on the creature → the marquee viral asset.
5. **Graft "Bloom & Famine" for continuous creature-hook** — golden **Mitogen Bloom** spawns (one raycastable mesh + setTimeout scheduler) give temporary ×7 frenzy windows; a **Digest/Hunger** biomass sink lets active players spend the pool. Keeps the creature transforming moment-to-moment, not just at resets.

## ⚙️ The pacing-fix math (all in one `tunables.js`)
1. **EP-payoff softcap** (kills the unbounded linear lever). Replace `prodMult *= 1 + EP*0.10` with:
   `epMult = EP<=50 ? 1 + 0.10*EP : 1 + 5.0 + 0.5*Math.sqrt(EP-50)`
   → EP=10 ×2.0, EP=50 ×6.0, EP=500 ×16.6, EP=5000 ×41. **Sub-50 EP feels identical to today**; the explosion past 50 is clipped exponential→sqrt. `epForReset = sqrt(runBiomass/1e4)` unchanged.
2. **Production softcap** (the visible wall). After summing raw output:
   `const S = base * genomeCapBonus; return total<=S ? total : S*Math.pow(total/S, 0.22);`
   → ⚠️ **CORRECTED after sim (do NOT scale S by `1.6^prestiges` — the sim proved an optimizing player prestiges 100s of times and inflates the wall to ~1e33, defeating it; result was 1e77 lifetime at 60 min).** S rises ONLY via Genome (Speciate), and the knee is hardened to **0.22** (raw 561M → 111K realized, a 5,000× crush, verified live). Validated sim: 429M lifetime / 15 prestiges at 60 min, curve bending. This IS the Metabolic Pressure meter (fill % = raw/S); first wall-hit ≈ 18 min.
3. **Per-generator saturation** (kills "dump everything into one organelle" — your Vacuole ×13). Same `pow(0.85)` per-generator above a threshold, so spreading across all 5 + chasing mutations beats mono-buying.
4. **Genome = bounded spendable sink**: on Speciate, `genome += floor(log2(runBiomass)) + 2*distinctMutations` (1e9/5muts → 39). It's *spent*, so it can never inflate the score.
5. **Centralized temp-buff discipline**: ALL temporary buffs (blooms, Digest, abilities) in ONE `state.tempBuffs` array applied at ONE point in `getModifiers`; all permanent mults softcapped at ONE point. One missed softcap path = the runaway returns, so single-application is the discipline.

Net shape: the smooth vertical exponential becomes a **sawtooth** — sprint ~8–12 min into the Pressure wall, Speciate (reset), next sprint ~3× faster while the cap sits ~100× higher. The exponential never runs free for more than one layer-length.

## Phased build plan
- **Phase 0 — Pacing fix in isolation (1 session, SHIP & PLAYTEST FIRST).** `tunables.js`; EP softcap; production softcap + per-gen saturation; `state.tempBuffs` scaffold; **a headless Node sim of lifetimeBiomass-over-time to tune the softcap-bite to ~8–12 min** before any UI. *This is the de-risk gate.*
- **Phase 1 — Make the wall legible.** Metabolic Pressure DOM meter; creature-stress shader (desaturate/tremble above ~0.8 fill); "BODY MAXED" banner; "Speciate unlocks at 1e9 — you are at 4.2e8" gate label.
- **Phase 2 — SPECIATE layer + Genome sink + Species library.** `doSpeciate()`; Genome node grid (~6–8 nodes); Species equip; ghost-chimera overlay (cap 3–5, flat-color fallback); Species Library collection + **export/import save string**; set/synergy bonuses.
- **Phase 3 — Continuous hook: Blooms + Digest.** Mitogen Bloom spawner + clickable mesh; Digest/Hunger sink (creature engorges then shrinks); idle-purist safety (AFK earns softcapped baseline; Hunger behind a toggle); per-prestige Mutagen Surge with a free reroll.
- **Phase 4 — Post-launch packs (Steam-visibility re-triggers).** Strain/challenge ladder; biome reskins; Extinction layer + Sediment; Singularity/automation far-tail (ship LAST).

## ❓ Open questions for the owner (decide before/while building)
1. **Idle vs active identity** — AFK reaches the same ceiling (slower), or is peak power gated behind active blooms/Digest? *(Rec: AFK earns softcapped baseline, active is upside, Hunger behind a toggle.)*
2. **Speciate wipe severity** — full wipe of the Evolve build, or partial carry-over (keep 1 mutation) to soften the first reset?
3. **Ghost-chimera render budget** — min-spec target (integrated GPU)? Sets equip cap (3 vs 5) + whether flat-color fallback ships at v1.
4. **Launch scope** — launch = Phases 0–3, Strains/Extinction/Singularity post-launch? If Steam wants more depth at v1, which ONE pack moves up (Strains vs Biomes)?
5. **Mutation pool** — author ~10 more (Speciate-era themed) before launch so drafts stay fresh, or ship 14 + add in packs?
6. **Save migration** — export/import string ships in Phase 2; Speciate wipe whitelisted to only clear documented run-state keys.

## First-session builds (highest leverage, in order)
1. `tunables.js` (every constant in one place).
2. EP-payoff softcap in `getModifiers()` (one line).
3. Production softcap + per-gen saturation in `productionPerSecond()` (~6 lines) — **the wall**.
4. **Headless Node sim** to tune softcap-bite to ~8–12 min & confirm the 1e9 gate BEFORE building UI.
5. Metabolic Pressure meter + creature-stress shader + "BODY MAXED" banner — ship in the SAME push so the wall never appears as a silent nerf.
