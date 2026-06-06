// Seasonal events (5A). Pick one in Settings; while active it themes the
// backdrop and grants a production bonus (like Cookie Clicker's seasons + switcher).
export const SEASONS = [
  { id: "none", name: "None", prod: 0, bg: null },
  { id: "eldritch", name: "🎃 Eldritch", prod: 0.12, bg: "voidd" },
  { id: "glacial", name: "❄️ Festival", prod: 0.12, bg: "aurora" },
  { id: "cosmic", name: "🌌 Cosmic", prod: 0.18, bg: "cosmos" },
  { id: "bloom", name: "🌸 Bloomtide", prod: 0.15, bg: "meadow" },
];
export const SEASON_BY_ID = Object.fromEntries(SEASONS.map((s) => [s.id, s]));
