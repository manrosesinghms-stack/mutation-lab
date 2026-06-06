# Mutation Lab — Build & Launch Guide

## Run the web version (dev)
```
npm run dev          # threaded no-cache server on http://localhost:8137
```
Everything is static + vanilla JS. Three.js is vendored in `/vendor`, so it runs offline (no CDN).

## Run as a desktop app (Electron)
```
npm install          # installs electron + electron-builder (devDependencies)
npm run electron     # launches the game in a desktop window
```
`electron/main.cjs` loads `index.html` in a 1280×800 window. Because all assets are local, the desktop app works with no internet.

## Build a distributable (.exe / installer)
```
npm run dist         # electron-builder --win  → produces dist/
```
Outputs an **NSIS installer** + a **portable .exe** under `dist/`. (Add an `build/icon.ico` for a custom icon; electron-builder uses a default otherwise.)

---

## 🔒 Steam launch checklist (the human-only steps)
These can't be automated — they need *your* accounts/payment:

1. **Steamworks account** — pay the $100 one-time Steam Direct fee; create the app.
2. **Store page assets:**
   - Capsule art (the #1 marketing asset): 616×353 (small), 1232×706 (header), plus library art.
   - 30–60s trailer built around a **mutation transformation / hidden-evolution reveal** (use Photo Mode clips).
   - 5+ screenshots: golden-variant creature, a chimera with many parts, the Codex, a boss fight.
   - Short + long description, tags (Incremental, Idle, Roguelike, Clicker, Casual).
3. **Wishlists before launch** — put the page up ASAP; post the free web build + GIFs to r/incremental_games, r/playmygame, YouTube Shorts; build a Discord.
4. **Steamworks integration (in the Electron build):**
   - Add `steamworks.js` (or greenworks) for achievements + cloud saves.
   - Map our 15 in-game achievements → Steam achievements.
5. **Pricing:** $3–7 per genre comps (Vampire Survivors $5, Balatro higher). Consider a free web demo → wishlist funnel.
6. **Launch day:** concentrate the push (creators + Reddit + Discord + Shorts) into one spike — Steam's algorithm rewards it. Have a day-1 patch ready.

## 🌐 Needs a backend (optional, post-launch)
- Online leaderboards for **Daily Seed** + **Weekly Event** (currently local-only). A small serverless function + a DB (e.g., Supabase) would do it.
- Global "trait discovered by X players" counters in the Codex.
