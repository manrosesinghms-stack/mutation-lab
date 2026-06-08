// Optional hand-made / AI-generated 3D models per macro-stage. Map a stage id to a
// .glb file in /models; if a stage has a model it REPLACES the procedural body
// (the nucleus, parts and orbiters still render on top), else the procedural
// creature is used. Empty by default — procedural until you add files.
//
//   export const MODELS = {
//     predator: "models/predator.glb",
//     cosmic:   "models/cosmic-entity.glb",
//   };
// Stage ids: cell, colony, predator, apex, planetary, cosmic.
// Use CC0 / licensed .glb assets (Sketchfab CC0, Quaternius, Poly Pizza, etc.).
export const MODELS = {};
