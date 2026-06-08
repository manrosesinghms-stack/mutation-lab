// THE JOURNEY — the single, always-visible spine of the game. A permanent
// location ladder driven by LIFETIME biomass (never resets), so the player is
// always moving toward a named destination no prestige can take away. This is
// the answer to "what am I working toward?" — it must be impossible to miss.
//
// Tracked on state.lifetimeBiomass (all-time). The journey only ever advances.

export const JOURNEY = [
  { name: "Petri Dish",          icon: "🧫", at: 0,     blurb: "A single cell in a drop of nutrient." },
  { name: "Aquarium",            icon: "💧", at: 1e4,   blurb: "Your colony outgrew the dish." },
  { name: "Laboratory",          icon: "🔬", at: 1e6,   blurb: "Scientists take notice and move you indoors." },
  { name: "Research Facility",   icon: "🏛️", at: 1e9,   blurb: "A whole team now studies your organism." },
  { name: "Bio Dome",            icon: "🌐", at: 1e12,  blurb: "Too large to contain — sealed in a dome." },
  { name: "Planetary Ecosystem", icon: "🌋", at: 1e15,  blurb: "Your life-forms reshape a landscape." },
  { name: "Living Planet",       icon: "🪐", at: 1e18,  blurb: "The planet itself is alive — and it's you." },
  { name: "Cosmic Organism",     icon: "🌌", at: 1e21,  blurb: "A being the size of the void between stars." },
];

// Current location index for a given lifetime-biomass value.
export function journeyIndex(lifetime) {
  let i = 0;
  for (let k = 0; k < JOURNEY.length; k++) if ((lifetime || 0) >= JOURNEY[k].at) i = k;
  return i;
}
