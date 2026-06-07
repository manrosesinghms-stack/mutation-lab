// Big-number formatting for an incremental game.
// Uses native JS Number (safe to ~1.8e308). The game's softcaps keep production
// well below that, but this formatter is hardened so values can NEVER render as
// "Infinity"/"NaN" — extreme magnitudes fall back to clean scientific notation,
// and non-finite values show "∞". (A full break_infinity/Decimal swap would only
// be needed if the balance ever allowed values past 1e308 — see docs.)

const SUFFIXES = [
  "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No",
  "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc", "Vg",
  "UVg", "DVg", "TVg", "QaVg", "QiVg", "SxVg", "SpVg", "OcVg", "NoVg", "Tg",
];

export function formatNumber(n) {
  if (n === undefined || n === null || Number.isNaN(n)) return "0";
  if (!Number.isFinite(n)) return n < 0 ? "-∞" : "∞";
  if (n < 0) return "-" + formatNumber(-n);
  if (n < 1000) {
    // show up to 1 decimal for small fractional amounts, else integer
    return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0);
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= 0 && tier < SUFFIXES.length) {
    const scaled = n / Math.pow(10, tier * 3);
    return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIXES[tier];
  }
  // beyond our suffix table -> clean scientific (e.g. "1.23e105")
  const exp = Math.floor(Math.log10(n));
  const mant = n / Math.pow(10, exp);
  return (Number.isFinite(mant) ? mant.toFixed(2) : "1") + "e" + exp;
}
