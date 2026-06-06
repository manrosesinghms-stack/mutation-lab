# 🧬 MUTATION LAB — Master Roadmap (A → Z)

> An incremental/clicker game where you grow a single cell. Every prestige forces a **mutation choice** (roguelike RNG). Mutations stack into absurd, visually-distinct builds.
>
> **North-star formula:** Cookie Clicker comfort + Balatro "broken synergy" discovery + a creature that *visibly* mutates = a clip-worthy moment for every run.

---

## 0. Guiding Principles (read before every phase)

1. **The loop is sacred.** A 10–30s core loop feeding a long meta loop. If the loop isn't fun with placeholder art, no amount of polish saves it.
2. **Juice is 80% of "addicting."** Screen shake, particles, sound, number pop-ups. Budget real time for it.
3. **Variable reward > fixed reward.** The mutation draft is the dopamine engine. Protect its surprise.
4. **Every run must look different.** The visible creature is the viral hook. Mutations change appearance, not just numbers.
5. **Ship small, ship playable.** Browser-first. Every phase ends in something you can actually click.
6. **Wishlists are the real boss.** Marketing starts at Phase 1, not after the game is done.

---

## Tech Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Core | **Vanilla HTML/CSS/JavaScript** | Zero engine, runs anywhere, instant iteration, easy Steam wrap later |
| Rendering | **HTML/CSS for UI + `Three.js` (WebGL) for the creature** | UI is DOM (fast to build); creature is **low-poly 3D** — a rotatable, modular monstrosity (the viral hook) |
| Art direction | **Stylized low-poly 3D, "ugly-charming"** (Megabonk-style) | 3D creature-virality is where 2026 breakouts live; jank is forgiving + funny; modular parts = infinite variety for free |
| 3D models | **Modular parts snapped to body sockets** | Each mutation attaches a 3D part (eye, spike, tentacle, jaw) → every build is a unique, screenshot-worthy creature |
| Big numbers | **break_infinity.js** (or custom) | Incrementals overflow `Number` fast; need scientific notation past 1e308 |
| Save | **localStorage** (JSON) | Simple, offline, no backend |
| Audio | **Howler.js** (or native WebAudio) | Reliable cross-browser sound + juice |
| Build/serve | Static files + a tiny dev server | No bundler needed for v1; add Vite only if it grows |
| Steam wrap | **Electron** or **NW.js** (later) | Wrap the web build into a desktop app for Steam |
| Version control | **git** (this repo) | Track every phase |

**Rule:** No dependency added unless it removes real pain. Start dependency-free; add the four libs above only when their pain point is hit.

---

## File Architecture (target)

```
mutation-lab/
├── index.html              # entry point
├── src/
│   ├── main.js             # boot, game loop (requestAnimationFrame tick)
│   ├── state.js            # single source of truth + save/load
│   ├── economy.js          # biomass, generators, costs, prestige math
│   ├── mutations.js        # mutation definitions + draft logic (the hook)
│   ├── creature.js         # canvas rendering of the evolving blob
│   ├── ui.js               # DOM rendering, buttons, panels
│   ├── juice.js            # particles, shake, number pop-ups, sfx triggers
│   └── data/
│       ├── generators.js   # organelle definitions
│       └── mutations.json  # the mutation library (content)
├── assets/
│   ├── audio/
│   └── sprites/
├── styles/style.css
└── docs/
    ├── ROADMAP.md          # this file
    ├── DESIGN.md           # design bible (mechanics, numbers, mutation list)
    └── PROGRESS.md         # running log of what's done per phase
```

---

# THE PHASES

Each phase: **Goal · Deliverables · Key Tasks · Success Criteria · Est. Effort**.
We do them **in order**, one session at a time. Don't start a phase until the previous one's success criteria pass.

---

## ✅ PHASE 0 — Foundation & Setup
**Goal:** A running project skeleton you can open in a browser.

- **Deliverables:** Repo, folder structure, `index.html` that loads and shows "Mutation Lab", dev server runnable.
- **Tasks:**
  - [x] Create repo + folders
  - [x] `index.html` + `style.css` shell
  - [x] `main.js` with a `requestAnimationFrame` game loop + delta time (now rAF **+ setInterval fallback**)
  - [x] `state.js` with a global state object + save/load to localStorage
  - [x] Confirm it serves and renders in the browser preview (python static server on :8137)
