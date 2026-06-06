# Mutation Lab — Progress Log

## ✅ Phase 0 — Foundation & Setup — DONE (2026-06-05)
- Repo + folder structure created
- `index.html` shell + `style.css` (dark, stylized UI)
- Three.js loaded via native import map (no bundler)
- `main.js` master loop: delta-time `requestAnimationFrame`, autosave every 15s
- `state.js`: global state + localStorage save/load (versioned, migration-safe), wipe
- Static dev server via `.claude/launch.json` (python http.server :8137)
- **Verified:** page loads, zero console errors, loop ticks

## ✅ Phase 1 — Core Loop Prototype — DONE (2026-06-05)
- Click the 3D organism → +biomass (raycast hit detection, only counts clicks ON the creature)
- 5 generators (Ribosome → Vacuole) in data-driven `generators.js`
- Exponential cost scaling (~1.15/owned), soft unlocks by lifetime biomass
- Passive production accumulates per-tick (delta-time based)
- Big-number formatting (K/M/B/T… → scientific) in `format.js`
- Offline progress on load (capped 8h)
- Floating "+N" click numbers, save/wipe buttons, status toasts
- **Verified in browser:**
  - Clicks add biomass; 25 clicks = 25 float numbers (all raycast-hit the organism) ✓
  - Buying works, cost scales, owned count increments ✓
  - **Passive rate is an EXACT match to `sum(owned × baseProduction)`** — no double-counting ✓
  - Production accrues over time at the correct rate ✓

## 🎁 Phase 3 teaser (early)
- Low-poly 3D creature already on screen: deformed icosahedron, flat-shaded, green w/ purple rim light
- Pulses/squashes on click (juice), idle breathing, slow auto-rotate
- Grows with biomass (log-scaled)
- (Full modular mutation-part system still belongs to Phase 3 proper)

## ✅ Phase 2 — Prestige + Mutation Draft (THE HOOK) — DONE (2026-06-05)
- **Evolution Points** prestige currency: `floor(sqrt(runBiomass / 1e4) × epMult)`
- **Evolve** button: resets the run (biomass + generators), keeps all meta (EP, mutations); each EP = +10% global production
- **14 mutations** across common/rare/legendary in `data/mutations.js`, declarative `effect(mods,info)`; state stores only IDs
- Effect types: click mult, production mult, gen-specific mult, EP mult, and **synergies** (Symbiosis = +8%/mutation, Hivemind = +10%/organelle) — the Balatro "broken build" feel
- **3-card draft modal** with rarity-weighted draw (60/30/10), rarity-colored cards, "grows a ___" tags, juicy card-in animation
- **Mutation collection** chips in the panel (rarity-bordered, ×N stacks)
- **Living creature reacts:** every mutation drifts the creature's hue + triggers a squash; **visual mutations physically sprout 3D parts** (eye, spike, tentacle, jaw, frond) on fibonacci-distributed sockets with a juicy pop-in — the clip moment
- Camera dollies back as the creature grows so it stays framed
- **Verified end-to-end in the real UI:**
  - Production multipliers compose EXACTLY: base 2.0 → ×4 → 8 → ×2 → 16 → ribo×3 → 48 ✓
  - EP global bonus exact (10 EP = +100% → 2.0→4.0) ✓; click ×5 exact ✓
  - Real flow: Evolve enabled by loop → modal opens → 3 cards → pick → mutation added + modal closes ✓
  - Prestige resets run, awards EP, increments count ✓
  - Parts grow + hue shifts + chips render (confirmed in screenshot) ✓

### Robustness fixes made this session
- **Background simulation:** `setInterval` fallback drives the same shared-time `update()` as rAF, so the organism keeps living (and the canvas keeps painting) when the tab is backgrounded — no double-counting (dt from a shared timestamp).
- **Resize guard:** `resize()` ignores 0-size layout (backgrounded tabs report `clientHeight: 0`, which was collapsing the WebGL buffer and freezing the renderer).
- Dev handle `window.ML` for console balancing/testing.

