# 🎵 Audio — bundling real music tracks

The game ships with a **procedural Web Audio engine** (6 themes + a reverb/space
send + adaptive intensity), so it always has music with zero asset files. You can
**override any theme with a real audio track** — that track then loops instead of
the synth, and the synth stays as the fallback for themes without a file.

## How to add real tracks
1. Drop loopable audio files into a top-level **`/audio`** folder, e.g.
   `audio/lofi-loop.ogg`, `audio/dread.ogg`. (`.ogg` or `.mp3`; same-origin so it
   routes cleanly through the Web Audio master for volume/mute.)
2. Map theme id → file in **`src/data/tracks.js`**:
   ```js
   export const TRACKS = {
     lofi:     "audio/lofi-loop.ogg",
     lullaby:  "audio/lullaby.ogg",
     eldritch: "audio/dread.ogg",
     // ...any of: lofi, lullaby, pulse, bloom, chiptune, eldritch
   };
   ```
3. That's it — the loader (`src/music.js → applyTrack`) plays the file on theme
   change / music start, mutes the synth while it plays, and falls back to the
   synth automatically if the file is missing or fails to load.

## Where to get CC0 / royalty-free tracks
- **Kenney** (kenney.nl) — CC0 music packs.
- **incompetech.com** (Kevin MacLeod) — CC-BY (needs attribution).
- **Pixabay Music**, **Free Music Archive (CC0/CC-BY)**, **OpenGameArt** (filter to CC0).
- Pick **loopable ambient** tracks (~1–3 min) that match each zone's mood
  (uplifting/cozy early, tense/dark late) — see docs research on idle-game scoring.

> Note: these hosts are blocked from the build sandbox's network (only GitHub is
> reachable here), so add the files from an environment with open network, or point
> me at a `raw.githubusercontent.com` URL of a CC0 track and I'll wire it in.

## Attribution
If you use CC-BY tracks, credit the artists in your README / a credits screen.
CC0 needs no attribution.
