# Mutation Lab — Redesign Brief (why it isn't fun yet, and what to change)

**Play it live:** https://manrosesinghms-stack.github.io/mutation-lab/
**Source:** https://github.com/manrosesinghms-stack/mutation-lab

A browser incremental/idle game: you grow a single cell into an ever-mutating
low-poly 3D creature. Vanilla JS + Three.js, fully procedural (no art assets).
It has a LOT of systems — and that's part of the problem.

---

## The honest problem (from playtesting)

The first 2 minutes are fun. Then it falls apart, for specific structural reasons:

### 1. The reset loop is the whole game, and resets aren't fun
The core loop is: click → buy organelles → have fun → **the game pushes you to
Evolve → everything resets to ZERO** → rebuild a slightly stronger version of the
exact same thing → repeat. And there are **THREE** stacked reset layers (Evolve →
Speciate → Transcend), each one sending you back to zero.

So you never get to enjoy a long build. Right when it's getting fun, it tells you
to throw it away and start the same cycle again. It's a treadmill, not a journey.

### 2. Nothing visibly *happens* — the screen is dead
This is the big one. **In Cookie Clicker, the screen fills with animated things
doing their job** — grandmas bake, factories smoke, banks stack coins, the cursor
army clicks. *That* is what makes idle play feel alive: you SEE your economy
running.

Our game has **none of that**. The "producers" (organelles) are abstract orbiting
blobs and, embarrassingly, **emoji** — which look like placeholder junk, not a
living lab. The request was for real animated characters (e.g. scientists walking
around, working, tending the creature; machines visibly running) — actual little
animated entities that make the screen feel alive. Instead it's shapes and emoji
that "don't make any sense."

### 3. Most "systems" are the same thing with fancy names (fake depth)
- **Upgrades** = spend biomass on a list of multipliers.
- **Genome Lab** = spend Genome on a list of multipliers (just a fancier name).
- **Helix Tree** = spend Helix on a list of multipliers (again).
These are the *same mechanic* three times. It adds menus and complexity but no new
*fun* — it's busywork dressed up as depth. Same for most of the side systems.

### 4. The economy still snowballs / can be exploited
Even after rebalancing, you can stack temporary boosts (Digest + a Mitogen Frenzy)
and production rockets so hard you're "done in seconds" and shoved toward the next
reset. The numbers outrun any sense of pacing.

---

## How Cookie Clicker actually works (the model we should learn from)

- **Resets are RARE and OPTIONAL.** You can play for hours/days without ever
  prestiging (Ascension). The moment-to-moment game is the long, satisfying climb
  of buying and upgrading buildings that *stay on screen*. We do the opposite:
  frequent, mandatory-feeling resets that erase your build.
- **The fun is the visible, animated economy** — not the multiplier math. Every
  building is a drawn, animated thing that accumulates into rows/armies.
- **Depth comes from VARIETY, not repetition** — buildings, building-upgrades,
  synergies, golden cookies, a dragon, minigames (garden/stock/pantheon) — each a
  *distinct* activity, not the same "spend X on a list" five times.

---

## The redesign question (what I'd ask for help on)

Given all that, I want a **refreshed core design** that fixes the structure, not
just numbers. Specifically:

1. **The reset problem.** Should we cut from 3 reset layers down to ONE rare,
   optional prestige (Cookie-Clicker style), and make the *main* game a long climb
   you don't have to throw away? Or replace resets with a different progression
   that keeps the creature and never zeroes you out? What's the most *fun*
   structure for a creature-evolution incremental?

2. **Making it feel alive.** Concretely, how do we get the
   "grandmas/factories/scientists are visibly working" feeling with **procedural
   low-poly 3D** (no art budget)? e.g. little animated lab workers / machines /
   organelle-creatures that walk, tend, and produce — replacing the abstract
   blobs+emoji. What would actually read as "a living lab," buildable in code?

3. **Cutting fake depth.** Which systems should be merged or deleted so there's
   ONE clear, fun upgrade loop instead of Upgrades + Genome Lab + Helix all doing
   the same thing? What *distinct* activities (not more multiplier lists) would add
   real variety?

4. **Pacing.** What cost/production curve makes a session a satisfying climb
   (no instant-max, no exploit spam) while keeping early game snappy?

The goal: someone watches a 10-second clip and thinks *"what is that creature
becoming, and look at that little lab full of stuff working"* — instead of
*"it's a blob, a list of menus, and some emoji."*