## ✅ Phase 4 — Juice & Game Feel — DONE (2026-06-05)
- **Procedural sound via Web Audio API** (`audio.js`) — zero asset files, no Howler needed. Synthesized voices: click (pitch rises with combo), buy (two-note), evolve (sweep + sub-boom), mutation draw (common/rare/legendary flavor), milestone fanfare. Lazy AudioContext resumed on first gesture; mute toggle persisted in save.
- **Particles** (`juice.js`) — DOM bursts in #fx-layer: green splatter on click (scales with combo), purchase bursts on the organelle row, rarity-colored confetti on mutation pick (gray/blue/gold), big purple/gold explosion on evolve.
- **Screen shake** — decaying transform on #app, triggered by evolve (18px) and legendary draws (14px).
- **Prestige explosion** — full-screen radial `#flash` overlay (purple on evolve, gold on legendary) + shake + 60–70 particle burst + evolve sound.
- **Number count-up tween** — biomass display eases toward the real value each frame (satisfying on big gains / offline returns).
- **Mute button** in the footer (🔊/🔇), persisted.
- **Verified in browser:**
  - Click → +biomass, float number, 84 particles across 10 clicks, sound call ✓
  - Evolve → flash-go class, #app shake transform, 60 burst particles, draft modal ✓
  - Mutation pick → rarity confetti (28/70 particles) ✓
  - Mute toggle flips label + state, persisted ✓
  - Zero console errors ✓
### 🔬 Adversarial code review (15 agents: bugs / leaks / compat / feel) → 5 confirmed, 6 dropped
The verify pass correctly **refuted** 6 false positives (particle setTimeout retention, per-frame querySelector, audio resume() promise, combo-starts-at-0, tween snapping, click jitter) with sound reasoning. **5 confirmed feel fixes applied:**
1. **Affordable-generator pulse** — rows now brighten to `--accent` + `genReady` box-shadow pulse + bright cost color (was a nearly-invisible dark border). Respects `prefers-reduced-motion`.
2. **Click screen-shake** — `shake(1 + min(combo,18)*0.25)` so the core action escalates physically (~1px lone click → ~5.5px at high combo, capped below legendary/evolve).
3. **Milestone dings** — every new power-of-ten of *lifetime* biomass fires `playMilestone()` + gold burst + status. Keyed off lifetime (not run) biomass so prestige doesn't re-fire; exponent-tracked so it never double-fires across rAF + setInterval; existing big saves don't dump a backlog.
4. **Rare confetti tier** — common 24 / rare 44 / legendary 70 particles (was common=rare=28), restoring the rarity escalation step.
5. **Buy escalation** — buy sound pitch + particle count/spread scale with generator tier (0–4).
- ✅ Verified post-fix: affordable `genReady` animation + bright cost color, milestone ding (exp 3→4, "milestone: 10.0K biomass"), tier lookup, zero console errors.

## 🟢 Phase 3 polish — Better creature models — DONE (2026-06-05)
Upgraded the procedural parts from simple cones/spheres into characterful, animated models:
- **Eyes** — bulging glossy eyeball + colored emissive iris + pupil + specular glint, in a "look" sub-group so **all eyes gaze around together** (shared drift = reads as one mind).
- **Maw (jaw)** — dark cavity + upper/lower hinged lips + a 14-tooth ring; **chomps open/closed** on a sine cycle.
- **Tentacles** — 6 tapering segmented spheres along a gentle curve + sucker tip; sways.
- **Spikes** — a 3-cone cluster with darker bone tips, tilted outward.
- **Fronds** — stem + 5 flattened leaf-blades fanning out; sways.
- **Surface-accurate placement** — parts now query the SAME noise field that deforms the body (`bumpAt`/`surfaceRadius`) so they sit ON the lumpy surface instead of floating at a fixed radius.
- **Gelatinous jiggle** — per-axis sine wobble on the body for a living, jelly feel; clicks now also register when hitting a part (recursive raycast).
- **Better lighting** — added warm fill + a teal point light for specular pop on the glossy eyes.
- **Verified:** all 5 part builders construct without throwing; loads with zero console errors.
- ⚠️ **Not pixel-verified yet** — the preview screenshot tool can't capture while the tab is backgrounded (it waits for a foreground compositor frame). **Needs a human eyeball at http://localhost:8137** to confirm the look + steer art direction.
- Still TODO in Phase 3: click-to-orbit camera; cilia / extra-body parts.