- **Success:** Page loads, no console errors, game loop ticks. ✅ **VERIFIED**
- **Effort:** ~1 session. ✅ **DONE 2026-06-05**

---

## ✅ PHASE 1 — Core Loop Prototype (the foundation of fun)
**Goal:** Clicking and idle generation work. Numbers go up. Addicting *before* any art.

- **Deliverables:** Click the cell → gain biomass. Buy 2–3 generators (organelles) that auto-produce. Costs scale.
- **Tasks:**
  - [x] Click target (the cell) → `+biomass`, with a satisfying pop (raycast hit-test on the 3D organism)
  - [x] Generator data structure (name, baseCost, costGrowth ~1.15, baseProduction) — **5 organelles**
  - [x] Buy logic + exponential cost scaling
  - [x] Per-tick production accumulation (delta-time based, not frame based)
  - [x] Big-number formatting (1.23K, 4.56M, 7.89B... then scientific)
  - [x] Basic offline progress (time-away × production on load, capped 8h)
- **Success:** Feel the "buy → produce faster → buy bigger" pull with zero art. ✅ **VERIFIED** (production = exact `sum(owned×prod)`, no double-counting)
- **Effort:** 1–2 sessions. **The make-or-break phase.** ✅ **DONE 2026-06-05**

---

## ✅ PHASE 2 — Prestige + Mutation Draft (THE HOOK)
**Goal:** The roguelike layer. Reset for power, draft a random mutation, builds emerge.

- **Deliverables:** An "Evolve" prestige button → wipes biomass + generators, grants a permanent **mutation pick from 3 random options**.
- **Tasks:**
  - [x] Prestige currency ("Evolution Points") earned from run biomass (sqrt curve); each EP = +10% production
  - [x] Prestige reset logic (clear run state, keep meta state)
  - [x] Mutation system: each mutation = an effect modifier (click mult, production mult, gen-specific mult, EP mult)
  - [x] **Draft UI:** show 3 random mutations, pick 1, it applies permanently and stacks
  - [x] Synergy hooks so mutations *combine* (Balatro feel) — Symbiosis (+8%/mutation), Hivemind (+10%/organelle)
  - [x] Rarity tiers (common/rare/legendary) with weighted draw (60/30/10) = variable reward
- **Success:** Two prestige runs feel different; you chase "what's next?" ✅ **VERIFIED** (multipliers compose exactly; full Evolve→draft→pick flow works)
- **Effort:** 2–3 sessions. **The differentiator from a plain clicker.** ✅ **DONE 2026-06-05**

---

## ✅ PHASE 3 — The Living Creature (THE VIRAL VISUAL) — DONE
**Goal:** The 3D creature on screen *visibly changes* with your mutations. This is the clip moment.

- **Deliverables:** A **Three.js low-poly 3D creature** that grows, pulses, rotates, and sprouts modular parts (eyes, spikes, tentacles, jaws, extra bodies) based on which mutations you own.
- **Tasks:**
  - [x] Three.js scene: camera, lights, slow auto-rotate (+ camera dollies back as it grows). *click-to-orbit still TODO*
  - [x] Low-poly base body (deformed icosahedron) that pulses/squashes on click
  - [x] **Socket system:** fibonacci-distributed anchor points where parts attach
  - [x] Mutation → 3D part mapping (each visual mutation snaps a part onto a socket)
  - [x] Modular parts library: **detailed** eyes (iris/pupil/glint + shared gaze), chomping toothed maw, segmented swaying tentacles, clustered spikes, leafy fronds, **cilia**, **extra-body buds** (with their own eye); hue shift; size scaling
  - [x] "Mutation gained" transformation animation (squash + easeOutBack part pop-in = the clip beat)
  - [x] Surface-accurate placement (parts hug the lumpy body via shared noise field) + gelatinous jiggle + animated parts
  - [x] **Click-to-orbit camera** (drag to rotate; taps still register as clicks; auto-spin resumes)
  - [x] "Ugly-charming" readable + grotesque/funny — confirmed in Chrome (purple chimera w/ googly eyes, maw, tentacles, bud)
