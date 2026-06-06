// All pacing/balance constants live here so tuning happens in ONE place.
// These shape the anti-runaway softcaps (see docs/PROGRESSION.md).

export const TUN = {
  // EP payoff softcap: below `breakpoint` it's the old linear +10%/EP (early game
  // feels identical); above it, the bonus grows as a sqrt tail instead of linearly.
  ep: {
    breakpoint: 50,   // EP at which the linear payoff transitions to the sqrt tail
    headSlope: 0.10,  // +10% production per EP up to the breakpoint
    tailScale: 0.5,   // sqrt-tail coefficient past the breakpoint
  },

  // Global production softcap — THE wall (surfaced as "Metabolic Pressure").
  // Below S, production is untouched; above S it's S*(total/S)^exp (a soft knee).
  // CRITICAL: S must NOT grow with prestige count (that defeats the wall — the sim
  // showed an optimizing player prestiges 100s of times and inflates it away).
  // S rises ONLY via Genome (the Speciate currency), so the wall is the invitation
  // to Speciate. The knee is hard (low exp) so stacking past the wall does little.
  prodSoftcap: {
    base: 1e8,               // S before any Genome upgrades — high enough that a
                             // fresh creature has a LONG runway (click → buy →
                             // Evolve for mutations many times) before the wall
                             // ever bites. The wall is a LATE invitation to
                             // Speciate, not a 5-minute brick wall.
    growthPerPrestige: 1.0,  // NO growth from Evolve-prestige (Genome raises S instead)
    exp: 0.30,               // soft-ish knee so crossing it isn't an instant brick wall
  },

  // Per-generator saturation — discourages dumping everything into one organelle.
  // Each generator's raw output is softcapped before the global mults apply.
  genSaturation: {
    threshold: 2e4, // raw output where one generator starts diminishing
    exp: 0.9,       // gentler than the global wall
  },
};

// Shared soft-knee helper: identity below `s`, gentle power curve above it.
export function softknee(value, s, exp) {
  if (s <= 0) return value;
  return value <= s ? value : s * Math.pow(value / s, exp);
}
