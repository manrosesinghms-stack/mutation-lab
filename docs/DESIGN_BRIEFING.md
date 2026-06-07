# Mutation Lab — Design Briefing (for outside feedback)

## What the game is
A browser-based **incremental / idle clicker crossed with a roguelike**. You start as a
single cell and grow it into an ever-mutating low-poly 3D creature. Built in vanilla
HTML/CSS/JS + Three.js. Plan: free web release → paid Steam release.

**Core verb:** click the cell to make biomass; biomass buys organelles (auto-producers);
production snowballs; you prestige to reset for permanent power; repeat at a bigger scale.

## The currencies & resources
- **Biomass** — main currency. Earned by clicking + passive production. Spent on organelles, upgrades, most systems.
- **Evolution Points (EP)** — 1st prestige currency.
- **Genome** — 2nd prestige currency.
- **Helix** — 3rd prestige currency.
- **Mutagen** — slow-growing rare currency (one ripens ~every 20 min, even offline); levels up organelles.
- **Catalyst** — regenerating pool that powers Reactor "spells."
- **Reagents** — traded on an in-game market (buy low / sell high).

## The three prestige (reset) layers — the heart of the problem
1. **Evolve** → resets your run, gives EP, you draft **mutations** (the roguelike part — random mutation choices that change your creature & bonuses).
2. **Speciate** → resets EP layer, gives Genome, banks a "Species card."
3. **Transcend** → resets everything below, gives Helix (meta upgrade tree + idle automation).

Each reset multiplies future power but **sends you back to near-zero**, then you climb again faster.

## Systems built so far (a lot)
- **Organelles** (10 auto-producers), **Upgrade Store** (81 upgrades), **Genome Lab** (node grid), **Helix tree** (meta).
- **Mutations + synergies + set bonuses** (the roguelike draft).
- **Colonization Map** — 24-node frontier; spend biomass to claim territory for permanent bonuses (biomass *sink* + goal ladder).
- **Automation Bay** — "machines that work for you": auto-clicker **drones**, **automators** (auto-harvest / auto-collect blooms / auto-cast / auto-claim colony nodes), and a **factory/assembly line** (passive rare-currency production).
- **Mini-systems:** Reactor (spells), Genome Pantheon (slot ancestral genes), Symbiote companion, Petri Garden (plant/harvest), Gene Splicer (hybrids), Biomass Exchange (market), Seasons, Challenges, Daily runs, Mitogen Blooms (golden clickable frenzies), Leeches (parasites you pop).
- **Polish:** Graphics-quality setting, animated backgrounds, music, 151 achievements, skins, photo mode, particle juice, escalating click-combo crits, visible idle effects.

## Recent direction
- Removed a punishing production "wall"; production now grows freely like Cookie Clicker.
- Made **clicking matter at every scale** (a click = % of production/sec, so it never becomes irrelevant).
- Made **idle visibly alive** (drones show pulses/numbers; automation has flourishes).

## THE CURRENT PROBLEM
The player reaches **"maxed" / endgame** (~quadrillions of biomass) and says:

> *"I'm maxed, so there's no point to anything — because [prestiging] takes you back to the start."*

Once the numbers are huge, the only thing left is to **prestige, which resets to near-zero and
makes the progress feel erased**. The reset feels like punishment / a treadmill, not a reward.
There's no compelling *new* thing to chase at the top; it loops back on itself.

## What I want feedback on
Considering a **brand-new endgame system** that gives maxed players a reason to keep playing
that does NOT feel like starting over.

1. How do successful idle games (Cookie Clicker, Antimatter Dimensions, Realm Grinder, NGU Idle,
   Melvor) keep maxed players engaged **without** the reset feeling like pure loss?
2. What makes a prestige reset feel *rewarding* instead of *punishing*? (visible permanent
   collection, "you're now X× faster" framing, keeping something tangible across resets,
   player-chosen ascension perks, etc.)
3. Suggest 2–3 concrete new endgame systems fitting a mutation/creature theme — ones that turn
   "I'm maxed" into "now I get to do something new with all this power." Rank by impact-vs-effort.

**Constraints:** single developer, vanilla JS, already has 3 prestige layers and ~15 systems —
so the answer should be either a capstone that ties them together or a genuinely new loop,
not just "add another multiplier."
