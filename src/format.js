// Big-number formatting for an incremental game.
// v1 uses JS Number (safe to ~1e308). We swap in break_infinity.js later if needed.

const SUFFIXES = [
  "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No",
  "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc", "Vg",
];

export function formatNumber(n) {
  if (n === undefined || n === null || isNaN(n)) return "0";
  if (n < 1000) {
    // show up to 1 decimal for small fractional amounts, else integer
    return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0);
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    const scaled = n / Math.pow(10, tier * 3);
    return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIXES[tier];
  }
  // beyond our suffix table -> scientific
  return n.toExponential(2).replace("e+", "e");
}