## 🔒 Security + art polish pass (2026-06-05, reviewed live in Chrome)
- **Patched cheat console (Exploit #1):** the `window.ML` dev handle is now gated behind `?debug` — the default build exposes NO console cheat surface. Verified in Chrome: `localhost:8137` → `window.ML` undefined; `localhost:8137/?debug=1` → enabled for our testing.
  - *Note:* all client-side games are ultimately editable (localStorage/JS); fully preventing this only matters with online leaderboards (server validation). Removing the obvious handle is the right level for single-player.
- **Open balance question (Exploit #2 — NOT yet patched, by choice):** click-multiplier mutations stack multiplicatively with no cap and persist through prestige, so clicking can run away (Third Eye ×5 × Apex ×3 × Tendrils ×1.5 = ×22.5, unbounded). This is "broken-build" fun by genre convention — left as a deliberate design decision for later balancing (Phase 5).
- **Art polish (verified in Chrome):**
  - Camera pulls back further as the creature grows → no more top-edge clipping of spikes/tentacles, even at 5M+ biomass.
  - **Bigger, more expressive eyes** (the most shareable feature): larger eyeball, bigger pupil, TWO glints for cartoon sparkle.
  - Iris colors drawn from a tuned palette (teal/amber/violet/blue/green/pink) instead of muddy random hues.
  - Confirmed live: googly eyes + toothed maw + beaded tentacles + leafy fronds + bone-tipped spikes all read great on a gelatinous body.

## ✅ Progression Phase 0 — Pacing fix (anti-runaway) — DONE (2026-06-05)
Fixes the "player finishes in <1hr" problem. Plan: [docs/PROGRESSION.md](PROGRESSION.md) ("Speciate + Legible Pressures", from a 5-design/3-judge/1-synthesis pass).
- **`src/data/tunables.js`** — all pacing constants in one file.
- **EP payoff softcap** (`economy.js` `epPayoffMult`): linear +10%/EP up to 50, then a sqrt tail. Verified live: EP10 ×2.0 (identical to old), EP50 ×6, EP500 ×16.6 (was ×51), EP5000 ×41 (was ×501).
- **Global production softcap** (the "wall"): `S*(raw/S)^0.22`, S = base × genomeCapBonus. Verified live: raw 561M/sec → 111K realized (5,000× crush). `productionSoftcapThreshold()` + `pressureLevel()` exported for the Phase-1 meter.
- **Per-generator saturation**: discourages mono-buying one organelle (fixes the Vacuole-×13 dominance).
- **`state.tempBuffs` + `genomeCapBonus`** scaffolded; single temp-buff application point in `getModifiers` (anti-leak discipline).
- **`package.json` (`type: module`) + `tools/sim.js`** — headless pacing simulation reusing the real tunables/generators/mutation effects.

### 🔬 The sim caught a real design bug BEFORE any UI was built (the de-risk gate working)
- The synthesis's proposed `S = 1e3 × 1.6^prestiges` **did NOT tame the runaway**: an optimizing player prestiges 100s of times, inflating the "wall" to ~1e33, so the cap became meaningless. Sim result with that math: **1e77 lifetime / 165 prestiges / 1e37 EP at 60 min** — still a runaway.
- **Fix:** S must NOT grow with prestige count — only Genome (the Speciate currency) raises it; and the knee hardened (exp 0.5 → 0.22). New sim result: **429M lifetime / 15 prestiges / 473 EP at 60 min, curve bending (1e7→1e8 takes 13 min), first wall/Speciate-unlock at ~18 min.** Tamed.
- Lesson baked into the plan: the softcaps stabilize a single run, but the EP/prestige META-accumulation is the true runaway — it MUST be bounded by the Speciate reset (Phase 2). Phase 0 stabilizes; Speciate completes the fix.

## ▶️ Next: Progression Phase 1 (make the wall legible — Metabolic Pressure meter + creature stress) → then Phase 2 (Speciate). Consider a human playtest of the new pacing first. Also: lots uncommitted — commit milestone to git.