- **Success:** Two builds produce obviously-different creatures you *want* to screenshot. ✅ **DONE & visually confirmed**
- **Effort:** 2–4 sessions. Iterative — **foundation shipped early alongside Phase 2; polish remaining.**

---

## ✅ PHASE 4 — Juice & Game Feel (the 80%) — DONE (2026-06-05)
**Goal:** Every interaction feels crunchy and satisfying. This is what makes it "addicting" vs "a spreadsheet."

- **Deliverables:** Particles, screen shake, number pop-ups, hover/click sounds, milestone fanfares.
- **Tasks:**
  - [x] Floating "+N" numbers on every click (done in P1) + count-up tween on biomass
  - [x] Particle bursts (biomass splatter) on click and on purchase (combo-scaled)
  - [x] Screen shake on big events (prestige 18px, legendary mutation 14px)
  - [x] Smooth count-up tweening on numbers; juicy part pop-in (button micro-anims TODO)
  - [x] Sound: click, buy, prestige, mutation-draw, milestone — **procedural Web Audio (no Howler, no assets)**
  - [x] Prestige "explosion" transition (radial flash + shake + burst + sweep); rarity-gold legendary fanfare
  - [x] Mute toggle, persisted in save
- **Success:** Muting makes it feel dead; clicking is physically satisfying. ✅ **VERIFIED** (84 particles/10 clicks, flash+shake on evolve, rarity confetti) + adversarial code review
- **Effort:** 2–3 sessions. ✅ **DONE 2026-06-05**

---

## ✅ PHASE 5 — Content & Balance (depth + the long tail) — DONE
**Goal:** Enough mutations and progression that runs stay fresh for hours.
**See [PROGRESSION.md](PROGRESSION.md) for the full pacing architecture (Speciate + Legible Pressures).**

- **Deliverables:** 30–50+ mutations, a tuned progression curve, milestone unlocks, an early "win/ascend" goal.
- **Tasks:**
  - [x] Expand mutation library to **50** with synergy/tradeoff/gen-specific effects (clicker/idle/crit/swarm/split paths)
  - [x] Balance pass: anti-runaway softcaps (EP + production wall + per-gen saturation), tuned via `tools/sim.js`; sawtooth pacing
  - [x] Milestones + **15 achievements that grant permanent bonuses** (power-of-ten dings + achievement system)
  - [x] Meta goal / ascension layer: **Speciate** (2nd prestige tier) + Genome node grid + Species collection
  - [x] Anti-stall: always a next purchase, and the wall→Speciate loop prevents dead ends
- **Success:** A 1–2 hour session never feels stuck; multiple viable build paths exist. ✅ **DONE**

---

## ✅ PHASE 6 — Retention & Meta Systems — DONE (daily-seed deferred as optional)
**Goal:** Reasons to come back tomorrow.

- **Deliverables:** Robust save, achievements, stats page, optional daily mutation/seed.
- **Tasks:**
  - [x] Hardened save/load (versioned, migration-safe merge, **export/import string**)
  - [x] **15 achievements** with permanent prod/click bonuses + unlock toasts
  - [x] **Stats/Collection screen** — stats + "Mutations Discovered X/50" grid + "Achievements X/15" list
  - [x] Offline progress + "welcome back" status
  - [ ] Optional: daily seed run (shareable score) — *deferred (genuinely optional)*
  - [x] Settings: mute, save wipe, export/import, **music volume slider**
- **Success:** A returning player has clear goals and feels their progress persisted. ✅ **DONE** (daily-seed optional/deferred)

---

## ✅ PHASE 7 — Audio & Music — DONE
**Goal:** Atmosphere + dopamine reinforcement.

- **Deliverables:** SFX set + ambient/loop music with intensity scaling.
- **Tasks:**
  - [x] SFX (clicks, buys, mutation stings, milestone chimes) — **procedural Web Audio, no asset files**
  - [x] **Generative ambient music** (`music.js`): minor-pentatonic bed, lookahead scheduler, **intensity ramps with progress**
  - [x] Audio settings — mute toggle (persisted) + **music volume slider** (persisted)
