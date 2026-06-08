// Optional real-audio tracks. Map a music theme id -> a bundled audio file in
// /audio (same-origin, looped). If a theme has a track here it plays INSTEAD of the
// procedural synth; otherwise the synth plays (so the game always has music).
//
// To add real music: drop loopable .ogg/.mp3 files in /audio and list them here, e.g.
//   export const TRACKS = { lofi: "audio/lofi-loop.ogg", eldritch: "audio/dread.ogg" };
// Use CC0 / royalty-free tracks (e.g. Kenney, incompetech with attribution, etc.).
// Empty by default — pure procedural synth until you add files.
export const TRACKS = {};
