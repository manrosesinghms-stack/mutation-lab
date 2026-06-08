# 🦠 3D models — procedural creatures + importing real `.glb`

The creature is **procedural** by default: each macro-stage assembles a distinct
silhouette in code (smooth Cell → budding Colony → jawed/tailed Predator → clawed
Apex → ringed Planetary → tendrilled Cosmic), tinted to the stage colour, with a
glowing nucleus + fresnel membrane. Zero asset files required.

## Overriding a stage with a real (hand-made / AI) model
You can replace any stage's body with an imported **`.glb`**:

1. Drop a `.glb` in a top-level **`/models`** folder, e.g. `models/predator.glb`.
2. Map stage id → file in **`src/data/models.js`**:
   ```js
   export const MODELS = {
     predator: "models/predator.glb",
     cosmic:   "models/cosmic-entity.glb",
   };
   // stage ids: cell, colony, predator, apex, planetary, cosmic
   ```
3. Done. On reaching that stage the loader (`creature.js → loadStageModel`) lazily
   loads the model (GLTFLoader is only imported when a model is actually used),
   auto-scales/centres it to the body size, and hides the procedural mesh. The
   nucleus, mutation parts and orbiters still render. Any load failure falls back
   to the procedural creature.

A tiny `models/Box.glb` is included as a working example — set
`MODELS = { cell: "models/Box.glb" }` to see a model swap in.

## Where to get `.glb` models
- **Poly Pizza**, **Quaternius**, **Kenney** — CC0 low-poly (match the art style).
- **Sketchfab** — filter to CC0 / CC-BY (credit if CC-BY).
- AI generators (Meshy, Luma, etc.) → export `.glb`.

> The build sandbox can only fetch from GitHub, so add models from an environment
> with open network (or point me at a `raw.githubusercontent.com` `.glb` URL).

## Notes / limits
- Vendored `vendor/GLTFLoader.js` + `vendor/BufferGeometryUtils.js` match three r160.
- Imported models keep the game's lighting; very high-poly models may cost perf on
  weak devices — prefer game-ready low-poly.
- Mutation parts are placed against the *procedural* surface, so with a custom model
  they may not align perfectly (the model still reads as the body).