- **Success:** Sound reinforces every reward. ✅ **DONE**

---

## 🧪 PHASE 8 — Playtesting & Balancing
**Goal:** Real humans, real data, fix the boring/broken parts.

- **Deliverables:** Playtest builds, feedback loop, analytics on where players stall/quit.
- **Tasks:**
  - [ ] Ship a public web build (itch.io / GitHub Pages) for feedback
  - [ ] Lightweight analytics (session length, prestige count, drop-off point)
  - [ ] Collect feedback (Discord, Reddit r/incremental_games — a goldmine audience)
  - [ ] Iterate balance + first-time-user experience (first 60 seconds must hook)
- **Success:** Median session length climbs; r/incremental_games gives positive signal.
- **Effort:** Ongoing, 2–4 sessions of focused iteration.

---

## 📣 PHASE 9 — Marketing & Steam Page Prep (start EARLY, in parallel)
**Goal:** Wishlists before launch. This is the real determinant of success.

- **Deliverables:** Steam page live, capsule art, trailer, GIFs, Shorts pipeline, community hub.
- **Tasks:**
  - [ ] Name lock + logo + capsule art (the most important marketing asset)
  - [ ] **Steam page up ASAP** — wishlists compound over time
  - [ ] 30–60s trailer built around the *mutation transformation* moment
  - [ ] A library of clippable GIFs (each absurd creature build)
  - [ ] YouTube Shorts + Reddit cadence (TikTok organic is dead — Shorts + r/incremental_games + r/playmygame)
  - [ ] Discord community as the retention/feedback layer
  - [ ] Micro-influencer outreach (incremental/roguelike streamers, 1k–10k CCV)
  - [ ] Demo / free web version as the funnel into wishlists
- **Success:** Steady wishlist accumulation; a few creator covers; a clip that pops.
- **Effort:** Continuous from Phase 2 onward. **Do NOT leave to the end.**

---

## 🚀 PHASE 10 — Launch
**Goal:** Ship it where it earns.

- **Deliverables:** Free web build (itch.io PWYW) → polished Steam release.
- **Tasks:**
  - [ ] itch.io "pay what you want" launch (build audience + tip income)
  - [ ] Wrap web build in Electron/NW.js for Steam; integrate Steamworks (achievements, cloud saves)
  - [ ] Steam store finalize: price ($3–7 range per genre comps), tags, screenshots, trailer
  - [ ] Launch-day push: creators, Reddit, Discord, Shorts blast — concentrate the spike (algorithm rewards it)
  - [ ] Day-1 patch ready for inevitable bugs
- **Success:** Hit the 50–1000 review visibility band; positive review ratio.
- **Effort:** 2–3 sessions + coordination.

---

## ♻️ PHASE 11 — Post-Launch & Monetization
**Goal:** Turn a spike into a tail.

- **Deliverables:** Update cadence, cosmetic monetization, community-driven content.
- **Tasks:**
  - [ ] Cosmetic mutation skins / creature themes (the planned money model)
  - [ ] Content updates (new mutation packs, ascension layers) to re-trigger Steam visibility
  - [ ] Seasonal/daily events for retention
  - [ ] Listen to community; double down on the builds people love to clip
  - [ ] Consider mobile port (idle games' $7.8B IAP market) if web/Steam validate
- **Success:** Sustained players + recurring revenue + organic clip sharing.
- **Effort:** Ongoing.

---

## Execution Order Cheat-Sheet

```
0 Setup → 1 Core Loop → 2 Mutation Draft → 3 Living Creature → 4 Juice
        → 5 Content/Balance → 6 Retention → 7 Audio → 8 Playtest
   (9 Marketing runs in PARALLEL from Phase 2 onward)
        → 10 Launch → 11 Post-launch
```

**Critical path to "is this fun?":** Phases 1 → 2 → 4. If those three click, the game works. Everything else is amplification.

**Next action:** Execute **Phase 0** (finish the skeleton) and immediately roll into **Phase 1** (core loop), then get it running in the browser preview so you can click it.
