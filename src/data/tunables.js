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
    base: 1e11,              // S before any Genome upgrades. Set FAR out so normal
                             // play (click → buy → Evolve → upgrades) almost never
                             // sees a "capped" message — production grows freely
                             // like a real clicker. Speciate is now a player CHOICE
                             // (unlocked by evolving), not forced by a wall.
    growthPerPrestige: 1.0,  // NO growth from Evolve-prestige (Genome raises S instead)
    exp: 0.50,               // gentle diminishing returns, not a brick wall — past
                             // S, production still climbs noticeably (sqrt-ish)
  },

  // Clicking — keep the core verb meaningful at every scale. A click is worth a
  // flat base PLUS a share of current production/sec, so tapping always lands a
  // real chunk even when passive multipliers dominate (Cookie-Clicker-style
  // "% of CpS per click"). Combo crits multiply the whole payout.
  click: {
    prodShare: 0.015, // each click also yields 1.5% of production/sec (flat — not ×clickMult)
    critCombo: 12,    // chained clicks within 600ms to trigger a critical
    critMult: 5,      // a critical extraction pays 5× the click
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
